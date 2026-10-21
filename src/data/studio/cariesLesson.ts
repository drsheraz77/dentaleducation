import type { LesionVisual, StructureId, VerificationStatus } from '../../types';

/**
 * Caries Learning Studio — lesson content, kept separate from rendering.
 * Every item is `draft_pending_review` until a qualified reviewer signs it off
 * (see CLINICAL_REVIEW_CHECKLIST.md). Lesion volumes are educational schematics
 * placed on a CBCT-derived tooth; they are not measured from a carious tooth and
 * the sequence is not a time-calibrated model of progression.
 */

export const STUDIO_STATUS: VerificationStatus = 'draft_pending_review';

export type StudioCamera = 'external' | 'occlusal' | 'crownSection' | 'section';

export interface LessonStage {
  id: 'sound' | 'early' | 'dentin' | 'cavitated' | 'compare' | 'check';
  kind: 'model' | 'compare' | 'check';
  title: string;
  shortTitle: string;
  objective: string;
  whatYouSee: string[];
  explanation: string;
  /** Features that come from the underlying CBCT-derived model. */
  modelBased: string[];
  /** Features drawn on top as educational schematics. */
  illustrative: string[];
  /** Which clinical reasoning steps the stage touches (see CLINICAL_CONCEPTS). */
  concepts: ClinicalConceptId[];
  lesion: LesionVisual | null;
  /** Default view when the stage opens (the learner can change it). */
  section: boolean;
  camera: StudioCamera;
  focus: StructureId[];
  refs: string[];
  verification: VerificationStatus;
}

const lesion = (l: Partial<LesionVisual>): LesionVisual => ({
  site: 'occlusal',
  enamelDepth: 0,
  dentinDepth: 0,
  surfaceTone: 'none',
  surfaceIntensity: 0,
  cavitation: 0,
  pulpInflammation: 0,
  ...l,
});

export const LESION_BY_STAGE = {
  early: lesion({ enamelDepth: 0.5, surfaceTone: 'white', surfaceIntensity: 0.75 }),
  dentin: lesion({ enamelDepth: 1, dentinDepth: 0.4, surfaceTone: 'brown', surfaceIntensity: 0.8 }),
  cavitated: lesion({ enamelDepth: 1, dentinDepth: 0.8, surfaceTone: 'brown', surfaceIntensity: 1, cavitation: 0.55 }),
} as const;

const SCAN_TOOTH = 'Crown and root shape, pulp chamber and canals of a real mandibular second molar (CBCT-derived)';

