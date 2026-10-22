// 阶段状态机：显示当前做到哪、缺什么、下一步干什么。
// node tools/stage.mjs 人生态度-王七七 [--next] [--json]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : d;
};
const NEXT = argv.includes('--next');
const JSON_OUT = argv.includes('--json');

const slug = arg('song', argv.find((a) => !a.startsWith('--')));
if (!slug) {
  console.error('用法: npm run stage -- <歌名-艺人> [--next]');
  process.exit(1);
}

const DIR = path.join(ROOT, 'songs', slug);
const songPath = path.join(DIR, 'song.json');
if (!fs.existsSync(songPath)) {
  console.error(`找不到 ${songPath}`);
  process.exit(1);
}
const song = JSON.parse(fs.readFileSync(songPath, 'utf8'));

const read = (p) => {
  const f = path.join(DIR, p);
  // 统一成 LF：文档在 Windows 上是 CRLF，正则里的 \n 会匹配不到
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : '';
};
const has = (p) => fs.existsSync(path.join(DIR, p));
const listFiles = (p, re) => (has(p) ? fs.readdirSync(path.join(DIR, p)).filter((n) => re.test(n)) : []);

// 模板没填完会留一堆 <!-- --> 注释；填完的文档注释少、正文长
const isFilled = (p, min = 500) => {
  const t = read(p);
  if (!t) return false;
  const comments = (t.match(/<!--/g) || []).length;
  return t.replace(/\s/g, '').length >= min && comments <= 2;
};

// 阶段定义：顺序 + 产物检查 + 缺口说明 + 下一步命令
const STAGES = [
  {
    id: 'source',
    name: '素材归位',
    check: () => {
      const audio = listFiles('source', /\.(mp3|wav|flac|m4a)$/i);
      const lrc = listFiles('source', /\.lrc$/i);
      // 用户自带素材（人物/背景/参考/片段）
      const own = ['character', 'background', 'reference', 'clip'].flatMap((t) =>
        listFiles(`assets/${t}`, /\.(png|jpg|jpeg|webp|gif|mp4|mov|webm|json|svg)$/i),
      );
      return {
        ok: audio.length > 0 && lrc.length > 0,
        have: `${audio.length ? audio[0] : '无音频'} / ${lrc.length ? lrc[0] : '无歌词'} / 自带素材 ${own.length}`,
        miss: [!audio.length && 'source/ 里没有音频', !lrc.length && 'source/ 里没有 .lrc'].filter(Boolean),
      };
    },
    next: `npm run mv:analyze -- ${slug}，然后跑 prompts/00-素材盘点.md 问清楚手上有什么`,
  },
  {
    id: 'analyzed',
    name: '音频分析',
    check: () => ({
      ok: has('analysis/audiomap.json') && has('analysis/lyrics.json'),
      have: has('analysis/audiomap.json') ? `${JSON.parse(read('analysis/audiomap.json')).duration}s` : '无',
      miss: [!has('analysis/audiomap.json') && '缺 audiomap.json', !has('analysis/lyrics.json') && '缺 lyrics.json'].filter(Boolean),
    }),
    next: `核对 analysis/structure.md 的 BPM 和段落，然后跑 prompts/01`,
  },
  {
    id: 'concept',
    name: '歌词解读 + MV 概念',
    check: () => {
      const a = isFilled('concept/01-歌词解读.md', 600);
      const card = read('concept/02-MV概念.md');
      // 两轮文档：看 Logline 那节有没有真内容（排除模板注释）
      const b = /##\s*一、Logline[ \t]*\n+[ \t]*(?!<!--)\S/.test(card);
      // 方向那行填了才算人真的选过
      const chose = /\|\s*方向\s*\|[^|\n]*[^\s|][^|\n]*\|/.test(card);
      const approved = !!song.approvals?.concept;
      return {
        ok: a && b && chose && approved,
        have: `${a ? '解读✓' : '解读✗'} ${b ? '概念✓' : '概念✗'} ${chose ? '已选型' : '未选型'} ${approved ? '已批准' : '未批准'}`,
        miss: [
          !a && '01-歌词解读.md 还是空模板',
          !b && '02-MV概念.md 的正文没写（Logline 起全是空）',
          b && !chose && '02 的「最终选择」表没填，方向还没拍板',
          a && b && chose && !approved && '人到场确认后，填 song.json 的 approvals.concept',
        ].filter(Boolean),
      };
    },
    next: `跑 prompts/01-歌词解读.md → prompts/02-MV概念.md（先出 3 个方向，人选完再写方案）`,
  },
  {
    id: 'style',
    name: '视觉风格',
    check: () => {
      const card = read('concept/00-风格定义.md');
      // 有色值 + 正文够长，就算写完了（模板里不会有十六进制）
      const f = /#[0-9A-Fa-f]{6}/.test(card) && card.replace(/\s/g, '').length >= 500;
      const chose = /###\s*选定/.test(card) && /-\s*选了[：:][ \t]*\S/m.test(card);
      const p = (song.style?.palette || []).length >= 3;
      const font = !!song.style?.font;
      const approved = !!song.approvals?.style;
      return {
        ok: f && chose && p && font && approved,
        have: `${f ? '风格卡✓' : '风格卡✗'} ${chose ? '已选样式' : '未选样式'} ${p ? `${song.style.palette.length}色` : '调色板✗'} ${font ? '字体✓' : '字体✗'} ${approved ? '已批准' : '未批准'}`,
        miss: [
          !f && '00-风格定义.md 没写完（要有十六进制色值）',
          f && !chose && '样式候选的「选定」没填，方案还没拍板',
          !p && 'song.json 的 style.palette 少于 3 个色',
          !font && 'song.json 的 style.font 没填',
          f && chose && p && font && !approved && '人确认后填 song.json 的 approvals.style',
        ].filter(Boolean),
      };
    },
    next: `跑 prompts/05-风格定义.md（先出 3 套样式，人选完再写规范），把色彩和字体回填 song.json`,
  },
  {
    id: 'storyboard',
    name: '分镜',
    check: () => {
      const hasSb = has('concept/storyboard.json');
      let ok = hasSb;
      let detail = hasSb ? '' : '缺 storyboard.json';
      if (hasSb) {
        try {
          const sb = JSON.parse(read('concept/storyboard.json'));
          const n = sb.shots?.length || 0;
          ok = n > 0;
          detail = `${n} 个镜头`;
        } catch {
          ok = false;
          detail = 'storyboard.json 解析失败';
        }
      }
      const approved = !!song.approvals?.storyboard;
      return {
        ok: ok && approved,
        have: `${detail} ${approved ? '已批准' : '未批准'}`,
        miss: [!ok && '分镜缺失或无效', ok && !approved && '分镜还没人工批准（填 song.json 的 approvals.storyboard）'].filter(Boolean),
      };
    },
    next: `npm run mv:validate -- ${slug}，人审通过后在 song.json 填 approvals.storyboard`,
  },
  {
    id: 'refs',
    name: '参考图',
    check: () => {
      const imgs = listFiles('refs', /\.(png|jpg|jpeg|webp)$/i);
      const prompts = listFiles('concept/prompts', /\.md$/i).filter((n) => n !== 'README.md');
      return {
        ok: imgs.length >= 3,
        have: `${imgs.length} 张图 / ${prompts.length} 份提示词`,
        miss: [imgs.length < 3 && 'refs/ 少于 3 张（建议 6–10 张）', imgs.length > prompts.length && '有图没存提示词'].filter(Boolean),
      };
    },
    next: `跑 prompts/04-图像提示词.md，图存 refs/，提示词存 concept/prompts/`,
  },
  {
    id: 'building',
    name: '渲染工程',
    check: () => {
      const hasCanvas = has('project/src/index.html');
      const hasRemotion = has('project/src/Root.tsx');
      if (!hasCanvas && !hasRemotion) {
        return { ok: false, have: '无', miss: ['project/src/ 里没有可运行工程'] };
      }
      // 只有从 engines 复制的模板、没做任何定制时，不算完成
      const isTemplate = (() => {
        try {
          const a = fs.readFileSync(path.join(DIR, 'project/src/main.js'), 'utf8');
          const b = fs.readFileSync(path.join(ROOT, 'engines/canvas/template/main.js'), 'utf8');
          return a === b;
        } catch {
          return false;
        }
      })();
      if (isTemplate) {
        return { ok: false, have: '只有模板，未定制', miss: ['project/src/ 还是 engines 里的模板，没按分镜写'] };
      }
      return { ok: true, have: hasRemotion ? 'Remotion 工程' : 'canvas 工程（已定制）', miss: [] };
    },
    next: `抽帧验收再渲全片：npm run mv:snap -- ${slug} --times 12,45,80,120 → npm run mv:render -- ${slug} --workers 6 → npm run mv:check -- ${slug}`,
  },
  {
    id: 'rendered',
    name: '成片',
    check: () => {
      const vids = listFiles('out', /\.mp4$/i);
      return { ok: vids.length > 0, have: vids.length ? vids.join(', ') : '无', miss: [!vids.length && 'out/ 里没有 mp4'].filter(Boolean) };
    },
    next: `npm run mv:check -- ${slug}`,
  },
];

