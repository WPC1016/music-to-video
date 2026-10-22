// 时间轴 + 渲染入口（v2 · 素材库驱动）
// 五层结构：场景(含镜头运动) → 环境动效 → 人物调度 → 特殊演出 → 歌词条 → 后期
import { C, makePaper, rgba, clamp01, text } from './lib.js';
import { emperor, FRAMES, lyricBar, sealSvg, SCENES, EMPERORS, PROPS } from './emperor.js';
import { SHOTS, drawShot } from './director.js';
import { P, vignette } from './fx.js';

const cvs = document.getElementById('c');

const get = async (p, fallback) => {
  try {
    const r = await fetch(p, { cache: 'no-store' });
    return r.ok ? await r.json() : fallback;
  } catch {
    return fallback;
  }
};

const song = await get('/song.json', {});
const audiomap = await get('/analysis/audiomap.json', { duration: 156, fps: 30 });
const lyricsData = await get('/analysis/lyrics.json', { lines: [] });
const sb = await get('/concept/storyboard.json', { shots: [] });
const MEME = await get('/concept/meme-map.json', { map: {} });

const fmt = song.format?.[song.format?.primary] || { width: 1920, height: 1080, fps: 30 };
const OUT_W = fmt.width;
const OUT_H = fmt.height;
const FPS = fmt.fps;
const DUR = audiomap.duration || 156;

const PIXEL = false;
const SCALE = PIXEL ? 3 : 1;
const W = Math.round(OUT_W / SCALE);
const H = Math.round(OUT_H / SCALE);

cvs.width = OUT_W;
cvs.height = OUT_H;
const ctx = cvs.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;

const buf = document.createElement('canvas');
buf.width = W;
buf.height = H;
const p = buf.getContext('2d', { alpha: false });
p.imageSmoothingEnabled = true;

