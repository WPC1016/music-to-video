// 建一首歌的目录骨架，可选直接导入素材并分析。
// node tools/new-song.mjs "人生态度-王七七"
// node tools/new-song.mjs "人生态度-王七七" --audio "D:/Downloads/xx.mp3" --lrc "D:/Downloads/xx.lrc"
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : undefined;
};

// slug 必须是第一个参数
const realSlug = argv[0] && !argv[0].startsWith('--') ? argv[0] : undefined;
if (!realSlug) {
  console.error(`用法:
  npm run mv:new -- "歌名-艺人"
  npm run mv:new -- "歌名-艺人" --audio "路径.mp3" --lrc "路径.lrc"`);
  process.exit(1);
}

const TPL = path.join(ROOT, 'songs', '_template');
const DIR = path.join(ROOT, 'songs', realSlug);
if (!fs.existsSync(TPL)) {
  console.error(`模板目录缺失: ${TPL}`);
  process.exit(1);
}

const idx = realSlug.lastIndexOf('-');
const title = idx > 0 ? realSlug.slice(0, idx) : realSlug;
const artist = idx > 0 ? realSlug.slice(idx + 1) : '';
const existed = fs.existsSync(DIR);
let created = 0;

// 递归复制，已存在的文件不覆盖
function copy(src, dst) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copy(s, d);
    } else if (!fs.existsSync(d)) {
      let buf = fs.readFileSync(s);
      if (/\.(md|json)$/i.test(entry.name)) {
        buf = Buffer.from(
          buf
            .toString('utf8')
            .replaceAll('__TITLE__', title)
            .replaceAll('__ARTIST__', artist)
            .replaceAll('__SLUG__', realSlug),
          'utf8',
        );
      }
      fs.writeFileSync(d, buf);
      created++;
    }
  }
}

// 运行产物目录（不进模板，单独建）
for (const sub of ['source', 'analysis', 'refs', 'project/src', 'frames', 'out', 'snap', 'logs', 'assets/character', 'assets/background', 'assets/reference', 'assets/clip']) {
  fs.mkdirSync(path.join(DIR, sub), { recursive: true });
}
copy(TPL, DIR);

console.log(`${existed ? '已补全' : '已创建'} songs/${realSlug}/  （${created} 个文件）`);

// ---------- 导入素材 ----------
const songPath = path.join(DIR, 'song.json');
const song = JSON.parse(fs.readFileSync(songPath, 'utf8'));
let imported = 0;

function importFile(src, targetName) {
  if (!src) return false;
  const abs = path.resolve(src);
  if (!fs.existsSync(abs)) {
    console.error(`  ! 找不到文件：${src}`);
    return false;
  }
  const dst = path.join(DIR, 'source', targetName);
  if (fs.existsSync(dst)) {
    console.log(`  · 已存在，跳过：source/${targetName}`);
  } else {
    fs.copyFileSync(abs, dst);
    console.log(`  → source/${targetName}`);
    imported++;
  }
  return true;
}

const audioIn = arg('audio');
const lrcIn = arg('lrc');

if (audioIn) {
  const ext = path.extname(audioIn).toLowerCase() || '.mp3';
  if (importFile(audioIn, `${title}${ext}`)) song.source.audio = `source/${title}${ext}`;
}
if (lrcIn) {
  if (importFile(lrcIn, `${realSlug}.lrc`)) song.source.lrc = `source/${realSlug}.lrc`;
}

// 没指定路径时，看看 source/ 里是不是已经放过东西了
if (!audioIn || !lrcIn) {
  const files = fs.readdirSync(path.join(DIR, 'source'));
  const audio = files.find((n) => /\.(mp3|wav|flac|m4a)$/i.test(n));
  const lrc = files.find((n) => /\.lrc$/i.test(n));
  if (!audioIn && audio) song.source.audio = `source/${audio}`;
  if (!lrcIn && lrc) song.source.lrc = `source/${lrc}`;
}

fs.writeFileSync(songPath, JSON.stringify(song, null, 2) + '\n', 'utf8');

// ---------- 自动分析 ----------
if (song.source.audio && song.source.lrc) {
  if (argv.includes('--no-analyze')) {
    console.log('\n素材齐了（跳过了自动分析）。跑 npm run mv:analyze 出分析结果。');
  } else {
    console.log('\n自动分析中…');
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'tools/analyze.mjs'), realSlug], { stdio: 'inherit' });
    } catch {
      console.error('  分析失败，检查音频格式，或手动跑 npm run mv:analyze');
    }
  }
} else {
  const miss = [!song.source.audio && '音频', !song.source.lrc && '.lrc 歌词'].filter(Boolean);
  console.log(`\n素材还缺：${miss.join('、')}`);
  console.log(`  放进 songs/${realSlug}/source/ 之后跑 npm run mv:analyze -- ${realSlug}`);
}

console.log('\n下一步：');
console.log(`  npm run stage -- ${realSlug}     # 看当前该做什么`);
console.log('  然后按 prompts/01 → 02 → 05 → 03 → 04 的顺序跑');
