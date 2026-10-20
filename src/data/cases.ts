import type { ClinicalCase, LesionVisual } from '../types';

const DRAFT = 'draft-needs-expert-review' as const;
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

/** Simulated, fictional teaching cases. Not real patients. */
export const CASES: ClinicalCase[] = [
  {
    id: 'case-white-spot',
    title: 'Chalky fissure in a 14-year-old',
    patient: 'Fictional patient, 14 years, frequent sugary drinks, irregular brushing.',
    history: ['No pain', 'Visible plaque in fissures of lower molars', 'Fluoride toothpaste used occasionally'],
    findings: [
      'After cleaning and air drying: chalky white opacity along the central fissure of the lower first molar',
      'Surface feels rough on gentle probing; no break in the surface',
      'Bitewing radiograph: no radiolucency in dentin',
    ],
    visual: { biofilm: 0.5, lesion: lesion({ enamelDepth: 0.45, surfaceTone: 'white', surfaceIntensity: 0.75 }) },
    questions: [
      {
        id: 'interpret',
        prompt: 'How would you interpret this lesion?',
        options: [
          { text: 'Active, non-cavitated enamel lesion', appropriate: 'best', feedback: 'Chalky, rough and plaque-covered with an intact surface suggests activity without cavitation.' },
          { text: 'Inactive (arrested) lesion', appropriate: 'not-appropriate', feedback: 'Arrested lesions tend to be shiny and smooth; here the surface is chalky and rough.' },
          { text: 'Cavitated dentin lesion', appropriate: 'not-appropriate', feedback: 'There is no surface breakdown and no dentin involvement radiographically.' },
        ],
      },
      {
        id: 'manage',
        prompt: 'Which management options are appropriate? (choose the best fit)',
        options: [
          { text: 'Non-operative care: biofilm control, diet advice, fluoride; consider a sealant given high risk', appropriate: 'best', feedback: 'Targets the cause and the lesion; sealing is a reasonable option for active non-cavitated fissure lesions in higher-risk patients.' },
          { text: 'Monitor only, without preventive measures', appropriate: 'acceptable', feedback: 'Monitoring is part of care, but with an active lesion and high-risk behaviours, active preventive measures are expected.' },
          { text: 'Class I preparation and composite restoration', appropriate: 'not-appropriate', feedback: 'Operative removal of a non-cavitated enamel lesion sacrifices sound tissue and is generally not indicated.' },
        ],
      },
    ],
    takeaway: 'Demineralisation is not cavitation: non-cavitated active lesions are usually managed non-operatively, with sealing as an option.',
    refs: ['fejerskov2015', 'nyvad1999', 'wright2016', 'slayton2018'],
    verification: DRAFT,
  },
  {
    id: 'case-cavitated',
    title: 'Cavity with food packing',
    patient: 'Fictional patient, 32 years, moderate caries risk.',
    history: ['Food packs in the tooth', 'Brief sensitivity to cold that stops when the stimulus is removed'],
    findings: [
      'Cavitation in the occlusal fissure exposing dentin',
      'Radiograph: radiolucency in the outer half of dentin',
      'Tooth responds normally to cold testing',
    ],
    visual: { biofilm: 0.6, lesion: lesion({ enamelDepth: 1, dentinDepth: 0.4, surfaceTone: 'brown', surfaceIntensity: 0.85, cavitation: 0.4 }) },
    questions: [
      {
        id: 'interpret',
        prompt: 'How would you interpret this lesion?',
        options: [
          { text: 'Cavitated dentin lesion (ICDAS 5-like), pulp likely normal or reversibly affected', appropriate: 'best', feedback: 'Visible dentin and short, provoked sensitivity are consistent with this interpretation (clinical judgement required).' },
          { text: 'Irreversible pulpitis', appropriate: 'not-appropriate', feedback: 'Pain that stops when the stimulus is removed and a normal cold response do not suggest irreversible pulpitis.' },
          { text: 'Initial enamel lesion', appropriate: 'not-appropriate', feedback: 'Dentin is visible in a cavity — this is beyond an initial enamel lesion.' },
        ],
      },
      {
        id: 'manage',
        prompt: 'What management is most appropriate?',
        options: [
          { text: 'Restoration (e.g., Class I/conservative preparation), selective removal to firm dentin, composite or GIC, plus risk management', appropriate: 'best', feedback: 'An uncleansable cavitated dentin lesion is generally restored; preventive care continues.' },
          { text: 'Fluoride varnish only', appropriate: 'acceptable', feedback: 'Fluoride is helpful but, with food packing and an uncleansable cavity, it is unlikely to control the lesion alone. Non-restorative cavity control can be considered only in specific situations.' },
          { text: 'Extraction', appropriate: 'not-appropriate', feedback: 'The tooth is restorable and the pulp appears healthy.' },
        ],
      },
    ],
    takeaway: 'Cavitation into dentin that the patient cannot clean usually calls for a sealed restoration, alongside caries-risk management.',
    refs: ['innes2016', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'case-deep',
    title: 'Deep lesion, vital pulp',
    patient: 'Fictional patient, 45 years, high caries risk (dry mouth from medication).',
    history: ['Occasional sensitivity to sweets, short-lived', 'No spontaneous or night pain'],
    findings: [
      'Large occlusal cavity with soft brown dentin',
      'Radiograph: lesion in the inner quarter of dentin, no periapical changes',
      'Normal response to cold testing',
    ],
    visual: { biofilm: 0.6, lesion: lesion({ enamelDepth: 1, dentinDepth: 0.82, surfaceTone: 'brown', surfaceIntensity: 1, cavitation: 0.65, pulpInflammation: 0.25 }) },
    questions: [
      {
        id: 'interpret',
        prompt: 'How would you interpret the situation?',
        options: [
          { text: 'Deep dentin lesion; pulp clinically vital without signs of irreversible pulpitis', appropriate: 'best', feedback: 'History and tests point to a vital pulp; radiographic depth places the lesion in deep dentin.' },
          { text: 'Pulp necrosis', appropriate: 'not-appropriate', feedback: 'A normal cold response argues against necrosis.' },
          { text: 'Shallow enamel lesion', appropriate: 'not-appropriate', feedback: 'The radiograph shows the lesion in the inner quarter of dentin.' },
        ],
      },
      {
        id: 'manage',
        prompt: 'Which approach best fits current consensus?',
        options: [
          { text: 'Selective removal to soft dentin over the pulp, hard periphery, liner as indicated, and a well-sealed restoration', appropriate: 'best', feedback: 'This lowers the risk of pulp exposure. Try the selective-removal procedure and calcium silicate workflow.' },
          { text: 'Stepwise removal (two visits)', appropriate: 'acceptable', feedback: 'Stepwise removal is an accepted alternative in some situations, though it requires a second intervention.' },
          { text: 'Non-selective removal to hard dentin everywhere', appropriate: 'not-appropriate', feedback: 'Complete removal in deep lesions increases the risk of pulp exposure.' },
        ],
      },
    ],
    takeaway: 'In deep lesions of vital teeth, keep the pulp covered: selective (or stepwise) removal plus an excellent seal.',
    refs: ['schwendicke2016', 'ese2019', 'bjorndal2019'],
    verification: DRAFT,
  },
];
