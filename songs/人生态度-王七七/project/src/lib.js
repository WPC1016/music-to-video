// 纯代码像素绘制原语。零外部素材。
// 关键：所有图形都落在整数像素上；圆用逐行 fillRect，线用 Bresenham，多边形用扫描线。
// 画布是低分辨率（360x640），最后由 main.js 整数倍放大到 1080x1920。

export const C = {
  paper: '#E8E0CC', // 报纸黄（亮）
  ink: '#14110F', // 墨黑
  red: '#B33A2B', // 朱红
  light: '#F5F0E4', // 高光
  dark: '#0A0908', // 暗部
  gray: '#6B6459', // 中间调
  soil: '#8C7A5E', // 土黄（瓦楞/旧纸）
  ash: '#2A2622', // 炭灰
};

export const PALETTE = [C.paper, C.ink, C.red, C.light, C.gray, C.soil, C.dark, C.ash];

// ---------- 确定性随机 ----------
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const lerp = (a, b, t) => a + (b - a) * t;
const ensure = (a, b, t) => (b > a ? lerp(a, b, t) : lerp(a, b, t));
export { lerp, ensure };

export const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeIn = (t) => Math.pow(Math.min(1, Math.max(0, t)), 2);
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const snap = (v) => Math.round(v);

// ---------- 像素原语 ----------
export function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

// 像素圆：逐行填满，边缘是台阶
export function pxCircle(g, cx, cy, r, color) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.max(1, Math.round(r));
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    g.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}

// 像素环
export function pxRing(g, cx, cy, r, thick, color) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.max(1, Math.round(r));
  thick = Math.max(1, Math.round(thick));
  g.fillStyle = color;
  const outer = r + thick / 2;
  const inner = r - thick / 2;
  for (let dy = -Math.ceil(outer); dy <= Math.ceil(outer); dy++) {
    const ox = Math.sqrt(Math.max(0, outer * outer - dy * dy));
    const ix = Math.sqrt(Math.max(0, inner * inner - dy * dy));
    if (dy > -inner && dy < inner) {
      // 上下两段
      g.fillRect(cx - Math.round(ox), cy + dy, Math.round(ox) - Math.round(inner), 1);
      g.fillRect(cx + Math.round(inner), cy + dy, Math.round(ox) - Math.round(inner), 1);
    } else {
      g.fillRect(cx - Math.round(ox), cy + dy, Math.round(ox) * 2 + 1, 1);
    }
  }
}

// Bresenham 线 + 方形笔刷
export function pxLine(g, x1, y1, x2, y2, w, color) {
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  x2 = Math.round(x2);
  y2 = Math.round(y2);
  w = Math.max(1, Math.round(w));
  g.fillStyle = color;
  const off = Math.floor(w / 2);
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;
  let guard = 0;
  while (guard++ < 5000) {
    g.fillRect(x - off, y - off, w, w);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// 扫描线多边形（不抗锯齿）
export function pxPoly(g, pts, color) {
  g.fillStyle = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + (b[0] - a[0]) * t);
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.round(xs[i]);
      const x1 = Math.round(xs[i + 1]);
      if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1);
    }
  }
}

// ---------- 纸张纹理（低分辨率生成一次） ----------
export function makePaper(w, h, seed) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const rnd = mulberry32(seed);

  g.fillStyle = C.paper;
  g.fillRect(0, 0, w, h);

  // 纸面脏点：像素级，2px 一组
  for (let i = 0; i < Math.round((w * h) / 260); i++) {
    const x = Math.round(rnd() * w);
    const y = Math.round(rnd() * h);
    g.fillStyle = rnd() > 0.7 ? rgba(C.soil, 0.35) : rgba(C.ink, 0.12);
    g.fillRect(x, y, 2, 2);
  }

  // 横向纤维：1px 短线
  for (let i = 0; i < Math.round((w * h) / 1100); i++) {
    const x = Math.round(rnd() * w);
    const y = Math.round(rnd() * h);
    const len = 2 + Math.round(rnd() * 6);
    g.fillStyle = rgba(C.soil, 0.22);
    g.fillRect(x, y, len, 1);
  }

  return cv;
}