export const LESSON_STAGES: LessonStage[] = [
  {
    id: 'sound',
    kind: 'model',
    title: 'Sound tooth',
    shortTitle: 'Sound',
    objective: 'Identify the external morphology and the internal tissues of a sound mandibular molar.',
    whatYouSee: [
      'Occlusal surface with cusps, fossae and fissures — the sites where pit-and-fissure caries usually starts.',
      'In section: enamel over the crown, dentin forming the bulk of the tooth, and the pulp chamber continuing into the root canals.',
    ],
    explanation:
      'Rotate the tooth to inspect the occlusal anatomy, then open the cross-section. Pulp horns project towards the cusps; enamel is thickest over the cusps and thins towards the cervical margin.',
    modelBased: [SCAN_TOOTH, 'Enamel extent (thickness from the literature)'],
    illustrative: [],
    concepts: [],
    lesion: null,
    section: false,
    camera: 'external',
    focus: ['enamel', 'dentin', 'pulp'],
    refs: ['nelson2020', 'nanci2018'],
    verification: STUDIO_STATUS,
  },
  {
    id: 'early',
    kind: 'model',
    title: 'Early (non-cavitated) enamel lesion',
    shortTitle: 'Early lesion',
    objective: 'Describe where an early fissure lesion forms and why the surface stays intact.',
    whatYouSee: [
      'A chalky, white zone along the central fissure on the outside.',
      'In section: a subsurface zone of mineral loss in the enamel beneath a relatively intact surface layer.',
    ],
    explanation:
      'Net mineral loss under a cariogenic biofilm produces a subsurface lesion. With the surface still intact, the lesion can be arrested or partly remineralised by controlling the biofilm and using fluoride.',
    modelBased: [SCAN_TOOTH],
    illustrative: ['White-spot tint on the occlusal surface', 'Subsurface enamel lesion volume'],
    concepts: ['detection', 'activity'],
    lesion: LESION_BY_STAGE.early,
    section: false,
    camera: 'occlusal',
    focus: ['lesion', 'enamel'],
    refs: ['fejerskov2015', 'featherstone2004', 'nyvad1999'],
    verification: STUDIO_STATUS,
  },
  {
    id: 'dentin',
    kind: 'model',
    title: 'Deeper lesion reaching dentin',
    shortTitle: 'Into dentin',
    objective: 'Relate the enamel lesion to the dentin beneath it and to the pulp.',
    whatYouSee: [
      'The enamel lesion reaches the dentino-enamel junction.',
      'The dentin lesion spreads along the junction and extends towards the pulp, with an outer, more affected zone and an inner zone.',
    ],
    explanation:
      'Once the lesion reaches dentin it can spread laterally and undermine the enamel. The dentin–pulp complex responds early, so the pulp may react before bacteria reach it. Here the surface is still shown intact.',
    modelBased: [SCAN_TOOTH, 'Real distance from the occlusal fissure to the pulp roof of this tooth'],
    illustrative: ['Brown surface staining', 'Enamel and dentin lesion volumes (two shades)'],
    concepts: ['detection', 'classification'],
    lesion: LESION_BY_STAGE.dentin,
    section: true,
    camera: 'crownSection',
    focus: ['lesion', 'dentin'],
    refs: ['fejerskov2015', 'innes2016', 'nanci2018'],
    verification: STUDIO_STATUS,
  },
  {
    id: 'cavitated',
    kind: 'model',
    title: 'Advanced cavitated lesion',
    shortTitle: 'Cavitated',
    objective: 'Recognise loss of tooth structure and the lesion\'s relationship to the pulp.',
    whatYouSee: [
      'Enamel has broken down over the lesion, opening a cavity into dentin.',
      'In section: a deep dentin lesion approaching the pulp chamber.',
    ],
    explanation:
      'A cavity into dentin makes biofilm removal by the patient difficult, which changes the management options. Pulp status must be assessed clinically (history, sensibility testing, radiographs); it cannot be read from a model.',
    modelBased: [SCAN_TOOTH],
    illustrative: ['Cavity (tooth structure removed from the scanned surfaces)', 'Deep dentin lesion volumes'],
    concepts: ['detection', 'classification', 'diagnosis', 'management'],
    lesion: LESION_BY_STAGE.cavitated,
    section: true,
    camera: 'crownSection',
    focus: ['lesion', 'pulp'],
    refs: ['schwendicke2016', 'ese2019', 'innes2016'],
    verification: STUDIO_STATUS,
  },
  {
    id: 'compare',
    kind: 'compare',
    title: 'Cross-sectional comparison',
    shortTitle: 'Compare',
    objective: 'Compare lesion depth and surface integrity between stages side by side.',
    whatYouSee: ['The selected stages cut through the same plane of the same tooth, so only the lesion differs.'],
    explanation:
      'Compare where the lesion is (enamel only, dentin, close to the pulp) and whether the surface is intact. Choose which stages to compare above the model.',
    modelBased: [SCAN_TOOTH],
    illustrative: ['All lesion volumes and the cavity'],
    concepts: ['classification'],
    lesion: null,
    section: true,
    camera: 'section',
    focus: ['lesion'],
    refs: ['fejerskov2015', 'ismail2007'],
    verification: STUDIO_STATUS,
  },
  {
    id: 'check',
    kind: 'check',
    title: 'Knowledge check',
    shortTitle: 'Check',
    objective: 'Identify the displayed features and explain your reasoning.',
    whatYouSee: ['The advanced lesion in section with lettered markers instead of labels.'],
    explanation: 'Answer the questions in the panel. Each answer explains the reasoning; the score is formative only.',
    modelBased: [SCAN_TOOTH],
    illustrative: ['Lesion volumes and cavity', 'Lettered markers'],
    concepts: ['detection', 'classification', 'activity', 'risk', 'diagnosis', 'management'],
    lesion: LESION_BY_STAGE.cavitated,
    section: true,
    camera: 'crownSection',
    focus: [],
    refs: ['schwendicke2016', 'ese2019', 'ismail2007', 'nyvad1999'],
    verification: STUDIO_STATUS,
  },
];

export const COMPARABLE_STAGES = ['sound', 'early', 'dentin', 'cavitated'] as const;
export type ComparableStage = (typeof COMPARABLE_STAGES)[number];
export const DEFAULT_COMPARE: ComparableStage[] = ['early', 'dentin', 'cavitated'];

/* ------------------------------------------------------------------ */
/* Clinical reasoning vocabulary                                       */
/* ------------------------------------------------------------------ */

export type ClinicalConceptId = 'detection' | 'classification' | 'activity' | 'risk' | 'diagnosis' | 'management';

