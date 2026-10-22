// 明朝皇帝视觉引擎（角色 + 道具 + 场景 + 歌词条 + 分镜）
// 提取自 references/明朝皇帝角色与服饰素材库.html
// 角色 200×240 · 道具 64×64 · 场景 320×180 · 歌词条 600×140

const KAI = "'Kaiti SC','STKaiti','KaiTi','楷体',serif";
const GOLD = '#e9b949', RED = '#c8322b', NAVY = '#16304f';
const SKIN = '#ffdcbc', SKIN_D = '#e9ad86', HAIR = '#22222b', INK = '#2a1f1f', HAT = '#1c1c24';

let _uid = 0;
const uid = p => `${p}-${++_uid}`;
// 固定种子的伪随机，保证每次渲染一致
const rng = seed => () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
const svgEl = (vb, inner, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${cls ? ` class="${cls}"` : ''}>${inner}</svg>`;

/* ==================== 袍色 ==================== */
export const ROBES = {
  mingHuang: { name: '明黄', c: ['#f2c037', '#b8862b'] },
  zheHuang:  { name: '赭黄', c: ['#d8912f', '#9c5f18'] },
  zhuHong:   { name: '朱红', c: ['#c8322b', '#871d18'] },
  feiHong:   { name: '绯红', c: ['#d9475f', '#97293d'] },
  jiangZi:   { name: '绛紫', c: ['#6f3d82', '#45224f'] },
  baoLan:    { name: '宝蓝', c: ['#2563a6', '#163e6b'] },
  tianQing:  { name: '天青', c: ['#3a8fc4', '#225f87'] },
  shiQing:   { name: '石青', c: ['#2f7f86', '#1b5257'] },
  moLv:      { name: '墨绿', c: ['#3b7a52', '#234d33'] },
  xuanQing:  { name: '玄青', c: ['#2b3a52', '#151f31'] },
};
const HATS = { yishan: '翼善冠', mian: '冕旒冠', none: '束发' };

/* ==================== 表情 ==================== */
const brows = (d, w = 2.4) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d, w = 2.2, c = INK) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const dotEyes = (ry = 4.6) =>
  `<ellipse cx="84" cy="104" rx="3.6" ry="${ry}" fill="${INK}"/><ellipse cx="116" cy="104" rx="3.6" ry="${ry}" fill="${INK}"/>` +
  `<circle cx="85.3" cy="102.2" r="1.2" fill="#fff"/><circle cx="117.3" cy="102.2" r="1.2" fill="#fff"/>`;
const blush = (op = .5) =>
  `<ellipse cx="75" cy="115" rx="6.5" ry="3.8" fill="#ff8f8f" opacity="${op}"/><ellipse cx="125" cy="115" rx="6.5" ry="3.8" fill="#ff8f8f" opacity="${op}"/>`;
const BROW_N = 'M77 94 Q84 91 90 93.5 M110 93.5 Q116 91 123 94';
const BROW_SAD = 'M78 95 L90 91 M122 95 L110 91';
const openMouth = `<path d="M91 117 Q100 117 109 117 Q108 129 100 129 Q92 129 91 117 Z" fill="#8f2525"/><path d="M95 125 Q100 121 105 125 Q103 128.5 100 128.5 Q97 128.5 95 125 Z" fill="#ff7d7d"/>`;

export const EXPR = {
  smile:    { name: '微笑', draw: () => brows(BROW_N) + dotEyes() + line('M93 120 Q100 126 107 120') + blush() },
  happy:    { name: '开心', draw: () => brows('M77 92 Q84 88 90 91 M110 91 Q116 88 123 92') + line('M79 106 Q84 99 89 106 M111 106 Q116 99 121 106', 2.6) + openMouth + blush(.6) },
  serious:  { name: '严肃', draw: () => brows('M76 93 L90 96 M124 93 L110 96', 3) + dotEyes(4) + line('M94 121 L106 121') },
  angry:    { name: '生气', draw: () => brows('M76 90 L91 98 M124 90 L109 98', 3.2) + dotEyes(3.8) + line('M92 124 Q100 117 108 124') + blush(.7) +
      `<g stroke="#d6332b" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M126 76 q4 3 0 6 M134 76 q-4 3 0 6 M127 75 q3 4 6 0 M127 83 q3 -4 6 0"/></g>` },
  surprised:{ name: '惊讶', draw: () => brows('M77 89 Q84 84 90 88 M110 88 Q116 84 123 89') +
      `<circle cx="84" cy="104" r="5" fill="${INK}"/><circle cx="116" cy="104" r="5" fill="${INK}"/><circle cx="85.6" cy="102" r="1.6" fill="#fff"/><circle cx="117.6" cy="102" r="1.6" fill="#fff"/>` +
      `<ellipse cx="100" cy="122" rx="4.5" ry="5.5" fill="#8f2525"/>` + blush(.4) },
  sad:      { name: '委屈', draw: () => brows(BROW_SAD) + dotEyes(4.2) + line('M93 123 Q100 118 107 123') + blush() +
      `<path d="M119 110 q-3 5 0 7 q3 -2 0 -7 Z" fill="#6ec3f0"/>` },
  cry:      { name: '大哭', draw: () => brows(BROW_SAD) + line('M79 103 Q84 108 89 103 M111 103 Q116 108 121 103', 2.6) +
      line('M81 108 q-2 10 0 19 M119 108 q2 10 0 19', 3.6, '#6ec3f0') +
      `<path d="M91 122 Q100 114 109 122 Q100 129 91 122 Z" fill="#8f2525"/>` + blush(.6) },
  cool:     { name: '墨镜', draw: () => brows(BROW_N) +
      `<path d="M74 98 H94 Q95 110 84 110 Q73 110 74 98 Z M106 98 H126 Q127 110 116 110 Q105 110 106 98 Z" fill="#121218"/>` +
      line('M94 100 Q100 97 106 100 M74 99 L60 96 M126 99 L140 96', 2.2, '#121218') +
      line('M77 101.5 L82 101.5 M109 101.5 L114 101.5', 1.5, '#ffffffaa') +
      line('M94 121 Q102 124 108 118') + blush(.4) },
  wink:     { name: '眨眼', draw: () => brows(BROW_N) +
      `<ellipse cx="84" cy="104" rx="3.6" ry="4.6" fill="${INK}"/><circle cx="85.3" cy="102.2" r="1.2" fill="#fff"/>` +
      line('M111 105 Q116 99 121 105', 2.6) + `<path d="M93 119 Q100 128 107 119 Z" fill="#8f2525"/>` + blush(.6) +
      `<path d="M134 92 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill="${GOLD}"/>` },
  sweat:    { name: '尴尬', draw: () => brows(BROW_SAD) + dotEyes() + line('M92 121 q2 -3 4 0 t4 0 t4 0 t4 0') + blush() +
      `<path d="M136 78 q-5 8 0 10 q5 -2 0 -10 Z" fill="#7cc9f2" stroke="#4aa3d6" stroke-width=".8"/>` },
  shout:    { name: '呐喊', draw: () => brows('M76 91 L90 96 M124 91 L110 96', 3) + line('M79 100 L88 104 L79 108 M121 100 L112 104 L121 108', 2.6) +
      `<path d="M88 115 Q100 111 112 115 Q110 134 100 134 Q90 134 88 115 Z" fill="#8f2525"/><path d="M94 130 Q100 124 106 130 Q103 133 100 133 Q97 133 94 130 Z" fill="#ff7d7d"/>` + blush(.6) },
  sleepy:   { name: '犯困', draw: () => brows('M77 95 Q84 93 90 95 M110 95 Q116 93 123 95', 2.2) + line('M79 105 Q84 108 89 105 M111 105 Q116 108 121 105', 2.4) +
      `<ellipse cx="102" cy="122" rx="2.8" ry="3.2" fill="#8f2525"/>` + blush(.4) +
      line('M128 76 h7 l-7 8 h7 M139 64 h5 l-5 6 h5', 2, '#4a6fa5') },
};

/* ==================== 胡须 ==================== */
const MUSTACHE = `<path d="M86 116 Q93 111 100 115 Q107 111 114 116 Q107 115 100 118 Q93 115 86 116 Z" fill="${HAIR}"/>`;
const BEARDS = {
  none:     { name: '无须', draw: () => '' },
  mustache: { name: '八字须', draw: () => MUSTACHE },
  goatee:   { name: '山羊须', draw: () => MUSTACHE + `<path d="M95 129 Q100 143 105 129 Q100 132 95 129 Z" fill="${HAIR}"/>` },
  full:     { name: '美髯', draw: () => MUSTACHE + `<path d="M82 122 Q86 150 100 155 Q114 150 118 122 Q112 132 100 132 Q88 132 82 122 Z" fill="${HAIR}"/>` },
};

