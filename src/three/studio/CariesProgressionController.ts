import * as THREE from 'three';
import { useMemo } from 'react';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LesionVisual } from '../../types';
import { buildCavitationBrush, buildLesionGeometries } from '../geometry/lesion';
import { q, subtractCutter, type CutResult } from '../geometry/cavity';
import { sliceMesh, type MeshSection } from '../geometry/slice';
import { useEasedLesion } from '../useEasedVisual';
import type { DentalModelData } from './dentalModel';

/**
 * Turns a lesson stage's lesion into geometry on the scanned tooth:
 *  - schematic lesion volumes placed at the measured central fossa,
 *  - for cavitated stages, the cavity removed from the scanned enamel and dentin (CSG, cached),
 *  - exact sections of the lesion volumes and of the cavity (for the cut face).
 * Stage changes are eased so the learner sees the change happen; nothing is time-calibrated.
 */

export interface CariesGeometry {
  lesion: LesionVisual | null;
  enamel: CutResult;
  tooth: CutResult;
  /** Lesion cut faces in drawing order (outer zone, inner zone, enamel lesion). */
  lesionSections: { id: 'dentinOuter' | 'dentinInner' | 'enamel'; section: MeshSection }[];
  /** Cut face of the cavity, used as a stencil mask on the tissue cut faces. */
  cavitySection: MeshSection | null;
}

const sliceCache = new Map<string, CariesGeometry['lesionSections']>();
const cavityCache = new Map<string, { brush: THREE.BufferGeometry; section: MeshSection }>();

function lesionKey(l: LesionVisual): string {
  return [q(l.enamelDepth), q(l.dentinDepth), q(l.cavitation, 10)].join(':');
}

export function deriveCariesGeometry(model: DentalModelData, assetId: string, lesion: LesionVisual | null): CariesGeometry {
  const plain: CariesGeometry = {
    lesion,
    enamel: { geometry: model.layers.enamel.geometry, cut: false },
    tooth: { geometry: model.layers.tooth.geometry, cut: false },
    lesionSections: [],
    cavitySection: null,
  };
  if (!lesion || (lesion.enamelDepth <= 0.02 && lesion.dentinDepth <= 0.02 && lesion.cavitation <= 0.02)) return plain;

  const key = `${assetId}|${lesionKey(lesion)}`;
  let sections = sliceCache.get(key);
  if (!sections) {
    const parts = buildLesionGeometries({ ...lesion, cavitation: q(lesion.cavitation, 10) }, model.fossa);
    sections = (['dentinOuter', 'dentinInner', 'enamel'] as const)
      .filter((id) => parts[id])
      .map((id) => ({ id, section: sliceMesh(parts[id]!) }));
    Object.values(parts).forEach((g) => g?.dispose());
    sliceCache.set(key, sections);
  }

  let cavity: { brush: THREE.BufferGeometry; section: MeshSection } | null = null;
  if (q(lesion.cavitation, 10) > 0) {
    const ck = `${assetId}|cav:${q(lesion.cavitation, 10)}`;
    cavity = cavityCache.get(ck) ?? null;
    if (!cavity) {
      const raw = buildCavitationBrush({ ...lesion, cavitation: q(lesion.cavitation, 10) }, model.fossa);
      if (raw) {
        const brush = mergeVertices(raw, 1e-4);
        brush.computeVertexNormals();
        raw.dispose();
        cavity = { brush, section: sliceMesh(brush) };
        cavityCache.set(ck, cavity);
      }
    }
  }
  const cutterKey = `${assetId}|cav:${q(lesion.cavitation, 10)}`;
  return {
    lesion,
    enamel: cavity ? subtractCutter('studio-enamel', model.layers.enamel.geometry, cavity.brush, cutterKey) : plain.enamel,
    tooth: cavity ? subtractCutter('studio-tooth', model.layers.tooth.geometry, cavity.brush, cutterKey) : plain.tooth,
    lesionSections: sections,
    cavitySection: cavity?.section ?? null,
  };
}

export function useCariesProgression(model: DentalModelData, assetId: string, target: LesionVisual | null, speed: number): CariesGeometry {
  const { lesion } = useEasedLesion(target, speed);
  const key = lesion ? lesionKey(lesion) : 'none';
  return useMemo(
    () => deriveCariesGeometry(model, assetId, lesion),
    // Recompute only when the quantised lesion changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, assetId, key, lesion?.surfaceTone, lesion?.surfaceIntensity],
  );
}
