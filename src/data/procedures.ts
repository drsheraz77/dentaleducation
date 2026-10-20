import type { InstrumentRule, LesionVisual, Procedure, ProcedureId, ProcedureStep, InstrumentId } from '../types';

const DRAFT = 'draft-needs-expert-review' as const;

const lesion = (l: Partial<LesionVisual>): LesionVisual => ({
  site: 'occlusal',
  enamelDepth: 1,
  dentinDepth: 0.3,
  surfaceTone: 'brown',
  surfaceIntensity: 0.8,
  cavitation: 0.25,
  pulpInflammation: 0,
  ...l,
});

const ACCESS_RULES: Partial<Record<InstrumentId, InstrumentRule>> = {
  roundBur: { suitable: true, note: 'A small round bur gives controlled entry through enamel into the lesion.' },
  pearBur: { suitable: true, note: 'A pear-shaped bur enters efficiently and leaves rounded internal angles.' },
  fissureBur: { suitable: true, note: 'A fissure bur can be used, producing straighter walls along the groove.' },
  slowRoundBur: {
    suitable: false,
    note: 'Low-speed burs cut sound enamel inefficiently and with vibration — use a high-speed bur for enamel access. Access not achieved.',
  },
  spoonExcavator: {
    suitable: false,
    note: 'A spoon excavator cannot cut sound enamel. Access to the lesion was not achieved — choose a rotary instrument.',
  },
};

const REMOVAL_RULES: Partial<Record<InstrumentId, InstrumentRule>> = {
  slowRoundBur: { suitable: true, note: 'A large low-speed round bur removes soft carious dentin with tactile control.' },
  spoonExcavator: { suitable: true, note: 'A sharp spoon excavator lifts soft dentin and is gentle near the pulp.' },
  roundBur: {
    suitable: false,
    note: 'High-speed cutting of carious dentin gives little tactile feedback and risks removing sound dentin or exposing the pulp. Switch to low speed or a hand excavator.',
  },
  fissureBur: {
    suitable: false,
    note: 'A high-speed fissure bur is designed for outline form, not for discriminating soft from firm dentin.',
  },
};

