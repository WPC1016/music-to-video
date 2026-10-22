// 音频分析 + LRC 解析
// node tools/analyze.mjs 人生态度-王七七
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const slug = process.argv[2] || process.argv.find((a) => !a.startsWith('-') && a !== process.argv[1]);
if (!slug) {
  console.error('用法: npm run mv:analyze -- <歌名-艺人>');
  process.exit(1);
}

// --lrc-scale：换音频版本（时长不同但同源）时，把 LRC 时间按比例对齐到新音频
const argv = process.argv.slice(2);
const scaleIdx = argv.indexOf('--lrc-scale');
const LRC_SCALE = scaleIdx >= 0 && Number(argv[scaleIdx + 1]) > 0 ? Number(argv[scaleIdx + 1]) : 1;

const SONG_DIR = path.join(ROOT, 'songs', slug);
const SONG_JSON = path.join(SONG_DIR, 'song.json');
if (!fs.existsSync(SONG_JSON)) {
  console.error(`找不到 ${SONG_JSON}`);
  process.exit(1);
}
const song = JSON.parse(fs.readFileSync(SONG_JSON, 'utf8'));
const FPS = song.canvas?.fps || 30;
const SRC = path.join(SONG_DIR, 'source');

// ---------- 1. 定位音频 ----------
function pickAudio() {
  if (song.source?.audio && fs.existsSync(path.join(SONG_DIR, song.source.audio))) {
    return path.join(SONG_DIR, song.source.audio);
  }
  const exts = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
  const f = fs.readdirSync(SRC).find((n) => exts.includes(path.extname(n).toLowerCase()));
  if (!f) throw new Error(`source/ 下没有音频文件（支持 ${exts.join(' ')}）`);
  return path.join(SRC, f);
}

const audioPath = pickAudio();
console.log(`[1/4] 音频: ${path.relative(ROOT, audioPath)}${LRC_SCALE !== 1 ? ` · LRC 时间 ×${LRC_SCALE}` : ''}`);

// ---------- 2. 转 16bit mono wav ----------
const wavPath = path.join(SONG_DIR, 'analysis', '_source.wav');
fs.mkdirSync(path.dirname(wavPath), { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', audioPath, '-ac', '1', '-ar', '44100', '-sample_fmt', 's16', '-f', 'wav', wavPath], {
  stdio: 'inherit',
});
console.log('[2/4] 已转码 44.1k / mono / s16');

// ---------- 3. 解析 wav ----------
const buf = fs.readFileSync(wavPath);
if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('不是 RIFF wav');

let pos = 12;
let fmt = null;
let dataOff = 0;
let dataLen = 0;
while (pos + 8 <= buf.length) {
  const id = buf.toString('ascii', pos, pos + 4);
  const size = buf.readUInt32LE(pos + 4);
  const body = pos + 8;
  if (id === 'fmt ') {
    fmt = {
      format: buf.readUInt16LE(body),
      channels: buf.readUInt16LE(body + 2),
      sampleRate: buf.readUInt32LE(body + 4),
      bits: buf.readUInt16LE(body + 14),
    };
  } else if (id === 'data') {
    dataOff = body;
    dataLen = Math.min(size, buf.length - body);
  }
  pos = body + size + (size & 1);
}
if (!fmt) throw new Error('wav 缺少 fmt chunk');
if (fmt.format !== 1 || fmt.bits !== 16) throw new Error(`期望 pcm_s16le，实际 format=${fmt.format} bits=${fmt.bits}`);

const { channels, sampleRate } = fmt;
const totalFrames = Math.floor(dataLen / 2 / channels);
const duration = totalFrames / sampleRate;

const mono = new Float32Array(totalFrames);
for (let i = 0; i < totalFrames; i++) {
  let s = 0;
  for (let c = 0; c < channels; c++) s += buf.readInt16LE(dataOff + (i * channels + c) * 2);
  mono[i] = s / channels / 32768;
}

// 一阶低通
function lowpass(src, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  const out = new Float32Array(src.length);
  let y = 0;
  for (let i = 0; i < src.length; i++) {
    y += a * (src[i] - y);
    out[i] = y;
  }
  return out;
}

const bassSig = lowpass(mono, 140);
const midSig = lowpass(mono, 2200);
const trebSig = lowpass(mono, 6000);

const hop = sampleRate / FPS;
const nFrames = Math.ceil(duration * FPS);

function envelope(sig) {
  const out = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const a = Math.floor(f * hop);
    const b = Math.min(sig.length, Math.floor((f + 1) * hop));
    let s = 0;
    for (let i = a; i < b; i++) s += sig[i] * sig[i];
    out[f] = Math.sqrt(s / Math.max(1, b - a));
  }
  return out;
}

