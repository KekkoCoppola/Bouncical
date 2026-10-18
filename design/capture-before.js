import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

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
console.log('Server started on :3456');

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const outDir = path.join(rootDir, 'design', 'before');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function captureAll(width, height, suffix) {
  console.log(`Starting capture for ${suffix} (${width}x${height})...`);
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  // 1. Splash
  await page.goto('http://localhost:3456/index.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, `01-splash-${suffix}.png`) });

  // 2. Editor Empty (click start)
  await page.click('#splash-start');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, `02-editor-empty-${suffix}.png`) });

  // 3. Format menu
  await page.click('#btn-format');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, `03-format-menu-${suffix}.png`) });
  await page.click('#btn-format'); // close menu

  // 4. Panel Scenes
  await page.click('[data-panel="scenes"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `04-panel-scenes-${suffix}.png`) });

  // Load a scene from the panel
  await page.evaluate(() => {
    const sceneBtn = document.querySelector('#panel-scenes .scene-card');
    if (sceneBtn) sceneBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  // If confirmation modal is open, click load scene
  await page.evaluate(() => {
    const modal = document.querySelector('#modal');
    if (modal && !modal.hidden) {
      const btn = modal.querySelector('.btn.primary');
      if (btn) btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Close any panel before editor screenshot
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Editor with Scene
  await page.screenshot({ path: path.join(outDir, `05-editor-scene-${suffix}.png`) });

  // 6. Panel Music
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await page.click('[data-panel="music"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `06-panel-music-${suffix}.png`) });

  // 7. Panel Rules
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await page.click('[data-panel="rules"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `07-panel-rules-${suffix}.png`) });

  // 8. Panel World
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await page.click('[data-panel="world"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `08-panel-world-${suffix}.png`) });

  // 9. Panel FX
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await page.click('[data-panel="fx"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `09-panel-fx-${suffix}.png`) });

  // Close panels
  await page.evaluate(() => {
    const close = document.querySelector('.panel.open .panel-close');
    if (close) close.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // 10. Panel Shape (select a shape with move tool)
  await page.evaluate(() => {
    const moveBtn = document.querySelector('[data-tool="move"]');
    if (moveBtn) moveBtn.click();
    // open shape panel directly or trigger select
    const p = document.querySelector('#panel-shape');
    if (p) {
      p.hidden = false;
      p.classList.add('open');
      document.body.classList.add('panel-open');
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `10-panel-shape-${suffix}.png`) });

  // Close panel
  await page.evaluate(() => {
    const p = document.querySelector('#panel-shape');
    if (p) {
      p.hidden = true;
      p.classList.remove('open');
      document.body.classList.remove('panel-open');
    }
  });

  // 11. Recording state (simulate recording)
  await page.evaluate(() => {
    const recBtn = document.querySelector('#btn-rec');
    if (recBtn) {
      recBtn.classList.add('active');
      recBtn.setAttribute('aria-pressed', 'true');
      const time = document.querySelector('#rec-time');
      if (time) time.textContent = '0:05';
    }
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `11-recording-${suffix}.png`) });

  // Reset recording state
  await page.evaluate(() => {
    const recBtn = document.querySelector('#btn-rec');
    if (recBtn) {
      recBtn.classList.remove('active');
      recBtn.setAttribute('aria-pressed', 'false');
      const time = document.querySelector('#rec-time');
      if (time) time.textContent = '';
    }
  });

  // 12. Modal (open a modal dialog)
  await page.evaluate(async () => {
    // import dom module or trigger confirmDialog
    const modal = document.querySelector('#modal');
    const card = document.querySelector('#modal .modal-card');
    if (modal && card) {
      card.innerHTML = `
        <h3 class="modal-title">Clear scene?</h3>
        <div class="modal-body"><p>All shapes, balls and rules will be removed from the canvas.</p></div>
        <div class="modal-actions">
          <button class="btn" type="button">Cancel</button>
          <button class="btn primary danger" type="button">Clear</button>
        </div>
      `;
      modal.hidden = false;
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, `12-modal-${suffix}.png`) });

  // Close modal
  await page.evaluate(() => {
    const modal = document.querySelector('#modal');
    if (modal) modal.hidden = true;
  });

  // 13. Toast
  await page.evaluate(() => {
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = 'Format 9:16 — scene re-centered';
      toast.className = 'show';
    }
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `13-toast-${suffix}.png`) });

  // 14. Drop Overlay
  await page.evaluate(() => {
    const drop = document.querySelector('#drop-overlay');
    if (drop) drop.hidden = false;
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `14-drop-overlay-${suffix}.png`) });

  await page.close();
}

await captureAll(1366, 768, 'desktop');
await captureAll(375, 667, 'mobile');

console.log('All screenshots captured!');
await browser.close();
server.close();
process.exit(0);
