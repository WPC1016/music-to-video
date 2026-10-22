// Canvas 引擎全片渲染：本地静态服务 -> headless Chrome 逐帧截图 -> ffmpeg 合成
// node engines/canvas/render.mjs 人生态度-王七七 [--from 0] [--to 156] [--workers 6] [--skip-encode]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { startServer } from './server.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};
const flag = (name) => argv.includes('--' + name);

const slug = arg('song', argv.find((a) => !a.startsWith('--') && !/^\d/.test(a)));
if (!slug) {
  console.error('用法: npm run mv:render -- <歌名-艺人> [--workers 6] [--from 0] [--to 156]');
  process.exit(1);
}

const SONG_DIR = path.join(ROOT, 'songs', slug);
const songPath = path.join(SONG_DIR, 'song.json');
if (!fs.existsSync(songPath)) {
  console.error(`找不到 ${songPath}`);
  process.exit(1);
}
const song = JSON.parse(fs.readFileSync(songPath, 'utf8'));
// 画幅：兼容新格式 format.primary 与旧字段 canvas
const fmt = song.format?.[song.format?.primary] || song.canvas || { width: 1080, height: 1920, fps: 30 };
const FPS = Number(arg('fps', fmt.fps));
const W = fmt.width;
const H = fmt.height;

const audiomapPath = path.join(SONG_DIR, 'analysis', 'audiomap.json');
const audiomap = fs.existsSync(audiomapPath) ? JSON.parse(fs.readFileSync(audiomapPath, 'utf8')) : null;
const DURATION = Number(arg('to', audiomap?.duration ?? 0));
if (!DURATION) {
  console.error('拿不到时长：先跑 npm run mv:analyze，或用 --to 指定秒数');
  process.exit(1);
}

const FROM = Number(arg('from', 0));
const TO = Number(arg('to', DURATION));
const WORKERS = Number(arg('workers', 6));
const FORMAT = arg('format', 'jpeg');
const QUALITY = Number(arg('quality', 92));
const CRF = Number(arg('crf', 17));
const FRAMES_DIR = path.join(SONG_DIR, 'frames');
const OUT_DIR = path.join(SONG_DIR, 'out');

const entry = ['project/src/index.html', 'project/index.html'].map((p) => path.join(SONG_DIR, p)).find((p) => fs.existsSync(p));
if (!entry) {
  console.error(`找不到入口：${path.join(SONG_DIR, 'project/src/index.html')}`);
  console.error('先按 docs/workflow.md 的 Step 5 写渲染代码，或从 engines/canvas/template 复制一份。');
  process.exit(1);
}

const CHROME =
  arg('chrome', '') ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(
    (p) => fs.existsSync(p),
  );
if (!CHROME) {
  console.error('找不到 Chrome / Edge');
  process.exit(1);
}

fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const f0 = Math.round(FROM * FPS);
const f1 = Math.round(TO * FPS);
const total = f1 - f0;
const t0 = Date.now();
let done = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms))]);

async function getJSON(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(150);
  }
  throw new Error('devtools 未就绪: ' + url);
}

class Page {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  open() {
    return new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result?.value;
  }
}

const { server, port: PORT } = await startServer(SONG_DIR);
const PAGE_URL = `http://127.0.0.1:${PORT}/${path.relative(SONG_DIR, entry).replace(/\\/g, '/')}`;
const PORT_BASE = 18100 + (process.pid % 500);

console.log(`[render] ${slug}  ${W}x${H} @${FPS}fps  ${FROM}s→${TO}s  共 ${total} 帧  ${WORKERS} 进程`);
console.log(`[render] page: ${PAGE_URL}`);