function pct(arr, p) {
  const a = Array.from(arr).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 1e-6;
}
function normalize(arr, ceilPct = 0.985) {
  const c = pct(arr, ceilPct) || 1e-6;
  return Array.from(arr, (v) => Math.min(3, Math.log1p((v / c) * 4) / Math.log(5)));
}

const full = normalize(envelope(mono));
const bass = normalize(envelope(bassSig));
const mid = normalize(envelope(midSig));
const treb = normalize(envelope(trebSig));

// BPM：低频 onset 自相关
const onsetEnv = new Float32Array(nFrames);
for (let i = 1; i < nFrames; i++) onsetEnv[i] = Math.max(0, bass[i] - bass[i - 1]);
let best = { bpm: 0, score: 0 };
for (let bpm = 60; bpm <= 180; bpm += 0.5) {
  const lag = Math.round((60 / bpm) * FPS);
  if (lag < 2) continue;
  let s = 0;
  for (let i = lag; i < nFrames; i++) s += onsetEnv[i] * onsetEnv[i - lag];
  s /= nFrames - lag;
  if (s > best.score) best = { bpm, score: s };
}

// onsets：full 的正向差分，局部自适应阈值 + 最小间隔
const flux = new Float32Array(nFrames);
for (let i = 1; i < nFrames; i++) flux[i] = Math.max(0, full[i] - full[i - 1]);
const W = Math.max(4, Math.round(FPS * 0.5));
const onsets = [];
let lastT = -1;
for (let i = 1; i < nFrames - 1; i++) {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(0, i - W); k <= Math.min(nFrames - 1, i + W); k++) {
    sum += flux[k];
    n++;
  }
  const thr = (sum / n) * 1.8 + 0.004;
  if (flux[i] > thr && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
    const t = i / FPS;
    if (t - lastT >= 0.12) {
      onsets.push(+t.toFixed(3));
      lastT = t;
    }
  }
}

// 每秒平均能量
const perSec = [];
for (let s = 0; s < Math.ceil(duration); s++) {
  const a = Math.floor(s * FPS);
  const b = Math.min(nFrames, Math.floor((s + 1) * FPS));
  let t = 0;
  for (let i = a; i < b; i++) t += full[i];
  perSec.push(+(t / Math.max(1, b - a)).toFixed(3));
}

// sections：perSec 平滑后找能量跃升
function smooth(arr, k = 2) {
  return arr.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++) {
      s += arr[j];
      n++;
    }
    return s / n;
  });
}
const sm = smooth(perSec);
const sections = [{ t: 0, name: 'intro', energy: +sm[0].toFixed(3), delta: 0 }];

// 用「前后 6 秒均值差」找段落切换，比逐秒差分稳
const GAP = 6;
const globalStd = (() => {
  const m = sm.reduce((a, b) => a + b, 0) / sm.length;
  return Math.sqrt(sm.reduce((a, b) => a + (b - m) ** 2, 0) / sm.length);
})();
const thr = Math.max(0.04, globalStd * 0.45);

for (let i = GAP; i < sm.length - GAP; i++) {
  const prev = sm.slice(i - GAP, i).reduce((a, b) => a + b, 0) / GAP;
  const next = sm.slice(i, i + GAP).reduce((a, b) => a + b, 0) / GAP;
  const d = next - prev;
  if (Math.abs(d) > thr && i - sections[sections.length - 1].t >= 12) {
    sections.push({
      t: i,
      name: d > 0 ? 'lift' : 'drop',
      energy: +sm[i].toFixed(3),
      delta: +d.toFixed(3),
    });
  }
}

// ---------- 4. LRC ----------
function readText(p) {
  const raw = fs.readFileSync(p);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder('gbk').decode(raw);
  }
}

const META_RE = /^(作词|作曲|词|曲|编曲|制作人|监制|混音|母带|录音棚|录音|音乐总监|吉他|贝斯|鼓|键盘|和声|弦乐|出品|发行|企划宣传|企划|宣传|统筹|文案|平面设计|封面|OP|SP)\s*[：:]/i;

