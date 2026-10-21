import * as THREE from 'three';
import { gaussian, revolve, smoothstep, type ProfilePoint } from './revolve';

/**
 * Simplified, scientifically *representative* mandibular first molar.
 *
 * Units are millimetres; the cemento-enamel junction (CEJ) is at y = 0, occlusal is +y,
 * mesial is +x, buccal is +z. Dimensions approximate textbook averages (crown ≈ 11 mm
 * mesiodistal, ≈ 10 mm buccolingual, roots ≈ 13–14 mm) but the shapes are idealised:
 * four cusps instead of five, two single-canal roots, and a super-elliptical crown.
 * This is NOT a validated anatomical model (see README "Known limitations").
 */

export const TOOTH = {
  aspect: [1.06, 0.94] as [number, number],
  squareness: 2.6,
  segments: 72,
  /** Approximate landmark heights at the central fossa, used to place lesions/cavities. */
  fossaSurfaceY: 5.2,
  dejCenterY: 4.06,
  pulpRoofY: 1.3,
  boneCrestY: -2.0,
  mesialRootX: 2.4,
  distalRootX: -2.4,
  rootTilt: 0.08,
} as const;

const CUSPS: [number, number][] = [
  [2.4, 2.0],
  [2.4, -2.0],
  [-2.4, 2.0],
  [-2.4, -2.0],
];

/** Occlusal anatomy: four cusps, central fossa, central groove. */
export function outerOcclusalField(x: number, z: number, y: number): number {
  const w = smoothstep(3.6, 5.6, y);
  if (w === 0) return 0;
  let h = 0;
  for (const [cx, cz] of CUSPS) h += 1.25 * gaussian(x, z, cx, cz, 1.15);
  h -= 0.6 * gaussian(x, z, 0, 0, 1.0);
  // central (mesiodistal) groove and buccal/lingual grooves
  h -= 0.45 * Math.exp(-(z * z) / 0.14) * Math.exp(-(x * x) / 16);
  h -= 0.3 * Math.exp(-(x * x) / 0.14) * Math.exp(-(z * z) / 9);
  return h * w;
}

/** Dentino-enamel junction mirrors the cusps (dentin horns) more gently. */
export function dejField(x: number, z: number, y: number): number {
  const w = smoothstep(3.0, 4.2, y);
  if (w === 0) return 0;
  let h = 0;
  for (const [cx, cz] of CUSPS) h += 0.8 * gaussian(x, z, cx, cz, 1.3);
  h -= 0.35 * gaussian(x, z, 0, 0, 1.2);
  return h * w;
}

export function pulpHornField(x: number, z: number, y: number): number {
  const w = smoothstep(0.3, 1.2, y);
  if (w === 0) return 0;
  let h = 0;
  for (const [cx, cz] of CUSPS) h += 1.0 * gaussian(x, z, cx * 0.83, cz * 0.5, 0.9);
  return h * w;
}

export const CROWN_OUTER: ProfilePoint[] = [
  { r: 4.15, y: 0 },
  { r: 4.6, y: 1.2 },
  { r: 4.95, y: 2.4 },
  { r: 4.95, y: 3.4 },
  { r: 4.7, y: 4.4 },
  { r: 4.1, y: 5.3 },
  { r: 3.0, y: 6.05 },
  { r: 1.5, y: 6.35 },
  { r: 0, y: 6.4 },
];

export const DEJ: ProfilePoint[] = [
  { r: 0, y: 4.25 },
  { r: 1.2, y: 4.25 },
  { r: 2.4, y: 4.2 },
  { r: 3.6, y: 4.0 },
  { r: 4.15, y: 3.4 },
  { r: 4.35, y: 2.4 },
  { r: 4.3, y: 1.2 },
  { r: 4.05, y: 0 },
];

/** Linear interpolation of a profile's radius at height y (profile must be monotonic in y over the range). */
export function radiusAt(profile: ProfilePoint[], y: number): number {
  const pts = [...profile].sort((a, b) => a.y - b.y);
  if (y <= pts[0].y) return pts[0].r;
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i].y) {
      const t = (y - pts[i - 1].y) / (pts[i].y - pts[i - 1].y);
      return THREE.MathUtils.lerp(pts[i - 1].r, pts[i].r, t);
    }
  }
  return pts[pts.length - 1].r;
}

const CEMENTUM_TRUNK: ProfilePoint[] = [
  { r: 0, y: -3.5 },
  { r: 3.65, y: -3.5, sharp: true },
  { r: 4.05, y: -1.5 },
  { r: 4.13, y: 0, sharp: true },
  { r: 0, y: 0 },
];

/** Outer radius of the tooth along its long axis (crown above CEJ, cementum below). */
export function toothOuterRadius(y: number): number {
  if (y >= 0) return radiusAt(CROWN_OUTER.slice(0, 6), y);
  return radiusAt(
    [
      { r: 3.65, y: -3.5 },
      { r: 4.05, y: -1.5 },
      { r: 4.13, y: 0 },
    ],
    y,
  );
}

const base = { aspect: TOOTH.aspect, squareness: TOOTH.squareness, segments: TOOTH.segments };

