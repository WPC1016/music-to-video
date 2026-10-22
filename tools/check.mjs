// 成片质检：规格 / 时长 / 帧完整性 / 音轨 / 响度
// node tools/check.mjs 人生态度-王七七 [--loudness] [--file out/xxx.mp4]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};
const flag = (name) => argv.includes('--' + name);

const slug = arg('song', argv.find((a) => !a.startsWith('--') && !a.includes('.mp4')));
if (!slug) {
  console.error('用法: npm run mv:check -- <歌名-艺人> [--loudness]');
  process.exit(1);
}
const SONG_DIR = path.join(ROOT, 'songs', slug);
const song = JSON.parse(fs.readFileSync(path.join(SONG_DIR, 'song.json'), 'utf8'));
const audiomapPath = path.join(SONG_DIR, 'analysis', 'audiomap.json');
const audiomap = fs.existsSync(audiomapPath) ? JSON.parse(fs.readFileSync(audiomapPath, 'utf8')) : null;

const outDir = path.join(SONG_DIR, 'out');
let target = arg('file', '');
if (!target) {
  const mp4s = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter((n) => n.endsWith('.mp4')).map((n) => ({ n, t: fs.statSync(path.join(outDir, n)).mtimeMs }))
    : [];
  mp4s.sort((a, b) => b.t - a.t);
  target = mp4s[0] ? path.join(outDir, mp4s[0].n) : '';
}
if (!target || !fs.existsSync(target)) {
  console.error('out/ 下没有 mp4，先跑 npm run mv:render');
  process.exit(1);
}

const rows = [];
const add = (name, pass, detail) => rows.push({ name, pass, detail });

// ---------- ffprobe ----------
const probe = JSON.parse(
  execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', target], { encoding: 'utf8' }),
);
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = Number(probe.format.duration);
const sizeMB = Number(probe.format.size) / 1048576;

const canvas = song.format?.[song.format?.primary] || song.canvas || {};
add('分辨率', v && v.width === canvas.width && v.height === canvas.height, v ? `${v.width}x${v.height}（期望 ${canvas.width}x${canvas.height}）` : '无视频流');

const fmtFps = canvas.fps || 30;
const fps = v?.r_frame_rate ? (() => {
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  return d ? n / d : 0;
})() : 0;
add('帧率', Math.abs(fps - fmtFps) < 0.01, `${fps.toFixed(2)}fps（期望 ${fmtFps}）`);

add('音轨', !!a, a ? `${a.codec_name} ${a.sample_rate}Hz ${a.channels}ch` : '没有音轨');

if (audiomap) {
  const diff = Math.abs(dur - audiomap.duration);
  add('时长', diff < 0.2, `${dur.toFixed(3)}s vs 音频 ${audiomap.duration.toFixed(3)}s（差 ${diff.toFixed(3)}s）`);
} else {
  add('时长', true, `${dur.toFixed(3)}s（没有 audiomap，无法比对）`);
}

add('体积', true, `${sizeMB.toFixed(1)} MB`);

// ---------- 帧完整性 ----------
const framesDir = path.join(SONG_DIR, 'frames');
if (fs.existsSync(framesDir)) {
  const files = fs.readdirSync(framesDir).filter((n) => /^f\d+\.(jpg|png)$/.test(n));
  const nums = files.map((n) => Number(n.slice(1, 6))).sort((x, y) => x - y);
  if (nums.length) {
    const miss = [];
    for (let i = nums[0]; i <= nums[nums.length - 1]; i++) if (!nums.includes(i)) miss.push(i);
    add('帧完整性', miss.length === 0, miss.length ? `缺 ${miss.length} 帧（首个 ${miss[0]}）` : `${nums.length} 帧连续（${nums[0]}–${nums[nums.length - 1]}）`);
  }
} else {
  add('帧完整性', true, '没有 frames/，跳过');
}

// ---------- 响度 ----------
if (flag('loudness')) {
  try {
    const out = execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-i', target, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const m = out.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      const i = Number(j.input_i);
      add('响度', Math.abs(i + 14) < 1.5, `${i.toFixed(1)} LUFS（目标 -14）`);
    }
  } catch (e) {
    // ffmpeg 把统计写在 stderr，execFileSync 只在失败时抛出
    const s = String(e.stderr || e.stdout || '');
    const m = s.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      const i = Number(j.input_i);
      add('响度', Math.abs(i + 14) < 1.5, `${i.toFixed(1)} LUFS（目标 -14）`);
    } else {
      add('响度', false, '测不出来，手动听一遍');
    }
  }
}

// ---------- 输出 ----------
const pass = rows.filter((r) => r.pass).length;
console.log(`\n《${song.title || slug}》质检 · ${path.basename(target)}\n` + '─'.repeat(64));
for (const r of rows) console.log(` ${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(10)} ${r.detail}`);
console.log('─'.repeat(64));
console.log(` ${pass}/${rows.length} 通过\n`);

const md = [
  `# 《${song.title || slug}》质检`,
  '',
  `- 文件：\`${path.relative(ROOT, target).replace(/\\/g, '/')}\``,
  `- 时间：${new Date().toLocaleString('zh-CN')}`,
  '',
  '| 项 | 结果 | 详情 |',
  '|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |`),
  '',
  '## 人工必查',
  '',
  '- [ ] 抽 5 个歌词切换点，确认文字与唱词同步',
  '- [ ] 完整看一遍，确认没有黑帧、文字溢出、音画错位',
  '- [ ] 字体与音乐授权已确认（见 credits.md）',
  '- [ ] 发布时按平台要求标注 AI 生成内容',
  '',
].join('\n');
fs.writeFileSync(path.join(SONG_DIR, 'out', 'qc.md'), md, 'utf8');
console.log(` 已写 ${path.relative(ROOT, path.join(SONG_DIR, 'out', 'qc.md'))}\n`);

process.exit(rows.every((r) => r.pass) ? 0 : 1);
