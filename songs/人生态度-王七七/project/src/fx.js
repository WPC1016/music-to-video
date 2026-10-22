// 环境动效层：叠在烘焙场景之上，让静态 SVG 场景动起来。
// 所有粒子用固定种子 + 时间推进，保证任意帧可重放（渲染可并行、可断点续）。
import { mulberry32, rgba, clamp01, easeOut } from './lib.js';

// 素材库统一配色（与 source/明朝皇帝角色与服饰素材库.html 一致）
export const P = {
  paper: '#f6efe0',
  paper2: '#f3dcae',
  gold: '#e9b949',
  red: '#c8322b',
  blue: '#1b8fc9',
  navy: '#16304f',
  ink: '#2a1f1f',
};

// 上升火星
export function embers(g, W, H, t, n = 30, base = 0.8, color = '#ffb347') {
  const r = mulberry32(1201);
  for (let i = 0; i < n; i++) {
    const sx = r(), sy = r(), sp = 0.55 + r() * 0.9, ph = r() * 6.283;
    const k = (t * sp * 0.22 + sy) % 1;
    const y = H * (base - k * 0.62);
    const x = W * sx + Math.sin(t * 1.5 + ph) * W * 0.014;
    const a = (1 - k) * (0.35 + r() * 0.5);
    const rad = (1.2 + r() * 2.4) * (H / 1080);
    g.fillStyle = rgba(color, a);
    g.beginPath();
    g.arc(x, y, rad, 0, 6.283);
    g.fill();
  }
}

// 香炉/炉口青烟：三段正弦扭动的竖条
export function smoke(g, W, H, t, x, y, n = 5, color = '#ffffff', alpha = 0.16) {
  const r = mulberry32(77);
  for (let i = 0; i < n; i++) {
    const ox = (r() - 0.5) * W * 0.06;
    const sp = 0.5 + r() * 0.5;
    const ph = r() * 6.283;
    const len = H * (0.16 + r() * 0.16);
    g.beginPath();
    for (let s = 0; s <= 16; s++) {
      const k = s / 16;
      const yy = y - k * len - ((t * 22 * sp) % 26) * (H / 1080);
      const xx = x + ox + Math.sin(k * 4 + t * sp * 1.2 + ph) * W * 0.018 * k;
      s ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
    }
    g.strokeStyle = rgba(color, alpha * (0.5 + r() * 0.5));
    g.lineWidth = (2 + r() * 3) * (H / 1080);
    g.lineCap = 'round';
    g.stroke();
  }
}

// 光柱里的浮尘
export function motes(g, W, H, t, n = 34, alpha = 0.35) {
  const r = mulberry32(303);
  for (let i = 0; i < n; i++) {
    const sx = r(), sy = r(), sp = 0.35 + r() * 0.6, ph = r() * 6.283;
    const x = W * sx + Math.sin(t * 0.5 + ph) * W * 0.02;
    const y = H * ((sy + t * sp * 0.012) % 1);
    g.fillStyle = rgba(P.paper, alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + ph))));
    g.beginPath();
    g.arc(x, y, (1 + r() * 2) * (H / 1080), 0, 6.283);
    g.fill();
  }
}

// 花瓣 / 落叶
export function petals(g, W, H, t, n = 14, color = '#f2a7b8') {
  const r = mulberry32(909);
  for (let i = 0; i < n; i++) {
    const sx = r(), sy = r(), sp = 0.18 + r() * 0.3, ph = r() * 6.283, sz = 0.006 + r() * 0.006;
    const k = (t * sp + sy) % 1;
    const y = H * (k * 1.08 - 0.04);
    const x = W * sx + Math.sin(t * 0.9 + ph) * W * 0.05 + k * W * 0.04;
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 1.6 + ph) * 0.9);
    g.fillStyle = rgba(color, 0.55 + r() * 0.35);
    g.beginPath();
    g.ellipse(0, 0, W * sz, W * sz * 0.55, 0.5, 0, 6.283);
    g.fill();
    g.restore();
  }
}

// 水面波纹
export function ripples(g, W, H, t, y0 = 0.66, n = 7) {
  const r = mulberry32(515);
  for (let i = 0; i < n; i++) {
    const x = W * (0.1 + r() * 0.85);
    const y = H * (y0 + r() * 0.3);
    const ph = r() * 6.283;
    const w = W * (0.05 + r() * 0.1);
    g.strokeStyle = rgba('#ffffff', 0.18 + 0.18 * Math.abs(Math.sin(t * 1.1 + ph)));
    g.lineWidth = 2 * (H / 1080);
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.quadraticCurveTo(x, y - 4 * (H / 1080), x + w / 2, y);
    g.stroke();
  }
}

// 风线
export function wind(g, W, H, t, amt = 1, n = 7) {
  if (amt <= 0.01) return;
  const r = mulberry32(616);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = H * (0.16 + r() * 0.6);
    const len = W * (0.1 + r() * 0.16);
    const speed = 0.6 + r() * 0.8;
    const x = ((t * speed * 0.9 + r()) % 1.2 - 0.1) * W;
    g.strokeStyle = rgba(P.paper, 0.28 * amt);
    g.lineWidth = (2 + r() * 2) * (H / 1080);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (r() - 0.5) * H * 0.02);
    g.stroke();
  }
}

// 星点闪烁
export function stars(g, W, H, t, n = 30) {
  const r = mulberry32(818);
  for (let i = 0; i < n; i++) {
    const x = W * r(), y = H * r() * 0.52, ph = r() * 6.283, sz = (1 + r() * 1.6) * (H / 1080);
    g.fillStyle = rgba('#ffffff', 0.25 + 0.55 * Math.abs(Math.sin(t * 1.7 + ph)));
    g.beginPath();
    g.arc(x, y, sz, 0, 6.283);
    g.fill();
  }
}