function parseLrc(text, title = '') {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    if (/^\[(ar|ti|al|by|offset|re|ve):/i.test(raw.trim())) continue;
    const content = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (!content) continue;
    for (const m of stamps) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const frac = m[3] ? Number('0.' + m[3]) : 0;
      const t = +((min * 60 + sec + frac) * LRC_SCALE).toFixed(3);
      // 前 15 秒的制作人名单 / 标题行标记为 meta，下游可自行决定是否上屏
      const isMeta = (t < 15 && META_RE.test(content)) || (lines.length === 0 && title && content.includes(title));
      lines.push({ t, text: content, kind: isMeta ? 'meta' : 'lyric' });
    }
  }
  lines.sort((a, b) => a.t - b.t);
  // 去掉同一时间的重复
  return lines.filter((l, i) => i === 0 || l.t !== lines[i - 1].t || l.text !== lines[i - 1].text);
}

let lyrics = [];
const lrcName = song.source?.lrc
  ? path.join(SONG_DIR, song.source.lrc)
  : path.join(SRC, fs.readdirSync(SRC).find((n) => n.toLowerCase().endsWith('.lrc')) || '');
if (lrcName && fs.existsSync(lrcName)) {
  lyrics = parseLrc(readText(lrcName), song.title);
  fs.writeFileSync(
    path.join(SONG_DIR, 'analysis', 'lyrics.json'),
    JSON.stringify({ fps: FPS, duration: +duration.toFixed(3), lines: lyrics }, null, 1),
    'utf8',
  );
} else {
  console.warn('  ! 没找到 .lrc，跳过歌词解析（歌词视频必须补）');
}

// ---------- 5. 输出 ----------
const audiomap = {
  fps: FPS,
  duration: +duration.toFixed(3),
  bpm: best.bpm,
  frames: nFrames,
  onsets,
  sections,
  perSec,
  full: full.map((v) => +v.toFixed(3)),
  bass: bass.map((v) => +v.toFixed(3)),
  mid: mid.map((v) => +v.toFixed(3)),
  treb: treb.map((v) => +v.toFixed(3)),
};
fs.writeFileSync(path.join(SONG_DIR, 'analysis', 'audiomap.json'), JSON.stringify(audiomap), 'utf8');

// 人读版，直接喂给模型
const md = [];
md.push(`# 《${song.title}》音频结构`, '');
md.push(`- 时长：${duration.toFixed(2)}s（${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, '0')}）`);
md.push(`- 帧率：${FPS}fps，共 ${nFrames} 帧`);
md.push(`- BPM 估计：${best.bpm}${best.bpm === 0 ? '（无稳定节拍，全片用 phrase_flow）' : ''}`);
md.push(`- onset 数量：${onsets.length}`, '');
md.push('## 能量段落', '', '| 时间 | 名称 | 平均能量 | 变化 |', '|---|---|---|---|');
for (const s of sections) md.push(`| ${s.t}s | ${s.name} | ${s.energy} | ${s.delta > 0 ? '+' : ''}${s.delta} |`);
md.push('', '## 每秒能量曲线', '', '```');
for (let i = 0; i < perSec.length; i += 10) {
  md.push(`${String(i).padStart(4)}s ${'█'.repeat(Math.round(perSec[i] * 24))}`);
}
md.push('```');
if (lyrics.length) {
  const lyricOnly = lyrics.filter((l) => l.kind === 'lyric');
  md.push('', `## 歌词时间轴（正文 ${lyricOnly.length} 行 / 制作信息 ${lyrics.length - lyricOnly.length} 行）`, '', '| 时间 | 类型 | 歌词 |', '|---|---|---|');
  for (const l of lyrics) md.push(`| ${l.t.toFixed(2)}s | ${l.kind === 'meta' ? '信息' : '正文'} | ${l.text} |`);
}
fs.writeFileSync(path.join(SONG_DIR, 'analysis', 'structure.md'), md.join('\n') + '\n', 'utf8');

// 回填 song.json；只在还没推进时才改 stage，避免重跑分析把进度倒退
if (!song.stage || song.stage === 'source') song.stage = 'analyzed';
if (!song.source.audio) song.source.audio = path.relative(SONG_DIR, audioPath).replace(/\\/g, '/');
if (lrcName && !song.source.lrc) song.source.lrc = path.relative(SONG_DIR, lrcName).replace(/\\/g, '/');
song.duration = +duration.toFixed(3);
song.bpm = best.bpm;
fs.writeFileSync(SONG_JSON, JSON.stringify(song, null, 2) + '\n', 'utf8');

console.log(`[3/4] 分析完成: ${duration.toFixed(2)}s | ${nFrames} 帧 | bpm~${best.bpm} | onset ${onsets.length}`);
console.log(`[4/4] 已写 analysis/audiomap.json · lyrics.json(${lyrics.length} 行) · structure.md`);
console.log(`\n下一步: 读 analysis/structure.md，按 docs/workflow.md 的 Step 2 写歌词解读。`);
