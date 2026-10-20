import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = pathToFileURL(path.join(__dirname, '..', 'site-apple', 'trailer.html')).href;
const outDir = path.join(__dirname, '..', 'temp', 'trailer-frames');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

const TIMES = [0.8, 2.4, 3.3, 4.5, 6.0, 6.9, 10.4, 13.8, 15.2, 16.5, 18.6, 19.8];
for (let i = 0; i < TIMES.length; i++) {
  const t = TIMES[i];
  await page.goto(file);
  await page.addStyleTag({ content: '#ui{display:none!important}' });
  const el = await page.waitForSelector('#play0', { state: 'attached' });
  await el.click();
  await page.waitForTimeout(t * 1000);
  const n = String(i + 1).padStart(2, '0');
  await page.screenshot({ path: path.join(outDir, `f${n}_t${t}s.png`) });
  console.log(`frame ${n} @ ${t}s`);
}
await browser.close();
console.log('done ->', outDir);
