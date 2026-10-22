// 由 storyboard.json 生成人读的分镜表（03-分镜表.md）
// node tools/storyboard-md.mjs 人生态度-王七七
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const slug = process.argv.slice(2).find((a) => !a.startsWith('-'));
if (!slug) {
  console.error('用法: node tools/storyboard-md.mjs <歌名-艺人>');
  process.exit(1);
}

const SONG_DIR = path.join(ROOT, 'songs', slug);
const sbPath = path.join(SONG_DIR, 'concept', 'storyboard.json');
const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
const shots = sb.shots || [];
if (!shots.length) {
  console.error('分镜为空');
  process.exit(1);
}

const total = shots[shots.length - 1].end;
const avg = (total / shots.length).toFixed(1);
const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);

const rows = shots.map((s) => {
  const dur = s.end - s.start;
  const ly = (s.lyrics || []).length ? s.lyrics.join(' / ') : '—';
  return `| ${s.id} | ${fmt(s.start)}–${fmt(s.end)} | ${fmt(dur)}s | ${ly} | ${s.visual} | ${s.camera} | ${s.motion} |`;
});

const md = `# 分镜表

> 视觉风格见 \`00-风格定义.md\`；机器可读版本是同目录的 \`storyboard.json\`。
> 本文件由 \`npm run sb:md -- ${slug}\` 从 JSON 生成，不要手改。

全曲 ${fmt(total)}s · 镜头 ${shots.length} 个 · 平均每镜 ${avg}s

| # | 时间 | 时长 | 歌词 | 画面 | 镜头 | 元素动 |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;

fs.writeFileSync(path.join(SONG_DIR, 'concept', '03-分镜表.md'), md, 'utf8');
console.log(`[storyboard] ${shots.length} 镜 → concept/03-分镜表.md`);
