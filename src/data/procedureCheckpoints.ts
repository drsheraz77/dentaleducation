import type { CavityShape, ProcedureId, VerificationStatus } from '../types';

/**
 * Clinical-reasoning checkpoints inside the cavity-preparation procedures, and the criteria
 * the completion review reports on. Added 2026-11-02: awaiting qualified review.
 */

export const CHECKPOINT_STATUS: VerificationStatus = 'draft_pending_review';

export type ReviewCriterion = 'instruments' | 'access' | 'preservation' | 'endpoint' | 'pulp' | 'reasoning';

export const CRITERION_LABEL: Record<ReviewCriterion, string> = {
  instruments: 'Instrument choice',
  access: 'Access',
  preservation: 'Tissue preservation',
  endpoint: 'Procedural endpoint',
  pulp: 'Pulp risk',
  reasoning: 'Clinical reasoning',
};

export type Verdict = 'good' | 'acceptable' | 'error';

export interface CheckpointOption {
  text: string;
  verdict: Verdict;
  feedback: string;
  /** Changes the simulated preparation from this step on (e.g. non-selective removal). */
  cavityShape?: CavityShape;
}

export interface Checkpoint {
  stepId: string;
  criterion: ReviewCriterion;
  prompt: string;
  options: CheckpointOption[];
}

const PERIPHERY: Checkpoint = {
  stepId: 'removal',
  criterion: 'endpoint',
  prompt: 'When is caries removal complete at the periphery (the cavity margins)?',
  options: [
    {
      text: 'When the peripheral dentin is hard, so the restoration margin can be sealed',
      verdict: 'good',
      feedback: 'Hard peripheral dentin and sound enamel margins allow a durable seal, which controls any bacteria left deeper in the cavity.',
    },
    {
      text: 'When all stained dentin has gone, whatever its hardness',
      verdict: 'error',
      feedback: 'Stain is not the endpoint: hard, discoloured dentin can stay. Removing it sacrifices sound tissue unnecessarily.',
    },
    {
      text: 'Soft dentin can be left at the margins as well as centrally',
      verdict: 'error',
      feedback: 'Soft dentin at the margins prevents a seal; leakage there undermines the restoration and the arrest of the lesion.',
    },
  ],
};