export const CLINICAL_CONCEPTS: { id: ClinicalConceptId; term: string; meaning: string }[] = [
  { id: 'detection', term: 'Lesion detection', meaning: 'Finding that a lesion is present (visual–tactile examination, radiographs, adjuncts).' },
  { id: 'classification', term: 'Classification / staging', meaning: 'Describing severity, e.g. ICDAS codes or radiographic depth.' },
  { id: 'activity', term: 'Activity assessment', meaning: 'Judging whether a lesion is progressing or arrested (e.g. Nyvad criteria: appearance, texture, plaque stagnation).' },
  { id: 'risk', term: 'Caries risk assessment', meaning: 'A patient-level judgement of the likelihood of new lesions or progression.' },
  { id: 'diagnosis', term: 'Diagnosis', meaning: 'The clinician\'s synthesis of all findings, including pulp status, for this patient.' },
  { id: 'management', term: 'Management decision', meaning: 'Choosing non-operative and/or operative care with the patient, based on the diagnosis.' },
];

/* ------------------------------------------------------------------ */
/* Knowledge check                                                     */
/* ------------------------------------------------------------------ */

export type MarkerId = 'A' | 'B' | 'C';

export interface StudioQuestion {
  id: string;
  prompt: string;
  /** Marker drawn on the model for this question. */
  marker?: MarkerId;
  options: string[];
  correctIndex: number;
  explanation: string;
  refs: string[];
}

export const KNOWLEDGE_CHECK: StudioQuestion[] = [
  {
    id: 'kc-tissue',
    prompt: 'Marker A sits in the darker zone below the cavity. Which tissue is it in?',
    marker: 'A',
    options: ['Enamel', 'Dentin', 'Pulp', 'Cementum'],
    correctIndex: 1,
    explanation:
      'Marker A is in dentin, inside the lesion\'s outer, more affected zone. The scanned tooth gives the tissue boundaries; the lesion zone itself is a schematic overlay.',
    refs: ['fejerskov2015'],
  },
  {
    id: 'kc-cavitation',
    prompt: 'Marker B marks the break in the occlusal surface. What does it show?',
    marker: 'B',
    options: [
      'Cavitation: loss of surface integrity opening into dentin',
      'A normal occlusal fissure',
      'Surface staining without tissue loss',
      'The margin of a restoration',
    ],
    correctIndex: 0,
    explanation:
      'The surface has broken down over the lesion. Clinically, cavitation is judged by careful visual examination of a clean, dry tooth (and radiographs for depth), not by forceful probing.',
    refs: ['innes2016', 'ismail2007'],
  },
  {
    id: 'kc-pulp',
    prompt: 'Marker C is in the pulp chamber, just under its roof below the lesion. Why does the lesion\'s closeness to the pulp matter?',
    marker: 'C',
    options: [
      'Pulp status must be assessed (history, sensibility tests, radiographs) before choosing management',
      'It proves the pulp is necrotic',
      'Distance to the pulp does not influence management',
      'All carious dentin must always be removed regardless of pulp status',
    ],
    correctIndex: 0,
    explanation:
      'A deep lesion raises the risk of pulp exposure and pulpal inflammation, but pulp status is a clinical diagnosis. For vital pulps without signs of irreversible pulpitis, consensus favours selective removal to soft dentin over non-selective removal.',
    refs: ['ese2019', 'schwendicke2016'],
  },
  {
    id: 'kc-early',
    prompt: 'Which statement about the early enamel lesion (stage 2) is accurate?',
    options: [
      'Mineral is lost beneath an intact surface, so the lesion may arrest or remineralise',
      'It always progresses to cavitation',
      'It has already reached the pulp',
      'It must be drilled out to stop it',
    ],
    correctIndex: 0,
    explanation:
      'Demineralisation is not cavitation. With biofilm control and fluoride, non-cavitated lesions can arrest; operative treatment is generally not the first choice.',
    refs: ['fejerskov2015', 'featherstone2004'],
  },
  {
    id: 'kc-concepts',
    prompt: 'Assigning an ICDAS code to a lesion is an example of…',
    options: ['Classification', 'Caries risk assessment', 'Activity assessment', 'A management decision'],
    correctIndex: 0,
    explanation:
      'ICDAS codes describe lesion severity (classification). Activity, patient risk, diagnosis and management are separate judgements that build on it.',
    refs: ['ismail2007', 'nyvad1999'],
  },
];

export function studioScore(answers: Record<string, number>): { correct: number; answered: number; total: number } {
  let correct = 0;
  let answered = 0;
  for (const q of KNOWLEDGE_CHECK) {
    if (!(q.id in answers)) continue;
    answered++;
    if (answers[q.id] === q.correctIndex) correct++;
  }
  return { correct, answered, total: KNOWLEDGE_CHECK.length };
}