/* ==================== 动作 ==================== */
const SL = [68, 138], SR = [132, 138];
const ARM_DOWN_L = [SL, [56, 166], [62, 190]];
const LEFT_HAND_PROP = { x: 58, y: 197, s: .5 };
export const POSES = {
  stand:  { name: '站立', arms: [ARM_DOWN_L, [SR, [144, 166], [138, 190]]], prop: LEFT_HAND_PROP },
  hold:   { name: '双手持物', arms: [[SL, [64, 172], [86, 170]], [SR, [136, 172], [114, 170]]], prop: { x: 100, y: 160, s: .78 } },
  show:   { name: '举物展示', arms: [ARM_DOWN_L, [SR, [162, 160], [152, 128]]], prop: { x: 156, y: 112, s: .62, front: true } },
  wave:   { name: '挥手', arms: [ARM_DOWN_L, [SR, [162, 130], [158, 98]]], prop: LEFT_HAND_PROP },
  point:  { name: '指点', arms: [ARM_DOWN_L, [SR, [156, 146], [180, 134]]], prop: LEFT_HAND_PROP },
  cheer:  { name: '欢呼', arms: [[SL, [42, 128], [44, 98]], [SR, [158, 128], [156, 98]]], prop: { x: 158, y: 84, s: .55, front: true } },
  akimbo: { name: '叉腰', arms: [[SL, [40, 162], [70, 182]], [SR, [160, 162], [130, 182]]], prop: null },
  walk:   { name: '行走', arms: [[SL, [50, 160], [56, 184]], [SR, [150, 160], [146, 186]]], prop: LEFT_HAND_PROP, legs: 'walk' },
};

/* ==================== 角色绘制 ==================== */
function hatBack(hat) {
  if (hat !== 'yishan') return '';
  // 翼善冠后部两只向上竖立的折角
  return `<g fill="${HAT}" stroke="#3b3b4a" stroke-width="1.5"><ellipse cx="76" cy="37" rx="11.5" ry="14" transform="rotate(-20 76 37)"/><ellipse cx="124" cy="37" rx="11.5" ry="14" transform="rotate(20 124 37)"/></g>`;
}

function hatFront(hat) {
  if (hat === 'yishan') {
    return `<path d="M60 78 Q56 34 100 29 Q144 34 140 78 Q100 70 60 78 Z" fill="${HAT}"/>` +
      `<path d="M63 57 Q100 45 137 57" fill="none" stroke="#3b3b4a" stroke-width="2"/>` +
      `<path d="M70 46 Q82 35 98 33" fill="none" stroke="#4a4a5c" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M59 71 Q100 61 141 71 L141 79 Q100 69 59 79 Z" fill="#2c2c38" stroke="${GOLD}" stroke-width="1.3"/>` +
      `<circle cx="100" cy="70" r="3" fill="${GOLD}"/>`;
  }
  if (hat === 'mian') {
    let s = `<path d="M64 80 Q62 42 100 40 Q138 42 136 80 Q100 72 64 80 Z" fill="${HAT}"/>` +
      `<path d="M63 73 Q100 63 137 73 L137 81 Q100 71 63 81 Z" fill="#2c2c38" stroke="${GOLD}" stroke-width="1.3"/>` +
      `<line x1="48" y1="56" x2="152" y2="56" stroke="${GOLD}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M51 56 V95 M149 56 V95" stroke="#b8862b" stroke-width="1"/>` +
      `<circle cx="51" cy="99" r="4" fill="#f2c037" stroke="#b8862b"/><circle cx="149" cy="99" r="4" fill="#f2c037" stroke="#b8862b"/>` +
      `<g transform="rotate(-2 100 36)"><rect x="50" y="31" width="100" height="9" rx="2" fill="${HAT}" stroke="${GOLD}" stroke-width="1.5"/>`;
    // 冕板前垂十二旒
    for (let i = 0; i < 12; i++) {
      const x = 56 + i * 8;
      s += `<line x1="${x}" y1="40" x2="${x}" y2="70" stroke="#8a6a2a" stroke-width=".8"/>`;
      for (let j = 0; j < 3; j++) s += `<circle cx="${x}" cy="${50 + j * 10}" r="2.3" fill="${(i + j) % 2 ? '#f2c037' : '#c8322b'}"/>`;
    }
    return s + '</g>';
  }
  return `<circle cx="100" cy="47" r="12" fill="${HAIR}"/><rect x="82" y="44" width="36" height="4" rx="2" fill="${GOLD}"/>`;
}

function head(o) {
  let s = `<circle cx="58" cy="104" r="7" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1.5"/><circle cx="142" cy="104" r="7" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1.5"/>` +
    `<circle cx="100" cy="94" r="42" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1.5"/>`;
  s += o.hat === 'none'
    ? `<path d="M57 102 Q54 50 100 50 Q146 50 143 102 L137 102 Q136 76 100 72 Q64 76 63 102 Z" fill="${HAIR}"/>`
    : `<path d="M57 102 Q55 64 100 60 Q145 64 143 102 L137.5 102 Q136 82 100 78 Q64 82 62.5 102 Z" fill="${HAIR}"/>`;
  s += (EXPR[o.expr] || EXPR.smile).draw();
  s += (BEARDS[o.beard] || BEARDS.none).draw();
  return s;
}

// 团龙补
function dragonRoundel(cx, cy, r) {
  return `<g transform="translate(${cx} ${cy}) scale(${r / 13})"><circle r="13" fill="#f5c84c" stroke="#a87920" stroke-width="1.5"/>` +
    `<circle r="10" fill="none" stroke="#a87920" stroke-width=".8" stroke-dasharray="2 1.6"/>` +
    `<path d="M-6 5 C-8 -3 -1 -8 4 -5 C8 -2 6 4 1 3 C-2 2 -1 -2 2 -2" fill="none" stroke="${RED}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="-6" cy="5" r="1.8" fill="${RED}"/><path d="M5 -8 l1.5 2.5 M7.5 -6 l2 1" stroke="${RED}" stroke-width="1" stroke-linecap="round"/></g>`;
}

// 玉带：革带上缀玉銙，松垂于腰间
function jadeBelt() {
  let s = `<path d="M63 179 Q100 193 137 179 L138 188 Q100 202 62 188 Z" fill="#8f1f1a" stroke="#5e1410" stroke-width="1.2"/>`;
  for (const x of [72, 86, 114, 128]) {
    const u = (x - 63) / 74, y = 179 + 28 * u * (1 - u);
    s += `<rect x="${x - 4.5}" y="${(y + 1).toFixed(1)}" width="9" height="7" rx="1.5" fill="#e6efd8" stroke="#8fae7f" stroke-width=".8"/>`;
  }
  return s + `<circle cx="100" cy="190.5" r="5" fill="${GOLD}" stroke="#a87920"/>`;
}

function robeBody(rc, rd, o) {
  let s = `<path d="M70 128 Q100 119 130 128 L152 213 Q100 224 48 213 Z" fill="${rc}" stroke="${rd}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M121 131 L146 212 Q134 217 124 218 L112 140 Z" fill="${rd}" opacity=".18"/>` +
    `<path d="M50 205 Q100 215 150 205 L152 213 Q100 224 48 213 Z" fill="${rd}" opacity=".35"/>` +
    `<path d="M100 135 Q116 146 131 151" fill="none" stroke="${rd}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M79 128 Q100 145 121 128" fill="none" stroke="${rd}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M81 128 Q100 142 119 128" fill="none" stroke="#fff6e4" stroke-width="2.5" stroke-linecap="round"/>`;
  if (o.patch) s += dragonRoundel(100, 162, 13);
  if (o.belt) s += jadeBelt();
  return s;
}

function boots(legs) {
  const b = (x, y, r = 0) => `<g transform="rotate(${r} ${x + 11} ${y + 9})"><rect x="${x}" y="${y}" width="22" height="18" rx="7" fill="${HAT}"/>` +
    `<rect x="${x - 1}" y="${y + 14}" width="24" height="5" rx="2.5" fill="#f3efe4" stroke="#c9c1ae" stroke-width=".8"/></g>`;
  return legs === 'walk' ? b(66, 205, -14) + b(108, 209, 10) : b(74, 208) + b(104, 208);
}

