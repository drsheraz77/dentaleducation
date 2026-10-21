/**
 * Browser acceptance tests for DentalVerse 3D (real WebGL via headless Chromium).
 *
 *   npm run build && npx vite preview --port 4173 &
 *   npm run e2e                      # or: node e2e/acceptance.mjs http://localhost:4173
 *
 * Environment: CHROMIUM_PATH overrides the browser executable; SCREENSHOT_DIR saves screenshots.
 * The app exposes a test bridge (window.__dentalverse) only on the dev server or with `?e2e`.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const URL = `${BASE}/?e2e`;
const EXEC = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.SCREENSHOT_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? '' });
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`  ✗ ${name} — ${e.message}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const store = (js) => page.evaluate(`(() => { const st = window.__dentalverse.store.getState(); return (${js}); })()`);
const settle = (ms = 2500) => page.waitForTimeout(ms);
/** Samples the WebGL drawing buffer (RGB of every 7th pixel) and optionally saves a screenshot. */
const shot = async (name) => {
  if (SHOTS) await page.locator('.viewport').screenshot({ path: `${SHOTS}/${name}.png` });
  return page.evaluate(() => {
    const c = document.querySelector('.viewport canvas');
    const g = c.getContext('webgl2', { preserveDrawingBuffer: true }) ?? c.getContext('webgl');
    const px = new Uint8Array(g.drawingBufferWidth * g.drawingBufferHeight * 4);
    g.readPixels(0, 0, g.drawingBufferWidth, g.drawingBufferHeight, g.RGBA, g.UNSIGNED_BYTE, px);
    const out = [];
    for (let i = 0; i < px.length; i += 4 * 7) out.push(px[i], px[i + 1], px[i + 2]);
    return out;
  });
};
/** Fraction of sampled pixels whose colour changed noticeably (> 24 levels in any channel). */
const differs = (a, b) => {
  if (a.length !== b.length) return 1;
  let d = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) d++;
  }
  return d / (a.length / 3);
};
const project = (x, y, z) => page.evaluate(([x, y, z]) => window.__dentalverse.project(x, y, z), [x, y, z]);
const clickWorld = async (x, y, z) => {
  const p = await project(x, y, z);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(200);
};

console.log(`DentalVerse 3D acceptance tests against ${URL}`);

await check('1. Application starts', async () => {
  await page.goto(URL);
  await page.getByRole('navigation', { name: /learning modules/i }).waitFor();
  await page.waitForFunction(() => !!window.__dentalverse, null, { timeout: 60000 });
  return await page.title();
});

await check('2. 3D tooth renders (non-blank WebGL canvas)', async () => {
  await settle(3000);
  await shot('01-anatomy');
  const colours = await page.evaluate(() => {
    const c = document.querySelector('.viewport canvas');
    const g = c.getContext('webgl2', { preserveDrawingBuffer: true }) ?? c.getContext('webgl');
    const w = g.drawingBufferWidth;
    const h = g.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px);
    const set = new Set();
    for (let i = 0; i < px.length; i += 4 * 97) set.add((px[i] >> 3) * 1024 + (px[i + 1] >> 3) * 32 + (px[i + 2] >> 3));
    return set.size;
  });
  assert(colours > 50, `only ${colours} distinct colours`);
  return `${colours} distinct colours`;
});

await check('3. Rotate, zoom and reset the camera', async () => {
  const cam = () => page.evaluate(() => window.__dentalverse.camera());
  const box = await page.locator('.viewport canvas').boundingBox();
  const start = await cam();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.45, { steps: 12 });
  await page.mouse.up();
  await settle(800);
  const rotated = await cam();
  assert(Math.hypot(...rotated.position.map((v, i) => v - start.position[i])) > 2, 'drag did not rotate the camera');
  const dist = (c) => Math.hypot(...c.position.map((v, i) => v - c.target[i]));
  await page.mouse.wheel(0, -600);
  await settle(800);
  const zoomed = await cam();
  assert(dist(zoomed) < dist(rotated) - 1, 'wheel did not zoom in');
  await page.getByRole('button', { name: /reset camera/i }).click();
  await settle(1500);
  const reset = await cam();
  const off = Math.hypot(...reset.position.map((v, i) => v - start.position[i]));
  assert(off < 0.5, `reset did not restore the camera (off by ${off.toFixed(2)}: ${reset.position.map((v) => v.toFixed(1))} vs ${start.position.map((v) => v.toFixed(1))})`);
  return `distance ${dist(rotated).toFixed(1)} → ${dist(zoomed).toFixed(1)} → reset`;
});