export interface ToothGeometries {
  crownOuter: THREE.BufferGeometry;
  enamel: THREE.BufferGeometry;
  dentin: THREE.BufferGeometry;
  pulp: THREE.BufferGeometry;
  cementumTrunk: THREE.BufferGeometry;
  rootDentin: THREE.BufferGeometry;
  rootCementum: THREE.BufferGeometry;
  rootCanal: THREE.BufferGeometry;
  pdlTrunk: THREE.BufferGeometry;
  rootPdl: THREE.BufferGeometry;
  bone: THREE.BufferGeometry;
  gingiva: THREE.BufferGeometry;
  gingivaRecession: THREE.BufferGeometry;
  boneRecession: THREE.BufferGeometry;
}

function rootProfile(inflate: number, top: number): ProfilePoint[] {
  return [
    { r: 0, y: top },
    { r: 1.9 + inflate, y: top, sharp: true },
    { r: 1.85 + inflate, y: -5 },
    { r: 1.5 + inflate, y: -9 },
    { r: 0.9 + inflate, y: -12.5 },
    { r: 0.35 + inflate * 0.8, y: -13.8 - inflate * 0.6 },
    { r: 0, y: -14 - inflate },
  ];
}

function canalProfile(): ProfilePoint[] {
  return [
    { r: 0, y: -1.6 },
    { r: 0.6, y: -1.6, sharp: true },
    { r: 0.5, y: -5 },
    { r: 0.35, y: -10 },
    { r: 0.15, y: -13.6 },
    { r: 0, y: -13.75 },
  ];
}

/** Two roots (mesial + distal), tilted apart, merged into one geometry. */
function pairOfRoots(profile: ProfilePoint[]): THREE.BufferGeometry {
  const make = (x: number, tilt: number) => {
    const g = revolve({ profile, segments: 40, aspect: [0.75, 1.15], squareness: 2.4, spacing: 0.4 });
    const top = new THREE.Matrix4().makeTranslation(0, 2.4, 0);
    const rot = new THREE.Matrix4().makeRotationZ(tilt);
    const back = new THREE.Matrix4().makeTranslation(x, -2.4, 0);
    g.applyMatrix4(back.multiply(rot).multiply(top));
    return g;
  };
  const mesial = make(TOOTH.mesialRootX, TOOTH.rootTilt);
  const distal = make(TOOTH.distalRootX, -TOOTH.rootTilt);
  const merged = mergeGeometries([mesial, distal]);
  mesial.dispose();
  distal.dispose();
  return merged;
}

export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const g of list) {
    const p = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    }
    const idx = g.getIndex();
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    else for (let i = 0; i < p.count; i++) indices.push(i + offset);
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setIndex(indices);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

function gingivaProfile(margin: number, bottom: number): ProfilePoint[] {
  const hug = (y: number) => toothOuterRadius(y) + 0.04;
  const pts: ProfilePoint[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const y = margin - ((margin - bottom) * i) / steps;
    pts.push({ r: hug(y), y, sharp: i === 0 || i === steps });
  }
  pts.push({ r: 7.0, y: bottom, sharp: true });
  pts.push({ r: 7.0, y: bottom + 1.2, sharp: true });
  pts.push({ r: 5.8, y: bottom + 1.9 });
  pts.push({ r: hug(margin) + 0.6, y: margin - 0.1 });
  return pts;
}

function boneProfile(top: number): ProfilePoint[] {
  return [
    { r: 0, y: -16.5 },
    { r: 6.9, y: -16.5, sharp: true },
    { r: 6.9, y: top - 0.3, sharp: true },
    { r: 6.6, y: top, sharp: true },
    { r: 0, y: top },
  ];
}