function sleeve([[sx, sy], [ex, ey], [hx, hy]], rc, rd) {
  const d = `M${sx} ${sy} Q${ex} ${ey} ${hx} ${hy}`;
  return `<path d="${d}" fill="none" stroke="${rd}" stroke-width="19" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${rc}" stroke-width="14.5" stroke-linecap="round"/>`;
}
const hand = ([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1.5"/>`;
const placeProp = (key, p) => !p || !PROPS[key] ? '' :
  `<g transform="translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${p.s}) translate(-32 -32)">${PROPS[key].draw()}</g>`;

/**
 * Q 版皇帝，viewBox 0 0 200 240
 * robe 袍色 / hat 冠帽 / expr 表情 / pose 动作 / beard 胡须 / patch 团龙补 / belt 玉带 / prop 道具 / headOnly 只画头部
 */
export function emperor(opt = {}) {
  const o = { robe: 'mingHuang', hat: 'yishan', expr: 'smile', pose: 'stand', beard: 'none', patch: true, belt: true, prop: null, headOnly: false, ...opt };
  const [rc, rd] = (ROBES[o.robe] || ROBES.mingHuang).c;
  const P = POSES[o.pose] || POSES.stand;
  let s = o.headOnly ? '' : `<ellipse cx="100" cy="230" rx="46" ry="6" fill="#000" opacity=".12"/>`;
  let front = '';
  s += hatBack(o.hat);
  if (!o.headOnly) {
    s += boots(P.legs || 'stand') + robeBody(rc, rd, o);
    s += P.arms.map(a => sleeve(a, rc, rd)).join('');
    const propSvg = o.prop ? placeProp(o.prop, P.prop) : '';
    const hands = P.arms.map(a => hand(a[2])).join('');
    if (P.prop && P.prop.front) front = propSvg + hands; else s += propSvg + hands;
  }
  return s + head(o) + hatFront(o.hat) + front;
}

/* ==================== 道具（viewBox 0 0 64 64） ==================== */
export const PROPS = {
  camera: { name: '相机', tag: '永乐 · MV 主镜头', draw: () =>
    `<rect x="14" y="11" width="14" height="8" rx="2" fill="#26344a"/><rect x="44" y="12" width="8" height="5" rx="1.5" fill="${RED}"/>` +
    `<rect x="5" y="17" width="54" height="35" rx="7" fill="#26344a" stroke="#111a28" stroke-width="2"/><rect x="5" y="25" width="9" height="20" rx="2" fill="#3b4c66"/>` +
    `<rect x="45" y="21" width="9" height="6" rx="1.5" fill="#f5e7a8"/><circle cx="33" cy="35" r="14" fill="#111a28"/>` +
    `<circle cx="33" cy="35" r="10" fill="#2b5c8a" stroke="#9fc3e6" stroke-width="1.6"/><circle cx="33" cy="35" r="4.5" fill="#173a5c"/><circle cx="29.5" cy="31.5" r="2.6" fill="#fff" opacity=".75"/>` },
  memorial: { name: '奏折', tag: '弘治 / 崇祯 · 勤政', draw: () =>
    `<g transform="rotate(-8 32 32)"><rect x="12" y="10" width="42" height="44" rx="2" fill="#fbf3dd" stroke="#b8862b" stroke-width="1.5"/>` +
    `<path d="M22.5 10V54M33 10V54M43.5 10V54" stroke="#e0cfa3"/><path d="M17 16V46M28 16V40M38 16V44M49 16V36" stroke="#4a3a2e" stroke-width="1.6" stroke-dasharray="3 2.2"/>` +
    `<rect x="7" y="8" width="8" height="48" rx="1.5" fill="${RED}" stroke="#871d18"/><rect x="8.5" y="14" width="5" height="12" fill="#f6efe0"/></g>` },
  throne: { name: '龙椅', tag: '通用', draw: () =>
    `<path d="M14 32V12Q14 6 20 6H44Q50 6 50 12V32Z" fill="#e0a526" stroke="#8a5f14" stroke-width="2"/><rect x="20" y="11" width="24" height="17" rx="2" fill="${RED}"/>` +
    `${dragonRoundel(32, 19.5, 6)}<circle cx="14" cy="8" r="4.5" fill="#f5c84c" stroke="#8a5f14"/><circle cx="50" cy="8" r="4.5" fill="#f5c84c" stroke="#8a5f14"/>` +
    `<rect x="5" y="24" width="10" height="14" rx="3" fill="#e0a526" stroke="#8a5f14" stroke-width="1.5"/><rect x="49" y="24" width="10" height="14" rx="3" fill="#e0a526" stroke="#8a5f14" stroke-width="1.5"/>` +
    `<rect x="8" y="32" width="48" height="9" rx="2" fill="#f5c84c" stroke="#8a5f14" stroke-width="1.5"/><rect x="17" y="28" width="30" height="6" rx="3" fill="${RED}"/>` +
    `<path d="M10 41H54L50 57H14Z" fill="#b3261e" stroke="#871d18" stroke-width="1.5"/><path d="M18 46H46M20 51H44" stroke="${GOLD}" stroke-width="1.5"/>` },
  calendar: { name: '黄历', tag: '洪熙 · 在位十个月', draw: () =>
    `<rect x="10" y="12" width="44" height="44" rx="5" fill="#fffaf0" stroke="#871d18" stroke-width="2"/><path d="M10 25V17Q10 12 15 12H49Q54 12 54 17V25Z" fill="${RED}"/>` +
    `<circle cx="22" cy="12" r="3" fill="none" stroke="#3a2a2a" stroke-width="2"/><circle cx="42" cy="12" r="3" fill="none" stroke="#3a2a2a" stroke-width="2"/>` +
    `<text x="32" y="22.5" text-anchor="middle" font-size="7.5" fill="#fff" font-family="${KAI}">黄历</text>` +
    `<text x="32" y="47" text-anchor="middle" font-size="17" font-weight="700" fill="#871d18" font-family="${KAI}">初一</text>` },
  hammock: { name: '吊床', tag: '万历 · 不上朝', draw: () =>
    `<path d="M4 12 L14 30 M60 12 L50 30" stroke="#8f5a2b" stroke-width="2"/><circle cx="4" cy="12" r="2.5" fill="#5a3a1a"/><circle cx="60" cy="12" r="2.5" fill="#5a3a1a"/>` +
    `<path d="M10 28 Q32 54 54 28 Q32 42 10 28 Z" fill="#efe2c4" stroke="#9a8668" stroke-width="1.5"/>` +
    `<path d="M17 33 Q32 44 47 33 M22 38 Q32 46 42 38" fill="none" stroke="#c9b48a" stroke-width="1"/><path d="M14 29 Q32 40 50 29" fill="none" stroke="${RED}" stroke-width="1.5"/>` },
  pills: { name: '红丸', tag: '泰昌 · 红丸案', draw: () => {
    const g = uid('pill');
    return `<defs><radialGradient id="${g}" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".6" stop-color="#d42f25"/><stop offset="1" stop-color="#8f1a14"/></radialGradient></defs>` +
      `<ellipse cx="32" cy="46" rx="27" ry="9" fill="#a8261f"/><ellipse cx="32" cy="43.5" rx="23" ry="7" fill="#efdcb8"/>` +
      `<circle cx="22" cy="37" r="7.5" fill="url(#${g})"/><circle cx="41" cy="38" r="7.5" fill="url(#${g})"/><circle cx="31" cy="30" r="7.5" fill="url(#${g})"/>`; } },
  furnace: { name: '炼丹炉', tag: '嘉靖 · 修道炼丹', draw: () =>
    `<path d="M18 47 L14 58 M46 47 L50 58 M32 50 V60" stroke="#2b4a35" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M12 26 Q12 52 32 52 Q52 52 52 26 Z" fill="#4f7a5a" stroke="#2b4a35" stroke-width="2"/><path d="M15 34 H49" stroke="${GOLD}" stroke-width="2" stroke-dasharray="3 3"/>` +
    `<rect x="8" y="22" width="48" height="6" rx="3" fill="#6b9a74" stroke="#2b4a35" stroke-width="1.5"/><path d="M8 22 V14 H13 V22 M56 22 V14 H51 V22" fill="none" stroke="#2b4a35" stroke-width="3"/>` +
    `<path d="M18 22 Q32 6 46 22 Z" fill="#5d8a66" stroke="#2b4a35" stroke-width="1.5"/><circle cx="32" cy="10" r="3.5" fill="${GOLD}"/>` +
    `<circle cx="32" cy="40" r="5" fill="#ffb347"/><circle cx="32" cy="40" r="2.5" fill="#fff1b8"/>` },
  leopard: { name: '豹', tag: '正德 · 豹房', draw: () =>
    `<path d="M48 50 Q60 46 56 34" stroke="#d99a30" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="46" rx="18" ry="12" fill="#eeae45" stroke="#b5761c" stroke-width="1.5"/>` +
    `<path d="M20 22 L18 10 L28 16 Z M44 22 L46 10 L36 16 Z" fill="#eeae45" stroke="#b5761c" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<circle cx="32" cy="27" r="14" fill="#f2b955" stroke="#b5761c" stroke-width="1.5"/><ellipse cx="32" cy="33" rx="7" ry="5" fill="#fff4dc"/>` +
    `<path d="M30 30.5 H34 L32 33 Z" fill="#5a2a1a"/><ellipse cx="26" cy="25" rx="2" ry="2.6" fill="${INK}"/><ellipse cx="38" cy="25" rx="2" ry="2.6" fill="${INK}"/>` +
    `<path d="M32 33 V35 M32 35 Q29 37 27 35.5 M32 35 Q35 37 37 35.5" stroke="#5a2a1a" stroke-width="1" fill="none"/>` +
    `<g fill="#6b3a12"><circle cx="23" cy="19" r="1.6"/><circle cx="41" cy="19" r="1.6"/><circle cx="32" cy="16" r="1.4"/><circle cx="20" cy="44" r="2.2"/><circle cx="29" cy="50" r="2"/><circle cx="40" cy="43" r="2.2"/><circle cx="45" cy="51" r="1.8"/><circle cx="24" cy="53" r="1.6"/></g>` },
  seal: { name: '玉玺', tag: '通用', draw: () =>
    `<path d="M18 38 Q18 20 32 17 Q46 20 46 38 Z" fill="#b9d6b0" stroke="#5f8a58" stroke-width="1.5"/><path d="M24 30 Q32 22 40 30" fill="none" stroke="#5f8a58" stroke-width="1.5"/>` +
    `<circle cx="28" cy="26" r="1.4" fill="#2a3a28"/><circle cx="36" cy="26" r="1.4" fill="#2a3a28"/>` +
    `<rect x="12" y="36" width="40" height="18" rx="3" fill="#cfe3c8" stroke="#5f8a58" stroke-width="1.5"/><rect x="12" y="50" width="40" height="5" rx="1.5" fill="${RED}"/>` +
    `<path d="M46 24 q8 4 6 14 q-1 4 2 8" fill="none" stroke="${RED}" stroke-width="2"/><circle cx="54" cy="47" r="2.5" fill="${RED}"/>` },
  map: { name: '地图', tag: '建文 · 下落成谜', draw: () =>
    `<rect x="10" y="13" width="44" height="38" fill="#f1e2bb" stroke="#a88a54" stroke-width="1.2"/>` +
    `<path d="M14 40 L22 30 L28 36 L34 26 L40 34" fill="none" stroke="#7d9a7a" stroke-width="1.5"/><path d="M12 22 Q24 26 30 20 T52 24" fill="none" stroke="#5aa6c8" stroke-width="2"/>` +
    `<path d="M18 46 Q28 40 36 44 T46 35" fill="none" stroke="${RED}" stroke-width="1.5" stroke-dasharray="2.5 2"/><path d="M45 30 l5 5 m0 -5 l-5 5" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="5" y="9" width="7" height="46" rx="3.5" fill="#8f5a2b"/><rect x="52" y="9" width="7" height="46" rx="3.5" fill="#8f5a2b"/>` },
  compass: { name: '罗盘', tag: '永乐 · 郑和下西洋', draw: () => {
    let t = '';
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
      t += `<path d="M${(32 + 21 * c).toFixed(1)} ${(32 + 21 * s).toFixed(1)} L${(32 + 17.5 * c).toFixed(1)} ${(32 + 17.5 * s).toFixed(1)}" stroke="#7a5520" stroke-width="1.2"/>`;
    }
    return `<circle cx="32" cy="32" r="27" fill="#c99a4a" stroke="#7a5520" stroke-width="2"/><circle cx="32" cy="32" r="21" fill="#f3e3bb" stroke="#7a5520"/>` + t +
      `<circle cx="32" cy="32" r="13" fill="none" stroke="#a88a54"/><path d="M32 14 L36 32 L28 32 Z" fill="${RED}"/><path d="M32 50 L36 32 L28 32 Z" fill="${NAVY}"/>` +
      `<circle cx="32" cy="32" r="2.5" fill="${GOLD}" stroke="#7a5520"/>`; } },
  bow: { name: '弓箭', tag: '正统 · 土木堡', draw: () =>
    `<path d="M20 5 Q56 32 20 59" fill="none" stroke="#8f5a2b" stroke-width="4.5" stroke-linecap="round"/><path d="M20 5 V59" stroke="#efe2c4" stroke-width="1.2"/>` +
    `<path d="M8 50 L54 12" stroke="#6b4a2b" stroke-width="2.2"/><path d="M54 12 L45 14 L50.5 20.2 Z" fill="#9aa8b5" stroke="#5a6672"/>` +
    `<path d="M8 50 L4 48 M8 50 L7 54 M11 47.5 L7 45.5 M11 47.5 L10 51.5" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>` },
  cricket: { name: '蛐蛐罐', tag: '宣德 · 促织天子', draw: () =>
    `<path d="M14 28 Q12 54 32 55 Q52 54 50 28 Z" fill="#3f5f8f" stroke="#283e60" stroke-width="1.8"/><path d="M16 38 Q32 44 48 38" fill="none" stroke="#dfe8f5" stroke-width="2"/>` +
    `<path d="M22 46 q3 -4 6 0 t6 0 t6 0" fill="none" stroke="#dfe8f5" stroke-width="1.5"/><ellipse cx="32" cy="28" rx="19" ry="5.5" fill="#5f7fb0" stroke="#283e60" stroke-width="1.5"/>` +
    `<ellipse cx="33" cy="20" rx="8" ry="4" fill="#5a4220"/><circle cx="26" cy="19" r="2.6" fill="#3e2c14"/>` +
    `<path d="M24 18 Q18 10 12 9 M25 17 Q22 8 18 5" stroke="#3e2c14" stroke-width="1" fill="none"/><path d="M30 23 L27 27 M36 23 L39 27 M40 20 L45 25" stroke="#3e2c14" stroke-width="1.3"/>` },
  cup: { name: '鸡缸杯', tag: '成化 · 斗彩', draw: () =>
    `<path d="M8 24 H56 Q54 50 32 52 Q10 50 8 24 Z" fill="#fbf8f0" stroke="#b9b2a0" stroke-width="1.5"/><ellipse cx="32" cy="24" rx="24" ry="5" fill="#f1ece0" stroke="#b9b2a0" stroke-width="1.2"/>` +
    `<rect x="24" y="50" width="16" height="5" rx="1.5" fill="#efe9da" stroke="#b9b2a0"/>` +
    `<path d="M14 44 q2 -8 4 0 M44 44 q2 -9 4 0 M48 44 q-3 -6 -5 0" stroke="#4f9a5a" stroke-width="1.6" fill="none"/>` +
    `<ellipse cx="30" cy="38" rx="6.5" ry="4.5" fill="${GOLD}"/><circle cx="36.5" cy="33.5" r="3" fill="${GOLD}"/><path d="M36 30.5 q1 -2.5 3 -1" stroke="${RED}" stroke-width="1.6" fill="none"/>` +
    `<path d="M39.3 33 l2.5 .8 -2.5 .8 Z" fill="${RED}"/><path d="M24 37 q-6 -6 -8 -2 M24 38 q-6 -2 -7 2" stroke="#2f6b9a" stroke-width="1.6" fill="none"/>` +
    `<path d="M28 42.5 V46 M32 42.5 V46" stroke="${RED}" stroke-width="1"/>` },
  plane: { name: '木工刨', tag: '天启 · 木匠皇帝', draw: () =>
    `<path d="M40 38 Q38 24 48 20 Q54 21 51 28 L46 38 Z" fill="#a8692e" stroke="#6b4320" stroke-width="1.2"/><circle cx="16" cy="34" r="5" fill="#a8692e" stroke="#6b4320" stroke-width="1.2"/>` +
    `<path d="M6 37 H54 L58 48 H3 Z" fill="#cf9150" stroke="#7a4f22" stroke-width="1.5"/><rect x="29" y="28" width="4.5" height="14" fill="#9aa8b5" stroke="#5a6672" stroke-width=".8" transform="rotate(20 31 35)"/>` +
    `<path d="M30 52 q4 6 10 2 q4 -3 1 -6 M40 54 q6 4 12 0 q3 -3 0 -5" stroke="#e6a35a" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  bowl: { name: '钵', tag: '洪武 · 开局一个碗', draw: () =>
    `<path d="M14 10 L36 30 M20 8 L40 29" stroke="#c99a4a" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M8 30 H56 Q55 54 32 55 Q9 54 8 30 Z" fill="#7a5a3a" stroke="#4a3420" stroke-width="1.8"/><ellipse cx="32" cy="30" rx="24" ry="5.5" fill="#4f3923" stroke="#4a3420" stroke-width="1.2"/>` +
    `<path d="M18 38 Q32 43 46 38" stroke="#9a7a55" stroke-width="1.5" fill="none"/><path d="M40 41 l3 5 l-2 4" stroke="#3a2614" stroke-width="1.2" fill="none"/>` },
  vase: { name: '景泰蓝', tag: '景泰 · 掐丝珐琅', draw: () =>
    `<path d="M26 6 H38 V14 Q51 22 51 38 Q51 54 32 58 Q13 54 13 38 Q13 22 26 14 Z" fill="#1f6fb2" stroke="#b8862b" stroke-width="2"/>` +
    `<path d="M24 14 H40 M15 30 H49 M15 46 H49" stroke="${GOLD}" stroke-width="1.6"/><circle cx="32" cy="38" r="6" fill="${RED}" stroke="${GOLD}" stroke-width="1.4"/>` +
    `<path d="M20 38 q4 -5 6 0 M38 38 q4 -5 6 0 M24 23 q3 -4 6 0 q3 -4 6 0 M22 52 q5 -4 10 0 q5 -4 10 0" stroke="${GOLD}" stroke-width="1.3" fill="none"/><circle cx="32" cy="38" r="2.2" fill="#f5c84c"/>` },
  ship: { name: '宝船', tag: '隆庆开关 · 下西洋', draw: () =>
    `<path d="M2 56 q5 -3 10 0 t10 0 t10 0 t10 0 t10 0 t10 0" fill="none" stroke="#3a8fc4" stroke-width="2"/>` +
    `<path d="M12 12 H28 L27 34 H13 Z M28 8 H46 L45 34 H29 Z M44 16 H56 L55 34 H45 Z" fill="#e9d6a8" stroke="#a8875a"/>` +
    `<path d="M13 18 H27 M13 24 H27 M29 15 H45 M29 22 H45 M29 28 H45 M45 22 H55 M45 28 H55" stroke="#c9b083" stroke-width="1"/>` +
    `<path d="M20 38 V8 M37 38 V4 M50 38 V14" stroke="#5a3a1a" stroke-width="2"/><path d="M37 4 L45 6 L37 8 Z" fill="${RED}"/>` +
    `<path d="M4 38 H60 L53 50 H11 Z" fill="#8f5a2b" stroke="#5a3a1a" stroke-width="1.5"/><path d="M7 42 H57" stroke="${RED}" stroke-width="2.5"/>` },
};

/* ==================== 皇帝数据（年号 · 在位） ==================== */
export const EMPERORS = [
  { id: 'hongwu',    reign: '洪武', name: '朱元璋', years: '1368–1398', robe: 'zheHuang', hat: 'mian',   beard: 'full',     expr: 'serious',   pose: 'hold',  prop: 'bowl',     tag: '开局一个碗' },
  { id: 'jianwen',   reign: '建文', name: '朱允炆', years: '1398–1402', robe: 'baoLan',   hat: 'yishan', beard: 'none',     expr: 'sweat',     pose: 'hold',  prop: 'map',      tag: '下落成谜' },
  { id: 'yongle',    reign: '永乐', name: '朱棣',   years: '1402–1424', robe: 'mingHuang',hat: 'yishan', beard: 'goatee',   expr: 'happy',     pose: 'hold',  prop: 'camera',   tag: 'MV 主角 · 我拍照' },
  { id: 'hongxi',    reign: '洪熙', name: '朱高炽', years: '1424–1425', robe: 'shiQing',  hat: 'yishan', beard: 'mustache', expr: 'smile',     pose: 'show',  prop: 'calendar', tag: '在位十个月' },
  { id: 'xuande',    reign: '宣德', name: '朱瞻基', years: '1425–1435', robe: 'moLv',     hat: 'yishan', beard: 'mustache', expr: 'wink',      pose: 'show',  prop: 'cricket',  tag: '促织天子' },
  { id: 'zhengtong', reign: '正统 / 天顺', name: '朱祁镇', years: '1435–1449 · 1457–1464', robe: 'xuanQing', hat: 'yishan', beard: 'none', expr: 'sad', pose: 'stand', prop: 'bow', tag: '土木堡 · 两度登基' },
  { id: 'jingtai',   reign: '景泰', name: '朱祁钰', years: '1449–1457', robe: 'tianQing', hat: 'yishan', beard: 'mustache', expr: 'serious',   pose: 'show',  prop: 'vase',     tag: '景泰蓝' },
  { id: 'chenghua',  reign: '成化', name: '朱见深', years: '1464–1487', robe: 'jiangZi',  hat: 'yishan', beard: 'goatee',   expr: 'smile',     pose: 'show',  prop: 'cup',      tag: '斗彩鸡缸杯' },
  { id: 'hongzhi',   reign: '弘治', name: '朱祐樘', years: '1487–1505', robe: 'zhuHong',  hat: 'yishan', beard: 'mustache', expr: 'smile',     pose: 'hold',  prop: 'memorial', tag: '一生一后' },
  { id: 'zhengde',   reign: '正德', name: '朱厚照', years: '1505–1521', robe: 'feiHong',  hat: 'yishan', beard: 'none',     expr: 'cool',      pose: 'point', prop: 'leopard',  tag: '豹房 · 自封大将军' },
  { id: 'jiajing',   reign: '嘉靖', name: '朱厚熜', years: '1521–1567', robe: 'jiangZi',  hat: 'yishan', beard: 'full',     expr: 'sleepy',    pose: 'hold',  prop: 'furnace',  tag: '修道炼丹' },
  { id: 'longqing',  reign: '隆庆', name: '朱载坖', years: '1567–1572', robe: 'shiQing',  hat: 'yishan', beard: 'goatee',   expr: 'happy',     pose: 'hold',  prop: 'ship',     tag: '隆庆开关' },
  { id: 'wanli',     reign: '万历', name: '朱翊钧', years: '1572–1620', robe: 'zhuHong',  hat: 'yishan', beard: 'goatee',   expr: 'sleepy',    pose: 'hold',  prop: 'hammock',  tag: '三十年不上朝' },
  { id: 'taichang',  reign: '泰昌', name: '朱常洛', years: '1620',      robe: 'zheHuang', hat: 'yishan', beard: 'mustache', expr: 'surprised', pose: 'hold',  prop: 'pills',    tag: '在位一月 · 红丸案' },
  { id: 'tianqi',    reign: '天启', name: '朱由校', years: '1620–1627', robe: 'moLv',     hat: 'yishan', beard: 'none',     expr: 'happy',     pose: 'hold',  prop: 'plane',    tag: '木匠皇帝' },
  { id: 'chongzhen', reign: '崇祯', name: '朱由检', years: '1627–1644', robe: 'xuanQing', hat: 'yishan', beard: 'goatee',   expr: 'serious',   pose: 'hold',  prop: 'memorial', tag: '勤政 · 末代皇帝' },
];
const REIGNS = [
  ['洪武', '朱元璋'], ['建文', '朱允炆'], ['永乐', '朱棣'], ['洪熙', '朱高炽'], ['宣德', '朱瞻基'], ['正统', '朱祁镇'],
  ['景泰', '朱祁钰'], ['天顺', '朱祁镇'], ['成化', '朱见深'], ['弘治', '朱祐樘'], ['正德', '朱厚照'], ['嘉靖', '朱厚熜'],
  ['隆庆', '朱载坖'], ['万历', '朱翊钧'], ['泰昌', '朱常洛'], ['天启', '朱由校'], ['崇祯', '朱由检'],
];

/* ==================== 印章 & 歌词条 ==================== */
const sealDefs = (fid, seed) =>
  `<defs><filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${seed}" result="n"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
function sealInner(text, fid) {
  const [a, b] = [...text];
  const t = (ch, y) => `<text x="40" y="${y}" font-size="25" text-anchor="middle" fill="#fbeee0" font-family="${KAI}" font-weight="700">${ch}</text>`;
  return `<g filter="url(#${fid})"><rect x="6" y="6" width="68" height="68" rx="9" fill="${RED}"/>` +
    `<rect x="11.5" y="11.5" width="57" height="57" rx="5" fill="none" stroke="#fbeee0" stroke-width="2.2"/>${t(a, 37)}${t(b, 64)}</g>`;
}
export function sealSvg(text, seed = 1) {
  const f = uid('rough');
  return svgEl('0 0 80 80', sealDefs(f, seed) + sealInner(text, f));
}

export function lyricBar({ seal = true, progress = .68, opacity = 1, shake = false, text = '示例歌词条', sealText = '永乐' } = {}) {
  const f = uid('rough'), sh = uid('shadow'), r = rng(7);
  // 撕纸边缘
  let d = 'M34 22 L300 16 L566 20';
  for (let y = 28; y <= 116; y += 8) d += ` L${(566 + r() * 12 - 4).toFixed(1)} ${y}`;
  d += ' L560 122 L300 126 L30 120';
  for (let y = 112; y >= 28; y -= 8) d += ` L${(34 - r() * 12 + 4).toFixed(1)} ${y}`;
  d += ' Z';
  let s = `<defs><filter id="${sh}" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".2"/></filter></defs>` + sealDefs(f, 5);
  s += `<g opacity="${opacity}"><path d="${d}" fill="#f3e2bf" filter="url(#${sh})"/>` +
    `<path d="M70 38 H520 M90 104 H500 M60 70 H140" stroke="#e5cf9f" stroke-width="2.5" opacity=".7" stroke-linecap="round"/>` +
    `<text x="280" y="84" text-anchor="middle" font-size="50" font-weight="800" letter-spacing="8" fill="${NAVY}" font-family="${KAI}">${text}</text>` +
    `<rect x="90" y="102" width="380" height="6" rx="3" fill="#dcc89c"/>` +
    `<rect class="lb-prog" x="90" y="102" width="${(380 * progress).toFixed(1)}" height="6" rx="3" fill="${RED}"/>`;
  if (shake) s += line('M22 52 H6 M18 72 H0 M22 92 H8 M578 52 H594 M582 72 H600 M578 92 H592', 3, RED);
  if (seal) s += `<g transform="translate(492 30) scale(.75)">${sealInner(sealText, f)}</g>`;
  return svgEl('0 0 600 140', s + '</g>');
}

/* ==================== 场景（viewBox 0 0 320 180） ==================== */
function roof(x, y, w, h, fill, stroke) {
  return `<path d="M${x - 12} ${y} Q${x - 2} ${y - 3} ${x + 6} ${y - h} L${x + w - 6} ${y - h} Q${x + w + 2} ${y - 3} ${x + w + 12} ${y} Q${x + w / 2} ${y - 5} ${x - 12} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>` +
    `<rect x="${x + 4}" y="${y - h - 3}" width="${w - 8}" height="3" rx="1.5" fill="${stroke}"/>`;
}
function hall(x, y, w, o = {}) {
  const roofC = o.roof || '#e0a526', roofD = o.roofD || '#9a6a12', wall = o.wall || '#b3261e', n = 5;
  let s = `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="8" fill="#e9e3d3" stroke="#b9b09a"/><rect x="${x}" y="${y - 30}" width="${w}" height="30" fill="${wall}"/>`;
  for (let i = 0; i <= n; i++) s += `<rect x="${x + i * w / n - 1.5}" y="${y - 30}" width="3" height="30" fill="#7a1612"/>`;
  for (let i = 0; i < n; i++) s += `<rect x="${x + i * w / n + w / n * .2}" y="${y - 24}" width="${w / n * .6}" height="20" fill="${o.door || '#d4a03a'}" opacity=".85"/>`;
  s += roof(x - 4, y - 30, w + 8, 12, roofC, roofD);
  s += `<rect x="${x + w * .18}" y="${y - 54}" width="${w * .64}" height="14" fill="${wall}"/>`;
  return s + roof(x + w * .1, y - 52, w * .8, 16, roofC, roofD);
}
const FLAME = 'M0 0 C-10 -6 -8 -20 0 -34 C2 -24 8 -22 6 -14 C12 -18 12 -26 10 -30 C18 -20 16 -6 0 0 Z';
const flame = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="${FLAME}" fill="#e8452c"/><path d="${FLAME}" fill="#f59a2c" transform="scale(.7)"/><path d="${FLAME}" fill="#ffd84a" transform="scale(.4)"/></g>`;
const skyGrad = (id, a, b, mid) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/>${mid ? `<stop offset=".55" stop-color="${mid}"/>` : ''}<stop offset="1" stop-color="${b}"/></linearGradient>`;
function yurt(x, y, k) {
  return `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-22 0 V-16 Q-22 -20 -18 -21 Q0 -36 18 -21 Q22 -20 22 -16 V0 Z" fill="#f4efe2" stroke="#9c8f74" stroke-width="1.2"/>` +
    `<path d="M-22 -14 H22" stroke="${RED}" stroke-width="2.5"/><path d="M-6 0 V-10 H6 V0 Z" fill="#7a3a2a"/><path d="M-5 -29 Q0 -34 5 -29 Z" fill="${RED}"/></g>`;
}
const banner = (x, y) => `<path d="M${x} ${y} V${y - 46}" stroke="#5a3a1a" stroke-width="2"/><path d="M${x} ${y - 46} L${x + 24} ${y - 40} L${x + 16} ${y - 35} L${x + 24} ${y - 30} L${x} ${y - 28} Z" fill="#2b3a52" stroke="${RED}" stroke-width="1"/><circle cx="${x}" cy="${y - 47}" r="2" fill="${GOLD}"/>`;
function pavilion(x, y) {
  return `<rect x="${x - 26}" y="${y}" width="52" height="5" fill="#e9e3d3" stroke="#b9b09a" stroke-width=".8"/>` +
    `<rect x="${x - 20}" y="${y - 22}" width="3.5" height="22" fill="#b3261e"/><rect x="${x + 16.5}" y="${y - 22}" width="3.5" height="22" fill="#b3261e"/><rect x="${x - 1.5}" y="${y - 22}" width="3" height="22" fill="#b3261e"/>` +
    `<path d="M${x - 18} ${y - 8} H${x + 18}" stroke="#b3261e" stroke-width="1.5"/>${roof(x - 22, y - 22, 44, 13, '#2f7f6a', '#1b5446')}` +
    `<path d="M${x - 14} ${y - 37} Q${x} ${y - 50} ${x + 14} ${y - 37} Z" fill="#2f7f6a" stroke="#1b5446"/><circle cx="${x}" cy="${y - 47}" r="2.6" fill="${GOLD}"/>`;
}
function willow(x, y, h = 62) {
  let s = `<path d="M${x} ${y} Q${x - 5} ${y - h / 2} ${x + 2} ${y - h}" stroke="#6b4a2b" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="${x + 2}" cy="${y - h + 4}" rx="24" ry="12" fill="#6fa54f"/>`;
  for (let i = -5; i <= 5; i++) {
    const len = 26 + (5 - Math.abs(i)) * 4;
    s += `<path d="M${x + 2 + i * 4} ${y - h + 4} q${i * 2.5} ${len * .4} ${i * 4.5} ${len}" stroke="#5f9a42" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}
const pine = (x, y, k = 1) => `<path d="M${x} ${y - 16 * k} L${x + 7 * k} ${y} H${x - 7 * k} Z" fill="#3f6b48"/><path d="M${x} ${y - 24 * k} L${x + 5 * k} ${y - 10 * k} H${x - 5 * k} Z" fill="#4c7d55"/>`;

export const SCENES = {
  fire: { name: '火烧宫殿', draw: () => {
    const g = uid('sky'), r = uid('glow'), rand = rng(3);
    let s = `<defs>${skyGrad(g, '#2a1830', '#e3702c', '#7d2a28')}<radialGradient id="${r}" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="320" height="180" fill="url(#${g})"/>`;
    s += `<g fill="#3b3138" opacity=".75"><ellipse cx="120" cy="30" rx="60" ry="20"/><ellipse cx="170" cy="22" rx="50" ry="18"/><ellipse cx="214" cy="38" rx="46" ry="16"/><ellipse cx="88" cy="48" rx="36" ry="12"/></g>`;
    s += `<rect width="320" height="180" fill="url(#${r})"/>`;
    s += `<path d="M0 132 L30 120 L60 126 L90 116 L120 128 L200 128 L230 114 L260 124 L290 118 L320 126 V150 H0 Z" fill="#2b1a1e" opacity=".7"/>`;
    s += hall(100, 140, 120, { wall: '#8f1f1a', roof: '#d99a2b', roofD: '#7a4a10', door: '#ffcf6b' });
    s += `<rect y="148" width="320" height="32" fill="#2c1b1b"/><path d="M0 160 H320 M0 170 H320" stroke="#3d2626"/>`;
    [[96, 140, 1.1], [118, 96, .8], [150, 86, 1.2], [186, 94, .9], [214, 140, 1.2], [242, 152, .9], [70, 152, .8], [160, 152, 1.4], [128, 152, 1], [200, 154, 1], [40, 158, .7], [276, 158, .7]]
      .forEach(([x, y, k]) => s += flame(x, y, k));
    for (let i = 0; i < 30; i++) s += `<circle cx="${(rand() * 320).toFixed(1)}" cy="${(30 + rand() * 110).toFixed(1)}" r="${(.6 + rand() * 1.4).toFixed(2)}" fill="#ffc35a" opacity="${(.5 + rand() * .5).toFixed(2)}"/>`;
    return s; } },
  night: { name: '宫门夜景', draw: () => {
    const g = uid('sky'), m = uid('moon'), rand = rng(11);
    let s = `<defs>${skyGrad(g, '#0d1a36', '#2d4474')}<radialGradient id="${m}"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="url(#${g})"/>`;
    for (let i = 0; i < 26; i++) s += `<circle cx="${(rand() * 320).toFixed(1)}" cy="${(rand() * 80).toFixed(1)}" r="${(rand() * 1.2 + .4).toFixed(2)}" fill="#fff" opacity="${(rand() * .6 + .3).toFixed(2)}"/>`;
    s += `<circle cx="266" cy="38" r="34" fill="url(#${m})"/><circle cx="266" cy="38" r="15" fill="#fff3c4"/><circle cx="261" cy="34" r="3" fill="#efe0a6"/><circle cx="271" cy="42" r="2" fill="#efe0a6"/>`;
    s += `<rect y="100" width="320" height="52" fill="#93261f"/><rect y="95" width="320" height="7" fill="#d9a23a"/><path d="M0 102 H320" stroke="#7a1c16" stroke-width="2"/>`;
    s += hall(108, 100, 104, { wall: '#a8281f', door: '#ffcf6b' });
    for (const x of [124, 151, 178]) s += `<path d="M${x} 152 V132 Q${x + 9} 120 ${x + 18} 132 V152 Z" fill="#ffcf6b"/><path d="M${x + 3} 152 V134 Q${x + 9} 126 ${x + 15} 134 V152 Z" fill="#ffe7a8"/>`;
    for (const x of [70, 250]) s += `<line x1="${x}" y1="102" x2="${x}" y2="112" stroke="#3a2a1a"/><circle cx="${x}" cy="122" r="16" fill="#ffb347" opacity=".25"/><ellipse cx="${x}" cy="122" rx="8" ry="10" fill="#e8452c"/><rect x="${x - 4}" y="110" width="8" height="3" fill="${GOLD}"/><rect x="${x - 4}" y="131" width="8" height="3" fill="${GOLD}"/>`;
    s += `<rect y="152" width="320" height="28" fill="#1b2442"/><path d="M128 152 L110 180 H210 L192 152 Z" fill="#ffcf6b" opacity=".12"/>`;
    return s; } },
  camp: { name: '瓦剌大营', draw: () => {
    const g = uid('sky');
    let s = `<defs>${skyGrad(g, '#9cc3e0', '#eef1e2')}</defs><rect width="320" height="180" fill="url(#${g})"/>`;
    s += `<g fill="#fff" opacity=".85"><ellipse cx="70" cy="30" rx="26" ry="8"/><ellipse cx="90" cy="26" rx="18" ry="8"/><ellipse cx="240" cy="40" rx="30" ry="8"/></g>`;
    s += `<path d="M0 112 L36 74 L62 92 L104 52 L146 98 L186 66 L232 102 L276 62 L320 92 V140 H0 Z" fill="#8ea6bd"/>`;
    s += `<path d="M104 52 L94 63 L102 60 L110 66 L116 63 Z M276 62 L266 73 L276 70 L284 74 Z" fill="#fff" opacity=".85"/>`;
    s += `<path d="M0 126 L50 100 L96 116 L150 96 L210 120 L260 100 L320 118 V150 H0 Z" fill="#a3b88f"/><rect y="132" width="320" height="48" fill="#c4c58a"/>`;
    s += banner(60, 138) + banner(262, 134);
    s += yurt(112, 152, 1.2) + yurt(172, 146, 1) + yurt(226, 160, 1.3) + yurt(56, 166, 1);
    s += `<path d="M150 170 l14 -4 M152 166 l12 6" stroke="#6b4320" stroke-width="3" stroke-linecap="round"/>` + flame(158, 167, .45);
    return s; } },
  hall: { name: '金銮殿', draw: () => {
    let s = `<rect width="320" height="180" fill="#5e1510"/><rect y="20" width="320" height="112" fill="#8a1d16"/><rect width="320" height="22" fill="#2e4a3e"/>`;
    for (let i = 0; i < 16; i++) s += `<rect x="${i * 20 + 4}" y="5" width="12" height="12" rx="2" fill="${GOLD}" opacity=".85"/><circle cx="${i * 20 + 10}" cy="11" r="2.5" fill="#2f6b9a"/>`;
    s += `<rect x="108" y="32" width="104" height="72" fill="${GOLD}" stroke="#9a6a12" stroke-width="2"/><path d="M134 32V104M160 32V104M186 32V104" stroke="#b8862b"/>` + dragonRoundel(160, 60, 17);
    s += `<rect y="132" width="320" height="48" fill="#3d2a22"/>`;
    for (let x = -100; x <= 420; x += 60) s += `<path d="M160 132 L${x} 180" stroke="#4e372c"/>`;
    s += `<path d="M0 142 H320 M0 156 H320 M0 172 H320" stroke="#4e372c"/>`;
    s += `<path d="M144 132 H176 L198 180 H122 Z" fill="${RED}"/><path d="M147 132 L127 180 M173 132 L193 180" stroke="${GOLD}" stroke-width="1.5"/>`;
    s += `<rect x="84" y="118" width="152" height="14" fill="#d6a640" stroke="#8a5f14"/><rect x="104" y="104" width="112" height="14" fill="#e0b54a" stroke="#8a5f14"/>`;
    s += `<g transform="translate(160 76) scale(.95) translate(-32 -32)">${PROPS.throne.draw()}</g>`;
    s += `<g transform="translate(104 108) scale(.42) translate(-32 -32)">${PROPS.furnace.draw()}</g><g transform="translate(216 108) scale(.42) translate(-32 -32)">${PROPS.furnace.draw()}</g>`;
    for (const x of [24, 68, 234, 278]) s += `<rect x="${x}" y="20" width="18" height="114" fill="#b3261e"/><rect x="${x}" y="40" width="18" height="10" fill="${GOLD}"/><rect x="${x + 3}" y="20" width="3" height="114" fill="#d6473c" opacity=".6"/>`;
    return s; } },
  garden: { name: '西苑', draw: () => {
    const g = uid('sky'), w = uid('water'), rand = rng(5);
    let s = `<defs>${skyGrad(g, '#9fd0ee', '#eaf5f4')}${skyGrad(w, '#7cc0db', '#4a96bb')}</defs><rect width="320" height="180" fill="url(#${g})"/>`;
    s += `<g fill="#fff" opacity=".9"><ellipse cx="60" cy="28" rx="24" ry="7"/><ellipse cx="250" cy="22" rx="30" ry="8"/></g>`;
    s += `<path d="M0 98 L40 80 L80 92 L130 70 L180 92 L230 76 L280 90 L320 82 V108 H0 Z" fill="#b8d0d8"/>`;
    s += `<path d="M0 104 Q40 96 80 104 T160 102 T240 104 T320 100 V112 H0 Z" fill="#7fae6a"/><rect y="108" width="320" height="72" fill="url(#${w})"/>`;
    for (let i = 0; i < 14; i++) { const x = rand() * 300, y = 116 + rand() * 50; s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} h${(8 + rand() * 12).toFixed(1)}" stroke="#fff" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>`; }
    s += `<g opacity=".25" transform="translate(0 258) scale(1 -1)">${pavilion(210, 124)}</g>` + pavilion(210, 124);
    s += `<path d="M234 127 L256 132 L244 140 L272 148 L262 156 L300 166" fill="none" stroke="#efe6d2" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M234 124 L256 129 L244 137 L272 145 L262 153 L300 163" fill="none" stroke="${RED}" stroke-width="1.2"/>`;
    for (const [x, y] of [[90, 140], [104, 150], [130, 138], [150, 160], [80, 160]]) s += `<ellipse cx="${x}" cy="${y}" rx="8" ry="3" fill="#4f9a5a"/>`;
    s += `<circle cx="104" cy="147" r="2.6" fill="#f59ab0"/><circle cx="150" cy="157" r="2.6" fill="#f59ab0"/>`;
    s += `<path d="M0 118 Q50 112 90 126 Q70 150 0 158 Z" fill="#6f9f55"/><path d="M0 170 Q160 156 320 172 V180 H0 Z" fill="#5f8f48"/>`;
    return s + willow(36, 136) + willow(300, 176, 70); } },
  hill: { name: '煤山暮色', draw: () => {
    const g = uid('sky'), sun = uid('sun');
    let s = `<defs>${skyGrad(g, '#243a5e', '#c9803f', '#6f3345')}<radialGradient id="${sun}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98a"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="320" height="180" fill="url(#${g})"/>`;
    s += `<circle cx="232" cy="84" r="36" fill="url(#${sun})"/><circle cx="232" cy="84" r="13" fill="#ffcf6b"/>`;
    s += `<g fill="#5a3346" opacity=".5"><ellipse cx="80" cy="42" rx="52" ry="9"/><ellipse cx="142" cy="33" rx="38" ry="7"/><ellipse cx="252" cy="50" rx="44" ry="8"/></g>`;
    s += `<path d="M0 116 L44 92 L78 104 L118 82 L160 102 L200 88 L246 106 L286 92 L320 104 V140 H0 Z" fill="#3d4a5e" opacity=".85"/>`;
    s += `<path d="M0 140 L56 118 L104 132 L150 112 L196 130 L240 116 L290 134 L320 124 V152 H0 Z" fill="#2f3b4c"/>`;
    s += `<rect y="146" width="320" height="34" fill="#26303d"/><path d="M0 150 H320" stroke="#3a4757" stroke-width="2"/>`;
    s += `<g stroke="#1b2230" fill="#1b2230" stroke-linecap="round">`;
    s += `<path d="M92 152 Q94 126 90 104" stroke-width="9" fill="none"/>`;
    s += `<path d="M90 110 Q74 96 56 90" stroke-width="5" fill="none"/>`;
    s += `<path d="M74 100 Q70 88 60 82" stroke-width="3" fill="none"/>`;
    s += `<path d="M90 106 Q114 94 138 90" stroke-width="5" fill="none"/>`;
    s += `<path d="M90 106 Q88 86 94 70" stroke-width="4" fill="none"/>`;
    s += `<path d="M96 84 Q108 72 120 68" stroke-width="3" fill="none"/>`;
    s += `<ellipse cx="60" cy="84" rx="19" ry="9" transform="rotate(-12 60 84)"/>`;
    s += `<ellipse cx="82" cy="72" rx="21" ry="10" transform="rotate(-6 82 72)"/>`;
    s += `<ellipse cx="104" cy="66" rx="17" ry="8" transform="rotate(8 104 66)"/>`;
    s += `<ellipse cx="122" cy="72" rx="13" ry="7" transform="rotate(14 122 72)"/>`;
    s += `<ellipse cx="96" cy="86" rx="16" ry="7" transform="rotate(-4 96 86)"/>`;
    s += `</g>`;
    s += `<g stroke="#f2ead6" fill="none" stroke-linecap="round">`;
    s += `<circle cx="134" cy="93" r="2.6" fill="#f2ead6" stroke="none"/>`;
    s += `<path d="M134 95 C132 100 135 104 133 108" stroke-width="3"/>`;
    s += `<ellipse cx="133" cy="115" rx="7" ry="8.5" stroke-width="3"/>`;
    s += `<path d="M139 121 q5 3 2 8" stroke-width="2.4"/>`;
    s += `</g>`;
    for (const [x, y] of [[24, 156], [46, 162], [210, 158], [268, 164], [300, 156]]) s += `<path d="M${x} ${y} q3 -7 6 0" stroke="#3f4d5e" stroke-width="1.6" fill="none"/>`;
    s += `<ellipse cx="166" cy="118" rx="2.6" ry="1.4" fill="#c8552b" transform="rotate(24 166 118)"/>`;
    return s; } },
  pass: { name: '山路关隘', draw: () => {
    const g = uid('sky');
    let s = `<defs>${skyGrad(g, '#a3cbe6', '#eef3ea')}</defs><rect width="320" height="180" fill="url(#${g})"/>`;
    s += `<g fill="#fff" opacity=".9"><ellipse cx="80" cy="26" rx="22" ry="7"/><ellipse cx="236" cy="30" rx="28" ry="7"/></g>`;
    s += `<path d="M0 100 L50 60 L90 84 L150 46 L210 86 L260 54 L320 84 V130 H0 Z" fill="#a9bfcf"/>`;
    s += `<path d="M0 180 V78 L28 56 L58 76 L96 42 L124 82 L140 112 L146 180 Z" fill="#7f9c7b"/><path d="M320 180 V66 L292 48 L254 74 L226 56 L196 100 L176 120 L172 180 Z" fill="#6c8c6d"/>`;
    s += `<rect x="118" y="100" width="84" height="40" fill="#b4a88f" stroke="#8a7f69"/>`;
    for (let x = 118; x < 202; x += 9) if (x < 124 || x > 194) s += `<rect x="${x}" y="95" width="5" height="6" fill="#b4a88f" stroke="#8a7f69" stroke-width=".6"/>`;
    s += `<path d="M150 140 V120 Q160 108 170 120 V140 Z" fill="#3b3329"/>`;
    s += hall(136, 100, 48, { wall: '#a8281f', roof: '#4a5b66', roofD: '#28353d' });
    s += `<path d="M152 140 Q176 152 146 162 Q118 172 150 180 H196 Q160 172 184 160 Q206 148 168 140 Z" fill="#dcc89f"/>`;
    for (const [x, y, k] of [[20, 120, 1], [40, 132, 1.2], [70, 150, 1.1], [110, 160, .9], [210, 156, 1], [250, 140, 1.2], [290, 128, 1], [300, 160, 1.3]]) s += pine(x, y, k);
    s += banner(122, 98) + banner(198, 98);
    return s; } },
};

