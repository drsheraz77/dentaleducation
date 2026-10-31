import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { initialState, useSim } from '../state/store';
import { deriveScene, getTimeline } from '../state/selectors';
import { evaluateDiagnosis } from '../modules/diagnosis/decisionEngine';
import { getReference } from '../data/references';
import { GAME_STATUS, ICDAS_BANDS, PATHWAY_TITLES, QUEST_CASES, QUEST_CASE_BY_ID, type IcdasBand } from '../data/game/cariesQuest';
import { POINTS, gradeManagement, managementOptions, questRank, questScore, shuffled } from '../modules/game/cariesQuest';
import type { DiagnosisInput } from '../types';

vi.mock('../three/ToothScene', () => ({ ToothScene: () => <div data-testid="scene-probe" /> }));

beforeEach(() => {
  useSim.setState(initialState);
});

/** ICDAS band implied by the scenario fields (visual cavitation status plus whether dentin is involved). */
function expectedBand(i: DiagnosisInput): IcdasBand {
  if (i.cavitation === 'microcavity') return '3';
  if (i.cavitation === 'non-cavitated') return i.depth === 'enamel' ? '1–2' : '4';
  return i.depth === 'deep-dentin' ? '6' : '5';
}

describe('Caries Quest content', () => {
  it('has at least eight draft cases with unique ids', () => {
    expect(QUEST_CASES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(QUEST_CASES.map((c) => c.id)).size).toBe(QUEST_CASES.length);
    expect(GAME_STATUS).toBe('draft_pending_review');
    for (const c of QUEST_CASES) expect(c.verification).toBe('draft_pending_review');
  });

  it('keys each ICDAS answer consistently with the case findings', () => {
    for (const c of QUEST_CASES) expect(c.icdas, c.id).toBe(expectedBand(c.input));
    expect(ICDAS_BANDS.map((b) => b.band)).toEqual(['1–2', '3', '4', '5', '6']);
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
  const perfect = Object.fromEntries(QUEST_CASES.map((c) => [c.id, { detect: c.icdas, manage: c.keyed }]));

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
      'q-dentin-shadow': { detect: '4', manage: 'restore' },
      'q-cavity-dentin': perfect['q-cavity-dentin'],
    });
    expect(s.rounds[1].points).toBe(POINTS.detect + POINTS.managePartial);
    expect(s.rounds[2].bonus).toBe(0);
    expect(s.streak).toBe(1);
  });

  it('scores a wrong detection and an unlisted option as zero', () => {
    const s = questScore(['q-cavity-dentin'], { 'q-cavity-dentin': { detect: '1–2', manage: 'seal' } });
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
      await user.click(within(info).getByRole('button', { name: ICDAS_BANDS.find((b) => b.band === c.icdas)!.label }));
      expect(within(info).getAllByRole('status')[0]).toHaveTextContent(/correct/i);
      await user.click(within(info).getByRole('button', { name: PATHWAY_TITLES[c.keyed] }));
      expect(within(info).getAllByRole('status')[1]).toHaveTextContent(/best fit/i);
      await user.click(within(info).getByRole('button', { name: i === QUEST_CASES.length - 1 ? 'See results' : /next case/i }));
    }
    const s = questScore(useSim.getState().game.order, useSim.getState().game.answers);
    expect(screen.getByTestId('quest-final')).toHaveTextContent(`${s.max}`);
    expect(within(info).getByRole('heading', { name: 'Cariology Ace' })).toBeInTheDocument();
    expect(screen.getByTestId('quest-points')).toHaveTextContent(String(s.max));
    expect(within(info).getAllByText(/requires expert verification/i).length).toBeGreaterThan(0);
  });
});
