// 时间轴重定时：音频换版本（时长不同、内容同源）时按比例缩放分镜时间
// node tools/retime.mjs 人生态度-王七七 --scale 1.020407
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const si = argv.indexOf('--scale');
const scale = si >= 0 ? Number(argv[si + 1]) : NaN;
const name = argv.find((a) => !a.startsWith('--') && isNaN(Number(a)));

if (!name || !(scale > 0)) {
  console.error('用法: node tools/retime.mjs <歌名-艺人> --scale 1.020407');
  process.exit(1);
}

const SONG_DIR = path.join(ROOT, 'songs', name);
const sbPath = path.join(SONG_DIR, 'concept', 'storyboard.json');
const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
const round = (v) => +v.toFixed(3);

let last = 0;
for (const shot of sb.shots) {
  shot.start = round(shot.start * scale);
  shot.end = round(shot.end * scale);
  last = shot.end;
}
fs.writeFileSync(sbPath, JSON.stringify(sb, null, 2) + '\n', 'utf8');

console.log(`[retime] ${sb.shots.length} 镜 × ${scale} → 末镜结束 ${last}s`);