const ORDER = STAGES.map((s) => s.id);
let cur = song.stage || 'source';
if (!ORDER.includes(cur)) {
  console.error(`song.json 的 stage "${cur}" 不在状态序列里：${ORDER.join(' → ')}`);
  process.exit(1);
}

const results = STAGES.map((s) => ({ ...s, ...s.check() }));
const curIdx = ORDER.indexOf(cur);

if (JSON_OUT) {
  console.log(JSON.stringify({ slug, stage: cur, stages: results.map((r) => ({ id: r.id, name: r.name, ok: r.ok, have: r.have, miss: r.miss })) }, null, 2));
  process.exit(0);
}

console.log(`\n《${song.title || slug}》  ${song.artist || ''}\n` + '─'.repeat(66));
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const mark = i < curIdx ? '✓' : i === curIdx ? (r.ok ? '●' : '○') : '·';
  const tag = i === curIdx ? '← 当前' : '';
  console.log(` ${mark}  ${String(i).padStart(1)}. ${r.name.padEnd(14)} ${r.have.padEnd(24)} ${tag}`);
  if (i === curIdx && r.miss.length) for (const m of r.miss) console.log(`      ✗ ${m}`);
}
console.log('─'.repeat(66));

const current = results[curIdx];
if (!current.ok) {
  console.log(`\n 当前阶段未完成，缺：\n${current.miss.map((m) => '   - ' + m).join('\n')}`);
  console.log(`\n 下一步：${current.next}\n`);
  process.exit(1);
}

console.log(`\n 当前阶段已完成。下一步：${current.next}`);
if (NEXT) {
  const nextStage = ORDER[curIdx + 1];
  if (!nextStage) {
    console.log('\n 已经是最后一步了。\n');
    process.exit(0);
  }
  song.stage = nextStage;
  fs.writeFileSync(songPath, JSON.stringify(song, null, 2) + '\n', 'utf8');
  const nextObj = STAGES.find((s) => s.id === nextStage);
  console.log(` 已推进到：${nextStage}`);
  if (nextObj) console.log(` 这一步要做的：${nextObj.next}\n`);
} else {
  console.log(` 确认后跑 npm run stage -- ${slug} --next 推进\n`);
}
