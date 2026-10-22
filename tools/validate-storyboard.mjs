// 分镜校验：时间轴、素材引用、歌词覆盖、字段合法性
// node tools/validate-storyboard.mjs 人生态度-王七七
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('用法: npm run mv:validate -- <歌名-艺人>');
  process.exit(1);
}

const DIR = path.join(ROOT, 'songs', slug);
const SB = path.join(DIR, 'concept', 'storyboard.json');
if (!fs.existsSync(SB)) {
  console.error(`找不到 ${path.relative(ROOT, SB)}`);
  process.exit(1);
}

const errors = [];
const warns = [];
const E = (s) => errors.push(s);
const W = (s) => warns.push(s);

let sb;
try {
  sb = JSON.parse(fs.readFileSync(SB, 'utf8'));
} catch (e) {
  console.error('storyboard.json 解析失败：', e.message);
  process.exit(1);
}

const song = JSON.parse(fs.readFileSync(path.join(DIR, 'song.json'), 'utf8'));
const audiomapPath = path.join(DIR, 'analysis', 'audiomap.json');
const audiomap = fs.existsSync(audiomapPath) ? JSON.parse(fs.readFileSync(audiomapPath, 'utf8')) : null;
const lyricsPath = path.join(DIR, 'analysis', 'lyrics.json');
const lyrics = fs.existsSync(lyricsPath) ? JSON.parse(fs.readFileSync(lyricsPath, 'utf8')) : null;

const duration = audiomap?.duration ?? 0;
const shots = sb.shots;

// ---------- 结构 ----------
if (!Array.isArray(shots) || shots.length === 0) {
  E('shots 不是非空数组');
  report();
}

const REQUIRED = ['id', 'start', 'end', 'visual', 'pacing'];
const BANNED = ['氛围感', '氛围', '情绪张力', '张力', '唯美', '梦幻', '赛博朋克感', '震撼', '高级感'];
const PACING = ['beat_cut', 'phrase_flow'];

const ids = new Set();
shots.forEach((s, i) => {
  const tag = s.id || `#${i}`;
  for (const k of REQUIRED) {
    if (s[k] === undefined || s[k] === null || s[k] === '') E(`${tag}: 缺字段 ${k}`);
  }
  if (s.id) {
    if (ids.has(s.id)) E(`${tag}: id 重复`);
    ids.add(s.id);
  }
  if (typeof s.start !== 'number' || typeof s.end !== 'number') {
    E(`${tag}: start/end 必须是数字`);
    return;
  }
  if (!(s.end > s.start)) E(`${tag}: end(${s.end}) <= start(${s.start})`);
  const len = s.end - s.start;
  if (len < 1.5) W(`${tag}: 只有 ${len.toFixed(2)}s，太短`);
  if (len > 40) W(`${tag}: 长达 ${len.toFixed(1)}s，可能观众会走神`);
  if (duration && s.end > duration + 0.01) E(`${tag}: end(${s.end}) 超出全曲时长 ${duration}`);
  if (duration && s.start < 0) E(`${tag}: start 为负`);
  if (s.pacing && !PACING.includes(s.pacing)) E(`${tag}: pacing "${s.pacing}" 非法，只能是 ${PACING.join(' / ')}`);
  if (s.visual) {
    for (const w of BANNED) if (String(s.visual).includes(w)) W(`${tag}: visual 含空洞词「${w}」，要写成具体画面`);
    if (String(s.visual).length > 60) W(`${tag}: visual 超过 60 字，分镜描述要短`);
  }
  if (s.refs && !Array.isArray(s.refs)) E(`${tag}: refs 必须是数组`);
  if (s.refs && Array.isArray(s.refs)) {
    for (const r of s.refs) {
      const exts = ['.png', '.jpg', '.jpeg', '.webp'];
      const found = exts.some((e) => fs.existsSync(path.join(DIR, 'refs', r + e)) || fs.existsSync(path.join(DIR, 'refs', r)));
      if (!found) W(`${tag}: refs 引用的「${r}」在 refs/ 里找不到`);
    }
  }
});

// ---------- 时间轴连续性 ----------
const sorted = [...shots].filter((s) => typeof s.start === 'number').sort((a, b) => a.start - b.start);
if (sorted.length) {
  if (Math.abs(sorted[0].start) > 0.01) E(`第一个镜头从 ${sorted[0].start}s 开始，应该是 0`);
  if (duration && Math.abs(sorted[sorted.length - 1].end - duration) > 0.1) {
    E(`最后一个镜头结束在 ${sorted[sorted.length - 1].end}s，全曲是 ${duration}s，差 ${(duration - sorted[sorted.length - 1].end).toFixed(2)}s`);
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - sorted[i - 1].end;
    if (gap > 0.05) E(`${sorted[i - 1].id} 与 ${sorted[i].id} 之间有 ${gap.toFixed(2)}s 空档`);
    if (gap < -0.05) E(`${sorted[i - 1].id} 与 ${sorted[i].id} 重叠 ${Math.abs(gap).toFixed(2)}s`);
  }
}

// ---------- 镜头数量 ----------
if (shots.length < 12) W(`只有 ${shots.length} 个镜头，3 分钟的歌通常 20–32 个`);
if (shots.length > 45) W(`${shots.length} 个镜头偏多，可能切碎了`);

// ---------- 歌词覆盖 ----------
if (lyrics?.lines) {
  const lyricLines = lyrics.lines.filter((l) => l.kind !== 'meta');
  const covered = new Set();
  for (const s of shots) {
    for (const l of s.lyrics || []) covered.add(String(l).trim());
    // 也接受按时间落入
    if (typeof s.start === 'number') {
      for (const l of lyricLines) if (l.t >= s.start && l.t < s.end) covered.add(l.text.trim());
    }
  }
  const missing = lyricLines.filter((l) => !covered.has(l.text.trim()));
  if (missing.length) {
    W(`${missing.length} 句歌词没有落在任何镜头里，前 3 句：${missing.slice(0, 3).map((m) => `「${m.text}」`).join(' ')}`);
  }
}

// ---------- 段落边界 ----------
if (audiomap?.sections) {
  const starts = new Set(sorted.map((s) => Math.round(s.start * 10) / 10));
  const missed = audiomap.sections.filter((sec) => sec.t > 1 && ![...starts].some((s) => Math.abs(s - sec.t) < 0.6));
  if (missed.length) W(`${missed.length} 个段落边界没有镜头起点对应：${missed.map((m) => m.t + 's(' + m.name + ')').join(', ')}`);
}

report();

function report() {
  console.log(`\n分镜校验 · ${slug}\n` + '─'.repeat(64));
  if (!errors.length && !warns.length) {
    console.log(' 全部通过。');
  }
  for (const e of errors) console.log(` ERROR  ${e}`);
  for (const w of warns) console.log(` WARN   ${w}`);
  console.log('─'.repeat(64));
  console.log(` ${shots?.length || 0} 个镜头 · ${errors.length} 个错误 · ${warns.length} 个警告\n`);
  if (errors.length) {
    console.log(' 有错误必须改，否则渲染出来时间轴会错位。\n');
    process.exit(1);
  }
  console.log(' 可以进 Step 6（参考图）了。\n');
  process.exit(0);
}
