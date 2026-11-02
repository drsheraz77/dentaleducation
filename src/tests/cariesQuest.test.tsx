import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { initialState, useSim } from '../state/store';
import { deriveScene, getTimeline } from '../state/selectors';
import { ICDAS_CAVITATION, evaluateDiagnosis } from '../modules/diagnosis/decisionEngine';
import { getReference } from '../data/references';
import { GAME_STATUS, ICDAS_OPTIONS, PATHWAY_TITLES, QUEST_CASES, QUEST_CASE_BY_ID } from '../data/game/cariesQuest';
import { ICDAS_CODES } from '../data/cariesStages';
import { POINTS, gradeManagement, managementOptions, questRank, questScore, shuffled } from '../modules/game/cariesQuest';

vi.mock('../three/ToothScene', () => ({ ToothScene: () => <div data-testid="scene-probe" /> }));

beforeEach(() => {
  useSim.setState(initialState);
});


describe('Caries Quest content', () => {
  it('has at least eight draft cases with unique ids', () => {
    expect(QUEST_CASES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(QUEST_CASES.map((c) => c.id)).size).toBe(QUEST_CASES.length);
    expect(GAME_STATUS).toBe('draft_pending_review');
    for (const c of QUEST_CASES) expect(c.verification).toBe('draft_pending_review');
  });

  it('keys each ICDAS code consistently with the case findings', () => {
    expect(ICDAS_OPTIONS).toEqual(ICDAS_CODES.map((c) => c.code));
    for (const c of QUEST_CASES) {
      const n = Number(c.input.icdas);
      // Cavitation status follows the code; codes 4–6 involve dentin, 1–3 do not on visual grounds.
      expect(c.input.cavitation, c.id).toBe(ICDAS_CAVITATION[c.input.icdas]);
      if (n >= 4) expect(c.input.depth, c.id).not.toBe('enamel');
      if (n >= 1 && n <= 3) expect(c.input.depth, c.id).toBe('enamel');
      expect(evaluateDiagnosis(c.input).alerts.join(' '), c.id).not.toMatch(/disagree|cannot be confined/);
    }
  });

  it('covers the required scenario types, in permanent and primary teeth', () => {
    const has = (pred: (c: (typeof QUEST_CASES)[number]) => boolean) => QUEST_CASES.some(pred);
    const i = (c: (typeof QUEST_CASES)[number]) => c.input;
    expect(has((c) => i(c).activity === 'active' && i(c).cavitation === 'non-cavitated' && i(c).depth === 'enamel')).toBe(true);
    expect(has((c) => i(c).activity === 'inactive' && i(c).cavitation === 'non-cavitated' && i(c).depth === 'enamel')).toBe(true);
    expect(has((c) => i(c).cavitation === 'cavitated' && i(c).cleansability === 'cleansable')).toBe(true);
    expect(has((c) => i(c).cavitation === 'cavitated' && i(c).cleansability === 'non-cleansable' && i(c).depth !== 'enamel')).toBe(true);
    expect(has((c) => i(c).depth === 'deep-dentin' && i(c).pulp !== 'irreversible-signs' && i(c).pulp !== 'non-responsive' && c.keyed === 'selective')).toBe(true);
    expect(has((c) => (i(c).pulp === 'irreversible-signs' || i(c).pulp === 'non-responsive') && c.keyed === 'endo')).toBe(true);
    expect(has((c) => i(c).dentition === 'primary')).toBe(true);
  });

  it('asks for a justification with one sound answer per case', () => {
    for (const c of QUEST_CASES) {
      expect(new Set(c.justify.options).size, c.id).toBe(4);
      expect(c.justify.correct).toBeGreaterThanOrEqual(0);
      expect(c.justify.correct).toBeLessThan(4);
      expect(c.justify.explanation.length).toBeGreaterThan(20);
    }
  });

  it('never keys complete excavation for deep caries', () => {
    for (const c of QUEST_CASES) expect(c.keyed, c.id).not.toBe('non-selective');
    const deep = QUEST_CASES.filter((c) => c.others.includes('non-selective') && c.input.depth === 'deep-dentin');
    for (const c of deep) expect(gradeManagement(c, 'non-selective').grade, c.id).toBe('wrong');
  });

  it('grades management with the reviewed decision pathway: the keyed answer is the only best fit', () => {
    for (const c of QUEST_CASES) {
      const opts = managementOptions(c);
      expect(new Set(opts).size, c.id).toBe(4);
      expect(gradeManagement(c, c.keyed).grade, c.id).toBe('best');
      for (const id of c.others) expect(gradeManagement(c, id).grade, `${c.id} → ${id}`).not.toBe('best');
    }
  });

  it('words every option exactly as the decision pathway titles it', () => {
    for (const c of QUEST_CASES) {
      for (const p of evaluateDiagnosis(c.input).pathways) expect(PATHWAY_TITLES[p.id as keyof typeof PATHWAY_TITLES], p.id).toBe(p.title);
    }
  });

  it('cites only existing references in its feedback', () => {
    for (const c of QUEST_CASES) for (const id of gradeManagement(c, c.keyed).pathway!.refs) expect(getReference(id), id).toBeDefined();
  });
});