const svgData = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const svgWrap = (inner, vb = '0 0 200 240', w = 800, h = 960) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>`;

const loadImg = (src) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.complete && im.naturalWidth > 0 ? im : null);
    im.onerror = () => res(null);
    im.src = src;
  });

const shots = sb.shots || [];
const lines = (lyricsData.lines || []).filter((l) => l.kind !== 'meta');

// ---------- 场景（6 个 320×180 -> 1920×1080）
const SCENE_IMG = {};
await Promise.all(
  Object.keys(SCENES).map(async (k) => {
    SCENE_IMG[k] = await loadImg(svgData(svgWrap(SCENES[k].draw(), '0 0 320 180', 1920, 1080)));
  }),
);

// ---------- 人物（按 who|expr|pose|prop 去重）
const EMP_IMG = {};
const empJobs = new Map();
for (const spec of Object.values(SHOTS)) {
  for (const c of spec.cast || []) {
    const key = `${c.who}|${c.expr}|${c.pose}|${c.prop || ''}`;
    if (!empJobs.has(key)) empJobs.set(key, c);
  }
}
await Promise.all(
  [...empJobs].map(async ([key, c]) => {
    const base = EMPERORS.find((x) => x.id === c.who) || EMPERORS[0];
    const opt = { ...base, expr: c.expr, pose: c.pose, prop: c.prop || null };
    EMP_IMG[key] = await loadImg(svgData(svgWrap(emperor(opt))));
  }),
);

// ---------- 印章（歌词条用 + 特殊演出用）
const SEAL_TEXTS = new Set(['永乐', '洪武', '态度']);
for (const k of Object.keys(MEME.map || {})) SEAL_TEXTS.add(MEME.map[k].reign.slice(0, 2));
const SEAL_IMG = {};
await Promise.all(
  [...SEAL_TEXTS].map(async (txt) => {
    SEAL_IMG[txt] = await loadImg(svgData(svgWrap(sealSvg(txt), '0 0 80 80', 320, 320)));
  }),
);

// ---------- 歌词条（条身不含印章，进度条在画布上按 keyframe 画）
const LYRIC_IMG = {};
await Promise.all(
  lines.map(async (line) => {
    const svg = lyricBar({ text: line.text, seal: false, progress: 0 });
    LYRIC_IMG[line.text.trim()] = await loadImg(
      svgData(svg.replace('<svg ', '<svg width="1200" height="280" ')),
    );
  }),
);

// ---------- 关键镜头 6 帧（素材保留，s02 用自绘调度）
const FRAME_IMG = await Promise.all(
  FRAMES.map((f) => loadImg(svgData(svgWrap(f.draw(), '0 0 320 180', 1920, 1080)))),
);

// ---------- 道具图标（64×64 -> 256×256）
const PROP_IMG = {};
const propKeys = new Set();
for (const spec of Object.values(SHOTS)) {
  for (const c of spec.cast || []) if (c.prop) propKeys.add(c.prop);
}
await Promise.all(
  [...propKeys].map(async (k) => {
    if (!PROPS[k]) return;
    PROP_IMG[k] = await loadImg(svgData(svgWrap(PROPS[k].draw(), '0 0 64 64', 256, 256)));
  }),
);

// 尾奏对照表：皇帝 ↔ 歌词行（行文本从 lyrics.json 取，代码里不放歌词）
const MEME_ROWS = (() => {
  const seen = new Set();
  const out = [];
  for (const [id, v] of Object.entries(MEME.map || {})) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    const line = lines[Number(id.slice(1)) - 1];
    out.push({ reign: v.reign.split(' / ')[0], name: v.name, line: line ? line.text : id });
  }
  return out;
})();

const PAPER = makePaper(W, H, 20261021);

const ASSETS = {
  scene: (k) => SCENE_IMG[k],
  emp: (c) => EMP_IMG[`${c.who}|${c.expr}|${c.pose}|${c.prop || ''}`],
  seal: (txt) => SEAL_IMG[txt] || SEAL_IMG['态度'],
  prop: (k) => PROP_IMG[k],
  propName: (k) => (PROPS[k] && PROPS[k].name) || '',
  rows: () => MEME_ROWS,
};

function shotAt(t) {
  for (const s of shots) if (t >= s.start && t < s.end) return s;
  return shots[shots.length - 1];
}

function currentLine(t) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t <= t) idx = i;
    else break;
  }
  return idx >= 0 ? { line: lines[idx], idx } : null;
}

// 线性关键帧插值：[[时间, {字段}], ...]
function at(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      const k = (t - t0) / Math.max(1e-6, t1 - t0);
      const out = {};
      for (const key of Object.keys(v1)) out[key] = v0[key] + (v1[key] - v0[key]) * k;
      return out;
    }
  }
  return frames[frames.length - 1][1];
}

// 歌词条：对齐素材库 CSS keyframes（5s 循环），行长不足时压缩尾段
// 条身 0–0.40 上浮+放大1.05 → 0.55 0.97/-1.2° → 0.70 1.02/+1° → 0.85 归位 → f0 淡出
// 印章 2.6/-24° → .88/-6° → 1.06/-9° → 1/-8°
function drawLyrics(g, t) {
  const shot = shotAt(t);
  if (!shot || !shot.lyrics || shot.lyrics.length === 0) return;
  const cur = currentLine(t);
  if (!cur) return;
  const { line, idx } = cur;
  const lineId = 'L' + String(idx + 1).padStart(2, '0');
  const bar = LYRIC_IMG[line.text.trim()];
  if (!bar) return;
  const lt = t - line.t;
  const nextT = idx + 1 < lines.length ? Math.min(lines[idx + 1].t, shot.end) : shot.end;
  const dur = Math.max(1, nextT - line.t);
  // 戳章时机随行长安自适应；淡出必须晚于落章（否则短句的章还没看清就没了）
  const st = Math.min(1.0, Math.max(0.58, dur * 0.42));
  const f0 = Math.max(st + 0.8, Math.min(3.6, dur - 0.32));

  const bw = W * 0.56;
  const bh = bw * (140 / 600);
  const bx = (W - bw) / 2;
  const by = H * 0.7;
  const u = H / 1080;

  const bf = [
    [0, { o: 0, y: 18 * u, s: 0.9, r: 0 }],
    [0.4, { o: 1, y: 0, s: 1.05, r: 0 }],
    [0.55, { o: 1, y: 0, s: 0.97, r: -1.2 }],
    [0.7, { o: 1, y: 0, s: 1.02, r: 1 }],
    [0.85, { o: 1, y: 0, s: 1, r: 0 }],
    [f0, { o: 1, y: 0, s: 1, r: 0 }],
    [f0 + 0.28, { o: 0, y: -8 * u, s: 1, r: 0 }],
  ];
  const v = at(lt, bf);
  const prog = clamp01(lt / Math.max(0.5, f0));

  g.save();
  g.globalAlpha = clamp01(v.o);
  g.translate(bx + bw / 2, by + bh / 2 + v.y);
  g.rotate((v.r * Math.PI) / 180);
  g.scale(v.s, v.s);
  g.drawImage(bar, -bw / 2, -bh / 2, bw, bh);
  // 进度条（条身轨迹 x 90–470 / 600，y 102–108 / 140）
  const px0 = -bw / 2 + (90 / 600) * bw;
  const pw = (380 / 600) * bw;
  const py0 = -bh / 2 + (102 / 140) * bh;
  const ph2 = (6 / 140) * bh;
  if (prog > 0.002) {
    g.fillStyle = rgba(P.red, 0.95);
    g.fillRect(px0, py0, pw * prog, ph2);
  }
  g.restore();

  const mm = MEME.map && MEME.map[lineId];
  const seal = mm ? SEAL_IMG[mm.reign.slice(0, 2)] : null;
  if (seal) {
    const sf = [
      [st, { o: 0, s: 2.6, r: -24 }],
      [st + 0.25, { o: 1, s: 0.88, r: -6 }],
      [st + 0.4, { o: 1, s: 1.06, r: -9 }],
      [st + 0.55, { o: 1, s: 1, r: -8 }],
      [f0, { o: 1, s: 1, r: -8 }],
      [f0 + 0.28, { o: 0, s: 1, r: -8 }],
    ];
    const sv = at(lt, sf);
    const sw = bw * (80 / 600) * 1.12;
    g.save();
    g.globalAlpha = clamp01(sv.o);
    g.translate(bx + bw * 0.87, by + bh * 0.43 + v.y);
    g.rotate((sv.r * Math.PI) / 180);
    g.scale(sv.s, sv.s);
    g.drawImage(seal, -sw / 2, -sw / 2, sw, sw);
    g.restore();
  }
}

window.renderFrame = (t) => {
  const shot = shotAt(t);
  if (!shot) {
    p.fillStyle = '#0d1119';
    p.fillRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0, W, H, 0, 0, OUT_W, OUT_H);
    return;
  }

  const localT = t - shot.start;
  const dur = Math.max(0.001, shot.end - shot.start);
  const prog = clamp01(localT / dur);
  const spec = SHOTS[shot.id];

  // 镜头：缓推 / 平移 / 轻微手持
  const cam = (spec && spec.cam) || {};
  const z = 1 + (cam.push || 0) * prog;
  const cx = (cam.panX || 0) * W * prog;
  const cy = (cam.panY || 0) * H * prog;
  const shakeX = cam.shake ? Math.sin(t * 31) * W * cam.shake : 0;
  const shakeY = cam.shake ? Math.cos(t * 27) * H * cam.shake * 0.5 : 0;

  p.save();
  p.translate(W / 2, H / 2);
  p.scale(z, z);
  p.translate(-W / 2 - cx + shakeX, -H / 2 - cy + shakeY);
  const ok = spec ? drawShot(p, { W, H, t, localT, prog, dur }, spec, shot.id, ASSETS) : false;
  p.restore();

  if (!ok) {
    p.fillStyle = C.dark;
    p.fillRect(0, 0, W, H);
    text(p, shot.id, W / 2, H / 2, H * 0.06, C.paper);
  }

  // 后期：颗粒 + 暗角
  p.save();
  p.globalAlpha = 0.035;
  p.globalCompositeOperation = 'overlay';
  p.drawImage(PAPER, 0, 0, W, H);
  p.restore();
  vignette(p, W, H, 0.34);

  drawLyrics(p, t);

  if (t < 0.5) {
    p.fillStyle = rgba('#0d1119', 1 - t / 0.5);
    p.fillRect(0, 0, W, H);
  }
  if (t > DUR - 0.9) {
    p.fillStyle = rgba('#0d1119', clamp01((t - (DUR - 0.9)) / 0.9));
    p.fillRect(0, 0, W, H);
  }

  ctx.drawImage(buf, 0, 0, W, H, 0, 0, OUT_W, OUT_H);
};

window.renderFrame(0);
window.__ready = true;
console.log(`[mv] ready ${W}x${H} -> ${OUT_W}x${OUT_H} @${FPS}fps ${DUR}s ${shots.length} shots, ${Object.keys(EMP_IMG).length} cast`);
