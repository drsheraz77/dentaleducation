import { PROCEDURE_BY_ID } from '../../data/procedures';
import { INSTRUMENTS } from '../../data/instruments';
import { CHECKPOINTS, CRITERION_LABEL, PULP_BANDS, checkpointKey, type ReviewCriterion } from '../../data/procedureCheckpoints';
import { instrumentKey, procedureVisual } from '../../state/selectors';
import { remainingDentinOverPulp } from '../../three/geometry/prepPlan';
import type { SimState } from '../../state/store';
import type { ProcedureId } from '../../types';

/**
 * Completion review of a simulated preparation. It reports on decisions (instrument choice,
 * access, tissue preservation, endpoint, pulp risk, reasoning) — never on having clicked
 * through the steps — and it is explicitly not a competency assessment.
 */

export type ReviewStatus = 'met' | 'partly' | 'needs-work' | 'not-assessed';

export interface ReviewRow {
  criterion: ReviewCriterion;
  label: string;
  status: ReviewStatus;
  notes: string[];
}

export interface ProcedureReview {
  rows: ReviewRow[];
  strengths: string[];
  improvements: string[];
  remainingDentin: number | null;
  answered: number;
  checkpoints: number;
}

type ReviewState = Pick<SimState, 'instrumentChoices' | 'instrumentLog' | 'checkpointAnswers'>;

const worst = (a: ReviewStatus, b: ReviewStatus): ReviewStatus => {
  const order: ReviewStatus[] = ['not-assessed', 'met', 'partly', 'needs-work'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
};

export function pulpBand(mm: number) {
  return PULP_BANDS.find((b) => mm >= b.min)!;
}

export function reviewProcedure(state: ReviewState, procedureId: ProcedureId): ProcedureReview {
  const proc = PROCEDURE_BY_ID[procedureId];
  const rows = new Map<ReviewCriterion, ReviewRow>();
  const row = (c: ReviewCriterion) => {
    if (!rows.has(c)) rows.set(c, { criterion: c, label: CRITERION_LABEL[c], status: 'not-assessed', notes: [] });
    return rows.get(c)!;
  };
  // Only criteria this procedure actually assesses get a row.
  const applicable = new Set<ReviewCriterion>(['instruments', 'pulp', 'reasoning', ...CHECKPOINTS[procedureId].map((c) => c.criterion)]);
  if (proc.steps.some((st) => st.id === 'access' && st.instrumentRules)) applicable.add('access');
  (['instruments', 'access', 'preservation', 'endpoint', 'pulp', 'reasoning'] as ReviewCriterion[]).filter((c) => applicable.has(c)).forEach(row);

  // Instruments: judged on every choice made, so a corrected mistake still counts as a mistake.
  for (const step of proc.steps) {
    if (!step.instrumentRules) continue;
    const key = instrumentKey(procedureId, step.id);
    const log = state.instrumentLog[key] ?? [];
    if (log.length === 0) continue;
    const unsuitable = log.filter((id) => step.instrumentRules?.[id]?.suitable === false);
    const final = state.instrumentChoices[key];
    const finalOk = final ? step.instrumentRules[final]?.suitable !== false : true;
    const r = row('instruments');
    if (unsuitable.length === 0) {
      r.status = worst(r.status, 'met');
      r.notes.push(`${step.title}: ${INSTRUMENTS[log[0]].name} was an appropriate choice.`);
    } else {
      r.status = worst(r.status, finalOk ? 'partly' : 'needs-work');
      r.notes.push(
        `${step.title}: ${[...new Set(unsuitable)].map((id) => INSTRUMENTS[id].name).join(', ')} ${unsuitable.length > 1 ? 'were' : 'was'} unsuitable${finalOk ? ' (corrected afterwards)' : ''}.`,
      );
    }
    if (step.id === 'access') {
      const a = row('access');
      a.status = worst(a.status, finalOk ? (unsuitable.length ? 'partly' : 'met') : 'needs-work');
      a.notes.push(finalOk ? 'Access to the lesion was achieved with a cutting instrument suited to enamel.' : 'Access was not achieved: the chosen instrument cannot cut sound enamel.');
    }
  }

  // Reasoning checkpoints.
  let answered = 0;
  for (const cp of CHECKPOINTS[procedureId]) {
    const answer = state.checkpointAnswers[checkpointKey(procedureId, cp.stepId)];
    if (answer === undefined) continue;
    answered++;
    const opt = cp.options[answer];
    const r = row(cp.criterion);
    r.status = worst(r.status, opt.verdict === 'good' ? 'met' : opt.verdict === 'acceptable' ? 'partly' : 'needs-work');
    r.notes.push(opt.feedback);
    const reasoning = row('reasoning');
    if (cp.criterion !== 'reasoning') reasoning.status = worst(reasoning.status, opt.verdict === 'good' ? 'met' : 'needs-work');
  }

  // Pulp risk: remaining dentin over the pulp at the end of the simulated preparation (model value).
  const last = procedureVisual(state, procedureId, proc.steps.length - 1);
  const remainingDentin = remainingDentinOverPulp(last.cavity, last.lesion);
  const reachedRemoval = (state.instrumentLog[instrumentKey(procedureId, 'removal')]?.length ?? 0) > 0 || answered > 0;
  if (remainingDentin !== null && reachedRemoval) {
    const band = pulpBand(remainingDentin);
    const p = row('pulp');
    p.status = worst(p.status, band.tone === 'bad' ? 'needs-work' : 'met');
    p.notes.push(`About ${remainingDentin.toFixed(1)} mm of dentin left over the pulp in this model — ${band.label.toLowerCase()}.`);
  }

  const list = [...rows.values()];
  const strengths = list.filter((r) => r.status === 'met').map((r) => r.label);
  const improvements = list.filter((r) => r.status === 'needs-work' || r.status === 'partly').map((r) => r.label);
  return { rows: list, strengths, improvements, remainingDentin, answered, checkpoints: CHECKPOINTS[procedureId].length };
}
