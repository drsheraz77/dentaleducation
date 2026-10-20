import * as THREE from 'three';
import { buildToothGeometries, type ToothGeometries } from './anatomy';
import { smoothstep } from './revolve';

/**
 * The base anatomy is built once per page and shared by every tooth instance
 * (e.g., before/after comparison). It lives for the app's lifetime.
 */
let tooth: ToothGeometries | null = null;
export function getToothGeometries(): ToothGeometries {
  tooth ??= buildToothGeometries();
  return tooth;
}

export interface BiofilmData {
  film: THREE.BufferGeometry;
  bacteria: { pos: THREE.Vector3; normal: THREE.Vector3; rot: [number, number, number] }[];
}

/** Deterministic PRNG so the biofilm looks identical between sessions. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stagnation weighting: fissures and fossae collect the most biofilm. */
export function biofilmWeight(x: number, y: number, z: number): number {
  const top = smoothstep(4.5, 5.3, y);
  const centralGroove = Math.exp(-(z * z) / 0.45) * (1 - smoothstep(3.2, 4.2, Math.abs(x)));
  const bucco = Math.exp(-(x * x) / 0.25) * (1 - smoothstep(2.6, 3.8, Math.abs(z)));
  const fossa = Math.exp(-(x * x + z * z) / 2.2);
  return top * Math.min(1, Math.max(centralGroove, bucco * 0.8, fossa));
}

let biofilm: BiofilmData | null = null;
export function getBiofilmGeometry(): BiofilmData {
  if (biofilm) return biofilm;
  const crown = getToothGeometries().crownOuter;
  const film = crown.clone();
  const pos = film.getAttribute('position');
  const nrm = film.getAttribute('normal');
  const colors = new Float32Array(pos.count * 4);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const candidates: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    const w = biofilmWeight(p.x, p.y, p.z);
    p.addScaledVector(n, 0.04 + 0.08 * w);
    pos.setXYZ(i, p.x, p.y, p.z);
    colors.set([1, 1, 1, Math.min(1, w * 1.3)], i * 4);
    if (w > 0.55) candidates.push(i);
  }
  film.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  film.computeVertexNormals();

  const rand = mulberry32(1234);
  const bacteria: BiofilmData['bacteria'] = [];
  for (let k = 0; k < 160 && candidates.length; k++) {
    const i = candidates[Math.floor(rand() * candidates.length)];
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const nn = new THREE.Vector3().fromBufferAttribute(nrm, i).normalize();
    v.addScaledVector(nn, 0.05 + rand() * 0.08);
    v.x += (rand() - 0.5) * 0.15;
    v.z += (rand() - 0.5) * 0.15;
    bacteria.push({ pos: v, normal: nn, rot: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] });
  }
  biofilm = { film, bacteria };
  return biofilm;
}
