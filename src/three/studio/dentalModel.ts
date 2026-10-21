import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { DentalAsset, LayerId } from '../../data/studio/assets';
import type { StructureId } from '../../types';
import type { SiteFrame } from '../geometry/lesion';
import { sectionContains, sliceMesh, worldGeometry, type MeshSection } from '../geometry/slice';

/**
 * Loads a dental GLB and derives everything the studio needs from the real geometry:
 * world-space layers, exact mesiodistal sections, a lesion site frame measured on the
 * tooth (occlusal fossa, enamel thickness, distance to the pulp) and label anchors.
 */

export interface ProcessedLayer {
  id: LayerId;
  geometry: THREE.BufferGeometry;
  section: MeshSection;
}

export interface DentalModelData {
  layers: Record<LayerId, ProcessedLayer>;
  bounds: THREE.Box3;
  /** Lesion placement measured at the central fossa, on the section plane. */
  fossa: SiteFrame;
  /** Pulp roof directly under the fossa. */
  pulpRoof: THREE.Vector3;
  /** Interior points of each tissue on the cut face (for callouts), right-hand half preferred. */
  sectionAnchors: Partial<Record<StructureId, [number, number, number]>>;
  /** Points on the outer surface facing +Z (for labels in the external view). */
  externalAnchors: Partial<Record<StructureId, [number, number, number]>>;
}

const cache = new Map<string, Promise<DentalModelData>>();

export function loadDentalModel(url: string, asset: DentalAsset, onProgress?: (fraction: number) => void): Promise<DentalModelData> {
  const hit = cache.get(url);
  if (hit) return hit;
  const promise = new Promise<DentalModelData>((resolve, reject) => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      url,
      (gltf) => {
        try {
          resolve(processModel(gltf.scene, asset));
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
      (ev) => {
        if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total);
      },
      (err) => reject(err instanceof Error ? err : new Error(`Could not load ${url}`)),
    );
  });
  cache.set(url, promise);
  // A failed load should be retryable.
  promise.catch(() => cache.delete(url));
  return promise;
}

export function processModel(scene: THREE.Object3D, asset: DentalAsset): DentalModelData {
  scene.updateMatrixWorld(true);
  const layers = {} as Record<LayerId, ProcessedLayer>;
  for (const l of asset.layers) {
    const mesh = scene.getObjectByName(l.node) as THREE.Mesh | undefined;
    if (!mesh?.isMesh) throw new Error(`The model file has no "${l.node}" layer.`);
    const geometry = worldGeometry(mesh);
    layers[l.id] = { id: l.id, geometry, section: sliceMesh(geometry) };
  }
  const bounds = new THREE.Box3();
  Object.values(layers).forEach((l) => bounds.union(l.geometry.boundingBox!));

  const { frame, pulpRoof } = measureFossa(layers);
  return {
    layers,
    bounds,
    fossa: frame,
    pulpRoof,
    sectionAnchors: pickSectionAnchors(layers),
    externalAnchors: pickExternalAnchors(layers),
  };
}

function hits(geometry: THREE.BufferGeometry, origin: THREE.Vector3, dir: THREE.Vector3): THREE.Intersection[] {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  return new THREE.Raycaster(origin, dir).intersectObject(mesh);
}

/**
 * The central fossa: the lowest point of the occlusal enamel along the mesiodistal line on
 * the section plane (z = 0), searched over the middle of the crown.
 */
export function measureFossa(layers: Record<LayerId, ProcessedLayer>): { frame: SiteFrame; pulpRoof: THREE.Vector3 } {
  const enamel = layers.enamel.geometry;
  const bb = enamel.boundingBox!;
  const half = (bb.max.x - bb.min.x) * 0.22;
  const down = new THREE.Vector3(0, -1, 0);
  let best: { x: number; outer: number; dej: number } | null = null;
  for (let x = -half; x <= half; x += 0.1) {
    const h = hits(enamel, new THREE.Vector3(x, bb.max.y + 5, 0), down);
    if (h.length < 2) continue;
    if (!best || h[0].point.y < best.outer) best = { x, outer: h[0].point.y, dej: h[1].point.y };
  }
  if (!best) throw new Error('Could not locate the occlusal surface of the model.');
  const pulpHit = hits(layers.pulp.geometry, new THREE.Vector3(best.x, best.dej, 0), down)[0];
  if (!pulpHit) throw new Error('Could not locate the pulp chamber under the fossa.');
  const frame: SiteFrame = {
    origin: new THREE.Vector3(best.x, best.outer, 0),
    axis: down.clone(),
    enamelThickness: best.outer - best.dej,
    dentinToPulp: best.dej - pulpHit.point.y,
    aspect: [1.35, 0.8],
  };
  return { frame, pulpRoof: pulpHit.point.clone() };
}

