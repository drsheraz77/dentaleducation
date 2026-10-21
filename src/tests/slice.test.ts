// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sectionContains, sliceMesh, worldGeometry } from '../three/geometry/slice';

const welded = (g: THREE.BufferGeometry) => {
  const c = g.clone();
  c.deleteAttribute('normal');
  c.deleteAttribute('uv');
  return mergeVertices(c, 1e-5);
};

describe('exact mesh cross-sections', () => {
  it('cuts a box into its rectangle', () => {
    const s = sliceMesh(welded(new THREE.BoxGeometry(4, 2, 2)));
    expect(s.area).toBeCloseTo(8, 3);
    expect(sectionContains(s, new THREE.Vector2(0, 0))).toBe(true);
    expect(sectionContains(s, new THREE.Vector2(3, 0))).toBe(false);
  });

  it('keeps holes: a torus cut through its axis gives two discs', () => {
    const s = sliceMesh(welded(new THREE.TorusGeometry(3, 1, 32, 64).rotateX(Math.PI / 2)));
    expect(s.shapes).toHaveLength(2);
    expect(s.area).toBeCloseTo(2 * Math.PI, 1);
  });

  it('cuts every layer of the real tooth into closed sections', async () => {
    const buf = readFileSync('public/models/dental/lower-molar-47.glb');
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    const areas: Record<string, number> = {};
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      areas[m.name] = sliceMesh(worldGeometry(m)).area;
    });
    console.log(areas);
    // A molar's mesiodistal section: tens of mm² of tooth, a few mm² of pulp.
    expect(areas.tooth).toBeGreaterThan(60);
    expect(areas.pulp).toBeGreaterThan(3);
    expect(areas.pulp).toBeLessThan(areas.tooth);
    expect(areas.enamel).toBeGreaterThan(5);
  });
});
