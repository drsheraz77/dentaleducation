// Ad-hoc multi-screenshot helper: node e2e/shots.mjs <outDir> '<json array of {name, js, wait}>'
import { chromium } from 'playwright-core';
const [outDir, json, url = 'http://localhost:5173'] = process.argv.slice(2);
const shots = JSON.parse(json);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => !!window.__dentalverse, null, { timeout: 30000 });
for (const s of shots) {
  if (s.js) await page.evaluate(`(() => { const st = window.__dentalverse.store.getState(); ${s.js} })()`);
  await page.waitForTimeout(s.wait ?? 2500);
  await page.screenshot({ path: `${outDir}/${s.name}.png` });
}
console.log(logs.filter((l) => !l.includes('[vite]') && !l.includes('React DevTools') && !l.includes('THREE.Clock')).join('\n'));
await browser.close();
