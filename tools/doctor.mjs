// 环境自检：任何 AI 工具接手项目，先跑这个。
// node tools/doctor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

const rows = [];
const ok = (name, detail) => rows.push({ s: 'OK', name, detail });
const warn = (name, detail) => rows.push({ s: 'WARN', name, detail });
const bad = (name, detail) => rows.push({ s: 'FAIL', name, detail });

function version(cmd, args = ['-version']) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 });
    return out.split('\n')[0].trim();
  } catch {
    return null;
  }
}

// --- Node ---
const major = Number(process.versions.node.split('.')[0]);
major >= 22
  ? ok('Node.js', `v${process.versions.node}`)
  : bad('Node.js', `v${process.versions.node}，需要 >= 22（WebSocket / import.meta.dirname）`);

// --- FFmpeg ---
const ff = version('ffmpeg');
ff ? ok('ffmpeg', ff) : bad('ffmpeg', '未找到，需加入 PATH（full build，含 loudnorm）');
const fp = version('ffprobe');
fp ? ok('ffprobe', fp) : bad('ffprobe', '未找到，mv:check 依赖它校验时长');

// --- 浏览器 ---
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const found = browsers.find((p) => fs.existsSync(p));
found ? ok('Chrome/Edge', found) : bad('Chrome/Edge', '未找到，canvas 引擎无法渲染');

// --- Python（可选） ---
const py = version('python', ['--version']);
if (py) {
  let hasLibrosa = false;
  try {
    execFileSync('python', ['-c', 'import librosa'], { stdio: 'ignore', timeout: 15000 });
    hasLibrosa = true;
  } catch {}
  hasLibrosa
    ? ok('Python + librosa', py)
    : warn('Python', `${py}，但没装 librosa —— 只有需要更准的节拍分析时才要它`);
} else {
  warn('Python', '未找到，不影响 canvas / hyperframes 流程');
}

// --- 目录契约 ---
const required = ['AGENTS.md', 'package.json', 'songs', 'tools', 'engines', 'docs'];
const missing = required.filter((p) => !fs.existsSync(path.join(ROOT, p)));
missing.length === 0 ? ok('项目结构', '完整') : bad('项目结构', `缺少 ${missing.join(', ')}`);

// --- 已有歌曲 ---
const songsDir = path.join(ROOT, 'songs');
let songs = [];
if (fs.existsSync(songsDir)) {
  // 下划线开头是模板/归档，不算歌曲
  songs = fs.readdirSync(songsDir).filter((d) => !d.startsWith('_') && fs.statSync(path.join(songsDir, d)).isDirectory());
}
if (songs.length === 0) {
  warn('歌曲', '还没有歌曲目录，用 npm run mv:new 创建');
} else {
  for (const s of songs) {
    const dir = path.join(songsDir, s);
    const has = (p) => fs.existsSync(path.join(dir, p));
    const wl = path.join(dir, 'worklog.md');
    let phase = '无 worklog';
    if (fs.existsSync(wl)) {
      const m = fs.readFileSync(wl, 'utf8').match(/当前阶段：\*\*(.+?)\*\*/);
      phase = m ? m[1] : 'worklog 未填阶段';
    }
    let shotInfo = '无分镜';
    if (has('concept/storyboard.json')) {
      try {
        const sb = JSON.parse(fs.readFileSync(path.join(dir, 'concept/storyboard.json'), 'utf8'));
        let approved = false;
        try {
          approved = !!JSON.parse(fs.readFileSync(path.join(dir, 'song.json'), 'utf8')).approvals?.storyboard;
        } catch {
          /* song.json 缺失时按未批准处理 */
        }
        shotInfo = `${(sb.shots || []).length} 镜${approved ? '（已批准）' : '（待批准）'}`;
      } catch {
        shotInfo = '分镜 JSON 解析失败';
      }
    }
    const state = [
      has('song.json') ? 'song.json' : 'song.json(缺)',
      has('analysis/audiomap.json') ? 'analyzed' : '未分析',
      shotInfo,
      has('refs') && fs.readdirSync(path.join(dir, 'refs')).length ? `${fs.readdirSync(path.join(dir, 'refs')).length} 张参考图` : '无参考图',
    ].join(' / ');
    ok(`歌曲 ${s}`, `${state}  ·  ${phase}`);
  }
}

// --- skill 链接 ---
const skillSrc = path.join(ROOT, '.agents', 'skills', 'music-video', 'SKILL.md');
if (!fs.existsSync(skillSrc)) {
  bad('skill 真身', '缺少 .agents/skills/music-video/SKILL.md');
} else {
  const links = ['.claude/skills', '.workbuddy/skills', '.cursor/skills', '.zcode/skills'];
  const broken = links.filter((l) => !fs.existsSync(path.join(ROOT, l, 'music-video', 'SKILL.md')));
  broken.length === 0
    ? ok('skill 链接', `4 个工具目录已链接`)
    : warn('skill 链接', `${broken.length} 个未链接（${broken.join(' ')}），跑 npm run skills:link`);
}

// --- 输出 ---
console.log('\n music-to-video · 环境自检\n' + '─'.repeat(72));
for (const r of rows) {
  const mark = r.s === 'OK' ? 'OK  ' : r.s === 'WARN' ? 'WARN' : 'FAIL';
  console.log(` ${mark}  ${r.name.padEnd(18)} ${r.detail}`);
}
console.log('─'.repeat(72));

const fails = rows.filter((r) => r.s === 'FAIL');
if (fails.length) {
  console.log(` ${fails.length} 项不通过，按 docs/toolchain.md 修复后再继续。\n`);
  process.exit(1);
}
console.log(' 环境可用。\n');
