import type { DiagnosisInput, IcdasScore, VerificationStatus } from '../../types';

/**
 * Caries Quest: case-based practice in caries detection, management and justification.
 *
 * Detection uses the ICDAS codes in `cariesStages.ts`; management is graded by the decision
 * pathway in `modules/diagnosis/decisionEngine.ts`. The vignettes, the options offered and the
 * justifications are new content and await qualified review.
 */

export const GAME_STATUS: VerificationStatus = 'draft_pending_review';

export const ICDAS_OPTIONS: IcdasScore[] = ['0', '1', '2', '3', '4', '5', '6'];

/** Management options, worded exactly as the decision pathway titles them. */
export type PathwayId =
  | 'prevent'
  | 'seal-sound'
  | 'non-restorable'
  | 'endo'
  | 'non-operative'
  | 'monitor'
  | 'seal'
  | 'infiltration'
  | 'remin'
  | 'sdf'
  | 'hall'
  | 'selective'
  | 'stepwise'
  | 'non-selective'
  | 'restore'
  | 'ncc';

export const PATHWAY_TITLES: Record<PathwayId, string> = {
  prevent: 'Risk-based prevention and recall',
  'seal-sound': 'Preventive fissure sealant on a sound surface',
  'non-restorable': 'Discuss extraction or specialist opinion',
  endo: 'Endodontic assessment and pulp-directed treatment',
  'non-operative': 'Non-operative caries control (biofilm, diet, fluoride)',
  monitor: 'Monitor (arrested lesion)',
  seal: 'Pit-and-fissure sealant / sealing the lesion',
  infiltration: 'Resin infiltration or sealing of the proximal lesion',
  remin: 'Remineralisation strategies',
  sdf: 'Silver diamine fluoride (lesion arrest)',
  hall: 'Hall technique (preformed metal crown, no caries removal)',
  selective: 'Selective removal to soft dentin + sealed restoration',
  stepwise: 'Stepwise removal',
  'non-selective': 'Non-selective (complete) removal to hard dentin',
  restore: 'Restoration with selective removal to firm dentin',
  ncc: 'Non-restorative cavity control',
};

export interface Justification {
  options: [string, string, string, string];
  correct: number;
  explanation: string;
}

export interface QuestCase {
  id: string;
  title: string;
  /** Which required scenario type the case teaches. */
  scenario: string;
  patient: string;
  findings: string[];
  /** Drives the 3D lesion, the keyed ICDAS code and the grading of the management step. */
  input: DiagnosisInput;
  /** Why this ICDAS code: shown after the detection answer. */
  detectionNote: string;
  /** The keyed best answer and three other options shown at the management step. */
  keyed: PathwayId;
  others: [PathwayId, PathwayId, PathwayId];
  justify: Justification;
  verification: VerificationStatus;
}

const base = { verification: GAME_STATUS };
const permanent = { dentition: 'permanent', surface: 'occlusal', cleansability: 'non-cleansable', restorability: 'restorable' } as const;

