import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { InstrumentId, InstrumentMotion, ToothVisualState } from '../types';
import { INSTRUMENTS } from '../data/instruments';
import { TOOTH, toothOuterRadius } from './geometry/anatomy';
import { superellipseFactor } from './geometry/revolve';
import { useDisposable } from './materials';
import { applyClipping } from './CrossSectionView';

const noRaycast = () => null;

/** Rubber dam sheet with a hole that hugs the cervical region of the tooth. */
export function RubberDam({ section }: { section: boolean }) {
  const geometry = useDisposable(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-11, -9);
    shape.lineTo(11, -9);
    shape.lineTo(11, 9);
    shape.lineTo(-11, 9);
    shape.closePath();
    const hole = new THREE.Path();
    const r = toothOuterRadius(0.6) + 0.05;
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const k = superellipseFactor(t, TOOTH.squareness);
      const x = r * k * Math.cos(t) * TOOTH.aspect[0];
      const z = r * k * Math.sin(t) * TOOTH.aspect[1];
      if (i === 0) hole.moveTo(x, -z);
      else hole.lineTo(x, -z);
    }
    shape.holes.push(hole);
    const g = new THREE.ShapeGeometry(shape, 24);
    g.rotateX(-Math.PI / 2);
    // Drape the sheet downward away from the tooth.
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.hypot(x / 1.1, z);
      pos.setY(i, 1.1 - Math.max(0, d - 5) * 0.18);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#2f9e8f', roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    [],
  );
  useEffect(() => applyClipping([mat], section), [mat, section]);
  return <mesh geometry={geometry} material={mat} raycast={noRaycast} />;
}

export function CottonRolls() {
  const mat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#f8f8f4', roughness: 1 }), []);
  return (
    <group>
      {[6.6, -6.6].map((z) => (
        <mesh key={z} position={[0, 1.6, z]} rotation={[0, 0, Math.PI / 2]} material={mat} raycast={noRaycast}>
          <capsuleGeometry args={[1.1, 8, 6, 16]} />
        </mesh>
      ))}
    </group>
  );
}

export function MatrixBand() {
  const band = useDisposable(() => {
    const pts: THREE.Vector3[] = [];
    const r = 4.98;
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const k = superellipseFactor(t, TOOTH.squareness);
      pts.push(new THREE.Vector3(r * k * Math.cos(t) * TOOTH.aspect[0] + 0.04, 0, r * k * Math.sin(t) * TOOTH.aspect[1] + 0.02));
    }
    const positions: number[] = [];
    const indices: number[] = [];
    pts.forEach((p) => positions.push(p.x, 0.3, p.z, p.x, 6.9, p.z));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  const metal = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#cfd5da', metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
    [],
  );
  const wood = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#d9a066', roughness: 0.8 }), []);
  return (
    <group>
      <mesh geometry={band} material={metal} raycast={noRaycast} renderOrder={6} />
      {/* Wedge at the mesial gingival margin */}
      <mesh position={[5.35, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} material={wood} raycast={noRaycast}>
        <cylinderGeometry args={[0.6, 0.6, 6, 3]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

function BurHead({ id }: { id: InstrumentId }) {
  switch (id) {
    case 'roundBur':
      return <sphereGeometry args={[0.45, 16, 12]} />;
    case 'slowRoundBur':
      return <sphereGeometry args={[0.7, 16, 12]} />;
    case 'pearBur':
      return <cylinderGeometry args={[0.5, 0.3, 1.3, 16]} />;
    case 'fissureBur':
      return <cylinderGeometry args={[0.4, 0.4, 1.6, 16]} />;
    case 'finishingBur':
      return <coneGeometry args={[0.45, 1.8, 16]} />;
    default:
      return <cylinderGeometry args={[1.4, 1.4, 0.12, 32]} />;
  }
}

function InstrumentModel({ id, spin }: { id: InstrumentId; spin: React.RefObject<THREE.Group | null> }) {
  const info = INSTRUMENTS[id];
  const steel = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#c3cad2', metalness: 0.9, roughness: 0.3 }), []);
  const accent = useDisposable(() => new THREE.MeshStandardMaterial({ color: info.color, metalness: 0.4, roughness: 0.35 }), [info.color]);
  const handpiece = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#8a939c', metalness: 0.8, roughness: 0.35 }), []);

  if (info.category === 'rotary') {
    const disc = id === 'polishingDisc';
    const headLen = id === 'slowRoundBur' ? 0.7 : id === 'roundBur' ? 0.45 : 0.8;
    return (
      <group>
        <group ref={spin}>
          <mesh material={accent} position={[0, disc ? 0.1 : headLen * 0.6, 0]} rotation={disc ? [0, 0, 0] : [0, 0, 0]}>
            <BurHead id={id} />
          </mesh>
        </group>
        <mesh material={steel} position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 4, 10]} />
        </mesh>
        <mesh material={handpiece} position={[0, 5.3, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 1.6, 24]} />
        </mesh>
        <mesh material={handpiece} position={[0, 5.3, 4.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.75, 8, 20]} />
        </mesh>
      </group>
    );
  }

  if (id === 'curingLight') {
    return (
      <group>
        <mesh material={accent} position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 2.4, 24]} />
        </mesh>
        <mesh material={handpiece} position={[0, 2.8, 4]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.9, 1.1, 9, 20]} />
        </mesh>
      </group>
    );
  }

  // Hand instruments, applicators and syringes: shaft + working end.
  const tip = (() => {
    switch (id) {
      case 'spoonExcavator':
        return (
          <mesh material={steel} position={[0, 0.25, 0]} rotation={[0, 0, Math.PI]}>
            <sphereGeometry args={[0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        );
      case 'microbrush':
        return (
          <mesh material={accent} position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.3, 12, 8]} />
          </mesh>
        );
      case 'etchSyringe':
      case 'capsuleApplier':
      case 'amalgamCarrier':
        return (
          <mesh material={accent} position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.18, 0.08, 1.2, 12]} />
          </mesh>
        );
      case 'condenser':
        return (
          <mesh material={steel} position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
          </mesh>
        );
      case 'compositeInstrument':
      case 'carver':
      case 'enamelHatchet':
        return (
          <mesh material={id === 'compositeInstrument' ? accent : steel} position={[0, 0.35, 0]}>
            <boxGeometry args={[0.7, 0.7, 0.08]} />
          </mesh>
        );
      case 'mirror':
        return (
          <mesh material={steel} position={[0, 0.6, 0.6]} rotation={[Math.PI / 3, 0, 0]}>
            <cylinderGeometry args={[1, 1, 0.1, 24]} />
          </mesh>
        );
      default:
        return (
          <mesh material={steel} position={[0, 0.5, 0]}>
            <coneGeometry args={[0.08, 1, 8]} />
          </mesh>
        );
    }
  })();
  const shaftColor = id === 'etchSyringe' || id === 'capsuleApplier' ? accent : steel;
  return (
    <group>
      {tip}
      <mesh material={steel} position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2.6, 8]} />
      </mesh>
      <mesh material={shaftColor} position={[0, 6.0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 5.5, 16]} />
      </mesh>
    </group>
  );
}

