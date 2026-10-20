import { describe, expect, it } from 'vitest';
import { buildToothGeometries } from '../three/geometry/anatomy';
import { signedVolume } from '../three/geometry/revolve';
import { getCutter, subtractCutter, cavityKey, lesionKey, getRestoration, getLesionMeshes, cutLesionPart } from '../three/geometry/cavity';
import type { LesionVisual } from '../types';

const geoms = buildToothGeometries();
const lesion: LesionVisual = { site: 'occlusal', enamelDepth: 1, dentinDepth: 0.35, surfaceTone: 'brown', surfaceIntensity: 0.8, cavitation: 0.3, pulpInflammation: 0 };

describe('procedural tooth geometry', () => {
  it('builds closed, outward-facing solids', () => {
    for (const [name, g] of Object.entries(geoms)) {
      expect(signedVolume(g), name).toBeGreaterThan(0);
    }
  });
  it('has nested landmarks (enamel above dentin above pulp)', () => {
    const top = (g: any) => { g.computeBoundingBox(); return g.boundingBox.max.y; };
    expect(top(geoms.enamel)).toBeGreaterThan(top(geoms.dentin));
    expect(top(geoms.dentin)).toBeGreaterThan(top(geoms.pulp));
  });
});

describe('CSG preparation', () => {
  it('produces different enamel geometry for different preparation depths', () => {
    const t0 = performance.now();
    const counts: number[] = [];
    for (const depth of [0.3, 0.7, 1]) {
      const cav = { shape: 'classI' as const, depth };
      const cutter = getCutter(cav, lesion);
      const key = `${cavityKey(cav)}|${lesionKey(lesion)}`;
      const e = subtractCutter('enamel', geoms.enamel, cutter, key);
      const d = subtractCutter('dentin', geoms.dentin, cutter, key);
      expect(e.cut).toBe(true);
      counts.push(e.geometry.getAttribute('position').count + d.geometry.getAttribute('position').count);
      expect(e.geometry.groups.some((g) => g.materialIndex === 1)).toBe(true);
      const lm = getLesionMeshes(lesion);
      const remaining = cutLesionPart('ldo', lm.dentinOuter, cutter, key);
      console.log('depth', depth, 'lesion remaining', remaining ? remaining.getAttribute('position').count : 0);
    }
    console.log('csg ms', performance.now() - t0, counts);
    expect(new Set(counts).size).toBe(3);
  });
  it('builds restoration increments', () => {
    const cav = { shape: 'classII' as const, depth: 1 };
    const cutter = getCutter(cav, { ...lesion, site: 'proximal' });
    const r = getRestoration(geoms.crownOuter, cutter, 'x', 3, true);
    expect(r.increments.length).toBe(3);
    expect(r.liner).not.toBeNull();
    console.log(r.floorY, r.topY);
  });
});