function standardSteps(opts: {
  objective: string;
  objectiveRationale: string;
  accessText: string;
  removalText: string;
  removalRationale: string;
  resultText: string;
  inspectText: string;
  rationaleText: string;
  accessOptions?: InstrumentId[];
  extraAccessRules?: Partial<Record<InstrumentId, InstrumentRule>>;
  residual?: boolean;
  accessCamera?: ProcedureStep['camera'];
}): ProcedureStep[] {
  return [
    {
      id: 'inspect',
      title: 'Inspect the tooth and identify the lesion',
      description:
        'Clean and dry the surface, then inspect under good light. Assess colour, opacity, surface integrity and texture (gently, with a ball-ended probe). Correlate with radiographs.',
      rationale: 'Diagnosis — activity, cavitation and depth — determines whether and how to operate.',
      instrumentOptions: ['explorer', 'mirror'],
      visual: { instrument: { id: 'explorer', motion: 'probe' }, highlight: ['lesion'] },
      focus: ['lesion', 'enamel'],
      camera: 'occlusal',
    },
    {
      id: 'objective',
      title: 'Select the preparation objective',
      description: opts.objective,
      rationale: opts.objectiveRationale,
      visual: { plannedOutline: true, highlight: ['lesion'] },
      camera: 'occlusal',
    },
    {
      id: 'isolate',
      title: 'Isolate and select an instrument',
      description:
        'Isolate the tooth (rubber dam shown) to control moisture and protect the patient, then select the instrument for gaining access. Try different instruments to see the effect.',
      rationale: 'Moisture control is essential for adhesive restorations; instrument choice depends on the tissue being cut.',
      visual: { isolation: 'rubberDam', plannedOutline: true },
      camera: 'working',
    },
    {
      id: 'access',
      title: 'Gain access to the lesion',
      description: opts.accessText,
      rationale: 'Access should be just large enough to see and reach the carious dentin while conserving sound enamel.',
      instrumentOptions: opts.accessOptions ?? ['pearBur', 'roundBur', 'fissureBur', 'slowRoundBur', 'spoonExcavator'],
      instrumentRules: { ...ACCESS_RULES, ...opts.extraAccessRules },
      visual: { isolation: 'rubberDam', cavity: { shape: 'classI', depth: 0.6 } },
      camera: opts.accessCamera ?? 'occlusal',
    },
    {
      id: 'removal',
      title: opts.residual ? 'Selectively manage the carious tissue' : 'Remove the carious tissue',
      description: opts.removalText,
      rationale: opts.removalRationale,
      instrumentOptions: ['slowRoundBur', 'spoonExcavator', 'roundBur', 'fissureBur'],
      instrumentRules: REMOVAL_RULES,
      visual: { isolation: 'rubberDam', cavity: { shape: 'classI', depth: 1 } },
      focus: ['lesion', 'dentin', 'pulp'],
      camera: 'section',
    },
    {
      id: 'result',
      title: 'Display the resulting preparation',
      description: opts.resultText,
      rationale: 'Check the outline, walls, margins and floor before restoring.',
      visual: { isolation: 'rubberDam', cavity: { shape: 'classI', depth: 1 } },
      camera: 'occlusal',
    },
    {
      id: 'remaining',
      title: 'Inspect the remaining tooth structure',
      description: opts.inspectText,
      rationale: 'Remaining dentin thickness over the pulp and the strength of remaining cusps influence material choice and prognosis.',
      visual: { isolation: 'rubberDam', cavity: { shape: 'classI', depth: 1 }, highlight: ['dentin', 'pulp'] },
      focus: ['dentin', 'pulp'],
      camera: 'section',
    },
    {
      id: 'rationale',
      title: 'Biological and restorative rationale',
      description: opts.rationaleText,
      rationale: 'Use "Compare before/after" to see what was removed and what was preserved.',
      visual: { isolation: 'rubberDam', cavity: { shape: 'classI', depth: 1 } },
      camera: 'working',
    },
  ].map((s) => ({ ...s, visual: { residualLesion: !!opts.residual, ...s.visual } })) as ProcedureStep[];
}

function withShape(steps: ProcedureStep[], shape: 'conservative' | 'classI' | 'classII' | 'selective', accessDepth = 0.6): ProcedureStep[] {
  return steps.map((s) =>
    s.visual.cavity
      ? { ...s, visual: { ...s.visual, cavity: { shape, depth: s.id === 'access' ? accessDepth : s.visual.cavity.depth } } }
      : s,
  );
}

