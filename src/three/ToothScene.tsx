import * as THREE from 'three';
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useSim } from '../state/store';
import { deriveScene, isTextbookView, type SceneDescription } from '../state/selectors';
import type { SimState } from '../state/store';
import { LabelOverlay, LabelProjector, structureAnchors, textbookAnchors, type LabelAnchor } from './AnatomyLabels';
import type { StructureId } from '../types';
import { ToothModel } from './ToothModel';
import { CameraRig, DebugBridge } from './SceneControls';
import { getBiofilmGeometry, getToothGeometries } from './geometry/toothSingleton';

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[DentalVerse] 3D scene error:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="scene-message" role="alert">
          <h3>The 3D scene could not be displayed</h3>
          <p>{this.state.error.message}</p>
          <p>The educational content in the side panels remains available.</p>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Neutral studio lighting generated locally (no external HDR files). */
function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const target = pmrem.fromScene(env, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}

const TOOTH_SPACING = 17;

const toothOffset = (i: number, n: number) => (n > 1 ? (i - (n - 1) / 2) * TOOTH_SPACING : 0);

/** Labels for a single tooth, or captions when two teeth are compared side by side. */
export function sceneAnchors(scene: SceneDescription, s: Pick<SimState, 'viewMode' | 'showSupport' | 'showLabels' | 'topic'>): LabelAnchor[] {
  const n = scene.teeth.length;
  if (n > 1) {
    return scene.teeth.map((t, i) => ({ key: `caption-${i}-${t.caption}`, text: t.caption ?? '', pos: [toothOffset(i, n), 10.5, 0], kind: 'caption' }));
  }
  if (!s.showLabels || n === 0) return [];
  if (isTextbookView(s)) return textbookAnchors(scene.teeth[0].visual, s.showSupport);
  return structureAnchors(scene.teeth[0].visual, s.viewMode === 'section', s.showSupport);
}

function SceneContent({ scene, anchors }: { scene: SceneDescription; anchors: LabelAnchor[] }) {
  const state = useSim();
  const select = useSim((s) => s.selectStructure);
  const section = state.viewMode === 'section';
  const compare = scene.teeth.length > 1;
  const guided = state.mode === 'guided';

  const primary = scene.teeth[0]?.visual;
  // Anatomy frames the whole tooth; the other modules focus on the crown, where the lesions are.
  const whole = state.topic === 'anatomy';
  const operative = state.topic === 'preparation' || state.topic === 'materials';
  const narrow = useThree((st) => st.size.width) < 560;
  const fallback = section
    ? whole
      ? narrow
        ? 'sectionCentered'
        : 'sectionFull'
      : 'section'
    : whole
      ? 'full'
      : operative
        ? 'working'
        : 'default';
  const preset = compare ? 'compare' : guided ? (primary?.camera ?? fallback) : fallback;
  const token = guided
    ? `${state.topic}:${state.step}:${state.cameraResetToken}:${state.viewMode}`
    : `${state.topic}:${state.cameraResetToken}:${compare}:${state.viewMode}:${narrow}`;

  const onPick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Ignore hits on the clipped-away half in section view.
    const hit = e.intersections.find((i) => !section || i.point.z <= 0.02);
    const id = hit?.object.userData?.structureId as StructureId | undefined;
    if (id) select(id);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const hit = e.intersections.find((i) => !section || i.point.z <= 0.02);
    document.body.style.cursor = hit?.object.userData?.structureId ? 'pointer' : 'auto';
  };

  return (
    <>
      <SceneEnvironment />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#5b6470', 0.6]} />
      <directionalLight position={[12, 22, 16]} intensity={1.6} />
      <directionalLight position={[-14, 6, -10]} intensity={0.5} />
      <CameraRig preset={preset} token={token} />
      <group onClick={onPick} onPointerMove={onOver} onPointerOut={() => (document.body.style.cursor = 'auto')}>
        {scene.teeth.map((t, i) => {
          const x = toothOffset(i, scene.teeth.length);
          return (
            <group key={i} position={[x, 0, 0]}>
              <ToothModel
                visual={t.visual}
                section={section}
                showSupport={state.showSupport}
                selected={state.selectedStructure}
                speed={state.speed}
                guided={guided}
                textbook={isTextbookView(state)}
              />
            </group>
          );
        })}
      </group>
      <LabelProjector anchors={anchors} />
      <DebugBridge />
    </>
  );
}

export function ToothScene() {
  const [webgl] = useState(detectWebGL);
  const [ready, setReady] = useState(false);
  const select = useSim((s) => s.selectStructure);
  const state = useSim();
  const scene = useMemo(() => deriveScene(state), [state]);
  const anchors = useMemo(() => sceneAnchors(scene, state), [scene, state]);

  useEffect(() => {
    // Build the procedural anatomy off the first paint so a loading state can show.
    const id = window.setTimeout(() => {
      getToothGeometries();
      getBiofilmGeometry();
      setReady(true);
    }, 30);
    return () => window.clearTimeout(id);
  }, []);

  if (!webgl) {
    return (
      <div className="scene-message" role="alert">
        <h3>WebGL is not available</h3>
        <p>
          Your browser or device does not support WebGL, which is required for the 3D tooth. All written content, the decision
          pathway, cases and quiz still work.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="scene-message" role="status" aria-live="polite">
        <div className="spinner" aria-hidden />
        <p>Building the 3D tooth model…</p>
      </div>
    );
  }

  return (
    <SceneErrorBoundary>
      <div className="scene-root">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 35, near: 0.5, far: 400, position: [24, 16, 42] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
        onPointerMissed={() => select(null)}
        aria-label="Interactive 3D tooth model"
      >
        <SceneContent scene={scene} anchors={anchors} />
      </Canvas>
      <LabelOverlay anchors={anchors} />
      </div>
    </SceneErrorBoundary>
  );
}
