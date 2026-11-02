import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { initialState, useSim } from '../state/store';
import { deriveScene, instrumentKey, procedureVisual } from '../state/selectors';
import { PROCEDURES, PROCEDURE_BY_ID } from '../data/procedures';
import { CHECKPOINTS, checkpointKey } from '../data/procedureCheckpoints';
import { QUIZ } from '../data/quiz';
import { ICDAS_CODES } from '../data/cariesStages';
import { getReference } from '../data/references';
import { ACTIVITY_PRINCIPLES, GLOSSARY, PATHWAY_STEPS } from '../data/cariesPathway';
import { remainingDentinOverPulp } from '../three/geometry/prepPlan';
import { reviewProcedure } from '../modules/procedures/review';
import type { ProcedureId } from '../types';

vi.mock('../three/ToothScene', async () => {
  const { useSim } = await import('../state/store');
  const { deriveScene } = await import('../state/selectors');
  return {
    ToothScene: () => <pre data-testid="scene-probe">{JSON.stringify(deriveScene(useSim()).teeth.map((t) => t.visual.cavity))}</pre>,
  };
});

beforeEach(() => {
  useSim.setState(initialState);
});

const finalVisual = (id: ProcedureId, answers: Record<string, number> = {}) =>
  procedureVisual({ instrumentChoices: {}, checkpointAnswers: answers }, id, PROCEDURE_BY_ID[id].steps.length - 1);

describe('ICDAS terminology', () => {
  it('uses the specified wording for codes 0–6', () => {
    expect(ICDAS_CODES.map((c) => c.code)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(ICDAS_CODES[1].description).toMatch(/first visual change in enamel, usually apparent .*after drying/i);
    expect(ICDAS_CODES[2].description).toMatch(/visible when wet and dry/i);
    expect(ICDAS_CODES[3].description).toMatch(/without visible dentin or an underlying dentinal shadow/i);
    expect(ICDAS_CODES[4].description).toMatch(/underlying dentinal shadow, with or without enamel breakdown/i);
    expect(ICDAS_CODES[6].description).toMatch(/extensive cavity with visible dentin/i);
  });

  it('never presents colour as sufficient for activity', () => {
    expect(ACTIVITY_PRINCIPLES[0]).toMatch(/colour alone does not establish activity/i);
    expect(PATHWAY_STEPS.map((s) => s.id)).toEqual(['detect', 'severity', 'activity', 'risk', 'cavitation', 'pulp', 'management', 'follow-up']);
    for (const g of Object.values(GLOSSARY)) expect(g.definition.length).toBeGreaterThan(30);
  });
});

describe('pulp proximity and selective vs non-selective endpoints', () => {
  it('measures less remaining dentin after non-selective than after selective removal', () => {
    const sel = finalVisual('selective-removal');
    const non = procedureVisual({ instrumentChoices: {}, checkpointAnswers: {} }, 'selective-removal', 7, 'nonSelective');
    const a = remainingDentinOverPulp(sel.cavity, sel.lesion)!;
    const b = remainingDentinOverPulp(non.cavity, non.lesion)!;
    expect(a).toBeGreaterThan(0.5);
    expect(b).toBeLessThan(0.5);
    expect(b).toBeLessThan(a);
  });

  it('keeps a comfortable distance in the shallow procedures', () => {
    for (const id of ['conservative-occlusal', 'class-i'] as ProcedureId[]) {
      const v = finalVisual(id);
      expect(remainingDentinOverPulp(v.cavity, v.lesion), id).toBeGreaterThan(1.5);
    }
    expect(remainingDentinOverPulp(null, null)).toBeNull();
  });

  it('switches the 3D preparation to non-selective removal when that checkpoint answer is given', () => {
    const cp = CHECKPOINTS['selective-removal'].find((c) => c.stepId === 'removal')!;
    const wrong = cp.options.findIndex((o) => o.cavityShape === 'nonSelective');
    const v = finalVisual('selective-removal', { [checkpointKey('selective-removal', 'removal')]: wrong });
    expect(v.cavity?.shape).toBe('nonSelective');
    expect(v.residualLesion).toBe(false);
    expect(finalVisual('selective-removal').cavity?.shape).toBe('selective');
  });

  it('compares both endpoints side by side', () => {
    useSim.setState({ ...initialState, topic: 'preparation', procedureId: 'selective-removal', compareEndpoints: true });
    const teeth = deriveScene(useSim.getState()).teeth;
    expect(teeth.map((t) => t.visual.cavity?.shape)).toEqual(['selective', 'nonSelective']);
  });
});

describe('procedural checkpoints and completion review', () => {
  it('gives every procedure checkpoints on real steps, each with exactly one sound option', () => {
    for (const p of PROCEDURES) {
      const cps = CHECKPOINTS[p.id];
      expect(cps.length, p.id).toBeGreaterThan(0);
      for (const cp of cps) {
        expect(p.steps.some((s) => s.id === cp.stepId), `${p.id}:${cp.stepId}`).toBe(true);
        expect(cp.options.filter((o) => o.verdict === 'good').length).toBe(1);
      }
    }
  });

  it('does not award anything for clicking through: an untouched procedure is not assessed', () => {
    const r = reviewProcedure({ instrumentChoices: {}, instrumentLog: {}, checkpointAnswers: {} }, 'class-i');
    expect(r.rows.every((row) => row.status === 'not-assessed')).toBe(true);
    expect(r.strengths).toEqual([]);
  });

  it('assesses instrument choice from first attempts, and flags pulp risk for non-selective removal', () => {
    const id: ProcedureId = 'selective-removal';
    const k = (step: string) => instrumentKey(id, step);
    const removal = CHECKPOINTS[id].find((c) => c.stepId === 'removal')!;
    const objective = CHECKPOINTS[id].find((c) => c.stepId === 'objective')!;
    const good = {
      instrumentChoices: { [k('access')]: 'pearBur', [k('removal')]: 'spoonExcavator' } as const,
      instrumentLog: { [k('access')]: ['pearBur'], [k('removal')]: ['spoonExcavator'] } as Record<string, ('pearBur' | 'spoonExcavator')[]>,
      checkpointAnswers: {
        [checkpointKey(id, 'objective')]: objective.options.findIndex((o) => o.verdict === 'good'),
        [checkpointKey(id, 'removal')]: removal.options.findIndex((o) => o.verdict === 'good'),
      },
    };
    const r1 = reviewProcedure(good, id);
    const status = (r: typeof r1, c: string) => r.rows.find((x) => x.criterion === c)!.status;
    expect(status(r1, 'instruments')).toBe('met');
    expect(status(r1, 'pulp')).toBe('met');
    expect(status(r1, 'reasoning')).toBe('met');

    const bad = {
      ...good,
      instrumentLog: { ...good.instrumentLog, [k('removal')]: ['roundBur', 'spoonExcavator'] },
      checkpointAnswers: { ...good.checkpointAnswers, [checkpointKey(id, 'removal')]: removal.options.findIndex((o) => o.cavityShape === 'nonSelective') },
    } as Parameters<typeof reviewProcedure>[0];
    const r2 = reviewProcedure(bad, id);
    expect(status(r2, 'instruments')).toBe('partly'); // corrected after an unsuitable first choice
    expect(status(r2, 'pulp')).toBe('needs-work');
    expect(r2.remainingDentin!).toBeLessThan(0.5);
    expect(r2.improvements).toEqual(expect.arrayContaining(['Pulp risk', 'Instrument choice']));
  });

  it('runs a checkpoint and the completion review in the UI, and restarts the procedure', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /cavity preparation/i }));
    await screen.findByTestId('scene-probe');
    await user.selectOptions(screen.getByRole('combobox', { name: /procedure/i }), 'selective-removal');
    useSim.getState().setStep(4); // removal
    const info = await screen.findByRole('complementary', { name: /information panel/i });
    const cp = within(info).getByRole('region', { name: /reasoning checkpoint/i });
    await user.click(within(cp).getByRole('button', { name: /hard dentin everywhere/i }));
    expect(within(cp).getByRole('status')).toHaveTextContent(/this would be an error/i);
    expect(screen.getByTestId('scene-probe').textContent).toContain('nonSelective');
    expect(screen.getByTestId('pulp-proximity')).toHaveTextContent(/very close/i);
    const review = screen.getByTestId('procedure-review');
    expect(review).toHaveTextContent(/not a competency assessment/i);
    await user.click(within(review).getByRole('button', { name: /restart this procedure/i }));
    expect(useSim.getState().checkpointAnswers).toEqual({});
    expect(useSim.getState().step).toBe(0);
  });
});

