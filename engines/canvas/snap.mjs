// 抽帧预览：改完画面先看几张图，比渲染全片便宜 1000 倍
// node engines/canvas/snap.mjs 人生态度-王七七 --times 12,45,80,120,150
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { startServer } from './server.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};

const slug = arg('song', argv.find((a) => !a.startsWith('--') && !/^[\d.,]+$/.test(a)));
if (!slug) {
  console.error('用法: npm run mv:snap -- <歌名-艺人> --times 12,45,80');
  process.exit(1);
}
const SONG_DIR = path.join(ROOT, 'songs', slug);
const song = JSON.parse(fs.readFileSync(path.join(SONG_DIR, 'song.json'), 'utf8'));
const fmt = song.format?.[song.format?.primary] || song.canvas || { width: 1080, height: 1920, fps: 30 };
const W = Number(arg('width', fmt.width));
const H = Number(arg('height', fmt.height));
const times = String(arg('times', '5,30,60,90,120'))
  .split(',')
  .map(Number)
  .filter((n) => Number.isFinite(n));
const OUT = path.join(SONG_DIR, arg('out', 'snap'));

const entry = ['project/src/index.html', 'project/index.html'].map((p) => path.join(SONG_DIR, p)).find((p) => fs.existsSync(p));
if (!entry) {
  console.error(`找不到 ${path.join(SONG_DIR, 'project/src/index.html')}`);
  process.exit(1);
}
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + label)), ms))]);

const { server, port } = await startServer(SONG_DIR);
const PAGE_URL = `http://127.0.0.1:${port}/${path.relative(SONG_DIR, entry).replace(/\\/g, '/')}`;
const dbgPort = 18800 + (process.pid % 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mvsnap-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', `--window-size=${W},${H}`, 'about:blank'], {
  stdio: ['ignore', 'ignore', 'pipe'],
});

let list;
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${dbgPort}/json/list`);
    if (r.ok) {
      list = await r.json();
      break;
    }
  } catch {}
  await sleep(150);
}
const target = list?.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
});
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result?.value;
};

try {
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE_URL });

  let ready = false;
  for (let i = 0; i < 300; i++) {
    await sleep(150);
    try {
      if (await withTimeout(evaluate('window.__ready === true'), 4000, 'ready')) {
        ready = true;
        break;
      }
    } catch {}
  }
  if (!ready) throw new Error('页面没有 ready（检查 window.__ready = true 有没有设置）');

  for (const t of times) {
    await withTimeout(evaluate(`window.renderFrame(${t})`), 20000, 'render');
    await sleep(60);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92, fromSurface: true, captureBeyondViewport: false });
    const file = path.join(OUT, `t${String(t).padStart(3, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  ${path.relative(ROOT, file)}`);
  }
  console.log(`\n已出 ${times.length} 张 → ${path.relative(ROOT, OUT)}/`);
} finally {
  try {
    proc.kill();
  } catch {}
  server.close();
  await sleep(200);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {}
}
