import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildToothGeometries, TOOTH } from '../three/geometry/anatomy';

/** Cast a ray straight down and report the first surface height of a mesh. */
function surfaceY(geometry: THREE.BufferGeometry, x: number, z: number, from = 20): number | null {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const rc = new THREE.Raycaster(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0));
  const hit = rc.intersectObject(mesh)[0];
  return hit ? hit.point.y : null;
}

describe('anatomical landmarks used to place lesions and cavities', () => {
  const g = buildToothGeometries();
  it('central fossa surface, DEJ and pulp roof match TOOTH constants (±0.3 mm)', () => {
    const fossa = surfaceY(g.crownOuter, 0, 0)!;
    const dej = surfaceY(g.dentin, 0, 0)!;
    const pulp = surfaceY(g.pulp, 0, 0)!;
    console.log({ fossa, dej, pulp, cusp: surfaceY(g.crownOuter, 2.4, 2.0) });
    expect(Math.abs(fossa - TOOTH.fossaSurfaceY)).toBeLessThan(0.3);
    expect(Math.abs(dej - TOOTH.dejCenterY)).toBeLessThan(0.3);
    expect(Math.abs(pulp - TOOTH.pulpRoofY)).toBeLessThan(0.3);
  });
  it('keeps enamel thicker over cusps than at the fossa', () => {
    const cuspEnamel = surfaceY(g.crownOuter, 2.4, 2.0)! - surfaceY(g.dentin, 2.4, 2.0)!;
    const fossaEnamel = surfaceY(g.crownOuter, 0, 0)! - surfaceY(g.dentin, 0, 0)!;
    expect(cuspEnamel).toBeGreaterThan(fossaEnamel);
  });
});
