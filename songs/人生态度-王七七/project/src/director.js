// 镜头导演层：55 个镜头逐帧调度。
// 一镜一策：场景 + 色调 + 皇帝入场 + 持续动作 + 环境动效 + 镜头运动 + 特殊演出。
import { clamp01, easeOut, rgba, lerp } from './lib.js';
import {
  P, embers, smoke, motes, petals, ripples, wind, stars, paperFall, scraps,
  cracks, waves, pills, rays,
} from './fx.js';

// 入场回弹（overshoot 10%，比纯 easeOut 更有“弹出来”的劲）
const back = (x) => {
  const k = Math.min(1, Math.max(0, x));
  return 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
};

const C = (who, expr, pose, o = {}) => ({ who, expr, pose, enter: 'pop', at: 0.12, act: 'idle', ...o });

// ---------------------------------------------------------------- 调度表
// x/y/w 为画面比例；y 是人像顶边；人像高 = w*1.2
export const SHOTS = {
  // ================= 前奏 =================
  s01: { scene: 'hall', grade: 'dusk', cam: { push: 0.08, panY: -0.01 }, fx: ['smoke', 'motes'], cast: [], special: 'title' },

  // ================= 主歌 1 =================
  s02: {
    scene: 'fire', grade: 'fire', cam: { push: 0.07 },
    cast: [C('yongle', 'happy', 'show', { prop: 'camera', x: 0.6, y: 0.17, w: 0.29, at: 0.3, enter: 'pop' })],
    special: 'photo', icon: false,
  },
  s03: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.04 },
    cast: [C('zhengtong', 'sleepy', 'akimbo', { x: 0.34, y: 0.34, w: 0.32, enter: 'drop', at: 0.15, act: 'sink' })],
    fx: ['scraps'], zzz: true,
  },
  s04: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05, shake: 0.002 },
    cast: [C('jianwen', 'sweat', 'hold', { prop: 'map', x: 0.36, y: 0.32, w: 0.3, enter: 'rise', at: 0.05, act: 'shake' })],
    fx: ['cracks'],
  },
  s05: { scene: 'hill', grade: 'dusk', cam: { push: 0.05, panX: 0.012 }, cast: [], fx: ['motes'], special: 'rope' },
  s06: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.03 },
    cast: [C('wanli', 'sleepy', 'hold', { prop: 'memorial', x: 0.33, y: 0.3, w: 0.34, enter: 'rise', at: 0.1, act: 'sink' })],
    fx: ['scraps'], zzz: true,
  },
  s07: {
    scene: 'hall', grade: 'night', cam: { push: 0.04, panX: 0.01 },
    cast: [C('wanli', 'sleepy', 'hold', { prop: 'calendar', x: 0.36, y: 0.3, w: 0.32, enter: 'pop', at: 0.14, act: 'nod' })],
    fx: ['motes'],
  },

  // ================= 主歌 2 =================
  s08: {
    scene: 'garden', grade: 'warm', cam: { push: 0.05, panX: -0.01 },
    cast: [C('zhengde', 'happy', 'cheer', { prop: 'leopard', x: 0.32, y: 0.24, w: 0.36, enter: 'pop', at: 0.1, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s09: {
    scene: 'garden', grade: 'warm', cam: { push: 0.03 },
    cast: [C('zhengde', 'cool', 'akimbo', { x: 0.34, y: 0.28, w: 0.32, enter: 'rise', at: 0.1, act: 'bounce' })],
    fx: ['petals'],
  },
  s10: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.05 },
    cast: [C('jiajing', 'serious', 'hold', { prop: 'furnace', x: 0.33, y: 0.28, w: 0.34, enter: 'rise', at: 0.1, act: 'idle' })],
    fx: ['smoke', 'furnace'], glow: { x: 0.5, y: 0.62, r: 0.24, color: '#ff9a3c', a: 0.28 },
  },
  s11: {
    scene: 'pass', mirror: true, grade: 'warm', cam: { push: 0.04, panX: 0.01 },
    cast: [C('jiajing', 'smile', 'walk', { x: 0.52, y: 0.3, w: 0.28, enter: 'slideL', at: 0.02, act: 'idle' })],
    fx: ['mist'],
  },
  s12: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.05, shake: 0.003 },
    cast: [C('jiajing', 'cool', 'akimbo', { x: 0.34, y: 0.3, w: 0.32, enter: 'rise', at: 0.05, act: 'shake' })],
    fx: ['scraps'],
  },
  s13: {
    scene: 'hall', grade: 'warm', cam: { push: 0.06 },
    cast: [C('taichang', 'surprised', 'hold', { prop: 'pills', x: 0.35, y: 0.3, w: 0.31, enter: 'pop', at: 0.1, act: 'idle' })],
    fx: ['pills'], glow: { x: 0.5, y: 0.58, r: 0.2, color: '#ff5a4a', a: 0.22 },
  },
  s14: {
    scene: 'camp', grade: 'warm', cam: { push: 0.05 },
    cast: [C('zhengde', 'shout', 'point', { x: 0.34, y: 0.28, w: 0.33, enter: 'slideR', at: 0.05, act: 'idle' })],
    fx: ['waves', 'wind'],
  },
  s15: {
    scene: 'pass', grade: 'warm', cam: { push: 0.06, panX: -0.012 },
    cast: [C('zhengde', 'happy', 'walk', { x: 0.3, y: 0.28, w: 0.3, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['mist', 'petals'],
  },
  s16: {
    scene: 'garden', grade: 'warm', cam: { push: 0.05 },
    cast: [
      C('zhengde', 'happy', 'cheer', { prop: 'leopard', x: 0.3, y: 0.24, w: 0.36, enter: 'pop', at: 0.08, act: 'bounce' }),
    ],
    fx: ['petals', 'ripples'],
  },
  s17: {
    scene: 'pass', grade: 'dusk', cam: { push: 0.05, shake: 0.002 },
    cast: [C('zhengtong', 'serious', 'stand', { prop: 'bow', x: 0.36, y: 0.28, w: 0.3, enter: 'rise', at: 0.05, act: 'sway' })],
    fx: ['wind', 'mist'], gust: [[0, 0.15], [1.4, 1], [2.4, 1], [3.2, 0.2], [4.7, 0.1]],
  },

  // ================= 副歌 1 =================
  s18: {
    scene: 'hall', grade: 'warm', cam: { push: 0.07 },
    cast: [C('hongwu', 'serious', 'show', { prop: 'seal', x: 0.34, y: 0.24, w: 0.33, enter: 'rise', at: 0.06, act: 'idle' })],
    fx: ['rays', 'motes'], glow: { x: 0.5, y: 0.5, r: 0.36, color: '#e9b949', a: 0.2 },
  },
  s19: {
    scene: 'hall', grade: 'warm', cam: { push: 0.06 },
    cast: [
      C('hongwu', 'serious', 'show', { prop: 'seal', x: 0.16, y: 0.3, w: 0.27, enter: 'rise', at: 0.05, act: 'bounce' }),
      C('yongle', 'happy', 'cheer', { x: 0.58, y: 0.28, w: 0.29, enter: 'rise', at: 0.22, act: 'bounce' }),
    ],
    fx: ['rays'],
  },
  s20: {
    scene: 'garden', grade: 'warm', cam: { push: 0.05 },
    cast: [C('xuande', 'wink', 'show', { prop: 'cricket', x: 0.35, y: 0.27, w: 0.31, enter: 'pop', at: 0.08, act: 'bounce' })],
    fx: ['petals'],
  },
  s21: {
    scene: 'garden', grade: 'warm', cam: { push: 0.04 },
    cast: [C('xuande', 'happy', 'hold', { prop: 'cricket', x: 0.33, y: 0.28, w: 0.33, enter: 'rise', at: 0.06, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s22: {
    scene: 'pass', grade: 'dusk', cam: { push: 0.06, panX: -0.02 },
    cast: [C('chongzhen', 'sad', 'walk', { prop: 'memorial', x: 0.3, y: 0.28, w: 0.3, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['mist', 'wind'],
  },
  s23: {
    scene: 'pass', grade: 'warm', cam: { push: 0.05, panX: 0.015 },
    cast: [C('hongzhi', 'smile', 'walk', { prop: 'memorial', x: 0.35, y: 0.28, w: 0.3, enter: 'slideL', at: 0.02, act: 'idle' })],
    fx: ['mist'],
  },
  s24: {
    scene: 'garden', grade: 'warm', cam: { push: 0.06 },
    cast: [C('zhengde', 'happy', 'cheer', { prop: 'leopard', x: 0.31, y: 0.24, w: 0.35, enter: 'pop', at: 0.06, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s25: {
    scene: 'hall', grade: 'warm', cam: { push: 0.08 },
    cast: [C('hongwu', 'angry', 'show', { prop: 'seal', x: 0.35, y: 0.26, w: 0.32, enter: 'pop', at: 0.05, act: 'idle' })],
    special: 'stamp',
  },
  s26: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05 },
    cast: [
      C('longqing', 'happy', 'hold', { prop: 'ship', x: 0.18, y: 0.3, w: 0.26, enter: 'rise', at: 0.05, act: 'bounce' }),
      C('tianqi', 'happy', 'show', { prop: 'plane', x: 0.56, y: 0.3, w: 0.26, enter: 'rise', at: 0.18, act: 'bounce' }),
    ],
    fx: ['motes'],
  },
  s27: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.04, shake: 0.003 },
    cast: [C('jiajing', 'cool', 'akimbo', { prop: 'furnace', x: 0.35, y: 0.28, w: 0.32, enter: 'rise', at: 0.05, act: 'shake' })],
    fx: ['smoke'], glow: { x: 0.5, y: 0.62, r: 0.22, color: '#ff8a3c', a: 0.26 },
  },
  s28: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05, panX: 0.012 },
    cast: [C('zhengde', 'cool', 'point', { x: 0.33, y: 0.28, w: 0.32, enter: 'slideL', at: 0.03, act: 'idle' })],
    fx: ['motes'],
  },
  s29: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05 },
    cast: [C('jingtai', 'serious', 'show', { prop: 'vase', x: 0.34, y: 0.28, w: 0.32, enter: 'rise', at: 0.05, act: 'idle', path: [[0, 0], [1.4, -0.06], [2.4, 0.05], [3.2, -0.03], [4.2, 0]] })],
    fx: ['motes', 'rays'],
  },
  s30: {
    scene: 'pass', grade: 'warm', cam: { push: 0.06, panX: 0.015 },
    cast: [C('longqing', 'happy', 'point', { prop: 'compass', x: 0.34, y: 0.28, w: 0.31, enter: 'slideL', at: 0.03, act: 'bounce' })],
    fx: ['mist', 'rays'],
  },
  s31: {
    scene: 'night', grade: 'night', cam: { push: 0.06, panX: -0.01 },
    cast: [C('chongzhen', 'serious', 'walk', { prop: 'memorial', x: 0.34, y: 0.3, w: 0.3, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['stars', 'lantern'],
  },

  // ================= 间奏 =================
  s32: { scene: 'hall', grade: 'dusk', cam: { push: 0.09 }, cast: [], special: 'empty', fx: ['smoke', 'motes'] },

  // ================= 主歌 2 重复 =================
  s33: {
    scene: 'hall', grade: 'night', cam: { push: 0.03 },
    cast: [C('jiajing', 'sleepy', 'hold', { prop: 'furnace', x: 0.33, y: 0.3, w: 0.34, enter: 'rise', at: 0.08, act: 'sink' })],
    fx: ['smoke'], zzz: true,
  },
  s34: {
    scene: 'pass', mirror: true, grade: 'dusk', cam: { push: 0.04, panX: 0.012 },
    cast: [C('jiajing', 'smile', 'walk', { x: 0.5, y: 0.3, w: 0.28, enter: 'slideL', at: 0.02, act: 'idle' })],
    fx: ['mist'],
  },
  s35: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.04, shake: 0.004 },
    cast: [C('jiajing', 'cool', 'akimbo', { x: 0.35, y: 0.3, w: 0.31, enter: 'rise', at: 0.05, act: 'shake' })],
    fx: ['scraps'],
  },
  s36: {
    scene: 'hall', grade: 'warm', cam: { push: 0.06 },
    cast: [C('taichang', 'wink', 'show', { prop: 'pills', x: 0.35, y: 0.28, w: 0.3, enter: 'pop', at: 0.08, act: 'idle' })],
    fx: ['pills'], glow: { x: 0.5, y: 0.58, r: 0.2, color: '#ff5a4a', a: 0.2 },
  },
  s37: {
    scene: 'camp', grade: 'warm', cam: { push: 0.05 },
    cast: [C('zhengde', 'shout', 'point', { x: 0.33, y: 0.28, w: 0.34, enter: 'slideR', at: 0.05, act: 'idle' })],
    fx: ['waves', 'wind'],
  },
  s38: {
    scene: 'pass', grade: 'warm', cam: { push: 0.06, panX: -0.015 },
    cast: [C('zhengde', 'happy', 'walk', { x: 0.28, y: 0.28, w: 0.31, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['mist', 'petals'],
  },
  s39: {
    scene: 'garden', grade: 'warm', cam: { push: 0.04 },
    cast: [C('zhengde', 'cool', 'akimbo', { prop: 'leopard', x: 0.33, y: 0.27, w: 0.34, enter: 'rise', at: 0.06, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s40: {
    scene: 'camp', grade: 'warm', cam: { push: 0.06 },
    cast: [C('zhengtong', 'happy', 'cheer', { prop: 'bow', x: 0.32, y: 0.24, w: 0.35, enter: 'pop', at: 0.06, act: 'bounce' })],
    fx: ['wind', 'petals'],
  },

  // ================= 副歌重复 =================
  s41: {
    scene: 'hall', grade: 'warm', cam: { push: 0.07 },
    cast: [C('hongwu', 'serious', 'show', { prop: 'seal', x: 0.34, y: 0.25, w: 0.33, enter: 'rise', at: 0.05, act: 'idle' })],
    fx: ['rays', 'motes'], glow: { x: 0.5, y: 0.5, r: 0.34, color: '#e9b949', a: 0.18 },
  },
  s42: {
    scene: 'hall', grade: 'warm', cam: { push: 0.06 },
    cast: [
      C('yongle', 'happy', 'cheer', { x: 0.2, y: 0.29, w: 0.28, enter: 'rise', at: 0.05, act: 'bounce' }),
      C('hongwu', 'serious', 'show', { prop: 'seal', x: 0.56, y: 0.3, w: 0.26, enter: 'rise', at: 0.2, act: 'bounce' }),
    ],
    fx: ['rays'],
  },
  s43: {
    scene: 'garden', grade: 'warm', cam: { push: 0.05 },
    cast: [C('xuande', 'wink', 'show', { prop: 'cricket', x: 0.35, y: 0.28, w: 0.31, enter: 'pop', at: 0.06, act: 'bounce' })],
    fx: ['petals'],
  },
  s44: {
    scene: 'garden', grade: 'warm', cam: { push: 0.04 },
    cast: [C('xuande', 'happy', 'hold', { prop: 'cricket', x: 0.33, y: 0.28, w: 0.32, enter: 'rise', at: 0.05, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s45: {
    scene: 'pass', grade: 'night', cam: { push: 0.07, panX: -0.02 },
    cast: [C('chongzhen', 'sad', 'walk', { prop: 'memorial', x: 0.3, y: 0.28, w: 0.31, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['mist', 'wind', 'lantern'],
  },
  s46: {
    scene: 'pass', grade: 'dusk', cam: { push: 0.05, panX: 0.015 },
    cast: [C('hongzhi', 'smile', 'walk', { prop: 'memorial', x: 0.35, y: 0.28, w: 0.3, enter: 'slideL', at: 0.02, act: 'idle' })],
    fx: ['mist'],
  },
  s47: {
    scene: 'garden', grade: 'warm', cam: { push: 0.06 },
    cast: [C('chenghua', 'happy', 'show', { prop: 'cup', x: 0.33, y: 0.26, w: 0.34, enter: 'pop', at: 0.06, act: 'bounce' })],
    fx: ['petals', 'ripples'],
  },
  s48: {
    scene: 'hall', grade: 'warm', cam: { push: 0.08 },
    cast: [C('hongwu', 'angry', 'show', { prop: 'seal', x: 0.35, y: 0.26, w: 0.32, enter: 'pop', at: 0.05, act: 'idle' })],
    special: 'stamp',
  },
  s49: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05 },
    cast: [
      C('longqing', 'happy', 'hold', { prop: 'ship', x: 0.18, y: 0.3, w: 0.26, enter: 'rise', at: 0.05, act: 'bounce' }),
      C('zhengde', 'happy', 'cheer', { prop: 'leopard', x: 0.57, y: 0.29, w: 0.27, enter: 'rise', at: 0.18, act: 'bounce' }),
    ],
    fx: ['motes', 'rays'],
  },
  s50: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.04, shake: 0.004 },
    cast: [C('jiajing', 'angry', 'akimbo', { prop: 'furnace', x: 0.35, y: 0.28, w: 0.32, enter: 'rise', at: 0.05, act: 'shake' })],
    fx: ['smoke'], glow: { x: 0.5, y: 0.62, r: 0.24, color: '#ff7a2c', a: 0.3 },
  },
  s51: {
    scene: 'hall', grade: 'warm', cam: { push: 0.05, panX: 0.012 },
    cast: [C('zhengde', 'cool', 'point', { x: 0.33, y: 0.28, w: 0.32, enter: 'slideL', at: 0.03, act: 'idle' })],
    fx: ['motes'],
  },
  s52: {
    scene: 'hall', grade: 'dusk', cam: { push: 0.05 },
    cast: [C('jingtai', 'serious', 'show', { prop: 'vase', x: 0.34, y: 0.28, w: 0.32, enter: 'rise', at: 0.05, act: 'idle', path: [[0, 0], [1.2, -0.07], [2.3, 0.05], [3.1, -0.04], [4.2, 0]] })],
    fx: ['motes', 'rays'],
  },
  s53: {
    scene: 'pass', grade: 'dusk', cam: { push: 0.06, panX: 0.015 },
    cast: [C('longqing', 'happy', 'point', { prop: 'compass', x: 0.34, y: 0.28, w: 0.31, enter: 'slideL', at: 0.03, act: 'bounce' })],
    fx: ['mist', 'lantern'],
  },
  s54: {
    scene: 'night', grade: 'night', cam: { push: 0.08 },
    cast: [C('chongzhen', 'serious', 'walk', { prop: 'memorial', x: 0.34, y: 0.29, w: 0.31, enter: 'slideR', at: 0.02, act: 'idle' })],
    fx: ['stars', 'lantern'], doorGlow: true,
  },

  // ================= 尾奏 =================
  s55: { scene: 'black', cast: [], special: 'table' },
};

// ---------------------------------------------------------------- 变奏规则
// 副歌重复段（s33+）不照抄前段：单人镜头左右站位交替，外景镜像，避免观感重复。
for (const [id, spec] of Object.entries(SHOTS)) {
  const n = Number(id.slice(1));
  if (spec.cast.length > 1) spec.icon = false; // 双人镜头不叠道具图标
  if (n >= 33 && spec.cast.length === 1) {
    const c = spec.cast[0];
    // 单数走左三分之一，双数走右三分之一（原中心构图留给前半段）
    c.x = n % 2 === 1 ? 0.09 : 0.58;
    if (n % 2 === 1 && c.enter === 'slideR') c.enter = 'slideL';
    if (n % 2 === 0 && c.enter === 'slideL') c.enter = 'slideR';
  }
  if (n >= 41 && ['pass', 'garden', 'camp'].includes(spec.scene)) spec.mirror = !spec.mirror;
}

// ---------------------------------------------------------------- 场景
// ---------------------------------------------------------------- 人物
function castTransform(c, lt, W, H) {
  const t = lt - (c.at || 0);
  if (t <= 0) return null;
  const k = clamp01(t / 0.52);
  let ox = 0, oy = 0, sc = 1, rot = 0, alpha = 1;
  const e = back(k);
  if (c.enter === 'pop') { sc = 0.62 + 0.38 * e; oy = (1 - Math.min(1, e)) * H * 0.04; }
  else if (c.enter === 'rise') { oy = (1 - e) * H * 0.17; }
  else if (c.enter === 'drop') { oy = -(1 - e) * H * 0.22; }
  else if (c.enter === 'slideL') { ox = -(1 - easeOut(k)) * W * 0.45; }
  else if (c.enter === 'slideR') { ox = (1 - easeOut(k)) * W * 0.45; }
  alpha = clamp01(t / 0.16);

  // 持续动作
  if (c.act === 'bounce') oy += -Math.abs(Math.sin(t * 7)) * H * 0.016;
  else if (c.act === 'shake') ox += Math.sin(t * 26) * W * 0.006;
  else if (c.act === 'sink') oy += Math.min(1, t / 1.3) * H * 0.055;
  else if (c.act === 'sway') rot += Math.sin(t * 1.5) * 0.016;
  else if (c.act === 'nod') oy += Math.sin(t * 3.1) * H * 0.007;
  else if (c.act === 'idle') sc *= 1 + Math.sin(t * 2.2) * 0.004;

  // 路径关键帧（起起落落）
  if (c.path) {
    for (let i = 1; i < c.path.length; i++) {
      const [t0, y0] = c.path[i - 1];
      const [t1, y1] = c.path[i];
      if (t >= t0 && t <= t1) {
        const p = (t - t0) / Math.max(0.001, t1 - t0);
        oy += lerp(y0, y1, easeOut(p)) * H;
        break;
      }
    }
  }
  return { ox, oy, sc, rot, alpha };
}

// ---------------------------------------------------------------- 特殊演出
function photoBeat(g, W, H, lt, dur, sealImg, sceneImg) {
  // 取景框
  const vf = clamp01((lt - 0.92) / 0.12) * (1 - clamp01((lt - 1.18) / 0.1));
  if (vf > 0) {
    g.save();
    g.globalAlpha = vf;
    g.fillStyle = 'rgba(0,0,0,.32)';
    g.fillRect(0, 0, W, H * 0.055);
    g.fillRect(0, H * 0.945, W, H * 0.055);
    g.fillRect(0, 0, W * 0.04, H);
    g.fillRect(W * 0.96, 0, W * 0.04, H);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3 * (H / 1080);
    const m = W * 0.05, n = H * 0.06, L = H * 0.075;
    [[m, n, 1, 1], [W - m, n, -1, 1], [W - m, H - n, -1, -1], [m, H - n, 1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath();
      g.moveTo(x, y + sy * L);
      g.lineTo(x, y);
      g.lineTo(x + sx * L, y);
      g.stroke();
    });
    // 中心对焦框
    g.strokeStyle = '#9dff6a';
    g.lineWidth = 2 * (H / 1080);
    const cw = W * 0.13;
    g.strokeRect(W * 0.5 - cw / 2, H * 0.42, cw, cw * 0.66);
    g.fillStyle = '#ff3b30';
    g.beginPath();
    g.arc(W * 0.075, H * 0.085, 6 * (H / 1080), 0, 6.283);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `700 ${Math.round(H * 0.024)}px Menlo, Consolas, monospace`;
    g.textAlign = 'left';
    g.fillText('REC', W * 0.09, H * 0.093);
    g.font = `500 ${Math.round(H * 0.021)}px Menlo, Consolas, monospace`;
    g.fillText('1/125  F2.8  ISO 800', W * 0.42, H * 0.925);
    g.restore();
  }
  // 快门白闪
  const fl = lt >= 1.16 ? Math.max(0, 1 - (lt - 1.16) / 0.12) : 0;
  if (fl > 0) {
    g.fillStyle = rgba('#ffffff', fl * 0.95);
    g.fillRect(0, 0, W, H);
  }
  // 拍立得弹出
  const pk = clamp01((lt - 1.22) / 0.5);
  if (pk > 0) {
    const e = back(pk);
    const pw = W * 0.2, ph = pw * 1.18;
    const cx = W * 0.5 - pw / 2 + (1 - e) * W * 0.02;
    const cy = H * 0.24 + (1 - e) * H * 0.24;
    g.save();
    g.translate(cx + pw / 2, cy + ph / 2);
    g.rotate(-0.12 + (1 - e) * 0.2);
    g.globalAlpha = clamp01(pk * 2);
    g.fillStyle = '#fffdf7';
    g.strokeStyle = rgba(P.ink, 0.25);
    g.lineWidth = 2 * (H / 1080);
    g.beginPath();
    g.rect(-pw / 2, -ph / 2, pw, ph);
    g.fill();
    g.stroke();
    // 照片内容：火烧宫殿缩略（直接取场景图中央区域）
    const iw = pw * 0.86, ih = iw * 0.62;
    if (sceneImg) {
      const sw0 = sceneImg.width * 0.52, sh0 = sw0 * 0.62;
      g.drawImage(sceneImg, (sceneImg.width - sw0) / 2, (sceneImg.height - sh0) / 2, sw0, sh0,
        -iw / 2, -ph / 2 + pw * 0.07, iw, ih);
    } else {
      const gr = g.createLinearGradient(0, -ph / 2 + pw * 0.07, 0, -ph / 2 + pw * 0.07 + ih);
      gr.addColorStop(0, '#e3702c');
      gr.addColorStop(1, '#7d2a28');
      g.fillStyle = gr;
      g.fillRect(-iw / 2, -ph / 2 + pw * 0.07, iw, ih);
    }
    // 手写字：清君侧
    g.fillStyle = P.ink;
    g.font = `700 ${Math.round(pw * 0.11)}px KaiTi, "楷体", serif`;
    g.textAlign = 'center';
    g.fillText('清 君 侧', 0, ph / 2 - pw * 0.1);
    g.restore();
  }
}

function stampBeat(g, W, H, lt, sealImg) {
  if (!sealImg || lt < 0.85) return;
  const k = clamp01((lt - 0.85) / 0.5);
  const e = back(k);
  // 盖章瞬间画面轻微一震
  const hit = lt > 1.1 && lt < 1.35 ? Math.sin((lt - 1.1) * 60) * W * 0.004 : 0;
  const sw = W * 0.145;
  g.save();
  g.translate(W * 0.735, H * 0.4);
  g.rotate(-0.1);
  g.globalAlpha = clamp01((lt - 0.85) / 0.1);
  // 冲击环
  if (k < 1) {
    g.strokeStyle = rgba(P.red, 0.5 * (1 - k));
    g.lineWidth = 6 * (H / 1080);
    g.beginPath();
    g.arc(0, 0, sw * (0.5 + k * 0.9), 0, 6.283);
    g.stroke();
  }
  const s = 1.8 - 0.8 * e;
  g.scale(s, s);
  g.drawImage(sealImg, -sw / 2 + hit, -sw / 2, sw, sw);
  g.restore();
}

function titleBeat(g, W, H, lt, dur, sealImg) {
  const a = clamp01((lt - 0.4) / 0.7) * (1 - clamp01((lt - 5.6) / 0.8));
  if (a <= 0) return;
  const bx = W * 0.3, bw = W * 0.2, by = H * 0.1, bh = H * 0.8;
  g.save();
  g.globalAlpha = a;
  g.shadowColor = 'rgba(0,0,0,.28)';
  g.shadowBlur = 26 * (H / 1080);
  g.shadowOffsetY = 7 * (H / 1080);
  g.fillStyle = P.paper;
  g.fillRect(bx - bw / 2, by, bw, bh);
  g.shadowColor = 'transparent';
  g.fillStyle = P.navy;
  g.fillRect(bx - bw * 0.56, by - H * 0.018, bw * 1.12, H * 0.016);
  g.fillRect(bx - bw * 0.56, by + bh + H * 0.002, bw * 1.12, H * 0.016);
  g.textAlign = 'center';
  g.fillStyle = P.ink;
  g.font = `800 ${Math.round(H * 0.12)}px KaiTi, "楷体", serif`;
  const chars = '人生态度';
  for (let i = 0; i < chars.length; i++) {
    const y = by + H * 0.205 + H * 0.148 * i;
    const dy = (1 - clamp01((lt - 0.4 - i * 0.1) / 0.5)) * H * 0.03;
    g.fillText(chars[i], bx, y + dy);
  }
  g.font = `500 ${Math.round(H * 0.03)}px KaiTi, "楷体", serif`;
  g.fillStyle = rgba(P.ink, 0.62);
  g.fillText('王 七 七', bx, by + bh - H * 0.045);
  if (sealImg) {
    const sk = clamp01((lt - 2.2) / 0.4);
    if (sk > 0) {
      const sw = W * 0.062;
      g.globalAlpha = a * sk;
      g.save();
      g.translate(bx + bw * 0.3, by + bh * 0.8);
      g.rotate(-0.08);
      g.scale(1.5 - 0.5 * sk, 1.5 - 0.5 * sk);
      g.drawImage(sealImg, -sw / 2, -sw / 2, sw, sw);
      g.restore();
    }
  }
  g.restore();
}

function tableBeat(g, W, H, lt, sealImg, rows) {
  if (!rows || !rows.length) return;
  const ca = clamp01((lt - 0.15) / 0.6) * (1 - clamp01((lt - 9.9) / 0.9));
  if (ca <= 0) return;
  const cw = W * 0.62, ch = H * 0.78;
  const cx = (W - cw) / 2, cy = H * 0.11;
  g.save();
  g.globalAlpha = ca;
  g.shadowColor = 'rgba(0,0,0,.5)';
  g.shadowBlur = 30 * (H / 1080);
  g.fillStyle = P.paper;
  g.fillRect(cx, cy, cw, ch);
  g.shadowColor = 'transparent';
  g.fillStyle = P.navy;
  g.fillRect(cx, cy, cw, H * 0.014);
  g.fillStyle = P.red;
  g.fillRect(cx + cw * 0.08, cy + H * 0.028, cw * 0.06, H * 0.006);

  g.textAlign = 'center';
  g.fillStyle = P.ink;
  g.font = `800 ${Math.round(H * 0.044)}px KaiTi, "楷体", serif`;
  g.fillText('明代皇帝 × 人生态度', cx + cw / 2, cy + H * 0.085);
  g.font = `400 ${Math.round(H * 0.019)}px KaiTi, "楷体", serif`;
  g.fillStyle = rgba(P.ink, 0.45);
  g.fillText('八个皇帝，八句歌词，一种态度', cx + cw / 2, cy + H * 0.122);

  const fs2 = Math.round(H * 0.032);
  const lh = H * 0.070;
  const y0 = cy + H * 0.19;
  const lx = cx + cw * 0.12;
  const dx = cx + cw * 0.40;
  rows.forEach((row, i) => {
    const ap = clamp01((lt - 0.9 - i * 0.42) / 0.4);
    if (ap <= 0) return;
    const y = y0 + lh * i;
    g.globalAlpha = ca * ap;
    g.textAlign = 'left';
    g.fillStyle = P.ink;
    g.font = `700 ${fs2}px KaiTi, "楷体", serif`;
    g.fillText(row.reign, lx, y);
    g.font = `400 ${Math.round(fs2 * 0.86)}px KaiTi, "楷体", serif`;
    g.fillStyle = rgba(P.ink, 0.55);
    g.fillText(row.name, lx + cw * 0.105, y);
    g.strokeStyle = rgba(P.ink, 0.22);
    g.lineWidth = 1.6 * (H / 1080);
    g.beginPath();
    g.moveTo(dx, y - lh * 0.34);
    g.lineTo(dx, y + lh * 0.06);
    g.stroke();
    g.fillStyle = rgba(P.ink, 0.82);
    g.font = `400 ${Math.round(fs2 * 0.94)}px KaiTi, "楷体", serif`;
    g.fillText(row.line, dx + cw * 0.03, y);
  });

  g.globalAlpha = ca * clamp01((lt - 5.2) / 0.6);
  g.textAlign = 'center';
  g.font = `400 ${Math.round(H * 0.019)}px KaiTi, "楷体", serif`;
  g.fillStyle = rgba(P.ink, 0.4);
  g.fillText('趣味注解 · 非史实考据', cx + cw / 2, cy + ch - H * 0.035);
  if (sealImg) {
    const sw = W * 0.055;
    g.globalAlpha = ca * clamp01((lt - 5.0) / 0.4);
    g.save();
    g.translate(cx + cw * 0.88, cy + ch * 0.86);
    g.rotate(-0.1);
    g.drawImage(sealImg, -sw / 2, -sw / 2, sw, sw);
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- 主绘制
// ctx: 画布；e: {W,H,t,localT,prog}；spec: SHOTS[id]
export function drawShot(g, e, spec, id, A) {
  const { W, H, t, localT } = e;
  if (!spec) return false;

  // 底色
  g.fillStyle = spec.scene === 'black' ? '#0d1119' : P.paper;
  g.fillRect(0, 0, W, H);

  // 场景
  if (spec.scene !== 'black') {
    const img = A.scene(spec.scene);
    if (img) {
      g.save();
      if (spec.mirror) {
        g.translate(W, 0);
        g.scale(-1, 1);
      }
      g.drawImage(img, 0, 0, W, H);
      g.restore();
    }
  }

  // 颜色分级
  if (spec.grade) {
    const map = {
      dusk: 'rgba(20,34,60,.26)', night: 'rgba(10,22,44,.34)',
      fire: 'rgba(200,70,25,.10)', warm: 'rgba(233,185,73,.06)',
    };
    if (map[spec.grade]) {
      g.fillStyle = map[spec.grade];
      g.fillRect(0, 0, W, H);
    }
  }

  // 环境动效
  const fx = spec.fx || [];
  if (fx.includes('stars')) stars(g, W, H, t, 34);
  if (fx.includes('smoke') && spec.cast[0]) {
    const c0 = spec.cast[0];
    smoke(g, W, H, t, W * (c0.x + c0.w * 0.52), H * (c0.y + c0.w * 0.78), 3, '#ffffff', 0.1);
  }
  if (fx.includes('motes')) motes(g, W, H, t, 30, 0.3);
  if (fx.includes('petals')) petals(g, W, H, t, 14);
  if (fx.includes('ripples')) ripples(g, W, H, t, 0.62);
  if (fx.includes('wind')) {
    let amt = 0.5;
    if (spec.gust) {
      amt = spec.gust[0][1];
      for (let i = 1; i < spec.gust.length; i++) {
        const [t0, a0] = spec.gust[i - 1];
        const [t1, a1] = spec.gust[i];
        if (localT >= t0 && localT <= t1) {
          const p = (localT - t0) / Math.max(0.001, t1 - t0);
          amt = lerp(a0, a1, p);
          break;
        }
      }
    }
    wind(g, W, H, t, amt, 8);
  }
  if (fx.includes('mist')) {
    g.fillStyle = 'rgba(246,239,224,.16)';
    for (let i = 0; i < 3; i++) {
      const y = H * (0.52 + i * 0.1) + Math.sin(t * 0.5 + i) * H * 0.012;
      g.beginPath();
      g.ellipse(W * (0.2 + i * 0.3) + Math.sin(t * 0.3 + i) * W * 0.04, y, W * 0.3, H * 0.03, 0, 0, 6.283);
      g.fill();
    }
  }
  if (fx.includes('scraps')) scraps(g, W, H, t, 11);
  if (fx.includes('cracks')) cracks(g, W, H, clamp01(localT / 1.6));
  if (fx.includes('embers')) embers(g, W, H, t, 28, 0.82);
  if (fx.includes('pills') && spec.cast[0]) {
    const c = spec.cast[0];
    pills(g, W, H, t, W * (c.x + c.w * 0.5), H * (c.y + c.w * 0.55));
  }
  if (fx.includes('waves') && spec.cast[0]) {
    const c = spec.cast[0];
    waves(g, W, H, t, W * (c.x + c.w * 0.62), H * (c.y + c.w * 0.42));
  }
  if (fx.includes('rays')) {
    const c = spec.cast[0];
    rays(g, W, H, c ? W * (c.x + c.w * 0.5) : W * 0.5, c ? H * (c.y + c.w * 0.5) : H * 0.5, t, P.gold, 0.07, 12);
  }
  if (fx.includes('lantern')) {
    for (const x of [0.22, 0.78]) {
      const gl = g.createRadialGradient(W * x, H * 0.62, 0, W * x, H * 0.62, W * 0.1);
      gl.addColorStop(0, `rgba(255,179,71,${0.3 + 0.12 * Math.sin(t * 2 + x * 9)})`);
      gl.addColorStop(1, 'rgba(255,179,71,0)');
      g.fillStyle = gl;
      g.fillRect(W * x - W * 0.1, H * 0.52, W * 0.2, H * 0.22);
    }
  }
  if (spec.glow) {
    const gl = g.createRadialGradient(W * spec.glow.x, H * spec.glow.y, 0, W * spec.glow.x, H * spec.glow.y, W * spec.glow.r);
    gl.addColorStop(0, rgba(spec.glow.color, spec.glow.a * (0.85 + 0.15 * Math.sin(t * 3))));
    gl.addColorStop(1, rgba(spec.glow.color, 0));
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
  }

  // 人物
  for (const c of spec.cast) {
    const tf = castTransform(c, localT, W, H);
    if (!tf) continue;
    const img = A.emp(c);
    if (!img) continue;
    const w = W * c.w * tf.sc;
    const h = w * 1.2;
    const x = W * c.x + tf.ox + (W * c.w - w) / 2;
    const y = H * c.y + tf.oy + (H * c.w * 1.2 - h) / 2;

    // 柔光托底：把人物从同类色场景里“拔”出来
    const gb = g.createRadialGradient(x + w / 2, y + h * 0.52, 0, x + w / 2, y + h * 0.52, w * 0.85);
    gb.addColorStop(0, 'rgba(16,22,38,.26)');
    gb.addColorStop(0.7, 'rgba(16,22,38,.10)');
    gb.addColorStop(1, 'rgba(16,22,38,0)');
    g.save();
    g.globalAlpha = tf.alpha;
    g.fillStyle = gb;
    g.fillRect(x - w * 0.7, y - h * 0.15, w * 2.4, h * 1.5);
    g.restore();

    g.save();
    g.globalAlpha = tf.alpha;
    if (c.flip) {
      g.translate(x + w / 2, y + h / 2);
      g.scale(-1, 1);
      g.rotate(tf.rot);
      g.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      g.translate(x + w / 2, y + h / 2);
      g.rotate(tf.rot);
      g.drawImage(img, -w / 2, -h / 2, w, h);
    }
    g.restore();
    // 睡觉气泡
    if (spec.zzz) {
      const zt = (localT * 0.9) % 1;
      g.save();
      g.globalAlpha = tf.alpha * (1 - zt) * 0.9;
      g.fillStyle = P.navy;
      g.font = `800 ${Math.round(H * (0.024 + zt * 0.012))}px KaiTi, "楷体", serif`;
      g.textAlign = 'center';
      g.fillText('Z', x + w * 0.82 + Math.sin(zt * 5) * W * 0.008, y + h * 0.16 - zt * H * 0.07);
      g.fillText('z', x + w * 0.9 + Math.sin(zt * 5 + 1) * W * 0.008, y + h * 0.24 - zt * H * 0.06);
      g.restore();
    }
  }

  // 关键道具图标：浮在人物另一侧，让“拿的是什么”读得清
  const iconProp =
    spec.icon && spec.icon.prop ? spec.icon.prop
      : spec.icon === false || !spec.cast[0] || !spec.cast[0].prop ? null : spec.cast[0].prop;
  if (iconProp) {
    const img = A.prop && A.prop(iconProp);
    if (img) {
      const c0 = spec.cast[0] || { x: 0.5, w: 0.2 };
      const rightSide = c0.x + c0.w / 2 < 0.5;
      const ic = spec.icon || {};
      const iw = W * (ic.w || 0.135);
      const ix = ic.x != null ? ic.x : rightSide ? 0.76 : 0.1;
      const iy = ic.y != null ? ic.y : 0.3;
      const bob = Math.sin(t * 1.9) * H * 0.012;
      g.save();
      g.translate(W * ix + iw / 2, H * iy + iw / 2 + bob);
      g.fillStyle = 'rgba(246,239,224,.6)';
      g.strokeStyle = 'rgba(42,31,31,.16)';
      g.lineWidth = 2 * (H / 1080);
      g.beginPath();
      g.arc(0, 0, iw * 0.54, 0, 6.283);
      g.fill();
      g.stroke();
      g.rotate(Math.sin(t * 0.9) * 0.05);
      g.drawImage(img, -iw / 2, -iw / 2, iw, iw);
      g.restore();
      // 名称
      const nm = (A.propName && A.propName(iconProp)) || '';
      if (nm) {
        g.save();
        g.globalAlpha = 0.85;
        g.textAlign = 'center';
        g.fillStyle = P.paper;
        g.font = `600 ${Math.round(H * 0.021)}px KaiTi, "楷体", serif`;
        g.fillText(nm, W * ix + iw / 2, H * iy + iw + H * 0.035 + bob);
        g.restore();
      }
    }
  }

  // 特殊演出
  if (spec.special === 'photo') photoBeat(g, W, H, localT, e.dur || 2.16, A.seal('永乐'), A.scene('fire'));
  if (spec.special === 'stamp') stampBeat(g, W, H, localT, A.seal('态度'));
  if (spec.special === 'title') titleBeat(g, W, H, localT, e.dur || 10, A.seal('态度'));
  if (spec.special === 'empty') paperFall(g, W, H, localT, 5.2);
  if (spec.special === 'table') tableBeat(g, W, H, localT, A.seal('态度'), A.rows ? A.rows() : null);

  // 结尾开门暖光（s54）
  if (spec.doorGlow) {
    const k = clamp01((localT - 2.2) / 1.8);
    if (k > 0) {
      const r = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * (0.1 + k * 0.5));
      r.addColorStop(0, `rgba(255,214,140,${0.55 * k})`);
      r.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, W, H);
    }
  }
  return true;
}
