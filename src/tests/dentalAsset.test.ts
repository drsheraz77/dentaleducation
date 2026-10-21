// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Box3, type Mesh } from 'three';

describe('realistic tooth asset (public/models/dental/lower-molar-47.glb)', () => {
  it('decodes with GLTFLoader + meshopt and contains the five named layers', async () => {
    const buf = readFileSync('public/models/dental/lower-molar-47.glb');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(ab, '');
    const names: string[] = [];
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) names.push(o.name);
    });
    expect(names.sort()).toEqual(['enamel', 'lamina', 'pdl', 'pulp', 'tooth']);
    const tooth = gltf.scene.getObjectByName('tooth') as Mesh;
    gltf.scene.updateMatrixWorld(true);
    // Quantised positions carry their scale in the node transform, so measure in world space.
    const bb = new Box3().setFromObject(tooth);
    // Mandibular second molar, millimetres: crown up, roots down.
    expect(bb.max.y).toBeGreaterThan(5);
    expect(bb.min.y).toBeLessThan(-10);
  });
});
