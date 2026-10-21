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
  /** Bracket only: the lower end (pos is the upper end). */
  pos2?: [number, number, number];
  /**
   * label = pill at the point · caption = heading over a tooth ·
   * callout = textbook label in a side column with a leader line · bracket = Crown/Root span.
   */
  kind: 'label' | 'caption' | 'callout' | 'bracket';
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

/**
 * Textbook-style labelling of the longitudinal section (anatomy module): every
 * anchor sits on the mesial (right-hand) half of the cut face, labels line up in a
 * column to the right with leader lines, and brackets mark crown and root.
 */
const TEXTBOOK: Anchor[] = [
  { id: 'enamel', pos: [2.9, 5.4, 0] },
  { id: 'dentin', pos: [3.4, 2.5, 0] },
  { id: 'pulp', pos: [1.2, -0.5, 0] },
  { id: 'rootCanal', pos: [2.75, -6, 0] },
  { id: 'cementum', pos: [4.1, -8, 0] },
  { id: 'neurovascular', pos: [3.38, -14.6, -0.3] },
];
const TEXTBOOK_SUPPORT: Anchor[] = [
  { id: 'gingiva', pos: [5.2, -0.9, 0] },
  { id: 'pdl', pos: [4.24, -10.5, 0] },
  { id: 'bone', pos: [5.8, -12, 0] },
];

export function textbookAnchors(visual: ToothVisualState, showSupport: boolean): LabelAnchor[] {
  const items = [...TEXTBOOK, ...(showSupport && !visual.gingivalRecession ? TEXTBOOK_SUPPORT : [])];
  const lesion = visual.lesion;
  if (lesion && (lesion.enamelDepth > 0.05 || lesion.dentinDepth > 0.02)) {
    const f = SITE_FRAMES[lesion.site];
    const p = f.origin.clone().addScaledVector(f.axis, f.enamelThickness + f.dentinToPulp * lesion.dentinDepth * 0.5);
    items.push({ id: 'lesion', pos: [p.x + 0.4, p.y, 0] });
  }
  const callouts: LabelAnchor[] = items.map((a) => ({
    key: `callout-${a.id}`,
    text: a.id === 'neurovascular' ? 'Nerve and blood supply' : shortName(a.id),
    structureId: a.id,
    pos: a.pos,
    kind: 'callout',
  }));
  return [
    ...callouts,
    { key: 'bracket-crown', text: 'Crown', pos: [0, 7.3, 0], pos2: [0, 0, 0], kind: 'bracket' },
    { key: 'bracket-root', text: 'Root', pos: [0, 0, 0], pos2: [0, -14.4, 0], kind: 'bracket' },
  ];
}

/** Registry of overlay elements (HTML labels and SVG leader lines), keyed by anchor key. */
const elements = new Map<string, HTMLElement | SVGElement>();
export function registerLabelElement(key: string, el: HTMLElement | SVGElement | null) {
  if (el) elements.set(key, el);
  else elements.delete(key);
}

/** Below this canvas width there is no room for a label column: callouts fall back to pills. */
const NARROW = 560;
const ROW = 28;

