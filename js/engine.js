/* 물때 3 — 게임 엔진
 * 흐름(FLOW)을 따라 장면과 심문을 번갈아 보여 준다.
 * 규칙 요약: 질문·반박 1회 = 5분, 제한 35분, 판별은 시간 소모 없음(막마다 횟수 다름),
 * 심문 중 저장 불가, 실패하면 물건 고르기부터 다시. 3막만 결론이 강제된다.
 */
(() => {
  'use strict';

  const LIMIT = 35;
  const STEP = 5;
  const SAVE_KEY = 'multtae3.saves.v1';
  const FORCED_OPINION = '그는 죄가 없습니다.';

  const stage = document.getElementById('stage');
  const whereEl = document.getElementById('where');
  const saveBtn = document.getElementById('btn-save');
  const loadBtn = document.getElementById('btn-load');
  const titleBtn = document.getElementById('btn-title');

  const G = { mode: 'title', flow: 0 };
  let S = null; // 재생 중인 장면 {lines, i, onEnd, saveable, typing}
  let C = null; // 진행 중인 심문
  let typeTimer = null;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ───────── 흐름 ───────── */
  function enterFlow(i, line = 0) {
    G.flow = i;
    const node = FLOW[i];
    if (!node) return showTitle();
    if (node.t === 'scene') playScene(SCENES[node.id], () => enterFlow(i + 1), { saveable: true, start: line });
    else if (node.t === 'case') startCase(node.id);
    else if (node.t === 'end') showEnd(node.kind);
  }

  /* ───────── 장면 ───────── */
  function playScene(lines, onEnd, opts = {}) {
    G.mode = 'scene';
    S = { lines, i: Math.min(opts.start || 0, lines.length - 1), onEnd, saveable: !!opts.saveable };
    renderScene();
  }

  function placeAt(lines, i) {
    for (let k = i; k >= 0; k--) {
      if (lines[k].place) return lines[k].place;
      if (lines[k].card) return lines[k].card + ' · ' + lines[k].sub;
    }
    return '';
  }

  function sceneBg(lines, i) {
    for (let k = i; k >= 0; k--) {
      if (lines[k].card) return 'dark';
      if (lines[k].bg) return lines[k].bg;
      if (lines[k].place) return ART.bgKey(lines[k].place);
    }
    return 'dark';
  }

  // 지금 말하는 인물. 서술이나 주인공 대사일 때는 같은 장소에서 마지막으로 말한 인물을 계속 보여 준다.
  function sceneSpeaker(lines, i) {
    for (let k = i; k >= 0; k--) {
      const l = lines[k];
      if (l.s && ART.has(l.s)) return { name: l.s, e: l.e === undefined ? -1 : l.e, talking: k === i };
      if (l.card || (k < i && l.place)) return null;
      if (k === i && l.place && !l.s) return null;
    }
    return null;
  }

  function renderScene() {
    const ln = S.lines[S.i];
    if (ln.opinion) {
      const scene = S;
      return showOpinion({
        act: ln.opinion.act,
        meta: ln.opinion.meta,
        done: () => { S = scene; G.mode = 'scene'; S.i += 1; if (S.i < S.lines.length) renderScene(); else { const f = S.onEnd; S = null; f(); } },
      });
    }
    const place = placeAt(S.lines, S.i);
    setWhere(place);
    const bgKey = sceneBg(S.lines, S.i);
    const bg = bgKey === 'car' ? ART.background('station', { car: true }) : ART.background(bgKey);
    let overlay = '';
    let figure = '';
    let box = '';
    if (ln.card) {
      overlay = `<div class="card"><div class="act">${esc(ln.card)}</div><div class="sub">${esc(ln.sub || '')}</div></div>`;
    } else {
      const sp = sceneSpeaker(S.lines, S.i);
      if (sp) figure = ART.portrait(sp.name, sp.e, { cls: sp.talking ? 'talking' : 'idle' });
      if (ln.news) overlay = `<div class="news"><span class="ntag">뉴스</span><h2>${esc(ln.news)}</h2></div>`;
      const who = ln.s ? `<div class="who${ln.s === ME ? ' me' : ''}">${esc(ln.s)}</div>` : (ln.think ? `<div class="who me">${ME} · 속마음</div>` : '');
      const cls = ln.think ? 'think' : (ln.s ? '' : 'narr');
      box = `<div class="box">${who}<p class="${cls}" id="line-text"></p><span class="next" aria-hidden="true">▼</span></div>`;
    }
    stage.innerHTML = `<div class="scene" id="scene" role="button" tabindex="0" aria-label="다음 대사">
      <div class="place">${esc(place)}</div>
      <div class="frame${ln.card ? ' is-card' : ''}">${bg}${figure}${overlay ? `<div class="overlay${ln.news ? ' left' : ''}">${overlay}</div>` : ''}</div>
      ${box}
    </div>`;
    const text = ln.card ? '' : (ln.think ? ln.think : ln.x || '');
    if (!ln.card) typeText(document.getElementById('line-text'), text);
    else S.typing = false;
    document.getElementById('scene').addEventListener('click', advance);
    refreshTools();
  }

  function typeText(el, text) {
    clearInterval(typeTimer);
    if (reduceMotion) { el.textContent = text; S.typing = false; return; }
    let n = 0;
    S.typing = true;
    S.full = text;
    S.el = el;
    typeTimer = setInterval(() => {
      n += 1;
      el.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(typeTimer); S.typing = false; }
    }, 22);
  }

  function advance() {
    if (G.mode !== 'scene' || !S) return;
    if (S.typing) {
      clearInterval(typeTimer);
      S.el.textContent = S.full;
      S.typing = false;
      return;
    }
    if (S.i < S.lines.length - 1) { S.i += 1; renderScene(); }
    else { const done = S.onEnd; S = null; done(); }
  }

  /* ───────── 심문 ───────── */
  function startCase(id) {
    const d = CASES[id];
    C = {
      id, d, phase: 'prep', picked: [], time: 0, asked: [], detoured: {}, notes: [],
      judged: {}, judgesUsed: 0, refuted: {}, sel: null, item: null, judging: false,
      last: [], confirmEnd: false, latest: null,
    };
    G.mode = 'case';
    renderCase();
  }

  const held = (itemId) => C.picked.includes(itemId);
  const itemName = (itemId) => (C.d.items.find((it) => it.id === itemId) || {}).name || itemId;
  const keys = () => C.d.questions.filter((q) => q.kind === 'key');
  const askedKeys = () => keys().filter((q) => C.asked.includes(q.id)).length;
  const refutedCount = () => Object.keys(C.refuted).length;
  const judgesLeft = () => (C.d.judges < 0 ? Infinity : C.d.judges - C.judgesUsed);

  function questionsDone() {
    if (C.d.needQ) return askedKeys() >= C.d.needQ;
    return keys().every((q) => C.asked.includes(q.id));
  }

  function clockText(mins) {
    const [h, m] = C.d.clock.split(':').map(Number);
    const t = h * 60 + m + mins;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  function hud() {
    const d = C.d;
    const used = Math.min(C.time / STEP, 7);
    const remaining = LIMIT - C.time;
    let meter = '';
    for (let k = 0; k < 7; k++) meter += `<i class="${k < used ? 'used' : ''}"></i>`;
    const jl = judgesLeft();
    const judgeTxt = d.judges === 0 ? '사용 불가' : (jl === Infinity ? '무제한' : `${jl}회 남음`);
    return `<div class="hud">
      <div class="case-name"><small>${esc(d.date)} · ${esc(d.act)} · ${esc(d.place)}</small>${esc(d.title)}</div>
      <div class="clock"><div class="now">${clockText(C.time)}</div><div class="left">남은 시간 ${remaining}분</div></div>
      <div class="meter" aria-label="35분 중 ${C.time}분 사용">${meter}</div>
      <div class="stats">
        <span>질문 <b>${C.asked.length + Object.keys(C.detoured).length}회</b></span>
        <span>반박 <b>${refutedCount()} / ${d.needRebut}</b></span>
        <span>거짓 판별 <b>${judgeTxt}</b></span>
      </div>
    </div>`;
  }

  function tip(phase) {
    const t = C.d.tips && C.d.tips[phase];
    return t ? `<div class="tip">${t}</div>` : '';
  }

  function suspectLevel() {
    return Math.min(refutedCount(), 3);
  }

  function banner() {
    const key = C.d.id === 'c1' ? 'station' : (C.phase === 'prep' ? 'monitor' : 'interrogation');
    const lvl = suspectLevel();
    const changed = C.shownLevel !== undefined && C.shownLevel !== lvl;
    C.shownLevel = lvl;
    return `<div class="banner">${ART.background(key)}${ART.portrait(C.d.suspect.name, lvl, { cls: changed ? 'swap' : '' })}</div>`;
  }

  function profileCard(showHeld) {
    const d = C.d;
    const heldHtml = showHeld
      ? `<div class="held">가져온 물건<br>${C.picked.map((p) => `<span>${esc(itemName(p))}</span>`).join('')}</div>`
      : '';
    return `<aside class="profile">
      <h3>${esc(d.suspect.name)}</h3>
      <div class="role">${esc(d.suspect.role)}</div>
      <ul>${d.profile.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      ${heldHtml}
    </aside>`;
  }

  function renderCase() {
    setWhere(`${C.d.date} · ${C.d.act} · ${C.d.place}`);
    if (C.phase === 'prep') renderPrep();
    else if (C.phase === 'ask') renderAsk();
    else if (C.phase === 'note') renderNote();
    refreshTools();
  }

  /* 1) 물건 고르기 */
  function renderPrep() {
    const d = C.d;
    const items = d.items.map((it) => `<button class="item${held(it.id) ? ' on' : ''}" data-item="${it.id}" aria-pressed="${held(it.id)}">
        <span class="nm">${esc(it.name)}</span><span class="ds">${esc(it.desc)}</span></button>`).join('');
    stage.innerHTML = `${hud()}${banner()}${tip('prep')}
      <div class="grid2">
        ${profileCard(false)}
        <section>
          <p class="sec-title">${esc(d.container === '가방' ? '내 가방' : '모니터 앞 책상')} · ${d.slots}개 선택 (${C.picked.length}/${d.slots})</p>
          <div class="items">${items}</div>
          <div class="actions">
            <button class="btn" id="go" ${C.picked.length === d.slots ? '' : 'disabled'}>${d.container === '가방' ? '물건 꺼내기' : '심문실로 들어가기'}</button>
            <span class="note">들어가면 심문이 끝날 때까지 저장할 수 없습니다.</span>
          </div>
        </section>
      </div>`;
    stage.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.item;
      if (held(id)) C.picked = C.picked.filter((p) => p !== id);
      else if (C.picked.length < d.slots) C.picked.push(id);
      renderCase();
    }));
    document.getElementById('go').addEventListener('click', () => { C.phase = 'ask'; renderCase(); });
  }

  /* 2) 질문 */
  function askOptions() {
    const opts = [];
    for (const q of C.d.questions) {
      if (C.asked.includes(q.id)) continue;
      if (q.kind === 'trap') {
        if (!q.req || held(q.req)) opts.push({ type: 'q', q });
      } else if (!q.req || held(q.req) || C.detoured[q.id]) {
        opts.push({ type: 'q', q });
      } else if (q.detour) {
        opts.push({ type: 'detour', q });
      }
    }
    return opts;
  }

  function renderAsk() {
    const done = questionsDone();
    const transcript = C.notes.map((n) => `<div class="qa${n === C.latest ? ' latest' : ''}">
        <div class="q ${n.kind}">Q. ${esc(n.q)}</div>
        <div class="a">${n.stmts.map((s) => esc(s.x)).join(' ')}</div></div>`).join('');
    const opts = done ? '' : askOptions().map((o, k) => {
      const text = o.type === 'detour' ? o.q.detour.q : o.q.q;
      return `<button class="qopt" data-opt="${k}"><span>${esc(text)}</span><span class="cost">+5분</span></button>`;
    }).join('');
    const body = done
      ? `<div class="actions"><button class="btn" id="to-note">노트 펼치기</button><span class="note">질문을 모두 마쳤습니다. 이제 노트에서 거짓을 찾아 반박하세요.</span></div>`
      : `<p class="sec-title">무엇을 물을까</p><div class="qopts">${opts}</div>`;
    stage.innerHTML = `${hud()}${banner()}${tip('ask')}
      <div class="grid2">
        ${profileCard(true)}
        <section>
          ${transcript ? `<p class="sec-title">진술</p><div class="transcript">${transcript}</div>` : ''}
          ${body}
        </section>
      </div>`;
    if (done) {
      document.getElementById('to-note').addEventListener('click', () => { C.phase = 'note'; renderCase(); });
      return;
    }
    const list = askOptions();
    stage.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => ask(list[Number(b.dataset.opt)])));
  }

  function ask(o) {
    C.time += STEP;
    let entry;
    if (o.type === 'detour') {
      C.detoured[o.q.id] = true;
      entry = { q: o.q.detour.q, kind: 'detour', stmts: [{ id: `${o.q.id}_d`, x: o.q.detour.a }] };
    } else {
      C.asked.push(o.q.id);
      entry = { q: o.q.q, kind: o.q.kind, stmts: o.q.a.map((s, k) => Object.assign({ id: `${o.q.id}_${k}` }, s)) };
    }
    C.notes.push(entry);
    C.latest = entry;
    if (C.time >= LIMIT) return fail();
    renderCase();
  }

  /* 3) 노트: 판별과 반박 */
  function allStmts() { return C.notes.flatMap((n) => n.stmts); }

  function renderNote() {
    const d = C.d;
    const entries = C.notes.map((n) => `<div class="entry"><div class="q">Q. ${esc(n.q)}</div>
      ${n.stmts.map((s) => {
        const j = C.judged[s.id];
        const done = C.refuted[s.id];
        let mark = '';
        if (done) mark = '<span class="mark">반박 완료</span>';
        else if (j === 'lie') mark = '<span class="mark lie">거짓</span>';
        else if (j === 'truth') mark = '<span class="mark truth">진실</span>';
        const cls = ['stmt', j ? 'judged' : '', done ? 'done' : '', C.sel === s.id ? 'sel' : ''].join(' ');
        return `<button class="${cls}" data-sid="${s.id}" ${done ? 'aria-disabled="true"' : ''}><span class="txt">${esc(s.x)}</span>${mark}</button>`;
      }).join('')}</div>`).join('');

    const jl = judgesLeft();
    let judgeLabel;
    if (d.judges === 0) judgeLabel = '거짓 판별';
    else if (C.judging) judgeLabel = '판별할 문장을 누르세요 (취소)';
    else judgeLabel = `거짓 판별 · ${jl === Infinity ? '무제한' : jl + '회 남음'}`;

    const evid = C.picked.map((p) => `<button data-ev="${p}" class="${C.item === p ? 'on' : ''}">${esc(itemName(p))}</button>`).join('');
    const selStmt = allStmts().find((s) => s.id === C.sel);
    const fb = C.last.map((l) => {
      if (l.sys) return `<div class="line sys">${esc(l.sys)}</div>`;
      if (l.good) return `<div class="line good">${esc(l.good)}</div>`;
      if (l.bad) return `<div class="line bad">${esc(l.bad)}</div>`;
      return `<div class="line"><span class="who${l.s === ME ? ' me' : ''}">${esc(l.s)}</span>${esc(l.x)}</div>`;
    }).join('');

    stage.innerHTML = `${hud()}${banner()}${tip('note')}
      <div class="note-wrap">
        <section class="paper${C.judging ? ' judging' : ''}" aria-label="심문 노트">
          <h3>심문 노트 · ${esc(d.suspect.name)}</h3>
          ${entries}
        </section>
        <div class="side">
          <div class="panel">
            <button class="btn ghost judge-btn${C.judging ? ' on' : ''}" id="judge" ${d.judges !== 0 && jl <= 0 ? 'disabled' : ''}>${esc(judgeLabel)}</button>
          </div>
          <div class="panel">
            <p class="sec-title">반박</p>
            <div class="feedback" style="margin-bottom:10px">
              <div class="line sys">문장: ${selStmt ? esc(selStmt.x) : '노트에서 고르세요'}</div>
            </div>
            <div class="evid">${evid}</div>
            <div class="actions" style="margin-top:12px">
              <button class="btn" id="rebut" ${selStmt && C.item && !C.judging ? '' : 'disabled'}>반박하기 +5분</button>
            </div>
          </div>
          ${fb ? `<div class="panel"><div class="feedback">${fb}</div></div>` : ''}
          <div class="panel">
            ${C.confirmEnd ? `<p class="confirm">아직 반박을 다 하지 못했습니다. 지금 결론을 내리면 심문은 실패합니다.</p>` : ''}
            <button class="btn ghost" id="end-now" style="width:100%">${C.confirmEnd ? '그래도 결론 내리기' : '결론 내리기'}</button>
          </div>
        </div>
      </div>`;

    stage.querySelectorAll('[data-sid]').forEach((b) => b.addEventListener('click', () => clickStmt(b.dataset.sid)));
    stage.querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', () => {
      C.item = C.item === b.dataset.ev ? null : b.dataset.ev;
      renderCase();
    }));
    document.getElementById('judge').addEventListener('click', toggleJudge);
    document.getElementById('rebut').addEventListener('click', rebut);
    document.getElementById('end-now').addEventListener('click', () => {
      if (C.d.fail === 'forced' || C.confirmEnd) return fail();
      C.confirmEnd = true;
      renderCase();
    });
  }

  function toggleJudge() {
    if (C.d.judges === 0) {
      C.last = [{ sys: C.d.judgeBlocked }];
      renderCase();
      const app = document.getElementById('app');
      app.classList.remove('pulse');
      void app.offsetWidth;
      app.classList.add('pulse');
      return;
    }
    C.judging = !C.judging;
    renderCase();
  }

  function clickStmt(sid) {
    if (C.refuted[sid]) return;
    if (C.judging) {
      if (C.judged[sid]) { C.judging = false; renderCase(); return; }
      const s = allStmts().find((x) => x.id === sid);
      C.judged[sid] = s.lie ? 'lie' : 'truth';
      C.judgesUsed += 1;
      C.judging = false;
      C.last = [{ sys: `판별: "${s.x}" → ${s.lie ? '거짓' : '진실'}` }];
      renderCase();
      return;
    }
    C.sel = C.sel === sid ? null : sid;
    renderCase();
  }

  function rebut() {
    const s = allStmts().find((x) => x.id === C.sel);
    if (!s || !C.item) return;
    C.time += STEP;
    C.confirmEnd = false;
    const right = C.d.fail !== 'forced' && s.refute && s.refute === C.item;
    if (right) {
      C.refuted[s.id] = true;
      C.last = [{ s: ME, x: s.say }, { s: C.d.suspect.name, x: s.react }, { good: '반박 성공' }];
    } else {
      C.last = [
        { s: ME, x: `"${s.x}" 이 말, ${itemName(C.item)}을(를) 보면 맞지 않습니다.` },
        { s: C.d.suspect.name, x: s.lie ? C.d.wrong.lie : C.d.wrong.truth },
        { bad: '틀린 반박 · 5분을 잃었다' },
      ];
      if (C.d.wrongNote) C.last.push({ sys: C.d.wrongNote });
    }
    C.sel = null;
    C.item = null;
    if (refutedCount() >= C.d.needRebut) return succeed();
    if (C.time >= LIMIT) return fail();
    renderCase();
  }

  function succeed() {
    const d = C.d;
    const lines = [...C.last.filter((l) => l.s).map((l) => ({ s: l.s, x: l.x })), ...(d.success || [])]
      .map((l) => (l.s === d.suspect.name && l.e === undefined ? Object.assign({ e: 3 }, l) : l));
    C = null;
    playScene(lines, () => enterFlow(G.flow + 1));
  }

  function fail() {
    const d = C.d;
    const id = C.id;
    if (d.fail === 'forced') return showConclusion();
    if (d.fail === 'retry') {
      C = null;
      return playScene(d.retry, () => startCase(id));
    }
    C = null;
    G.lastCase = id;
    playScene([...(SCENES['bad_' + id] || []), ...SCENES.bad_common], () => showEnd('bad'));
  }

  /* 3막: 어떤 입력이든 같은 결론 */
  // 자문 의견서: 어떤 키를 누르든(모바일은 화면을 누르든) 정해진 결론이 한 글자씩 적힌다.
  function showConclusion() {
    const d = C.d;
    C = null;
    showOpinion({
      act: d.act,
      meta: `피의자 ${d.suspect.name} · 구속 기간 연장 여부에 대한 의견<br>시간이 다 됐다. 결론을 적어야 한다.`,
      done: () => enterFlow(G.flow + 1),
    });
  }

  function showOpinion(o) {
    G.mode = 'conclude';
    G.typed = '';
    G.opinionDone = o.done;
    setWhere(`${o.act} · 결론`);
    stage.innerHTML = `<div class="conclude" id="conclude" role="textbox" aria-label="자문 의견 입력" tabindex="0">
      <div class="opinion">
        <div class="paper">
          <h3>자문 의견서</h3>
          <div class="meta">${o.meta}</div>
          <div class="field"><span id="typed"></span><span class="caret"></span></div>
        </div>
        <p class="hint" id="chint">아무 키나 누르거나 화면을 눌러 결론을 적으세요.</p>
      </div>
    </div>`;
    const el = document.getElementById('conclude');
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); typeOpinion(); });
    el.focus();
    refreshTools();
  }

  function typeOpinion() {
    if (G.mode !== 'conclude') return;
    if (G.typed.length < FORCED_OPINION.length) {
      G.typed = FORCED_OPINION.slice(0, G.typed.length + 1);
      document.getElementById('typed').textContent = G.typed;
      if (G.typed.length === FORCED_OPINION.length) {
        document.getElementById('chint').textContent = '한 번 더 누르면 의견서를 제출합니다.';
      }
      return;
    }
    G.mode = 'scene';
    const done = G.opinionDone;
    G.opinionDone = null;
    done();
  }

  /* ───────── 엔딩 ───────── */
  function showEnd(kind) {
    G.mode = 'end';
    setWhere('엔딩');
    const isBad = kind === 'bad';
    stage.innerHTML = `<div class="end">
      <div class="kind ${kind}">${isBad ? 'BAD END' : 'TRUE END'}</div>
      <h2>${isBad ? '믿음을 잃은 눈' : '특별형사'}</h2>
      <p>${isBad
        ? '심문에 실패해 자문 자격을 잃었다. 저장한 곳에서 다시 하거나, 실패한 심문을 물건 고르기부터 다시 할 수 있다.'
        : '심판자를 잡으러 가는 길은 이제 막 시작되었다.'}</p>
      <div class="actions">
        ${isBad ? '<button class="btn" id="end-retry">물건 고르기부터 다시</button><button class="btn ghost" id="end-load">불러오기</button>' : ''}
        <button class="btn ${isBad ? 'ghost' : ''}" id="end-title">타이틀로</button>
      </div>
    </div>`;
    if (isBad) {
      document.getElementById('end-retry').addEventListener('click', () => startCase(G.lastCase));
      document.getElementById('end-load').addEventListener('click', () => openSaves('load'));
    }
    document.getElementById('end-title').addEventListener('click', showTitle);
    refreshTools();
  }

  /* ───────── 타이틀 ───────── */
  function showTitle() {
    G.mode = 'title';
    S = null; C = null;
    setWhere('');
    const latest = latestSave();
    stage.innerHTML = `<div class="title">
      <h1>물때<em>3</em></h1>
      <p class="tag">거짓말을 알아보는 자문위원의 사건 기록</p>
      <div class="menu">
        ${latest !== null ? '<button class="btn" id="t-cont">이어하기</button>' : ''}
        <button class="btn ${latest !== null ? 'ghost' : ''}" id="t-new">처음부터</button>
        <button class="btn ghost" id="t-load">불러오기</button>
      </div>
      <p class="hint">대사 넘기기: 클릭 · Enter · Space</p>
      <div class="tide" aria-hidden="true"><svg viewBox="0 0 1200 90" preserveAspectRatio="none">
        <path d="M0 50 Q 75 20 150 50 T 300 50 T 450 50 T 600 50 T 750 50 T 900 50 T 1050 50 T 1200 50"/>
        <path d="M0 66 Q 75 46 150 66 T 300 66 T 450 66 T 600 66 T 750 66 T 900 66 T 1050 66 T 1200 66" opacity=".5"/>
      </svg></div>
    </div>`;
    document.getElementById('t-new').addEventListener('click', () => enterFlow(0));
    document.getElementById('t-load').addEventListener('click', () => openSaves('load'));
    if (latest !== null) document.getElementById('t-cont').addEventListener('click', () => loadSlot(latest));
    refreshTools();
  }

  /* ───────── 저장 ───────── */
  let memSaves = [null, null, null];
  function readSaves() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { const v = JSON.parse(raw); if (Array.isArray(v)) return v.concat([null, null, null]).slice(0, 3); }
    } catch (e) { /* 저장소를 못 쓰는 환경: 메모리에만 둔다 */ }
    return memSaves.slice();
  }
  function writeSaves(v) {
    memSaves = v.slice();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function latestSave() {
    const v = readSaves();
    let best = null;
    v.forEach((s, k) => { if (s && (best === null || s.at > v[best].at)) best = k; });
    return best;
  }

  function canSave() {
    return (G.mode === 'scene' && S && S.saveable) || (G.mode === 'case' && C && C.phase === 'prep');
  }

  function saveSlot(k) {
    const v = readSaves();
    v[k] = {
      flow: G.flow,
      line: G.mode === 'scene' && S ? S.i : 0,
      label: FLOW[G.flow].label,
      at: new Date().toISOString(),
    };
    return writeSaves(v);
  }

  function loadSlot(k) {
    const s = readSaves()[k];
    if (!s) return;
    closeSaves();
    enterFlow(s.flow, s.line || 0);
  }

  function openSaves(mode) {
    closeSaves();
    const allowSave = mode === 'save' && canSave();
    const v = readSaves();
    const fmt = (iso) => {
      const d = new Date(iso);
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const rows = v.map((s, k) => `<div class="slot">
        <div class="info">슬롯 ${k + 1} · ${s ? esc(s.label) : '비어 있음'}${s ? `<small>${fmt(s.at)}</small>` : ''}</div>
        <div class="btns">
          ${allowSave ? `<button class="btn ghost" data-save="${k}">저장</button>` : ''}
          <button class="btn ghost" data-load="${k}" ${s ? '' : 'disabled'}>불러오기</button>
        </div></div>`).join('');
    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal';
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${allowSave ? '저장' : '불러오기'}">
      <h3>${allowSave ? '저장 / 불러오기' : '불러오기'}</h3>
      ${rows}
      <div class="msg" id="save-msg">${mode === 'save' && !allowSave ? '심문 중에는 저장할 수 없습니다.' : ''}</div>
      <div class="actions"><button class="btn ghost" id="m-close">닫기</button></div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) closeSaves(); });
    m.querySelector('#m-close').addEventListener('click', closeSaves);
    m.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
      const ok = saveSlot(Number(b.dataset.save));
      openSaves('save');
      document.getElementById('save-msg').textContent = ok
        ? `슬롯 ${Number(b.dataset.save) + 1}에 저장했습니다.`
        : '이 브라우저에서는 저장이 이번 접속 동안만 유지됩니다.';
    }));
    m.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => loadSlot(Number(b.dataset.load))));
    m.querySelector('#m-close').focus();
  }
  function closeSaves() { const m = document.getElementById('modal'); if (m) m.remove(); }

  /* ───────── 상단 막대 ───────── */
  function setWhere(t) { whereEl.textContent = t; }
  function refreshTools() {
    const inGame = G.mode !== 'title';
    saveBtn.disabled = !canSave();
    saveBtn.title = canSave() ? '' : '심문 중에는 저장할 수 없습니다';
    titleBtn.hidden = !inGame;
    const midCase = (G.mode === 'case' && C && C.phase !== 'prep') || G.mode === 'conclude';
    titleBtn.disabled = midCase;
    loadBtn.disabled = midCase;
  }
  saveBtn.addEventListener('click', () => openSaves('save'));
  loadBtn.addEventListener('click', () => openSaves('load'));
  titleBtn.addEventListener('click', () => {
    if (titleBtn.disabled) return;
    showTitle();
  });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('modal')) { if (e.key === 'Escape') closeSaves(); return; }
    if (G.mode === 'conclude') {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      typeOpinion();
      return;
    }
    if (G.mode === 'scene' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
      e.preventDefault();
      advance();
    }
  });

  /* 테스트·디버그용 훅 */
  window.__mt3 = { G, get C() { return C; }, get S() { return S; }, enterFlow, startCase, LIMIT };

  showTitle();
})();
