import type { DiagnosisInput, DiagnosisResult, IcdasScore, LesionVisual, ManagementCategory, TreatmentPathway } from '../../types';

/**
 * Educational decision pathway. It explains how each variable shifts the options
 * discussed in consensus statements and guidelines. It is deliberately NOT a
 * diagnostic or prescribing system: it never returns a single "correct" treatment.
 */

export const DEFAULT_DIAGNOSIS: DiagnosisInput = {
  icdas: '2',
  dentition: 'permanent',
  surface: 'occlusal',
  activity: 'active',
  cavitation: 'non-cavitated',
  depth: 'enamel',
  symptoms: 'none',
  pulp: 'responsive-normal',
  risk: 'moderate',
  restorability: 'restorable',
  cleansability: 'non-cleansable',
};

/**
 * Cavitation status implied by an ICDAS code. ICDAS 4 is a dentinal shadow "with or without
 * localised enamel breakdown"; it is treated here as non-cavitated (no dentin exposed).
 */
export const ICDAS_CAVITATION: Record<IcdasScore, DiagnosisInput['cavitation']> = {
  '0': 'non-cavitated',
  '1': 'non-cavitated',
  '2': 'non-cavitated',
  '3': 'microcavity',
  '4': 'non-cavitated',
  '5': 'cavitated',
  '6': 'cavitated',
};

/** Order in which the guided pathway presents the steps (category labels for the UI). */
export const CATEGORY_LABEL: Record<ManagementCategory, string> = {
  preventive: 'Preventive',
  'non-operative': 'Non-operative (non-invasive)',
  'micro-invasive': 'Micro-invasive',
  restorative: 'Restorative / operative',
  pulp: 'Pulp-related',
  extraction: 'Extraction or referral',
};
export const CATEGORY_ORDER: ManagementCategory[] = ['preventive', 'non-operative', 'micro-invasive', 'restorative', 'pulp', 'extraction'];

export const DIAGNOSIS_OPTIONS: { [K in keyof DiagnosisInput]: { label: string; options: { value: DiagnosisInput[K]; label: string }[] } } = {
  icdas: {
    label: 'ICDAS code (visual severity)',
    options: [
      { value: '0', label: 'ICDAS 0 · Sound surface' },
      { value: '1', label: 'ICDAS 1 · First visual change in enamel' },
      { value: '2', label: 'ICDAS 2 · Distinct visual change in enamel' },
      { value: '3', label: 'ICDAS 3 · Localised enamel breakdown' },
      { value: '4', label: 'ICDAS 4 · Underlying dentinal shadow' },
      { value: '5', label: 'ICDAS 5 · Distinct cavity with visible dentin' },
      { value: '6', label: 'ICDAS 6 · Extensive cavity with visible dentin' },
    ],
  },
  dentition: {
    label: 'Dentition',
    options: [
      { value: 'permanent', label: 'Permanent tooth' },
      { value: 'primary', label: 'Primary tooth' },
    ],
  },
  surface: {
    label: 'Surface',
    options: [
      { value: 'occlusal', label: 'Occlusal (pit and fissure)' },
      { value: 'proximal', label: 'Proximal (approximal)' },
    ],
  },
  cleansability: {
    label: 'Cleansability of the cavity',
    options: [
      { value: 'non-cleansable', label: 'Not cleansable by the patient' },
      { value: 'cleansable', label: 'Cleansable (open, accessible to brushing)' },
    ],
  },
  activity: {
    label: 'Lesion activity',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive / arrested' },
      { value: 'uncertain', label: 'Uncertain' },
    ],
  },
  cavitation: {
    label: 'Cavitation status',
    options: [
      { value: 'non-cavitated', label: 'Non-cavitated' },
      { value: 'microcavity', label: 'Micro-cavity (enamel breakdown)' },
      { value: 'cavitated', label: 'Cavitated into dentin' },
    ],
  },
  depth: {
    label: 'Estimated lesion depth (radiographic)',
    options: [
      { value: 'enamel', label: 'Enamel only' },
      { value: 'outer-dentin', label: 'Outer third of dentin' },
      { value: 'middle-dentin', label: 'Middle third of dentin' },
      { value: 'deep-dentin', label: 'Inner third/quarter of dentin' },
    ],
  },
  symptoms: {
    label: 'Symptoms',
    options: [
      { value: 'none', label: 'None' },
      { value: 'provoked-short', label: 'Provoked, short-lived' },
      { value: 'spontaneous-lingering', label: 'Spontaneous or lingering pain' },
    ],
  },
  pulp: {
    label: 'Pulpal assessment',
    options: [
      { value: 'responsive-normal', label: 'Responsive, normal' },
      { value: 'reversible-signs', label: 'Signs consistent with reversible pulpitis' },
      { value: 'irreversible-signs', label: 'Signs suggesting irreversible pulpitis' },
      { value: 'non-responsive', label: 'Non-responsive (possible necrosis)' },
    ],
  },
  risk: {
    label: 'Patient caries risk',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' },
    ],
  },
  restorability: {
    label: 'Tooth restorability',
    options: [
      { value: 'restorable', label: 'Restorable' },
      { value: 'questionable', label: 'Questionable' },
      { value: 'non-restorable', label: 'Non-restorable' },
    ],
  },
};

