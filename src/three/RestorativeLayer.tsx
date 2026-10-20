import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { StructureId, ToothVisualState } from '../types';
import type { RestorationGeometry } from './geometry/cavity';
import { SectionMesh, applyClipping } from './CrossSectionView';
import { restorationLook, useDisposable } from './materials';

export interface RestorativeLayerProps {
  visual: ToothVisualState;
  restoration: RestorationGeometry;
  /** Full planned volume (used for the planning ghost and etch gel). */
  plannedVolume: THREE.BufferGeometry | null;
  section: boolean;
  highlightOf: (id: StructureId) => number;
  animate: boolean;
}

const ENAMEL_ONLY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4.15);

export function RestorativeLayer({ visual, restoration, plannedVolume, section, highlightOf, animate }: RestorativeLayerProps) {
  const r = visual.restoration;
  const placed = r ? Math.min(r.increments, restoration.increments.length) : 0;

  return (
    <group>
      {visual.liner && restoration.liner && <Liner geometry={restoration.liner} set={visual.liner.set} section={section} highlight={highlightOf('liner')} />}
      {r &&
        restoration.increments.slice(0, placed).map((g, i) => (
          <Increment
            key={i}
            geometry={g}
            index={i}
            material={r.material}
            set={r.material === 'composite' && i < placed - 1 ? 1 : r.set}
            finished={r.finished}
            coated={!!r.coated}
            curing={visual.curingLight && i === placed - 1}
            section={section}
            highlight={highlightOf('restoration')}
            animate={animate}
          />
        ))}
      {visual.etchGel !== 'none' && plannedVolume && <EtchGel geometry={plannedVolume} enamelOnly={visual.etchGel === 'enamelOnly'} section={section} />}
      {visual.plannedOutline && plannedVolume && <PlannedOutline geometry={plannedVolume} section={section} animate={animate} />}
    </group>
  );
}

function Increment(props: {
  geometry: THREE.BufferGeometry;
  index: number;
  material: NonNullable<ToothVisualState['restoration']>['material'];
  set: number;
  finished: boolean;
  coated: boolean;
  curing: boolean;
  section: boolean;
  highlight: number;
  animate: boolean;
}) {
  const mat = useDisposable(() => new THREE.MeshPhysicalMaterial({ transparent: true }), []);
  const look = restorationLook(props.material, props.set, props.finished, props.coated, props.index);
  useEffect(() => {
    mat.color.set(look.color);
    mat.roughness = look.roughness;
    mat.metalness = look.metalness;
    mat.clearcoat = look.clearcoat;
    mat.opacity = look.opacity;
    mat.envMapIntensity = props.material === 'amalgam' ? 1.4 : 1;
  }, [look.color, look.roughness, look.metalness, look.clearcoat, look.opacity, mat, props.material]);

  // Grow the increment in from the floor when it is placed.
  const group = useRef<THREE.Group>(null);
  const grow = useRef(0);
  useFrame((state, delta) => {
    if (!group.current) return;
    if (grow.current < 1) {
      grow.current = Math.min(1, grow.current + Math.min(delta, 0.05) * 1.8);
      state.invalidate();
    }
    const bb = props.geometry.boundingBox ?? (props.geometry.computeBoundingBox(), props.geometry.boundingBox!);
    const s = props.animate ? 0.3 + 0.7 * grow.current : 1;
    group.current.scale.set(1, s, 1);
    group.current.position.y = bb.min.y * (1 - s);
    if (props.curing) {
      // Polymerising increment glows under the blue light.
      mat.emissive.set('#5b7cff');
      mat.emissiveIntensity = 0.25 + 0.15 * Math.sin(state.clock.elapsedTime * 10);
      state.invalidate();
    } else if (props.highlight === 0) {
      mat.emissiveIntensity = 0;
    }
  });

  return (
    <group ref={group}>
      <SectionMesh geometry={props.geometry} material={mat} capColor={look.color} structureId="restoration" section={props.section} highlight={props.highlight} />
    </group>
  );
}

function Liner({ geometry, set, section, highlight }: { geometry: THREE.BufferGeometry; set: number; section: boolean; highlight: number }) {
  const mat = useDisposable(() => new THREE.MeshPhysicalMaterial(), []);
  const look = restorationLook('calciumSilicate', set, false, false, 0);
  useEffect(() => {
    mat.color.set(look.color);
    mat.roughness = look.roughness;
    mat.clearcoat = look.clearcoat;
  }, [look.color, look.roughness, look.clearcoat, mat]);
  return <SectionMesh geometry={geometry} material={mat} capColor={look.color} structureId="liner" section={section} highlight={highlight} />;
}

function EtchGel({ geometry, enamelOnly, section }: { geometry: THREE.BufferGeometry; enamelOnly: boolean; section: boolean }) {
  const mat = useDisposable(
    () => new THREE.MeshPhysicalMaterial({ color: '#2563eb', transparent: true, opacity: 0.75, roughness: 0.15, clearcoat: 1, depthWrite: false }),
    [],
  );
  useEffect(() => applyClipping([mat], section, enamelOnly ? [ENAMEL_ONLY] : []), [section, enamelOnly, mat]);
  return <mesh geometry={geometry} material={mat} raycast={() => null} renderOrder={4} dispose={null} />;
}

function PlannedOutline({ geometry, section, animate }: { geometry: THREE.BufferGeometry; section: boolean; animate: boolean }) {
  const mat = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.35, depthWrite: false, depthTest: true }),
    [],
  );
  const wire = useDisposable(() => new THREE.MeshBasicMaterial({ color: '#16a34a', wireframe: true, transparent: true, opacity: 0.35 }), []);
  useEffect(() => applyClipping([mat, wire], section), [section, mat, wire]);
  useFrame((state) => {
    if (!animate) return;
    mat.opacity = 0.25 + 0.12 * Math.sin(state.clock.elapsedTime * 3);
    state.invalidate();
  });
  return (
    <group>
      <mesh geometry={geometry} material={mat} raycast={() => null} renderOrder={5} dispose={null} />
      <mesh geometry={geometry} material={wire} raycast={() => null} renderOrder={5} dispose={null} />
    </group>
  );
}
