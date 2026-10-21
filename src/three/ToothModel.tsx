import * as THREE from 'three';
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { StructureId, ToothVisualState } from '../types';
import { getToothGeometries } from './geometry/toothSingleton';
import { cavityKey, cutLesionPart, getCutter, getLesionMeshes, getRestoration, lesionKey, subtractCutter } from './geometry/cavity';
import { SITE_FRAMES } from './geometry/lesion';
import { AnatomyLayer } from './AnatomyLayer';
import { CariesLayer } from './CariesLayer';
import { RestorativeLayer } from './RestorativeLayer';
import { CottonRolls, CuringLightGlow, InstrumentRig, MatrixBand, MixingCapsule, RubberDam } from './ClinicalProps';
import { createLesionUniforms, lesionSurfaceTarget } from './materials';
import { useEasedCavity, useEasedLesion } from './useEasedVisual';

export interface ToothModelProps {
  visual: ToothVisualState;
  section: boolean;
  showSupport: boolean;
  selected: StructureId | null;
  speed: number;
  /** Pulse the step's highlighted structures (guided learning). */
  guided: boolean;
  /** Textbook detail (anatomy module's section view). */
  textbook?: boolean;
}

/**
 * Renders one tooth from a ToothVisualState. All tissue removal and restoration
 * geometry is derived here from the (eased) visual state, so every UI control that
 * changes the state produces a matching change in the 3D scene.
 */
export function ToothModel({ visual, section, showSupport, selected, speed, guided, textbook = false }: ToothModelProps) {
  const geoms = getToothGeometries();
  const { lesion } = useEasedLesion(visual.lesion, speed);
  const { cavity, cutting } = useEasedCavity(visual.cavity, speed);

  const lk = lesionKey(lesion);
  const ck = cavityKey(cavity);
  const cutterKey = `${ck}|${lk}`;
  const cutter = useMemo(() => getCutter(cavity, lesion), [cutterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const enamel = useMemo(() => subtractCutter('enamel', geoms.enamel, cutter, cutterKey), [cutter, cutterKey, geoms]);
  const dentin = useMemo(() => subtractCutter('dentin', geoms.dentin, cutter, cutterKey), [cutter, cutterKey, geoms]);
  const cementumTrunk = useMemo(
    () => (lesion?.site === 'root' ? subtractCutter('cementum', geoms.cementumTrunk, cutter, cutterKey) : { geometry: geoms.cementumTrunk, cut: false }),
    [cutter, cutterKey, geoms, lesion?.site],
  );

  const lesionParts = useMemo(() => {
    const parts = getLesionMeshes(lesion);
    // During preparation the lesion is cut with the tooth: what remains is residual carious tissue.
    return {
      enamel: cutLesionPart('lesion-e', parts.enamel, cutter, `${cutterKey}`),
      dentinOuter: cutLesionPart('lesion-do', parts.dentinOuter, cutter, `${cutterKey}`),
      dentinInner: cutLesionPart('lesion-di', parts.dentinInner, cutter, `${cutterKey}`),
    };
  }, [lk, cutter, cutterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restorations and the planning ghost are based on the planned (full-depth) preparation.
  const plannedKey = visual.cavity ? `${visual.cavity.shape}:1|${lesionKey(visual.lesion)}` : 'none';
  const plannedCutter = useMemo(
    () => (visual.cavity ? getCutter({ shape: visual.cavity.shape, depth: 1 }, visual.lesion) : null),
    [plannedKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const needsRestorationGeometry = !!(visual.restoration || visual.liner || visual.plannedOutline || visual.etchGel !== 'none');
  const totalIncrements = visual.restoration?.totalIncrements ?? 1;
  const restoration = useMemo(
    () =>
      needsRestorationGeometry && plannedCutter
        ? getRestoration(geoms.crownOuter, plannedCutter, plannedKey, totalIncrements, !!visual.liner)
        : { liner: null, increments: [], floorY: 0, topY: 0 },
    [needsRestorationGeometry, plannedCutter, plannedKey, totalIncrements, visual.liner, geoms], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const plannedVolume = useMemo(() => {
    if (!needsRestorationGeometry || !plannedCutter) return null;
    return getRestoration(geoms.crownOuter, plannedCutter, plannedKey, 1, false).increments[0] ?? null;
  }, [needsRestorationGeometry, plannedCutter, plannedKey, geoms]);

  // Surface discolouration eases towards the lesion's target.
  const uniforms = useMemo(() => createLesionUniforms(), []);
  const target = useMemo(() => lesionSurfaceTarget(visual.lesion), [visual.lesion]);
  useFrame((state, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 4 * speed);
    const u = uniforms;
    const before = u.uLesionIntensity.value;
    u.uLesionIntensity.value += (target.intensity - before) * k;
    if (target.intensity > 0) {
      u.uLesionCenter.value.lerp(target.center, before < 0.01 ? 1 : k);
      u.uLesionRadii.value.lerp(target.radii, before < 0.01 ? 1 : k);
      u.uLesionColor.value.lerp(target.color, before < 0.01 ? 1 : k);
    }
    if (Math.abs(u.uLesionIntensity.value - target.intensity) > 0.003) state.invalidate();
  });

  const highlightOf = (id: StructureId) => (selected === id ? 1 : guided && visual.highlight.includes(id) ? 0.55 : 0);

  const workingPoint = useMemo(() => {
    if (visual.cavity?.shape === 'classII') return new THREE.Vector3(4.0, 5.2, 0);
    const site = visual.lesion?.site ?? 'occlusal';
    if (site === 'root') return SITE_FRAMES.root.origin.clone().add(new THREE.Vector3(0.6, 0, 0.3));
    if (site === 'proximal') return new THREE.Vector3(4.3, 5.0, 0);
    return new THREE.Vector3(0, 5.3, 0);
  }, [visual.cavity?.shape, visual.lesion?.site]);

  const plunge = cavity ? cavity.depth : 0;

  return (
    <group>
      <AnatomyLayer
        geoms={geoms}
        enamel={enamel}
        dentin={dentin}
        cementumTrunk={cementumTrunk}
        section={section}
        showSupport={showSupport && visual.isolation !== 'rubberDam'}
        recession={visual.gingivalRecession}
        cutFinish={visual.cutFinish}
        pulpInflammation={lesion?.pulpInflammation ?? 0}
        highlightOf={highlightOf}
        uniforms={uniforms}
        textbook={textbook}
      />
      <CariesLayer
        lesion={lesion}
        parts={lesionParts}
        biofilm={visual.biofilm}
        acidChallenge={visual.acidChallenge}
        section={section}
        highlightOf={highlightOf}
        animate
      />
      <RestorativeLayer visual={visual} restoration={restoration} plannedVolume={plannedVolume} section={section} highlightOf={highlightOf} animate />
      {visual.isolation === 'rubberDam' && <RubberDam section={section} />}
      {visual.isolation === 'cottonRolls' && showSupport && <CottonRolls />}
      {visual.matrix && <MatrixBand />}
      {visual.instrument && visual.instrument.id !== 'matrixBand' && (
        <InstrumentRig instrument={visual.instrument} workingPoint={workingPoint} plunge={plunge} active={cutting} animate />
      )}
      {visual.curingLight && <CuringLightGlow target={workingPoint} />}
      {visual.mixingCapsule && <MixingCapsule animate />}
    </group>
  );
}