const DEPTH_TO_DENTIN: Record<DiagnosisInput['depth'], number> = {
  enamel: 0,
  'outer-dentin': 0.25,
  'middle-dentin': 0.5,
  'deep-dentin': 0.82,
};

/** Map the learner's selections onto the 3D lesion so the scene reflects the scenario. */
export function diagnosisToLesion(input: DiagnosisInput): LesionVisual {
  if (input.icdas === '0') {
    return { site: 'occlusal', enamelDepth: 0, dentinDepth: 0, surfaceTone: 'none', surfaceIntensity: 0, cavitation: 0, pulpInflammation: 0 };
  }
  const dentinDepth = DEPTH_TO_DENTIN[input.depth];
  const cavitation = input.cavitation === 'cavitated' ? Math.max(0.3, dentinDepth * 0.8) : input.cavitation === 'microcavity' ? 0.1 : 0;
  const inactive = input.activity === 'inactive';
  return {
    site: input.surface === 'proximal' ? 'proximal' : 'occlusal',
    enamelDepth: input.depth === 'enamel' ? 0.55 : 1,
    dentinDepth,
    surfaceTone: inactive || dentinDepth > 0 ? 'brown' : 'white',
    surfaceIntensity: 0.5 + dentinDepth * 0.5,
    cavitation,
    pulpInflammation:
      input.pulp === 'irreversible-signs' ? 0.8 : input.pulp === 'reversible-signs' ? 0.35 : input.pulp === 'non-responsive' ? 1 : 0,
    inactive,
  };
}