/* ==================== 分镜 ==================== */
const YONGLE = () => ({ ...EMPERORS.find(e => e.id === 'yongle') });
const nest = (x, y, w, h, vb, inner, par = 'xMidYMid meet') =>
  `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="${par}" overflow="hidden">${inner}</svg>`;
export const empAt = (o, x, y, w) => nest(x, y, w, w * 1.2, '0 0 200 240', emperor(o));
export const sceneAt = (key, x, y, w, h) => nest(x, y, w, h, '0 0 320 180', SCENES[key].draw(), 'xMidYMid slice');
function rays(cx, cy, color, op, n = 12) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a1 = i / n * Math.PI * 2, a2 = a1 + Math.PI / n * .9;
    s += `<path d="M${cx} ${cy} L${(cx + 400 * Math.cos(a1)).toFixed(1)} ${(cy + 400 * Math.sin(a1)).toFixed(1)} L${(cx + 400 * Math.cos(a2)).toFixed(1)} ${(cy + 400 * Math.sin(a2)).toFixed(1)} Z" fill="${color}" opacity="${op}"/>`;
  }
  return s;
}
function star(cx, cy, R, r, n, fill) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, d = i % 2 ? r : R; pts.push(`${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}
function polaroid(cx, cy, rot, w = 124) {
  const h = w * 1.13;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})"><rect x="${-w / 2 + 3}" y="${-h / 2 + 4}" width="${w}" height="${h}" rx="4" fill="#000" opacity=".18"/>` +
    `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" fill="#fffdf6" stroke="#dcd2b8"/>` +
    sceneAt('fire', -w / 2 + 8, -h / 2 + 8, w - 16, (w - 16) * .82) +
    `<text x="0" y="${(h / 2 - 12).toFixed(1)}" text-anchor="middle" font-size="${(w * .14).toFixed(1)}" font-weight="700" fill="${NAVY}" font-family="${KAI}">清君侧</text></g>`;
}

