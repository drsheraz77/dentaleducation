import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { initialState, useSim } from '../state/store';
import { QUIZ } from '../data/quiz';

// jsdom has no WebGL: replace the canvas with a probe that exposes the derived scene.
vi.mock('../three/ToothScene', async () => {
  const { useSim } = await import('../state/store');
  const { deriveScene } = await import('../state/selectors');
  return {
    ToothScene: () => {
      const scene = deriveScene(useSim());
      return <pre data-testid="scene-probe">{JSON.stringify(scene.teeth.map((t) => t.visual))}</pre>;
    },
  };
});

const probe = () => JSON.parse(screen.getByTestId('scene-probe').textContent ?? '[]');

beforeEach(() => {
  useSim.setState(initialState);
});

/** The 3D scene is lazy-loaded; wait for it before interacting. */
async function renderApp() {
  render(<App />);
  await screen.findByTestId('scene-probe');
}

describe('application shell', () => {
  it('renders navigation, workspace, info panel and timeline', async () => {
    await renderApp();
    expect(screen.getByRole('navigation', { name: /learning modules/i })).toBeInTheDocument();
    expect(screen.getByTestId('scene-probe')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /information panel/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/animation timeline/i)).toBeInTheDocument();
    for (const name of ['Dental anatomy', 'Dental caries', 'Lesion classification', 'Diagnosis & treatment planning', 'Cavity preparation', 'Restorative materials', 'Clinical cases', 'Knowledge assessment']) {
      expect(screen.getByRole('button', { name: new RegExp(name.replace('&', '&'), 'i') })).toBeInTheDocument();
    }
  });

  it('selecting a structure shows its educational description', async () => {
    const user = userEvent.setup();
    await renderApp();
    const controls = screen.getByLabelText('Anatomy controls');
    await user.click(within(controls).getByRole('button', { name: 'Pulp' }));
    const info = screen.getByRole('complementary');
    expect(within(info).getByRole('heading', { name: /pulp/i })).toBeInTheDocument();
    expect(within(info).getByText(/Importance in caries progression/i)).toBeInTheDocument();
  });

  it('toggles cross-section, labels and pathology from the toolbar', async () => {
    const user = userEvent.setup();
    await renderApp();
    // Anatomy opens on the textbook longitudinal section; the toolbar toggles it off and on.
    expect(useSim.getState().viewMode).toBe('section');
    await user.click(screen.getByRole('button', { name: /cross-section/i }));
    expect(useSim.getState().viewMode).toBe('external');
    await user.click(screen.getByRole('button', { name: /cross-section/i }));
    expect(useSim.getState().viewMode).toBe('section');
    await user.click(screen.getByRole('button', { name: /labels/i }));
    expect(useSim.getState().showLabels).toBe(false);
    await user.click(screen.getByRole('button', { name: /normal anatomy/i }));
    expect(probe()[0].lesion).not.toBeNull();
  });
});

describe('dentin tubules view', () => {
  it('switches to the magnified view and responds to stimulus and recession', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('tab', { name: 'Dentin tubules' }));
    expect(screen.queryByTestId('scene-probe')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cold' }));
    const banner = screen.getAllByRole('status').find((el) => el.className.includes('tubules-banner'))!;
    expect(banner).toHaveTextContent(/fluid moves, nerves fire/i);
    await user.click(screen.getByRole('button', { name: /gingival recession/i }));
    expect(banner).toHaveTextContent(/covered dentin/i);
    await user.click(screen.getByRole('tab', { name: 'Whole tooth' }));
    expect(screen.getByTestId('scene-probe')).toBeInTheDocument();
  });
});

describe('caries module', () => {
  it('stage selector changes the lesion and the explanation together', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /dental caries/i }));
    await user.click(screen.getByRole('button', { name: /2\. Biofilm/ }));
    expect(probe()[0].biofilm).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Biofilm formation' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /7\. Deep/ }));
    expect(probe()[0].lesion.dentinDepth).toBeGreaterThan(0.5);
    expect(screen.getByRole('heading', { name: /Deep caries approaching the pulp/ })).toBeInTheDocument();
  });

  it('timeline controls step through the stages', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /dental caries/i }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(useSim.getState().step).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(useSim.getState().step).toBe(1);
    await user.click(screen.getByRole('button', { name: /^Play$/ }));
    expect(useSim.getState().playing).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(useSim.getState().playing).toBe(false);
    await user.click(screen.getByRole('button', { name: /reset to first step/i }));
    expect(useSim.getState().step).toBe(0);
  });
});

