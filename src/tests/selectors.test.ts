import { describe, expect, it } from 'vitest';
import { initialState, type SimState } from '../state/store';
import {
  deriveScene,
  getTimeline,
  materialSteps,
  materialSupport,
  materialVisual,
  procedureVisual,
  quizScore,
  instrumentKey,
} from '../state/selectors';
import { CARIES_STAGES } from '../data/cariesStages';
import { PROCEDURES } from '../data/procedures';
import { QUIZ } from '../data/quiz';

const state = (patch: Partial<SimState> = {}): SimState => ({ ...initialState, ...patch });

describe('caries progression', () => {
  it('has eight stages that each produce a distinct visual state', () => {
    expect(CARIES_STAGES).toHaveLength(8);
    const signatures = CARIES_STAGES.map((_, i) => {
      const v = deriveScene(state({ topic: 'caries', step: i })).teeth[0].visual;
      return JSON.stringify({ b: v.biofilm, a: v.acidChallenge, l: v.lesion });
    });
    expect(new Set(signatures).size).toBe(8);
  });

  it('deepens the lesion monotonically from initial lesion to advanced', () => {
    const depth = (i: number) => {
      const l = deriveScene(state({ topic: 'caries', step: i })).teeth[0].visual.lesion;
      return (l?.enamelDepth ?? 0) + (l?.dentinDepth ?? 0);
    };
    for (let i = 3; i < 8; i++) expect(depth(i)).toBeGreaterThan(depth(i - 1));
  });
});

describe('cavity preparation', () => {
  it.each(PROCEDURES.map((p) => p.id))('%s has 8 steps with distinct procedural states', (id) => {
    const proc = PROCEDURES.find((p) => p.id === id)!;
    expect(proc.steps).toHaveLength(8);
    const s = state({ topic: 'preparation', procedureId: id });
    const before = procedureVisual(s, id, 0);
    const access = procedureVisual(s, id, 3);
    const removal = procedureVisual(s, id, 4);
    expect(before.cavity).toBeNull();
    expect(access.cavity?.depth).toBeGreaterThan(0);
    expect(removal.cavity!.depth).toBeGreaterThan(access.cavity!.depth);
  });

  it('does not cut when an unsuitable instrument is chosen, and reports why', () => {
    const s = state({
      topic: 'preparation',
      procedureId: 'class-i',
      step: 3,
      instrumentChoices: { [instrumentKey('class-i', 'access')]: 'spoonExcavator' },
    });
    const scene = deriveScene(s);
    expect(scene.teeth[0].visual.cavity).toBeNull();
    expect(scene.notice?.tone).toBe('warning');
    expect(scene.notice?.text).toMatch(/cannot cut sound enamel/i);
    expect(scene.teeth[0].visual.instrument?.id).toBe('spoonExcavator');
  });

  it('distinguishes selective removal (residual lesion kept) from conventional preparation', () => {
    const sel = procedureVisual(state(), 'selective-removal', 4);
    const conv = procedureVisual(state(), 'class-i', 4);
    expect(sel.residualLesion).toBe(true);
    expect(conv.residualLesion).toBe(false);
    expect(sel.cavity?.shape).toBe('selective');
    expect(conv.cavity?.shape).toBe('classI');
  });

  it('renders before and after teeth in comparison mode', () => {
    const scene = deriveScene(state({ topic: 'preparation', step: 5, compareBeforeAfter: true }));
    expect(scene.teeth).toHaveLength(2);
    expect(scene.teeth[0].visual.cavity).toBeNull();
    expect(scene.teeth[1].visual.cavity?.depth).toBe(1);
  });
});