// ---------- 毛边矩形 ----------
export function paperRect(g, x, y, w, h, seed, fill, jitter = 1) {
  const rnd = mulberry32(seed);
  const X = Math.round(x);
  const Y = Math.round(y);
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));

  // 硬阴影（像素风：偏移 2px + 纯色）
  g.fillStyle = rgba(C.dark, 0.45);
  g.fillRect(X + 2, Y + 2, W, H);

  g.fillStyle = fill;
  g.fillRect(X, Y, W, H);

  // 边缘啃缺：随机去掉几个像素，做出撕纸感
  if (jitter > 0) {
    for (let i = 0; i < Math.round((W + H) / 6); i++) {
      const side = Math.floor(rnd() * 4);
      const px_ = side < 2 ? X + Math.round(rnd() * W) : side === 2 ? X : X + W - 1;
      const py_ = side < 2 ? (side === 0 ? Y : Y + H - 1) : Y + Math.round(rnd() * H);
      g.fillStyle = rgba(C.ink, 0.55);
      g.fillRect(px_, py_, 1, 1);
    }
  }
}

// ---------- 纸片人 ----------
// pose: stand | walk | shoot | reach | lie
export function figure(g, { x, y, s, pose = 'stand', t = 0, color = C.ink, breathe = true }) {
  const bob = breathe ? Math.round(Math.sin(t * 1.6) * s * 0.012) : 0;
  const headR = Math.max(2, Math.round(s * 0.1));
  const footY = Math.round(y);
  const hipY = footY - Math.round(s * 0.42) + bob;
  const shoulderY = footY - Math.round(s * 0.78) + bob;
  const lw = Math.max(2, Math.round(s * 0.05));

  const X = Math.round(x);

  if (pose === 'lie') {
    const bw = Math.round(s * 0.6);
    const bh = Math.max(4, Math.round(s * 0.2));
    const cy = footY - bh;
    px(g, X - bw / 2, cy, bw, bh, color);
    pxCircle(g, X - bw / 2 - headR, cy + bh / 2, headR, color);
    pxLine(g, X + bw / 2, cy + bh * 0.3, X + bw / 2 + s * 0.28, cy + bh * 0.2, lw, color);
    pxLine(g, X + bw / 2, cy + bh * 0.7, X + bw / 2 + s * 0.28, cy + bh * 0.8, lw, color);
    return;
  }

  const topW = Math.round(s * 0.2);
  const botW = Math.round(s * 0.26);

  // 躯干：梯形（扫描线，硬边）
  pxPoly(
    g,
    [
      [X - topW / 2, shoulderY],
      [X + topW / 2, shoulderY],
      [X + botW / 2, hipY],
      [X - botW / 2, hipY],
    ],
    color,
  );

  // 头
  pxCircle(g, X, shoulderY - headR, headR, color);

  // 腿
  if (pose === 'walk') {
    pxLine(g, X - s * 0.05, hipY, X - s * 0.13, footY, lw, color);
    pxLine(g, X + s * 0.05, hipY, X + s * 0.15, footY, lw, color);
  } else {
    pxLine(g, X - s * 0.055, hipY, X - s * 0.055, footY, lw, color);
    pxLine(g, X + s * 0.055, hipY, X + s * 0.055, footY, lw, color);
  }

  // 手臂
  const ay = shoulderY + s * 0.06;
  if (pose === 'shoot') {
    pxLine(g, X - s * 0.1, ay, X - s * 0.04, ay - s * 0.09, lw, color);
    pxLine(g, X + s * 0.1, ay, X + s * 0.04, ay - s * 0.09, lw, color);
  } else if (pose === 'reach') {
    pxLine(g, X - s * 0.1, ay, X - s * 0.2, ay - s * 0.06, lw, color);
    pxLine(g, X + s * 0.1, ay, X + s * 0.2, ay - s * 0.06, lw, color);
  } else {
    pxLine(g, X - s * 0.1, ay, X - s * 0.14, hipY - s * 0.02, lw, color);
    pxLine(g, X + s * 0.1, ay, X + s * 0.14, hipY - s * 0.02, lw, color);
  }

  // 眼睛：纸色 1px
  const ey = shoulderY - headR - Math.round(headR * 0.15);
  px(g, X - Math.round(headR * 0.4), ey, 1, 1, C.paper);
  px(g, X + Math.round(headR * 0.4), ey, 1, 1, C.paper);
}