describe('expanded assessment', () => {
  it('covers image-based ICDAS, activity, treatment planning, deep caries and primary teeth', () => {
    for (const t of ['activity', 'treatment', 'deep-caries', 'primary'] as const) expect(QUIZ.filter((q) => q.topic === t).length, t).toBeGreaterThanOrEqual(3);
    const images = QUIZ.filter((q) => q.figure);
    expect(images.length).toBeGreaterThanOrEqual(4);
    for (const q of images) expect(q.options[q.correctIndex]).toBe(`ICDAS ${q.figure}`);
    for (const q of QUIZ.filter((x) => x.verification)) {
      expect(q.verification).toBe('draft_pending_review');
      q.refs.forEach((r) => expect(getReference(r), r).toBeDefined());
    }
  });

  it('shows image items without giving the answer away, and summarises strengths and weaknesses', async () => {
    const user = userEvent.setup();
    const first = QUIZ.findIndex((q) => q.figure);
    useSim.setState({ ...initialState, quiz: { index: first, answers: QUIZ.map(() => null), finished: false } });
    render(<App />);
    await user.click(screen.getByRole('button', { name: /knowledge assessment/i }));
    useSim.setState({ quiz: { index: first, answers: QUIZ.map(() => null), finished: false } });
    const img = await screen.findByRole('img', { name: /identify the icdas code/i });
    expect(img.getAttribute('aria-label')).not.toMatch(/ICDAS \d/);
    expect(screen.getByText(/draft · requires expert verification/i)).toBeInTheDocument();
    // Finish with every answer wrong except the anatomy items.
    useSim.setState({
      quiz: { index: QUIZ.length - 1, answers: QUIZ.map((q) => (q.topic === 'anatomy' ? q.correctIndex : (q.correctIndex + 1) % q.options.length)), finished: true },
    });
    const summary = await screen.findByTestId('quiz-summary');
    expect(summary).toHaveTextContent(/anatomy/i);
    expect(within(summary).getAllByRole('button', { name: /revise this topic/i }).length).toBeGreaterThan(3);
  });
});