export interface InstrumentRigProps {
  instrument: NonNullable<ToothVisualState['instrument']>;
  workingPoint: THREE.Vector3;
  /** 0–1 how far the tool has gone in (follows the eased cavity depth). */
  plunge: number;
  active: boolean;
  animate: boolean;
}

/** Positions an instrument at the working site and animates its motion. */
export function InstrumentRig({ instrument, workingPoint, plunge, active, animate }: InstrumentRigProps) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const motion: InstrumentMotion = instrument.motion;
  const tilt = useMemo(() => new THREE.Euler(-0.35, 0, 0.15), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    let offY = 0.6 - plunge * 1.4;
    let offX = 0;
    if (motion === 'rotate' && spin.current) spin.current.rotation.y += dt * 40;
    if (motion === 'scrape') offX = Math.sin(t * 3) * 0.5;
    if (motion === 'probe') offX = Math.sin(t * 1.5) * 1.2;
    if (motion === 'condense') offY += Math.abs(Math.sin(t * 5)) * 0.6;
    if (motion === 'apply') offX = Math.sin(t * 2) * 0.4;
    if (motion === 'rotate' && active) offY += Math.sin(t * 6) * 0.08;
    if (instrument.id === 'curingLight') offY = 1.6;
    group.current.position.set(workingPoint.x + offX, workingPoint.y + offY, workingPoint.z);
    if (animate && motion !== 'none') state.invalidate();
  });

  return (
    <group ref={group} rotation={tilt} raycast={noRaycast}>
      <InstrumentModel id={instrument.id} spin={spin} />
    </group>
  );
}

export function CuringLightGlow({ target }: { target: THREE.Vector3 }) {
  const mat = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: '#4f6bff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  useFrame((state) => {
    mat.opacity = 0.18 + 0.06 * Math.sin(state.clock.elapsedTime * 12);
    state.invalidate();
  });
  return (
    <group position={[target.x, target.y + 0.9, target.z]}>
      <mesh material={mat} raycast={noRaycast} renderOrder={7}>
        <coneGeometry args={[2.2, 1.8, 32, 1, true]} />
      </mesh>
      <pointLight color="#4f6bff" intensity={40} distance={10} position={[0, 0.5, 0]} />
    </group>
  );
}

export function MixingCapsule({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const body = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 }), []);
  const cap = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 }), []);
  useFrame((state) => {
    if (!ref.current) return;
    // Shaking indicates mechanical mixing (trituration) in a capsule mixer.
    ref.current.position.x = -9 + Math.sin(state.clock.elapsedTime * 30) * 0.25;
    if (animate) state.invalidate();
  });
  return (
    <group ref={ref} position={[-9, 7, 0]} rotation={[0, 0, Math.PI / 2.3]}>
      <mesh material={body} raycast={noRaycast}>
        <capsuleGeometry args={[0.7, 3, 8, 16]} />
      </mesh>
      <mesh material={cap} position={[0, 2.4, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.35, 0.2, 1.4, 12]} />
      </mesh>
    </group>
  );
}
