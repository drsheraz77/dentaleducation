import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { StructureId } from '../../types';
import type { MeshSection } from '../geometry/slice';
import { HIGHLIGHT, useDisposable } from '../materials';

/**
 * Exact cut faces of the scanned tissues, drawn flat on the section plane in a fixed
 * order (outer tissues first). Where a cavity removes tooth structure, a stencil mask
 * keeps the cut faces from being drawn across it, so the cavity stays open on the cut.
 */

export interface CapSpec {
  key: string;
  section: MeshSection;
  color: string;
  structureId: StructureId;
  /** Drawing order on the plane: higher sits on top. */
  layer: number;
}

const STENCIL_REF = 1;

function outlineGeometry(section: MeshSection): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const shape of section.shapes) {
    for (const loop of [shape.outer, ...shape.holes]) {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        pts.push(a.x, a.y, 0, b.x, b.y, 0);
      }
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}

function maskMaterial(mat: THREE.Material, masked: boolean) {
  // Stencil test: skip pixels inside the cavity mask.
  mat.stencilWrite = masked;
  mat.stencilRef = STENCIL_REF;
  mat.stencilFunc = THREE.NotEqualStencilFunc;
  mat.stencilFail = THREE.KeepStencilOp;
  mat.stencilZFail = THREE.KeepStencilOp;
  mat.stencilZPass = THREE.KeepStencilOp;
  mat.needsUpdate = true;
}

function Cap({ spec, highlight, masked }: { spec: CapSpec; highlight: number; masked: boolean }) {
  const mat = useDisposable(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const lineMat = useDisposable(() => new THREE.LineBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.55 }), []);
  const outline = useDisposable(() => outlineGeometry(spec.section), [spec.section]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    mat.color.set(spec.color).lerp(HIGHLIGHT, highlight * 0.45);
    lineMat.color.set(spec.color).multiplyScalar(0.55);
    maskMaterial(mat, masked);
    maskMaterial(lineMat, masked);
    invalidate(); // rendering is on demand
  }, [mat, lineMat, spec.color, highlight, masked, invalidate]);
  const userData = useMemo(() => ({ structureId: spec.structureId }), [spec.structureId]);
  const z = 0.001 + spec.layer * 0.004;
  return (
    <>
      <mesh geometry={spec.section.geometry} material={mat} position={[0, 0, z]} renderOrder={1} userData={userData} dispose={null} />
      <lineSegments geometry={outline} material={lineMat} position={[0, 0, z + 0.002]} renderOrder={2} raycast={() => null} />
    </>
  );
}

function CavityMask({ section }: { section: MeshSection }) {
  const mat = useDisposable(
    () =>
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        depthTest: false,
        stencilWrite: true,
        stencilRef: STENCIL_REF,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      }),
    [],
  );
  return <mesh geometry={section.geometry} material={mat} position={[0, 0, 0.1]} renderOrder={-1} raycast={() => null} dispose={null} />;
}

export function ToothCrossSection({
  caps,
  cavity,
  highlightOf,
}: {
  caps: CapSpec[];
  cavity: MeshSection | null;
  highlightOf: (id: StructureId) => number;
}) {
  return (
    <group>
      {cavity && <CavityMask section={cavity} />}
      {[...caps]
        .sort((a, b) => a.layer - b.layer)
        .map((c) => (
          <Cap key={c.key} spec={c} highlight={highlightOf(c.structureId)} masked={!!cavity} />
        ))}
    </group>
  );
}
