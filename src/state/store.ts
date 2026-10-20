import { create } from 'zustand';
import type {
  AdhesiveProtocolId,
  DiagnosisInput,
  InstrumentId,
  LearningMode,
  MaterialId,
  ProcedureId,
  StructureId,
  TopicId,
  ViewMode,
} from '../types';
import { DEFAULT_DIAGNOSIS } from '../modules/diagnosis/decisionEngine';
import { MATERIAL_BY_ID } from '../data/materials';
import { ANATOMY_TOUR } from '../data/anatomy';
import { CASES } from '../data/cases';
import { QUIZ } from '../data/quiz';
import { getTimeline } from './selectors';

export type MaterialsTab = 'workflow' | 'compare';

export interface QuizState {
  index: number;
  answers: (number | null)[];
  finished: boolean;
}

export interface SimState {
  topic: TopicId;
  mode: LearningMode;
  viewMode: ViewMode;
  showLabels: boolean;
  showSupport: boolean;
  /** Anatomy module: show a carious lesion on the reference tooth. */
  pathology: boolean;
  selectedStructure: StructureId | null;

  step: number;
  playing: boolean;
  speed: number;
  cameraResetToken: number;

  procedureId: ProcedureId;
  /** Instrument chosen per procedure step: key `${procedureId}:${stepId}`. */
  instrumentChoices: Record<string, InstrumentId>;
  compareBeforeAfter: boolean;

  materialId: MaterialId;
  materialPreparation: ProcedureId;
  adhesiveProtocol: AdhesiveProtocolId;
  materialsTab: MaterialsTab;
  compareA: MaterialId;
  compareB: MaterialId;

  diagnosis: DiagnosisInput;

  caseIndex: number;
  caseAnswers: Record<string, number>;

  quiz: QuizState;
}

export interface SimActions {
  setTopic: (topic: TopicId) => void;
  setMode: (mode: LearningMode) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleLabels: () => void;
  toggleSupport: () => void;
  togglePathology: () => void;
  selectStructure: (id: StructureId | null) => void;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  resetCamera: () => void;

  setProcedure: (id: ProcedureId) => void;
  chooseInstrument: (stepKey: string, id: InstrumentId) => void;
  setCompareBeforeAfter: (v: boolean) => void;

  setMaterial: (id: MaterialId) => void;
  setMaterialPreparation: (id: ProcedureId) => void;
  setAdhesiveProtocol: (id: AdhesiveProtocolId) => void;
  setMaterialsTab: (tab: MaterialsTab) => void;
  setCompare: (slot: 'A' | 'B', id: MaterialId) => void;

  setDiagnosis: <K extends keyof DiagnosisInput>(key: K, value: DiagnosisInput[K]) => void;

  setCase: (index: number) => void;
  answerCase: (key: string, option: number) => void;

  answerQuiz: (option: number) => void;
  nextQuestion: () => void;
  restartQuiz: () => void;
}

export type Store = SimState & SimActions;

export const initialState: SimState = {
  topic: 'anatomy',
  mode: 'explore',
  viewMode: 'external',
  showLabels: true,
  showSupport: true,
  pathology: false,
  selectedStructure: null,
  step: 0,
  playing: false,
  speed: 1,
  cameraResetToken: 0,
  procedureId: 'class-i',
  instrumentChoices: {},
  compareBeforeAfter: false,
  materialId: 'composite',
  materialPreparation: 'class-i',
  adhesiveProtocol: 'etch-and-rinse',
  materialsTab: 'workflow',
  compareA: 'composite',
  compareB: 'gic',
  diagnosis: DEFAULT_DIAGNOSIS,
  caseIndex: 0,
  caseAnswers: {},
  quiz: { index: 0, answers: QUIZ.map(() => null), finished: false },
};

const clampStep = (s: SimState, step: number) => {
  const n = getTimeline(s).length;
  return n === 0 ? 0 : Math.max(0, Math.min(n - 1, step));
};

/** Side effects of landing on a step (anatomy tour selects the structure it describes). */
const stepPatch = (s: SimState, step: number): Partial<SimState> =>
  s.topic === 'anatomy' ? { step, selectedStructure: ANATOMY_TOUR[step] ?? null } : { step };