await check('4. Clicking enamel, dentin and pulp selects the correct structure', async () => {
  await store(`st.setViewMode('section')`);
  await settle(2500);
  const picks = [
    ['enamel', [-2.6, 5.4, 0]],
    ['dentin', [-3.6, 1.6, 0]],
    ['pulp', [0, -0.4, 0]],
  ];
  // Hide labels so the click lands on the mesh, not on the label button.
  await store(`st.showLabels && st.toggleLabels()`);
  await settle(500);
  const got = [];
  for (const [expected, p] of picks) {
    await clickWorld(...p);
    const sel = await store('st.selectedStructure');
    got.push(`${expected}→${sel}`);
    assert(sel === expected, `clicked ${expected}, selected ${sel}`);
  }
  const heading = await page.locator('.info h2').first().textContent();
  assert(/pulp/i.test(heading), `info panel shows "${heading}"`);
  // External view: clicking the crown selects enamel.
  await store(`st.setViewMode('external')`);
  await settle(2000);
  await clickWorld(-3.5, 4.5, 3.0);
  const ext = await store('st.selectedStructure');
  assert(ext === 'enamel', `external crown click selected ${ext}`);
  await store(`!st.showLabels && st.toggleLabels()`);
  return got.join(', ') + ', external crown→enamel';
});

await check('5. Cross-sectional view works', async () => {
  await store(`st.selectStructure(null)`);
  await settle(1000);
  const ext = await shot('02-external');
  await page.getByRole('button', { name: /^◧/ }).click();
  await settle(2500);
  assert((await store('st.viewMode')) === 'section', 'view mode did not change');
  const sec = await shot('03-section');
  const d = differs(ext, sec);
  assert(d > 0.02, `section image barely differs (${d})`);
  return `${(d * 100).toFixed(1)}% of pixels changed`;
});

await check('6. Switching lesion stages changes the displayed tooth', async () => {
  await page.getByRole('button', { name: /dental caries/i }).click();
  await settle(3000);
  const s0 = await shot('04-caries-normal');
  await page.getByRole('button', { name: /6\. Dentin/ }).click();
  await settle(6000);
  const s5 = await shot('05-caries-dentin');
  await page.getByRole('button', { name: /8\. Advanced/ }).click();
  await settle(6000);
  const s7 = await shot('06-caries-advanced');
  const a = differs(s0, s5);
  const b = differs(s5, s7);
  assert(a > 0.003 && b > 0.003, `stage images too similar (${a}, ${b})`);
  const h = await page.locator('.info h2').first().textContent();
  assert(/Advanced lesion/.test(h), `info heading "${h}"`);
  return `normal→dentin ${(a * 100).toFixed(1)}%, dentin→advanced ${(b * 100).toFixed(1)}%`;
});

await check('7. Animation controls (play, pause, next, previous, reset)', async () => {
  await page.getByRole('button', { name: /reset to first step/i }).click();
  await page.locator('select[aria-label="Animation speed"]').selectOption('2');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  // Two steps at 2× take ~3.6 s; allow extra time because software WebGL can stall the page.
  await page.waitForFunction(() => window.__dentalverse.store.getState().step >= 2, null, { timeout: 15000 }).catch(() => {});
  const playing = await store('[st.step, st.playing]');
  assert(playing[0] >= 2 && playing[1], `after playback step=${playing[0]} playing=${playing[1]}`);
  await page.getByRole('button', { name: 'Pause' }).click();
  const paused = await store('st.step');
  await page.waitForTimeout(2200);
  assert((await store('st.step')) === paused, 'step advanced while paused');
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Previous step' }).click();
  await page.getByRole('button', { name: 'Previous step' }).click();
  const back = await store('st.step');
  assert(back === paused - 1, `prev/next ended on ${back}, expected ${paused - 1}`);
  await page.getByRole('button', { name: /reset to first step/i }).click();
  assert((await store('st.step')) === 0, 'reset did not return to step 0');
  await page.locator('select[aria-label="Animation speed"]').selectOption('1');
  return `played to step ${playing[0] + 1}, paused, stepped, reset`;
});

await check('8. Cavity-preparation steps show distinct procedural states', async () => {
  await page.getByRole('button', { name: /cavity preparation/i }).click();
  await store(`st.setViewMode('external')`);
  await settle(2500);
  const imgs = [];
  for (const s of [0, 3, 4]) {
    await store(`st.setStep(${s})`);
    await settle(s === 0 ? 2500 : 7000);
    imgs.push(await shot(`07-prep-step${s + 1}`));
  }
  const d1 = differs(imgs[0], imgs[1]);
  const d2 = differs(imgs[1], imgs[2]);
  assert(d1 > 0.003 && d2 > 0.003, `prep images too similar (${d1}, ${d2})`);
  // Before/after comparison renders two teeth.
  await page.getByRole('button', { name: /compare before/i }).click();
  await settle(4000);
  await shot('08-prep-before-after');
  const captions = await page.locator('.scene-caption').allTextContents();
  assert(captions.length === 2 && /Before/.test(captions[0]), `captions: ${captions}`);
  await page.getByRole('button', { name: /compare before/i }).click();
  // Unsuitable instrument: no cut + feedback.
  await store(`st.setStep(3)`);
  await page.getByRole('button', { name: 'Spoon excavator' }).click();
  await settle(1000);
  const notice = await page.locator('.scene-notice').textContent();
  assert(/cannot cut sound enamel/i.test(notice), 'no instrument feedback');
  await page.getByRole('button', { name: /Pear-shaped bur/ }).click();
  return `step1→4 ${(d1 * 100).toFixed(1)}%, step4→5 ${(d2 * 100).toFixed(1)}%; before/after + instrument feedback OK`;
});

