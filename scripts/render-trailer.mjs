import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets');
const file = pathToFileURL(path.join(__dirname, '..', 'site-apple', 'trailer.html')).href;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1330, height: 1000 } });
const page = await context.newPage();

let saved = false;
page.on('download', async (d) => {
  await d.saveAs(path.join(outDir, 'refract-trailer.webm'));
  saved = true;
  console.log('download saved:', d.suggestedFilename());
});
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message?.slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });

await page.goto(file);
await page.bringToFront();

// Marca no próprio trailer quando o MediaRecorder flusha o onstop
await page.evaluate(() => {
  const iv = setInterval(() => {
    const rec = window.__recRef;
    if (rec && rec.state === 'inactive' && window.__recChunksLen > 0) {
      clearInterval(iv);
      window.__recStopped = true;
    }
  }, 250);
});

await page.waitForTimeout(600);
await page.locator('#ex').click();
console.log('export started, waiting flush... (max 40s)');

try {
  await page.waitForFunction('window.__recStopped === true', null, { timeout: 40000 });
  console.log('recorder stopped + chunks flushed');
} catch {
  console.log('WARN: recStopped flag never set');
}
await page.waitForTimeout(2000);
if (!saved) console.log('WARN: no download event fired');
await context.close();
await browser.close();
console.log('done, saved =', saved);
