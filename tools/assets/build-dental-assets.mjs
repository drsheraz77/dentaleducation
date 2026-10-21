/**
 * Builds the realistic tooth asset used by the Caries Learning Studio.
 *
 *   git clone --depth 1 https://github.com/NateSaindon/3Dentes ../3dentes
 *   node tools/assets/build-dental-assets.mjs ../3dentes
 *
 * Source: 3Dentes (Nate Saindon), anatomy meshes CC BY-NC 4.0 — see public/models/dental/ASSET_CATALOG.md.
 * The script does not invent geometry. It only:
 *   1. reads the per-structure STL meshes of one tooth (unchanged vertex positions),
 *   2. welds duplicate vertices and computes smooth normals (STL stores flat facet normals),
 *   3. applies ONE rigid transform (rotation + translation, no scaling) into the app frame:
 *      +Y = crown (occlusal), +X = mesial, +Z = buccal, y = 0 at the lowest enamel point (≈ CEJ),
 *   4. writes a GLB with one named node per structure, quantised and meshopt-compressed.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(process.argv[2] ?? '../3dentes');
const stlDir = join(src, 'assets/cbct/stl');
const outDir = resolve('public/models/dental');

/** Lower right second molar (Universal #31, FDI 47): a natural tooth. Both lower first molars carry zirconia crowns. */
const TOOTH = 'FMA55706';
/** Its mesial neighbour (#30), used only to find the mesial direction. */
const MESIAL_NEIGHBOUR = 'FMA55705';

const LAYERS = [
  { id: 'tooth', file: `${TOOTH}.stl` },
  { id: 'enamel', file: `${TOOTH}-enamel.stl` },
  { id: 'pulp', file: `${TOOTH}-pulp.stl` },
  { id: 'pdl', file: `${TOOTH}-pdl.stl` },
  { id: 'lamina', file: `${TOOTH}-lamina.stl` },
];

const loadStl = (file) => {
  const b = readFileSync(join(stlDir, file));
  const g = new STLLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  g.deleteAttribute('normal');
  const welded = mergeVertices(g, 1e-4);
  g.dispose();
  return welded;
};

const centroid = (g) => {
  const p = g.getAttribute('position');
  const c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) c.add(new THREE.Vector3().fromBufferAttribute(p, i));
  return c.divideScalar(p.count);
};

/** Principal (longest) axis of a vertex cloud by power iteration on its covariance. */
function principalAxis(g, c) {
  const p = g.getAttribute('position');
  const m = new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0).elements;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(c);
    const a = [v.x, v.y, v.z];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) m[r * 3 + k] += a[r] * a[k];
  }
  let axis = new THREE.Vector3(0, 0, 1);
  for (let it = 0; it < 64; it++) {
    axis = new THREE.Vector3(
      m[0] * axis.x + m[1] * axis.y + m[2] * axis.z,
      m[3] * axis.x + m[4] * axis.y + m[5] * axis.z,
      m[6] * axis.x + m[7] * axis.y + m[8] * axis.z,
    ).normalize();
  }
  return axis;
}

const geoms = Object.fromEntries(LAYERS.map((l) => [l.id, loadStl(l.file)]));
const toothC = centroid(geoms.tooth);
const enamelC = centroid(geoms.enamel);
const neighbourC = centroid(loadStl(`${MESIAL_NEIGHBOUR}.stl`));

// +Y: the tooth's long axis, pointing towards the crown (enamel side).
const up = principalAxis(geoms.tooth, toothC);
if (up.dot(enamelC.clone().sub(toothC)) < 0) up.negate();
// +X: towards the mesial neighbour, made perpendicular to the long axis.
const mesial = neighbourC.clone().sub(toothC);
mesial.addScaledVector(up, -mesial.dot(up)).normalize();
// +Z: completes a right-handed frame. For a lower right tooth this points laterally (buccal);
// checked below against the CT's lateral direction (−x is the patient's right).
const buccal = new THREE.Vector3().crossVectors(mesial, up).normalize();
if (buccal.x > 0) throw new Error('Unexpected orientation: +Z should point to the patient\'s right (buccal) for tooth #31.');

// Rigid transform: rotate the basis (mesial, up, buccal) onto (X, Y, Z), then translate.
const basis = new THREE.Matrix4().makeBasis(mesial, up, buccal);
const rot = basis.clone().transpose();
const rotated = (g) => g.clone().applyMatrix4(rot);
const enamelR = rotated(geoms.enamel);
enamelR.computeBoundingBox();
const toothR = rotated(geoms.tooth);
toothR.computeBoundingBox();
const offset = new THREE.Vector3(
  -(toothR.boundingBox.min.x + toothR.boundingBox.max.x) / 2,
  -enamelR.boundingBox.min.y,
  -(toothR.boundingBox.min.z + toothR.boundingBox.max.z) / 2,
);
const transform = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(rot);

const doc = new Document();
doc.createBuffer();
const scene = doc.createScene('tooth-31');
const report = [];
for (const l of LAYERS) {
  const g = geoms[l.id].clone().applyMatrix4(transform);
  g.computeVertexNormals();
  g.computeBoundingBox();
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const idx = g.getIndex();
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nrm.array)))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx.array)));
  const mesh = doc.createMesh(l.id).addPrimitive(prim);
  scene.addChild(doc.createNode(l.id).setMesh(mesh));
  const bb = g.boundingBox;
  report.push({ layer: l.id, source: l.file, triangles: idx.count / 3, vertices: pos.count, minY: +bb.min.y.toFixed(2), maxY: +bb.max.y.toFixed(2) });
}

await MeshoptEncoder.ready;
await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'lower-molar-47.glb');
const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTMeshoptCompression]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
writeFileSync(out, await io.writeBinary(doc));
const meta = {
  file: 'lower-molar-47.glb',
  tooth: { universal: 31, fdi: 47, name: 'Mandibular right second molar', fma: TOOTH },
  frame: '+Y occlusal, +X mesial, +Z buccal, millimetres, y = 0 at the lowest enamel vertex (≈ CEJ)',
  rigidTransform: transform.toArray(),
  layers: report,
  bytes: statSync(out).size,
};
writeFileSync(join(outDir, 'lower-molar-47.json'), JSON.stringify(meta, null, 2) + '\n');
console.table(report);
console.log(`wrote ${out} (${meta.bytes} bytes)`);