await check('9/10. Composite and glass ionomer load different sequences', async () => {
  await page.getByRole('button', { name: /restorative materials/i }).click();
  await settle(2000);
  const steps = async () => page.locator('.info .steps-list li').allTextContents();
  const composite = await steps();
  await store(`st.setStep(${composite.indexOf('Light-cure the adhesive')})`);
  await settle(4000);
  const cImg = await shot('09-composite-cure-adhesive');
  await page.locator('select').filter({ hasText: 'Resin composite' }).selectOption('gic');
  await settle(1500);
  const gic = await steps();
  assert(composite.includes('Phosphoric acid etch') && composite.includes('Light-cure the adhesive'), 'composite sequence missing steps');
  assert(gic.includes('Capsule activation and mixing') && !gic.includes('Light-cure the adhesive'), 'GIC sequence wrong');
  await store(`st.setStep(${gic.indexOf('Bulk placement')})`);
  await settle(5000);
  const gImg = await shot('10-gic-bulk-placement');
  const dm = differs(cImg, gImg);
  assert(dm > 0.003, 'composite and GIC scenes look identical');
  return `composite ${composite.length} steps, GIC ${gic.length} steps; scenes differ in ${(dm * 100).toFixed(1)}% of pixels`;
});

await check('11. Material comparison updates', async () => {
  await page.getByRole('tab', { name: 'Compare' }).click();
  await settle(5000);
  const a = await shot('11-compare-composite-gic');
  await page.locator('select[aria-label="Material B"]').selectOption('amalgam');
  await settle(6000);
  const b = await shot('12-compare-composite-amalgam');
  const head = await page.locator('table.compare thead').textContent();
  assert(/Amalgam/.test(head), `table header: ${head}`);
  const dc = differs(a, b);
  assert(dc > 0.002, 'comparison scene did not change');
  await page.getByRole('tab', { name: 'Workflow' }).click();
  return `${head.trim()} — scene changed in ${(dc * 100).toFixed(1)}% of pixels`;
});

await check('12. Educational content follows the selected procedure/stage', async () => {
  await page.getByRole('button', { name: /cavity preparation/i }).click();
  await page.locator('select').filter({ hasText: 'Class I cavity preparation' }).selectOption('selective-removal');
  await store(`st.setStep(4)`);
  await settle(500);
  const title = await page.locator('.info h2').first().textContent();
  const card = await page.locator('.info .card strong').first().textContent();
  assert(/Selective caries removal/.test(title) && /Selectively manage/.test(card), `got "${title}" / "${card}"`);
  return `${title} → ${card}`;
});

await check('13. Quiz answers are scored correctly', async () => {
  await page.getByRole('button', { name: /knowledge assessment/i }).click();
  const n = await store(`st.quiz.answers.length`);
  let correct = 0;
  for (let i = 0; i < n; i++) {
    // Alternate between the first and second option and count the feedback the UI gives.
    await page.locator('.option-list .option').nth(i % 2).click();
    const feedback = await page.locator('.quiz [role="status"]').textContent();
    if (/^Correct\./.test(feedback.trim())) correct++;
    const running = await page.getByTestId('quiz-running-score').textContent();
    assert(running.includes(`${correct} / ${i + 1}`), `running score "${running}" after ${i + 1} answers (${correct} correct)`);
    await page.getByRole('button', { name: /next question|see results/i }).click();
  }
  const shown = (await page.getByTestId('quiz-score').textContent()).replace(/\s/g, '');
  assert(shown === `${correct}/${n}`, `final score ${shown}, expected ${correct}/${n}`);
  if (SHOTS) await page.locator('.quiz').screenshot({ path: `${SHOTS}/15-quiz-results.png` });
  return `final score ${shown} matches per-question feedback`;
});

await check('14. Layout remains usable on smaller screens', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /dental anatomy/i }).click();
  await settle(3000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const canvas = await page.locator('.viewport canvas').boundingBox();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/13-mobile.png`, fullPage: false });
  assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
  assert(canvas && canvas.width >= 300 && canvas.height >= 250, `canvas too small: ${JSON.stringify(canvas)}`);
  await page.setViewportSize({ width: 820, height: 1180 });
  await settle(1500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/14-tablet.png` });
  const overflowTablet = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflowTablet <= 1, `tablet overflow ${overflowTablet}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
  return `phone canvas ${Math.round(canvas.width)}×${Math.round(canvas.height)}, no horizontal scroll`;
});

await check('15. No unresolved critical runtime errors in the console', async () => {
  assert(consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  return 'console clean';
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} acceptance checks passed`);
process.exit(failed.length ? 1 : 0);