export function buildToothGeometries(): ToothGeometries {
  const crownOuter = revolve({
    ...base,
    profile: [{ r: 0, y: 0 }, ...CROWN_OUTER.map((p, i) => (i === 0 ? { ...p, sharp: true } : p))],
    fields: [outerOcclusalField],
    spacing: 0.2,
  });

  // Enamel is a true shell: outer crown surface + inner DEJ surface.
  const enamel = revolve({
    ...base,
    profile: [
      { ...CROWN_OUTER[0], sharp: true, surface: 0 },
      ...CROWN_OUTER.slice(1),
      { ...DEJ[0], surface: 1 },
      ...DEJ.slice(1, -1),
      { ...DEJ[DEJ.length - 1], sharp: true },
    ],
    fields: [outerOcclusalField, dejField],
    spacing: 0.2,
  });

  // Coronal dentin + root trunk. Sits 0.02 mm inside the enamel shell so section caps never z-fight.
  const dentin = revolve({
    ...base,
    profile: [
      { r: 0, y: -3.2 },
      { r: 3.4, y: -3.2, sharp: true },
      { r: 3.8, y: -1.5 },
      { r: 3.96, y: 0 },
      ...[...DEJ]
        .reverse()
        .slice(1)
        .map((p) => ({ r: p.r * 0.995, y: p.y - 0.02 })),
    ].map((p, i, arr) => (i === arr.length - 1 ? { ...p, r: 0 } : p)),
    fields: [(x, z, y) => dejField(x, z, y + 0.02)],
    spacing: 0.2,
  });

  const pulp = revolve({
    ...base,
    profile: [
      { r: 0, y: -1.8 },
      { r: 2.2, y: -1.8, sharp: true },
      { r: 2.6, y: -0.5 },
      { r: 2.6, y: 0.6 },
      { r: 2.0, y: 1.1 },
      { r: 1.0, y: 1.25 },
      { r: 0, y: 1.3 },
    ],
    fields: [pulpHornField],
    spacing: 0.15,
  });

  const cementumTrunk = revolve({ ...base, profile: CEMENTUM_TRUNK, spacing: 0.3 });
  const rootDentin = pairOfRoots(rootProfile(0, -2.4));
  const rootCementum = pairOfRoots(rootProfile(0.18, -2.6));
  const rootCanal = pairOfRoots(canalProfile());

  const pdlTrunk = revolve({
    ...base,
    profile: [
      { r: 0, y: -3.8 },
      { r: 3.9, y: -3.8, sharp: true },
      { r: 4.4, y: TOOTH.boneCrestY - 0.05, sharp: true },
      { r: 0, y: TOOTH.boneCrestY - 0.05 },
    ],
    spacing: 0.3,
  });
  const rootPdl = pairOfRoots(rootProfile(0.4, -3.4));

  const bone = planarUV(revolve({ ...base, profile: boneProfile(TOOTH.boneCrestY), spacing: 0.5 }), 0.14);
  const boneRecession = planarUV(revolve({ ...base, profile: boneProfile(TOOTH.boneCrestY - 2.5), spacing: 0.5 }), 0.14);
  const gingiva = revolve({ ...base, profile: gingivaProfile(1.0, TOOTH.boneCrestY + 0.02), spacing: 0.2 });
  const gingivaRecession = revolve({
    ...base,
    profile: gingivaProfile(-2.2, TOOTH.boneCrestY - 2.5 + 0.02),
    spacing: 0.2,
  });

  return {
    crownOuter,
    enamel,
    dentin,
    pulp,
    cementumTrunk,
    rootDentin,
    rootCementum,
    rootCanal,
    pdlTrunk,
    rootPdl,
    bone,
    gingiva,
    gingivaRecession,
    boneRecession,
  };
}

/** UVs from world x/y, so a texture on the section cut face is not distorted (bone trabeculae). */
function planarUV(g: THREE.BufferGeometry, scale: number): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * scale;
    uv[i * 2 + 1] = pos.getY(i) * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** A point on a root canal's centre line: same transform as pairOfRoots() (rotation about the root top). */
function canalCentre(side: 1 | -1, localY: number): THREE.Vector2 {
  const x0 = side === 1 ? TOOTH.mesialRootX : TOOTH.distalRootX;
  const tilt = side * TOOTH.rootTilt;
  const dy = localY + 2.4;
  return new THREE.Vector2(x0 - dy * Math.sin(tilt), dy * Math.cos(tilt) - 2.4);
}

export interface NeurovascularGeometries {
  artery: THREE.BufferGeometry;
  vein: THREE.BufferGeometry;
  nerve: THREE.BufferGeometry;
}

/**
 * Schematic neurovascular bundle, as drawn in textbook sections: vessels and a nerve
 * enter each apical foramen, run up the canals and loop through the pulp chamber.
 * Placed just behind the section plane (z < 0) so it shows on the cut face.
 */
export function buildNeurovascular(): NeurovascularGeometries {
  const half = (side: 1 | -1) => [
    canalCentre(side, -16.2),
    canalCentre(side, -14.6),
    canalCentre(side, -13.6),
    canalCentre(side, -10),
    canalCentre(side, -6),
    canalCentre(side, -3),
    canalCentre(side, -1.6),
    new THREE.Vector2(side * 2.15, -0.6),
    new THREE.Vector2(side * 1.95, 0.45),
    new THREE.Vector2(side * 1.55, 1.05),
    new THREE.Vector2(side * 0.8, 0.95),
  ];
  const centre = [...half(1), new THREE.Vector2(0, 0.9), ...half(-1).reverse()];
  const spine = new THREE.SplineCurve(centre);
  const samples = spine.getSpacedPoints(220);

  const tube = (offset: number, z: number, radius: number) => {
    const pts = samples.map((p, i) => {
      const t = spine.getTangentAt(i / (samples.length - 1));
      // Offset sideways from the centre line; narrower near the apices where the canal is thin.
      const narrow = p.y < -11 ? 0.55 : 1;
      return new THREE.Vector3(p.x - t.y * offset * narrow, p.y + t.x * offset * narrow, z);
    });
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, radius, 8, false);
    g.deleteAttribute('uv');
    return g;
  };
  return { artery: tube(0.17, -0.25, 0.1), vein: tube(-0.17, -0.3, 0.11), nerve: tube(0, -0.4, 0.07) };
}

export function disposeToothGeometries(g: ToothGeometries): void {
  Object.values(g).forEach((geom) => geom.dispose());
}
