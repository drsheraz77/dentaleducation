import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { useSim } from '../../state/store';
import type { StructureId } from '../../types';
import { LOWER_MOLAR_47, type DentalAsset } from '../../data/studio/assets';
import { LESSON_STAGES, LESION_BY_STAGE, KNOWLEDGE_CHECK, type ComparableStage } from '../../data/studio/cariesLesson';
import { CameraRig, DebugBridge, testBridgeEnabled, type PresetTable } from '../SceneControls';
import { SceneEnvironment, detectWebGL } from '../ToothScene';
import { LabelOverlay, LabelProjector, type LabelAnchor } from '../AnatomyLabels';
import { ANATOMY } from '../../data/anatomy';
import { loadDentalModel, type DentalModelData } from './dentalModel';
import { StudioTooth } from './StudioTooth';
import { deriveCariesGeometry } from './CariesProgressionController';
import { sectionContains } from '../geometry/slice';
import { ModelLoadingFallback } from '../../components/studio/ModelLoadingFallback';
import { SceneToolbar } from '../../components/controls/SceneToolbar';

/**
 * Reusable viewer for downloadable dental models (first used by the Caries Learning Studio).
 * Everything it shows is driven by the store: lesson stage, view mode, layer visibility,
 * selection, auto-rotation and the stages chosen for comparison.
 */

const SPACING = 15;

export function studioPresets(model: DentalModelData, teeth: number): PresetTable {
  const top = model.bounds.max.y;
  const bottom = model.bounds.min.y;
  const mid = (top + bottom) / 2;
  const crown = top * 0.55;
  const width = (teeth - 1) * SPACING + 14;
  return {
    default: { position: [14, mid + 9, 30], target: [0, mid, 0] },
    external: { position: [14, mid + 9, 30], target: [0, mid, 0] },
    occlusal: { position: [0, top + 18, 11], target: [0, top - 2, 0] },
    // Section views leave room on the right for the callout column.
    section: { position: [4.5, mid, 50], target: [4.5, mid, 0] },
    sectionNarrow: { position: [0, mid, 60], target: [0, mid, 0] },
    crownSection: { position: [3.5, crown, 27], target: [3.5, crown, 0] },
    crownSectionNarrow: { position: [0, crown, 34], target: [0, crown, 0] },
    compare: { position: [0, crown, Math.max(26, width * 1.25)], target: [0, crown, 0] },
  };
}

export type ModelState =
  | { status: 'loading'; progress: number }
  | { status: 'ready'; model: DentalModelData }
  | { status: 'error'; message: string };

export function useDentalModel(asset: DentalAsset, attempt: number): ModelState {
  const [state, setState] = useState<ModelState>({ status: 'loading', progress: 0 });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', progress: 0 });
    loadDentalModel(`${import.meta.env.BASE_URL}${asset.path}`, asset, (p) => alive && setState({ status: 'loading', progress: p }))
      .then((model) => alive && setState({ status: 'ready', model }))
      .catch((e: Error) => alive && setState({ status: 'error', message: e.message || 'The model could not be loaded.' }));
    return () => {
      alive = false;
    };
  }, [asset, attempt]);
  return state;
}

const shortName = (id: StructureId) =>
  id === 'dentin' ? 'Dentin and root' : ANATOMY[id].name.replace(' (coronal pulp chamber)', '').replace(' (socket wall)', '');

