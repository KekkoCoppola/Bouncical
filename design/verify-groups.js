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

await new Promise(r => server.listen(3465, r));
console.log('Server started on :3465');

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const outDir = path.join(rootDir, 'design', 'groups');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function verifyAll() {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[Page Error] ${err.toString()}`));

  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3465/index.html', { waitUntil: 'networkidle0' });

  // Force light mode for clean comparison
  await page.evaluate(() => {
    const lightBtn = document.querySelector('[data-theme-choice="light"]');
    if (lightBtn) lightBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Dismiss splash
  await page.click('#splash-start');
  await new Promise(r => setTimeout(r, 600));

  // --- GRUPPO 3: Strumenti e Sezioni Accordion ---
  console.log('Verifying Gruppo 3: Strumenti di disegno...');
  await page.click('[data-tool="line"]');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '03-tools-active-line.png') });

  // --- GRUPPO 1: Controlli Mondo (Fisica) ---
  console.log('Verifying Gruppo 1: Controlli Mondo (Fisica)...');
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('world');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-world').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '01-controls-world.png') });

  // --- GRUPPO 1: Controlli FX (Segmented) ---
  console.log('Verifying Gruppo 1: Controlli FX...');
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('fx');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-fx').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '02-controls-fx.png') });

  // --- GRUPPO 4: Regole (Rules) ---
  console.log('Verifying Gruppo 4: Editor delle Regole...');
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('rules');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-rules').scrollIntoView());
  await page.type('.rule-input', 'quando la pallina tocca il cerchio coriandoli');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, '04-rules-compose.png') });

  // Add rule and capture card
  await page.evaluate(() => {
    const addBtn = document.querySelector('#panel-rules .btn.primary');
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, '05-rules-card.png') });

  // --- GRUPPO 5: Musica e Ricerca Brano ---
  console.log('Verifying Gruppo 5: Musica...');
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('music');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-music').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '06-music-panel.png') });

  // --- GRUPPO 6: Scene Virali (Template) ---
  console.log('Verifying Gruppo 6: Scene Virali...');
  await page.evaluate(async () => {
    const panels = await import('./js/ui/panels.js');
    panels.openPanel('scenes');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#panel-scenes').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '07-scenes-grid.png') });

  // --- GRUPPO 7: Modale di conferma caricamento scena ---
  console.log('Verifying Gruppo 7: Modale di conferma...');
  // Draw something on stage first so asking to load a template triggers confirmDialog
  await page.evaluate(() => {
    const scenes = document.querySelectorAll('#panel-scenes .scene-card');
    if (scenes.length > 0) scenes[0].click();
  });
  await new Promise(r => setTimeout(r, 400));
  // Then click another scene card to trigger confirmation modal
  await page.evaluate(() => {
    const scenes = document.querySelectorAll('#panel-scenes .scene-card');
    if (scenes.length > 1) scenes[1].click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, '08-modal-confirm.png') });

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.ss-modal__close');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // --- GRUPPO 2: Export (Registra ed Esporta con unico pulsante corallo) ---
  console.log('Verifying Gruppo 2: Esporta...');
  await page.evaluate(() => document.querySelector('#sec-export').scrollIntoView());
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, '09-export-panel.png') });

  await browser.close();
  server.close();

  if (consoleErrors.length > 0) {
    console.error('Console errors:');
    consoleErrors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('All component groups verified cleanly with ZERO console errors!');
  }
}

verifyAll().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
