import type { DiagnosisInput, VerificationStatus } from '../../types';

/**
 * Caries Quest: a short game on caries detection and management.
 *
 * Only the case vignettes are new content. Detection answers use the ICDAS codes in
 * `cariesStages.ts`, and management answers are graded by the decision pathway in
 * `modules/diagnosis/decisionEngine.ts` — both already reviewed. The vignettes and the
 * choice of keyed answers await qualified review.
 */

export const GAME_STATUS: VerificationStatus = 'draft_pending_review';

/** ICDAS bands offered at the detection step (codes 1 and 2 grouped, as in the classification module). */
export type IcdasBand = '1–2' | '3' | '4' | '5' | '6';
export const ICDAS_BANDS: { band: IcdasBand; label: string }[] = [
  { band: '1–2', label: 'ICDAS 1–2 · Visual change in enamel' },
  { band: '3', label: 'ICDAS 3 · Localised enamel breakdown' },
  { band: '4', label: 'ICDAS 4 · Underlying dark shadow from dentin' },
  { band: '5', label: 'ICDAS 5 · Distinct cavity with visible dentin' },
  { band: '6', label: 'ICDAS 6 · Extensive cavity with visible dentin' },
];

/** Management options, worded exactly as the decision pathway titles them. */
export type PathwayId =
  | 'non-restorable'
  | 'endo'
  | 'non-operative'
  | 'monitor'
  | 'seal'
  | 'remin'
  | 'selective'
  | 'stepwise'
  | 'non-selective'
  | 'restore'
  | 'ncc';

export const PATHWAY_TITLES: Record<PathwayId, string> = {
  'non-restorable': 'Discuss extraction or specialist opinion',
  endo: 'Endodontic assessment and pulp-directed treatment',
  'non-operative': 'Non-operative caries control (biofilm, diet, fluoride)',
  monitor: 'Monitor (arrested lesion)',
  seal: 'Pit-and-fissure sealant / sealing the lesion',
  remin: 'Remineralisation strategies',
  selective: 'Selective removal to soft dentin + sealed restoration',
  stepwise: 'Stepwise removal',
  'non-selective': 'Non-selective (complete) removal to hard dentin',
  restore: 'Restoration with selective removal to firm dentin',
  ncc: 'Non-restorative cavity control',
};

export interface QuestCase {
  id: string;
  title: string;
  patient: string;
  findings: string[];
  /** Drives the 3D lesion and the grading of the management step. */
  input: DiagnosisInput;
  icdas: IcdasBand;
  /** Why this ICDAS band: shown after the detection answer. */
  detectionNote: string;
  /** The keyed best answer and three other options shown at the management step. */
  keyed: PathwayId;
  others: [PathwayId, PathwayId, PathwayId];
  verification: VerificationStatus;
}

const base = { verification: GAME_STATUS };