export const CHECKPOINTS: Record<ProcedureId, Checkpoint[]> = {
  'conservative-occlusal': [
    {
      stepId: 'objective',
      criterion: 'preservation',
      prompt: 'How far should the outline extend?',
      options: [
        {
          text: 'Only as far as the lesion; seal the adjacent sound fissures instead of cutting them',
          verdict: 'good',
          feedback: 'A lesion-driven outline conserves enamel and strength; sealing protects the remaining fissures.',
        },
        {
          text: 'Along every fissure to its end ("extension for prevention")',
          verdict: 'error',
          feedback: 'Extension for prevention removes sound tissue unnecessarily; sealants protect fissures without cutting them.',
        },
        {
          text: 'Through a marginal ridge, for easier access',
          verdict: 'error',
          feedback: 'Cutting a sound marginal ridge weakens the tooth and is not needed to reach an occlusal lesion.',
        },
      ],
    },
    PERIPHERY,
  ],
  'class-i': [
    {
      stepId: 'objective',
      criterion: 'preservation',
      prompt: 'What determines the outline of this Class I preparation?',
      options: [
        {
          text: 'The extent of carious and undermined enamel, preserving the marginal ridges',
          verdict: 'good',
          feedback: 'The outline follows the lesion; intact marginal ridges keep the tooth stiff.',
        },
        {
          text: 'A standard outline that includes every fissure, whatever the lesion extent',
          verdict: 'error',
          feedback: 'A standard outline cuts sound tissue; with adhesive materials, outlines are lesion-driven.',
        },
        {
          text: 'Remove the marginal ridges so a matrix is easier to place',
          verdict: 'error',
          feedback: 'Marginal ridges should be preserved in an occlusal (Class I) preparation; removing them makes it a Class II.',
        },
      ],
    },
    {
      stepId: 'removal',
      criterion: 'preservation',
      prompt: 'In one area, carious dentin extends below the planned pulpal floor. What do you do?',
      options: [
        {
          text: 'Remove the remaining carious dentin locally, leaving a deeper area; keep the rest of the floor where it is',
          verdict: 'good',
          feedback: 'Only carious tissue is removed; the deeper area is restored, not "flattened" by cutting sound dentin.',
        },
        {
          text: 'Lower the whole pulpal floor to the deepest level, for a flat floor',
          verdict: 'error',
          feedback: 'Flattening the floor removes sound dentin and brings the floor closer to the pulp horns under the cusps.',
        },
        {
          text: 'Leave soft dentin at the DEJ to save time',
          verdict: 'error',
          feedback: 'Soft dentin at the periphery (the DEJ) prevents a seal and leaves the lesion uncontrolled.',
        },
      ],
    },
  ],
  'class-ii': [
    {
      stepId: 'access',
      criterion: 'access',
      prompt: 'How do you gain access to the mesial lesion?',
      options: [
        {
          text: 'Through the marginal ridge from occlusal, keeping a thin enamel shell (or a guard) to protect the adjacent tooth',
          verdict: 'good',
          feedback: 'Occlusal access through the marginal ridge reaches the lesion while the shell or a guard protects the neighbouring tooth.',
        },
        {
          text: 'Directly against the contact area, with no protection of the adjacent tooth',
          verdict: 'error',
          feedback: 'Iatrogenic damage to the adjacent tooth is common without protection; it creates a new site for caries.',
        },
        {
          text: 'First cut the whole central groove, then enter the proximal lesion',
          verdict: 'error',
          feedback: 'The occlusal extension should be the minimum needed for access, not the whole groove.',
        },
      ],
    },
    {
      stepId: 'removal',
      criterion: 'endpoint',
      prompt: 'Where should the gingival margin of the proximal box finish?',
      options: [
        {
          text: 'Just beyond the lesion on sound tissue, ideally in enamel and above the gingiva where possible',
          verdict: 'good',
          feedback: 'A margin on sound enamel above the gingiva is easier to isolate, bond and seal.',
        },
        {
          text: 'Deep in the gingival sulcus, to be safe',
          verdict: 'error',
          feedback: 'Extending subgingivally removes sound tissue and makes isolation and sealing harder.',
        },
        {
          text: 'Leave soft dentin at the gingival margin; the restoration will seal it',
          verdict: 'error',
          feedback: 'A seal cannot be achieved over soft dentin at the margin; the gingival margin is where Class II restorations most often fail.',
        },
      ],
    },
  ],
  'selective-removal': [
    {
      stepId: 'objective',
      criterion: 'reasoning',
      prompt: 'Is selective removal appropriate for this tooth?',
      options: [
        {
          text: 'Yes: a deep lesion in a tooth with a vital pulp and no signs of irreversible pulpitis',
          verdict: 'good',
          feedback: 'These are the conditions under which consensus statements favour selective removal to soft dentin.',
        },
        {
          text: 'Yes, even with spontaneous, lingering pain',
          verdict: 'error',
          feedback: 'Spontaneous or lingering pain suggests irreversible pulpitis: the tooth needs endodontic assessment instead.',
        },
        {
          text: 'No: deep lesions always need complete excavation to hard dentin',
          verdict: 'error',
          feedback: 'Complete (non-selective) removal in deep lesions raises the risk of pulp exposure and is not the default approach.',
        },
      ],
    },
    {
      stepId: 'removal',
      criterion: 'endpoint',
      prompt: 'Where do you stop removing carious dentin?',
      options: [
        {
          text: 'Hard dentin at the periphery; leave soft or leathery dentin over the pulp',
          verdict: 'good',
          feedback: 'Selective removal: the periphery allows a seal, and the dentin left over the pulp protects it from exposure.',
          cavityShape: 'selective',
        },
        {
          text: 'Hard dentin everywhere, including over the pulp',
          verdict: 'error',
          feedback: 'Non-selective removal takes the cavity very close to the pulp (see the pulp-proximity indicator); exposure risk is high.',
          cavityShape: 'nonSelective',
        },
        {
          text: 'Soft dentin everywhere, including at the periphery',
          verdict: 'error',
          feedback: 'Without hard peripheral dentin the restoration cannot seal, and the lesion is not controlled.',
          cavityShape: 'selective',
        },
      ],
    },
  ],
};

export function checkpointKey(procedureId: ProcedureId, stepId: string) {
  return `${procedureId}:${stepId}`;
}

/** Illustrative bands for the remaining dentin over the pulp in this model (not clinical thresholds). */
export const PULP_BANDS = [
  { min: 1.5, label: 'Comfortable distance', tone: 'ok' as const },
  { min: 0.5, label: 'Close to the pulp: protect it', tone: 'warn' as const },
  { min: 0, label: 'Very close: high exposure risk', tone: 'bad' as const },
];
