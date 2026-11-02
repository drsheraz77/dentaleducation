import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CavityShape, CavityVisual, LesionVisual } from '../../types';
import { SITE_FRAMES, buildCavitationBrush, buildLesionGeometries, siteMatrix } from './lesion';
import { CAVITATION_STEPS, CAVITY_STEPS, SHAPE_SITE, TOP, excavationSize, outlineBoxes, phases, q } from './prepPlan';

export { CAVITATION_STEPS, CAVITY_STEPS, SHAPE_SITE, q, remainingDentinOverPulp } from './prepPlan';

/**
 * Tissue removal is simulated with constructive solid geometry (three-bvh-csg):
 * the planned preparation volume ("cutter") is subtracted from the enamel shell,
 * the dentin body and the lesion meshes. The result is real geometry — walls,
 * floors and exposed dentin — not a colour swap. Restorations are the cutter
 * intersected with the original crown contour, sliced into increments.
 *
 * Each distinct state is cached, so scrubbing the timeline back and forth is instant.
 */

const TISSUE = new THREE.MeshBasicMaterial();
const CUT = new THREE.MeshBasicMaterial();

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];
evaluator.useGroups = true;

function brush(geometry: THREE.BufferGeometry, material: THREE.Material): Brush {
  const b = new Brush(geometry, material);
  b.updateMatrixWorld();
  return b;
}

function stripToPositionNormal(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  return g;
}