export function LabelProjector({ anchors }: { anchors: LabelAnchor[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    invalidate();
  }, [anchors, invalidate]);

  useFrame(() => {
    const toScreen = (p: [number, number, number]) => {
      v.set(...p).project(camera);
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, ok: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
    };
    const narrow = size.width < NARROW;
    const show = (el: HTMLElement | SVGElement | undefined, on: boolean) => {
      if (el) el.style.visibility = on ? 'visible' : 'hidden';
    };

    // Pills and captions: centred on their point. Callouts too on narrow screens.
    for (const a of anchors) {
      if (a.kind === 'bracket' || (a.kind === 'callout' && !narrow)) continue;
      const el = elements.get(a.key);
      if (!el) continue;
      const p = toScreen(a.pos);
      show(el, p.ok);
      el.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`;
      show(elements.get(`${a.key}:line`), false);
      show(elements.get(`${a.key}:dot`), false);
    }

    // Brackets (Crown / Root) to the left of the tooth.
    const left = Math.max(64, toScreen([-8.4, 0, 0]).x);
    for (const a of anchors) {
      if (a.kind !== 'bracket') continue;
      const path = elements.get(`${a.key}:path`);
      const text = elements.get(`${a.key}:text`);
      const y0 = toScreen(a.pos).y + 2;
      const y1 = toScreen(a.pos2 ?? a.pos).y - 2;
      path?.setAttribute('d', `M${left + 8} ${y0}H${left}V${y1}H${left + 8}M${left} ${(y0 + y1) / 2}H${left - 8}`);
      text?.setAttribute('x', String(left - 12));
      text?.setAttribute('y', String((y0 + y1) / 2 + 5));
      show(path, !narrow);
      show(text, !narrow);
    }
    if (narrow) return;

    // Callouts: a column right of the tooth, rows spread so labels never overlap.
    const colX = Math.min(toScreen([8.6, 0, 0]).x, size.width - 200);
    const rows = anchors
      .filter((a) => a.kind === 'callout')
      .map((a) => ({ a, p: toScreen(a.pos) }))
      .sort((m, n) => m.p.y - n.p.y);
    const ys = rows.map((r) => r.p.y);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + ROW);
    for (let i = ys.length - 1; i >= 0; i--) {
      const limit = (i === ys.length - 1 ? size.height - 16 : ys[i + 1] - ROW);
      ys[i] = Math.max(16 + i * ROW, Math.min(ys[i], limit));
    }
    rows.forEach(({ a, p }, i) => {
      const el = elements.get(a.key);
      const line = elements.get(`${a.key}:line`);
      const dot = elements.get(`${a.key}:dot`);
      if (el) {
        el.style.transform = `translate(0, -50%) translate(${colX}px, ${ys[i]}px)`;
        show(el, p.ok);
      }
      line?.setAttribute('points', `${p.x},${p.y} ${colX - 28},${ys[i]} ${colX - 6},${ys[i]}`);
      dot?.setAttribute('cx', String(p.x));
      dot?.setAttribute('cy', String(p.y));
      show(line, p.ok);
      show(dot, p.ok);
    });
  });
  return null;
}

/** DOM overlay rendered next to the canvas. */
export function LabelOverlay({ anchors }: { anchors: LabelAnchor[] }) {
  const selected = useSim((s) => s.selectedStructure);
  const select = useSim((s) => s.selectStructure);
  const lined = anchors.filter((a) => a.kind === 'callout' || a.kind === 'bracket');
  return (
    <div className="label-layer">
      {lined.length > 0 && (
        <svg className="leader-layer" aria-hidden>
          {lined.map((a) =>
            a.kind === 'bracket' ? (
              <g key={a.key}>
                <path ref={(el) => registerLabelElement(`${a.key}:path`, el)} className="bracket-path" />
                <text ref={(el) => registerLabelElement(`${a.key}:text`, el)} className="bracket-text" textAnchor="end">
                  {a.text}
                </text>
              </g>
            ) : (
              <g key={a.key} className={selected === a.structureId ? 'leader leader--active' : 'leader'}>
                <polyline ref={(el) => registerLabelElement(`${a.key}:line`, el)} />
                <circle ref={(el) => registerLabelElement(`${a.key}:dot`, el)} r="3" />
              </g>
            ),
          )}
        </svg>
      )}
      {anchors.map((a) => {
        if (a.kind === 'bracket') return null;
        if (a.kind === 'caption') {
          return (
            <div key={a.key} ref={(el) => registerLabelElement(a.key, el)} className="scene-caption label-pos">
              {a.text}
            </div>
          );
        }
        const active = selected === a.structureId;
        const cls = a.kind === 'callout' ? `callout-label${active ? ' callout-label--active' : ''}` : `scene-label${active ? ' scene-label--active' : ''}`;
        return (
          <button
            key={a.key}
            ref={(el) => registerLabelElement(a.key, el)}
            type="button"
            className={`${cls} label-pos`}
            onClick={() => a.structureId && select(a.structureId)}
            aria-label={`Select ${a.text}`}
          >
            {a.kind === 'label' && <span className="scene-label__dot" aria-hidden />}
            {a.text}
          </button>
        );
      })}
    </div>
  );
}