function stageAnchors(
  model: DentalModelData,
  assetId: string,
  s: { section: boolean; fullSection: boolean; showLabels: boolean; visible: Record<string, boolean>; stageId: string; compare: ComparableStage[] },
): LabelAnchor[] {
  const stage = LESSON_STAGES.find((x) => x.id === s.stageId)!;
  if (stage.kind === 'compare') {
    return s.compare.map((id, i) => ({
      key: `caption-${id}`,
      text: LESSON_STAGES.find((x) => x.id === id)!.shortTitle,
      pos: [(i - (s.compare.length - 1) / 2) * SPACING, model.bounds.max.y + 2.2, 0],
      kind: 'caption',
    }));
  }
  const f = model.fossa;
  const lesion = stage.kind === 'check' ? LESION_BY_STAGE.cavitated : stage.lesion;
  if (stage.kind === 'check') {
    // Lettered markers replace the labels during the knowledge check. They are placed on the
    // actual cut faces: A inside the inner (darker) dentin zone below the cavity, B at the cavity
    // opening, C inside the pulp chamber just under its roof.
    const geo = deriveCariesGeometry(model, assetId, lesion);
    const inner = geo.lesionSections.find((l) => l.id === 'dentinInner')?.section;
    const p = new THREE.Vector2();
    const along: number[] = [];
    for (let d = 0; d <= f.enamelThickness + f.dentinToPulp; d += 0.05) {
      p.set(f.origin.x, f.origin.y - d);
      if (inner && sectionContains(inner, p) && !(geo.cavitySection && sectionContains(geo.cavitySection, p))) along.push(d);
    }
    const aDepth = along.length ? along[Math.floor(along.length / 2)] : f.enamelThickness + f.dentinToPulp * 0.4;
    const markers: Record<string, [number, number, number]> = {
      A: [f.origin.x, f.origin.y - aDepth, 0],
      B: [f.origin.x, f.origin.y + 0.5, 0],
      C: [model.pulpRoof.x, model.pulpRoof.y - 0.9, 0],
    };
    return KNOWLEDGE_CHECK.filter((q) => q.marker).map((q) => ({
      key: `marker-${q.marker}`,
      text: q.marker!,
      pos: markers[q.marker!],
      kind: 'label',
    }));
  }
  if (!s.showLabels) return [];
  const layerOf: Partial<Record<StructureId, string>> = { enamel: 'enamel', dentin: 'tooth', pulp: 'pulp', pdl: 'pdl', lamina: 'lamina' };
  const out: LabelAnchor[] = [];
  const source = s.section ? model.sectionAnchors : model.externalAnchors;
  for (const [id, pos] of Object.entries(source) as [StructureId, [number, number, number]][]) {
    const layer = layerOf[id];
    if (!pos || (layer && !s.visible[layer])) continue;
    out.push({ key: `${s.section ? 'callout' : 'pill'}-${id}`, text: shortName(id), structureId: id, pos, kind: s.section ? 'callout' : 'label' });
  }
  if (lesion && (lesion.enamelDepth > 0.05 || lesion.dentinDepth > 0.02)) {
    const depth = f.enamelThickness * Math.min(1, lesion.enamelDepth) * 0.6 + f.dentinToPulp * lesion.dentinDepth * 0.5;
    const p = f.origin.clone().addScaledVector(f.axis, Math.max(0.3, depth));
    out.push({
      key: `${s.section ? 'callout' : 'pill'}-lesion`,
      text: 'Carious lesion (schematic)',
      structureId: 'lesion',
      pos: s.section ? [p.x + 0.3, p.y, 0] : [f.origin.x, f.origin.y + 0.4, 1.5],
      kind: s.section ? 'callout' : 'label',
    });
  }
  // Crown/root brackets only fit when the whole tooth is framed.
  if (s.section && s.fullSection) {
    const toothBottom = model.layers.tooth.geometry.boundingBox!.min.y;
    out.push({ key: 'bracket-crown', text: 'Crown', pos: [0, model.bounds.max.y, 0], pos2: [0, 0, 0], kind: 'bracket' });
    out.push({ key: 'bracket-root', text: 'Root', pos: [0, 0, 0], pos2: [0, toothBottom, 0], kind: 'bracket' });
  }
  return out;
}

function Scene({ model, asset, anchors }: { model: DentalModelData; asset: DentalAsset; anchors: LabelAnchor[] }) {
  const s = useSim();
  const select = s.selectStructure;
  const [hovered, setHovered] = useState<StructureId | null>(null);
  const [attention, setAttention] = useState(true);
  const stage = LESSON_STAGES[Math.min(s.step, LESSON_STAGES.length - 1)];
  const section = s.viewMode === 'section';
  const narrow = useThree((st) => st.size.width) < 560;

  // Draw attention to the stage's focus structures for a few seconds after each stage change.
  useEffect(() => {
    setAttention(true);
    const id = window.setTimeout(() => setAttention(false), 3500);
    return () => window.clearTimeout(id);
  }, [stage.id]);

  const teeth: { key: string; x: number; lesion: typeof stage.lesion }[] =
    stage.kind === 'compare'
      ? s.studioCompare.map((id, i) => ({
          key: id,
          x: (i - (s.studioCompare.length - 1) / 2) * SPACING,
          lesion: id === 'sound' ? null : LESION_BY_STAGE[id as Exclude<ComparableStage, 'sound'>],
        }))
      : [{ key: 'main', x: 0, lesion: stage.kind === 'check' ? LESION_BY_STAGE.cavitated : stage.lesion }];

  const presets = useMemo(() => studioPresets(model, teeth.length), [model, teeth.length]);
  const sectioned = section || stage.kind === 'compare';
  const preset =
    stage.kind === 'compare'
      ? 'compare'
      : section
        ? stage.camera === 'crownSection' || stage.kind === 'check'
          ? narrow
            ? 'crownSectionNarrow'
            : 'crownSection'
          : narrow
            ? 'sectionNarrow'
            : 'section'
        : stage.camera === 'occlusal'
          ? 'occlusal'
          : 'external';
  const token = `${stage.id}:${s.cameraResetToken}:${s.viewMode}:${narrow}:${teeth.length}`;

  const highlightOf = useCallback(
    (id: StructureId) => (s.selectedStructure === id ? 1 : hovered === id ? 0.6 : attention && stage.focus.includes(id) ? 0.35 : 0),
    [s.selectedStructure, hovered, attention, stage.focus],
  );

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hit = e.intersections.find((i) => !sectioned || i.point.z <= 0.05);
    return (hit?.object.userData?.structureId as StructureId | undefined) ?? null;
  };

  return (
    <>
      <SceneEnvironment />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#5b6470', 0.6]} />
      <directionalLight position={[12, 22, 16]} intensity={1.6} />
      <directionalLight position={[-14, 6, -10]} intensity={0.5} />
      <CameraRig preset={preset} token={token} presets={presets} autoRotate={s.autoRotate && stage.kind !== 'compare'} />
      <group
        onClick={(e) => {
          e.stopPropagation();
          const id = pick(e);
          if (id) select(id);
        }}
        onPointerMove={(e) => {
          const id = pick(e);
          if (id !== hovered) setHovered(id);
          document.body.style.cursor = id ? 'pointer' : 'auto';
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = 'auto';
        }}
      >
        {teeth.map((t) => (
          <group key={t.key} position={[t.x, 0, 0]}>
            <StudioTooth
              model={model}
              asset={asset}
              lesion={t.lesion}
              section={sectioned}
              visible={s.studioLayers}
              showLesion={s.showLesionOverlay}
              highlightOf={highlightOf}
              speed={s.speed}
            />
          </group>
        ))}
      </group>
      <LabelProjector anchors={anchors} />
      <DebugBridge />
    </>
  );
}

