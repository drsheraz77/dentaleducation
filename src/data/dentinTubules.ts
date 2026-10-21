import type { VerificationStatus } from '../types';
import { CONTENT_REVIEW } from './review';

/**
 * Magnified dentin view: the hydrodynamic mechanism of dentin sensitivity.
 * Approved in the content-review addendum recorded in ./review.ts.
 */
export const TUBULES_VERIFICATION: VerificationStatus = CONTENT_REVIEW.status;
export const TUBULES_REFS = ['nanci2018', 'fejerskov2015'];

export type StimulusId = 'none' | 'cold' | 'air' | 'sweet' | 'probe' | 'heat';
export type FluidFlow = 'outward' | 'inward' | 'oscillating';

export interface Stimulus {
  id: StimulusId;
  name: string;
  /** Direction of dentinal fluid movement in the hydrodynamic model, if the tubules are open. */
  flow: FluidFlow | null;
  explanation: string;
}

export const STIMULI: Stimulus[] = [
  {
    id: 'none',
    name: 'No stimulus',
    flow: null,
    explanation: 'At rest the dentinal fluid is essentially still and the nerve fibres at the pulp end of the tubules are quiet.',
  },
  {
    id: 'cold',
    name: 'Cold',
    flow: 'outward',
    explanation: 'Cold contracts the dentinal fluid, drawing it outwards along open tubules.',
  },
  {
    id: 'air',
    name: 'Air blast',
    flow: 'outward',
    explanation: 'Drying the surface evaporates fluid from open tubule openings, so fluid moves outwards to replace it.',
  },
  {
    id: 'sweet',
    name: 'Sweet',
    flow: 'outward',
    explanation: 'A concentrated (hyperosmotic) sugar solution on exposed dentin draws fluid outwards by osmosis.',
  },
  {
    id: 'probe',
    name: 'Probe / touch',
    flow: 'oscillating',
    explanation: 'Mechanical pressure on open tubule openings displaces the fluid inside them.',
  },
  {
    id: 'heat',
    name: 'Heat',
    flow: 'inward',
    explanation: 'Heat expands the dentinal fluid, pushing it inwards towards the pulp.',
  },
];

export interface TubuleResponse {
  fluidMoves: boolean;
  flow: FluidFlow | null;
  nerveFires: boolean;
  headline: string;
  detail: string;
}

/**
 * Educational model of the hydrodynamic theory: a stimulus on open, exposed tubules moves the
 * dentinal fluid, which activates nerve fibres at the pulpal end and is felt as short, sharp pain.
 */
export function tubuleResponse(stimulus: Stimulus, exposed: boolean, occluded: boolean): TubuleResponse {
  if (!stimulus.flow) {
    return { fluidMoves: false, flow: null, nerveFires: false, headline: 'No stimulus', detail: stimulus.explanation };
  }
  if (!exposed) {
    return {
      fluidMoves: false,
      flow: null,
      nerveFires: false,
      headline: 'Covered dentin: little or no response',
      detail:
        'Enamel, cementum and gingiva cover the tubule openings, so the stimulus does not reach the dentinal fluid in this simplified model.',
    };
  }
  if (occluded) {
    return {
      fluidMoves: false,
      flow: null,
      nerveFires: false,
      headline: 'Occluded tubules: response reduced',
      detail:
        'Plugs in the tubule openings restrict fluid movement, which is how tubule-occluding desensitising treatments are thought to work.',
    };
  }
  return {
    fluidMoves: true,
    flow: stimulus.flow,
    nerveFires: true,
    headline: 'Open tubules: fluid moves, nerves fire',
    detail: `${stimulus.explanation} The fluid movement activates nerve fibres at the pulpal end of the tubules, felt as a short, sharp pain that stops when the stimulus is removed.`,
  };
}

export const HYDRODYNAMIC_SUMMARY = [
  'Dentin hypersensitivity is short, sharp pain from exposed dentin in response to stimuli such as cold, air, touch or sweet, not explained by another dental defect or disease.',
  'The hydrodynamic theory, the most widely accepted explanation, holds that the stimulus moves fluid within open dentinal tubules and this movement activates pulpal nerve fibres.',
  'Dentin becomes exposed through gingival recession, loss of enamel or loss of cementum; open tubules at the surface are a prerequisite.',
  'Management aims either to occlude the tubules (reduce fluid movement) or to reduce nerve excitability, alongside removing the causes of exposure. Other causes of pain, such as caries or a cracked tooth, must be ruled out first.',
];