/** Simulated, fictional cases. Not real patients. */
export const QUEST_CASES: QuestCase[] = [
  {
    ...base,
    id: 'q-chalky-fissure',
    title: 'Chalky fissure, frequent soft drinks',
    patient: 'Fictional patient, 16 years. Several sugary drinks a day; brushes once daily.',
    findings: [
      'Clean, dried lower first molar: chalky white opacity along the central fissure, visible even when wet and extending beyond the fissure.',
      'Surface intact; matt and rough on gentle tactile examination; plaque in the fissure before cleaning.',
      'Bitewing radiograph: no radiolucency in dentin.',
    ],
    input: { activity: 'active', cavitation: 'non-cavitated', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'high', restorability: 'restorable' },
    icdas: '1–2',
    detectionNote: 'A visual change in enamel without breakdown. Visible when wet and beyond the fissure points to code 2; codes 1–2 are grouped here.',
    keyed: 'seal',
    others: ['restore', 'non-selective', 'monitor'],
  },
  {
    ...base,
    id: 'q-arrested-brown',
    title: 'Brown, shiny fissure in a low-risk adult',
    patient: 'Fictional patient, 48 years. Good oral hygiene, fluoride toothpaste twice daily, no new lesions in years.',
    findings: [
      'Brown discolouration confined to the fissure of an upper premolar, visible when wet.',
      'Surface hard, smooth and shiny; no plaque stagnation.',
      'Bitewing radiograph: no radiolucency.',
    ],
    input: { activity: 'inactive', cavitation: 'non-cavitated', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'low', restorability: 'restorable' },
    icdas: '1–2',
    detectionNote: 'Discolouration in enamel without breakdown. Hard, shiny surface without plaque suggests an arrested lesion.',
    keyed: 'monitor',
    others: ['restore', 'selective', 'endo'],
  },
  {
    ...base,
    id: 'q-microcavity',
    title: 'Small break in an opaque fissure',
    patient: 'Fictional patient, 22 years. Moderate sugar intake; irregular dental attendance.',
    findings: [
      'Lower second molar: opaque, discoloured enamel around the central fissure with a small loss of surface integrity.',
      'No dentin visible in the break; no grey shadow beneath the enamel.',
      'Bitewing radiograph: radiolucency confined to enamel.',
    ],
    input: { activity: 'active', cavitation: 'microcavity', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate', restorability: 'restorable' },
    icdas: '3',
    detectionNote: 'Localised enamel breakdown with no visible dentin and no underlying shadow is ICDAS 3.',
    keyed: 'seal',
    others: ['monitor', 'non-selective', 'endo'],
  },
  {
    ...base,
    id: 'q-dentin-shadow',
    title: 'Grey shadow under intact enamel',
    patient: 'Fictional patient, 27 years. Snacks between meals; no symptoms.',
    findings: [
      'Lower first molar: grey-blue shadow seen through apparently intact occlusal enamel.',
      'No cavity; plaque present in the fissure.',
      'Bitewing radiograph: radiolucency reaching the middle third of dentin.',
    ],
    input: { activity: 'active', cavitation: 'non-cavitated', depth: 'middle-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate', restorability: 'restorable' },
    icdas: '4',
    detectionNote: 'A dark shadow of discoloured dentin seen through apparently intact enamel is ICDAS 4. The radiograph, not ICDAS, gives the depth.',
    keyed: 'seal',
    others: ['restore', 'monitor', 'endo'],
  },
  {
    ...base,
    id: 'q-cavity-dentin',
    title: 'Food trapping in a cavity',
    patient: 'Fictional patient, 34 years. Notices food catching in a lower molar; no pain.',
    findings: [
      'Lower first molar: distinct occlusal cavity with dentin visible at its base.',
      'Soft, discoloured dentin; plaque-covered.',
      'Bitewing radiograph: radiolucency into the middle third of dentin. Sensibility test normal.',
    ],
    input: { activity: 'active', cavitation: 'cavitated', depth: 'middle-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate', restorability: 'restorable' },
    icdas: '5',
    detectionNote: 'A distinct cavity exposing dentin is ICDAS 5; the cavity is not yet extensive.',
    keyed: 'restore',
    others: ['seal', 'monitor', 'endo'],
  },
  {
    ...base,
    id: 'q-deep-vital',
    title: 'Deep lesion, brief pain with cold',
    patient: 'Fictional patient, 29 years. Brief sensitivity to cold that stops when the stimulus is removed.',
    findings: [
      'Lower first molar: extensive, deep occlusal cavity with dentin clearly visible.',
      'Cold test: short response that resolves at once; no spontaneous pain.',
      'Bitewing radiograph: radiolucency into the inner quarter of dentin; no periapical change.',
    ],
    input: { activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'provoked-short', pulp: 'reversible-signs', risk: 'high', restorability: 'restorable' },
    icdas: '6',
    detectionNote: 'An extensive, deep cavity with clearly visible dentin is ICDAS 6.',
    keyed: 'selective',
    others: ['non-selective', 'stepwise', 'seal'],
  },
  {
    ...base,
    id: 'q-lingering-pain',
    title: 'Deep cavity with night pain',
    patient: 'Fictional patient, 41 years. Throbbing pain that wakes them at night and lingers after hot drinks.',
    findings: [
      'Lower second molar: extensive cavity with dentin clearly visible.',
      'Heat provokes pain lasting minutes after the stimulus is removed.',
      'Radiograph: radiolucency approaching the pulp.',
    ],
    input: { activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'spontaneous-lingering', pulp: 'irreversible-signs', risk: 'high', restorability: 'restorable' },
    icdas: '6',
    detectionNote: 'An extensive cavity with clearly visible dentin is ICDAS 6. The symptoms concern the pulp, not the ICDAS code.',
    keyed: 'endo',
    others: ['selective', 'seal', 'monitor'],
  },
  {
    ...base,
    id: 'q-non-restorable',
    title: 'Little tooth structure left',
    patient: 'Fictional patient, 55 years. Broken-down molar; no pain.',
    findings: [
      'Lower molar: extensive cavity with most of the crown lost; dentin clearly visible.',
      'Remaining walls are thin and undermined; caries extends below the gingival margin.',
      'Assessed as non-restorable.',
    ],
    input: { activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate', restorability: 'non-restorable' },
    icdas: '6',
    detectionNote: 'Obvious, extensive loss of tooth structure with dentin clearly visible is ICDAS 6.',
    keyed: 'non-restorable',
    others: ['restore', 'seal', 'selective'],
  },
];

export const QUEST_CASE_BY_ID: Record<string, QuestCase> = Object.fromEntries(QUEST_CASES.map((c) => [c.id, c]));

/** Score thresholds (% of the maximum) and the rank shown at the end. */
export const QUEST_RANKS: { min: number; title: string; message: string }[] = [
  { min: 90, title: 'Cariology Ace', message: 'Excellent detection and decision-making. Try to keep the streak going next time.' },
  { min: 70, title: 'Confident Clinician', message: 'Solid reasoning. Review the cases you missed to sharpen the edge.' },
  { min: 50, title: 'Caries Detective', message: 'Good start. Revisit Lesion classification and Diagnosis, then play again.' },
  { min: 0, title: 'Dental Explorer', message: 'Every expert started here. Work through the caries modules and try again.' },
];
