import { evaluateDiagnosis } from '../diagnosis/decisionEngine';
import { QUEST_CASE_BY_ID, QUEST_RANKS, type PathwayId, type QuestCase } from '../../data/game/cariesQuest';
import type { IcdasScore, PathwayFit, TreatmentPathway } from '../../types';

/** Points: detection 100; management 150 (consider/refer) or 75 (may consider); justification 50; streak bonus for perfect rounds. */
export const POINTS = { detect: 100, manage: 150, managePartial: 75, justify: 50, streakStep: 25, streakMax: 100 } as const;

export interface QuestAnswer {
  detect?: IcdasScore;
  manage?: PathwayId;
  /** Index of the chosen justification. */
  justify?: number;
}

export type ManageGrade = 'best' | 'partial' | 'wrong';

/** How the decision pathway rates a chosen option for this case. */
export function gradeManagement(c: QuestCase, choice: PathwayId): { grade: ManageGrade; fit: PathwayFit | null; pathway: TreatmentPathway | null } {
  const pathway = evaluateDiagnosis(c.input).pathways.find((p) => p.id === choice) ?? null;
  const fit = pathway?.fit ?? null;
  const grade: ManageGrade = fit === 'consider' || fit === 'refer' ? 'best' : fit === 'may-consider' ? 'partial' : 'wrong';
  return { grade, fit, pathway };
}

/** Options at the management step, in a stable order that differs between cases. */
export function managementOptions(c: QuestCase): PathwayId[] {
  const ids = [c.keyed, ...c.others];
  const seed = [...c.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return ids
    .map((id, i) => ({ id, k: (seed * (i + 3) * 2654435761) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id);
}

export interface RoundResult {
  caseId: string;
  detectCorrect: boolean;
  manage: ManageGrade | null;
  justifyCorrect: boolean;
  points: number;
  bonus: number;
  complete: boolean;
}

export interface QuestScore {
  rounds: RoundResult[];
  points: number;
  max: number;
  streak: number;
  bestStreak: number;
  completed: number;
}

export function questScore(order: string[], answers: Record<string, QuestAnswer>): QuestScore {
  let streak = 0;
  let bestStreak = 0;
  const rounds: RoundResult[] = [];
  for (const id of order) {
    const c = QUEST_CASE_BY_ID[id];
    const a = answers[id] ?? {};
    const detectCorrect = a.detect === c.input.icdas;
    const manage = a.manage ? gradeManagement(c, a.manage).grade : null;
    const justifyCorrect = a.justify === c.justify.correct;
    const complete = a.detect !== undefined && a.manage !== undefined && a.justify !== undefined;
    let points =
      (detectCorrect ? POINTS.detect : 0) +
      (manage === 'best' ? POINTS.manage : manage === 'partial' ? POINTS.managePartial : 0) +
      (justifyCorrect ? POINTS.justify : 0);
    let bonus = 0;
    if (complete) {
      if (detectCorrect && manage === 'best' && justifyCorrect) {
        streak += 1;
        bonus = Math.min(POINTS.streakMax, POINTS.streakStep * (streak - 1));
      } else {
        streak = 0;
      }
      bestStreak = Math.max(bestStreak, streak);
    }
    points += bonus;
    rounds.push({ caseId: id, detectCorrect, manage, justifyCorrect, points, bonus, complete });
  }
  const max = order.reduce((m, _, i) => m + POINTS.detect + POINTS.manage + POINTS.justify + Math.min(POINTS.streakMax, POINTS.streakStep * i), 0);
  return {
    rounds,
    points: rounds.reduce((s, r) => s + r.points, 0),
    max,
    streak,
    bestStreak,
    completed: rounds.filter((r) => r.complete).length,
  };
}

export function questRank(points: number, max: number) {
  const pct = max ? (points / max) * 100 : 0;
  return QUEST_RANKS.find((r) => pct >= r.min)!;
}

/** Fisher–Yates shuffle with an injectable random source (tests pass a fixed one). */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