export function evaluateDiagnosis(input: DiagnosisInput): DiagnosisResult {
  const pathways: TreatmentPathway[] = [];
  const alerts: string[] = [];
  const followUp: string[] = [];
  const add = (p: TreatmentPathway) => pathways.push(p);
  const sound = input.icdas === '0';
  const primary = input.dentition === 'primary';
  const pulpProblem =
    input.pulp === 'irreversible-signs' || input.pulp === 'non-responsive' || input.symptoms === 'spontaneous-lingering';
  const dentinLesion = input.depth !== 'enamel';
  const cavitated = input.cavitation === 'cavitated';
  const deep = input.depth === 'deep-dentin';
  const cleansable = cavitated && input.cleansability === 'cleansable';

  // Patient-level prevention applies whatever the lesion.
  add({
    id: 'prevent',
    title: 'Risk-based prevention and recall',
    category: 'preventive',
    fit: 'consider',
    reasoning: [
      'Prevention targets the patient, not only the lesion: twice-daily fluoride toothpaste, reduced frequency of sugar intake and effective plaque removal.',
      input.risk === 'high'
        ? 'High caries risk: intensify prevention (e.g., professionally applied fluoride) and shorten the recall interval.'
        : input.risk === 'low'
          ? 'Low caries risk: standard prevention and a longer recall interval.'
          : 'Moderate risk: tailor prevention to the patient’s behaviours and history.',
    ],
    refs: ['pitts2017', 'pitts2014', 'slayton2018'],
  });

  if (sound) {
    if (input.risk === 'high' && input.surface === 'occlusal' && input.restorability !== 'non-restorable') {
      add({
        id: 'seal-sound',
        title: 'Preventive fissure sealant on a sound surface',
        category: 'micro-invasive',
        fit: 'may-consider',
        reasoning: [
          'Sealants on sound pits and fissures can be considered for patients at elevated caries risk, particularly in children and adolescents.',
          'No lesion is present, so no carious tissue management is needed.',
        ],
        refs: ['wright2016'],
      });
    }
    followUp.push('Re-examine at the recall interval set by the patient’s caries risk.');
    if (input.depth !== 'enamel') alerts.push('ICDAS 0 but a radiographic lesion was selected: visual and radiographic findings disagree. Re-examine (clean, dry, good light) and check the radiograph.');
    return finish();
  }

  if (input.restorability === 'non-restorable') {
    add({
      id: 'non-restorable',
      title: 'Discuss extraction or specialist opinion',
      category: 'extraction',
      fit: 'refer',
      reasoning: [
        'A non-restorable tooth cannot be predictably sealed or rebuilt, so caries-control strategies that depend on a restoration are not viable.',
        'Options and their consequences (space management, replacement) should be discussed with the patient.',
        ...(primary ? ['In a primary tooth, time to natural exfoliation and space maintenance influence the decision.'] : []),
      ],
      refs: ['sturdevant2019'],
    });
  }

  if (pulpProblem) {
    alerts.push(
      'Symptoms or tests suggest irreversible pulpitis or pulp necrosis. Management moves beyond caries control to endodontic assessment (e.g., pulpotomy or root canal treatment) or extraction — outside this module.',
    );
    add({
      id: 'endo',
      title: 'Endodontic assessment and pulp-directed treatment',
      category: 'pulp',
      fit: input.restorability === 'non-restorable' ? 'may-consider' : 'refer',
      reasoning: [
        'Spontaneous or lingering pain, or a non-responsive pulp, is not consistent with a pulp expected to recover after caries management alone.',
        'Diagnosis requires history, sensibility testing and radiographic examination by a clinician.',
        ...(primary ? ['In primary teeth, pulp-directed options (e.g., pulpotomy or pulpectomy) or extraction depend on the tooth’s remaining lifespan and restorability.'] : []),
      ],
      refs: ['ese2019', 'bjorndal2019'],
    });
  }

  // Non-operative management is relevant for every lesion as part of caries control.
  add({
    id: 'non-operative',
    title: 'Non-operative caries control (biofilm, diet, fluoride)',
    category: 'non-operative',
    fit: !cavitated && !dentinLesion ? 'consider' : !cavitated ? 'consider' : cleansable ? 'consider' : 'may-consider',
    reasoning: [
      'Caries is driven by biofilm and sugar frequency; restorations do not treat the disease process.',
      !cavitated
        ? 'With an intact (non-cavitated) surface, biofilm control and fluoride can arrest the lesion.'
        : cleansable
          ? 'The cavity is open and cleansable, so regular brushing with fluoride toothpaste can arrest it.'
          : 'With a cavity, non-operative care continues alongside any restoration, but alone may not control an uncleansable lesion.',
      input.risk === 'high'
        ? 'High caries risk supports more intensive measures (e.g., professional fluoride application, shorter recall).'
        : input.risk === 'low'
          ? 'Low risk may justify standard prevention and monitoring.'
          : 'Moderate risk: tailor intensity to the patient’s behaviours and history.',
    ],
    refs: ['slayton2018', 'pitts2017', 'fejerskov2015'],
  });

  if (input.activity === 'inactive' && !cavitated) {
    add({
      id: 'monitor',
      title: 'Monitor (arrested lesion)',
      category: 'non-operative',
      fit: 'consider',
      reasoning: ['Inactive non-cavitated lesions generally do not need operative treatment.', 'Record and review at recall.'],
      refs: ['fejerskov2015', 'nyvad1999'],
    });
  }

  if (!cavitated && input.restorability !== 'non-restorable') {
    if (input.surface === 'occlusal') {
      const sealFit = input.activity === 'inactive' ? 'may-consider' : 'consider';
      add({
        id: 'seal',
        title: 'Pit-and-fissure sealant / sealing the lesion',
        category: 'micro-invasive',
        fit: sealFit,
        reasoning: [
          'Sealants can be placed over non-cavitated occlusal lesions to deprive the biofilm of access.',
          input.cavitation === 'microcavity'
            ? 'With micro-cavitation, sealing or a minimally invasive restoration may both be discussed.'
            : 'Most useful for active lesions and in higher-risk patients.',
          dentinLesion
            ? 'Sealing non-cavitated lesions extending into outer dentin has been described, with monitoring.'
            : 'No sound tissue is removed.',
        ],
        refs: ['wright2016', 'schwendicke2016'],
      });
    } else if (input.depth === 'enamel' || input.depth === 'outer-dentin') {
      add({
        id: 'infiltration',
        title: 'Resin infiltration or sealing of the proximal lesion',
        category: 'micro-invasive',
        fit: input.activity === 'inactive' ? 'may-consider' : 'consider',
        reasoning: [
          'Non-cavitated proximal lesions confined to enamel or the outer third of dentin can be arrested micro-invasively, without drilling.',
          'Evidence suggests micro-invasive treatment reduces progression more than non-invasive measures alone.',
          'Requires separation and isolation of the contact area.',
        ],
        refs: ['dorri2015', 'schwendicke2016'],
      });
    }
    add({
      id: 'remin',
      title: 'Remineralisation strategies',
      category: 'non-operative',
      fit: 'consider',
      reasoning: [
        'Professionally applied fluoride (e.g., varnish) and fluoride toothpaste support arrest of non-cavitated lesions.',
        'Other agents exist; evidence varies and guideline recommendations should be checked.',
      ],
      refs: ['slayton2018'],
    });
  }

  if (cavitated && !pulpProblem && input.restorability !== 'non-restorable') {
    add({
      id: 'sdf',
      title: 'Silver diamine fluoride (lesion arrest)',
      category: 'non-operative',
      fit: primary ? 'consider' : 'may-consider',
      reasoning: [
        'Applying 38% silver diamine fluoride to cavitated coronal lesions can arrest them without tissue removal.',
        'Arrested lesions stain black: discuss the appearance and obtain consent. Re-application may be needed.',
        primary
          ? 'Particularly useful in primary teeth and in children who cannot yet cope with operative care.'
          : 'An option for patients who cannot tolerate or access operative care.',
      ],
      refs: ['slayton2018', 'crystal2017'],
    });
  }

  if (primary && cavitated && input.surface !== undefined && dentinLesion && !pulpProblem && input.restorability !== 'non-restorable') {
    add({
      id: 'hall',
      title: 'Hall technique (preformed metal crown, no caries removal)',
      category: 'restorative',
      fit: 'consider',
      reasoning: [
        'For carious primary molars with no signs of irreversible pulpitis, a preformed metal crown is cemented without local anaesthesia, tooth preparation or caries removal.',
        'Sealing the lesion under the crown deprives the biofilm of substrate, so the lesion arrests.',
      ],
      refs: ['innes2007', 'innes2016'],
    });
  }

  if ((cavitated || (dentinLesion && input.depth !== 'outer-dentin')) && input.restorability !== 'non-restorable' && !pulpProblem) {
    if (deep) {
      add({
        id: 'selective',
        title: 'Selective removal to soft dentin + sealed restoration',
        category: 'restorative',
        fit: 'consider',
        reasoning: [
          'Deep lesion with a pulp assessed as vital and without signs of irreversible pulpitis.',
          'Leaving soft dentin over the pulp reduces exposure risk; peripheral dentin is taken to hard dentin to achieve a seal.',
          'A liner (e.g., calcium silicate or GIC) may be considered depending on protocol.',
        ],
        refs: ['schwendicke2016', 'ese2019', 'bjorndal2019'],
      });
      add({
        id: 'stepwise',
        title: 'Stepwise removal',
        category: 'restorative',
        fit: 'may-consider',
        reasoning: ['Two-stage removal with re-entry; an alternative in some situations but requires a second intervention.'],
        refs: ['schwendicke2016', 'bjorndal2019'],
      });
      add({
        id: 'non-selective',
        title: 'Non-selective (complete) removal to hard dentin',
        category: 'restorative',
        fit: 'generally-not-indicated',
        reasoning: ['In deep lesions this increases the risk of pulp exposure and is generally not recommended by consensus statements.'],
        refs: ['schwendicke2016', 'ese2019'],
      });
    } else {
      add({
        id: 'restore',
        title: 'Restoration with selective removal to firm dentin',
        category: 'restorative',
        fit: cleansable && input.activity === 'inactive' ? 'may-consider' : cavitated ? 'consider' : 'may-consider',
        reasoning: [
          cavitated
            ? cleansable
              ? 'A restoration is not needed to control an open, cleansable, arrested cavity, but may be chosen for function, aesthetics or food trapping.'
              : 'A cavitated dentin lesion is usually uncleansable by the patient; a sealed restoration restores form and cleansability.'
            : 'A non-cavitated lesion in the middle third of dentin may be sealed or restored — activity, risk and monitoring ability guide the choice.',
          'Material choice depends on site, load, moisture control and risk (see Restorative materials).',
        ],
        refs: ['schwendicke2016', 'innes2016', 'sturdevant2019'],
      });
    }
    if (cavitated && (input.activity === 'inactive' || cleansable)) {
      add({
        id: 'ncc',
        title: 'Non-restorative cavity control',
        category: 'non-operative',
        fit: cleansable && (input.activity === 'inactive' || primary) ? 'consider' : 'may-consider',
        reasoning: cleansable
          ? [
              'The cavity is open enough to clean: keep it cleansable and brush it with fluoride toothpaste so the lesion arrests.',
              'Sometimes the cavity is widened slightly to make it cleansable; mainly used in primary teeth and for arrested lesions.',
            ]
          : ['Inactive, cleansable cavities may be managed by keeping them open and cleanable — mainly in specific contexts (e.g., primary teeth).'],
        refs: ['innes2016'],
      });
    }
  }

  if (input.symptoms === 'provoked-short' && !pulpProblem) {
    alerts.push('Short-lived, provoked sensitivity can be consistent with a pulp that may recover after caries management — confirm with clinical tests.');
  }
  if (input.activity === 'uncertain') {
    alerts.push('Activity is uncertain: re-assess after cleaning and drying, consider monitoring with preventive care and review.');
  }
  if (input.restorability === 'questionable') {
    alerts.push('Restorability is questionable: evaluate remaining tooth structure, periodontal support and the patient’s priorities before committing to treatment.');
  }
  if (deep && !pulpProblem) {
    alerts.push('Deep lesion: assess the pulp (history, sensibility testing, radiograph) before choosing management. Pulp status cannot be read from the lesion’s appearance.');
  }
  const code = Number(input.icdas);
  if (code <= 2 && (input.depth === 'middle-dentin' || input.depth === 'deep-dentin')) {
    alerts.push('Visual findings (ICDAS ≤ 2) and a radiographic lesion deep in dentin disagree: re-examine the surface and the radiograph before deciding.');
  }
  if (code >= 5 && input.depth === 'enamel') {
    alerts.push('A cavity with visible dentin (ICDAS 5–6) cannot be confined to enamel: check the radiographic depth.');
  }
  if (primary) {
    alerts.push('Primary teeth have thinner enamel and dentin and relatively larger pulps, so lesions reach the pulp sooner. Consider time to exfoliation in every decision.');
  }

  // Follow-up
  followUp.push(
    input.risk === 'high'
      ? 'High risk: shorter recall interval; reinforce prevention at each visit.'
      : 'Recall interval set by the patient’s caries risk; reinforce prevention.',
  );
  if (!cavitated) followUp.push('Reassess lesion activity at recall (appearance, texture, plaque) and compare with records or photographs.');
  if (cavitated && cleansable) followUp.push('Check that the cavity stays clean and the dentin becomes hard and shiny (arrest).');
  if (cavitated && !pulpProblem && input.restorability !== 'non-restorable') followUp.push('If silver diamine fluoride is used, check arrest at recall; re-application may be needed.');
  if (deep && !pulpProblem) followUp.push('After selective removal: review symptoms and pulp sensibility, and the restoration margin; radiographic review as clinically indicated.');
  if (dentinLesion && !cavitated) followUp.push('Monitor radiographically at an interval appropriate to risk to confirm the lesion is not progressing.');
  if (primary) followUp.push('Plan around the expected exfoliation of the primary tooth.');

  return finish();

  function finish(): DiagnosisResult {
    const summary = [
      `ICDAS ${input.icdas}`,
      sound ? '(sound surface);' : `${input.surface} lesion, ${input.dentition} tooth;`,
      ...(sound
        ? []
        : [
            input.activity === 'active' ? 'active,' : input.activity === 'inactive' ? 'inactive,' : 'activity uncertain,',
            input.cavitation === 'non-cavitated' ? 'non-cavitated,' : input.cavitation === 'microcavity' ? 'micro-cavitated,' : `cavitated (${input.cleansability}),`,
            DIAGNOSIS_OPTIONS.depth.options.find((o) => o.value === input.depth)!.label.toLowerCase() + ';',
          ]),
      `${input.risk} caries risk.`,
    ].join(' ');
    return {
      summary,
      pathways,
      alerts,
      followUp,
      visual: { lesion: diagnosisToLesion(input), biofilm: input.activity === 'active' && !sound ? 0.5 : 0 },
    };
  }
}
