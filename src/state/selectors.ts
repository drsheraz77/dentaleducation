import type {
  CavityShape,
  InstrumentId,
  InstrumentRule,
  MaterialId,
  MaterialStep,
  ProcedureId,
  ProcedureStep,
  TimelineStep,
  ToothVisualState,
} from '../types';
import type { SimState } from './store';
import { ANATOMY, ANATOMY_TOUR } from '../data/anatomy';
import { CARIES_STAGES, CLASSIFICATION_EXAMPLES } from '../data/cariesStages';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { INCREMENTS_BY_PREPARATION, MATERIAL_BY_ID } from '../data/materials';
import { INSTRUMENTS } from '../data/instruments';
import { CASES } from '../data/cases';
import { QUIZ } from '../data/quiz';
import { evaluateDiagnosis } from '../modules/diagnosis/decisionEngine';

/** The anatomy module's longitudinal section, laid out like a textbook figure (callouts, brackets, light page). */
export function isTextbookView(s: Pick<SimState, 'topic' | 'viewMode'>): boolean {
  return s.topic === 'anatomy' && s.viewMode === 'section';
}

export const DEFAULT_VISUAL: ToothVisualState = {
  biofilm: 0,
  acidChallenge: false,
  gingivalRecession: false,
  lesion: null,
  cavity: null,
  residualLesion: false,
  cutFinish: 'fresh',
  isolation: 'none',
  matrix: false,
  etchGel: 'none',
  liner: null,
  restoration: null,
  curingLight: false,
  mixingCapsule: false,
  instrument: null,
  plannedOutline: false,
  highlight: [],
};

/** Keys that describe a momentary action and do not carry over to the next step. */
const TRANSIENT: (keyof ToothVisualState)[] = ['instrument', 'curingLight', 'mixingCapsule', 'etchGel', 'plannedOutline', 'highlight', 'camera'];

export function mergeVisual(...parts: Partial<ToothVisualState>[]): ToothVisualState {
  return Object.assign({}, DEFAULT_VISUAL, ...parts);
}

/** Apply steps cumulatively: persistent keys accumulate, transient keys only apply on their own step. */
export function accumulate(base: Partial<ToothVisualState>, steps: Partial<ToothVisualState>[], upTo: number): ToothVisualState {
  let acc: ToothVisualState = mergeVisual(base);
  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const cleared = { ...acc };
    for (const k of TRANSIENT) (cleared as Record<string, unknown>)[k] = DEFAULT_VISUAL[k];
    acc = { ...cleared, ...steps[i] } as ToothVisualState;
  }
  return acc;
}

export const PROCEDURE_SHAPE: Record<ProcedureId, CavityShape> = {
  'conservative-occlusal': 'conservative',
  'class-i': 'classI',
  'class-ii': 'classII',
  'selective-removal': 'selective',
};

/* ------------------------------------------------------------------ */
/* Procedures                                                          */
/* ------------------------------------------------------------------ */

export function instrumentKey(procedureId: ProcedureId, stepId: string) {
  return `${procedureId}:${stepId}`;
}

export function chosenInstrument(state: Pick<SimState, 'instrumentChoices'>, procedureId: ProcedureId, step: ProcedureStep): InstrumentId | null {
  if (!step.instrumentOptions?.length) return null;
  return state.instrumentChoices[instrumentKey(procedureId, step.id)] ?? step.instrumentOptions[0];
}

export function instrumentFeedback(
  state: Pick<SimState, 'instrumentChoices'>,
  procedureId: ProcedureId,
  step: ProcedureStep,
): (InstrumentRule & { instrument: InstrumentId }) | null {
  const id = chosenInstrument(state, procedureId, step);
  if (!id) return null;
  const rule = step.instrumentRules?.[id];
  return rule ? { ...rule, instrument: id } : null;
}

