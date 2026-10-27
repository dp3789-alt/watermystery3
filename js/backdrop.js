/* 물때 3 — 장소 배경
 * 외부 이미지 없이 SVG로 그린다. 화면 크기는 960×400, 인물은 오른쪽(또는 가운데)에 겹쳐 놓인다.
 * 한 화면에 배경이 여러 장 있을 수 있으므로 그라데이션·필터 id는 그릴 때마다 접두사를 새로 붙인다.
 */
const BACKDROP = (() => {
  'use strict';

  let seq = 0;
  const FONT = "'IBM Plex Sans KR', sans-serif";

  function rng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const pts = (list) => list.map((p) => p.map((v) => +v.toFixed(1)).join(',')).join(' ');
  const poly = (list, attrs) => `<polygon points="${pts(list)}" ${attrs}/>`;
  const range = (n, f) => Array.from({ length: n }, (_, k) => f(k)).join('');

  // 소실점(vx, vy)을 향해 깊이 d만큼 들어간 점
  const deep = (vx, vy) => (x, y, d) => [vx + (x - vx) / (1 + d), vy + (y - vy) / (1 + d)];

  function lin(id, stops, x2 = 0, y2 = 1, x1 = 0, y1 = 0) {
    return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
  }
  function rad(id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
    return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
  }

  // 모든 장소가 함께 쓰는 필터: 흐림(빛 번짐), 필름 결
  function common(u) {
    const blur = (n) => `<filter id="${u}b${n}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n}"/></filter>`;
    return `${[1, 3, 8, 18, 40].map(blur).join('')}
      <filter id="${u}grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 .78"/>
      </filter>
      ${rad(`${u}vig`, [[0.55, '#000', 0], [1, '#000', 0.75]], 0.5, 0.45, 0.75)}`;
  }
  function finish(u, vig = 0.8, grain = 0.22) {
    return `<rect width="960" height="400" filter="url(#${u}grain)" opacity="${grain}"/>
      <rect width="960" height="400" fill="url(#${u}vig)" opacity="${vig}"/>`;
  }
  const glow = (u, x, y, rx, ry, c, a, b = 18) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${a}" filter="url(#${u}b${b})"/>`;

  function rain(seed, n, a = 0.3, col = '#a9bccb') {
    const r = rng(seed);
    return range(n, () => {
      const x = r() * 1000 - 20, y = r() * 400, l = 10 + r() * 16;
      return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l-${(l * 0.25).toFixed(1)} ${l.toFixed(1)}" stroke="${col}" stroke-opacity="${(a * (0.4 + r() * 0.6)).toFixed(2)}" stroke-width="${(0.6 + r() * 0.8).toFixed(1)}"/>`;
    });
  }

  // 창문 격자. lit: 켜진 창 색 목록
  function grid(seed, x0, y0, cols, rows, w, h, gx, gy, lit, off, p) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const on = r() < p;
      out += `<rect x="${(x0 + i * (w + gx)).toFixed(1)}" y="${(y0 + j * (h + gy)).toFixed(1)}" width="${w}" height="${h}" fill="${on ? pick(r, lit) : off}"${on ? ` opacity="${(0.7 + r() * 0.3).toFixed(2)}"` : ''}/>`;
    }
    return out;
  }

  // 도시 실루엣 한 겹
  function skyline(seed, base, col, lit, opt = {}) {
    const r = rng(seed);
    const { minH = 50, maxH = 170, minW = 40, maxW = 110, p = 0.25, win = true, from = -20, to = 980 } = opt;
    let x = from, out = '';
    while (x < to) {
      const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH);
      out += `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 2).toFixed(1)}" fill="${col}"/>`;
      if (r() < 0.25) out += `<rect x="${(x + w * 0.3).toFixed(1)}" y="${(base - h - 10).toFixed(1)}" width="${(w * 0.4).toFixed(1)}" height="10" fill="${col}"/>`;
      if (win && lit.length) {
        const cols = Math.floor((w - 8) / 10), rows = Math.floor((h - 12) / 13);
        out += grid(seed * 7 + Math.floor(x), x + 6, base - h + 10, cols, rows, 5, 7, 5, 6, lit, col, p);
      }
      x += w + r() * 6;
    }
    return out;
  }

  const BG = {
    /* ── 경찰서 앞 · 낮 ── */
    station(u, o = {}) {
      const vp = [480, 214];
      const tiles = range(25, (k) => {
        const x = -1200 + k * 140;
        return `<path d="M${vp[0]} ${vp[1]} L${x} 400" stroke="#6f6a60" stroke-width="1" opacity=".35"/>`;
      }) + [306, 316, 330, 350, 378].map((y) => `<path d="M0 ${y} H960" stroke="#6f6a60" stroke-width="1" opacity=".3"/>`).join('');
      const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
          <ellipse cx="6" cy="96" rx="60" ry="9" fill="#2b2a24" opacity=".35" filter="url(#${u}b3)"/>
          <path d="M-4 96 L-2 30 Q0 20 4 30 L8 96 Z" fill="#4a3a2c"/><path d="M0 50 L-24 18 M4 44 L26 14" stroke="#4a3a2c" stroke-width="4"/>
          ${[[-30, 10, 32], [24, 4, 34], [-6, -18, 38], [-40, -16, 24], [40, -20, 26], [4, -46, 30]].map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="url(#${u}leaf)"/>`).join('')}
          ${[[-34, 0, 12], [18, -8, 13], [-4, -40, 12], [36, -30, 9]].map(([cx, cy, rr]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#9cb27a" opacity=".22"/>`).join('')}
        </g>`;
      const band = (x0, x1, y, h) => `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="url(#${u}glass)"/>
          ${range(Math.floor((x1 - x0) / 34), (k) => `<rect x="${x0 + 34 * (k + 1) - 1.5}" y="${y}" width="3" height="${h}" fill="#2b3943"/>`)}
          <rect x="${x0}" y="${y}" width="${x1 - x0}" height="3" fill="#2b3943"/><rect x="${x0}" y="${y + h}" width="${x1 - x0}" height="5" fill="#000" opacity=".18"/>`;
      const car = o.car ? `<g transform="translate(520 286)">
          <ellipse cx="160" cy="92" rx="190" ry="14" fill="#000" opacity=".45" filter="url(#${u}b3)"/>
          <path d="M0 76 Q-2 52 18 46 L74 36 Q104 8 150 6 L222 6 Q262 8 290 36 L326 44 Q346 50 346 70 L344 84 Q344 90 336 90 L8 90 Q0 88 0 76 Z" fill="url(#${u}car)"/>
          <path d="M92 38 Q114 14 150 13 L180 13 L180 40 Z" fill="url(#${u}cwin)"/><path d="M188 13 L220 13 Q252 15 274 40 L188 40 Z" fill="url(#${u}cwin)"/>
          <path d="M184 12 V42" stroke="#15191b" stroke-width="5"/>
          <path d="M14 58 Q170 48 340 58" stroke="#c9d3d6" stroke-width="1.5" opacity=".35" fill="none"/>
          <path d="M184 46 V84 M92 46 Q100 70 92 86" stroke="#0b0e0f" stroke-width="1.5" opacity=".6" fill="none"/>
          <rect x="196" y="54" width="18" height="4" rx="2" fill="#9aa4a7"/><rect x="112" y="54" width="18" height="4" rx="2" fill="#9aa4a7"/>
          <path d="M328 50 L344 56 L344 64 L330 62 Z" fill="#ffe6b0"/>${glow(u, 342, 58, 16, 8, '#ffe8b8', 0.6, 3)}
          <path d="M0 56 L10 52 L12 62 L0 64 Z" fill="#c23a2c"/>
          ${[64, 276].map((cx) => `<circle cx="${cx}" cy="88" r="25" fill="#0a0c0d"/><circle cx="${cx}" cy="88" r="15" fill="url(#${u}rim)"/>
            ${range(5, (k) => `<path d="M${cx} 88 L${(cx + 13 * Math.cos(k * 1.2566)).toFixed(1)} ${(88 + 13 * Math.sin(k * 1.2566)).toFixed(1)}" stroke="#3a4144" stroke-width="3"/>`)}<circle cx="${cx}" cy="88" r="4" fill="#2b3134"/>`)}
        </g>` : '';
      return `<defs>
          ${lin(`${u}sky`, [[0, '#6c8aa3'], [0.55, '#b4c3c9'], [1, '#e8dcc4']])}
          ${lin(`${u}wall`, [[0, '#e6e0d3'], [0.6, '#cfc8b9'], [1, '#aea797']], 1, 0)}
          ${lin(`${u}side`, [[0, '#9f998b'], [1, '#86806f']], 1, 0)}
          ${lin(`${u}glass`, [[0, '#a9c0cc'], [0.35, '#5f7b8b'], [0.42, '#3c5262'], [0.6, '#56707f'], [1, '#2a3a45']], 1, 1)}
          ${lin(`${u}door`, [[0, '#5d7483'], [0.7, '#2c3a43'], [1, '#b99a6a']])}
          ${lin(`${u}ground`, [[0, '#b3ab9b'], [1, '#8a8476']])}
          ${lin(`${u}step`, [[0, '#d8d1c2'], [1, '#bcb5a6']])}
          ${lin(`${u}car`, [[0, '#4a5357'], [0.45, '#262c2f'], [1, '#14181a']])}
          ${lin(`${u}cwin`, [[0, '#b9cbd2'], [0.5, '#4f6670'], [1, '#1e2a30']], 1, 1)}
          ${rad(`${u}rim`, [[0, '#9aa3a6'], [1, '#4c5356']])}
          ${rad(`${u}leaf`, [[0, '#6f8b52'], [0.7, '#344a2b'], [1, '#1f2e1c']], 0.35, 0.3, 0.75)}
          ${rad(`${u}sun`, [[0, '#fff3d6', 0.9], [1, '#fff3d6', 0]])}
          <clipPath id="${u}plaza"><rect y="300" width="960" height="100"/></clipPath>
        </defs>
        <rect width="960" height="400" fill="url(#${u}sky)"/>
        <circle cx="90" cy="30" r="180" fill="url(#${u}sun)" opacity=".7"/>
        ${[[180, 70, 170, 20], [470, 34, 200, 16], [780, 80, 180, 22], [650, 22, 110, 10], [40, 120, 120, 12]].map(([x, y, rx, ry]) => glow(u, x, y, rx, ry, '#fbf6ec', 0.55, 8)).join('')}
        <g opacity=".55" filter="url(#${u}b1)">${skyline(3, 250, '#9aa6ad', [], { minH: 40, maxH: 140, win: false })}</g>
        <g opacity=".75">${skyline(9, 262, '#8b979d', [], { minH: 30, maxH: 90, win: false })}</g>

        <!-- 본관 -->
        <polygon points="120,96 150,82 150,300 120,306" fill="url(#${u}side)"/>
        <rect x="150" y="82" width="660" height="218" fill="url(#${u}wall)"/>
        <rect x="142" y="72" width="676" height="12" fill="#8f897c"/><rect x="142" y="84" width="676" height="5" fill="#000" opacity=".15"/>
        ${band(170, 360, 104, 34)}${band(170, 360, 156, 34)}${band(170, 360, 208, 34)}
        ${band(600, 790, 104, 34)}${band(600, 790, 156, 34)}${band(600, 790, 208, 34)}
        <!-- 가운데 탑 -->
        <rect x="372" y="40" width="216" height="260" fill="#e9e4d8"/><rect x="566" y="40" width="22" height="260" fill="#c4bdae"/>
        <rect x="364" y="32" width="232" height="10" fill="#8f897c"/>
        <rect x="396" y="56" width="168" height="134" fill="url(#${u}glass)"/>
        ${range(4, (k) => `<rect x="${396 + 42 * (k + 1) - 1.5}" y="56" width="3" height="134" fill="#2b3943"/>`)}
        ${range(3, (k) => `<rect x="396" y="${56 + 44 * (k + 1) - 2}" width="168" height="4" fill="#2b3943"/>`)}
        <polygon points="400,60 450,60 410,186 400,186" fill="#fff" opacity=".12"/>
        <!-- 간판 -->
        <rect x="380" y="198" width="200" height="30" fill="#18376a"/><rect x="380" y="198" width="200" height="3" fill="#3c63a3"/>
        <circle cx="404" cy="213" r="10" fill="#f0d27a"/><path d="M404 205 l6 4 -2 9 h-8 l-2 -9 Z" fill="#18376a"/>
        <text x="492" y="221" fill="#fff" font-size="18" font-weight="600" text-anchor="middle" font-family="${FONT}" letter-spacing="14">경찰서</text>
        <!-- 현관 -->
        <rect x="392" y="242" width="176" height="58" fill="url(#${u}door)"/>
        ${[436, 480, 524].map((x) => `<rect x="${x - 1.5}" y="242" width="3" height="58" fill="#1f2a30"/>`).join('')}
        <polygon points="396,246 430,246 404,300 396,300" fill="#fff" opacity=".14"/>
        ${glow(u, 480, 296, 70, 8, '#f4d39a', 0.35, 3)}
        <rect x="370" y="232" width="220" height="10" fill="#57544d"/><rect x="370" y="232" width="220" height="2" fill="#a7a293"/>
        <rect x="370" y="242" width="220" height="10" fill="#000" opacity=".22" filter="url(#${u}b3)"/>
        <rect x="378" y="242" width="10" height="58" fill="#d9d3c5"/><rect x="572" y="242" width="10" height="58" fill="#c2bbac"/>
        <!-- 화단 -->
        ${[[156, 352], [606, 804]].map(([a, b]) => `<rect x="${a}" y="282" width="${b - a}" height="20" rx="6" fill="#2f4428"/>${range(Math.floor((b - a) / 22), (k) => `<circle cx="${a + 11 + k * 22}" cy="284" r="11" fill="#3d5832"/><circle cx="${a + 8 + k * 22}" cy="280" r="5" fill="#7e9a5f" opacity=".35"/>`)}`).join('')}
        <!-- 바닥 -->
        <rect y="300" width="960" height="100" fill="url(#${u}ground)"/>
        <g clip-path="url(#${u}plaza)">${tiles}</g>
        <rect y="300" width="960" height="6" fill="#000" opacity=".12"/>
        <polygon points="380,300 580,300 590,308 370,308" fill="url(#${u}step)"/><rect x="370" y="308" width="220" height="3" fill="#8f897c"/>
        <polygon points="370,311 590,311 602,320 358,320" fill="url(#${u}step)"/><rect x="358" y="320" width="244" height="3" fill="#8f897c"/>
        <polygon points="358,323 602,323 616,334 344,334" fill="url(#${u}step)"/><rect x="344" y="334" width="272" height="4" fill="#7f796c"/>
        <!-- 깃대 -->
        ${[[236, '#f3f1ea', true], [268, '#1d3f73'], [300, '#f3f1ea']].map(([x, c, tg]) => `<rect x="${x}" y="150" width="3" height="152" fill="#8a8c8b"/><circle cx="${x + 1.5}" cy="149" r="3" fill="#c9b36b"/>
          <path d="M${x + 3} 154 q12 -4 24 0 t24 0 v28 q-12 -4 -24 0 t-24 0 Z" fill="${c}"/>${tg ? `<circle cx="${x + 27}" cy="168" r="6" fill="#c2342b"/><path d="M${x + 21} 168 a6 6 0 0 0 12 0 a3 3 0 0 1 -6 0 a3 3 0 0 0 -6 0" fill="#1d3f8a"/>` : ''}`).join('')}
        <!-- 게시판 -->
        <g transform="translate(36 262)"><ellipse cx="40" cy="104" rx="50" ry="6" fill="#000" opacity=".25" filter="url(#${u}b3)"/>
          <rect x="6" y="40" width="6" height="64" fill="#3d4a44"/><rect x="68" y="40" width="6" height="64" fill="#3d4a44"/>
          <rect width="80" height="58" rx="2" fill="#2f4a3f"/><rect x="-4" y="-8" width="88" height="10" rx="2" fill="#3b5a4c"/>
          <rect x="6" y="6" width="32" height="44" fill="#ece6d4"/><rect x="42" y="6" width="32" height="26" fill="#e4dcc6"/><rect x="42" y="36" width="32" height="14" fill="#d9b86a"/>
          <path d="M10 14 h24 M10 20 h20 M10 26 h22 M10 32 h18 M46 12 h24 M46 18 h18" stroke="#6b6a62" stroke-width="1.5"/></g>
        ${tree(96, 250, 1)}${tree(880, 246, 1.1)}
        ${car}
        ${finish(u, 0.45, 0.16)}`;
    },

    /* ── 모니터실 · 진술녹화실을 보는 방 ── */
    monitor(u) {
      const r = rng(17);
      const screens = range(9, (k) => {
        const i = k % 3, j = Math.floor(k / 3);
        const x = 694 + i * 80, y = 50 + j * 66;
        const kind = k % 4;
        const base = pick(r, ['#3f6f6a', '#4a6f7c', '#56706a', '#3b5c66']);
        const art = kind === 0
          ? `<path d="M${x} ${y + 58} L${x + 30} ${y + 26} L${x + 44} ${y + 26} L${x + 74} ${y + 58} Z" fill="#000" opacity=".3"/><rect x="${x + 30}" y="${y + 14}" width="14" height="12" fill="#cfe" opacity=".25"/>`
          : kind === 1
            ? `<rect x="${x + 18}" y="${y + 36}" width="38" height="5" fill="#000" opacity=".35"/><circle cx="${x + 36}" cy="${y + 26}" r="6" fill="#000" opacity=".4"/><path d="M${x + 26} ${y + 40} q10 -12 20 0" fill="#000" opacity=".4"/>`
            : kind === 2
              ? `${range(4, (m) => `<path d="M${x + 4 + m * 20} ${y + 58} L${x + 12 + m * 18} ${y + 34}" stroke="#e8f0d0" stroke-opacity=".3"/>`)}<rect x="${x + 40}" y="${y + 38}" width="22" height="10" fill="#000" opacity=".35"/>`
              : `<rect x="${x + 6}" y="${y + 10}" width="20" height="44" fill="#000" opacity=".25"/><rect x="${x + 48}" y="${y + 10}" width="20" height="44" fill="#000" opacity=".25"/>`;
        return `<rect x="${x}" y="${y}" width="74" height="58" fill="${base}"/>${art}
          <rect x="${x}" y="${y}" width="74" height="58" fill="url(#${u}scan)"/>
          <rect x="${x}" y="${y}" width="74" height="58" fill="url(#${u}crt)"/>
          <text x="${x + 4}" y="${y + 9}" font-size="6" fill="#e8fff6" opacity=".7" font-family="monospace">CAM ${String(k + 1).padStart(2, '0')}</text>
          ${k === 4 ? `<circle cx="${x + 66}" cy="${y + 7}" r="2.5" fill="#ff4d3a"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}`;
      });
      return `<defs>
          ${lin(`${u}wall`, [[0, '#1a2427'], [1, '#0d1315']])}
          ${lin(`${u}room`, [[0, '#8e9a91'], [0.7, '#6a766f'], [1, '#4f5953']])}
          ${lin(`${u}rfloor`, [[0, '#4a4f49'], [1, '#353934']])}
          ${lin(`${u}desk`, [[0, '#28343a'], [0.08, '#1a2327'], [1, '#0b1012']])}
          ${lin(`${u}refl`, [[0, '#fff', 0], [0.5, '#fff', 0.09], [1, '#fff', 0]], 1, 0)}
          ${rad(`${u}crt`, [[0.6, '#000', 0], [1, '#000', 0.55]])}
          ${rad(`${u}cone`, [[0, '#fff8e0', 0.5], [1, '#fff8e0', 0]], 0.5, 0, 1)}
          <pattern id="${u}scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".35"/></pattern>
          <pattern id="${u}panel" width="64" height="400" patternUnits="userSpaceOnUse"><rect width="2" height="400" fill="#000" opacity=".35"/><rect x="2" width="1" height="400" fill="#fff" opacity=".04"/></pattern>
          <pattern id="${u}keys" width="7" height="6" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="5" height="4" rx="1" fill="#2a3337"/></pattern>
          <clipPath id="${u}win"><rect x="132" y="52" width="496" height="206"/></clipPath>
        </defs>
        <rect width="960" height="400" fill="url(#${u}wall)"/>
        <rect width="960" height="300" fill="url(#${u}panel)"/>
        ${glow(u, 810, 150, 190, 130, '#4fb3a3', 0.28, 40)}
        <!-- 유리 너머 진술녹화실 -->
        <g clip-path="url(#${u}win)">
          <rect x="132" y="52" width="496" height="206" fill="url(#${u}room)"/>
          <rect x="132" y="216" width="496" height="42" fill="url(#${u}rfloor)"/>
          <polygon points="380,52 230,258 530,258" fill="url(#${u}cone)"/>
          <circle cx="560" cy="96" r="15" fill="#dcd8cb" stroke="#2c3230" stroke-width="3"/><path d="M560 96 V86 M560 96 L567 100" stroke="#2c3230" stroke-width="2"/>
          <rect x="250" y="100" width="70" height="60" fill="#5c6862" opacity=".6"/>
          <g filter="url(#${u}b1)">
            <rect x="378" y="150" width="44" height="64" rx="4" fill="#2d322f"/>
            <circle cx="400" cy="134" r="17" fill="#262b28"/><path d="M370 196 Q372 162 400 158 Q428 162 430 196 Z" fill="#262b28"/>
            <rect x="300" y="198" width="200" height="10" fill="#4b463e"/><rect x="310" y="208" width="8" height="40" fill="#3d3932"/><rect x="482" y="208" width="8" height="40" fill="#3d3932"/>
            <rect x="350" y="190" width="40" height="8" fill="#ddd6c4" opacity=".7"/>
          </g>
          <rect x="132" y="52" width="496" height="206" fill="#0a2a2c" opacity=".42"/>
          <polygon points="170,52 260,52 160,258 70,258" fill="url(#${u}refl)"/>
          <polygon points="330,52 360,52 260,258 230,258" fill="url(#${u}refl)"/>
          ${glow(u, 600, 160, 60, 80, '#5fd0bd', 0.2, 18)}
        </g>
        <rect x="124" y="44" width="512" height="222" fill="none" stroke="#2b3538" stroke-width="10"/>
        <rect x="119" y="262" width="522" height="8" fill="#323d41"/>
        <!-- 감시 모니터 -->
        <rect x="684" y="40" width="250" height="214" rx="3" fill="#080b0c"/>
        ${screens}
        <rect x="684" y="254" width="250" height="10" fill="#141a1c"/>
        <!-- 책상 -->
        <polygon points="0,292 960,292 960,400 0,400" fill="url(#${u}desk)"/>
        <rect y="290" width="960" height="3" fill="#4d6168" opacity=".8"/>
        ${glow(u, 800, 300, 220, 30, '#4fb3a3', 0.3, 18)}${glow(u, 380, 300, 260, 16, '#6aa59a', 0.12, 18)}
        <g transform="translate(150 316) rotate(-6)"><rect width="96" height="62" fill="#d6d2c4" opacity=".85"/><path d="M10 12 h70 M10 20 h60 M10 28 h72 M10 36 h40" stroke="#666" stroke-width="1.5" opacity=".6"/></g>
        <g transform="translate(196 306) rotate(5)"><rect width="88" height="58" fill="#e4e0d2" opacity=".9"/><rect x="8" y="8" width="30" height="24" fill="#8a8f88" opacity=".6"/><path d="M44 12 h34 M44 20 h28 M8 40 h70 M8 48 h56" stroke="#666" stroke-width="1.5" opacity=".6"/></g>
        <polygon points="404,318 600,318 616,350 388,350" fill="#0c1112"/><polygon points="406,320 598,320 612,346 392,346" fill="url(#${u}keys)"/>
        <g><ellipse cx="330" cy="352" rx="22" ry="6" fill="#0b0f10"/><path d="M330 350 Q326 300 360 280" stroke="#151b1d" stroke-width="4" fill="none"/><rect x="354" y="272" width="16" height="12" rx="4" transform="rotate(30 362 278)" fill="#1e2629"/></g>
        <g transform="translate(650 312)"><rect width="150" height="44" rx="3" fill="#121819"/><rect x="0" y="0" width="150" height="3" fill="#33403f"/>
          ${range(8, (k) => `<rect x="${10 + k * 17}" y="12" width="10" height="20" rx="2" fill="#262f31"/><rect x="${12 + k * 17}" y="${18 + (k * 5) % 9}" width="6" height="3" fill="#8a9a97"/>`)}
          <circle cx="140" cy="10" r="2.5" fill="#53e08a"/>${glow(u, 790, 322, 6, 6, '#53e08a', 0.7, 3)}</g>
        <g transform="translate(860 330)"><ellipse cx="18" cy="40" rx="20" ry="5" fill="#000" opacity=".5"/><path d="M2 4 L6 40 Q18 46 30 40 L34 4 Z" fill="#e7e2d6"/><ellipse cx="18" cy="4" rx="16" ry="4" fill="#3a2a20"/><path d="M34 12 q12 2 10 14 q-2 8 -12 8" stroke="#e7e2d6" stroke-width="4" fill="none"/></g>
        ${finish(u, 0.85, 0.24)}`;
    },

    /* ── 진술녹화실 ── */
    interrogation(u) {
      const v = deep(480, 168);
      const B = { x0: 230, x1: 730, y0: 62, y1: 282 };
      // 왼쪽 벽 위 점: 깊이 비율 t(0 = 화면 앞, 1 = 뒷벽), 높이 비율 f
      const lw = (t, f) => { const x = t * B.x0, top = t * B.y0, bot = 400 - t * (400 - B.y1); return [x, top + f * (bot - top)]; };
      const rw = (t, f) => { const x = 960 - t * (960 - B.x1), top = t * B.y0, bot = 400 - t * (400 - B.y1); return [x, top + f * (bot - top)]; };
      const floorLines = range(13, (k) => {
        const x = -240 + k * 120;
        const [fx] = v(x, 400, 0);
        return `<path d="M${fx} 400 L${(B.x0 + (x + 240) / 1440 * (B.x1 - B.x0)).toFixed(1)} ${B.y1}" stroke="#000" stroke-opacity=".22"/>`;
      }) + [286, 292, 300, 311, 326, 346, 372].map((y) => `<path d="M0 ${y} H960" stroke="#000" stroke-opacity=".2"/>`).join('');
      return `<defs>
          ${rad(`${u}back`, [[0, '#9aa49b'], [1, '#626c66']], 0.5, 0.35, 0.7)}
          ${lin(`${u}lwall`, [[0, '#3d4642'], [1, '#5a645e']], 1, 0)}
          ${lin(`${u}rwall`, [[0, '#5d6761'], [1, '#3a433f']], 1, 0)}
          ${lin(`${u}ceil`, [[0, '#262c2a'], [1, '#3c4440']])}
          ${lin(`${u}floor`, [[0, '#5c5a50'], [1, '#34332d']])}
          ${lin(`${u}mirror`, [[0, '#2a3638'], [0.5, '#1a2224'], [1, '#273133']], 1, 1)}
          ${lin(`${u}table`, [[0, '#7a7466'], [1, '#5a5548']])}
          ${lin(`${u}cone`, [[0, '#fff6dc', 0.42], [1, '#fff6dc', 0]])}
          ${rad(`${u}pool`, [[0, '#fff3d0', 0.55], [1, '#fff3d0', 0]])}
          <pattern id="${u}acou" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.4" fill="#000" opacity=".22"/></pattern>
          <clipPath id="${u}fl"><polygon points="0,400 ${B.x0},${B.y1} ${B.x1},${B.y1} 960,400"/></clipPath>
        </defs>
        <rect width="960" height="400" fill="#2c3331"/>
        <polygon points="0,0 960,0 ${B.x1},${B.y0} ${B.x0},${B.y0}" fill="url(#${u}ceil)"/>
        <polygon points="0,0 ${B.x0},${B.y0} ${B.x0},${B.y1} 0,400" fill="url(#${u}lwall)"/>
        <polygon points="960,0 ${B.x1},${B.y0} ${B.x1},${B.y1} 960,400" fill="url(#${u}rwall)"/>
        <rect x="${B.x0}" y="${B.y0}" width="${B.x1 - B.x0}" height="${B.y1 - B.y0}" fill="url(#${u}back)"/>
        <rect x="${B.x0}" y="${B.y0}" width="${B.x1 - B.x0}" height="150" fill="url(#${u}acou)"/>
        <rect x="${B.x0}" y="${B.y0 + 150}" width="${B.x1 - B.x0}" height="4" fill="#4a524d"/>
        <rect x="${B.x0}" y="${B.y1 - 10}" width="${B.x1 - B.x0}" height="10" fill="#3a403c"/>
        <!-- 천장 등 -->
        ${poly([v(380, 0, 0.9), v(580, 0, 0.9), v(580, 0, 2.2), v(380, 0, 2.2)], `fill="#e9f0e6"`)}
        ${glow(u, 480, 34, 120, 12, '#f6f3df', 0.6, 8)}
        <!-- 왼쪽 벽: 반투명 거울 -->
        ${poly([lw(0.18, 0.2), lw(0.82, 0.2), lw(0.82, 0.6), lw(0.18, 0.6)], `fill="url(#${u}mirror)" stroke="#262c2a" stroke-width="6"`)}
        ${poly([lw(0.3, 0.2), lw(0.42, 0.2), lw(0.3, 0.6), lw(0.2, 0.6)], `fill="#fff" opacity=".06"`)}
        ${poly([lw(0.55, 0.2), lw(0.6, 0.2), lw(0.5, 0.6), lw(0.46, 0.6)], `fill="#fff" opacity=".05"`)}
        <!-- 오른쪽 벽: 문 -->
        ${poly([rw(0.5, 0.36), rw(0.82, 0.36), rw(0.82, 1), rw(0.5, 1)], `fill="#4a4f4b" stroke="#2a2f2c" stroke-width="3"`)}
        ${poly([rw(0.58, 0.44), rw(0.74, 0.44), rw(0.74, 0.58), rw(0.58, 0.58)], `fill="#1b2224"`)}
        <circle cx="${rw(0.56, 0.7)[0]}" cy="${rw(0.56, 0.7)[1]}" r="4" fill="#9a9a8e"/>
        <!-- 카메라 -->
        <g transform="translate(${B.x1 - 34} ${B.y0 + 8})"><rect x="14" y="-8" width="4" height="10" fill="#1d2221"/><rect x="-6" y="2" width="34" height="16" rx="3" fill="#1d2221"/><circle cx="-4" cy="10" r="6" fill="#0c0f0f" stroke="#3a403e"/>
          <circle cx="24" cy="6" r="2.2" fill="#ff4b37"><animate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite"/></circle></g>
        ${glow(u, B.x1 - 10, B.y0 + 14, 8, 8, '#ff4b37', 0.5, 3)}
        <!-- 시계 -->
        <circle cx="${B.x0 + 400}" cy="${B.y0 + 70}" r="20" fill="#e5e0d0" stroke="#2c3230" stroke-width="4"/><path d="M${B.x0 + 400} ${B.y0 + 70} V${B.y0 + 56} M${B.x0 + 400} ${B.y0 + 70} L${B.x0 + 410} ${B.y0 + 76}" stroke="#2c3230" stroke-width="2.5"/>
        <!-- 바닥 -->
        <polygon points="0,400 ${B.x0},${B.y1} ${B.x1},${B.y1} 960,400" fill="url(#${u}floor)"/>
        <g clip-path="url(#${u}fl)">${floorLines}</g>
        <!-- 빛줄기 -->
        <polygon points="420,30 540,30 760,400 200,400" fill="url(#${u}cone)" filter="url(#${u}b8)"/>
        <ellipse cx="480" cy="318" rx="250" ry="40" fill="url(#${u}pool)"/>
        <!-- 의자 -->
        <g><rect x="440" y="214" width="80" height="70" rx="6" fill="#2d3330"/><rect x="446" y="220" width="68" height="40" rx="4" fill="#3b423e"/></g>
        <!-- 책상 -->
        <ellipse cx="480" cy="372" rx="230" ry="16" fill="#000" opacity=".35" filter="url(#${u}b8)"/>
        <polygon points="330,282 630,282 700,328 260,328" fill="url(#${u}table)"/>
        <polygon points="260,328 700,328 700,340 260,340" fill="#3f3b32"/>
        <rect x="276" y="340" width="12" height="54" fill="#34312a"/><rect x="672" y="340" width="12" height="54" fill="#34312a"/>
        <polygon points="380,296 450,294 456,316 378,318" fill="#e6e0cf"/><polygon points="384,292 448,290 452,298 382,300" fill="#c9b98e"/>
        <g transform="translate(520 296)"><rect width="42" height="16" rx="3" fill="#1a1d1c"/><circle cx="34" cy="6" r="2" fill="#ff5a40"/><rect x="5" y="4" width="20" height="6" fill="#3b4a46"/></g>
        <path d="M590 306 l18 -2 2 10 -18 2 Z" fill="#d8d3c3" opacity=".8"/>
        ${finish(u, 0.9, 0.22)}`;
    },

    /* ── 강력계 사무실 · 밤 ── */
    office(u) {
      const r = rng(8);
      const bokeh = range(26, () => `<circle cx="${(r() * 960).toFixed(0)}" cy="${(60 + r() * 120).toFixed(0)}" r="${(3 + r() * 9).toFixed(1)}" fill="${pick(r, ['#ffcf7a', '#ff9f6a', '#9fd0ff', '#ffe7a8'])}" opacity="${(0.15 + r() * 0.35).toFixed(2)}"/>`);
      const desk = (x, y, s, monC) => `<g transform="translate(${x} ${y}) scale(${s})">
          <ellipse cx="0" cy="96" rx="150" ry="12" fill="#000" opacity=".4" filter="url(#${u}b3)"/>
          <polygon points="-140,40 140,40 160,62 -160,62" fill="#4f4c45"/><polygon points="-160,62 160,62 160,72 -160,72" fill="#33312c"/>
          <rect x="-150" y="72" width="10" height="24" fill="#2a2925"/><rect x="140" y="72" width="10" height="24" fill="#2a2925"/>
          ${glow(u, 0, 40, 80, 14, monC, 0.35, 8)}
          <rect x="-46" y="-28" width="92" height="58" rx="3" fill="#0d1113"/><rect x="-41" y="-23" width="82" height="48" fill="${monC}" opacity=".88"/>
          <rect x="-41" y="-23" width="82" height="48" fill="url(#${u}scr)"/>
          <rect x="-6" y="30" width="12" height="12" fill="#1a1d1e"/><rect x="-22" y="40" width="44" height="4" fill="#1a1d1e"/>
          <rect x="-120" y="22" width="44" height="20" fill="#d9d2bc"/><rect x="-118" y="16" width="40" height="6" fill="#c7bfa6"/><rect x="-116" y="10" width="38" height="6" fill="#e2dccb"/>
          <rect x="70" y="26" width="16" height="16" rx="2" fill="#e8e3d8"/><ellipse cx="78" cy="26" rx="8" ry="2" fill="#3a2a1e"/>
        </g>`;
      return `<defs>
          ${lin(`${u}night`, [[0, '#070d1a'], [0.7, '#14233a'], [1, '#3a3446']])}
          ${lin(`${u}wall`, [[0, '#262e35'], [1, '#1b2228']])}
          ${lin(`${u}floor`, [[0, '#2a3036'], [1, '#14181b']])}
          ${lin(`${u}scr`, [[0, '#fff', 0.18], [0.4, '#fff', 0], [1, '#000', 0.25]], 1, 1)}
          ${lin(`${u}lamp`, [[0, '#eaf2f0', 0.25], [1, '#eaf2f0', 0]])}
          ${rad(`${u}cork`, [[0, '#a3794b'], [1, '#6d4e30']])}
        </defs>
        <rect width="960" height="400" fill="url(#${u}wall)"/>
        <!-- 창밖 -->
        <rect x="0" y="36" width="960" height="166" fill="url(#${u}night)"/>
        ${glow(u, 480, 200, 520, 40, '#ff9a5a', 0.18, 40)}
        <g opacity=".7">${skyline(31, 200, '#16223a', ['#5a6b8c'], { minH: 60, maxH: 150, p: 0.15 })}</g>
        ${skyline(12, 202, '#0b111c', ['#e8c070', '#f2d896', '#cfe2ff'], { minH: 30, maxH: 110, p: 0.3 })}
        <g filter="url(#${u}b3)">${bokeh}</g>
        <!-- 블라인드 -->
        ${[[240, 480, 26], [720, 960, 14]].map(([a, b, n]) => range(n, (k) => `<rect x="${a}" y="${40 + k * 6}" width="${b - a}" height="3.5" fill="#a9b2b5" opacity=".55"/>`)).join('')}
        <rect x="0" y="30" width="960" height="10" fill="#2f3a44"/><rect x="0" y="198" width="960" height="10" fill="#38434c"/>
        ${[0, 240, 480, 720, 960].map((x) => `<rect x="${x - 5}" y="30" width="10" height="176" fill="#2f3a44"/>`).join('')}
        <path d="M0 118 H960" stroke="#2f3a44" stroke-width="4"/>
        <polygon points="40,40 140,40 60,198 0,198 0,120" fill="#fff" opacity=".03"/>
        <!-- 천장 형광등 -->
        <rect width="960" height="30" fill="#151a1f"/>
        ${[140, 480, 820].map((x) => `<rect x="${x - 90}" y="10" width="180" height="10" rx="2" fill="#e9f3f0"/>${glow(u, x, 16, 110, 10, '#e9f3f0', 0.6, 8)}<polygon points="${x - 90},20 ${x + 90},20 ${x + 160},400 ${x - 160},400" fill="url(#${u}lamp)" opacity=".5"/>`).join('')}
        <!-- 바닥 -->
        <rect y="206" width="960" height="194" fill="url(#${u}floor)"/>
        ${[140, 480, 820].map((x) => glow(u, x, 330, 90, 12, '#d8e6e4', 0.12, 8)).join('')}
        <!-- 사건 게시판 -->
        <g transform="translate(18 216)">
          <rect width="190" height="110" fill="url(#${u}cork)"/><rect width="190" height="110" fill="none" stroke="#3a2c1c" stroke-width="5"/>
          ${[[14, 12, '#e8e2d0', -4], [62, 18, '#cfd6d8', 3], [112, 10, '#e8e2d0', -2], [148, 40, '#f2df7a', 5], [26, 60, '#d8d0bc', 2], [82, 62, '#e8e2d0', -3], [130, 72, '#f2df7a', -6]].map(([x, y, c, a]) => `<g transform="rotate(${a} ${x + 16} ${y + 16})"><rect x="${x}" y="${y}" width="34" height="36" fill="${c}"/><rect x="${x + 4}" y="${y + 4}" width="26" height="18" fill="#59646a" opacity="${c === '#f2df7a' ? 0 : 0.6}"/></g>`).join('')}
          <path d="M30 22 L78 28 L128 20 L162 52 L98 72 L42 70 Z M78 28 L98 72" stroke="#c4302a" stroke-width="1.5" fill="none"/>
          ${[[30, 22], [78, 28], [128, 20], [162, 52], [98, 72], [42, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#d9372e"/>`).join('')}
        </g>
        <!-- 뉴스 TV -->
        <g transform="translate(250 52)"><rect width="150" height="88" rx="3" fill="#07090b"/><rect x="5" y="5" width="140" height="78" fill="#2a4766"/>
          <rect x="5" y="5" width="140" height="78" fill="url(#${u}scr)"/><rect x="5" y="62" width="140" height="14" fill="#b23a2b"/><rect x="5" y="76" width="140" height="7" fill="#0e1622"/>
          <rect x="16" y="20" width="42" height="34" fill="#4c6884"/><circle cx="96" cy="30" r="9" fill="#18283a"/><path d="M80 58 q16 -22 32 0 Z" fill="#18283a"/></g>
        ${glow(u, 325, 96, 100, 60, '#4f7eb0', 0.18, 18)}
        <!-- 책상 -->
        ${desk(470, 222, 0.8, '#3d6c88')}
        ${desk(200, 270, 1.05, '#4c7a92')}
        <!-- 캐비닛 -->
        <g transform="translate(880 196)"><rect width="74" height="180" fill="#4b5559"/><rect width="74" height="180" fill="url(#${u}scr)" opacity=".5"/>
          ${[0, 1, 2, 3].map((k) => `<rect x="6" y="${8 + k * 43}" width="62" height="38" fill="#424b4f" stroke="#2e3538"/><rect x="28" y="${22 + k * 43}" width="18" height="4" rx="2" fill="#9aa3a6"/>`).join('')}</g>
        ${finish(u, 0.8, 0.22)}`;
    },

    /* ── 경찰서 옥상 · 밤~새벽 ── */
    rooftop(u) {
      const r = rng(77);
      const stars = range(70, () => `<circle cx="${(r() * 960).toFixed(0)}" cy="${(r() * 170).toFixed(0)}" r="${(0.4 + r() * 1.1).toFixed(1)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`);
      const v = deep(480, 250);
      const posts = range(15, (k) => {
        const x = -300 + k * 110;
        const [bx, by] = v(x, 400, 0.15);
        return `<rect x="${(bx - 2.5).toFixed(1)}" y="${(by - 66).toFixed(1)}" width="5" height="66" fill="#59646a"/>`;
      });
      return `<defs>
          ${lin(`${u}sky`, [[0, '#050a17'], [0.45, '#14223d'], [0.75, '#3a3a5a'], [1, '#8a6366']])}
          ${lin(`${u}roof`, [[0, '#3a3f42'], [1, '#191c1e']])}
          ${lin(`${u}tank`, [[0, '#2a3034'], [0.35, '#6a757a'], [0.6, '#4a5357'], [1, '#22282b']], 1, 0)}
          ${rad(`${u}moon`, [[0, '#f8f3dd', 0.55], [1, '#f8f3dd', 0]])}
        </defs>
        <rect width="960" height="400" fill="url(#${u}sky)"/>
        ${stars}
        <circle cx="770" cy="76" r="90" fill="url(#${u}moon)"/>
        <circle cx="770" cy="76" r="24" fill="#f3eed8"/><circle cx="762" cy="70" r="5" fill="#d8d2b8" opacity=".6"/><circle cx="778" cy="84" r="3.5" fill="#d8d2b8" opacity=".5"/>
        ${[[640, 92, 160, 8], [840, 120, 140, 6], [300, 70, 200, 7]].map(([x, y, rx, ry]) => glow(u, x, y, rx, ry, '#9aa3c0', 0.35, 8)).join('')}
        ${glow(u, 480, 250, 600, 50, '#e08a5c', 0.35, 40)}
        <g opacity=".85" filter="url(#${u}b1)">${skyline(5, 252, '#2c3150', ['#7a7f9c'], { minH: 40, maxH: 120, p: 0.12 })}</g>
        ${skyline(21, 262, '#131a2b', ['#f0c87a', '#ffe1a0', '#bfd6ff'], { minH: 30, maxH: 150, p: 0.26 })}
        <!-- 송신탑 -->
        <g transform="translate(150 70)"><path d="M0 190 L14 0 L28 190 M4 130 H24 M7 80 H21 M10 40 H18 M2 160 L26 100 M26 160 L2 100" stroke="#0e1422" stroke-width="3" fill="none"/>
          <circle cx="14" cy="-2" r="3" fill="#ff3b2e"><animate attributeName="opacity" values="1;.15;1" dur="2.4s" repeatCount="indefinite"/></circle></g>
        ${glow(u, 164, 68, 10, 10, '#ff3b2e', 0.6, 3)}
        <!-- 옥상 바닥 -->
        <polygon points="0,282 960,282 960,400 0,400" fill="url(#${u}roof)"/>
        <rect y="262" width="960" height="22" fill="#2b3134"/><rect y="262" width="960" height="2" fill="#566168"/>
        ${glow(u, 770, 330, 70, 6, '#f3eed8', 0.25, 3)}
        <ellipse cx="760" cy="350" rx="110" ry="10" fill="#7a8494" opacity=".18"/>
        <!-- 난간 -->
        <rect y="200" width="960" height="5" fill="#6d7a80"/><rect y="228" width="960" height="3" fill="#59646a"/>
        ${range(25, (k) => `<rect x="${k * 40}" y="200" width="4" height="64" fill="#59646a"/>`)}
        <!-- 물탱크 -->
        <g transform="translate(40 120)">
          <ellipse cx="70" cy="166" rx="90" ry="10" fill="#000" opacity=".5" filter="url(#${u}b3)"/>
          <path d="M14 166 L22 100 M126 166 L118 100 M40 166 L46 100 M100 166 L94 100" stroke="#2a3033" stroke-width="5"/>
          <rect x="10" y="20" width="120" height="84" fill="url(#${u}tank)"/><ellipse cx="70" cy="20" rx="60" ry="10" fill="#7d878b"/><ellipse cx="70" cy="104" rx="60" ry="10" fill="#22282b"/>
          ${[44, 70].map((y) => `<path d="M10 ${y} Q70 ${y + 10} 130 ${y}" stroke="#22282b" stroke-width="2" fill="none"/>`).join('')}
          <path d="M126 30 V100 M136 30 V100 ${range(8, (k) => `M126 ${34 + k * 9} H136`)}" stroke="#3a4246" stroke-width="2"/>
        </g>
        <!-- 실외기 -->
        <g transform="translate(220 270)"><rect width="90" height="62" fill="#9aa1a3"/><rect width="90" height="62" fill="url(#${u}tank)" opacity=".5"/>
          <circle cx="44" cy="31" r="22" fill="#2a2f31"/>${range(6, (k) => `<path d="M44 31 L${(44 + 20 * Math.cos(k)).toFixed(1)} ${(31 + 20 * Math.sin(k)).toFixed(1)}" stroke="#4a5154" stroke-width="3"/>`)}
          <ellipse cx="45" cy="66" rx="52" ry="6" fill="#000" opacity=".4"/></g>
        <path d="M330 300 V250 Q330 240 340 240 H380" stroke="#4a5257" stroke-width="8" fill="none"/>
        ${finish(u, 0.85, 0.2)}`;
    },

    /* ── 자취방 · 밤 ── */
    studio(u) {
      return `<defs>
          ${lin(`${u}wall`, [[0, '#3d3a44'], [1, '#2a2830']])}
          ${lin(`${u}floor`, [[0, '#4b3a2c'], [1, '#2a2019']])}
          ${lin(`${u}out`, [[0, '#0b1222'], [1, '#1c2338']])}
          ${lin(`${u}blanket`, [[0, '#6c7a8e'], [1, '#3e4858']])}
          ${lin(`${u}scr`, [[0, '#a8d0ff'], [1, '#4a7ab8']], 1, 1)}
          ${rad(`${u}lamp`, [[0, '#ffd48a', 0.55], [1, '#ffd48a', 0]])}
          ${rad(`${u}blue`, [[0, '#7fb0ff', 0.45], [1, '#7fb0ff', 0]])}
          <pattern id="${u}paper" width="22" height="400" patternUnits="userSpaceOnUse"><rect width="11" height="400" fill="#fff" opacity=".025"/></pattern>
          <pattern id="${u}plank" width="960" height="18" patternUnits="userSpaceOnUse"><rect y="17" width="960" height="1" fill="#000" opacity=".3"/></pattern>
          <clipPath id="${u}win"><rect x="618" y="52" width="250" height="186"/></clipPath>
        </defs>
        <rect width="960" height="400" fill="url(#${u}wall)"/>
        <rect width="960" height="312" fill="url(#${u}paper)"/>
        <!-- 창문 -->
        <g clip-path="url(#${u}win)">
          <rect x="618" y="52" width="250" height="186" fill="url(#${u}out)"/>
          <rect x="640" y="70" width="210" height="200" fill="#121828"/>${grid(64, 652, 82, 6, 6, 22, 14, 10, 12, ['#e8b866', '#f0d08a', '#9fc0e8'], '#0d1220', 0.32)}
          ${range(11, (k) => `<rect x="618" y="${52 + k * 9}" width="250" height="7" fill="#c9c3b4" opacity=".95"/><rect x="618" y="${58 + k * 9}" width="250" height="1" fill="#000" opacity=".4"/>`)}
        </g>
        <rect x="612" y="46" width="262" height="198" fill="none" stroke="#5c564b" stroke-width="8"/><rect x="608" y="244" width="270" height="8" fill="#6d665a"/>
        <path d="M600 40 Q594 160 606 300 L578 300 Q570 160 584 40 Z" fill="#5b3f3a"/><path d="M590 40 Q584 160 592 300" stroke="#3e2a27" stroke-width="2" fill="none"/>
        <!-- 선반·달력 -->
        <rect x="40" y="96" width="200" height="8" fill="#6a5440"/>
        ${[[50, 34, '#8a3b33'], [62, 40, '#36506a'], [76, 30, '#c9a65a'], [88, 38, '#3e5e48'], [100, 36, '#6d6a7e'], [112, 28, '#9c7a52']].map(([x, h, c]) => `<rect x="${x}" y="${96 - h}" width="10" height="${h}" fill="${c}"/>`).join('')}
        <path d="M130 96 L150 60 L164 64 L144 96 Z" fill="#4a6070"/>
        <g transform="translate(200 76)"><rect x="-10" y="6" width="20" height="14" rx="2" fill="#a9876a"/><path d="M0 6 Q-14 -10 -6 -18 M0 6 Q4 -14 14 -16 M0 6 Q-2 -8 2 -22" stroke="#5e8a5a" stroke-width="3" fill="none"/></g>
        <g transform="translate(370 60)"><rect width="70" height="90" fill="#e9e4d6"/><rect width="70" height="22" fill="#b2423a"/>${grid(2, 6, 28, 7, 5, 6, 8, 2.6, 3, ['#b2423a'], '#bdb6a5', 0.06)}</g>
        <!-- 바닥 -->
        <rect y="312" width="960" height="88" fill="url(#${u}floor)"/><rect y="312" width="960" height="88" fill="url(#${u}plank)"/>
        <rect y="306" width="960" height="8" fill="#2a2420"/>
        <!-- 빛 -->
        <circle cx="520" cy="230" r="220" fill="url(#${u}lamp)"/>
        <circle cx="430" cy="210" r="170" fill="url(#${u}blue)"/>
        <!-- 침대 -->
        <ellipse cx="160" cy="392" rx="190" ry="12" fill="#000" opacity=".4" filter="url(#${u}b3)"/>
        <rect x="0" y="300" width="320" height="86" fill="#3a2e26"/>
        <path d="M-10 300 Q20 268 90 272 L300 276 Q326 278 326 304 L326 330 L-10 330 Z" fill="#d6d0c4"/>
        <path d="M20 284 Q36 262 86 266 Q118 270 112 290 Q90 300 30 298 Z" fill="#ebe6da"/>
        <path d="M80 296 Q140 270 210 286 Q260 270 330 292 L334 352 Q240 366 150 356 Q90 362 60 340 Z" fill="url(#${u}blanket)"/>
        <path d="M120 300 Q160 316 200 300 M210 292 Q240 320 290 304 M100 330 Q170 344 250 332" stroke="#2c3442" stroke-width="2" fill="none" opacity=".6"/>
        <!-- 책상 -->
        <ellipse cx="510" cy="394" rx="150" ry="10" fill="#000" opacity=".4" filter="url(#${u}b3)"/>
        <rect x="380" y="270" width="270" height="12" fill="#6b5442"/><rect x="380" y="282" width="270" height="6" fill="#3e3026"/>
        <rect x="392" y="288" width="10" height="104" fill="#3e3026"/><rect x="628" y="288" width="10" height="104" fill="#3e3026"/>
        ${glow(u, 466, 220, 110, 60, '#6aa0f0', 0.35, 18)}
        <rect x="406" y="176" width="120" height="80" rx="3" fill="#0d1014"/><rect x="411" y="181" width="110" height="68" fill="url(#${u}scr)"/>
        ${range(6, (k) => `<rect x="418" y="${190 + k * 9}" width="${40 + (k * 23) % 50}" height="3" fill="#fff" opacity=".45"/>`)}
        <rect x="460" y="256" width="12" height="14" fill="#1a1d22"/><rect x="444" y="266" width="44" height="4" fill="#1a1d22"/>
        <polygon points="430,268 520,268 526,274 424,274" fill="#22252b"/>
        <!-- 스탠드 -->
        <path d="M600 270 L606 210 L578 186" stroke="#2b2b2b" stroke-width="4" fill="none"/><path d="M560 176 L596 176 L590 194 L566 194 Z" fill="#2f2f2f" transform="rotate(-24 578 185)"/>
        ${glow(u, 574, 214, 40, 24, '#ffd48a', 0.7, 8)}
        <rect x="586" y="266" width="30" height="5" rx="2" fill="#2b2b2b"/>
        <g transform="translate(540 248)"><rect width="22" height="22" rx="3" fill="#e9e1d0"/><ellipse cx="11" cy="0" rx="11" ry="3" fill="#c6493a"/></g>
        <rect x="532" y="250" width="8" height="20" rx="2" fill="#3fa3a0"/>
        <!-- 어항 -->
        <g transform="translate(700 268)"><rect width="170" height="12" fill="#5c4d40"/><rect x="20" y="12" width="8" height="120" fill="#3e3328"/><rect x="142" y="12" width="8" height="120" fill="#3e3328"/>
          <rect x="44" y="-36" width="80" height="36" fill="#7fb7c8" opacity=".35"/><rect x="44" y="-36" width="80" height="36" fill="none" stroke="#c7e6ee" stroke-opacity=".5"/>
          <path d="M60 -8 q4 -16 0 -24 M100 -6 q-4 -14 2 -22" stroke="#4f8a5a" stroke-width="3" fill="none"/><path d="M80 -20 l8 -4 v8 Z M88 -20 q6 -4 10 0 q-4 4 -10 0" fill="#f08a4a"/>
          ${glow(u, 84, -18, 40, 18, '#9fd8e6', 0.3, 8)}</g>
        <!-- 옷가지 -->
        <path d="M680 396 Q700 370 740 374 Q780 366 800 388 L804 400 L676 400 Z" fill="#3b4652"/><path d="M700 390 Q730 380 770 386" stroke="#262e36" stroke-width="2" fill="none"/>
        ${finish(u, 0.85, 0.22)}`;
    },

    /* ── 증거물 보관실 ── */
    evidence(u) {
      const v = deep(480, 190);
      const r = rng(91);
      const boxC = ['#a88a5c', '#9c7f53', '#b49568', '#8f7550', '#c2a476'];
      // 왼쪽(side=-1)·오른쪽(side=1) 선반: 앞면 x, 깊이 0~3.4
      const shelf = (side) => {
        const xN = side < 0 ? 150 : 810;
        const yT = 40, yB = 380;
        const levels = [0, 0.27, 0.52, 0.76, 1];
        const P = (d, f) => v(xN, yT + f * (yB - yT), d);
        let out = poly([P(0, 0), P(3.4, 0), P(3.4, 1), P(0, 1)], `fill="#1b2124"`);
        const segs = [0, 0.5, 1.1, 1.8, 2.6, 3.4];
        for (let s = 0; s < segs.length - 1; s++) {
          for (let l = 0; l < 4; l++) {
            let d = segs[s] + 0.04;
            while (d < segs[s + 1] - 0.1) {
              const dw = 0.12 + r() * 0.16;
              const d2 = Math.min(d + dw, segs[s + 1] - 0.04);
              const h = 0.12 + r() * 0.08;
              const f1 = levels[l + 1] - 0.015, f0 = f1 - h;
              const c = pick(r, boxC);
              out += poly([P(d, f0), P(d2, f0), P(d2, f1), P(d, f1)], `fill="${c}" stroke="#4a3b28" stroke-width=".8"`);
              const lm = (d + d2) / 2;
              if (d2 - d > 0.12) out += poly([P(lm - 0.03, f0 + h * 0.3), P(lm + 0.03, f0 + h * 0.3), P(lm + 0.03, f0 + h * 0.55), P(lm - 0.03, f0 + h * 0.55)], `fill="#f2efe4" opacity=".85"`);
              d = d2 + 0.01 + r() * 0.03;
            }
          }
        }
        levels.forEach((f) => { out += poly([P(0, f - 0.008), P(3.4, f - 0.008), P(3.4, f + 0.008), P(0, f + 0.008)], `fill="#6f7b80"`); });
        segs.forEach((d) => { const a = P(d, 0), b = P(d, 1); out += `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="#8a969b" stroke-width="${(5 / (1 + d)).toFixed(1)}"/>`; });
        return out;
      };
      const tubes = [0.2, 0.9, 1.8, 3].map((d) => {
        const a = v(400, 6, d), b = v(560, 6, d), c = v(560, 16, d), e = v(400, 16, d);
        return poly([a, b, c, e], `fill="#f2fbf6"`) + glow(u, (a[0] + b[0]) / 2, a[1] + 6, (b[0] - a[0]) * 0.7, 10 / (1 + d), '#dff7ee', 0.6, 8);
      }).join('');
      const B = [v(150, 40, 3.4), v(810, 40, 3.4), v(810, 380, 3.4), v(150, 380, 3.4)];
      return `<defs>
          ${lin(`${u}floor`, [[0, '#4a524f'], [1, '#1e2322']])}
          ${lin(`${u}ceil`, [[0, '#101415'], [1, '#262d2e']])}
          ${lin(`${u}cone`, [[0, '#e6fff4', 0.2], [1, '#e6fff4', 0]])}
          <pattern id="${u}mesh" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V10 M0 0 H10" stroke="#9aa6a8" stroke-width="1" opacity=".55"/></pattern>
        </defs>
        <rect width="960" height="400" fill="#1f2627"/>
        <polygon points="0,0 960,0 ${pts([B[1], B[0]])}" fill="url(#${u}ceil)"/>
        <polygon points="0,400 960,400 ${pts([B[2], B[3]])}" fill="url(#${u}floor)"/>
        <!-- 안쪽 철망 문 -->
        ${poly(B, 'fill="#2f3a3a"')}
        <rect x="${B[0][0] + 20}" y="${B[0][1] + 14}" width="${B[1][0] - B[0][0] - 40}" height="${B[2][1] - B[0][1] - 14}" fill="#141a1b"/>
        <rect x="${B[0][0] + 20}" y="${B[0][1] + 14}" width="${B[1][0] - B[0][0] - 40}" height="${B[2][1] - B[0][1] - 14}" fill="url(#${u}mesh)"/>
        <rect x="${B[0][0] + 20}" y="${B[0][1] + 14}" width="${B[1][0] - B[0][0] - 40}" height="${B[2][1] - B[0][1] - 14}" fill="none" stroke="#6d797b" stroke-width="3"/>
        <rect x="455" y="${B[0][1] + 24}" width="50" height="12" fill="#e9e2c8"/><text x="480" y="${B[0][1] + 33}" font-size="7" text-anchor="middle" fill="#7a2a20" font-family="${FONT}" font-weight="600">출입 통제</text>
        ${shelf(-1)}${shelf(1)}
        <!-- 형광등 -->
        ${tubes}
        <polygon points="400,16 560,16 760,400 200,400" fill="url(#${u}cone)"/>
        <!-- 바닥 반사·안전선 -->
        ${[0.2, 0.9, 1.8].map((d) => { const p = v(480, 400, d); return `<ellipse cx="480" cy="${(p[1] - 6).toFixed(1)}" rx="${(120 / (1 + d)).toFixed(1)}" ry="${(10 / (1 + d)).toFixed(1)}" fill="#dff7ee" opacity=".12" filter="url(#${u}b3)"/>`; }).join('')}
        ${[[300, 304], [656, 660]].map(([a, b]) => poly([[a, 400], [b, 400], v(b, 400, 3.4), v(a, 400, 3.4)], 'fill="#c9a33a" opacity=".55"')).join('')}
        <g transform="translate(520 330)"><ellipse cx="30" cy="46" rx="44" ry="6" fill="#000" opacity=".4"/><rect width="60" height="44" fill="#b49568"/><rect y="0" width="60" height="8" fill="#9c7f53"/><rect x="16" y="16" width="28" height="14" fill="#f2efe4"/><path d="M20 21 h20 M20 25 h14" stroke="#555" stroke-width="1"/></g>
        ${finish(u, 0.9, 0.22)}`;
    },

    /* ── 밤거리 · 비 ── */
    street(u) {
      const v = deep(500, 236);
      const sign = (x, y, w, h, c, t, vert) => `${glow(u, x + w / 2, y + h / 2, w * 0.9, h * 0.9, c, 0.45, 18)}
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#0b0e12" stroke="${c}" stroke-width="2.5"/>
        ${vert ? [...t].map((ch, k) => `<text x="${x + w / 2}" y="${y + 30 + k * 40}" fill="${c}" font-size="18" font-weight="700" text-anchor="middle" font-family="${FONT}">${ch}</text>`).join('') : `<text x="${x + w / 2}" y="${y + h / 2 + 7}" fill="${c}" font-size="18" font-weight="700" text-anchor="middle" font-family="${FONT}">${t}</text>`}`;
      const refl = (x, w, c, a) => `<rect x="${x - w / 2}" y="300" width="${w}" height="100" fill="${c}" opacity="${a}" filter="url(#${u}b8)"/>`;
      return `<defs>
          ${lin(`${u}sky`, [[0, '#06080d'], [1, '#2a2230']])}
          ${lin(`${u}road`, [[0, '#1d2127'], [1, '#0b0d10']])}
          ${lin(`${u}bldL`, [[0, '#1d242a'], [1, '#12171b']], 1, 0)}
          ${lin(`${u}cone`, [[0, '#ffd88a', 0.5], [1, '#ffd88a', 0]])}
          ${lin(`${u}shop`, [[0, '#f5f2e6'], [1, '#d8e8e0']])}
        </defs>
        <rect width="960" height="400" fill="url(#${u}sky)"/>
        ${glow(u, 500, 236, 300, 60, '#c06a4a', 0.3, 40)}
        <!-- 먼 건물 -->
        <g opacity=".8">${skyline(44, 250, '#151a22', ['#c79a52', '#e8c27a'], { minH: 40, maxH: 120, p: 0.18, from: 280, to: 700 })}</g>
        <!-- 왼쪽 상가 -->
        <polygon points="0,0 330,40 330,300 0,360" fill="url(#${u}bldL)"/>
        ${range(4, (j) => range(3, (i) => { const t0 = i / 3 + 0.04, t1 = (i + 1) / 3 - 0.06; const y0 = 60 + j * 48, y1 = y0 + 26; const P = (t, y) => [t * 330, y + t * (40 * (1 - y / 360)) - 0]; return poly([P(t0, y0), P(t1, y0), P(t1, y1), P(t0, y1)], `fill="${(i + j) % 3 === 0 ? '#d9a95a' : '#0e1317'}" opacity="${(i + j) % 3 === 0 ? 0.7 : 1}"`); }))}
        <!-- 편의점 -->
        <polygon points="0,262 300,276 300,334 0,370" fill="url(#${u}shop)"/>
        <polygon points="0,248 310,264 310,278 0,264" fill="#2f8f5a"/><text x="150" y="268" fill="#fff" font-size="12" font-weight="700" text-anchor="middle" font-family="${FONT}">24시 편의점</text>
        ${range(6, (k) => `<path d="M${k * 50 + 20} ${264 + k * 2.5} V${360 - k * 4.5}" stroke="#7a8a82" stroke-width="2"/>`)}
        ${glow(u, 150, 330, 200, 40, '#e8f6ee', 0.35, 18)}
        ${sign(250, 70, 32, 140, '#ff4fa6', '노래방', true)}
        ${sign(40, 200, 92, 30, '#5cf08a', '약 국')}
        <!-- 오른쪽 건물 -->
        <polygon points="960,0 660,50 660,300 960,380" fill="#14191e"/>
        ${range(5, (j) => range(3, (i) => { const t0 = i / 3 + 0.05, t1 = (i + 1) / 3 - 0.08; const y0 = 66 + j * 44, y1 = y0 + 24; const P = (t, y) => [960 - t * 300, y + t * (50 * (1 - y / 380))]; return poly([P(t0, y0), P(t1, y0), P(t1, y1), P(t0, y1)], `fill="${(i * 7 + j * 3) % 5 === 1 ? '#e2b468' : '#0c1014'}"`); }))}
        ${sign(690, 150, 86, 30, '#ffb44a', '치 킨')}
        ${sign(700, 220, 70, 26, '#5ab8ff', 'PC방')}
        <!-- 전봇대·전선 -->
        <rect x="586" y="30" width="9" height="270" fill="#20262b"/><rect x="566" y="60" width="50" height="6" fill="#20262b"/><rect x="574" y="90" width="34" height="5" fill="#20262b"/>
        <path d="M-10 70 Q290 120 590 62 Q780 30 970 66 M-10 98 Q300 150 590 92 Q780 60 970 96 M330 40 Q460 80 590 64" stroke="#0a0c0f" stroke-width="2" fill="none"/>
        <!-- 가로등 -->
        <rect x="400" y="96" width="6" height="210" fill="#252b30"/><path d="M403 96 Q403 74 440 74 L452 76" stroke="#252b30" stroke-width="5" fill="none"/>
        <rect x="440" y="74" width="26" height="8" rx="3" fill="#2f363c"/>
        ${glow(u, 453, 84, 30, 14, '#ffe2a0', 0.9, 8)}
        <polygon points="444,84 462,84 600,400 300,400" fill="url(#${u}cone)" filter="url(#${u}b3)"/>
        <!-- 도로 -->
        <polygon points="0,360 330,300 660,300 960,380 960,400 0,400" fill="url(#${u}road)"/>
        ${poly([v(490, 400, 0), v(510, 400, 0), v(510, 400, 0.4), v(490, 400, 0.4)], 'fill="#c9b46a" opacity=".35"')}
        ${poly([v(490, 400, 0.8), v(510, 400, 0.8), v(510, 400, 1.6), v(490, 400, 1.6)], 'fill="#c9b46a" opacity=".3"')}
        ${refl(266, 30, '#ff4fa6', 0.4)}${refl(86, 80, '#5cf08a', 0.25)}${refl(733, 70, '#ffb44a', 0.3)}${refl(735, 60, '#5ab8ff', 0.25)}${refl(453, 50, '#ffe2a0', 0.4)}${refl(150, 180, '#e8f6ee', 0.15)}
        <!-- 먼 차 불빛 -->
        ${[[470, 246], [486, 246], [530, 250], [546, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff5a4a"/>${glow(u, x, y, 9, 9, '#ff5a4a', 0.6, 3)}`).join('')}
        <ellipse cx="460" cy="380" rx="110" ry="8" fill="#ffd88a" opacity=".22" filter="url(#${u}b3)"/>
        ${rain(5, 150, 0.35)}
        ${finish(u, 0.9, 0.24)}`;
    },

    /* ── 대학병원 주차장 · 겨울밤 ── */
    hospital(u) {
      const v = deep(480, 250);
      const lines = range(11, (k) => {
        const x = -420 + k * 180;
        const a = v(x, 400, 0), b = v(x, 400, 1.6);
        return `<path d="M${a[0].toFixed(1)} 400 L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="#e8e4d0" stroke-width="2.5" opacity=".45"/>`;
      });
      const car = (x, y, s, c, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
          <ellipse cx="0" cy="34" rx="104" ry="8" fill="#000" opacity=".55" filter="url(#${u}b3)"/>
          <path d="M-100 28 Q-102 8 -84 4 L-56 -2 Q-36 -26 -6 -27 L40 -27 Q64 -25 80 -4 L94 0 Q104 4 102 22 L100 32 L-98 32 Z" fill="${c}"/>
          <path d="M-46 -2 Q-30 -20 -6 -21 L14 -21 L14 -2 Z M20 -21 L38 -21 Q58 -19 70 -2 L20 -2 Z" fill="#1a2632" opacity=".9"/>
          <path d="M-90 8 Q0 2 98 8" stroke="#ffdca0" stroke-opacity=".3" fill="none"/>
          <circle cx="-62" cy="32" r="15" fill="#07090b"/><circle cx="64" cy="32" r="15" fill="#07090b"/><circle cx="-62" cy="32" r="7" fill="#2b3135"/><circle cx="64" cy="32" r="7" fill="#2b3135"/>
          <path d="M-100 12 L-92 10 L-92 18 L-100 18 Z" fill="#a8302a"/>
          <path d="M-100 -2 Q0 -6 100 -2" stroke="#e8f0ff" stroke-opacity=".25" stroke-width="2" fill="none"/>
        </g>`;
      return `<defs>
          ${lin(`${u}sky`, [[0, '#04070d'], [1, '#1b2232']])}
          ${lin(`${u}bld`, [[0, '#d8dde0'], [1, '#9aa3a8']])}
          ${lin(`${u}lot`, [[0, '#262b30'], [1, '#0d1013']])}
          ${lin(`${u}cone`, [[0, '#ffbe6a', 0.45], [1, '#ffbe6a', 0]])}
          ${lin(`${u}amb`, [[0, '#f4f4f0'], [1, '#c6cbcc']])}
        </defs>
        <rect width="960" height="400" fill="url(#${u}sky)"/>
        ${glow(u, 480, 240, 600, 40, '#7a6a80', 0.3, 40)}
        <!-- 병원 건물 -->
        <rect x="170" y="30" width="620" height="230" fill="#2b333b"/>
        <rect x="170" y="30" width="620" height="230" fill="url(#${u}bld)" opacity=".18"/>
        ${grid(53, 186, 44, 15, 6, 28, 18, 12, 12, ['#dfeef0', '#e8f2ea', '#f0dca8'], '#141b22', 0.5)}
        <rect x="430" y="20" width="100" height="240" fill="#353e47"/>
        ${grid(7, 442, 34, 3, 9, 20, 12, 8, 10, ['#dfeef0'], '#161d24', 0.55)}
        <rect x="160" y="22" width="640" height="10" fill="#1d242b"/>
        <g transform="translate(456 -2)"><rect width="48" height="20" fill="#f4f4f0"/><path d="M20 3 h8 v6 h6 v6 h-6 v6 h-8 v-6 h-6 v-6 h6 Z" fill="#d8322a" transform="translate(0 -2)"/></g>
        ${glow(u, 480, 8, 40, 14, '#ffd6d0', 0.4, 8)}
        <!-- 응급실 -->
        <rect x="380" y="204" width="200" height="56" fill="#d9e8e4" opacity=".9"/>
        ${[420, 460, 500, 540].map((x) => `<rect x="${x}" y="204" width="3" height="56" fill="#5f6d6d"/>`).join('')}
        ${glow(u, 480, 250, 140, 26, '#e8fff8', 0.5, 18)}
        <rect x="360" y="188" width="240" height="16" fill="#3a4148"/>
        <rect x="420" y="162" width="120" height="26" rx="2" fill="#d42c22"/>
        <text x="480" y="182" fill="#fff" font-size="16" font-weight="700" text-anchor="middle" font-family="${FONT}" letter-spacing="4">응급실</text>
        ${glow(u, 480, 175, 90, 22, '#ff3b2e', 0.5, 18)}
        <!-- 구급차 -->
        <g transform="translate(590 218)"><ellipse cx="60" cy="48" rx="80" ry="6" fill="#000" opacity=".5"/>
          <path d="M0 6 L86 6 L86 0 L104 0 Q120 2 124 20 L126 44 L0 44 Z" fill="url(#${u}amb)"/><rect x="0" y="24" width="126" height="6" fill="#d8322a"/>
          <path d="M92 6 L106 6 Q116 8 118 20 L92 20 Z" fill="#2a3a48"/><circle cx="24" cy="44" r="10" fill="#0a0c0e"/><circle cx="100" cy="44" r="10" fill="#0a0c0e"/>
          <rect x="30" y="0" width="16" height="6" fill="#ff3b2e"><animate attributeName="fill" values="#ff3b2e;#3b6bff;#ff3b2e" dur="1.2s" repeatCount="indefinite"/></rect></g>
        ${glow(u, 628, 214, 40, 16, '#ff5050', 0.4, 8)}
        <!-- 주차장 -->
        <polygon points="0,260 960,260 960,400 0,400" fill="url(#${u}lot)"/>
        ${lines}
        ${glow(u, 480, 280, 160, 10, '#e8fff8', 0.18, 8)}
        <!-- 가로등 -->
        ${[[90, 0.95], [870, 1]].map(([x, s]) => `<rect x="${x - 3}" y="${110}" width="6" height="${200 * s}" fill="#1f252a"/><rect x="${x - 18}" y="104" width="36" height="8" rx="3" fill="#2a3036"/>${glow(u, x, 112, 28, 10, '#ffc77a', 0.9, 8)}
          <polygon points="${x - 14},112 ${x + 14},112 ${x + 120},400 ${x - 120},400" fill="url(#${u}cone)" filter="url(#${u}b3)"/>`).join('')}
        ${car(140, 318, 1.15, '#2b3238')}${car(370, 290, 0.8, '#5a1f22', true)}${car(820, 330, 1.2, '#3a4048', true)}
        <rect y="368" width="960" height="32" fill="#cfd8e0" opacity=".05"/>
        ${rain(8, 70, 0.4, '#e6eef6')}
        ${finish(u, 0.9, 0.22)}`;
    },

    dark(u) {
      return `<defs>${rad(`${u}d`, [[0, '#1c2629'], [1, '#080b0c']], 0.5, 0.45, 0.8)}</defs>
        <rect width="960" height="400" fill="url(#${u}d)"/>
        ${finish(u, 0.6, 0.18)}`;
    },
  };

  function draw(key, opts) {
    const f = BG[key] || BG.dark;
    const u = `bg${++seq}-`;
    return `<defs>${common(u)}</defs>${f(u, opts)}`;
  }

  return { draw, keys: Object.keys(BG) };
})();
