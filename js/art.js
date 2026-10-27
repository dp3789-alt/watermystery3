/* 물때 3 — 그림
 * 외부 이미지 없이 SVG로 인물 초상을 그린다. 장소 배경은 backdrop.js에서 그린다.
 * 인물은 표정 단계(0~3)를 가진다. 심문에서 반박에 성공할수록 단계가 올라간다.
 * 주인공은 이름·성별·나이를 밝히지 않으므로 그리지 않는다.
 */
const ART = (() => {
  'use strict';

  /* ───────── 인물 ───────── */
  const CHARS = {
    '김준서': {
      skin: '#d6ab86', hair: '#2b2623', style: 'messy', grey: true, jaw: 'square', stubble: true, bags: true,
      outfit: 'coat', main: '#6b5a45', inner: '#d9d4c7', tie: '#5b2b2b',
      exprs: ['smirk', 'annoyed', 'shaken', 'resigned'], scene: 'neutral',
    },
    '최민규': {
      skin: '#c99b78', hair: '#1d1b1a', style: 'buzz', jaw: 'narrow', bags: true, thin: true,
      outfit: 'jumper', main: '#3d4a52', inner: '#2a3338',
      exprs: ['neutral', 'uneasy', 'shaken', 'broken'],
    },
    '윤재석': {
      skin: '#dcb08c', hair: '#211f1e', style: 'parted', jaw: 'square',
      outfit: 'uniform', main: '#22324a', inner: '#22324a',
      exprs: ['serene', 'serene', 'serene', 'serene'],
    },
    '강태오': {
      skin: '#d3a582', hair: '#231f1c', style: 'shaggy', jaw: 'square', stubble: true,
      outfit: 'hoodie', main: '#5c3a34', inner: '#4a2e29',
      exprs: ['angry', 'uneasy', 'shaken', 'broken'],
    },
    '서지우': {
      skin: '#e2b996', hair: '#2d2420', style: 'short', jaw: 'round', glasses: true, young: true,
      outfit: 'overalls', main: '#4f5d63', inner: '#e8e4da',
      exprs: ['neutral', 'confused', 'shaken', 'tear'],
    },
    '백도현': {
      skin: '#d8b293', hair: '#151414', style: 'slick', jaw: 'narrow',
      outfit: 'turtleneck', main: '#16181a', inner: '#16181a',
      exprs: ['smile', 'cold', 'annoyed', 'resigned'],
    },
  };

  const EXPR = {
    // brow: [안쪽 높이, 바깥 높이] (음수 = 위로), eye: 뜬 정도, look: 눈동자 [x, y], mouth, sweat, tilt
    neutral: { brow: [0, 0], eye: 1, look: [0, 0], mouth: 'flat' },
    smirk: { brow: [0, -3], browR: [2, 2], eye: 0.85, look: [1, 0], mouth: 'smirk' },
    annoyed: { brow: [5, -1], eye: 0.75, look: [0, 0], mouth: 'tight' },
    uneasy: { brow: [-4, 1], eye: 1, look: [3, 1], mouth: 'tight', sweat: 1 },
    shaken: { brow: [-8, 1], eye: 1.3, look: [0, 0], small: true, mouth: 'open', sweat: 2 },
    broken: { brow: [-6, 3], eye: 0.45, look: [0, 3], mouth: 'frown', sweat: 1, tilt: 7 },
    resigned: { brow: [-3, 2], eye: 0.5, look: [-2, 2], mouth: 'flat', tilt: 4 },
    serene: { brow: [-1, -1], eye: 0.7, look: [0, 0], mouth: 'smile' },
    smile: { brow: [0, -1], eye: 0.75, look: [0, 0], mouth: 'smirk' },
    cold: { brow: [3, 2], eye: 0.6, look: [0, 0], mouth: 'flat' },
    angry: { brow: [7, -2], eye: 0.9, look: [0, 0], mouth: 'grit' },
    confused: { brow: [-5, -1], browR: [1, 1], eye: 1.1, look: [-2, 0], mouth: 'o' },
    tear: { brow: [-7, 2], eye: 0.6, look: [0, 2], mouth: 'frown', tear: true, tilt: 5 },
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  const JAW = {
    square: 'M72 112 Q72 58 120 56 Q168 58 168 112 L166 146 Q160 180 120 190 Q80 180 74 146 Z',
    narrow: 'M76 112 Q76 58 120 56 Q164 58 164 112 L161 146 Q152 184 120 194 Q88 184 79 146 Z',
    round: 'M72 114 Q72 58 120 56 Q168 58 168 114 Q168 150 156 168 Q142 188 120 189 Q98 188 84 168 Q72 150 72 114 Z',
  };

  function hair(c, back) {
    const h = c.hair;
    const d = shade(h, -0.3);
    const grey = c.grey
      ? `<path d="M92 66 Q104 60 110 74 M130 62 Q142 62 146 76 M152 80 Q160 86 162 98" stroke="#8d8a86" stroke-width="2" fill="none" opacity=".8"/>`
      : '';
    if (back) {
      if (c.style === 'shaggy') return `<path d="M66 108 Q62 150 74 168 L80 120 Z M174 108 Q178 150 166 168 L160 120 Z" fill="${d}"/>`;
      return '';
    }
    switch (c.style) {
      case 'messy':
        return `<path d="M68 112 Q62 70 82 56 L86 44 L96 54 L104 38 L114 52 L126 36 L134 52 L146 42 L148 56 Q176 66 172 112 Q166 92 156 86 Q150 72 136 76 Q118 70 104 78 Q86 78 80 92 Q72 98 68 112 Z" fill="${h}"/>
          <path d="M80 92 Q88 80 104 78 M120 72 Q132 70 140 78" stroke="${d}" stroke-width="2" fill="none"/>${grey}`;
      case 'buzz':
        return `<path d="M72 106 Q70 56 120 52 Q170 56 168 106 Q160 82 146 76 Q120 70 94 76 Q80 82 72 106 Z" fill="${h}" opacity=".88"/>`;
      case 'parted':
        return `<path d="M70 110 Q64 56 120 50 Q176 56 170 110 Q166 88 156 80 Q140 70 112 74 Q90 76 82 88 Q74 96 70 110 Z" fill="${h}"/>
          <path d="M110 52 Q106 64 112 74" stroke="${shade(h, 0.6)}" stroke-width="2" fill="none"/>
          <path d="M118 60 Q140 58 156 76" stroke="${shade(h, 0.5)}" stroke-width="1.5" fill="none" opacity=".6"/>`;
      case 'shaggy':
        return `<path d="M66 118 Q58 60 112 48 Q170 46 176 116 Q170 96 162 92 L158 104 L150 84 L140 96 L132 80 L118 94 L110 80 L98 96 L92 84 L84 100 L78 92 Q70 102 66 118 Z" fill="${h}"/>`;
      case 'short':
        return `<path d="M70 110 Q66 54 120 50 Q174 54 170 110 Q164 84 150 80 Q136 90 120 84 Q102 92 90 82 Q76 88 70 110 Z" fill="${h}"/>`;
      case 'slick':
        return `<path d="M72 104 Q70 52 120 48 Q170 52 168 104 Q166 82 152 72 Q132 62 110 66 Q88 70 80 82 Q74 90 72 104 Z" fill="${h}"/>
          <path d="M88 74 Q118 58 156 74 M92 80 Q120 66 152 80" stroke="${shade(h, 1.4)}" stroke-width="1.5" fill="none" opacity=".5"/>`;
      default:
        return '';
    }
  }

  function torso(c) {
    const m = c.main, dm = shade(m, -0.28), i = c.inner;
    const neckW = c.thin ? 18 : 22;
    const neck = `<path d="M${120 - neckW} 176 L${120 - neckW} 214 Q120 226 ${120 + neckW} 214 L${120 + neckW} 176 Z" fill="${shade(c.skin, -0.18)}"/>`;
    const body = c.thin
      ? 'M18 300 Q22 236 70 220 Q96 212 120 214 Q144 212 170 220 Q218 236 222 300 Z'
      : 'M8 300 Q14 232 66 216 Q94 208 120 210 Q146 208 174 216 Q226 232 232 300 Z';
    switch (c.outfit) {
      case 'coat':
        return `${neck}<path d="${body}" fill="${m}"/>
          <path d="M98 212 L120 266 L142 212 L132 210 L120 240 L108 210 Z" fill="${i}"/>
          <path d="M116 226 L124 226 L128 292 L120 300 L112 292 Z" fill="${c.tie}"/>
          <path d="M66 216 L104 300 L84 300 L60 236 Z M174 216 L136 300 L156 300 L180 236 Z" fill="${dm}"/>
          <path d="M98 212 L86 238 L112 262 Z M142 212 L154 238 L128 262 Z" fill="${shade(m, 0.12)}"/>`;
      case 'jumper':
        return `${neck}<path d="${body}" fill="${m}"/>
          <path d="M92 214 Q120 232 148 214 L152 222 Q120 244 88 222 Z" fill="${dm}"/>
          <path d="M120 232 L120 300" stroke="${shade(m, 0.45)}" stroke-width="2.5"/>
          <rect x="150" y="252" width="34" height="14" rx="2" fill="${shade(m, 0.25)}"/>`;
      case 'uniform':
        return `${neck}<path d="${body}" fill="${m}"/>
          <path d="M100 212 L120 238 L140 212 L132 208 L120 224 L108 208 Z" fill="${shade(m, 0.25)}"/>
          <path d="M120 238 L120 300" stroke="${dm}" stroke-width="2"/>
          <path d="M40 228 L84 216 L86 224 L44 238 Z M200 228 L156 216 L154 224 L196 238 Z" fill="${shade(m, -0.4)}"/>
          <path d="M150 248 l8 -6 l8 6 l-3 12 l-10 0 Z" fill="#c9a548"/>
          <rect x="76" y="250" width="26" height="6" fill="#c9a548" opacity=".75"/>`;
      case 'hoodie':
        return `${neck}<path d="${body}" fill="${m}"/>
          <path d="M76 214 Q120 252 164 214 Q156 200 140 204 Q120 222 100 204 Q84 200 76 214 Z" fill="${dm}"/>
          <path d="M108 232 L104 276 M132 232 L136 276" stroke="${shade(m, 0.6)}" stroke-width="2.5"/>`;
      case 'overalls':
        return `${neck}<path d="${body}" fill="${m}"/>
          <path d="M96 212 L120 232 L144 212 L150 220 L120 246 L90 220 Z" fill="${shade(m, 0.2)}"/>
          <rect x="142" y="250" width="40" height="18" rx="2" fill="${i}"/>
          <path d="M148 259 h28" stroke="${m}" stroke-width="2"/>
          <path d="M120 246 L120 300" stroke="${dm}" stroke-width="2"/>`;
      case 'turtleneck':
        return `<path d="${body}" fill="${m}"/>
          <path d="M94 176 L94 222 Q120 234 146 222 L146 176 Z" fill="${shade(m, 0.35)}"/>
          <path d="M94 196 Q120 204 146 196 M94 208 Q120 216 146 208" stroke="${shade(m, 0.6)}" stroke-width="1.5" fill="none"/>`;
      default:
        return `${neck}<path d="${body}" fill="${m}"/>`;
    }
  }

  function eyes(c, e) {
    const out = [];
    const open = e.eye;
    const ry = 5.2 * open;
    const look = e.look || [0, 0];
    const pr = e.small ? 2.4 : 3.4;
    for (const [cx, side] of [[100, -1], [140, 1]]) {
      const cy = 124;
      out.push(`<ellipse cx="${cx}" cy="${cy}" rx="9.5" ry="${Math.max(ry, 1.4)}" fill="#f2ede4"/>`);
      if (open > 0.35) {
        out.push(`<circle cx="${cx + look[0]}" cy="${cy + Math.min(look[1], ry - 1)}" r="${pr}" fill="#1b1716"/>`);
        out.push(`<circle cx="${cx + look[0] + 1}" cy="${cy + Math.min(look[1], ry - 1) - 1}" r=".9" fill="#fff"/>`);
      } else {
        out.push(`<path d="M${cx - 6} ${cy + 1} Q${cx} ${cy + 3} ${cx + 6} ${cy + 1}" stroke="#1b1716" stroke-width="2.4" fill="none"/>`);
      }
      // 윗눈꺼풀
      out.push(`<path d="M${cx - 11} ${cy - ry + 0.5} Q${cx} ${cy - ry - 3} ${cx + 11} ${cy - ry + 0.5}" stroke="#2a201c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
      if (c.bags) out.push(`<path d="M${cx - 8} ${cy + 9} Q${cx} ${cy + 13} ${cx + 8} ${cy + 9}" stroke="${shade(c.skin, -0.35)}" stroke-width="1.6" fill="none" opacity=".7"/>`);
      if (e.tear && side === -1) out.push(`<path d="M${cx - 4} ${cy + 7} q-3 10 0 16 q3 -6 0 -16 Z" fill="#cfe3ea" opacity=".9"/>`);
    }
    if (c.glasses) {
      out.push(`<rect x="85" y="112" width="30" height="23" rx="6" fill="#dfe8ea" fill-opacity=".12" stroke="#1f1f22" stroke-width="2.4"/>
        <rect x="125" y="112" width="30" height="23" rx="6" fill="#dfe8ea" fill-opacity=".12" stroke="#1f1f22" stroke-width="2.4"/>
        <path d="M115 120 Q120 116 125 120 M85 120 L73 116 M155 120 L167 116" stroke="#1f1f22" stroke-width="2.2" fill="none"/>`);
    }
    return out.join('');
  }

  function brows(c, e) {
    const [inner, outer] = e.brow;
    const [innerR, outerR] = e.browR || [0, 0];
    const col = shade(c.hair, 0.05);
    const y = 108;
    const w = c.young ? 3.6 : 4.6;
    return `<path d="M88 ${y + outer} Q99 ${y - 4 + (inner + outer) / 2} 111 ${y + inner}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>
      <path d="M129 ${y + inner + innerR} Q141 ${y - 4 + (inner + outer) / 2 + outerR} 152 ${y + outer + outerR}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }

  function mouth(c, e) {
    const lip = shade(c.skin, -0.42);
    const y = 162;
    switch (e.mouth) {
      case 'smirk': return `<path d="M106 ${y} Q120 ${y + 2} 134 ${y - 5}" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      case 'tight': return `<path d="M110 ${y} L130 ${y}" stroke="${lip}" stroke-width="3.2" stroke-linecap="round"/>`;
      case 'open': return `<ellipse cx="120" cy="${y + 2}" rx="9" ry="6" fill="#3a1f1c"/><path d="M112 ${y - 1} Q120 ${y - 3} 128 ${y - 1}" stroke="${lip}" stroke-width="2" fill="none"/>`;
      case 'frown': return `<path d="M106 ${y + 4} Q120 ${y - 4} 134 ${y + 4}" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      case 'smile': return `<path d="M106 ${y - 2} Q120 ${y + 6} 134 ${y - 2}" stroke="${lip}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
      case 'grit': return `<rect x="106" y="${y - 4}" width="28" height="9" rx="3" fill="#ede6da" stroke="${lip}" stroke-width="2.4"/><path d="M113 ${y - 4} v9 M120 ${y - 4} v9 M127 ${y - 4} v9" stroke="${lip}" stroke-width="1"/>`;
      case 'o': return `<ellipse cx="122" cy="${y + 1}" rx="5" ry="5.5" fill="#3a1f1c"/>`;
      default: return `<path d="M106 ${y} Q120 ${y + 1} 134 ${y}" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
  }

  function sweat(n) {
    const drops = [[166, 104], [70, 120]].slice(0, n);
    return drops.map(([x, y]) => `<path d="M${x} ${y} q-5 9 0 13 q5 -4 0 -13 Z" fill="#cfe3ea" opacity=".9"/>`).join('');
  }

  function portrait(name, level = 0, opts = {}) {
    const c = CHARS[name];
    if (!c) return '';
    const key = typeof level === 'string' ? level : (level < 0 ? c.scene || c.exprs[0] : c.exprs[Math.min(level, 3)]);
    const e = EXPR[key] || EXPR.neutral;
    const skinD = shade(c.skin, -0.16);
    const jaw = JAW[c.jaw] || JAW.square;
    const id = 'p' + Math.random().toString(36).slice(2, 8);
    const tilt = e.tilt || 0;
    const stubble = c.stubble
      ? `<path d="M80 146 Q86 182 120 190 Q154 182 160 146 Q150 172 120 174 Q90 172 80 146 Z" fill="${shade(c.skin, -0.5)}" opacity=".22"/>`
      : '';
    return `<svg class="portrait${opts.cls ? ' ' + opts.cls : ''}" viewBox="0 0 240 300" role="img" aria-label="${name} 초상">
      <defs><clipPath id="${id}"><path d="${jaw}"/></clipPath></defs>
      ${torso(c)}
      <g transform="translate(0 ${tilt}) rotate(${tilt * 0.4} 120 200)">
        ${hair(c, true)}
        <ellipse cx="72" cy="128" rx="7" ry="12" fill="${skinD}"/>
        <ellipse cx="168" cy="128" rx="7" ry="12" fill="${skinD}"/>
        <path d="${jaw}" fill="${c.skin}"/>
        <rect x="128" y="40" width="60" height="170" fill="${skinD}" opacity=".55" clip-path="url(#${id})"/>
        ${stubble}
        ${brows(c, e)}
        ${eyes(c, e)}
        <path d="M120 128 L114 150 Q120 154 126 150" stroke="${shade(c.skin, -0.3)}" stroke-width="2" fill="none" stroke-linejoin="round"/>
        ${mouth(c, e)}
        ${hair(c, false)}
        ${e.sweat ? sweat(e.sweat) : ''}
      </g>
    </svg>`;
  }

  /* ───────── 장소 ───────── */
  // 배경 그림은 js/backdrop.js
  function bgKey(place) {
    const p = place || '';
    if (/옥상/.test(p)) return 'rooftop';
    if (/자취방/.test(p)) return 'studio';
    if (/보관실/.test(p)) return 'evidence';
    if (/모니터실|녹화실 앞/.test(p)) return 'monitor';
    if (/진술녹화실/.test(p)) return 'interrogation';
    if (/사무실/.test(p)) return 'office';
    if (/주차장|금요일/.test(p)) return 'hospital';
    if (/경찰서 앞/.test(p)) return 'station';
    if (/4년 전|사흘 뒤|석방/.test(p)) return 'street';
    return 'dark';
  }

  function background(key, opts) {
    return `<svg class="bg" viewBox="0 0 960 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${BACKDROP.draw(key, opts)}</svg>`;
  }

  return { CHARS, portrait, background, bgKey, has: (name) => !!CHARS[name] };
})();