/** Distance from p to the nearest edge of any loop of the given sections. */
function clearance(p: THREE.Vector2, sections: MeshSection[]): number {
  let best = Infinity;
  for (const s of sections) {
    for (const shape of s.shapes) {
      for (const loop of [shape.outer, ...shape.holes]) {
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i];
          const b = loop[(i + 1) % loop.length];
          const ab = b.clone().sub(a);
          const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-9), 0, 1);
          best = Math.min(best, a.clone().addScaledVector(ab, t).distanceTo(p));
        }
      }
    }
  }
  return best;
}

/**
 * For each tissue, the point of its visible cut face (not covered by a tissue drawn on top)
 * that is furthest from any boundary — on the mesial (+x) half, where the callout column is.
 */
export function pickSectionAnchors(layers: Record<LayerId, ProcessedLayer>): Partial<Record<StructureId, [number, number, number]>> {
  // Drawing order on the cut face, innermost last.
  const order: { id: LayerId; structure: StructureId }[] = [
    { id: 'lamina', structure: 'lamina' },
    { id: 'pdl', structure: 'pdl' },
    { id: 'tooth', structure: 'dentin' },
    { id: 'enamel', structure: 'enamel' },
    { id: 'pulp', structure: 'pulp' },
  ];
  const bb = layers.lamina.geometry.boundingBox!.clone().union(layers.tooth.geometry.boundingBox!);
  const best: Partial<Record<StructureId, { p: THREE.Vector2; score: number }>> = {};
  const p = new THREE.Vector2();
  for (let x = 0.3; x <= bb.max.x; x += 0.2) {
    for (let y = bb.min.y; y <= bb.max.y; y += 0.2) {
      p.set(x, y);
      let top = -1;
      order.forEach((o, i) => {
        if (sectionContains(layers[o.id].section, p)) top = i;
      });
      if (top < 0) continue;
      const covering = order.slice(top).map((o) => layers[o.id].section);
      const score = clearance(p, covering);
      const id = order[top].structure;
      if (!best[id] || score > best[id]!.score) best[id] = { p: p.clone(), score };
    }
  }
  return Object.fromEntries(Object.entries(best).map(([k, v]) => [k, [v!.p.x, v!.p.y, 0]])) as Partial<
    Record<StructureId, [number, number, number]>
  >;
}

/** Surface points facing the default camera (+Z) for the external view. */
export function pickExternalAnchors(layers: Record<LayerId, ProcessedLayer>): Partial<Record<StructureId, [number, number, number]>> {
  const forward = new THREE.Vector3(0, 0, -1);
  const tooth = layers.tooth.geometry.boundingBox!;
  const enamel = layers.enamel.geometry.boundingBox!;
  // Scan sideways from the preferred x so a ray between the roots (furcation) still finds a surface.
  const at = (id: LayerId, x: number, y: number) => {
    for (let d = 0; d < 8; d += 0.25) {
      for (const sx of [x + d, x - d]) {
        const h = hits(layers[id].geometry, new THREE.Vector3(sx, y, 40), forward)[0];
        if (h) return [h.point.x, h.point.y, h.point.z] as [number, number, number];
      }
    }
    return undefined;
  };
  const crownY = enamel.min.y + (enamel.max.y - enamel.min.y) * 0.55;
  const rootY = tooth.min.y * 0.45;
  return {
    enamel: at('enamel', 1.5, crownY),
    dentin: at('tooth', 1.2, rootY),
    pdl: at('pdl', -1.8, rootY * 1.25),
    lamina: at('lamina', -2.2, rootY * 1.6),
  };
}