export const useSim = create<Store>()((set, get) => ({
  ...initialState,

  setTopic: (topic) =>
    set((s) => ({
      topic,
      step: 0,
      playing: false,
      selectedStructure: null,
      compareBeforeAfter: false,
      mode: topic === 'cases' ? 'case' : s.mode === 'case' ? 'explore' : s.mode,
      viewMode: topic === 'caries' || topic === 'classification' ? 'section' : s.viewMode,
      cameraResetToken: s.cameraResetToken + 1,
    })),
  setMode: (mode) =>
    set((s) => ({
      mode,
      topic: mode === 'case' ? 'cases' : s.topic === 'cases' ? 'caries' : s.topic,
      step: mode === 'case' || s.topic === 'cases' ? 0 : s.step,
      playing: false,
    })),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleSupport: () => set((s) => ({ showSupport: !s.showSupport })),
  togglePathology: () => set((s) => ({ pathology: !s.pathology })),
  selectStructure: (selectedStructure) => set({ selectedStructure }),

  setStep: (step) => set((s) => stepPatch(s, clampStep(s, step))),
  nextStep: () => {
    const s = get();
    const n = getTimeline(s).length;
    if (s.step >= n - 1) set({ playing: false });
    else set(stepPatch(s, s.step + 1));
  },
  prevStep: () => set((s) => stepPatch(s, clampStep(s, s.step - 1))),
  play: () =>
    set((s) => {
      const n = getTimeline(s).length;
      if (n === 0) return {};
      // Replay from the start when already at the end.
      return s.step >= n - 1 ? { ...stepPatch(s, 0), playing: true } : { playing: true };
    }),
  pause: () => set({ playing: false }),
  reset: () => set((s) => ({ ...stepPatch(s, 0), playing: false, cameraResetToken: s.cameraResetToken + 1 })),
  setSpeed: (speed) => set({ speed }),
  resetCamera: () => set((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),

  setProcedure: (procedureId) => set({ procedureId, step: 0, playing: false, compareBeforeAfter: false }),
  chooseInstrument: (key, id) => set((s) => ({ instrumentChoices: { ...s.instrumentChoices, [key]: id } })),
  setCompareBeforeAfter: (compareBeforeAfter) => set({ compareBeforeAfter }),

  setMaterial: (materialId) =>
    set((s) => {
      const material = MATERIAL_BY_ID[materialId];
      const current = material.preparations.find((p) => p.procedure === s.materialPreparation);
      return {
        materialId,
        materialPreparation: current?.supported ? s.materialPreparation : material.defaultPreparation,
        step: 0,
        playing: false,
      };
    }),
  setMaterialPreparation: (materialPreparation) => set({ materialPreparation, step: 0, playing: false }),
  setAdhesiveProtocol: (adhesiveProtocol) => set({ adhesiveProtocol, step: 0, playing: false }),
  setMaterialsTab: (materialsTab) => set({ materialsTab, playing: false }),
  setCompare: (slot, id) => set(slot === 'A' ? { compareA: id } : { compareB: id }),

  setDiagnosis: (key, value) => set((s) => ({ diagnosis: { ...s.diagnosis, [key]: value } })),

  setCase: (caseIndex) => set({ caseIndex: Math.max(0, Math.min(CASES.length - 1, caseIndex)) }),
  answerCase: (key, option) => set((s) => (key in s.caseAnswers ? {} : { caseAnswers: { ...s.caseAnswers, [key]: option } })),

  answerQuiz: (option) =>
    set((s) => {
      if (s.quiz.answers[s.quiz.index] !== null) return {};
      const answers = [...s.quiz.answers];
      answers[s.quiz.index] = option;
      return { quiz: { ...s.quiz, answers } };
    }),
  nextQuestion: () =>
    set((s) => {
      const last = s.quiz.index >= QUIZ.length - 1;
      return { quiz: { ...s.quiz, index: last ? s.quiz.index : s.quiz.index + 1, finished: last } };
    }),
  restartQuiz: () => set({ quiz: { index: 0, answers: QUIZ.map(() => null), finished: false } }),
}));
