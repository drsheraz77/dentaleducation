import type { CariesStage, ClassificationExample, IcdasCode, LesionVisual } from '../types';

const DRAFT = 'draft-needs-expert-review' as const;
const CORE_REFS = ['fejerskov2015', 'pitts2017', 'featherstone2004', 'takahashi2011'];

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

/**
 * Stages are conceptual snapshots of a continuum. The order is NOT a timeline:
 * lesions can stall, arrest or regress at any point, and the 3D transitions are not
 * time-calibrated.
 */
export const CARIES_STAGES: CariesStage[] = [
  {
    id: 'normal',
    index: 0,
    title: 'Normal tooth surface',
    shortTitle: 'Normal',
    whatIsHappening:
      'A sound occlusal surface. Mineral is continuously exchanged between enamel and the surrounding saliva/plaque fluid; in health, gains and losses balance over time.',
    whyItMatters:
      'Caries is not a one-off event but a shift in this balance. Recognising the sound baseline helps you detect early change.',
    clinicalRelevance:
      'Pits and fissures of molars are naturally retentive sites, which is one reason occlusal surfaces are commonly affected.',
    keyPoints: ['Enamel is acellular but chemically dynamic.', 'Saliva buffers acids and supplies calcium and phosphate.'],
    visual: { biofilm: 0, lesion: null, highlight: ['enamel'] },
    refs: CORE_REFS,
    verification: DRAFT,
  },
  {
    id: 'biofilm',
    index: 1,
    title: 'Biofilm formation',
    shortTitle: 'Biofilm',
    whatIsHappening:
      'A biofilm (dental plaque) accumulates in the fissure. It is a normal microbial community; with frequent intake of fermentable carbohydrates, acid-producing and acid-tolerant organisms gain an ecological advantage.',
    whyItMatters:
      'Without a biofilm there is no caries lesion. The biofilm is necessary, but the disease is driven by how often it is exposed to sugars and by host factors.',
    clinicalRelevance:
      'Undisturbed biofilm in stagnation areas (fissures, approximal surfaces, gingival margins) is where lesions usually start. Mechanical disruption and diet advice target this step.',
    keyPoints: [
      'Ecological plaque hypothesis: environmental change (sugar, low pH) drives the community shift.',
      'Biofilm is shown as a yellow film with bacteria particles.',
    ],
    visual: { biofilm: 1, lesion: null, highlight: ['biofilm'] },
    refs: ['marsh1994', 'takahashi2011', 'pitts2017'],
    verification: DRAFT,
  },
  {
    id: 'acid',
    index: 2,
    title: 'Acid-mediated mineral loss',
    shortTitle: 'Acid challenge',
    whatIsHappening:
      'Bacteria ferment dietary sugars and release organic acids. Plaque pH falls; when plaque fluid becomes undersaturated with respect to enamel mineral, calcium and phosphate diffuse out (demineralisation). When pH recovers, mineral can be regained (remineralisation), especially with fluoride present.',
    whyItMatters:
      'Lesion development reflects the net balance of many such cycles. Frequency of sugar exposure, saliva, fluoride and biofilm removal all shift that balance.',
    clinicalRelevance:
      'Fluoride, diet counselling and biofilm control act on this balance — the basis of non-operative care.',
    keyPoints: [
      'Red particles: acid diffusing into enamel. White particles: mineral ions leaving.',
      'The "critical pH" for enamel is often quoted around 5.5, but it varies with the calcium and phosphate content of the fluid.',
      'Animated cycles are illustrative, not a time-calibrated model.',
    ],
    visual: { biofilm: 1, acidChallenge: true, lesion: lesion({ enamelDepth: 0.08, surfaceTone: 'white', surfaceIntensity: 0.15 }), highlight: ['enamel', 'biofilm'] },
    refs: ['featherstone2004', 'fejerskov2015', 'takahashi2011'],
    verification: DRAFT,
  },
  {
    id: 'initial',
    index: 3,
    title: 'Initial non-cavitated enamel lesion',
    shortTitle: 'Initial lesion',
    whatIsHappening:
      'Net mineral loss creates a subsurface lesion: the body of the lesion is porous while a relatively well-mineralised surface layer remains. Clinically this may appear as a chalky "white spot", most visible after air drying.',
    whyItMatters:
      'Demineralisation is not the same as cavitation. With the surface still intact, the lesion can be arrested or partly remineralised by controlling the biofilm and using fluoride.',
    clinicalRelevance:
      'Active lesions tend to look whitish/opaque and feel rough when a probe is gently moved across them; inactive lesions look shiny and feel smooth. Non-operative management is usually appropriate.',
    keyPoints: [
      'Use the cross-section view to see the cone-shaped subsurface lesion beneath the intact surface layer.',
      'Do not probe forcefully — this can create a cavity.',
    ],
    visual: { biofilm: 0.7, lesion: lesion({ enamelDepth: 0.4, surfaceTone: 'white', surfaceIntensity: 0.6 }), highlight: ['lesion', 'enamel'] },
    refs: ['fejerskov2015', 'nyvad1999', 'featherstone2004'],
    verification: DRAFT,
  },
  {
    id: 'enamel-progressing',
    index: 4,
    title: 'Progressing enamel lesion',
    shortTitle: 'Enamel lesion',
    whatIsHappening:
      'If the imbalance continues, the lesion deepens towards the dentino-enamel junction (DEJ). In fissures the enamel lesion forms a cone whose base faces the DEJ. Surface discolouration may develop from uptake of stains.',
    whyItMatters:
      'Dentin can begin to react (sclerosis) even before the lesion reaches it — the dentin–pulp complex responds early.',
    clinicalRelevance:
      'Radiographs underestimate lesion depth in enamel. Activity assessment and patient risk remain key to deciding between non-operative care and sealing.',
    keyPoints: ['A brown colour does not by itself mean a lesion is active — arrested lesions are often dark and shiny.'],
    visual: { biofilm: 0.6, lesion: lesion({ enamelDepth: 0.9, surfaceTone: 'brown', surfaceIntensity: 0.6 }), highlight: ['lesion', 'enamel'] },
    refs: ['fejerskov2015', 'nanci2018'],
    verification: DRAFT,
  },
  {
    id: 'dentin',
    index: 5,
    title: 'Dentin involvement',
    shortTitle: 'Dentin',
    whatIsHappening:
      'The lesion reaches dentin and can spread laterally along the DEJ, undermining enamel. Enamel above may break down (micro-cavitation) as it loses support.',
    whyItMatters:
      'Cavitation into dentin makes biofilm removal by the patient difficult, which changes the management options.',
    clinicalRelevance:
      'Lesions with a cavity that cannot be cleaned are generally managed with a restoration, often with selective removal of carious tissue. Non-cavitated dentin lesions can sometimes be sealed.',
    keyPoints: ['Two dentin shades: outer, heavily affected zone (dark) and inner zone (lighter).'],
    visual: {
      biofilm: 0.6,
      lesion: lesion({ enamelDepth: 1, dentinDepth: 0.35, surfaceTone: 'brown', surfaceIntensity: 0.8, cavitation: 0.3 }),
      highlight: ['lesion', 'dentin'],
    },
    refs: ['fejerskov2015', 'innes2016', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'deep',
    index: 6,
    title: 'Deep caries approaching the pulp',
    shortTitle: 'Deep',
    whatIsHappening:
      'The lesion extends deep into dentin (radiographically into the inner third or quarter). The pulp may show inflammatory changes while still being capable of recovery.',
    whyItMatters:
      'The risk of pulp exposure during complete removal of soft dentin is high. Strategies that keep the pulp covered aim to preserve vitality.',
    clinicalRelevance:
      'In teeth with vital pulps without signs of irreversible pulpitis, current consensus favours selective removal to soft dentin or stepwise removal rather than non-selective (complete) removal.',
    keyPoints: ['Pulp diagnosis comes from symptoms, sensibility tests and radiographs, not from lesion appearance alone.'],
    visual: {
      biofilm: 0.6,
      lesion: lesion({ enamelDepth: 1, dentinDepth: 0.8, surfaceTone: 'brown', surfaceIntensity: 0.9, cavitation: 0.6, pulpInflammation: 0.35 }),
      highlight: ['lesion', 'pulp'],
    },
    refs: ['schwendicke2016', 'ese2019', 'bjorndal2019'],
    verification: DRAFT,
  },
  {
    id: 'advanced',
    index: 7,
    title: 'Advanced lesion with possible pulpal involvement',
    shortTitle: 'Advanced',
    whatIsHappening:
      'The lesion reaches the pulp. Depending on the host response, the pulp may be irreversibly inflamed or become necrotic, and infection can spread to the periapical tissues.',
    whyItMatters:
      'Management shifts from caries control alone to endodontic or surgical care, and restorability must be assessed.',
    clinicalRelevance:
      'Symptoms such as spontaneous, lingering pain suggest irreversible pulpitis; the absence of symptoms does not rule out pulp pathology. This is beyond the scope of this caries module.',
    keyPoints: ['Not all lesions reach this stage: many arrest or are managed earlier.', 'Red pulp colour is a visual cue only.'],
    visual: {
      biofilm: 0.6,
      lesion: lesion({ enamelDepth: 1, dentinDepth: 1, surfaceTone: 'brown', surfaceIntensity: 1, cavitation: 0.85, pulpInflammation: 1 }),
      highlight: ['lesion', 'pulp'],
    },
    refs: ['ese2019', 'bjorndal2019', 'pitts2017'],
    verification: DRAFT,
  },
];

export const ICDAS_CODES: IcdasCode[] = [
  { code: '0', label: 'Sound', description: 'No evidence of caries after prolonged air drying.' },
  { code: '1', label: 'First visual change in enamel', description: 'Opacity or discolouration seen only after prolonged air drying, or confined to the pit/fissure.' },
  { code: '2', label: 'Distinct visual change in enamel', description: 'Visible when wet; extends beyond the pit/fissure.' },
  { code: '3', label: 'Localised enamel breakdown', description: 'Breakdown due to caries with no visible dentin or underlying shadow.' },
  { code: '4', label: 'Underlying dark shadow from dentin', description: 'Shadow of discoloured dentin seen through apparently intact enamel, with or without localised breakdown.' },
  { code: '5', label: 'Distinct cavity with visible dentin', description: 'Cavitation in opaque or discoloured enamel exposing dentin.' },
  { code: '6', label: 'Extensive distinct cavity with visible dentin', description: 'Obvious loss of tooth structure; cavity deep and wide, dentin clearly visible.' },
];

export const CLASSIFICATION_EXAMPLES: ClassificationExample[] = [
  {
    id: 'initial-enamel',
    title: 'Initial enamel caries',
    icdas: 'ICDAS 1–2 (educational illustration)',
    icdasCode: '1–2',
    description: 'Opacity in the fissure without loss of surface integrity.',
    visualSigns: ['White/chalky opacity along the fissure', 'Surface intact', 'Change may need air drying to be seen'],
    managementNote: 'Typically non-operative: biofilm control, fluoride, and sealing when risk/activity justify it.',
    visual: { biofilm: 0.3, lesion: lesion({ enamelDepth: 0.4, surfaceTone: 'white', surfaceIntensity: 0.7 }) },
    refs: ['ismail2007', 'fejerskov2015'],
    verification: DRAFT,
  },
  {
    id: 'moderate-enamel',
    title: 'Moderate enamel involvement',
    icdas: 'ICDAS 3 (educational illustration)',
    icdasCode: '3',
    description: 'Localised enamel breakdown without visible dentin.',
    visualSigns: ['Small break in the surface (micro-cavity)', 'Surrounding opacity or discolouration', 'No dentin visible'],
    managementNote: 'Options include sealing, or a minimally invasive restoration, depending on activity, depth and risk.',
    visual: { biofilm: 0.3, lesion: lesion({ enamelDepth: 1, dentinDepth: 0.08, surfaceTone: 'brown', surfaceIntensity: 0.6, cavitation: 0.1 }) },
    refs: ['ismail2007', 'innes2016'],
    verification: DRAFT,
  },
  {
    id: 'cavitated-dentin',
    title: 'Cavitated dentinal caries',
    icdas: 'ICDAS 5 (educational illustration)',
    icdasCode: '5',
    description: 'A distinct cavity exposing dentin.',
    visualSigns: ['Cavity with visible dentin', 'Lesion spreads along the DEJ beneath enamel'],
    managementNote: 'Usually restorative management with selective carious tissue removal, plus caries-risk management.',
    visual: { biofilm: 0.4, lesion: lesion({ enamelDepth: 1, dentinDepth: 0.4, surfaceTone: 'brown', surfaceIntensity: 0.85, cavitation: 0.4 }) },
    refs: ['ismail2007', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'deep-dentin',
    title: 'Deep dentinal caries',
    icdas: 'ICDAS 6 (educational illustration)',
    icdasCode: '6',
    description: 'Extensive cavity; radiographically deep into dentin.',
    visualSigns: ['Wide, deep cavity', 'Lesion close to the pulp on the section view'],
    managementNote: 'Pulp assessment is essential; selective removal to soft dentin or stepwise removal is preferred for vital, asymptomatic or reversibly inflamed pulps.',
    visual: { biofilm: 0.4, lesion: lesion({ enamelDepth: 1, dentinDepth: 0.82, surfaceTone: 'brown', surfaceIntensity: 1, cavitation: 0.7, pulpInflammation: 0.3 }) },
    refs: ['ismail2007', 'ese2019', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'root',
    title: 'Root caries',
    icdas: 'ICDAS root-surface criteria (educational illustration)',
    icdasCode: 'Root',
    description: 'Lesion on an exposed root surface after gingival recession.',
    visualSigns: [
      'Gingival recession exposes cementum/root dentin',
      'Discoloured lesion near the CEJ',
      'Activity judged by texture (soft/leathery vs hard) and appearance',
    ],
    managementNote: 'Options include fluoride (e.g., high-concentration toothpaste or varnish), biofilm control and, where cavitated and uncleansable, restoration (often glass ionomer).',
    visual: {
      biofilm: 0.3,
      gingivalRecession: true,
      lesion: lesion({ site: 'root', dentinDepth: 0.35, surfaceTone: 'brown', surfaceIntensity: 0.9, cavitation: 0.25 }),
      camera: 'mesial',
    },
    refs: ['ismail2007', 'fejerskov2015', 'slayton2018'],
    verification: DRAFT,
  },
];
