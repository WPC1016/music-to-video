// 把 .agents/skills 里的项目级 skill 链到各 AI 工具的查找目录。
// 真身只有一份，其余都是链接。改 skill 只改 .agents/skills。
// node tools/link-skills.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, '.agents', 'skills');
const FORCE = process.argv.includes('--force');

// 各工具的 skill 查找目录（相对项目根）
const TARGETS = [
  { tool: 'Claude Code', dir: '.claude/skills' },
  { tool: 'WorkBuddy', dir: '.workbuddy/skills' },
  { tool: 'Cursor', dir: '.cursor/skills' },
  { tool: 'ZCode', dir: '.zcode/skills' },
];

if (!fs.existsSync(SRC_DIR)) {
  console.error(`没有 ${SRC_DIR}`);
  process.exit(1);
}

const skills = fs.readdirSync(SRC_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
if (!skills.length) {
  console.error('.agents/skills 下没有 skill');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const results = [];

function linkOne(src, link) {
  if (fs.existsSync(link)) {
    const st = fs.lstatSync(link);
    if (st.isSymbolicLink() || (isWin && st.isDirectory())) {
      if (!FORCE) return 'skip';
      fs.rmSync(link, { recursive: true, force: true });
    } else {
      fs.rmSync(link, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(path.dirname(link), { recursive: true });
  if (isWin) {
    // junction：目录联接，不需要管理员权限，Git Bash 下也能用
    execFileSync('cmd', ['/c', 'mklink', '/J', link.replace(/\//g, '\\'), src.replace(/\//g, '\\')], { stdio: 'ignore' });
  } else {
    fs.symlinkSync(path.relative(path.dirname(link), src), link, 'dir');
  }
  return 'ok';
}

for (const t of TARGETS) {
  const base = path.join(ROOT, t.dir);
  for (const s of skills) {
    const src = path.join(SRC_DIR, s);
    const link = path.join(base, s);
    try {
      const r = linkOne(src, link);
      results.push({ tool: t.tool, skill: s, dir: t.dir, r });
    } catch (e) {
      results.push({ tool: t.tool, skill: s, dir: t.dir, r: 'fail', msg: e.message.slice(0, 80) });
    }
  }
}

console.log('\n skill 链接\n' + '─'.repeat(70));
for (const r of results) {
  const mark = r.r === 'ok' ? 'OK  ' : r.r === 'skip' ? 'SKIP' : 'FAIL';
  console.log(` ${mark}  ${r.tool.padEnd(12)} ${r.skill}  →  ${r.dir}/${r.skill}`);
  if (r.msg) console.log(`       ${r.msg}`);
}
console.log('─'.repeat(70));

const fails = results.filter((r) => r.r === 'fail');
if (fails.length) {
  console.log(` ${fails.length} 个失败。Windows 上通常是权限或路径被占用，关掉对应工具再试。\n`);
  process.exit(1);
}
console.log(' 完成。真身在 .agents/skills，其余都是 junction，改真身即可。\n');
