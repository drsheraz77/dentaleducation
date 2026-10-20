import type { DiagnosisInput, DiagnosisResult, LesionVisual, TreatmentPathway } from '../../types';

/**
 * Educational decision pathway. It explains how each variable shifts the options
 * discussed in consensus statements and guidelines. It is deliberately NOT a
 * diagnostic or prescribing system: it never returns a single "correct" treatment.
 */

export const DEFAULT_DIAGNOSIS: DiagnosisInput = {
  activity: 'active',
  cavitation: 'non-cavitated',
  depth: 'enamel',
  symptoms: 'none',
  pulp: 'responsive-normal',
  risk: 'moderate',
  restorability: 'restorable',
};

export const DIAGNOSIS_OPTIONS: { [K in keyof DiagnosisInput]: { label: string; options: { value: DiagnosisInput[K]; label: string }[] } } = {
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
  const dentinDepth = DEPTH_TO_DENTIN[input.depth];
  const cavitation = input.cavitation === 'cavitated' ? Math.max(0.3, dentinDepth * 0.8) : input.cavitation === 'microcavity' ? 0.1 : 0;
  const inactive = input.activity === 'inactive';
  return {
    site: 'occlusal',
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
  const pulpProblem =
    input.pulp === 'irreversible-signs' || input.pulp === 'non-responsive' || input.symptoms === 'spontaneous-lingering';
  const dentinLesion = input.depth !== 'enamel';
  const cavitated = input.cavitation === 'cavitated';
  const deep = input.depth === 'deep-dentin';

  if (input.restorability === 'non-restorable') {
    pathways.push({
      id: 'non-restorable',
      title: 'Discuss extraction or specialist opinion',
      fit: 'refer',
      reasoning: [
        'A non-restorable tooth cannot be predictably sealed or rebuilt, so caries-control strategies that depend on a restoration are not viable.',
        'Options and their consequences (space management, replacement) should be discussed with the patient.',
      ],
      refs: ['sturdevant2019'],
    });
  }

  if (pulpProblem) {
    alerts.push(
      'Symptoms or tests suggest irreversible pulpitis or pulp necrosis. Management moves beyond caries control to endodontic assessment (e.g., pulpotomy or root canal treatment) or extraction — outside this module.',
    );
    pathways.push({
      id: 'endo',
      title: 'Endodontic assessment and pulp-directed treatment',
      fit: input.restorability === 'non-restorable' ? 'may-consider' : 'refer',
      reasoning: [
        'Spontaneous or lingering pain, or a non-responsive pulp, is not consistent with a pulp expected to recover after caries management alone.',
        'Diagnosis requires history, sensibility testing and radiographic examination by a clinician.',
      ],
      refs: ['ese2019', 'bjorndal2019'],
    });
  }

  // Non-operative management is relevant for every lesion as part of caries control.
  pathways.push({
    id: 'non-operative',
    title: 'Non-operative caries control (biofilm, diet, fluoride)',
    fit: !cavitated && !dentinLesion ? 'consider' : !cavitated ? 'consider' : 'may-consider',
    reasoning: [
      'Caries is driven by biofilm and sugar frequency; restorations do not treat the disease process.',
      !cavitated
        ? 'With an intact (non-cavitated) surface, biofilm control and fluoride can arrest the lesion.'
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
    pathways.push({
      id: 'monitor',
      title: 'Monitor (arrested lesion)',
      fit: 'consider',
      reasoning: ['Inactive non-cavitated lesions generally do not need operative treatment.', 'Record and review at recall.'],
      refs: ['fejerskov2015', 'nyvad1999'],
    });
  }

  if (!cavitated && input.restorability !== 'non-restorable') {
    const sealFit = input.activity === 'inactive' ? 'may-consider' : 'consider';
    pathways.push({
      id: 'seal',
      title: 'Pit-and-fissure sealant / sealing the lesion',
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
    pathways.push({
      id: 'remin',
      title: 'Remineralisation strategies',
      fit: 'consider',
      reasoning: [
        'Professionally applied fluoride (e.g., varnish) and fluoride toothpaste support arrest of non-cavitated lesions.',
        'Other agents exist; evidence varies and guideline recommendations should be checked.',
      ],
      refs: ['slayton2018'],
    });
  }

  if ((cavitated || (dentinLesion && input.depth !== 'outer-dentin')) && input.restorability !== 'non-restorable' && !pulpProblem) {
    if (deep) {
      pathways.push({
        id: 'selective',
        title: 'Selective removal to soft dentin + sealed restoration',
        fit: 'consider',
        reasoning: [
          'Deep lesion with a pulp assessed as vital and without signs of irreversible pulpitis.',
          'Leaving soft dentin over the pulp reduces exposure risk; peripheral dentin is taken to hard dentin to achieve a seal.',
          'A liner (e.g., calcium silicate or GIC) may be considered depending on protocol.',
        ],
        refs: ['schwendicke2016', 'ese2019', 'bjorndal2019'],
      });
      pathways.push({
        id: 'stepwise',
        title: 'Stepwise removal',
        fit: 'may-consider',
        reasoning: ['Two-stage removal with re-entry; an alternative in some situations but requires a second intervention.'],
        refs: ['schwendicke2016', 'bjorndal2019'],
      });
      pathways.push({
        id: 'non-selective',
        title: 'Non-selective (complete) removal to hard dentin',
        fit: 'generally-not-indicated',
        reasoning: ['In deep lesions this increases the risk of pulp exposure and is generally not recommended by consensus statements.'],
        refs: ['schwendicke2016', 'ese2019'],
      });
    } else {
      pathways.push({
        id: 'restore',
        title: 'Restoration with selective removal to firm dentin',
        fit: cavitated ? 'consider' : 'may-consider',
        reasoning: [
          cavitated
            ? 'A cavitated dentin lesion is usually uncleansable by the patient; a sealed restoration restores form and cleansability.'
            : 'A non-cavitated lesion in the middle third of dentin may be sealed or restored — activity, risk and monitoring ability guide the choice.',
          'Material choice depends on site, load, moisture control and risk (see Restorative materials).',
        ],
        refs: ['schwendicke2016', 'innes2016', 'sturdevant2019'],
      });
    }
    if (cavitated && input.activity === 'inactive') {
      pathways.push({
        id: 'ncc',
        title: 'Non-restorative cavity control',
        fit: 'may-consider',
        reasoning: ['Inactive, cleansable cavities may be managed by keeping them open and cleanable — mainly in specific contexts (e.g., primary teeth).'],
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

  const summary = [
    input.activity === 'active' ? 'Active' : input.activity === 'inactive' ? 'Inactive' : 'Activity-uncertain',
    input.cavitation === 'non-cavitated' ? 'non-cavitated' : input.cavitation === 'microcavity' ? 'micro-cavitated' : 'cavitated',
    'lesion,',
    DIAGNOSIS_OPTIONS.depth.options.find((o) => o.value === input.depth)!.label.toLowerCase() + ';',
    `${input.risk} caries risk.`,
  ].join(' ');

  return {
    summary,
    pathways,
    alerts,
    visual: { lesion: diagnosisToLesion(input), biofilm: input.activity === 'active' ? 0.5 : 0 },
  };
}
