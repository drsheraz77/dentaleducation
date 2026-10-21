/**
 * Core typed domain model for DentalVerse 3D.
 * Educational content (src/data) and rendering (src/three) both depend on these
 * types, but never on each other directly.
 */

export type TopicId =
  | 'anatomy'
  | 'caries'
  | 'studio'
  | 'classification'
  | 'diagnosis'
  | 'preparation'
  | 'materials'
  | 'cases'
  | 'quiz';

export type LearningMode = 'guided' | 'explore' | 'case';
export type ViewMode = 'external' | 'section';
export type CameraPreset = 'default' | 'full' | 'working' | 'occlusal' | 'buccal' | 'mesial' | 'section' | 'sectionFull' | 'sectionCentered' | 'root';

export type StructureId =
  | 'enamel'
  | 'dentin'
  | 'pulp'
  | 'rootCanal'
  | 'cementum'
  | 'root'
  | 'pdl'
  | 'bone'
  | 'gingiva'
  | 'neurovascular'
  | 'tubules'
  | 'lamina'
  | 'lesion'
  | 'biofilm'
  | 'restoration'
  | 'liner';

/** Status of scientific content. New or changed content is a draft until a qualified reviewer signs off. */
export type VerificationStatus = 'draft_pending_review' | 'expert-reviewed';

export interface ContentMeta {
  /** Reference ids from src/data/references.ts */
  refs: string[];
  verification: VerificationStatus;
}

export interface Reference {
  id: string;
  citation: string;
  type: 'textbook' | 'journal' | 'guideline' | 'consensus' | 'treaty';
  /** Topics the reference supports — used to build per-topic reading lists. */
  supports: string[];
}

export interface AnatomyEntry extends ContentMeta {
  id: StructureId;
  name: string;
  function: string;
  characteristics: string[];
  cariesRelevance: string;
  clinicalRelevance: string;
}

/* ------------------------------------------------------------------ */
/* Visual state — the single description the 3D scene renders from.   */
/* ------------------------------------------------------------------ */

export type LesionSite = 'occlusal' | 'proximal' | 'root';
export type CavityShape = 'conservative' | 'classI' | 'classII' | 'selective';
export type MaterialId = 'composite' | 'gic' | 'rmgic' | 'amalgam' | 'calciumSilicate';
export type IsolationType = 'none' | 'cottonRolls' | 'rubberDam';
export type CutSurfaceFinish = 'fresh' | 'etched' | 'selectiveEtched' | 'primed' | 'bonded' | 'conditioned';

export interface LesionVisual {
  site: LesionSite;
  /** 0–1: fraction of enamel thickness demineralised (subsurface). */
  enamelDepth: number;
  /** 0–1: fraction of the DEJ→pulp distance affected in dentin. */
  dentinDepth: number;
  /** Surface discolouration: 0 none, 'white' chalky, 'brown' stained. */
  surfaceTone: 'none' | 'white' | 'brown';
  surfaceIntensity: number;
  /** 0–1 size of a cavitation (surface breakdown) — 0 means surface intact. */
  cavitation: number;
  /** 0–1 visual inflammation of pulp tissue (illustrative only). */
  pulpInflammation: number;
  /** Lesion reads as arrested/inactive (darker, glossier). */
  inactive?: boolean;
}

export interface CavityVisual {
  shape: CavityShape;
  /** 0–1 how much of the planned preparation volume has been removed. */
  depth: number;
}

export interface RestorationVisual {
  material: MaterialId;
  /** Number of placed increments (0 = none). */
  increments: number;
  /** Total increments planned for the sequence. */
  totalIncrements: number;
  /** 0–1 polymerisation / setting progress — drives material appearance. */
  set: number;
  /** Excess removed and surface finished. */
  finished: boolean;
  /** Protective surface coat (GIC) or varnish. */
  coated?: boolean;
}

export type InstrumentMotion = 'rotate' | 'scrape' | 'probe' | 'apply' | 'condense' | 'cure' | 'shake' | 'none';

export interface ToothVisualState {
  biofilm: number;
  acidChallenge: boolean;
  gingivalRecession: boolean;
  lesion: LesionVisual | null;
  cavity: CavityVisual | null;
  /** Lesion tissue left in place on purpose (selective removal). */
  residualLesion: boolean;
  cutFinish: CutSurfaceFinish;
  isolation: IsolationType;
  matrix: boolean;
  etchGel: 'none' | 'total' | 'enamelOnly';
  liner: { material: 'calciumSilicate'; set: number } | null;
  restoration: RestorationVisual | null;
  curingLight: boolean;
  mixingCapsule: boolean;
  instrument: { id: InstrumentId; motion: InstrumentMotion } | null;
  /** Translucent preview of the planned preparation volume. */
  plannedOutline: boolean;
  highlight: StructureId[];
  camera?: CameraPreset;
}

/* ------------------------------------------------------------------ */
/* Caries                                                              */
/* ------------------------------------------------------------------ */

export interface CariesStage extends ContentMeta {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  whatIsHappening: string;
  whyItMatters: string;
  clinicalRelevance: string;
  keyPoints: string[];
  visual: Partial<ToothVisualState>;
}

export interface ClassificationExample extends ContentMeta {
  id: string;
  title: string;
  icdas: string;
  icdasCode: string;
  description: string;
  visualSigns: string[];
  managementNote: string;
  visual: Partial<ToothVisualState>;
}

