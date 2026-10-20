import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { StructureId } from '../types';
import { HIGHLIGHT, SECTION_PLANE } from './materials';

/**
 * Cross-section rendering.
 *
 * Every tissue is a closed solid nested inside its neighbour. In section mode a world
 * clipping plane removes the buccal half (z > 0); each solid additionally renders its
 * back faces with a flat, unlit "cap" colour. Looking into the cut, the nearest back
 * face belongs to the innermost tissue at that point, so the cut face reads as a solid
 * enamel / dentin / pulp cross-section without expensive stencil capping.
 */

export interface SectionMeshProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  capColor: string;
  structureId?: StructureId;
  section: boolean;
  highlight?: number;
  visible?: boolean;
  /** Set false for overlays that must not block picking. */
  pickable?: boolean;
  renderOrder?: number;
  /** Disable the cap (e.g. thin transparent overlays). */
  cap?: boolean;
}

export function applyClipping(materials: THREE.Material[], section: boolean, extra: THREE.Plane[] = []) {
  for (const m of materials) {
    const planes = section ? [SECTION_PLANE, ...extra] : extra.length ? extra : null;
    const prevLen = m.clippingPlanes?.length ?? 0;
    m.clippingPlanes = planes;
    if (prevLen !== (planes?.length ?? 0)) m.needsUpdate = true;
  }
}

const noRaycast = () => null;

export function SectionMesh({
  geometry,
  material,
  capColor,
  structureId,
  section,
  highlight = 0,
  visible = true,
  pickable = true,
  renderOrder,
  cap = true,
}: SectionMeshProps) {
  const capMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ side: THREE.BackSide, clippingPlanes: [SECTION_PLANE] }),
    [],
  );
  useEffect(() => () => capMaterial.dispose(), [capMaterial]);

  useEffect(() => {
    capMaterial.color.set(capColor).lerp(HIGHLIGHT, highlight * 0.45);
  }, [capMaterial, capColor, highlight]);

  useEffect(() => {
    const mats = Array.isArray(material) ? material : [material];
    applyClipping(mats, section);
    for (const m of mats) {
      if ('emissive' in m && m.emissive instanceof THREE.Color) {
        m.emissive.copy(HIGHLIGHT);
        (m as THREE.MeshStandardMaterial).emissiveIntensity = highlight * 0.45;
      }
    }
  }, [section, highlight, material]);

  const userData = useMemo(() => ({ structureId }), [structureId]);
  // three's Raycaster does not skip invisible objects, so disable picking explicitly.
  const pickProps = pickable && visible ? {} : { raycast: noRaycast };

  return (
    <group visible={visible}>
      <mesh
        geometry={geometry}
        material={material}
        userData={userData}
        renderOrder={renderOrder}
        {...pickProps}
        dispose={null}
      />
      {section && cap && (
        <mesh
          geometry={geometry}
          material={capMaterial}
          userData={userData}
          {...pickProps}
          dispose={null}
        />
      )}
    </group>
  );
}
