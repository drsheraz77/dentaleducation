import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { CavityVisual, LesionSite, LesionVisual } from '../types';
import { CAVITATION_STEPS, CAVITY_STEPS } from './geometry/cavity';

/**
 * Eases a numeric parameter towards its target and reports quantised values.
 * Quantisation keeps the number of distinct CSG states small (and cacheable) while
 * still producing a visible, animated transition. Rates are educational, NOT
 * biological: nothing here is time-calibrated.
 */
function useEasedNumber(
  target: number,
  ratePerSecond: number,
  steps: number,
  opts: { resetKey?: string; instantDecrease?: boolean } = {},
): number {
  const quant = (v: number) => Math.round(v * steps) / steps;
  const [value, setValue] = useState(() => quant(target));
  const current = useRef(target);
  const previousKey = useRef(opts.resetKey);
  const invalidate = useThree((s) => s.invalidate);
  const { resetKey, instantDecrease } = opts;

  useEffect(() => {
    const prevKey = previousKey.current;
    previousKey.current = resetKey;
    // Jump instead of easing when the context changes, or when going backwards
    // (cut tissue does not "grow back").
    const keyChanged = prevKey !== undefined && resetKey !== undefined && prevKey !== resetKey;
    if (keyChanged || (instantDecrease && target < current.current)) {
      current.current = target;
      setValue(Math.round(target * steps) / steps);
    }
    invalidate();
  }, [target, resetKey, instantDecrease, steps, invalidate]);

  useFrame((state, delta) => {
    const diff = target - current.current;
    if (Math.abs(diff) < 1e-4) {
      current.current = target;
      if (value !== quant(target)) setValue(quant(target));
      return;
    }
    const dt = Math.min(delta, 0.05);
    current.current += Math.sign(diff) * Math.min(Math.abs(diff), ratePerSecond * dt);
    const q = quant(current.current);
    if (q !== value) setValue(q);
    state.invalidate();
  });
  return value;
}

/** Remembers the last non-null value of something (render-phase derived state). */
function useLastDefined<T>(v: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(v ?? null);
  if (v != null && v !== last) {
    setLast(v);
    return v;
  }
  return last;
}

export function useEasedLesion(target: LesionVisual | null, speed: number): { lesion: LesionVisual | null; settled: boolean } {
  const site = useLastDefined<LesionSite>(target?.site) ?? 'occlusal';
  const rate = 0.7 * speed;
  const e = useEasedNumber(target?.enamelDepth ?? 0, rate, 20, { resetKey: site });
  const d = useEasedNumber(target?.dentinDepth ?? 0, rate, 20, { resetKey: site });
  const c = useEasedNumber(target?.cavitation ?? 0, rate * 0.8, CAVITATION_STEPS, { resetKey: site });
  if (!target) {
    // Lesion is being removed from the scene: shrink it away, then drop it.
    if (e === 0 && d === 0 && c === 0) return { lesion: null, settled: true };
    return {
      lesion: { site, enamelDepth: e, dentinDepth: d, cavitation: c, surfaceTone: 'none', surfaceIntensity: 0, pulpInflammation: 0 },
      settled: false,
    };
  }
  const settled =
    Math.abs(e - target.enamelDepth) < 0.03 && Math.abs(d - target.dentinDepth) < 0.03 && Math.abs(c - target.cavitation) < 0.06;
  return { lesion: { ...target, enamelDepth: e, dentinDepth: d, cavitation: c }, settled };
}

export function useEasedCavity(target: CavityVisual | null, speed: number): { cavity: CavityVisual | null; cutting: boolean } {
  const shape = useLastDefined<CavityVisual['shape']>(target?.shape);
  const depth = useEasedNumber(target?.depth ?? 0, 0.5 * speed, CAVITY_STEPS, {
    resetKey: shape ?? undefined,
    instantDecrease: true,
  });
  const cutting = !!target && Math.abs(depth - target.depth) > 0.05;
  if (!shape || depth <= 0) return { cavity: null, cutting };
  return { cavity: { shape, depth }, cutting };
}
