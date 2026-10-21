import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { LesionVisual, StructureId } from '../../types';
import type { DentalAsset, LayerId } from '../../data/studio/assets';
import { applyClipping } from '../CrossSectionView';
import { HIGHLIGHT, createLesionUniforms, lesionSurfaceTarget, makeTissueMaterial, useDisposable } from '../materials';
import type { DentalModelData } from './dentalModel';
import { useCariesProgression } from './CariesProgressionController';
import { ToothCrossSection, type CapSpec } from './ToothCrossSection';

/** Drawing order of cut faces (outer first). */
const CAP_LAYER: Record<LayerId, number> = { lamina: 0, pdl: 1, tooth: 2, enamel: 3, pulp: 4 };
const LESION_CAP = {
  dentinOuter: { layer: 5, color: '#b07a3c' },
  dentinInner: { layer: 6, color: '#6b4220' },
  enamel: { layer: 7, color: '#c79a62' },
};
const EARLY_ENAMEL_LESION = '#fbfbf3';

export interface StudioToothProps {
  model: DentalModelData;
  asset: DentalAsset;
  lesion: LesionVisual | null;
  section: boolean;
  visible: Record<LayerId, boolean>;
  showLesion: boolean;
  highlightOf: (id: StructureId) => number;
  speed: number;
}

function useHighlight(mats: THREE.Material[], amount: number) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    for (const m of mats) {
      if ('emissive' in m && m.emissive instanceof THREE.Color) {
        m.emissive.copy(HIGHLIGHT);
        (m as THREE.MeshStandardMaterial).emissiveIntensity = amount * 0.45;
      }
    }
    // Rendering is on demand: material edits need a new frame.
    invalidate();
  }, [mats, amount, invalidate]);
}

export function StudioTooth({ model, asset, lesion, section, visible, showLesion, highlightOf, speed }: StudioToothProps) {
  const geo = useCariesProgression(model, asset.id, showLesion ? lesion : null, speed);
  const color = (id: LayerId) => asset.layers.find((l) => l.id === id)!;

  // Surface discolouration of a lesion, eased like the procedural model's.
  const uniforms = useMemo(() => createLesionUniforms(), []);
  const target = useMemo(() => lesionSurfaceTarget(showLesion ? lesion : null, model.fossa), [lesion, showLesion, model.fossa]);
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

  const enamelMat = useDisposable(
    () => makeTissueMaterial({ color: color('enamel').color, roughness: 0.32, clearcoat: 0.45, clearcoatRoughness: 0.3 }, uniforms),
    [uniforms],
  );
  // On the crown the tooth surface coincides with the enamel's outer surface; the two scans differ by
  // up to ~0.25 mm there (measured), so the tooth surface is pushed back 0.35 mm in depth only.
  const toothMat = useDisposable(() => makeTissueMaterial({ color: color('tooth').color, roughness: 0.6 }, uniforms, 0.35), [uniforms]);
  const enamelCut = useDisposable(() => new THREE.MeshPhysicalMaterial({ color: '#d3d8de', roughness: 0.8 }), []);
  const dentinCut = useDisposable(() => new THREE.MeshPhysicalMaterial({ color: '#a8743f', roughness: 0.9 }), []);
  const pulpMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: color('pulp').color, roughness: 0.6 }), []);
  const pdlMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: color('pdl').color, roughness: 0.8 }), []);
  const laminaMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: color('lamina').color, roughness: 0.95 }), []);

  const all = [enamelMat, toothMat, enamelCut, dentinCut, pulpMat, pdlMat, laminaMat];
  useEffect(() => applyClipping(all, section), [section, ...all]); // eslint-disable-line react-hooks/exhaustive-deps
  useHighlight([enamelMat, enamelCut], highlightOf('enamel'));
  useHighlight([toothMat, dentinCut], highlightOf('dentin'));
  useHighlight([pulpMat], highlightOf('pulp'));
  useHighlight([pdlMat], highlightOf('pdl'));
  useHighlight([laminaMat], highlightOf('lamina'));

  const layers: { id: LayerId; geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; structureId: StructureId }[] = [
    { id: 'enamel', geometry: geo.enamel.geometry, material: geo.enamel.cut ? [enamelMat, enamelCut] : enamelMat, structureId: 'enamel' },
    { id: 'tooth', geometry: geo.tooth.geometry, material: geo.tooth.cut ? [toothMat, dentinCut] : toothMat, structureId: 'dentin' },
    { id: 'pulp', geometry: model.layers.pulp.geometry, material: pulpMat, structureId: 'pulp' },
    { id: 'pdl', geometry: model.layers.pdl.geometry, material: pdlMat, structureId: 'pdl' },
    { id: 'lamina', geometry: model.layers.lamina.geometry, material: laminaMat, structureId: 'lamina' },
  ];

  const caps: CapSpec[] = section
    ? [
        ...asset.layers
          .filter((l) => visible[l.id])
          .map((l) => ({
            key: l.id,
            section: model.layers[l.id].section,
            color: l.capColor,
            structureId: l.structureId,
            layer: CAP_LAYER[l.id],
          })),
        ...(visible.tooth || visible.enamel
          ? geo.lesionSections.map((s) => ({
              key: `lesion-${s.id}`,
              section: s.section,
              color: s.id === 'enamel' && geo.lesion?.surfaceTone === 'white' ? EARLY_ENAMEL_LESION : LESION_CAP[s.id].color,
              structureId: 'lesion' as StructureId,
              layer: LESION_CAP[s.id].layer,
            }))
          : []),
      ]
    : [];

  return (
    <group>
      {layers
        .filter((l) => visible[l.id])
        .map((l) => (
          <mesh key={l.id} geometry={l.geometry} material={l.material} userData={{ structureId: l.structureId }} dispose={null} />
        ))}
      {section && <ToothCrossSection caps={caps} cavity={geo.cavitySection} highlightOf={highlightOf} />}
    </group>
  );
}