describe('cavity preparation module', () => {
  it('choosing an unsuitable instrument shows feedback and leaves the tooth uncut', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /cavity preparation/i }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(probe()[0].cavity.depth).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Spoon excavator' }));
    expect(probe()[0].cavity).toBeNull();
    expect(screen.getAllByText(/cannot cut sound enamel/i).length).toBeGreaterThan(0);
  });
});

describe('restorative materials module', () => {
  it('switching from composite to GIC loads a different sequence and explanation', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /restorative materials/i }));
    const info = screen.getByRole('complementary');
    expect(within(info).getByText('Phosphoric acid etch')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /^material$/i }), 'gic');
    expect(within(info).getByRole('heading', { name: /conventional glass ionomer cement/i })).toBeInTheDocument();
    expect(within(info).getByText('Capsule activation and mixing')).toBeInTheDocument();
    expect(within(info).queryByText('Phosphoric acid etch')).not.toBeInTheDocument();
  });

  it('reports unsupported combinations', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /restorative materials/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /^material$/i }), 'gic');
    await user.selectOptions(screen.getByRole('combobox', { name: /preparation/i }), 'class-ii');
    expect(screen.getAllByText(/not supported/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no sequence to play/i)).toBeInTheDocument();
  });

  it('comparison table updates when a material changes', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /restorative materials/i }));
    await user.click(screen.getByRole('tab', { name: 'Compare' }));
    const table = screen.getByRole('table', { name: /material comparison/i });
    expect(within(table).getByRole('columnheader', { name: 'GIC' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Material B' }), 'amalgam');
    expect(within(table).getByRole('columnheader', { name: 'Amalgam' })).toBeInTheDocument();
    expect(probe().map((v: { restoration: { material: string } }) => v.restoration.material)).toEqual(['composite', 'amalgam']);
  });
});

describe('diagnosis module', () => {
  it('changing lesion depth changes the pathway', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /diagnosis/i }));
    expect(screen.queryByTestId('pathway-selective')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /cavitation status/i }), 'cavitated');
    await user.selectOptions(screen.getByRole('combobox', { name: /estimated lesion depth/i }), 'deep-dentin');
    expect(screen.getByTestId('pathway-selective')).toBeInTheDocument();
    expect(probe()[0].lesion.dentinDepth).toBeGreaterThan(0.5);
  });
});

describe('quiz', () => {
  it('scores answers, gives feedback and shows a results screen', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /knowledge assessment/i }));
    for (let i = 0; i < QUIZ.length; i++) {
      const q = QUIZ[i];
      const pick = i % 2 === 0 ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
      await user.click(screen.getByRole('button', { name: q.options[pick] }));
      expect(screen.getByRole('status')).toHaveTextContent(i % 2 === 0 ? /correct\./i : /not quite/i);
      await user.click(screen.getByRole('button', { name: /next question|see results/i }));
    }
    const expected = Math.ceil(QUIZ.length / 2);
    expect(screen.getByTestId('quiz-score')).toHaveTextContent(`${expected} / ${QUIZ.length}`);
    expect(screen.getByText(/not.*evidence of clinical competence/i)).toBeInTheDocument();
  });
});

describe('clinical case mode', () => {
  it('evaluates case answers with explanations', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Clinical case' }));
    await user.click(screen.getByRole('button', { name: /Active, non-cavitated enamel lesion/ }));
    expect(screen.getByText(/Most appropriate\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Class I preparation and composite restoration/ }));
    expect(screen.getByText(/Not appropriate\./)).toBeInTheDocument();
    expect(screen.getByText(/Take-away/)).toBeInTheDocument();
  });
});