export interface IcdasCode {
  code: string;
  label: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Instruments and procedures                                          */
/* ------------------------------------------------------------------ */

export type InstrumentId =
  | 'mirror'
  | 'explorer'
  | 'roundBur'
  | 'pearBur'
  | 'fissureBur'
  | 'slowRoundBur'
  | 'spoonExcavator'
  | 'enamelHatchet'
  | 'matrixBand'
  | 'etchSyringe'
  | 'microbrush'
  | 'compositeInstrument'
  | 'curingLight'
  | 'capsuleApplier'
  | 'amalgamCarrier'
  | 'condenser'
  | 'carver'
  | 'finishingBur'
  | 'polishingDisc';

export interface Instrument extends ContentMeta {
  id: InstrumentId;
  name: string;
  category: 'diagnostic' | 'rotary' | 'hand' | 'restorative' | 'device';
  description: string;
  use: string;
  motion: InstrumentMotion;
  color: string;
}

export interface InstrumentRule {
  suitable: boolean;
  note: string;
}

export interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  rationale: string;
  /** Instruments the learner can choose at this step (first = default). */
  instrumentOptions?: InstrumentId[];
  instrumentRules?: Partial<Record<InstrumentId, InstrumentRule>>;
  visual: Partial<ToothVisualState>;
  /** Visual applied instead of `visual` when the chosen instrument is unsuitable. */
  focus?: StructureId[];
  camera?: CameraPreset;
}

export type ProcedureId = 'conservative-occlusal' | 'class-i' | 'class-ii' | 'selective-removal';

export interface Procedure extends ContentMeta {
  id: ProcedureId;
  name: string;
  summary: string;
  learningObjectives: string[];
  prerequisites: string[];
  indications: string[];
  safetyLimitations: string[];
  /** Lesion shown before treatment. */
  startingLesion: LesionVisual;
  steps: ProcedureStep[];
}

/* ------------------------------------------------------------------ */
/* Restorative materials                                               */
/* ------------------------------------------------------------------ */

export type AdhesiveProtocolId = 'etch-and-rinse' | 'self-etch' | 'selective-enamel-etch';

export interface AdhesiveProtocol extends ContentMeta {
  id: AdhesiveProtocolId;
  name: string;
  description: string;
  steps: string[];
}

export interface MaterialStep {
  id: string;
  title: string;
  description: string;
  rationale: string;
  visual: Partial<ToothVisualState>;
  /** Only shown for these preparations. */
  onlyFor?: ProcedureId[];
  /** Only shown for these adhesive protocols (composite). */
  onlyProtocols?: AdhesiveProtocolId[];
  camera?: CameraPreset;
}

export interface MaterialPreparationSupport {
  procedure: ProcedureId;
  supported: boolean;
  note: string;
}

export interface RestorativeMaterial extends ContentMeta {
  id: MaterialId;
  name: string;
  shortName: string;
  color: string;
  composition: string[];
  indications: string[];
  advantages: string[];
  limitations: string[];
  adhesion: string;
  moisture: string;
  placement: string;
  setting: string;
  clinicalConsiderations: string[];
  preparations: MaterialPreparationSupport[];
  defaultPreparation: ProcedureId;
  /** Comparison attributes on a 1–5 educational scale, or descriptive text. */
  comparison: Record<ComparisonKey, string>;
  workflow: MaterialStep[];
}

export type ComparisonKey =
  | 'bonding'
  | 'moistureTolerance'
  | 'fluorideRelease'
  | 'aesthetics'
  | 'wearResistance'
  | 'settingMechanism'
  | 'techniqueSensitivity'
  | 'typicalUse';

/* ------------------------------------------------------------------ */
/* Diagnosis / treatment planning                                      */
/* ------------------------------------------------------------------ */

export interface DiagnosisInput {
  activity: 'active' | 'inactive' | 'uncertain';
  cavitation: 'non-cavitated' | 'microcavity' | 'cavitated';
  depth: 'enamel' | 'outer-dentin' | 'middle-dentin' | 'deep-dentin';
  symptoms: 'none' | 'provoked-short' | 'spontaneous-lingering';
  pulp: 'responsive-normal' | 'reversible-signs' | 'irreversible-signs' | 'non-responsive';
  risk: 'low' | 'moderate' | 'high';
  restorability: 'restorable' | 'questionable' | 'non-restorable';
}

export type PathwayFit = 'consider' | 'may-consider' | 'generally-not-indicated' | 'refer';

export interface TreatmentPathway {
  id: string;
  title: string;
  fit: PathwayFit;
  reasoning: string[];
  refs: string[];
}

export interface DiagnosisResult {
  summary: string;
  pathways: TreatmentPathway[];
  alerts: string[];
  visual: Partial<ToothVisualState>;
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  id: string;
  topic: 'anatomy' | 'caries' | 'classification' | 'materials' | 'procedures';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  refs: string[];
}

export interface CaseQuestion {
  id: string;
  prompt: string;
  options: { text: string; appropriate: 'best' | 'acceptable' | 'not-appropriate'; feedback: string }[];
}

export interface ClinicalCase extends ContentMeta {
  id: string;
  title: string;
  patient: string;
  history: string[];
  findings: string[];
  visual: Partial<ToothVisualState>;
  questions: CaseQuestion[];
  takeaway: string;
}

export interface TimelineStep {
  id: string;
  title: string;
}
