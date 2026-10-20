import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { StructureId, ToothVisualState } from '../types';
import { ANATOMY } from '../data/anatomy';
import { SITE_FRAMES } from './geometry/lesion';
import { useSim } from '../state/store';

/**
 * Scene labels are plain DOM buttons in an overlay above the canvas. A projector
 * inside the canvas writes their screen positions directly to the elements on each
 * rendered frame — no React re-render and no nested React roots.
 */

export interface LabelAnchor {
  key: string;
  text: string;
  structureId?: StructureId;
  pos: [number, number, number];
  kind: 'label' | 'caption';
}

type Anchor = { id: StructureId; pos: [number, number, number] };

const EXTERNAL: Anchor[] = [
  { id: 'enamel', pos: [3.0, 4.6, 3.6] },
  { id: 'gingiva', pos: [0, 0.3, 5.0] },
  { id: 'bone', pos: [0, -8, 6.4] },
];
const EXTERNAL_NO_SUPPORT: Anchor[] = [
  { id: 'enamel', pos: [3.0, 4.6, 3.6] },
  { id: 'cementum', pos: [0, -1.6, 3.9] },
  { id: 'root', pos: [-3.3, -8, 1.2] },
];
const SECTION: Anchor[] = [
  { id: 'enamel', pos: [-2.6, 5.4, 0] },
  { id: 'dentin', pos: [-3.6, 1.6, 0] },
  { id: 'pulp', pos: [0, -0.4, 0] },
  { id: 'rootCanal', pos: [2.85, -8, 0] },
  { id: 'cementum', pos: [-4.3, -5, 0] },
];
const SECTION_SUPPORT: Anchor[] = [
  { id: 'pdl', pos: [-4.75, -10, 0] },
  { id: 'bone', pos: [6.0, -11, 0] },
  { id: 'gingiva', pos: [5.6, -0.9, 0] },
];

const shortName = (id: StructureId) => ANATOMY[id].name.replace(' (coronal pulp chamber)', '').replace(' (radicular pulp)', '');

export function structureAnchors(visual: ToothVisualState, section: boolean, showSupport: boolean): LabelAnchor[] {
  const support = showSupport && visual.isolation !== 'rubberDam';
  const base: Anchor[] = section
    ? [...SECTION, ...(support ? SECTION_SUPPORT : [])]
    : support && !visual.gingivalRecession
      ? EXTERNAL
      : EXTERNAL_NO_SUPPORT;
  const out: Anchor[] = [...base];
  const lesion = visual.lesion;
  const lesionVisible = lesion && (lesion.enamelDepth > 0.05 || lesion.dentinDepth > 0.02);
  const excavated = !!visual.cavity && visual.cavity.depth >= 1 && !visual.residualLesion;
  if (lesion && lesionVisible && !excavated && (section || lesion.cavitation > 0.05 || lesion.site === 'root') && !visual.restoration) {
    const f = SITE_FRAMES[lesion.site];
    const depth = f.enamelThickness + f.dentinToPulp * lesion.dentinDepth * 0.5;
    const p = f.origin.clone().addScaledVector(f.axis, depth);
    out.push({ id: 'lesion', pos: [p.x, p.y, section ? 0 : p.z + (lesion.site === 'root' ? 0.5 : 0)] });
  }
  if (visual.restoration) out.push({ id: 'restoration', pos: [-1.6, 5.8, 0] });
  if (visual.liner && section) out.push({ id: 'liner', pos: [-0.6, 3.0, 0] });
  // Structures under an opaque rubber dam are not visible from outside.
  const hidden = (a: Anchor) => !section && visual.isolation === 'rubberDam' && a.pos[1] < 1;
  return out
    .filter((a) => !hidden(a)).map((a) => ({ key: `${a.id}@${a.pos.join(',')}`, text: shortName(a.id), structureId: a.id, pos: a.pos, kind: 'label' }));
}

/** Registry of overlay elements, keyed by anchor key. */
const elements = new Map<string, HTMLElement>();
export function registerLabelElement(key: string, el: HTMLElement | null) {
  if (el) elements.set(key, el);
  else elements.delete(key);
}

export function LabelProjector({ anchors }: { anchors: LabelAnchor[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    invalidate();
  }, [anchors, invalidate]);
  useFrame(() => {
    for (const a of anchors) {
      const el = elements.get(a.key);
      if (!el) continue;
      v.set(...a.pos).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.visibility = visible ? 'visible' : 'hidden';
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    }
  });
  return null;
}

/** DOM overlay rendered next to the canvas. */
export function LabelOverlay({ anchors }: { anchors: LabelAnchor[] }) {
  const selected = useSim((s) => s.selectedStructure);
  const select = useSim((s) => s.selectStructure);
  return (
    <div className="label-layer">
      {anchors.map((a) =>
        a.kind === 'caption' ? (
          <div key={a.key} ref={(el) => registerLabelElement(a.key, el)} className="scene-caption label-pos">
            {a.text}
          </div>
        ) : (
          <button
            key={a.key}
            ref={(el) => registerLabelElement(a.key, el)}
            type="button"
            className={`scene-label label-pos${selected === a.structureId ? ' scene-label--active' : ''}`}
            onClick={() => a.structureId && select(a.structureId)}
            aria-label={`Select ${a.text}`}
          >
            <span className="scene-label__dot" aria-hidden />
            {a.text}
          </button>
        ),
      )}
    </div>
  );
}
