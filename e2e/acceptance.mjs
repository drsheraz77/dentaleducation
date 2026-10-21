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
/** Fraction of sampled pixels whose colour changed noticeably (> `level` levels in any channel, default 24). */
const differs = (a, b, level = 24) => {
  if (a.length !== b.length) return 1;
  let d = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (Math.abs(a[i] - b[i]) > level || Math.abs(a[i + 1] - b[i + 1]) > level || Math.abs(a[i + 2] - b[i + 2]) > level) d++;
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

// ---------- Caries Learning Studio (scanned tooth) ----------
const studioAnchor = (kind, id) => page.evaluate(([k, i]) => window.__dentalverseStudio?.[k]?.[i] ?? null, [kind, id]);
const camPos = () => page.evaluate(() => window.__dentalverse.camera().position);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const overlayText = () => page.locator('.label-layer').innerText();
const timings = {};

await check('S1. Studio loads the scanned tooth model (local GLB, no third-party requests)', async () => {
  const external = [];
  page.on('request', (r) => {
    const u = new globalThis.URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data')) external.push(r.url());
  });
  const t0 = Date.now();
  await page.getByRole('button', { name: /caries learning studio/i }).click();
  await page.waitForSelector('.viewport canvas', { timeout: 30000 });
  await page.waitForFunction(() => !!window.__dentalverseStudio, null, { timeout: 30000 });
  timings.clickToModel = Date.now() - t0;
  await settle(1500);
  const glb = await page.evaluate(() => {
    const e = performance.getEntriesByType('resource').find((r) => r.name.includes('lower-molar-47.glb'));
    return e ? { ms: Math.round(e.duration), bytes: e.transferSize || e.encodedBodySize } : null;
  });
  assert(glb, 'GLB was not requested');
  timings.glb = glb;
  const px = await shot('S1-studio-external');
  const lit = px.filter((v, i) => i % 3 === 0 && v < 235).length / (px.length / 3);
  assert(lit > 0.05, `canvas looks blank (${(lit * 100).toFixed(1)}% non-background)`);
  assert(external.length === 0, `third-party requests: ${external.join(', ')}`);
  return `model visible ${timings.clickToModel} ms after click (GLB ${glb.bytes} B fetched in ${glb.ms} ms)`;
});

await check('S2. Studio rotate, zoom, reset and auto-rotate', async () => {
  const start = await camPos();
  const box = await page.locator('.viewport canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await settle(600);
  const rotated = await camPos();
  assert(dist(start, rotated) > 1, 'drag did not rotate');
  const r0 = Math.hypot(...rotated);
  await page.mouse.wheel(0, -600);
  await settle(800);
  const zoomed = await camPos();
  assert(Math.hypot(...zoomed) < r0 - 0.5, 'wheel did not zoom in');
  await page.getByRole('button', { name: /reset camera/i }).click();
  await settle(1200);
  const reset = await camPos();
  assert(dist(start, reset) < 0.5, `reset camera off by ${dist(start, reset).toFixed(2)}`);
  await page.getByRole('button', { name: /auto-rotate/i }).click();
  await settle(1500);
  const spun = await camPos();
  await page.getByRole('button', { name: /auto-rotate/i }).click();
  assert(dist(reset, spun) > 0.5, 'auto-rotate did not move the camera');
  await page.getByRole('button', { name: /reset camera/i }).click();
  await settle(1200);
  return 'drag, wheel, reset (back within 0.5 mm) and auto-rotate all move the camera as expected';
});

await check('S3. Hover and click select the scanned enamel, dentin and pulp', async () => {
  await page.getByRole('button', { name: /^◧/ }).click();
  await settle(1500);
  assert((await store('st.viewMode')) === 'section', 'section did not open');
  const picked = [];
  for (const id of ['enamel', 'dentin', 'pulp']) {
    const a = await studioAnchor('sectionAnchors', id);
    assert(a, `no anchor for ${id}`);
    const before = await shot(`S3-before-${id}`);
    const p = await project(...a);
    await page.mouse.move(p.x, p.y);
    await settle(400);
    const hovered = await shot(`S3-hover-${id}`);
    const changed = differs(before, hovered, 8);
    assert(changed > 0.002, `hovering ${id} did not highlight it (${(changed * 100).toFixed(2)}% changed)`);
    await clickWorld(...a);
    picked.push(await store('st.selectedStructure'));
  }
  assert(picked.join() === 'enamel,dentin,pulp', `selected ${picked.join()}`);
  const info = await page.locator('.info').innerText();
  assert(/pulp/i.test(info), 'info panel did not describe the selection');
  await page.mouse.move(5, 5);
  return 'hover highlights; clicks select enamel → dentin → pulp; info panel follows';
});

await check('S4. Layer visibility toggles change the model', async () => {
  const before = await shot('S4-all-layers');
  const layers = page.getByRole('group', { name: /^layers$/i });
  await layers.getByRole('button', { name: /enamel/i }).click();
  await settle(800);
  const noEnamel = await shot('S4-no-enamel');
  await layers.getByRole('button', { name: /enamel/i }).click();
  await layers.getByRole('button', { name: /periodontal|pdl/i }).click();
  await settle(800);
  const withPdl = await shot('S4-with-pdl');
  await layers.getByRole('button', { name: /periodontal|pdl/i }).click();
  const a = differs(before, noEnamel);
  const b = differs(before, withPdl);
  assert(a > 0.005 && b > 0.005, `hide enamel ${(a * 100).toFixed(1)}%, show PDL ${(b * 100).toFixed(1)}%`);
  return `hide enamel changed ${(a * 100).toFixed(1)}% of pixels, show PDL ${(b * 100).toFixed(1)}%`;
});

await check('S5. Lesson stages: navigation, labels and info stay in sync', async () => {
  const seen = [];
  await page.getByRole('button', { name: /reset to first step/i }).click();
  await settle(800);
  let prev = await shot('S5-stage-1');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Next step' }).click();
    await settle(i === 3 ? 6000 : 3000);
    const step = await store('st.step');
    const title = await page.locator('.timeline__title').innerText();
    const heading = await page.locator('.info h2').first().innerText();
    assert(step === i, `step ${step} after ${i} × next`);
    assert(title.includes(heading), `timeline "${title}" vs info "${heading}"`);
    const labels = await overlayText();
    assert(/carious lesion \(schematic\)/i.test(labels), `stage ${i + 1} lacks the schematic lesion label`);
    const px = await shot(`S5-stage-${i + 1}`);
    assert(differs(prev, px) > 0.003, `stage ${i + 1} looks identical to the previous stage`);
    prev = px;
    seen.push(heading);
  }
  await page.getByRole('button', { name: 'Previous step' }).click();
  await settle(2500);
  assert((await store('st.step')) === 2, 'previous did not go back');
  await page.getByRole('button', { name: /^play$/i }).click();
  await settle(500);
  assert(await store('st.playing'), 'play did not start');
  await page.getByRole('button', { name: /pause/i }).click();
  assert(!(await store('st.playing')), 'pause did not stop');
  return seen.join(' → ');
});

await check('S6. Cross-sectional comparison stage', async () => {
  await page.getByRole('group', { name: /lesson stages/i }).getByRole('button', { name: /compare/i }).click();
  await settle(4000);
  const captions = await page.locator('.scene-caption').allInnerTexts();
  assert(captions.length === 3, `expected 3 captions, saw ${captions.join('|')}`);
  const before = await shot('S6-compare-3');
  assert(await page.getByRole('toolbar').getByRole('button', { name: /cross-section/i }).isDisabled(), 'cross-section toggle should be locked');
  await page.getByRole('group', { name: /stages to compare/i }).getByRole('button', { name: /sound/i }).click();
  await settle(4000);
  const after = await page.locator('.scene-caption').allInnerTexts();
  const px = await shot('S6-compare-4');
  assert(after.length === 4 && differs(before, px) > 0.01, `captions ${after.join('|')}`);
  return after.join(' | ');
});

await check('S7. Knowledge check: markers on the model, feedback and score', async () => {
  await page.getByRole('group', { name: /lesson stages/i }).getByRole('button', { name: /check/i }).click();
  await settle(5000);
  await shot('S7-check');
  const labels = (await overlayText()).split(/\s+/);
  for (const m of ['A', 'B', 'C']) assert(labels.includes(m), `marker ${m} missing`);
  const q1 = page.getByRole('region', { name: 'Question 1' });
  await q1.getByRole('button', { name: 'Dentin' }).click();
  const fb = await q1.getByRole('status').innerText();
  const q2 = page.getByRole('region', { name: 'Question 2' });
  await q2.getByRole('button', { name: /normal occlusal fissure/i }).click();
  const score = await page.getByTestId('studio-score').innerText();
  assert(/^Correct/.test(fb) && score.includes('1 / 2'), `feedback "${fb}", score "${score}"`);
  return `right answer → "Correct.", wrong answer counted; ${score}`;
});

await check('S8. Studio is keyboard operable', async () => {
  const chip = page.getByRole('group', { name: /lesson stages/i }).getByRole('button', { name: /sound/i });
  await chip.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await settle(800);
  assert((await store('st.step')) === 1, 'Tab + Enter did not open stage 2');
  await page.getByRole('button', { name: 'Next step' }).focus();
  await page.keyboard.press('Space');
  await settle(500);
  assert((await store('st.step')) === 2, 'Space on Next did not advance');
  await page.getByRole('button', { name: /auto-rotate/i }).focus();
  await page.keyboard.press('Enter');
  const on = await store('st.autoRotate');
  await page.keyboard.press('Enter');
  assert(on && !(await store('st.autoRotate')), 'toolbar not keyboard operable');
  return 'stage chips, timeline and toolbar respond to Tab/Enter/Space';
});

await check('S9. Studio layout on a phone', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const canvas = await page.locator('.viewport canvas').boundingBox();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/S9-studio-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await settle(1000);
  assert(overflow <= 1, `horizontal overflow ${overflow}px`);
  assert(canvas && canvas.width >= 300 && canvas.height >= 250, `canvas ${JSON.stringify(canvas)}`);
  return `canvas ${Math.round(canvas.width)}×${Math.round(canvas.height)}, no horizontal scroll`;
});

