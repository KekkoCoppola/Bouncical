import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mid': 'audio/midi',
};

const rootDir = process.cwd();

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(r => server.listen(3456, r));
console.log('Server listening on http://localhost:3456');

// Spawn Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome-cdp-' + Date.now());
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
]);

// Wait for CDP to be ready
let wsUrl = null;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const list = await res.json();
    if (list && list[0] && list[0].webSocketDebuggerUrl) {
      wsUrl = list[0].webSocketDebuggerUrl;
      break;
    }
  } catch (e) {}
}

if (!wsUrl) {
  console.error('Failed to get WebSocket debugger URL');
  chrome.kill();
  server.close();
  process.exit(1);
}

console.log('Connected to CDP at', wsUrl);

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let msgId = 0;
const callbacks = new Map();
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && callbacks.has(data.id)) {
    callbacks.get(data.id)(data);
    callbacks.delete(data.id);
  }
};

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    callbacks.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expr) {
  return await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false,
});

await send('Page.navigate', { url: 'http://localhost:3456/index.html' });
await new Promise(r => setTimeout(r, 1500));

// Capture splash screenshot
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('design/before/test-splash.png', Buffer.from(shot.result.data, 'base64'));
console.log('Captured test-splash.png');

ws.close();
chrome.kill();
server.close();
process.exit(0);