describe('Caries Quest scoring', () => {
  const order = QUEST_CASES.map((c) => c.id);
  const perfect = Object.fromEntries(QUEST_CASES.map((c) => [c.id, { detect: c.input.icdas, manage: c.keyed, justify: c.justify.correct }]));

  it('a perfect run scores the maximum, with growing streak bonuses', () => {
    const s = questScore(order, perfect);
    expect(s.points).toBe(s.max);
    expect(s.bestStreak).toBe(order.length);
    expect(s.rounds[0].bonus).toBe(0);
    expect(s.rounds[1].bonus).toBe(POINTS.streakStep);
    expect(questRank(s.points, s.max).title).toBe('Cariology Ace');
  });

  it('gives partial credit for an option that can be considered, and breaks the streak', () => {
    const shadow = QUEST_CASE_BY_ID['q-dentin-shadow'];
    expect(gradeManagement(shadow, 'restore').grade).toBe('partial');
    const s = questScore(['q-chalky-fissure', 'q-dentin-shadow', 'q-cavity-dentin'], {
      'q-chalky-fissure': perfect['q-chalky-fissure'],
      'q-dentin-shadow': { detect: '4', manage: 'restore', justify: QUEST_CASE_BY_ID['q-dentin-shadow'].justify.correct },
      'q-cavity-dentin': perfect['q-cavity-dentin'],
    });
    expect(s.rounds[1].points).toBe(POINTS.detect + POINTS.managePartial + POINTS.justify);
    expect(s.rounds[2].bonus).toBe(0);
    expect(s.streak).toBe(1);
  });

  it('scores a wrong detection and an unlisted option as zero', () => {
    const wrongJustify = (QUEST_CASE_BY_ID['q-cavity-dentin'].justify.correct + 1) % 4;
    const s = questScore(['q-cavity-dentin'], { 'q-cavity-dentin': { detect: '2', manage: 'seal', justify: wrongJustify } });
    expect(s.points).toBe(0);
    expect(questRank(0, s.max).title).toBe('Dental Explorer');
  });

  it('shuffles without losing or duplicating cases', () => {
    let x = 0.123;
    const rnd = () => (x = (x * 9301 + 49297) % 233280 / 233280);
    expect([...shuffled(order, rnd)].sort()).toEqual([...order].sort());
  });
});

describe('Caries Quest state', () => {
  it('locks answers, requires detection first, and switches the view', () => {
    const st = () => useSim.getState();
    st().setTopic('game');
    st().startGame(() => 0.5);
    const id = st().game.order[0];
    st().answerGameManage(id, 'seal');
    expect(st().game.answers[id]).toBeUndefined();
    st().answerGameDetect(id, '5');
    st().answerGameDetect(id, '6');
    expect(st().game.answers[id].detect).toBe('5');
    expect(st().viewMode).toBe('section');
    st().answerGameManage(id, 'restore');
    st().answerGameManage(id, 'seal');
    expect(st().game.answers[id].manage).toBe('restore');
    st().answerGameJustify(id, 2);
    st().answerGameJustify(id, 1);
    expect(st().game.answers[id].justify).toBe(2);
    st().nextGameCase();
    expect(st().game.index).toBe(1);
    expect(st().viewMode).toBe('external');
    expect(getTimeline(st())).toEqual([]);
  });

  it('shows each case lesion in 3D through the reviewed diagnosis mapping', () => {
    const st = () => useSim.getState();
    st().setTopic('game');
    st().startGame(() => 0);
    const c = QUEST_CASE_BY_ID[st().game.order[0]];
    const tooth = deriveScene(st()).teeth[0].visual;
    expect(tooth.lesion).toEqual(evaluateDiagnosis(c.input).visual.lesion);
    expect(tooth.biofilm).toBe(0); // cleaned and dried for ICDAS
  });
});

describe('Caries Quest UI', () => {
  it('plays a full game from start to results', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /caries quest/i }));
    await screen.findByTestId('scene-probe');
    const info = screen.getByRole('complementary', { name: /information panel/i });
    await user.click(within(info).getByRole('button', { name: 'Start game' }));

    for (let i = 0; i < QUEST_CASES.length; i++) {
      const c = QUEST_CASE_BY_ID[useSim.getState().game.order[i]];
      const label = `ICDAS ${c.input.icdas} · ${ICDAS_CODES.find((x) => x.code === c.input.icdas)!.label}`;
      await user.click(within(info).getByRole('button', { name: label }));
      expect(within(info).getAllByRole('status')[0]).toHaveTextContent(/correct/i);
      await user.click(within(info).getByRole('button', { name: PATHWAY_TITLES[c.keyed] }));
      expect(within(info).getAllByRole('status')[1]).toHaveTextContent(/best fit/i);
      // Reasoning is not shown until the justification is given.
      expect(within(info).getAllByRole('status')[1]).not.toHaveTextContent(c.justify.explanation);
      await user.click(within(info).getByRole('button', { name: c.justify.options[c.justify.correct] }));
      expect(within(info).getAllByRole('status')[2]).toHaveTextContent(/sound reasoning/i);
      await user.click(within(info).getByRole('button', { name: i === QUEST_CASES.length - 1 ? 'See results' : /next case/i }));
    }
    const s = questScore(useSim.getState().game.order, useSim.getState().game.answers);
    expect(screen.getByTestId('quest-final')).toHaveTextContent(`${s.max}`);
    expect(within(info).getByRole('heading', { name: 'Cariology Ace' })).toBeInTheDocument();
    expect(screen.getByTestId('quest-points')).toHaveTextContent(String(s.max));
    expect(within(info).getAllByText(/requires expert verification/i).length).toBeGreaterThan(0);
  });
});
