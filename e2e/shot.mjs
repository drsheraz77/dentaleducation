// Ad-hoc screenshot helper: node e2e/shot.mjs <url> <out.png> [js-to-run-before]
import { chromium } from 'playwright-core';
const [url, out, script, wait] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => !!window.__dentalverse, null, { timeout: 30000 }).catch(() => logs.push('no bridge'));
if (script) await page.evaluate(script);
await page.waitForTimeout(Number(wait ?? 2500));
await page.screenshot({ path: out });
console.log(logs.filter((l) => !l.includes('[vite]') && !l.includes('React DevTools')).join('\n'));
await browser.close();
