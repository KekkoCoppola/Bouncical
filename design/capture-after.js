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

await new Promise(r => server.listen(3466, r));
console.log('Server started on :3466');

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const outDir = path.join(rootDir, 'design', 'after');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function captureAll(width, height, suffix) {
  console.log(`Starting AFTER capture for ${suffix} (${width}x${height})...`);
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[${suffix} Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[${suffix} Page Error] ${err.toString()}`));

  await page.setViewport({ width, height });

  // 1. Splash
  await page.goto('http://localhost:3466/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const lightBtn = document.querySelector('[data-theme-choice="light"]');
    if (lightBtn) lightBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `01-splash-${suffix}.png`) });

  // 2. Editor Empty (dismiss splash)
  await page.click('#splash-start');
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: path.join(outDir, `02-editor-empty-${suffix}.png`) });

  // 3. Format menu
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-format');
    if (btn) {
      btn.scrollIntoView({ block: 'center' });
      btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, `03-format-menu-${suffix}.png`) });
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-format');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // 4. Panel Scenes
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('scenes');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-scenes').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
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
      const btn = modal.querySelector('.ss-btn--primary') || modal.querySelector('.btn.primary');
      if (btn) btn.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // 5. Editor with Scene
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, `05-editor-scene-${suffix}.png`) });

  // 6. Panel Music
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('music');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-music').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `06-panel-music-${suffix}.png`) });

  // 7. Panel Rules
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('rules');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-rules').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `07-panel-rules-${suffix}.png`) });

  // 8. Panel World
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('world');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-world').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `08-panel-world-${suffix}.png`) });

  // 9. Panel FX
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('fx');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-fx').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `09-panel-fx-${suffix}.png`) });

  // 10. Panel Shape (select a shape with move tool)
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('shape');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-shape').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `10-panel-shape-${suffix}.png`) });

  // 11. Recording state (simulate recording)
  await page.evaluate(() => {
    const recBtn = document.querySelector('#btn-rec');
    if (recBtn) {
      recBtn.classList.add('recording');
      recBtn.setAttribute('aria-pressed', 'true');
      const time = document.querySelector('#rec-time');
      if (time) time.textContent = '0:05';
    }
  });
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => document.querySelector('#sec-export').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `11-recording-${suffix}.png`) });

  // Reset recording state
  await page.evaluate(() => {
    const recBtn = document.querySelector('#btn-rec');
    if (recBtn) {
      recBtn.classList.remove('recording');
      recBtn.setAttribute('aria-pressed', 'false');
      const time = document.querySelector('#rec-time');
      if (time) time.textContent = '';
    }
  });

  // 12. Modal (open modal dialog using dom.openModal)
  await page.evaluate(async () => {
    const dom = await import('./js/ui/dom.js');
    dom.openModal({
      title: 'Pulisci scena?',
      body: dom.h('p', { text: 'Tutte le forme, le palline e le regole verranno rimosse dalla tela.' }),
      actions: [
        { label: 'Annulla' },
        { label: 'Pulisci', primary: true, danger: true },
      ],
    });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, `12-modal-${suffix}.png`) });

  // Close modal
  await page.evaluate(async () => {
    const dom = await import('./js/ui/dom.js');
    dom.closeModal();
  });
  await new Promise(r => setTimeout(r, 200));

  // 13. Toast
  await page.evaluate(async () => {
    const dom = await import('./js/ui/dom.js');
    dom.toast('Formato 9:16 — scena ricentrata');
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, `13-toast-${suffix}.png`) });

  // 14. Drop Overlay
  await page.evaluate(() => {
    const drop = document.querySelector('#drop-overlay');
    if (drop) drop.hidden = false;
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, `14-drop-overlay-${suffix}.png`) });

  await page.close();

  if (consoleErrors.length > 0) {
    console.error(`Console errors in ${suffix}:`, consoleErrors);
    throw new Error('Console errors encountered');
  }
}

try {
  await captureAll(1366, 768, 'desktop');
  await captureAll(375, 667, 'mobile');
  console.log('ALL 14 PAIRS OF AFTER SCREENSHOTS CAPTURED CLEANLY!');
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await browser.close();
  server.close();
}