export const PROCEDURES: Procedure[] = [
  {
    id: 'conservative-occlusal',
    name: 'Conservative occlusal preparation',
    summary:
      'Minimal access to a small occlusal lesion just into dentin, removing only carious tissue and sealing adjacent fissures (sometimes called a preventive resin restoration).',
    learningObjectives: [
      'Explain why minimal intervention preserves tooth structure.',
      'Relate the extent of preparation to the extent of the lesion rather than to fissure outline.',
      'Choose appropriate instruments for enamel access and dentin caries removal.',
    ],
    prerequisites: ['Caries diagnosis of a cavitated or radiographically dentinal occlusal lesion', 'Patient consent and caries-risk assessment'],
    indications: ['Small cavitated or uncleansable occlusal lesions with limited dentin involvement'],
    safetyLimitations: [
      'Educational simulation only — not a validated clinical procedural trainer.',
      'Geometry, cutting rates and tissue hardness are not physically simulated.',
    ],
    startingLesion: lesion({ dentinDepth: 0.12, cavitation: 0.12, surfaceIntensity: 0.6 }),
    steps: withShape(
      standardSteps({
        objective:
          'Objective: gain minimal access, remove carious tissue to firm dentin at the periphery, and keep the outline confined to the lesion. Adjacent sound fissures can be sealed instead of cut.',
        objectiveRationale: 'Lesion-driven (not "extension for prevention") outlines conserve strength and enamel for bonding.',
        accessText: 'A small high-speed bur penetrates the fissure enamel directly over the lesion.',
        removalText: 'Carious dentin is removed. Peripheral dentin is left hard so a sealed margin can be achieved.',
        removalRationale: 'A well-sealed periphery is key to arresting residual bacteria and to restoration longevity.',
        resultText: 'A narrow, rounded preparation limited to the lesion. Note how much of the fissure system remains intact.',
        inspectText: 'Use the cross-section: a thick layer of sound dentin remains over the pulp.',
        rationaleText:
          'Minimal preparations preserve marginal ridges and cusps. The restoration (typically composite, sometimes GIC) plus sealing of remaining fissures controls the lesion while keeping tooth structure.',
      }),
      'conservative',
      0.75,
    ),
    refs: ['banerjee2015', 'sturdevant2019', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'class-i',
    name: 'Class I cavity preparation',
    summary: 'Preparation of an occlusal (pit and fissure) lesion confined to the occlusal surface, preserving marginal ridges.',
    learningObjectives: [
      'Describe outline form for an occlusal lesion extending into dentin.',
      'Explain pulpal floor depth relative to the DEJ.',
      'Distinguish conventional outline from caries removal.',
    ],
    prerequisites: ['Diagnosis of an occlusal dentin lesion requiring restoration', 'Radiographic assessment of depth'],
    indications: ['Cavitated occlusal lesions into dentin', 'Replacement of defective occlusal restorations'],
    safetyLimitations: [
      'Educational simulation only. The outline is idealised and symmetrical.',
      'Adhesive restorations allow more conservative outlines than the traditional amalgam-oriented design.',
    ],
    startingLesion: lesion({ dentinDepth: 0.35, cavitation: 0.3 }),
    steps: withShape(
      standardSteps({
        objective:
          'Objective: establish an outline that includes the carious and undermined enamel, with the pulpal floor just into dentin, preserving marginal ridges and cusp strength.',
        objectiveRationale: 'The outline balances access, removal of undermined enamel and conservation of tooth structure.',
        accessText: 'Enter at the deepest point of the lesion, then extend along the central groove as needed.',
        removalText: 'Remaining carious dentin below the pulpal floor is removed to firm dentin, creating a localised deeper area.',
        removalRationale: 'Removing contaminated soft dentin peripherally allows a sealed restoration; deeper areas are not "flattened" by cutting sound dentin.',
        resultText: 'Class I preparation with pulpal floor slightly into dentin and marginal ridges intact.',
        inspectText: 'In cross-section, check the remaining dentin over the pulp horns, which project under the cusps.',
        rationaleText:
          'Preserving marginal ridges maintains tooth stiffness. Rounded internal angles reduce stress concentration. Material choice (composite, amalgam, GIC) influences final form details.',
      }),
      'classI',
    ),
    refs: ['sturdevant2019', 'banerjee2015', 'schwendicke2016'],
    verification: DRAFT,
  },
  {
    id: 'class-ii',
    name: 'Class II cavity preparation',
    summary: 'Preparation of a proximal (mesial) lesion, accessed through the marginal ridge with an occlusal extension and a proximal box.',
    learningObjectives: [
      'Explain why proximal lesions are commonly accessed through the marginal ridge.',
      'Describe the components of a proximal box (gingival floor, axial wall, proximal walls).',
      'Recognise the need to protect the adjacent tooth.',
    ],
    prerequisites: ['Radiographic (bitewing) evidence of a proximal lesion into dentin, ideally with clinical confirmation of cavitation'],
    indications: ['Cavitated proximal lesions into dentin'],
    safetyLimitations: [
      'The adjacent tooth is not modelled; in practice it must be protected (e.g., with a metal guard or matrix).',
      'Educational simulation only.',
    ],
    startingLesion: lesion({ site: 'proximal', dentinDepth: 0.35, cavitation: 0.2 }),
    steps: withShape(
      standardSteps({
        objective:
          'Objective: access the mesial lesion through the marginal ridge, form a proximal box just large enough to remove the lesion and break contact as needed, and keep the occlusal extension minimal.',
        objectiveRationale: 'Box dimensions follow the lesion; breaking contact allows margin access and inspection.',
        accessText: 'Penetrate the marginal ridge from the occlusal side and drop into the proximal lesion, leaving a thin shell of enamel to protect the adjacent tooth until the box is defined.',
        removalText: 'Carious dentin on the axial wall is removed; unsupported proximal enamel is planed back with hand instruments.',
        removalRationale: 'Sealing the gingival margin on sound tissue is critical for proximal restorations.',
        resultText: 'Class II (mesio-occlusal) preparation with an occlusal step and proximal box ending above the CEJ.',
        inspectText: 'Inspect the gingival floor, axial wall depth and remaining cusp thickness in the section view.',
        rationaleText:
          'A matrix band will be needed to restore the proximal contour and contact. Gingival margin position and isolation greatly affect adhesive restorations.',
        accessCamera: 'mesial',
      }),
      'classII',
    ),
    refs: ['sturdevant2019', 'banerjee2015'],
    verification: DRAFT,
  },
  {
    id: 'selective-removal',
    name: 'Selective caries removal for deep lesions',
    summary:
      'For deep lesions in teeth with vital pulps and no signs of irreversible pulpitis: remove carious tissue to hard dentin at the periphery, but leave soft dentin over the pulp to avoid exposure, then seal.',
    learningObjectives: [
      'Contrast selective removal with non-selective (complete) removal.',
      'Explain why a sealed restoration is central to the strategy.',
      'Identify when this approach is not appropriate (e.g., signs of irreversible pulpitis).',
    ],
    prerequisites: [
      'Deep dentin lesion (radiographically inner third/quarter)',
      'Pulp assessed as vital without signs of irreversible pulpitis',
      'Ability to place a well-sealed restoration',
    ],
    indications: ['Deep carious lesions in vital, asymptomatic or reversibly inflamed teeth'],
    safetyLimitations: [
      'Pulp status cannot be judged from this model. Clinical and radiographic assessment are required.',
      'Educational simulation only; the residual soft dentin volume is schematic.',
    ],
    startingLesion: lesion({ dentinDepth: 0.8, cavitation: 0.6, surfaceIntensity: 0.9, pulpInflammation: 0.25 }),
    steps: withShape(
      standardSteps({
        objective:
          'Objective: create access, remove carious tissue to hard dentin around the periphery (so the margins can be sealed) and deliberately leave soft/leathery dentin over the pulp.',
        objectiveRationale:
          'Consensus recommendations favour selective removal to soft dentin in deep lesions of vital teeth because it lowers the risk of pulp exposure.',
        accessText: 'Gain access through the cavitated enamel and remove undermined enamel to see the full lesion.',
        removalText:
          'The periphery is cleared to hard dentin while the centre — over the pulp — is left soft. Notice the brown residual tissue remaining on the floor in the section view.',
        removalRationale:
          'Bacteria left beneath a sealed restoration are deprived of substrate; lesion activity is expected to decline, and the pulp is protected from exposure.',
        resultText: 'Peripheral walls are hard and cleanable; a layer of soft dentin remains centrally.',
        inspectText: 'Compare residual lesion and remaining dentin thickness over the pulp in the section view.',
        rationaleText:
          'Selective removal relies on an excellent seal. A liner (for example a calcium silicate or GIC) may be placed over the deepest area depending on the protocol, followed by a durable restoration. Stepwise removal is an alternative in some situations.',
        residual: true,
      }),
      'selective',
      0.6,
    ),
    refs: ['schwendicke2016', 'ese2019', 'bjorndal2019', 'innes2016'],
    verification: DRAFT,
  },
];

export const PROCEDURE_BY_ID: Record<ProcedureId, Procedure> = Object.fromEntries(PROCEDURES.map((p) => [p.id, p])) as Record<
  ProcedureId,
  Procedure
>;