async function worker(wi, chunk) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `mvprof${wi}-`));
  const port = PORT_BASE + wi;
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=' + port,
      '--user-data-dir=' + profile,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-lcd-text',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      '--mute-audio',
      `--window-size=${W},${H}`,
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  proc.stderr.on('data', (d) => (stderr += d.toString()));

  try {
    const list = await getJSON(`http://127.0.0.1:${port}/json/list`);
    const target = list.find((t) => t.type === 'page');
    const page = new Page(target.webSocketDebuggerUrl);
    await page.open();
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: PAGE_URL });

    const waitReady = async () => {
      for (let i = 0; i < 400; i++) {
        await sleep(150);
        try {
          if (await withTimeout(page.evaluate('window.__ready === true'), 5000, 'ready')) return true;
        } catch {}
      }
      return false;
    };
    if (!(await waitReady())) throw new Error('页面没有 ready。stderr=' + stderr.slice(-1200));

    // 防止连到别的工具的页面
    const href = await withTimeout(page.evaluate('location.href'), 5000, 'href');
    if (!String(href).startsWith(`http://127.0.0.1:${PORT}/`)) {
      throw new Error('连到了错误的页面: ' + href);
    }

    for (let f = chunk.start; f < chunk.end; f++) {
      const t = f / FPS;
      let shot = null;
      for (let attempt = 0; attempt < 3 && !shot; attempt++) {
        try {
          await withTimeout(page.evaluate(`window.renderFrame(${t.toFixed(5)})`), 20000, 'render');
          shot = await withTimeout(
            page.send('Page.captureScreenshot', {
              format: FORMAT === 'jpeg' ? 'jpeg' : 'png',
              quality: FORMAT === 'jpeg' ? QUALITY : undefined,
              fromSurface: true,
              captureBeyondViewport: false,
            }),
            20000,
            'shot',
          );
        } catch (e) {
          console.log(`[warn] 帧 ${f} ${e.message}（第 ${attempt + 1} 次），重载页面`);
          try {
            await page.send('Page.navigate', { url: PAGE_URL });
          } catch {}
          await sleep(600);
          if (!(await waitReady())) console.log('[warn] 重载后仍未 ready');
        }
      }
      if (!shot) {
        console.log(`[fail] 帧 ${f} 放弃`);
        continue;
      }
      const name = 'f' + String(f).padStart(5, '0') + (FORMAT === 'jpeg' ? '.jpg' : '.png');
      fs.writeFileSync(path.join(FRAMES_DIR, name), Buffer.from(shot.data, 'base64'));
      done++;
      if (done % 90 === 0) {
        const el = (Date.now() - t0) / 1000;
        const rate = done / el;
        console.log(`[render] ${done}/${total}  ${rate.toFixed(1)} fps  已用 ${(el / 60).toFixed(1)}m  剩余约 ${((total - done) / rate / 60).toFixed(1)}m`);
      }
    }
  } finally {
    try {
      proc.kill();
    } catch {}
    await sleep(300);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}

const per = Math.ceil(total / WORKERS);
const chunks = [];
for (let i = 0; i < WORKERS; i++) {
  const start = f0 + i * per;
  const end = Math.min(f1, start + per);
  if (start < end) chunks.push({ start, end });
}

try {
  await Promise.all(chunks.map((c, i) => worker(i, c)));
} finally {
  server.close();
}

console.log(`[render] 渲染结束，用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分钟`);

// ---------- 帧完整性 ----------
const ext = FORMAT === 'jpeg' ? 'jpg' : 'png';
const missing = [];
for (let f = f0; f < f1; f++) {
  if (!fs.existsSync(path.join(FRAMES_DIR, `f${String(f).padStart(5, '0')}.${ext}`))) missing.push(f);
}
if (missing.length) {
  console.log(`[check] 缺 ${missing.length} 帧：${missing.slice(0, 12).join(',')}${missing.length > 12 ? ' ...' : ''}`);
  console.log(`[check] 补渲：--from ${(missing[0] / FPS).toFixed(2)} --to ${((missing[missing.length - 1] + 1) / FPS).toFixed(2)}`);
} else {
  console.log(`[check] 帧完整 ${f0}–${f1 - 1}`);
}

if (flag('skip-encode')) {
  console.log('[encode] 已跳过');
  process.exit(missing.length ? 2 : 0);
}
if (missing.length) {
  console.error('[encode] 有缺帧，先补渲再合成');
  process.exit(2);
}
if (FROM > 0) {
  console.log('[encode] 局部渲染不合成');
  process.exit(0);
}

// ---------- ffmpeg 合成 ----------
// song.source.audio 是相对歌曲目录的路径（analyze 回填），不要再拼 source/
const audio = song.source?.audio
  ? path.resolve(SONG_DIR, song.source.audio)
  : path.join(SONG_DIR, 'source', fs.readdirSync(path.join(SONG_DIR, 'source')).find((n) => /\.(mp3|wav|flac|m4a)$/i.test(n)));
const dur = audiomap?.duration ?? TO;
// 局部渲染时按实际帧数收口，避免音频比画面长
const outDur = Math.min(dur, (f1 - f0) / FPS);
const outFile = path.join(OUT_DIR, `${slug}_${W}x${H}${outDur < dur - 0.01 ? '_part' : ''}.mp4`);

console.log('[encode] ffmpeg 合成中...');
execFileSync(
  'ffmpeg',
  [
    '-y', '-v', 'error',
    '-framerate', String(FPS),
    '-start_number', String(f0),
    '-i', path.join(FRAMES_DIR, `f%05d.${ext}`),
    '-ss', String(FROM),
    '-i', audio,
    '-filter_complex',
    `[0:v]fade=t=in:st=0:d=1.0,fade=t=out:st=${Math.max(0, outDur - 1.6).toFixed(2)}:d=1.6[v];` +
      `[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad=whole_dur=${outDur.toFixed(3)}[a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k',
    '-t', String(outDur.toFixed(3)),
    '-movflags', '+faststart',
    outFile,
  ],
  { stdio: 'inherit' },
);

const stat = fs.statSync(outFile);
song.status = 'rendered';
song.output = path.relative(SONG_DIR, outFile).replace(/\\/g, '/');
fs.writeFileSync(songPath, JSON.stringify(song, null, 2) + '\n', 'utf8');

console.log(`[done] ${path.relative(ROOT, outFile)}  ${(stat.size / 1048576).toFixed(1)} MB`);
console.log('[done] 接着跑 npm run mv:check 做质检');
