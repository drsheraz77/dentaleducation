import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { initialState, useSim } from '../state/store';
import { getTimeline } from '../state/selectors';
import { getReference } from '../data/references';
import { COMPARABLE_STAGES, KNOWLEDGE_CHECK, LESSON_STAGES, LESION_BY_STAGE, STUDIO_STATUS, studioScore } from '../data/studio/cariesLesson';
import { LOWER_MOLAR_47, STUDIO_ASSETS } from '../data/studio/assets';

// jsdom has no WebGL: replace the studio viewer with a probe of the state it renders from.
// The real viewer renders the toolbar once the model is ready; the probe does the same.
vi.mock('../three/studio/DentalModelViewer', async () => {
  const { useSim } = await import('../state/store');
  const { SceneToolbar } = await import('../components/controls/SceneToolbar');
  return {
    DentalModelViewer: () => {
      const s = useSim();
      return (
        <>
          <pre data-testid="studio-probe">{JSON.stringify({ step: s.step, viewMode: s.viewMode, layers: s.studioLayers, autoRotate: s.autoRotate, compare: s.studioCompare })}</pre>
          <SceneToolbar />
        </>
      );
    },
  };
});
vi.mock('../three/ToothScene', () => ({ ToothScene: () => <div data-testid="scene-probe" /> }));

const probe = () => JSON.parse(screen.getByTestId('studio-probe').textContent ?? '{}');

beforeEach(() => {
  useSim.setState(initialState);
});