/** Relabel groups as 0 = original tissue surface, 1 = freshly cut surface. */
function relabelGroups(result: Brush): THREE.BufferGeometry {
  const g = result.geometry;
  const mats = Array.isArray(result.material) ? result.material : [result.material];
  g.groups.forEach((grp) => {
    grp.materialIndex = mats[grp.materialIndex ?? 0] === CUT ? 1 : 0;
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* Preparation outlines                                                */
/* ------------------------------------------------------------------ */

const lerp = THREE.MathUtils.lerp;

function box(x0: number, x1: number, z0: number, z1: number, floor: number, radius = 0.35): THREE.BufferGeometry {
  const h = TOP - floor;
  const g = new RoundedBoxGeometry(x1 - x0, h, z1 - z0, 3, Math.min(radius, h / 2.01));
  g.translate((x0 + x1) / 2, floor + h / 2, (z0 + z1) / 2);
  return stripToPositionNormal(g);
}

function outlineGeometries(shape: CavityShape, outline: number): THREE.BufferGeometry[] {
  return outlineBoxes(shape, outline).map((b) => box(b.x0, b.x1, b.z0, b.z1, b.floor, b.radius));
}

/** Ellipsoid that removes carious dentin; selective removal leaves the deepest soft dentin. */
function excavationGeometry(shape: CavityShape, lesion: LesionVisual | null, e: number): THREE.BufferGeometry | null {
  if (e <= 0.01 || !lesion || lesion.dentinDepth <= 0.02) return null;
  const site = SHAPE_SITE[shape];
  const f = SITE_FRAMES[site];
  const { lateral, vertical } = excavationSize(shape, lesion, e);
  const g = new THREE.SphereGeometry(1, 40, 24);
  g.scale(lateral * f.aspect[0] * Math.max(0.35, e), vertical, lateral * f.aspect[1] * Math.max(0.35, e));
  g.translate(0, -f.enamelThickness + 0.1, 0);
  g.applyMatrix4(siteMatrix(site));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  g.dispose();
  return welded;
}

function union(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geoms.length === 0) return null;
  let acc = brush(geoms[0], CUT);
  for (let i = 1; i < geoms.length; i++) {
    acc = evaluator.evaluate(acc, brush(geoms[i], CUT), ADDITION);
  }
  return acc.geometry;
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

class GeometryCache {
  private map = new Map<string, THREE.BufferGeometry | null>();
  private limit: number;
  constructor(limit = 80) {
    this.limit = limit;
  }
  get(key: string, build: () => THREE.BufferGeometry | null): THREE.BufferGeometry | null {
    if (this.map.has(key)) {
      const v = this.map.get(key)!;
      this.map.delete(key);
      this.map.set(key, v);
      return v;
    }
    const v = build();
    this.map.set(key, v);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value as string;
      this.map.get(oldest)?.dispose();
      this.map.delete(oldest);
    }
    return v;
  }
  clear() {
    this.map.forEach((g) => g?.dispose());
    this.map.clear();
  }
  get size() {
    return this.map.size;
  }
}

export const csgCache = new GeometryCache();


export function lesionKey(lesion: LesionVisual | null): string {
  if (!lesion) return 'none';
  return [lesion.site, q(lesion.enamelDepth), q(lesion.dentinDepth), q(lesion.cavitation, CAVITATION_STEPS)].join(':');
}

export function cavityKey(cavity: CavityVisual | null): string {
  return cavity ? `${cavity.shape}:${q(cavity.depth, CAVITY_STEPS)}` : 'none';
}

/** The full volume removed from the tooth: preparation ∪ excavation ∪ cavitation. */
export function getCutter(cavity: CavityVisual | null, lesion: LesionVisual | null): THREE.BufferGeometry | null {
  const key = `cutter|${cavityKey(cavity)}|${lesionKey(lesion)}`;
  return csgCache.get(key, () => {
    const parts: THREE.BufferGeometry[] = [];
    if (lesion) {
      const cav = buildCavitationBrush({ ...lesion, cavitation: q(lesion.cavitation, CAVITATION_STEPS) });
      if (cav) {
        const welded = mergeVertices(cav, 1e-4);
        welded.computeVertexNormals();
        cav.dispose();
        parts.push(welded);
      }
    }
    if (cavity) {
      const depth = q(cavity.depth, CAVITY_STEPS);
      const { outline, excavation } = phases(depth);
      parts.push(...outlineGeometries(cavity.shape, outline));
      const ex = excavationGeometry(cavity.shape, lesion, excavation);
      if (ex) parts.push(ex);
    }
    return union(parts);
  });
}

export interface CutResult {
  geometry: THREE.BufferGeometry;
  /** true when the geometry contains a cut-surface group (materialIndex 1). */
  cut: boolean;
}

export function subtractCutter(
  name: string,
  source: THREE.BufferGeometry,
  cutter: THREE.BufferGeometry | null,
  cutterKey: string,
): CutResult {
  if (!cutter) return { geometry: source, cut: false };
  const result = csgCache.get(`${name}|${cutterKey}`, () => {
    const r = evaluator.evaluate(brush(source, TISSUE), brush(cutter, CUT), SUBTRACTION);
    return relabelGroups(r);
  });
  return result ? { geometry: result, cut: true } : { geometry: source, cut: false };
}

export interface LesionMeshes {
  enamel: THREE.BufferGeometry | null;
  dentinOuter: THREE.BufferGeometry | null;
  dentinInner: THREE.BufferGeometry | null;
}

export function getLesionMeshes(lesion: LesionVisual | null): LesionMeshes {
  if (!lesion) return { enamel: null, dentinOuter: null, dentinInner: null };
  const lk = lesionKey(lesion);
  // Build all three parts once per lesion key; cache each part individually for disposal.
  let built: ReturnType<typeof buildLesionGeometries> | null = null;
  const part = (k: keyof LesionMeshes) =>
    csgCache.get(`lesion-${k}|${lk}`, () => {
      built ??= buildLesionGeometries({
        ...lesion,
        enamelDepth: q(lesion.enamelDepth),
        dentinDepth: q(lesion.dentinDepth),
        cavitation: q(lesion.cavitation),
      });
      return built[k];
    });
  return { enamel: part('enamel'), dentinOuter: part('dentinOuter'), dentinInner: part('dentinInner') };
}

/** Lesion tissue minus the cutter. Returns null when everything has been removed. */
export function cutLesionPart(
  name: string,
  part: THREE.BufferGeometry | null,
  cutter: THREE.BufferGeometry | null,
  key: string,
): THREE.BufferGeometry | null {
  if (!part) return null;
  if (!cutter) return part;
  return csgCache.get(`${name}|${key}`, () => {
    const r = evaluator.evaluate(brush(part, TISSUE), brush(cutter, CUT), SUBTRACTION);
    const pos = r.geometry.getAttribute('position');
    if (!pos || pos.count < 3) return null;
    return relabelGroups(r);
  });
}

/* ------------------------------------------------------------------ */
/* Restorations                                                        */
/* ------------------------------------------------------------------ */

function slab(y0: number, y1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(20, Math.max(0.01, y1 - y0), 20);
  g.translate(0, (y0 + y1) / 2, 0);
  return stripToPositionNormal(g);
}

export interface RestorationGeometry {
  liner: THREE.BufferGeometry | null;
  increments: THREE.BufferGeometry[];
  floorY: number;
  topY: number;
}

/**
 * Restoration volume = cutter ∩ original crown contour, split into horizontal increments.
 * (Horizontal slicing is a simplification of oblique/incremental layering techniques.)
 */
export function getRestoration(
  crownOuter: THREE.BufferGeometry,
  cutter: THREE.BufferGeometry | null,
  cutterKey: string,
  totalIncrements: number,
  withLiner: boolean,
): RestorationGeometry {
  if (!cutter) return { liner: null, increments: [], floorY: 0, topY: 0 };
  const volume = csgCache.get(`restoration-volume|${cutterKey}`, () => {
    const r = evaluator.evaluate(brush(crownOuter, TISSUE), brush(cutter, CUT), INTERSECTION);
    r.geometry.clearGroups();
    return r.geometry;
  });
  if (!volume) return { liner: null, increments: [], floorY: 0, topY: 0 };
  volume.computeBoundingBox();
  const bb = volume.boundingBox!;
  const floorY = bb.min.y;
  const topY = bb.max.y + 0.05;
  const linerTop = withLiner ? floorY + 0.85 : floorY - 0.05;

  const cut = (key: string, y0: number, y1: number) =>
    csgCache.get(`restoration-${key}|${cutterKey}|${y0.toFixed(2)}`, () => {
      const r = evaluator.evaluate(brush(volume, TISSUE), brush(slab(y0, y1), CUT), INTERSECTION);
      r.geometry.clearGroups();
      return r.geometry.getAttribute('position')?.count ? r.geometry : null;
    });

  const liner = withLiner ? cut('liner', floorY - 0.05, linerTop) : null;
  const n = Math.max(1, totalIncrements);
  const increments: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const y0 = lerp(linerTop, topY, i / n);
    const y1 = lerp(linerTop, topY, (i + 1) / n);
    const g = cut(`inc${i}of${n}`, i === 0 ? y0 : y0 - 0.001, i === n - 1 ? topY + 1 : y1);
    if (g) increments.push(g);
  }
  return { liner, increments, floorY, topY };
}
