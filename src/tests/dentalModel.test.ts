// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { processModel } from '../three/studio/dentalModel';
import { LOWER_MOLAR_47 } from '../data/studio/assets';

async function load() {
  const buf = readFileSync('public/models/dental/lower-molar-47.glb');
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  return processModel(gltf.scene, LOWER_MOLAR_47);
}

describe('measurements on the scanned molar', () => {
  it('finds the central fossa, enamel thickness and the pulp below it', async () => {
    const m = await load();
    const f = m.fossa;
    console.log({ fossa: f.origin.toArray().map((v) => +v.toFixed(2)), enamel: +f.enamelThickness.toFixed(2), dentinToPulp: +f.dentinToPulp.toFixed(2), anchors: m.sectionAnchors });
    // Plausible molar values (mm): occlusal enamel ~1–3, dentin to pulp roof a few mm.
    expect(f.enamelThickness).toBeGreaterThan(0.5);
    expect(f.enamelThickness).toBeLessThan(3.5);
    expect(f.dentinToPulp).toBeGreaterThan(1);
    expect(f.dentinToPulp).toBeLessThan(8);
    expect(m.pulpRoof.y).toBeLessThan(f.origin.y);
  });

  it('places a label anchor inside every tissue of the cut face', async () => {
    const m = await load();
    for (const id of ['enamel', 'dentin', 'pulp', 'pdl', 'lamina'] as const) expect(m.sectionAnchors[id]).toBeDefined();
    for (const id of ['enamel', 'dentin'] as const) expect(m.externalAnchors[id]).toBeDefined();
  });
});
