import * as THREE from 'three';
import { buildNeurovascular, buildToothGeometries, type NeurovascularGeometries, type ToothGeometries } from './anatomy';
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

let neurovascular: NeurovascularGeometries | null = null;
export function getNeurovascular(): NeurovascularGeometries {
  neurovascular ??= buildNeurovascular();
  return neurovascular;
}

/**
 * Dentinal tubules on the section plane: S-shaped lines from the pulp wall to the
 * dentino-enamel junction (crown) or root surface (roots), found by casting rays
 * through the dentin and pulp solids. Drawn just behind the cut (z < 0).
 */
let tubules: THREE.BufferGeometry | null = null;
export function getDentinTubules(): THREE.BufferGeometry {
  if (tubules) return tubules;
  const g = getToothGeometries();
  const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = (geom: THREE.BufferGeometry) => new THREE.Mesh(geom, side);
  const pulp = mesh(g.pulp);
  const dentin = mesh(g.dentin);
  const canal = mesh(g.rootCanal);
  const root = mesh(g.rootDentin);
  const ray = new THREE.Raycaster();
  const z = -0.04;
  const segments: number[] = [];

  /** Hit distance of the nearest surface along the ray, or null. */
  const first = (m: THREE.Mesh, o: THREE.Vector3, d: THREE.Vector3) => {
    ray.set(o, d);
    return ray.intersectObject(m)[0]?.distance ?? null;
  };
  const addTubule = (o: THREE.Vector3, d: THREE.Vector3, inner: number, outer: number) => {
    const a = o.clone().addScaledVector(d, inner + 0.05);
    const b = o.clone().addScaledVector(d, outer - 0.05);
    const len = a.distanceTo(b);
    if (len < 0.4) return;
    const n = new THREE.Vector3(-d.y, d.x, 0);
    const steps = 16;
    let prev = a.clone();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Primary S-curvature of coronal tubules, scaled to the tubule's length.
      const p = a.clone().lerp(b, t).addScaledVector(n, Math.sin(t * Math.PI * 2) * len * 0.05);
      segments.push(prev.x, prev.y, z, p.x, p.y, z);
      prev = p;
    }
  };

  // Crown: rays fanning out from the centre of the pulp chamber.
  const centre = new THREE.Vector3(0, 0.1, z);
  for (let deg = 8; deg <= 172; deg += 3.2) {
    const d = new THREE.Vector3(Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180), 0);
    const inner = first(pulp, centre, d);
    const outer = first(dentin, centre, d);
    if (inner !== null && outer !== null && outer > inner) addTubule(centre, d, inner, outer);
  }
  // Roots: horizontal rays from each canal's centre line (roots tilt 0.08 rad from the root top at y = -2.4).
  for (const sideSign of [1, -1]) {
    for (let y = -3.4; y > -12.8; y -= 0.42) {
      const o = new THREE.Vector3(sideSign * (2.4 + (-y - 2.4) * 0.08), y, z);
      for (const dir of [1, -1]) {
        const d = new THREE.Vector3(dir, 0, 0);
        const inner = first(canal, o, d);
        const outer = first(root, o, d);
        if (inner !== null && outer !== null && outer > inner) addTubule(o, d, inner, outer);
      }
    }
  }
  side.dispose();
  tubules = new THREE.BufferGeometry();
  tubules.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  return tubules;
}

/** Spongy (trabecular) bone pattern for the bone's cut face: marrow spaces on a pale matrix. */
let boneTexture: THREE.CanvasTexture | null = null;
export function getBoneTexture(): THREE.CanvasTexture | null {
  if (boneTexture) return boneTexture;
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#f1d7b8';
  ctx.fillRect(0, 0, size, size);
  const rand = mulberry32(42);
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 4 + rand() * 8;
    const ry = 3 + rand() * 5;
    const rot = rand() * Math.PI;
    // Draw wrapped copies so the texture tiles without seams.
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fillStyle = '#b8574a';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#8a3a31';
        ctx.stroke();
      }
    }
  }
  boneTexture = new THREE.CanvasTexture(canvas);
  boneTexture.wrapS = boneTexture.wrapT = THREE.RepeatWrapping;
  boneTexture.colorSpace = THREE.SRGBColorSpace;
  return boneTexture;
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