/** Canvas plus the DOM label layer, for a loaded model. */
function ReadyViewer({ model, asset, attempt, onLost }: { model: DentalModelData; asset: DentalAsset; attempt: number; onLost: () => void }) {
  const s = useSim();
  const select = s.selectStructure;
  const stage = LESSON_STAGES[Math.min(s.step, LESSON_STAGES.length - 1)];
  const anchors = useMemo(
    () =>
      stageAnchors(model, asset.id, {
        section: s.viewMode === 'section' || stage.kind === 'compare',
        fullSection: stage.camera === 'section',
        showLabels: s.showLabels,
        visible: s.studioLayers,
        stageId: stage.id,
        compare: s.studioCompare,
      }),
    [model, asset.id, s.viewMode, s.showLabels, s.studioLayers, stage.id, stage.kind, stage.camera, s.studioCompare],
  );
  useEffect(() => {
    // Lets the browser tests click real tissue points of the scanned model.
    if (testBridgeEnabled()) (window as unknown as Record<string, unknown>).__dentalverseStudio = { sectionAnchors: model.sectionAnchors, externalAnchors: model.externalAnchors };
  }, [model]);
  return (
    <div className="scene-root">
      <Canvas
        key={attempt}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 35, near: 0.5, far: 500, position: [14, 6, 30] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, stencil: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onLost();
          });
        }}
        onPointerMissed={() => select(null)}
        aria-label={`Interactive 3D model: ${asset.title}`}
      >
        <Scene model={model} asset={asset} anchors={anchors} />
      </Canvas>
      <LabelOverlay anchors={anchors} />
      <SceneToolbar />
    </div>
  );
}

export function DentalModelViewer({ asset = LOWER_MOLAR_47 }: { asset?: DentalAsset }) {
  const [webgl] = useState(detectWebGL);
  const [attempt, setAttempt] = useState(0);
  const [lost, setLost] = useState(false);
  const state = useDentalModel(asset, attempt);
  const setTopic = useSim((s) => s.setTopic);

  const retry = () => {
    setLost(false);
    setAttempt((n) => n + 1);
  };

  if (!webgl) {
    return (
      <ModelLoadingFallback
        kind="no-webgl"
        message="WebGL is not available in this browser, so the 3D tooth cannot be shown. The lesson text, stages and knowledge check still work."
      />
    );
  }
  if (lost) {
    return (
      <ModelLoadingFallback
        kind="error"
        message="The graphics context was lost (this can happen when the device runs low on memory)."
        onRetry={retry}
        onFallback={() => setTopic('caries')}
      />
    );
  }
  if (state.status === 'loading') return <ModelLoadingFallback kind="loading" progress={state.progress} />;
  if (state.status === 'error') {
    return (
      <ModelLoadingFallback
        kind="error"
        message={`The 3D model could not be loaded: ${state.message}`}
        onRetry={retry}
        onFallback={() => setTopic('caries')}
      />
    );
  }
  return <ReadyViewer model={state.model} asset={asset} attempt={attempt} onLost={() => setLost(true)} />;
}