describe('restorative materials', () => {
  it('composite and GIC load different sequences', () => {
    const s = state({ topic: 'materials' });
    const composite = materialSteps(s, 'composite', 'class-i').map((x) => x.id);
    const gic = materialSteps(s, 'gic', 'class-i').map((x) => x.id);
    expect(composite).toContain('cure-adhesive');
    expect(composite).toContain('etch');
    expect(gic).toContain('condition');
    expect(gic).toContain('mix');
    expect(gic).not.toContain('cure-adhesive');
    expect(composite).not.toEqual(gic);
  });

  it('adhesive protocol changes the composite sequence', () => {
    const er = materialSteps(state({ adhesiveProtocol: 'etch-and-rinse' }), 'composite', 'class-i').map((x) => x.id);
    const se = materialSteps(state({ adhesiveProtocol: 'self-etch' }), 'composite', 'class-i').map((x) => x.id);
    const see = materialSteps(state({ adhesiveProtocol: 'selective-enamel-etch' }), 'composite', 'class-i').map((x) => x.id);
    expect(er).toContain('etch');
    expect(se).not.toContain('etch');
    expect(se).not.toContain('rinse');
    expect(see).toContain('etch-enamel');
  });

  it('adds a matrix step only for Class II', () => {
    expect(materialSteps(state(), 'composite', 'class-ii').some((s) => s.id === 'matrix')).toBe(true);
    expect(materialSteps(state(), 'composite', 'class-i').some((s) => s.id === 'matrix')).toBe(false);
  });

  it('places composite incrementally but GIC in bulk', () => {
    const s = state();
    const cSteps = materialSteps(s, 'composite', 'class-ii');
    const cFinal = materialVisual(s, 'composite', 'class-ii', cSteps.length - 1);
    const gSteps = materialSteps(s, 'gic', 'class-i');
    const gFinal = materialVisual(s, 'gic', 'class-i', gSteps.length - 1);
    expect(cFinal.restoration?.totalIncrements).toBe(3);
    expect(cFinal.restoration?.material).toBe('composite');
    expect(gFinal.restoration?.totalIncrements).toBe(1);
    expect(gFinal.restoration?.material).toBe('gic');
    expect(gFinal.restoration?.coated).toBe(true);
  });

  it('gives clear feedback for unsupported combinations', () => {
    expect(materialSupport('gic', 'class-ii').supported).toBe(false);
    expect(materialSteps(state(), 'gic', 'class-ii')).toHaveLength(0);
    const scene = deriveScene(state({ topic: 'materials', materialId: 'gic', materialPreparation: 'class-ii' }));
    expect(scene.notice?.tone).toBe('warning');
    expect(getTimeline(state({ topic: 'materials', materialId: 'gic', materialPreparation: 'class-ii' }))).toHaveLength(0);
  });

  it('comparison shows the two selected materials and updates when one changes', () => {
    const a = deriveScene(state({ topic: 'materials', materialsTab: 'compare', compareA: 'composite', compareB: 'gic' }));
    expect(a.teeth.map((t) => t.visual.restoration?.material)).toEqual(['composite', 'gic']);
    const b = deriveScene(state({ topic: 'materials', materialsTab: 'compare', compareA: 'composite', compareB: 'amalgam' }));
    expect(b.teeth.map((t) => t.visual.restoration?.material)).toEqual(['composite', 'amalgam']);
    // Calcium silicate shows its liner under a sealing restoration in its own (selective) preparation.
    const c = deriveScene(state({ topic: 'materials', materialsTab: 'compare', compareA: 'calciumSilicate', compareB: 'gic' }));
    expect(c.teeth[0].visual.liner).not.toBeNull();
    expect(c.teeth[0].visual.cavity?.shape).toBe('selective');
  });
});

describe('quiz scoring', () => {
  it('counts only correct answers', () => {
    const answers = QUIZ.map((q, i) => (i < 4 ? q.correctIndex : (q.correctIndex + 1) % q.options.length));
    expect(quizScore(answers)).toEqual({ correct: 4, answered: QUIZ.length, total: QUIZ.length });
    expect(quizScore(QUIZ.map(() => null))).toEqual({ correct: 0, answered: 0, total: QUIZ.length });
  });
});