/** Simulated, fictional cases. Not real patients. */
export const QUEST_CASES: QuestCase[] = [
  {
    ...base,
    id: 'q-chalky-fissure',
    scenario: 'Active non-cavitated enamel lesion',
    title: 'Chalky fissure, frequent soft drinks',
    patient: 'Fictional patient, 16 years. Several sugary drinks a day; brushes once daily.',
    findings: [
      'Clean lower first molar: white opacity along the central fissure, visible wet and dry and extending beyond the fissure.',
      'Surface intact, matt (no lustre) and rough when a ball-ended probe is moved gently across it; plaque in the fissure before cleaning.',
      'Bitewing radiograph: no radiolucency in dentin.',
    ],
    input: { ...permanent, icdas: '2', activity: 'active', cavitation: 'non-cavitated', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'high' },
    detectionNote: 'A distinct visual change in enamel, visible wet and dry, without breakdown, is ICDAS 2.',
    keyed: 'seal',
    others: ['restore', 'non-selective', 'monitor'],
    justify: {
      options: [
        'The lesion is active but the surface is intact: sealing blocks the biofilm and fluoride supports arrest, so no tissue needs removing.',
        'White lesions are always inactive, so the sealant is only for prevention.',
        'Dentin is involved, so a restoration will eventually be needed.',
        'Sealing replaces the need for diet and oral hygiene advice.',
      ],
      correct: 0,
      explanation:
        'Matt, rough enamel in a plaque-stagnation area means an active lesion. Without cavitation it can be arrested non- or micro-invasively, alongside risk-based prevention.',
    },
  },
  {
    ...base,
    id: 'q-arrested-brown',
    scenario: 'Inactive enamel lesion',
    title: 'Brown, shiny fissure in a low-risk adult',
    patient: 'Fictional patient, 48 years. Good oral hygiene, fluoride toothpaste twice daily, no new lesions in years.',
    findings: [
      'Brown discolouration in the fissure of an upper premolar, visible wet and dry.',
      'Surface hard, smooth and shiny on gentle probing; no plaque stagnation.',
      'Bitewing radiograph: no radiolucency.',
    ],
    input: { ...permanent, icdas: '2', activity: 'inactive', cavitation: 'non-cavitated', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'low' },
    detectionNote: 'A distinct visual change in enamel, visible wet and dry, without breakdown, is ICDAS 2. Severity says nothing about activity.',
    keyed: 'monitor',
    others: ['restore', 'selective', 'endo'],
    justify: {
      options: [
        'Brown means active caries, so it must be removed.',
        'Hard, shiny enamel without plaque in a low-risk patient indicates an arrested lesion; the colour alone does not decide activity.',
        'The lesion is inactive because it is visible when wet.',
        'Monitoring is chosen because sealants cannot be used in adults.',
      ],
      correct: 1,
      explanation:
        'Texture, lustre and plaque stagnation — not colour — show that this lesion is arrested. Record it and review at recall with standard prevention.',
    },
  },
  {
    ...base,
    id: 'q-microcavity',
    scenario: 'Localised enamel breakdown',
    title: 'Small break in an opaque fissure',
    patient: 'Fictional patient, 22 years. Moderate sugar intake; irregular dental attendance.',
    findings: [
      'Lower second molar: opaque, matt enamel around the central fissure with a small loss of surface integrity.',
      'No dentin visible in the break; no grey shadow beneath the enamel.',
      'Bitewing radiograph: radiolucency confined to enamel.',
    ],
    input: { ...permanent, icdas: '3', activity: 'active', cavitation: 'microcavity', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate' },
    detectionNote: 'Localised enamel breakdown without visible dentin or an underlying dentinal shadow is ICDAS 3.',
    keyed: 'seal',
    others: ['monitor', 'non-selective', 'endo'],
    justify: {
      options: [
        'Any break in enamel requires a conventional Class I preparation.',
        'The lesion is inactive, so only monitoring is needed.',
        'The micro-cavity is confined to enamel and active: sealing (or a minimally invasive restoration) controls it while preserving tooth structure.',
        'The pulp is at risk and must be assessed first.',
      ],
      correct: 2,
      explanation: 'An active ICDAS 3 lesion in enamel can be sealed; operative cutting would remove sound tissue unnecessarily.',
    },
  },
  {
    ...base,
    id: 'q-dentin-shadow',
    scenario: 'Dentinal shadow under intact enamel',
    title: 'Grey shadow under intact enamel',
    patient: 'Fictional patient, 27 years. Snacks between meals; no symptoms.',
    findings: [
      'Lower first molar: grey-blue shadow seen through apparently intact occlusal enamel.',
      'No cavity; plaque present in the fissure.',
      'Bitewing radiograph: radiolucency reaching the middle third of dentin.',
    ],
    input: { ...permanent, icdas: '4', activity: 'active', cavitation: 'non-cavitated', depth: 'middle-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate' },
    detectionNote: 'An underlying dentinal shadow, with or without enamel breakdown, is ICDAS 4. The radiograph, not ICDAS, gives the depth.',
    keyed: 'seal',
    others: ['restore', 'monitor', 'endo'],
    justify: {
      options: [
        'A shadow means the lesion is inactive.',
        'With the surface still intact, sealing the lesion and monitoring it radiographically is a tissue-preserving option; restoration can also be discussed.',
        'All dentin lesions must be excavated to hard dentin.',
        'ICDAS 4 always indicates pulp involvement.',
      ],
      correct: 1,
      explanation:
        'Sealing non-cavitated lesions extending into dentin has been described, with monitoring; activity, risk and the ability to monitor guide the choice between sealing and restoring.',
    },
  },
  {
    ...base,
    id: 'q-cleansable-cavity',
    scenario: 'Cavitated but cleansable lesion',
    title: 'Wide, open cavity with hard dentin',
    patient: 'Fictional patient, 63 years. Low caries risk; brushes twice daily with fluoride toothpaste.',
    findings: [
      'Lower molar: wide, saucer-shaped cavity with visible dentin on the buccal half of the occlusal surface, open to the toothbrush.',
      'Dentin floor is hard and shiny on gentle probing; no plaque; no food trapping.',
      'Radiograph: radiolucency in the outer third of dentin. No symptoms.',
    ],
    input: {
      ...permanent,
      icdas: '5',
      activity: 'inactive',
      cavitation: 'cavitated',
      depth: 'outer-dentin',
      symptoms: 'none',
      pulp: 'responsive-normal',
      risk: 'low',
      cleansability: 'cleansable',
    },
    detectionNote: 'A distinct cavity with visible dentin is ICDAS 5, whatever its activity.',
    keyed: 'ncc',
    others: ['restore', 'non-selective', 'endo'],
    justify: {
      options: [
        'Every cavity with visible dentin needs a restoration.',
        'The lesion is arrested and the patient can clean the cavity, so keeping it open and cleansable controls it; a restoration is optional (function, aesthetics).',
        'The dentin is hard, so the lesion has healed and needs no follow-up.',
        'Non-selective removal is needed to remove all stained dentin.',
      ],
      correct: 1,
      explanation:
        'Cleansability decides whether the patient can control the lesion. Hard, shiny dentin in an open cavity indicates arrest; review at recall.',
    },
  },
  {
    ...base,
    id: 'q-cavity-dentin',
    scenario: 'Cavitated, non-cleansable dentinal lesion',
    title: 'Food trapping in a cavity',
    patient: 'Fictional patient, 34 years. Notices food catching in a lower molar; no pain.',
    findings: [
      'Lower first molar: distinct occlusal cavity with dentin visible at its base; the opening is narrow and undermined.',
      'Soft, discoloured dentin; plaque-covered; the patient cannot clean it.',
      'Bitewing radiograph: radiolucency into the middle third of dentin. Sensibility test normal.',
    ],
    input: { ...permanent, icdas: '5', activity: 'active', cavitation: 'cavitated', depth: 'middle-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate' },
    detectionNote: 'A distinct cavity with visible dentin is ICDAS 5; it is not yet extensive.',
    keyed: 'restore',
    others: ['ncc', 'monitor', 'endo'],
    justify: {
      options: [
        'The cavity is active and cannot be cleaned by the patient, so a sealed restoration (with selective removal to firm dentin) restores cleansability and form.',
        'The lesion is arrested because the patient has no pain.',
        'Keeping the cavity open will arrest it because it already has a cavity.',
        'Non-selective removal of all dentin is safer for the pulp.',
      ],
      correct: 0,
      explanation: 'Non-cleansable, active cavities are usually restored; prevention continues alongside, because the restoration does not treat the disease.',
    },
  },
  {
    ...base,
    id: 'q-deep-vital',
    scenario: 'Deep caries, vital pulp, no signs of irreversible pulpitis',
    title: 'Deep lesion, brief pain with cold',
    patient: 'Fictional patient, 29 years. Brief sensitivity to cold that stops when the stimulus is removed.',
    findings: [
      'Lower first molar: extensive, deep occlusal cavity with dentin clearly visible.',
      'Cold test: short response that resolves at once; no spontaneous or lingering pain.',
      'Radiograph: radiolucency into the inner quarter of dentin; no periapical change.',
    ],
    input: { ...permanent, icdas: '6', activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'provoked-short', pulp: 'reversible-signs', risk: 'high' },
    detectionNote: 'An extensive cavity with visible dentin is ICDAS 6.',
    keyed: 'selective',
    others: ['non-selective', 'stepwise', 'seal'],
    justify: {
      options: [
        'Complete excavation to hard dentin is the default for deep lesions.',
        'The pulp is necrotic, so caries removal is pointless.',
        'Leaving soft dentin over a vital pulp reduces the risk of exposure, while hard peripheral dentin allows a well-sealed restoration that deprives residual bacteria of substrate.',
        'Soft dentin left behind will always progress, so this is a temporary measure.',
      ],
      correct: 2,
      explanation:
        'Consensus statements favour selective removal to soft dentin for deep lesions in vital teeth without signs of irreversible pulpitis; the seal is central to success.',
    },
  },
  {
    ...base,
    id: 'q-lingering-pain',
    scenario: 'Signs of irreversible pulpitis',
    title: 'Deep cavity with night pain',
    patient: 'Fictional patient, 41 years. Throbbing pain that wakes them at night and lingers after hot drinks.',
    findings: [
      'Lower second molar: extensive cavity with dentin clearly visible.',
      'Heat provokes pain lasting minutes after the stimulus is removed.',
      'Radiograph: radiolucency approaching the pulp.',
    ],
    input: { ...permanent, icdas: '6', activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'spontaneous-lingering', pulp: 'irreversible-signs', risk: 'high' },
    detectionNote: 'An extensive cavity with visible dentin is ICDAS 6. The symptoms concern the pulp, not the ICDAS code.',
    keyed: 'endo',
    others: ['selective', 'seal', 'monitor'],
    justify: {
      options: [
        'Selective removal will let the pulp recover whatever the symptoms.',
        'Spontaneous and lingering pain suggests irreversible pulpitis, so management moves to pulp-directed treatment (or extraction) after a full endodontic assessment.',
        'The pain proves the pulp is necrotic.',
        'A sealant will relieve the pain by covering the cavity.',
      ],
      correct: 1,
      explanation: 'Symptoms suggesting irreversible pulpitis take the case beyond caries control; the diagnosis needs history, sensibility tests and radiographs.',
    },
  },
  {
    ...base,
    id: 'q-non-restorable',
    scenario: 'Non-restorable tooth',
    title: 'Little tooth structure left',
    patient: 'Fictional patient, 55 years. Broken-down molar; no pain.',
    findings: [
      'Lower molar: extensive cavity with most of the crown lost; dentin clearly visible.',
      'Remaining walls are thin and undermined; caries extends below the gingival margin.',
      'Assessed as non-restorable.',
    ],
    input: { ...permanent, icdas: '6', activity: 'active', cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'none', pulp: 'responsive-normal', risk: 'moderate', restorability: 'non-restorable' },
    detectionNote: 'Obvious, extensive loss of tooth structure with dentin visible is ICDAS 6.',
    keyed: 'non-restorable',
    others: ['restore', 'seal', 'selective'],
    justify: {
      options: [
        'Any tooth can be restored with enough material.',
        'Without enough sound tissue for a sealed restoration, caries-control options that depend on a restoration are not viable; discuss extraction or a specialist opinion and the consequences.',
        'The absence of pain means the tooth can be left as it is.',
        'Selective removal will make the tooth restorable.',
      ],
      correct: 1,
      explanation: 'Restorability is a gate in the pathway: the options and their consequences (space, replacement) are discussed with the patient.',
    },
  },
  {
    ...base,
    id: 'q-primary-molar',
    scenario: 'Primary molar with a cavitated dentin lesion',
    title: 'Five-year-old with a cavity in a primary molar',
    patient: 'Fictional patient, 5 years. Frequent sweet snacks; no history of pain or swelling.',
    findings: [
      'Lower primary second molar: distinct occlusal cavity with dentin visible; plaque-covered, not cleansable.',
      'No pain, sinus or mobility. Radiograph: radiolucency into the middle third of dentin; no furcation or periapical change.',
      'The child is anxious about injections.',
    ],
    input: {
      ...permanent,
      dentition: 'primary',
      icdas: '5',
      activity: 'active',
      cavitation: 'cavitated',
      depth: 'middle-dentin',
      symptoms: 'none',
      pulp: 'responsive-normal',
      risk: 'high',
    },
    detectionNote: 'A distinct cavity with visible dentin is ICDAS 5, in primary as in permanent teeth.',
    keyed: 'hall',
    others: ['non-selective', 'endo', 'monitor'],
    justify: {
      options: [
        'Primary teeth will exfoliate, so caries in them can be ignored.',
        'Sealing the lesion under a preformed metal crown, without caries removal or anaesthesia, arrests it and suits an anxious child; prevention for the child and family continues.',
        'The pulp must be removed because primary pulps are large.',
        'Complete caries removal is essential in primary teeth because enamel is thin.',
      ],
      correct: 1,
      explanation:
        'For carious primary molars without signs of pulp involvement, the Hall technique seals the lesion; silver diamine fluoride or a restoration are other options discussed with the family.',
    },
  },
  {
    ...base,
    id: 'q-proximal-enamel',
    scenario: 'Active non-cavitated proximal lesion',
    title: 'Proximal lesion on a bitewing',
    patient: 'Fictional patient, 15 years. High caries risk; several new lesions in a year.',
    findings: [
      'After temporary separation: white, matt opacity on the mesial surface of the upper first molar; surface intact.',
      'Plaque stagnates below the contact point; gingival papilla bleeds on probing.',
      'Bitewing radiograph: radiolucency confined to enamel.',
    ],
    input: { ...permanent, surface: 'proximal', icdas: '2', activity: 'active', cavitation: 'non-cavitated', depth: 'enamel', symptoms: 'none', pulp: 'responsive-normal', risk: 'high' },
    detectionNote: 'A distinct visual change in enamel, visible wet and dry, without breakdown, is ICDAS 2.',
    keyed: 'infiltration',
    others: ['restore', 'monitor', 'endo'],
    justify: {
      options: [
        'A radiolucency means a cavity, so a Class II restoration is needed.',
        'The lesion is active but non-cavitated and confined to enamel: micro-invasive treatment arrests it without cutting the marginal ridge.',
        'The lesion is inactive because it is between the teeth.',
        'Proximal lesions cannot be managed until they cavitate.',
      ],
      correct: 1,
      explanation:
        'Micro-invasive treatment (resin infiltration or sealing) can arrest non-cavitated proximal lesions in enamel or the outer third of dentin, together with intensive prevention.',
    },
  },
];

export const QUEST_CASE_BY_ID: Record<string, QuestCase> = Object.fromEntries(QUEST_CASES.map((c) => [c.id, c]));

/** Score thresholds (% of the maximum) and the rank shown at the end. */
export const QUEST_RANKS: { min: number; title: string; message: string }[] = [
  { min: 90, title: 'Cariology Ace', message: 'Excellent detection, decisions and reasoning. Try to keep the streak going next time.' },
  { min: 70, title: 'Confident Clinician', message: 'Solid reasoning. Review the cases you missed to sharpen the edge.' },
  { min: 50, title: 'Caries Detective', message: 'Good start. Revisit Lesion classification and the Caries decision pathway, then play again.' },
  { min: 0, title: 'Dental Explorer', message: 'Every expert started here. Work through the caries modules and try again.' },
];
