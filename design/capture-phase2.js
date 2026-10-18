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

await new Promise(r => server.listen(3458, r));
console.log('Server started on :3458');

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const outDir = path.join(rootDir, 'design');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const consoleErrors = [];
  
  // Desktop 1366x768
  {
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Desktop Console Error] ${msg.text()}`);
    });
    page.on('pageerror', err => consoleErrors.push(`[Desktop Page Error] ${err.toString()}`));
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:3458/index.html', { waitUntil: 'networkidle0' });
    
    // Explicitly set light mode
    await page.evaluate(() => {
      const lightBtn = document.querySelector('[data-theme-choice="light"]');
      if (lightBtn) lightBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Capture splash desktop
    await page.screenshot({ path: path.join(outDir, 'phase2-splash-desktop.png') });
    
    // Dismiss splash
    await page.click('#splash-start');
    await new Promise(r => setTimeout(r, 700));
    
    // Capture editor desktop
    await page.screenshot({ path: path.join(outDir, 'phase2-desktop.png') });
    
    // Test dark mode
    await page.evaluate(() => {
      const darkBtn = document.querySelector('[data-theme-choice="dark"]');
      if (darkBtn) darkBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(outDir, 'phase2-dark-desktop.png') });
    
    await page.close();
  }

  // Mobile 375x667
  {
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Mobile Console Error] ${msg.text()}`);
    });
    page.on('pageerror', err => consoleErrors.push(`[Mobile Page Error] ${err.toString()}`));
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('http://localhost:3458/index.html', { waitUntil: 'networkidle0' });
    
    // Explicitly set light mode
    await page.evaluate(() => {
      const lightBtn = document.querySelector('[data-theme-choice="light"]');
      if (lightBtn) lightBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Capture splash mobile
    await page.screenshot({ path: path.join(outDir, 'phase2-splash-mobile.png') });
    
    // Dismiss splash
    await page.click('#splash-start');
    await new Promise(r => setTimeout(r, 700));
    
    // Capture editor mobile
    await page.screenshot({ path: path.join(outDir, 'phase2-mobile.png') });

    // Capture editor mobile scrolled to panel
    await page.evaluate(() => window.scrollBy(0, 480));
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: path.join(outDir, 'phase2-mobile-scrolled.png') });
    
    await page.close();
  }

  await browser.close();
  server.close();

  if (consoleErrors.length > 0) {
    console.error('Console errors encountered:');
    consoleErrors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('Phase 2 screenshots captured cleanly with ZERO console errors!');
  }
}

run().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