export function procedureVisual(state: Pick<SimState, 'instrumentChoices'>, procedureId: ProcedureId, stepIndex: number): ToothVisualState {
  const proc = PROCEDURE_BY_ID[procedureId];
  const steps = proc.steps.map((step) => {
    const v: Partial<ToothVisualState> = { ...step.visual, camera: step.camera };
    const id = chosenInstrument(state, procedureId, step);
    const fb = instrumentFeedback(state, procedureId, step);
    if (id) v.instrument = { id, motion: INSTRUMENTS[id].motion };
    // An unsuitable instrument does not cut: the cavity stays as it was.
    if (fb && !fb.suitable) delete v.cavity;
    return v;
  });
  return accumulate({ lesion: proc.startingLesion }, steps, stepIndex);
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

export function materialSupport(materialId: MaterialId, preparation: ProcedureId) {
  return MATERIAL_BY_ID[materialId].preparations.find((p) => p.procedure === preparation) ?? {
    procedure: preparation,
    supported: false,
    note: 'This combination is not defined.',
  };
}

export function materialSteps(state: Pick<SimState, 'adhesiveProtocol'>, materialId: MaterialId, preparation: ProcedureId): MaterialStep[] {
  if (!materialSupport(materialId, preparation).supported) return [];
  return MATERIAL_BY_ID[materialId].workflow.filter(
    (s) =>
      (!s.onlyFor || s.onlyFor.includes(preparation)) &&
      (!s.onlyProtocols || (materialId === 'composite' && s.onlyProtocols.includes(state.adhesiveProtocol))),
  );
}

export function materialVisual(
  state: Pick<SimState, 'adhesiveProtocol'>,
  materialId: MaterialId,
  preparation: ProcedureId,
  stepIndex: number,
): ToothVisualState {
  const proc = PROCEDURE_BY_ID[preparation];
  const base: Partial<ToothVisualState> = {
    lesion: proc.startingLesion,
    cavity: { shape: PROCEDURE_SHAPE[preparation], depth: 1 },
    residualLesion: preparation === 'selective-removal',
  };
  const steps = materialSteps(state, materialId, preparation);
  if (steps.length === 0) return mergeVisual(base);
  const total = INCREMENTS_BY_PREPARATION[preparation];
  const v = accumulate(
    base,
    steps.map((s) => ({ ...s.visual, camera: s.camera })),
    stepIndex,
  );
  if (v.restoration) {
    const incremental = v.restoration.material === 'composite' || v.restoration.material === 'amalgam';
    const totalIncrements = incremental ? total : 1;
    v.restoration = { ...v.restoration, totalIncrements, increments: Math.min(v.restoration.increments, totalIncrements) };
  }
  if (v.cutFinish === 'etched' && materialId === 'composite' && state.adhesiveProtocol === 'selective-enamel-etch') {
    v.cutFinish = 'selectiveEtched';
  }
  return v;
}

/** Preparation shown when a material is compared: the current one if supported, otherwise its default. */
export function comparisonPreparation(materialId: MaterialId, preferred: ProcedureId): ProcedureId {
  return materialSupport(materialId, preferred).supported ? preferred : MATERIAL_BY_ID[materialId].defaultPreparation;
}

/* ------------------------------------------------------------------ */
/* Timeline & scene                                                    */
/* ------------------------------------------------------------------ */

export function getTimeline(s: SimState): TimelineStep[] {
  switch (s.topic) {
    case 'anatomy':
      return ANATOMY_TOUR.map((id) => ({ id, title: ANATOMY[id].name }));
    case 'caries':
      return CARIES_STAGES.map((c) => ({ id: c.id, title: c.shortTitle }));
    case 'classification':
      return CLASSIFICATION_EXAMPLES.map((c) => ({ id: c.id, title: c.title }));
    case 'preparation':
      return PROCEDURE_BY_ID[s.procedureId].steps.map((st) => ({ id: st.id, title: st.title }));
    case 'materials':
      if (s.materialsTab === 'compare') return [];
      return materialSteps(s, s.materialId, s.materialPreparation).map((st) => ({ id: st.id, title: st.title }));
    default:
      return [];
  }
}

export interface SceneTooth {
  visual: ToothVisualState;
  caption?: string;
}

export interface SceneDescription {
  teeth: SceneTooth[];
  notice: { tone: 'info' | 'warning'; text: string } | null;
  /** False when the central workspace should show a non-3D panel (quiz). */
  show3D: boolean;
}

export function deriveScene(s: SimState): SceneDescription {
  switch (s.topic) {
    case 'anatomy': {
      const v = s.pathology ? mergeVisual(CARIES_STAGES[5].visual, { highlight: [] }) : mergeVisual({});
      return { teeth: [{ visual: v }], notice: null, show3D: true };
    }
    case 'caries':
      return { teeth: [{ visual: mergeVisual(CARIES_STAGES[s.step]?.visual ?? {}) }], notice: null, show3D: true };
    case 'classification':
      return {
        teeth: [{ visual: mergeVisual(CLASSIFICATION_EXAMPLES[s.step]?.visual ?? {}) }],
        notice: { tone: 'info', text: 'Illustrative example for learning ICDAS concepts — not a validated diagnostic tool.' },
        show3D: true,
      };
    case 'diagnosis':
      return { teeth: [{ visual: mergeVisual(evaluateDiagnosis(s.diagnosis).visual) }], notice: null, show3D: true };
    case 'preparation': {
      const proc = PROCEDURE_BY_ID[s.procedureId];
      const step = proc.steps[s.step];
      const fb = step ? instrumentFeedback(s, s.procedureId, step) : null;
      const current = procedureVisual(s, s.procedureId, s.step);
      const notice = fb && !fb.suitable ? { tone: 'warning' as const, text: fb.note } : null;
      if (s.compareBeforeAfter) {
        const before = mergeVisual({ lesion: proc.startingLesion });
        return {
          teeth: [
            { visual: before, caption: 'Before' },
            {
              // Isolation is hidden so both teeth are compared like-for-like.
              visual: { ...current, instrument: null, plannedOutline: false, isolation: 'none', camera: undefined },
              caption: `After step ${s.step + 1}`,
            },
          ],
          notice,
          show3D: true,
        };
      }
      return { teeth: [{ visual: current }], notice, show3D: true };
    }
    case 'materials': {
      if (s.materialsTab === 'compare') {
        const final = (id: MaterialId) => {
          const prep = comparisonPreparation(id, s.materialPreparation);
          const n = materialSteps(s, id, prep).length;
          return { ...materialVisual(s, id, prep, n - 1), instrument: null, curingLight: false, camera: undefined, isolation: 'none' as const };
        };
        return {
          teeth: [
            { visual: final(s.compareA), caption: MATERIAL_BY_ID[s.compareA].shortName },
            { visual: final(s.compareB), caption: MATERIAL_BY_ID[s.compareB].shortName },
          ],
          notice: null,
          show3D: true,
        };
      }
      const support = materialSupport(s.materialId, s.materialPreparation);
      const v = materialVisual(s, s.materialId, s.materialPreparation, s.step);
      return {
        teeth: [{ visual: v }],
        notice: support.supported ? null : { tone: 'warning', text: `${MATERIAL_BY_ID[s.materialId].shortName}: ${support.note}` },
        show3D: true,
      };
    }
    case 'cases':
      return { teeth: [{ visual: mergeVisual(CASES[s.caseIndex].visual) }], notice: { tone: 'info', text: 'Simulated, fictional case for learning.' }, show3D: true };
    case 'quiz':
      return { teeth: [], notice: null, show3D: false };
  }
}

export function quizScore(answers: (number | null)[]): { correct: number; answered: number; total: number } {
  let correct = 0;
  let answered = 0;
  answers.forEach((a, i) => {
    if (a === null) return;
    answered++;
    if (a === QUIZ[i].correctIndex) correct++;
  });
  return { correct, answered, total: QUIZ.length };
}