// 飘落的纸（间奏空镜用）
export function paperFall(g, W, H, lt, dur = 4.6) {
  const k = clamp01(lt / dur);
  const y = H * (-0.1 + easeOut(k) * 0.84);
  g.save();
  g.translate(W * 0.5 + Math.sin(k * 9) * W * 0.06, y);
  g.rotate(Math.sin(k * 6) * 0.2 + k * 0.32);
  g.fillStyle = P.paper;
  g.strokeStyle = rgba(P.ink, 0.55);
  g.lineWidth = 2.5 * (H / 1080);
  const w = W * 0.13, h = H * 0.092;
  g.beginPath();
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  g.stroke();
  g.strokeStyle = rgba(P.ink, 0.22);
  g.lineWidth = 2 * (H / 1080);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(-w * 0.36, -h * 0.14 + i * h * 0.16);
    g.lineTo(w * 0.36 - (i === 2 ? w * 0.24 : 0), -h * 0.14 + i * h * 0.16);
    g.stroke();
  }
  g.restore();
}

// 飘散的纸屑（乱套 / 骂声）
export function scraps(g, W, H, t, n = 12, color = P.paper, alpha = 0.85) {
  const r = mulberry32(1313);
  for (let i = 0; i < n; i++) {
    const sx = r(), sy = r(), sp = 0.25 + r() * 0.5, ph = r() * 6.283;
    const k = (t * sp + sy) % 1.05;
    const y = H * (k * 1.1 - 0.05);
    const x = W * sx + Math.sin(t * 1.2 + ph) * W * 0.03;
    g.save();
    g.translate(x, y);
    g.rotate(t * (0.8 + r()) + ph);
    g.fillStyle = rgba(color, alpha * (0.55 + r() * 0.45));
    const w = W * (0.008 + r() * 0.012), h = H * (0.012 + r() * 0.02);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
}

// 墙面裂缝（建文：灾祸临头）
export function cracks(g, W, H, k) {
  if (k <= 0) return;
  g.strokeStyle = rgba(P.ink, 0.45 * k);
  g.lineCap = 'round';
  const r = mulberry32(4242);
  const bx = W * 0.62, by = H * 0.46;
  for (let i = 0; i < 5; i++) {
    let x = bx, y = by;
    g.beginPath();
    g.moveTo(x, y);
    const seg = 5 + Math.floor(r() * 4);
    for (let s = 0; s < seg * k; s++) {
      x += (r() - 0.5) * W * 0.05;
      y += (r() * 0.6 + 0.2) * H * 0.045;
      g.lineTo(x, y);
    }
    g.lineWidth = (1.5 + r() * 2.5) * (H / 1080);
    g.stroke();
  }
}

// 声波（呐喊）
export function waves(g, W, H, t, x, y, color = P.gold) {
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.9 + i / 3) % 1);
    g.strokeStyle = rgba(color, 0.5 * (1 - k));
    g.lineWidth = 3 * (H / 1080);
    g.beginPath();
    g.arc(x, y, W * (0.04 + k * 0.18), -0.6, 0.6);
    g.stroke();
  }
}

// 药丸弹跳（泰昌红丸）
export function pills(g, W, H, t, x, y, color = P.red) {
  const r = mulberry32(2020);
  for (let i = 0; i < 4; i++) {
    const ph = r() * 6.283, vx = (r() - 0.5) * W * 0.14, sp = 0.8 + r() * 0.6;
    const tau = (t * sp + ph) % 1;
    const px = x + vx * tau;
    const py = y - Math.sin(tau * Math.PI) * H * 0.1 + tau * H * 0.04;
    g.fillStyle = rgba(color, 0.9 * (1 - tau * 0.4));
    g.beginPath();
    g.arc(px, py, 5 * (H / 1080), 0, 6.283);
    g.fill();
    g.strokeStyle = rgba('#ffffff', 0.4);
    g.lineWidth = 1.2 * (H / 1080);
    g.stroke();
  }
}

// 金色放射光
export function rays(g, W, H, x, y, t, color = P.gold, alpha = 0.22, n = 16) {
  g.save();
  g.translate(x, y);
  g.rotate(t * 0.18);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    g.fillStyle = rgba(color, alpha * (0.55 + 0.45 * Math.sin(i * 2.1)));
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * W, Math.sin(a) * W);
    g.lineTo(Math.cos(a + 0.07) * W, Math.sin(a + 0.07) * W);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// 暖光/冷光色罩
export function grade(g, W, H, kind) {
  const map = {
    dusk: ['rgba(20,34,60,.30)', 'multiply'],
    night: ['rgba(10,22,44,.45)', 'multiply'],
    fire: ['rgba(180,60,20,.16)', 'overlay'],
    warm: ['rgba(233,185,73,.10)', 'overlay'],
    rose: ['rgba(200,50,43,.10)', 'overlay'],
  };
  const v = map[kind];
  if (!v) return;
  g.save();
  g.globalCompositeOperation = v[1];
  g.fillStyle = v[0];
  g.fillRect(0, 0, W, H);
  g.restore();
}

// 暗角
export function vignette(g, W, H, amt = 0.4) {
  const r = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.72);
  r.addColorStop(0, 'rgba(0,0,0,0)');
  r.addColorStop(1, `rgba(12,10,14,${amt})`);
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
}
