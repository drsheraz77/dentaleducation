import * as THREE from 'three';

/**
 * Procedural "revolved solid" generator.
 *
 * A closed 2-D profile (r, y) is swept around the Y axis. Unlike THREE.LatheGeometry
 * it produces an indexed, seam-free, watertight mesh (poles are single vertices),
 * supports a super-elliptical cross section (teeth are not circular) and a
 * per-surface vertical displacement field (cusps, fossae, pulp horns).
 * Watertight output matters because the meshes are used as CSG operands.
 */

export interface ProfilePoint {
  r: number;
  y: number;
  /** Keep a crisp corner here (no spline smoothing through this point). */
  sharp?: boolean;
  /** Index into RevolveOptions.fields used for this point and the run that follows it. */
  surface?: number;
}

export type DisplacementField = (x: number, z: number, yBase: number) => number;

export interface RevolveOptions {
  profile: ProfilePoint[];
  segments?: number;
  /** Scale of the cross-section in x (mesiodistal) and z (buccolingual). */
  aspect?: [number, number];
  /** Super-ellipse exponent: 2 = ellipse, larger = squarer. */
  squareness?: number;
  fields?: (DisplacementField | null)[];
  /** Target spacing (mm) of densified profile points. */
  spacing?: number;
}

export function superellipseFactor(theta: number, n: number): number {
  if (n === 2) return 1;
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  return 1 / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
}

/** Densify a polyline with Catmull-Rom splines between break points (sharp corners, poles, surface changes). */
export function densifyProfile(points: ProfilePoint[], spacing: number): ProfilePoint[] {
  const surf: number[] = [];
  points.forEach((p, i) => surf.push(p.surface ?? (i > 0 ? surf[i - 1] : 0)));
  const isBreak = (i: number) =>
    i === 0 ||
    i === points.length - 1 ||
    !!points[i].sharp ||
    points[i].r === 0 ||
    points[i].surface !== undefined;

  const out: ProfilePoint[] = [];
  let s = 0;
  for (let e = 1; e < points.length; e++) {
    if (!isBreak(e)) continue;
    const run = points.slice(s, e + 1);
    const surface = surf[s];
    out.push({ r: points[s].r, y: points[s].y, surface, sharp: points[s].sharp });
    const bothPoles = run[0].r === 0 && run[run.length - 1].r === 0 && run.length === 2;
    if (!bothPoles) {
      const curve = new THREE.CatmullRomCurve3(
        run.map((p) => new THREE.Vector3(p.r, p.y, 0)),
        false,
        'centripetal',
      );
      const n = Math.max(1, Math.ceil(curve.getLength() / spacing));
      for (let k = 1; k < n; k++) {
        const q = run.length === 2 ? run[0] : null;
        if (q) {
          out.push({
            r: THREE.MathUtils.lerp(run[0].r, run[1].r, k / n),
            y: THREE.MathUtils.lerp(run[0].y, run[1].y, k / n),
            surface,
          });
        } else {
          const v = curve.getPointAt(k / n);
          out.push({ r: Math.max(1e-4, v.x), y: v.y, surface });
        }
      }
    }
    s = e;
  }
  const last = points[points.length - 1];
  out.push({ r: last.r, y: last.y, surface: surf[points.length - 1], sharp: last.sharp });
  return out;
}

export function signedVolume(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let vol = 0;
  const count = index ? index.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i;
    const ib = index ? index.getX(i + 1) : i + 1;
    const ic = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib);
    c.fromBufferAttribute(pos, ic);
    vol += a.dot(b.clone().cross(c)) / 6;
  }
  return vol;
}

export function revolve(options: RevolveOptions): THREE.BufferGeometry {
  const {
    segments = 72,
    aspect = [1, 1],
    squareness = 2,
    fields = [],
    spacing = 0.25,
  } = options;
  const profile = densifyProfile(options.profile, spacing);

  const positions: number[] = [];
  const ringStart: number[] = [];
  const ringIsPole: boolean[] = [];
  const cosT: number[] = [];
  const sinT: number[] = [];
  const kT: number[] = [];
  for (let j = 0; j < segments; j++) {
    const t = (j / segments) * Math.PI * 2;
    cosT.push(Math.cos(t));
    sinT.push(Math.sin(t));
    kT.push(superellipseFactor(t, squareness));
  }

  for (const p of profile) {
    const field = fields[p.surface ?? 0] ?? null;
    ringStart.push(positions.length / 3);
    if (p.r === 0) {
      ringIsPole.push(true);
      positions.push(0, p.y + (field ? field(0, 0, p.y) : 0), 0);
      continue;
    }
    ringIsPole.push(false);
    for (let j = 0; j < segments; j++) {
      const x = p.r * kT[j] * cosT[j] * aspect[0];
      const z = p.r * kT[j] * sinT[j] * aspect[1];
      positions.push(x, p.y + (field ? field(x, z, p.y) : 0), z);
    }
  }

  const indices: number[] = [];
  const n = profile.length;
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    if (i2 === 0 && n > 1 && ringIsPole[i] && ringIsPole[0]) continue;
    const poleA = ringIsPole[i];
    const poleB = ringIsPole[i2];
    if (poleA && poleB) continue;
    const a0 = ringStart[i];
    const b0 = ringStart[i2];
    for (let j = 0; j < segments; j++) {
      const j2 = (j + 1) % segments;
      if (poleA) {
        indices.push(a0, b0 + j, b0 + j2);
      } else if (poleB) {
        indices.push(a0 + j, b0, a0 + j2);
      } else {
        indices.push(a0 + j, b0 + j, b0 + j2);
        indices.push(a0 + j, b0 + j2, a0 + j2);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  if (signedVolume(geometry) < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const t = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = t;
    }
    geometry.setIndex(indices);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function gaussian(x: number, z: number, cx: number, cz: number, sigma: number): number {
  const dx = x - cx;
  const dz = z - cz;
  return Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));
}
