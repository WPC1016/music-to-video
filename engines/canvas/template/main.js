// Canvas 渲染模板：确定性 renderFrame(t)，零依赖。
// 复制到 songs/<slug>/project/src/ 后按需要改。数据从当前歌曲目录加载。
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d', { alpha: false });

const get = async (p, fallback) => {
  try {
    const r = await fetch(p, { cache: 'no-store' });
    return r.ok ? await r.json() : fallback;
  } catch {
    return fallback;
  }
};

const song = await get('/song.json', { title: '', artist: '', canvas: { width: 1080, height: 1920, fps: 30 } });
const audiomap = await get('/analysis/audiomap.json', { duration: 60, fps: 30, full: [], bass: [], mid: [], treb: [], onsets: [] });
const lyricsData = await get('/analysis/lyrics.json', { lines: [] });
const storyboard = await get('/concept/storyboard.json', { shots: [] });

const W = (song.format?.[song.format?.primary] || song.canvas)?.width || 1080;
const H = (song.format?.[song.format?.primary] || song.canvas)?.height || 1920;
const FPS = audiomap.fps || (song.format?.[song.format?.primary] || song.canvas)?.fps || 30;
const DUR = audiomap.duration || 60;

cvs.width = W;
cvs.height = H;

// 只取正文歌词，制作信息不上屏
const lines = (lyricsData.lines || []).filter((l) => l.kind !== 'meta');

const palette = (song.style?.palette?.length ? song.style.palette : ['#0A0B0D', '#C8A24A', '#8C2F27', '#E8E2D4']);
const C = {
  bg: palette[0],
  gold: palette[1],
  red: palette[2],
  paper: palette[3],
};

const at = (arr, t) => {
  if (!arr || !arr.length) return 0;
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(t * FPS)));
  return arr[i] || 0;
};

// 找当前歌词行
function currentLine(t) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t <= t) idx = i;
    else break;
  }
  return idx;
}

// onset 脉冲：最近一次起音的衰减
function onsetPulse(t) {
  let last = -99;
  for (const o of audiomap.onsets || []) {
    if (o <= t) last = o;
    else break;
  }
  const dt = t - last;
  return dt < 0 ? 0 : Math.exp(-dt * 5.5);
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// 确定性伪随机
function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 中英混排换行
function wrap(text, maxW, font) {
  ctx.font = font;
  const out = [];
  let cur = '';
  for (const ch of text) {
    if (ch === '\n') {
      out.push(cur);
      cur = '';
      continue;
    }
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function drawBackground(t, energy) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // 中心呼吸光
  const r = W * (0.42 + energy * 0.22) + onsetPulse(t) * 40;
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, r);
  g.addColorStop(0, hexA(C.gold, 0.1 + energy * 0.16));
  g.addColorStop(0.55, hexA(C.gold, 0.03 + energy * 0.05));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 同心细环
  ctx.save();
  ctx.translate(W / 2, H * 0.46);
  for (let i = 0; i < 3; i++) {
    const rr = W * (0.28 + i * 0.13) + energy * 18;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(C.paper, 0.05 + i * 0.015);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 刻度环，随节拍转
  ctx.rotate(t * 0.06 + onsetPulse(t) * 0.02);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 6 === 0 ? 16 : 7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * W * 0.46, Math.sin(a) * W * 0.46);
    ctx.lineTo(Math.cos(a) * (W * 0.46 - len), Math.sin(a) * (W * 0.46 - len));
    ctx.strokeStyle = hexA(C.paper, 0.08);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // 颗粒
  const rand = rnd(Math.floor(t * FPS) * 7919 + 13);
  ctx.save();
  for (let i = 0; i < 900; i++) {
    const x = rand() * W;
    const y = rand() * H;
    ctx.fillStyle = `rgba(255,255,255,${0.012 + rand() * 0.02})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

function drawLyrics(t) {
  const idx = currentLine(t);
  if (idx < 0) return;
  const line = lines[idx];
  const nextT = lines[idx + 1]?.t ?? DUR;
  const life = Math.min(nextT - line.t, 8);
  const age = t - line.t;
  const fadeIn = Math.min(1, age / 0.35);
  const fadeOut = Math.min(1, Math.max(0, (life - age) / 0.45));
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

  const size = 68;
  const font = `${size}px "KaiTi","STKaiti","Microsoft YaHei",serif`;
  const maxW = W * 0.78;
  const rows = wrap(line.text, maxW, font);
  const lineH = size * 1.42;
  const baseY = H * 0.47 - ((rows.length - 1) * lineH) / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = hexA(C.gold, 0.5 * alpha);
  ctx.shadowBlur = 24;
  ctx.fillStyle = hexA(C.paper, alpha);
  ctx.font = font;
  rows.forEach((r, i) => ctx.fillText(r, W / 2, baseY + i * lineH));
  ctx.restore();

  // 上一句
  if (idx > 0) {
    const prev = lines[idx - 1];
    ctx.save();
    ctx.globalAlpha = 0.33 * (1 - Math.min(1, age / 0.8));
    ctx.fillStyle = hexA(C.paper, 0.5);
    ctx.font = `${size * 0.52}px "KaiTi","Microsoft YaHei",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(prev.text, W / 2, baseY - lineH * 1.35);
    ctx.restore();
  }

  // 下一句
  if (lines[idx + 1]) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = hexA(C.paper, 0.35);
    ctx.font = `${size * 0.52}px "KaiTi","Microsoft YaHei",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[idx + 1].text, W / 2, baseY + lineH * (rows.length - 1) + lineH * 1.2);
    ctx.restore();
  }
}

function drawBars(t) {
  const n = 48;
  const bw = (W * 0.8) / n;
  const x0 = W * 0.1;
  const baseY = H * 0.855;
  for (let i = 0; i < n; i++) {
    const tt = t - (n - i) * 0.012;
    const b = at(audiomap.bass, tt);
    const m = at(audiomap.mid, tt);
    const h = at(audiomap.treb, tt);
    const v = b * 0.55 + m * 0.3 + h * 0.15;
    const bh = 4 + v * 150;
    const col = i % 3 === 0 ? C.red : i % 3 === 1 ? C.gold : C.paper;
    ctx.fillStyle = hexA(col, 0.25 + v * 0.55);
    ctx.fillRect(x0 + i * (bw + 2), baseY - bh, bw, bh);
  }
}

function drawHud(t) {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = `500 22px "Microsoft YaHei",sans-serif`;
  ctx.fillStyle = hexA(C.paper, 0.42);
  ctx.textAlign = 'left';
  ctx.fillText(song.title || '', W * 0.1, H * 0.06);
  ctx.fillStyle = hexA(C.paper, 0.22);
  ctx.font = `400 18px "Microsoft YaHei",sans-serif`;
  ctx.fillText(song.artist || '', W * 0.1, H * 0.06 + 34);

  // 进度
  const prog = Math.min(1, t / DUR);
  ctx.fillStyle = hexA(C.paper, 0.12);
  ctx.fillRect(W * 0.1, H * 0.925, W * 0.8, 2);
  ctx.fillStyle = hexA(C.gold, 0.75);
  ctx.fillRect(W * 0.1, H * 0.925, W * 0.8 * prog, 2);
  ctx.restore();
}

window.renderFrame = (t) => {
  const energy = at(audiomap.full, t);
  drawBackground(t, energy);
  drawLyrics(t);
  drawBars(t);
  drawHud(t);
};

window.renderFrame(0);
window.__ready = true;
console.log(`[mv] ready  ${W}x${H} @${FPS}fps  ${DUR.toFixed(2)}s  ${lines.length} 行歌词`);
