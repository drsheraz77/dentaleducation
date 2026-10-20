import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraPreset } from '../types';
import { useSim } from '../state/store';

export const CAMERA_PRESETS: Record<CameraPreset | 'compare', { position: [number, number, number]; target: [number, number, number] }> = {
  /** Crown-focused oblique view (most modules). */
  default: { position: [13, 15, 24], target: [0, 3, 0] },
  /** Whole tooth and periodontium (anatomy). */
  full: { position: [24, 16, 42], target: [0, -2.5, 0] },
  /** Looking down into the preparation (operative modules). */
  working: { position: [7, 21, 17], target: [0, 4, 0] },
  occlusal: { position: [0, 24, 10], target: [0, 4, 0] },
  buccal: { position: [0, 4, 30], target: [0, 2, 0] },
  mesial: { position: [26, 9, 12], target: [2.5, 2.5, 0] },
  /** Crown cross-section, looking at the cut face. */
  section: { position: [0, 4, 30], target: [0, 2.2, 0] },
  sectionFull: { position: [0, -2, 52], target: [0, -3.5, 0] },
  root: { position: [14, -4, 38], target: [0, -5, 0] },
  compare: { position: [0, 30, 36], target: [0, 3, 0] },
};

const TRANSITION_MS = 700;

export interface CameraRigProps {
  preset: CameraPreset | 'compare';
  /** Changing this value re-applies the preset (reset button, guided step change). */
  token: string;
}

/** OrbitControls plus smooth transitions to named camera presets. */
export function CameraRig({ preset, token }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef<{ fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3; start: number } | null>(null);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const p = CAMERA_PRESETS[preset];
    // Drop any leftover damping momentum from user interaction, or it would keep
    // rotating the camera after the transition finishes.
    c.enableDamping = false;
    c.update();
    anim.current = {
      fromP: camera.position.clone(),
      fromT: c.target.clone(),
      toP: new THREE.Vector3(...p.position),
      toT: new THREE.Vector3(...p.target),
      start: performance.now(),
    };
    invalidate();
  }, [preset, token, camera, invalidate]);

  useFrame(() => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    // Wall-clock based so the transition takes the same time on slow devices.
    const t = Math.min(1, (performance.now() - a.start) / TRANSITION_MS);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(a.fromP, a.toP, e);
    c.target.lerpVectors(a.fromT, a.toT, e);
    c.update();
    if (t >= 1) {
      anim.current = null;
      c.enableDamping = true;
    }
    invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={8}
      maxDistance={80}
      onStart={() => {
        anim.current = null; // user takes over
        if (controls.current) controls.current.enableDamping = true;
      }}
    />
  );
}

/**
 * Test/debug hook (dev server, or any build opened with `?e2e`): exposes the store,
 * the camera and a world→screen projection for the end-to-end acceptance tests.
 */
export function DebugBridge() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  useEffect(() => {
    if (!(import.meta.env.DEV || new URLSearchParams(window.location.search).has('e2e'))) return;
    const w = window as unknown as Record<string, unknown>;
    w.__dentalverse = {
      store: useSim,
      invalidate,
      camera: () => ({ position: camera.position.toArray(), target: controls?.target.toArray() ?? null }),
      project: (x: number, y: number, z: number) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      },
    };
  }, [camera, gl, invalidate, controls]);
  return null;
}