describe('studio lesson data', () => {
  it('has the six required stages in order, all pending expert review', () => {
    expect(LESSON_STAGES.map((s) => s.id)).toEqual(['sound', 'early', 'dentin', 'cavitated', 'compare', 'check']);
    expect(STUDIO_STATUS).toBe('draft_pending_review');
    for (const s of LESSON_STAGES) expect(s.verification).toBe('draft_pending_review');
  });

  it('separates model-based from illustrative content on every stage', () => {
    for (const s of LESSON_STAGES) {
      expect(s.modelBased.length, s.id).toBeGreaterThan(0);
      expect(Array.isArray(s.illustrative)).toBe(true);
      if (s.lesion) expect(s.illustrative.length, s.id).toBeGreaterThan(0);
    }
  });

  it('cites only references that exist', () => {
    const ids = [...LESSON_STAGES.flatMap((s) => s.refs), ...KNOWLEDGE_CHECK.flatMap((q) => q.refs)];
    for (const id of ids) expect(getReference(id), id).toBeDefined();
  });

  it('increases lesion severity monotonically across the progression stages', () => {
    const { early, dentin, cavitated } = LESION_BY_STAGE;
    expect(early.dentinDepth).toBe(0);
    expect(early.cavitation).toBe(0);
    expect(dentin.enamelDepth).toBeGreaterThanOrEqual(early.enamelDepth);
    expect(dentin.dentinDepth).toBeGreaterThan(0);
    expect(cavitated.dentinDepth).toBeGreaterThan(dentin.dentinDepth);
    expect(cavitated.cavitation).toBeGreaterThan(0);
  });

  it('has well-formed knowledge-check questions with unique markers', () => {
    const markers = KNOWLEDGE_CHECK.map((q) => q.marker).filter(Boolean);
    expect(new Set(markers).size).toBe(markers.length);
    for (const q of KNOWLEDGE_CHECK) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
    const allRight = Object.fromEntries(KNOWLEDGE_CHECK.map((q) => [q.id, q.correctIndex]));
    expect(studioScore(allRight)).toEqual({ correct: KNOWLEDGE_CHECK.length, answered: KNOWLEDGE_CHECK.length, total: KNOWLEDGE_CHECK.length });
    expect(studioScore({})).toEqual({ correct: 0, answered: 0, total: KNOWLEDGE_CHECK.length });
  });

  it('records provenance and licence for every studio asset', () => {
    for (const a of STUDIO_ASSETS) {
      expect(a.source.url).toMatch(/^https:\/\//);
      expect(a.source.author).toBeTruthy();
      expect(a.source.licence).toBeTruthy();
      expect(a.source.licenceUrl).toMatch(/^https:\/\//);
      expect(a.source.attribution).toBeTruthy();
      expect(a.source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.modifications.length).toBeGreaterThan(0);
      expect(a.verification).toBe('draft_pending_review');
      expect(a.path).not.toMatch(/^https?:/); // served locally, never hotlinked
    }
    expect(LOWER_MOLAR_47.source.commercialUse).toBe(false);
  });
});

describe('studio store', () => {
  it('opens each stage in its own view and follows the timeline', () => {
    useSim.getState().setTopic('studio');
    expect(useSim.getState().viewMode).toBe('external');
    expect(getTimeline(useSim.getState())).toHaveLength(6);
    useSim.getState().setStep(2);
    expect(useSim.getState().viewMode).toBe(LESSON_STAGES[2].section ? 'section' : 'external');
  });

  it('keeps at least two stages in the comparison, in progression order', () => {
    const st = () => useSim.getState();
    st().toggleCompareStage('sound');
    expect(st().studioCompare).toEqual(['sound', 'early', 'dentin', 'cavitated']);
    st().toggleCompareStage('dentin');
    st().toggleCompareStage('early');
    expect(st().studioCompare).toEqual(['sound', 'cavitated']);
    st().toggleCompareStage('sound');
    expect(st().studioCompare).toEqual(['sound', 'cavitated']);
    expect(st().studioCompare.every((id) => (COMPARABLE_STAGES as readonly string[]).includes(id))).toBe(true);
  });

  it('locks the first answer to each question until reset', () => {
    const st = () => useSim.getState();
    st().answerStudio('kc-tissue', 1);
    st().answerStudio('kc-tissue', 0);
    expect(st().studioAnswers['kc-tissue']).toBe(1);
    st().resetStudioAnswers();
    expect(st().studioAnswers).toEqual({});
  });
});

describe('studio UI', () => {
  async function openStudio() {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /caries learning studio/i }));
    await screen.findByTestId('studio-probe');
    return user;
  }

  it('shows stage, layer and toolbar controls that drive the viewer state', async () => {
    const user = await openStudio();
    const toolbar = screen.getByRole('toolbar', { name: /3d view controls/i });
    expect(within(toolbar).queryByRole('button', { name: /gingiva/i })).toBeNull();

    await user.click(within(toolbar).getByRole('button', { name: /auto-rotate/i }));
    expect(probe().autoRotate).toBe(true);

    const layers = screen.getByRole('group', { name: /^layers$/i });
    await user.click(within(layers).getByRole('button', { name: /pulp/i }));
    expect(probe().layers.pulp).toBe(false);

    await user.click(within(toolbar).getByRole('button', { name: /cross-section/i }));
    expect(probe().viewMode).toBe('section');

    const stages = screen.getByRole('group', { name: /lesson stages/i });
    await user.click(within(stages).getByRole('button', { name: /cavitated/i }));
    expect(probe().step).toBe(3);
    expect(screen.getByRole('heading', { name: LESSON_STAGES[3].title })).toBeInTheDocument();
  });

  it('locks the cross-section on the comparison stage and offers stage choices', async () => {
    const user = await openStudio();
    await user.click(within(screen.getByRole('group', { name: /lesson stages/i })).getByRole('button', { name: /compare/i }));
    const toolbar = screen.getByRole('toolbar', { name: /3d view controls/i });
    expect(within(toolbar).getByRole('button', { name: /cross-section/i })).toBeDisabled();
    const compare = screen.getByRole('group', { name: /stages to compare/i });
    await user.click(within(compare).getByRole('button', { name: /sound/i }));
    expect(probe().compare).toEqual(['sound', 'early', 'dentin', 'cavitated']);
  });

  it('runs the knowledge check with feedback and a score', async () => {
    const user = await openStudio();
    await user.click(within(screen.getByRole('group', { name: /lesson stages/i })).getByRole('button', { name: /check/i }));
    const q1 = screen.getByRole('region', { name: 'Question 1' });
    const right = KNOWLEDGE_CHECK[0].options[KNOWLEDGE_CHECK[0].correctIndex];
    await user.click(within(q1).getByRole('button', { name: right }));
    expect(within(q1).getByRole('status')).toHaveTextContent(/correct/i);
    expect(screen.getByTestId('studio-score')).toHaveTextContent('Score: 1 / 1 answered');
  });

  it('attributes the scan and states its non-commercial licence', async () => {
    await openStudio();
    const info = screen.getByRole('complementary', { name: /information panel/i });
    expect(within(info).getByText(/Nate Saindon/)).toBeInTheDocument();
    expect(within(info).getAllByText(/CC BY-NC 4\.0/).length).toBeGreaterThan(0);
    expect(within(info).getAllByText(/requires expert verification/i).length).toBeGreaterThan(0);
  });
});