// ---------- 像素火焰：中间高两边低的锯齿 ----------
export function flame(g, x, y, w, h, t, seed, color = C.red) {
  const rnd = mulberry32(seed);
  const X = Math.round(x);
  const Y = Math.round(y);
  const Wd = Math.max(2, Math.round(w));
  const cx = Wd / 2;
  for (let i = 0; i < Wd; i++) {
    // 火苗轮廓：中间 1，两边趋近 0
    const shape = Math.max(0, 1 - Math.pow(Math.abs(i - cx) / cx, 1.5));
    const flick = 0.62 + 0.38 * Math.sin(t * 7 + i * 0.45 + (seed % 7));
    const r = rnd() * 0.4 + 0.6;
    const hh = Math.round(h * shape * r * flick);
    if (hh <= 0) continue;
    g.fillStyle = color;
    g.fillRect(X + i, Y - hh, 1, hh + 1);
  }
}

// ---------- 像素液面：逐列 ----------
export function liquid(g, w, h, level, t, color = C.red) {
  if (level <= 0) return;
  const baseY = Math.round(h * (1 - level));
  const rnd = mulberry32(77);
  for (let x = 0; x < w; x++) {
    const wob = Math.round(Math.sin(x * 0.09 + t * 1.6) * 2 + Math.sin(x * 0.21 - t * 1.1) * 1);
    const y = baseY + wob;
    g.fillStyle = color;
    g.fillRect(x, y, 1, h - y);
  }
  // 液面毛刺
  for (let i = 0; i < Math.round(w / 8); i++) {
    const x = Math.round(rnd() * w);
    const wob = Math.round(Math.sin(x * 0.09 + t * 1.6) * 2 + Math.sin(x * 0.21 - t * 1.1) * 1);
    g.fillStyle = color;
    g.fillRect(x, baseY + wob - 2, 1, 2);
  }
}