await check('S10. Missing model file shows an error with working retry and fallback', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.route('**/lower-molar-47.glb', (r) => r.fulfill({ status: 404, body: 'Not found' }));
  await p.goto(URL);
  await p.getByRole('button', { name: /caries learning studio/i }).click();
  await p.getByRole('heading', { name: 'The 3D model is unavailable' }).waitFor({ timeout: 20000 });
  assert((await p.getByRole('toolbar', { name: /3d view controls/i }).count()) === 0, '3D toolbar shown without a model');
  if (SHOTS) await p.locator('.viewport').screenshot({ path: `${SHOTS}/S10-missing-model.png` });
  await p.unroute('**/lower-molar-47.glb');
  await p.getByRole('button', { name: 'Try again' }).click();
  await p.waitForSelector('.viewport canvas', { timeout: 30000 });
  const p2 = await ctx.newPage();
  await p2.route('**/lower-molar-47.glb', (r) => r.fulfill({ status: 404, body: 'Not found' }));
  await p2.goto(URL);
  await p2.getByRole('button', { name: /caries learning studio/i }).click();
  await p2.getByRole('button', { name: /schematic caries module/i }).click({ timeout: 20000 });
  const topic = await p2.evaluate(() => window.__dentalverse?.store.getState().topic ?? document.querySelector('[aria-current="page"]')?.textContent);
  await ctx.close();
  assert(/caries/i.test(String(topic)), `fallback opened ${topic}`);
  return 'error message shown; retry loads the model once the file is back; fallback opens the schematic module';
});

await check('S11. Without WebGL the studio explains itself and the lesson still works', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/.test(type) ? null : orig.call(this, type, ...rest);
    };
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL);
  await p.getByRole('button', { name: /caries learning studio/i }).click();
  await p.getByRole('heading', { name: 'WebGL is not available' }).waitFor({ timeout: 20000 });
  if (SHOTS) await p.locator('.workspace').screenshot({ path: `${SHOTS}/S11-no-webgl.png` });
  await p.getByRole('button', { name: 'Next step' }).click();
  const heading = await p.locator('.info h2').first().innerText();
  await ctx.close();
  assert(errors.length === 0, errors.join(' | '));
  assert(/early/i.test(heading), `lesson did not advance: ${heading}`);
  return `fallback message shown, lesson advanced to "${heading}", no page errors`;
});

await check('15. No unresolved critical runtime errors in the console', async () => {
  assert(consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  return 'console clean';
});

await browser.close();
if (timings.glb) console.log(`\nStudio timings: module click → model on screen ${timings.clickToModel} ms; GLB ${timings.glb.bytes} B in ${timings.glb.ms} ms`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} acceptance checks passed`);
process.exit(failed.length ? 1 : 0);
