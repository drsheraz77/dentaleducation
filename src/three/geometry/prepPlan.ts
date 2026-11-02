import type { CavityShape, CavityVisual, LesionVisual } from '../../types';
import { SITE_FRAME_DATA } from './landmarks';

/**
 * The planned preparation volume as plain numbers (no three.js), shared by the CSG
 * geometry in cavity.ts and by UI code such as the pulp-proximity gauge.
 */

/** Top of the outline boxes (above the occlusal surface). */
export const TOP = 9;

export const q = (v: number, steps = 20) => Math.round(v * steps) / steps;
/** Quantisation used for animated CSG parameters. */
export const CAVITY_STEPS = 10;
export const CAVITATION_STEPS = 10;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Outline phase (0–0.7 of depth) then excavation phase (0.7–1). */
export function phases(depth: number) {
  return {
    outline: clamp01(depth / 0.7),
    excavation: clamp01((depth - 0.7) / 0.3),
  };
}

export const SHAPE_SITE: Record<CavityShape, 'occlusal' | 'proximal'> = {
  conservative: 'occlusal',
  classI: 'occlusal',
  classII: 'proximal',
  selective: 'occlusal',
  nonSelective: 'occlusal',
};

export interface BoxSpec {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  floor: number;
  radius?: number;
}

/** Outline-form boxes of each preparation at a given outline progress (0–1). */
export function outlineBoxes(shape: CavityShape, outline: number): BoxSpec[] {
  if (outline <= 0.01) return [];
  switch (shape) {
    case 'conservative':
      return [{ x0: -1.5, x1: 1.5, z0: -0.55, z1: 0.55, floor: lerp(5.6, 4.15, outline), radius: 0.3 }];
    case 'classI':
      return [
        { x0: -3.3, x1: 3.3, z0: -1.0, z1: 1.0, floor: lerp(5.6, 3.75, outline) },
        { x0: -0.55, x1: 0.55, z0: -2.3, z1: 2.3, floor: lerp(5.8, 3.85, outline), radius: 0.3 },
      ];
    case 'classII':
      return [
        { x0: -2.6, x1: 3.6, z0: -1.0, z1: 1.0, floor: lerp(5.6, 3.75, outline) },
        { x0: 3.0, x1: 7.0, z0: -1.85, z1: 1.85, floor: lerp(5.2, 1.0, outline) },
      ];
    case 'selective':
    case 'nonSelective':
      return [{ x0: -2.8, x1: 2.8, z0: -1.7, z1: 1.7, floor: lerp(5.6, 3.7, outline), radius: 0.5 }];
  }
}

/**
 * Excavation ellipsoid size. Selective removal stops short of the deepest (soft) dentin;
 * every other shape, including non-selective removal, takes the lesion to hard dentin.
 */
export function excavationSize(shape: CavityShape, lesion: LesionVisual, e: number) {
  const f = SITE_FRAME_DATA[SHAPE_SITE[shape]];
  const spread = 0.7 + 1.9 * lesion.dentinDepth;
  const lesionDepth = lesion.dentinDepth * f.dentinToPulp + 0.08;
  const selective = shape === 'selective';
  const depth = selective ? Math.max(0.3, lesionDepth - 0.75) : lesionDepth + 0.2;
  const lateral = selective ? spread + 0.35 : spread + 0.2;
  return { lateral, vertical: depth * e + 0.05 };
}

/**
 * Remaining dentin between the deepest point of the preparation and the pulp, measured
 * along the lesion axis in this model (mm-scaled units). Educational, not a clinical measurement.
 */
export function remainingDentinOverPulp(cavity: CavityVisual | null, lesion: LesionVisual | null): number | null {
  if (!cavity) return null;
  const f = SITE_FRAME_DATA[SHAPE_SITE[cavity.shape]];
  const toPulp = f.enamelThickness + f.dentinToPulp;
  const { outline, excavation } = phases(q(cavity.depth, CAVITY_STEPS));
  const len = Math.hypot(...f.axis);
  const dir = f.axis.map((v) => v / len);
  let reach = 0;
  // Outline boxes: furthest point of the lesion axis inside a box (slab test).
  for (const b of outlineBoxes(cavity.shape, outline)) {
    const lo = [b.x0, b.floor, b.z0];
    const hi = [b.x1, TOP, b.z1];
    let tMin = -Infinity;
    let tMax = Infinity;
    for (let k = 0; k < 3; k++) {
      const o = f.origin[k];
      const d = dir[k];
      if (Math.abs(d) < 1e-9) {
        if (o < lo[k] || o > hi[k]) tMax = -Infinity;
        continue;
      }
      const t1 = (lo[k] - o) / d;
      const t2 = (hi[k] - o) / d;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    }
    if (tMax >= Math.max(0, tMin)) reach = Math.max(reach, tMax);
  }
  if (excavation > 0.01 && lesion && lesion.dentinDepth > 0.02) {
    const { vertical } = excavationSize(cavity.shape, lesion, excavation);
    reach = Math.max(reach, f.enamelThickness - 0.1 + vertical);
  }
  if (reach <= 0) return null;
  return Math.max(0, toPulp - reach);
}