// ---------- 文字 ----------
// 低分辨率下用系统字体，放大后自带锯齿
export function text(g, str, x, y, size, color = C.ink, align = 'center', weight = 700) {
  g.save();
  g.fillStyle = color;
  g.font = `${weight} ${Math.round(size)}px "Microsoft YaHei","SimHei",sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  // 整数坐标，避免亚像素模糊
  g.fillText(str, Math.round(x), Math.round(y));
  g.restore();
}

export function wrap(g, str, maxW, size) {
  g.save();
  g.font = `700 ${Math.round(size)}px "Microsoft YaHei","SimHei",sans-serif`;
  const out = [];
  let cur = '';
  for (const ch of str) {
    if (g.measureText(cur + ch).width > maxW && cur) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  g.restore();
  return out;
}

// ---------- 关键帧插值：把动作变成数据 ----------
// frames = [{ t: 0, v: { x: 0.2, y: 0.7, pose: 'stand' } }, { t: 1.2, v: {...} }]
// 数值型属性线性/缓动插值；字符串型（如 pose）过半后切换。
export function key(t, frames, easeFn) {
  if (!frames || !frames.length) return {};
  if (t <= frames[0].t) return frames[0].v;
  const last = frames[frames.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i].t) {
      const a = frames[i - 1];
      const b = frames[i];
      const raw = clamp01((t - a.t) / Math.max(0.0001, b.t - a.t));
      const e = (b.ease || easeFn || easeOut)(raw);
      const out = {};
      for (const k of Object.keys(b.v)) {
        const av = a.v[k];
        const bv = b.v[k];
        if (typeof bv === 'number' && typeof av === 'number') out[k] = av + (bv - av) * e;
        else out[k] = raw < 0.5 ? av : bv;
      }
      return out;
    }
  }
  return last.v;
}

// 单值缓动（用于透明度、缩放等）
export function ramp(t, from, to, start, end, easeFn) {
  if (t <= start) return from;
  if (t >= end) return to;
  const k = (easeFn || easeOut)(clamp01((t - start) / Math.max(0.0001, end - start)));
  return from + (to - from) * k;
}

// ---------- 抖动 / 挤压拉伸 ----------
export function squash(t, hz = 3, amp = 0.06) {
  return 1 + Math.sin(t * Math.PI * 2 * hz) * amp;
}
export function shake(t, amp = 4) {
  return { x: Math.sin(t * 47) * amp, y: Math.cos(t * 53) * amp };
}

// ---------- 抖动：在纯色块上打散点做过渡 ----------
export function dither(g, x, y, w, h, seed, color, density = 0.25) {
  const rnd = mulberry32(seed);
  g.fillStyle = color;
  for (let py = 0; py < h; py += 2) {
    for (let pxx = 0; pxx < w; pxx += 2) {
      if (rnd() < density) g.fillRect(x + pxx, y + py, 1, 1);
    }
  }
}

// ============================================================
// 矢量插画原语：平滑曲线 + 深色描边 + 平涂 + 柔和阴影
// 参考 pelican-test 的画法：圆头圆角、贝塞尔、描边 3-5px @1200 宽
// ============================================================

export const V = {
  ink: '#1A1A1A', // 描边（近黑，不用纯黑）
  paper: '#F2F0EC', // 冷白（纸张、屏幕、灯）
  bg: '#C8C4BC', // 水泥墙
  bgDark: '#A8A49C', // 地面
  wall: '#D6D2CA', // 亮一点的墙
  floor: '#8C877E', // 地板 / 人行道
  red: '#B0311F', // 朱红（火、钱、液面）
  redLight: '#C9543C', // 火的亮部
  gray: '#7A7A78', // 中间调
  blue: '#6B7B8C', // 玻璃、夜景、金属
  yellow: '#E8B04B', // 路灯、灯泡、霓虹
  wood: '#B09070', // 木色（桌子、门）
  soil: '#B09070', // 兼容旧名
  dark: '#141414', // 深背景
  shadow: 'rgba(26,26,26,0.14)', // 柔和阴影
};

// 一个带描边的形状：pts 支持 [x,y] 或 [c1x,c1y,c2x,c2y,x,y] 的贝塞尔点
export function vShape(g, pts, opt = {}) {
  const { fill = null, stroke = V.ink, w = 4, close = true } = opt;
  if (!pts || !pts.length) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 6) g.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    else g.lineTo(p[0], p[1]);
  }
  if (close) g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = w;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
}

// 平滑闭合曲线：把一堆散点连成有机形状（云、石头、火）
export function vSmooth(g, pts, opt = {}) {
  const { fill = null, stroke = V.ink, w = 4 } = opt;
  const n = pts.length;
  if (n < 3) return;
  g.beginPath();
  const sx = (pts[n - 1][0] + pts[0][0]) / 2;
  const sy = (pts[n - 1][1] + pts[0][1]) / 2;
  g.moveTo(sx, sy);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const nx = pts[(i + 1) % n];
    g.quadraticCurveTo(p[0], p[1], (p[0] + nx[0]) / 2, (p[1] + nx[1]) / 2);
  }
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = w;
    g.lineJoin = 'round';
    g.stroke();
  }
}

// 圆角矩形
export function vRoundRect(g, x, y, w, h, r, opt = {}) {
  const { fill = null, stroke = V.ink, lw = 4 } = opt;
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.stroke();
  }
}

// 有机块：随机凹凸的圆，用来画石头、云、火苗
export function vBlob(g, cx, cy, rx, ry, seed, opt = {}) {
  const rnd = mulberry32(seed);
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const k = 0.82 + rnd() * 0.34;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  vSmooth(g, pts, opt);
}

// 火焰：多个尖顶火舌，不是圆块
export function vFlame(g, cx, by, w, h, seed, opt = {}) {
  const rnd = mulberry32(seed);
  const n = 5;
  const pts = [[cx - w / 2, by]];
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + (w * (i + 0.5)) / n;
    const k = 1 - Math.abs(i - (n - 1) / 2) / n;
    const hh = h * (0.45 + rnd() * 0.55) * k;
    pts.push([x, by - hh]);
    if (i < n - 1) pts.push([cx - w / 2 + (w * (i + 1)) / n, by - hh * 0.32]);
  }
  pts.push([cx + w / 2, by]);
  vShape(g, pts, opt);
}

// 卡通小人：圆头、圆角身子、圆头四肢，带描边
// pose: stand | walk | shoot | reach | lie
export function vFigure(g, { x, y, s, pose = 'stand', t = 0, body = V.paper, ink = V.ink, lw = 5 }) {
  const bob = Math.sin(t * 1.6) * s * 0.008;
  const headR = s * 0.115;
  const footY = y;
  const hipY = y - s * 0.42 + bob;
  const shoulderY = y - s * 0.78 + bob;
  const limbW = s * 0.07;

  if (pose === 'lie') {
    const bw = s * 0.62;
    const bh = s * 0.2;
    const cy = footY - bh;
    vRoundRect(g, x - bw / 2, cy, bw, bh, bh * 0.45, { fill: body, stroke: ink, lw });
    g.beginPath();
    g.arc(x - bw / 2 - headR * 0.8, cy + bh / 2, headR, 0, Math.PI * 2);
    g.fillStyle = body;
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = lw;
    g.stroke();
    // 两条腿
    g.beginPath();
    g.moveTo(x + bw / 2, cy + bh * 0.32);
    g.lineTo(x + bw / 2 + s * 0.3, cy + bh * 0.24);
    g.moveTo(x + bw / 2, cy + bh * 0.68);
    g.lineTo(x + bw / 2 + s * 0.3, cy + bh * 0.76);
    g.strokeStyle = ink;
    g.lineWidth = limbW;
    g.lineCap = 'round';
    g.stroke();
    return;
  }

  // 身子：上窄下宽的圆角梯形
  const topW = s * 0.22;
  const botW = s * 0.3;
  vShape(g, [
    [x - topW / 2, shoulderY],
    [x + topW / 2, shoulderY],
    [x + botW / 2, hipY],
    [x - botW / 2, hipY],
  ], { fill: body, stroke: ink, w: lw });

  // 头
  g.beginPath();
  g.arc(x, shoulderY - headR, headR, 0, Math.PI * 2);
  g.fillStyle = body;
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = lw;
  g.stroke();

  // 四肢：先描粗黑边，再填纸色，形成矢量描边效果
  const limbPath = () => {
    g.beginPath();
    if (pose === 'walk') {
    g.moveTo(x - s * 0.05, hipY);
    g.lineTo(x - s * 0.14, footY);
    g.moveTo(x + s * 0.05, hipY);
    g.lineTo(x + s * 0.15, footY);
  } else {
    g.moveTo(x - s * 0.06, hipY);
    g.lineTo(x - s * 0.06, footY);
    g.moveTo(x + s * 0.06, hipY);
    g.lineTo(x + s * 0.06, footY);
  }
    const ay = shoulderY + s * 0.08;
    if (pose === 'shoot') {
      g.moveTo(x + s * 0.11, ay);
      g.lineTo(x + s * 0.2, ay + s * 0.075);
      g.lineTo(x + s * 0.25, ay - s * 0.03);
      g.moveTo(x - s * 0.11, ay);
      g.lineTo(x - s * 0.03, ay + s * 0.105);
      g.lineTo(x + s * 0.16, ay + s * 0.065);
    } else if (pose === 'reach') {
      g.moveTo(x - s * 0.11, ay);
      g.lineTo(x - s * 0.22, ay - s * 0.08);
      g.moveTo(x + s * 0.11, ay);
      g.lineTo(x + s * 0.22, ay - s * 0.08);
    } else {
      g.moveTo(x - s * 0.11, ay);
      g.lineTo(x - s * 0.15, hipY - s * 0.02);
      g.moveTo(x + s * 0.11, ay);
      g.lineTo(x + s * 0.15, hipY - s * 0.02);
    }
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = ink;
  g.lineWidth = limbW + 7;
  limbPath();
  g.stroke();
  g.strokeStyle = body;
  g.lineWidth = limbW;
  limbPath();
  g.stroke();

  // 脚
  g.fillStyle = ink;
  g.beginPath();
  g.arc(x - s * 0.06, footY, s * 0.038, 0, Math.PI * 2);
  g.arc(x + s * 0.06, footY, s * 0.038, 0, Math.PI * 2);
  g.fill();

  // 眼睛：两个实心小圆
  g.fillStyle = ink;
  const ey = shoulderY - headR * 1.05;
  g.beginPath();
  g.arc(x - headR * 0.36, ey, headR * 0.13, 0, Math.PI * 2);
  g.arc(x + headR * 0.36, ey, headR * 0.13, 0, Math.PI * 2);
  g.fill();
}

