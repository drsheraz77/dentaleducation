import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { LesionVisual, StructureId } from '../types';
import { SectionMesh, applyClipping } from './CrossSectionView';
import { TISSUE_COLORS, useDisposable } from './materials';
import { getBiofilmGeometry, type BiofilmData } from './geometry/toothSingleton';

export interface CariesLayerProps {
  lesion: LesionVisual | null;
  parts: { enamel: THREE.BufferGeometry | null; dentinOuter: THREE.BufferGeometry | null; dentinInner: THREE.BufferGeometry | null };
  biofilm: number;
  acidChallenge: boolean;
  section: boolean;
  highlightOf: (id: StructureId) => number;
  animate: boolean;
}

export function CariesLayer({ lesion, parts, biofilm, acidChallenge, section, highlightOf, animate }: CariesLayerProps) {
  const enamelLesionMat = useDisposable(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), []);
  const outerMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.lesionDentinOuter, roughness: 0.9 }), []);
  const innerMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: TISSUE_COLORS.lesionDentinInner, roughness: 0.95 }), []);

  const brown = lesion?.surfaceTone === 'brown' || (lesion?.dentinDepth ?? 0) > 0;
  const enamelColor = brown ? '#c79a62' : '#fbfbf3';
  useEffect(() => {
    enamelLesionMat.color.set(enamelColor);
    if (lesion?.inactive) {
      outerMat.color.set('#6e4a24');
      innerMat.color.set('#3e2510');
    } else {
      outerMat.color.set(TISSUE_COLORS.lesionDentinOuter);
      innerMat.color.set(TISSUE_COLORS.lesionDentinInner);
    }
  }, [enamelColor, lesion?.inactive, enamelLesionMat, outerMat, innerMat]);

  const hl = highlightOf('lesion');
  const data = getBiofilmGeometry();

  return (
    <group>
      {parts.enamel && (
        <SectionMesh geometry={parts.enamel} material={enamelLesionMat} capColor={enamelColor} structureId="lesion" section={section} highlight={hl} />
      )}
      {parts.dentinOuter && (
        <SectionMesh geometry={parts.dentinOuter} material={outerMat} capColor="#b07a3c" structureId="lesion" section={section} highlight={hl} />
      )}
      {parts.dentinInner && (
        <SectionMesh geometry={parts.dentinInner} material={innerMat} capColor="#6b4220" structureId="lesion" section={section} highlight={hl} />
      )}
      {biofilm > 0.01 && <Biofilm data={data} amount={biofilm} section={section} highlight={highlightOf('biofilm')} animate={animate} acid={acidChallenge} />}
      {acidChallenge && <AcidParticles data={data} section={section} />}
    </group>
  );
}

function Biofilm({ data, amount, section, highlight, animate, acid }: { data: BiofilmData; amount: number; section: boolean; highlight: number; animate: boolean; acid: boolean }) {
  const filmMat = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        color: TISSUE_COLORS.biofilm,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  const bugMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#b9a23a', roughness: 0.5 }), []);
  const bugGeom = useDisposable(() => new THREE.CapsuleGeometry(0.045, 0.09, 3, 6), []);
  const bugs = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    filmMat.opacity = 0.85 * amount;
    filmMat.emissive.set('#3b82f6');
    filmMat.emissiveIntensity = highlight * 0.4;
    applyClipping([filmMat, bugMat], section);
  }, [amount, highlight, section, filmMat, bugMat]);

  const count = Math.round(data.bacteria.length * Math.min(1, amount));
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => {
    const mesh = bugs.current;
    if (!mesh) return;
    data.bacteria.slice(0, count).forEach((b, i) => {
      q.setFromEuler(new THREE.Euler(b.rot[0], b.rot[1], b.rot[2]));
      m.compose(b.pos, q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, data, m, q]);

  useFrame((state) => {
    if (!animate || !acid || !bugs.current) return;
    // Gentle "metabolic" pulsing while the acid challenge is shown.
    const s = 1 + 0.08 * Math.sin(state.clock.elapsedTime * 4);
    bugs.current.scale.setScalar(s);
    state.invalidate();
  });

  return (
    <group>
      <mesh geometry={data.film} material={filmMat} raycast={() => null} renderOrder={2} userData={{ structureId: 'biofilm' }} dispose={null} />
      <instancedMesh ref={bugs} args={[bugGeom, bugMat, data.bacteria.length]} userData={{ structureId: 'biofilm' }} />
    </group>
  );
}

function AcidParticles({ data, section }: { data: BiofilmData; section: boolean }) {
  const acidMat = useDisposable(() => new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.9 }), []);
  const ionMat = useDisposable(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  const geom = useDisposable(() => new THREE.SphereGeometry(0.06, 8, 6), []);
  const acid = useRef<THREE.InstancedMesh>(null);
  const ions = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => data.bacteria.slice(0, 70).map((b, i) => ({ ...b, phase: (i * 0.137) % 1 })), [data]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => applyClipping([acidMat, ionMat], section), [section, acidMat, ionMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.45;
    seeds.forEach((s, i) => {
      const p = (t + s.phase) % 1;
      // acid diffuses inward along the surface normal…
      v.copy(s.pos).addScaledVector(s.normal, 0.25 - p * 0.75);
      m.makeTranslation(v.x, v.y, v.z);
      acid.current?.setMatrixAt(i, m);
      // …while calcium/phosphate ions diffuse outward.
      v.copy(s.pos).addScaledVector(s.normal, -0.4 + p * 0.9);
      m.makeTranslation(v.x + 0.05, v.y, v.z + 0.05);
      ions.current?.setMatrixAt(i, m);
    });
    if (acid.current) acid.current.instanceMatrix.needsUpdate = true;
    if (ions.current) ions.current.instanceMatrix.needsUpdate = true;
    state.invalidate();
  });

  return (
    <group>
      <instancedMesh ref={acid} args={[geom, acidMat, seeds.length]} raycast={() => null} renderOrder={3} />
      <instancedMesh ref={ions} args={[geom, ionMat, seeds.length]} raycast={() => null} renderOrder={3} />
    </group>
  );
}