export const FRAMES = [
  { name: '发现火情', t: [0, .8], draw: () => sceneAt('fire', 0, 0, 320, 180) +
      empAt({ ...YONGLE(), expr: 'surprised', pose: 'point', prop: null }, 8, 62, 98) +
      `<g transform="translate(92 66)">${star(0, 0, 16, 8, 8, '#ffd84a')}<text x="0" y="6" font-size="16" font-weight="900" text-anchor="middle" fill="${RED}">!</text></g>` },
  { name: '举起相机', t: [.8, 1.5], draw: () => {
      const g = uid('warm');
      return `<defs><radialGradient id="${g}" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#fbe2a0"/><stop offset="1" stop-color="#e3a03c"/></radialGradient></defs><rect width="320" height="180" fill="url(#${g})"/>` +
        rays(160, 100, '#fff6d6', .3) + empAt(YONGLE(), 80, 4, 160); } },
  { name: '按下快门', t: [1.5, 2.2], draw: () => sceneAt('fire', 0, 0, 320, 180) +
      `<rect width="320" height="180" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="22"/>` +
      line('M22 42V22H42M278 22H298V42M298 138V158H278M42 158H22V138', 3, '#fff') +
      `<rect x="136" y="66" width="48" height="38" fill="none" stroke="#9dff6a" stroke-width="2"/>` + line('M160 80 V90 M155 85 H165', 1.5, '#9dff6a') +
      `<circle cx="34" cy="34" r="4" fill="#ff3b30"/><text x="42" y="38" font-size="11" fill="#fff" font-family="Menlo,monospace" font-weight="700">REC</text>` +
      `<text x="160" y="162" text-anchor="middle" font-size="10" fill="#fff" font-family="Menlo,monospace">1/125  F2.8  ISO 800</text>` +
      `<rect x="266" y="28" width="22" height="10" rx="2" fill="none" stroke="#fff" stroke-width="1.5"/><rect x="268" y="30" width="14" height="6" fill="#fff"/>` },
  { name: '照片弹出', t: [2.2, 3.0], draw: () => `<rect width="320" height="180" fill="#1d3557"/>` + rays(160, 90, '#ffffff', .07, 16) +
      polaroid(160, 92, -7) + line('M56 60 H84 M48 90 H80 M58 120 H86 M236 60 H264 M240 90 H272 M234 120 H262', 3, '#ffffff99') +
      star(250, 40, 7, 2.5, 4, GOLD) + star(70, 146, 6, 2, 4, GOLD) },
  { name: '闪光灯效果', t: [3.0, 3.5], draw: () => {
      const g = uid('flash');
      return sceneAt('fire', 0, 0, 320, 180) + `<rect width="320" height="180" fill="#000" opacity=".35"/>` + empAt(YONGLE(), 70, 10, 150) +
        `<defs><radialGradient id="${g}"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="320" height="180" fill="#fff" opacity=".25"/><circle cx="155" cy="125" r="150" fill="url(#${g})"/>` + star(155, 125, 46, 10, 14, '#fff'); } },
  { name: '画面定格', t: [3.5, 4.0], draw: () => {
      const f = uid('rough');
      let bg = `<rect width="320" height="180" fill="#f6efe0"/>`;
      for (let x = -180; x < 320; x += 14) bg += `<path d="M${x} 0 L${x + 180} 180" stroke="#efe3c8" stroke-width="5"/>`;
      return bg + polaroid(150, 90, 0, 128) +
        `<rect x="-22" y="-6" width="44" height="12" fill="#f3e3bb" opacity=".85" transform="translate(150 18) rotate(-4)"/>` +
        sealDefs(f, 9) + `<g transform="translate(206 140) rotate(-10) scale(.55) translate(-40 -40)">${sealInner('永乐', f)}</g>`; } },
];
const TOTAL = 4;

