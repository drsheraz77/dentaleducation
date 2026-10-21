import * as THREE from 'three';

/**
 * Exact cross-sections of closed meshes through the plane z = 0.
 *
 * Unlike the procedural tooth (which draws cut faces with back-face "caps"), a real
 * scanned tooth has coincident and touching layers, so the cut face is computed:
 * every triangle crossing the plane contributes a segment, segments are chained into
 * closed loops, loops are nested (outer boundaries and holes) and triangulated.
 * Runs once per mesh when an asset loads.
 */

export type Loop = THREE.Vector2[];

/**
 * World-space Float32 copy of a mesh's geometry. glTF meshes compressed with
 * KHR_mesh_quantization store normalised integer positions with their scale in the
 * node transform; transforming those in place would clamp them to the integer range.
 */
export function worldGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  mesh.updateWorldMatrix(true, false);
  const src = mesh.geometry;
  const pos = src.getAttribute('position');
  const out = new THREE.BufferGeometry();
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    arr[i * 3] = pos.getX(i);
    arr[i * 3 + 1] = pos.getY(i);
    arr[i * 3 + 2] = pos.getZ(i);
  }
  out.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const index = src.getIndex();
  if (index) out.setIndex(Array.from(index.array as ArrayLike<number>));
  out.applyMatrix4(mesh.matrixWorld);
  out.computeVertexNormals();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

const EPS = 1e-6;
const key = (x: number, y: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;

/** Segments where the mesh's triangles cross z = 0 (world space of the geometry). */
export function planeSegments(geometry: THREE.BufferGeometry): [THREE.Vector2, THREE.Vector2][] {
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const n = index ? index.count : pos.count;
  const out: [THREE.Vector2, THREE.Vector2][] = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < n; i += 3) {
    for (let k = 0; k < 3; k++) {
      v[k].fromBufferAttribute(pos, index ? index.getX(i + k) : i + k);
      // Nudge vertices lying exactly on the plane so every crossing is a proper one.
      if (Math.abs(v[k].z) < EPS) v[k].z = EPS;
    }
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k < 3; k++) {
      const a = v[k];
      const b = v[(k + 1) % 3];
      if (a.z > 0 !== b.z > 0) {
        const t = a.z / (a.z - b.z);
        pts.push(new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      }
    }
    if (pts.length === 2) out.push([pts[0], pts[1]]);
  }
  return out;
}

/** Chain segments into closed loops (shared endpoints of a watertight mesh match exactly). */
export function chainLoops(segments: [THREE.Vector2, THREE.Vector2][]): Loop[] {
  const adj = new Map<string, { p: THREE.Vector2; next: string[] }>();
  const add = (a: THREE.Vector2, b: THREE.Vector2) => {
    const ka = key(a.x, a.y);
    const kb = key(b.x, b.y);
    if (ka === kb) return;
    if (!adj.has(ka)) adj.set(ka, { p: a, next: [] });
    if (!adj.has(kb)) adj.set(kb, { p: b, next: [] });
    adj.get(ka)!.next.push(kb);
    adj.get(kb)!.next.push(ka);
  };
  segments.forEach(([a, b]) => add(a, b));

  const used = new Set<string>();
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const loops: Loop[] = [];
  for (const [start] of adj) {
    for (const first of adj.get(start)!.next) {
      if (used.has(edgeKey(start, first))) continue;
      const loop: Loop = [adj.get(start)!.p];
      used.add(edgeKey(start, first));
      let prev = start;
      let cur = first;
      let guard = 0;
      while (cur !== start && guard++ < 1e6) {
        loop.push(adj.get(cur)!.p);
        const nextKey = adj.get(cur)!.next.find((k) => k !== prev && !used.has(edgeKey(cur, k)));
        if (!nextKey) break;
        used.add(edgeKey(cur, nextKey));
        prev = cur;
        cur = nextKey;
      }
      if (cur === start && loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

export function loopArea(loop: Loop): number {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    const q = loop[(i + 1) % loop.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInLoop(p: THREE.Vector2, loop: Loop): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i];
    const b = loop[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export interface SectionShape {
  outer: Loop;
  holes: Loop[];
}

/** Nest loops by containment depth: even depth = outer boundary, odd = hole of its parent. */
export function nestLoops(loops: Loop[]): SectionShape[] {
  const sorted = [...loops].sort((a, b) => Math.abs(loopArea(b)) - Math.abs(loopArea(a)));
  const parent: number[] = sorted.map(() => -1);
  const depth: number[] = sorted.map(() => 0);
  sorted.forEach((loop, i) => {
    for (let j = i - 1; j >= 0; j--) {
      if (pointInLoop(loop[0], sorted[j])) {
        parent[i] = j;
        depth[i] = depth[j] + 1;
        break;
      }
    }
  });
  const shapes = new Map<number, SectionShape>();
  sorted.forEach((loop, i) => {
    if (depth[i] % 2 === 0) shapes.set(i, { outer: loop, holes: [] });
  });
  sorted.forEach((loop, i) => {
    if (depth[i] % 2 === 1) shapes.get(parent[i])?.holes.push(loop);
  });
  return [...shapes.values()];
}

/** Triangulated cut face in the plane z = 0, facing +Z (towards the viewer of the section). */
export function sectionGeometry(shapes: SectionShape[]): THREE.BufferGeometry {
  const list = shapes.map((s) => {
    const shape = new THREE.Shape(s.outer);
    s.holes.forEach((h) => shape.holes.push(new THREE.Path(h)));
    return shape;
  });
  const g = new THREE.ShapeGeometry(list, 1);
  g.deleteAttribute('uv');
  return g;
}

export interface MeshSection {
  shapes: SectionShape[];
  geometry: THREE.BufferGeometry;
  area: number;
}

export function sliceMesh(geometry: THREE.BufferGeometry): MeshSection {
  const shapes = nestLoops(chainLoops(planeSegments(geometry)));
  const area = shapes.reduce((sum, s) => sum + Math.abs(loopArea(s.outer)) - s.holes.reduce((h, l) => h + Math.abs(loopArea(l)), 0), 0);
  return { shapes, geometry: sectionGeometry(shapes), area };
}

/** True when p lies inside the section (inside an outer boundary and not in one of its holes). */
export function sectionContains(section: MeshSection, p: THREE.Vector2): boolean {
  return section.shapes.some((s) => pointInLoop(p, s.outer) && !s.holes.some((h) => pointInLoop(p, h)));
}
