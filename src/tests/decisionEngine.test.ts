import { describe, expect, it } from 'vitest';
import { DEFAULT_DIAGNOSIS, evaluateDiagnosis } from '../modules/diagnosis/decisionEngine';
import type { DiagnosisInput } from '../types';

const run = (patch: Partial<DiagnosisInput>) => evaluateDiagnosis({ ...DEFAULT_DIAGNOSIS, ...patch });
const ids = (patch: Partial<DiagnosisInput>) => run(patch).pathways.map((p) => p.id);

describe('educational decision pathway', () => {
  it('favours non-operative care and sealing for an active non-cavitated enamel lesion', () => {
    const r = ids({ activity: 'active', cavitation: 'non-cavitated', depth: 'enamel' });
    expect(r).toEqual(expect.arrayContaining(['non-operative', 'seal', 'remin']));
    expect(r).not.toContain('restore');
    expect(r).not.toContain('selective');
  });

  it('suggests monitoring for an inactive non-cavitated lesion', () => {
    expect(ids({ activity: 'inactive' })).toContain('monitor');
  });

  it('shows a different pathway for a deep lesion than for a shallow one', () => {
    const shallow = ids({ cavitation: 'cavitated', depth: 'outer-dentin' });
    const deep = ids({ cavitation: 'cavitated', depth: 'deep-dentin' });
    expect(shallow).toContain('restore');
    expect(deep).toEqual(expect.arrayContaining(['selective', 'stepwise', 'non-selective']));
    expect(run({ cavitation: 'cavitated', depth: 'deep-dentin' }).pathways.find((p) => p.id === 'non-selective')?.fit).toBe(
      'generally-not-indicated',
    );
    expect(deep).not.toEqual(shallow);
  });

  it('flags irreversible pulpitis for endodontic assessment instead of caries removal options', () => {
    const r = run({ cavitation: 'cavitated', depth: 'deep-dentin', symptoms: 'spontaneous-lingering', pulp: 'irreversible-signs' });
    expect(r.pathways.map((p) => p.id)).toContain('endo');
    expect(r.pathways.map((p) => p.id)).not.toContain('selective');
    expect(r.alerts.join(' ')).toMatch(/irreversible pulpitis/i);
  });

  it('routes a non-restorable tooth to discussion/referral', () => {
    const r = run({ cavitation: 'cavitated', depth: 'middle-dentin', restorability: 'non-restorable' });
    expect(r.pathways[0].fit).toBe('refer');
    expect(r.pathways.map((p) => p.id)).not.toContain('restore');
  });

  it('never returns a single "correct" treatment and always explains reasoning', () => {
    const combos: Partial<DiagnosisInput>[] = [
      {},
      { cavitation: 'cavitated', depth: 'middle-dentin' },
      { cavitation: 'cavitated', depth: 'deep-dentin' },
      { activity: 'inactive', cavitation: 'cavitated', depth: 'outer-dentin' },
    ];
    for (const c of combos) {
      const r = run(c);
      expect(r.pathways.length).toBeGreaterThan(1);
      r.pathways.forEach((p) => expect(p.reasoning.length).toBeGreaterThan(0));
    }
  });

  it('updates the 3D lesion with the selected depth', () => {
    expect(run({ depth: 'enamel' }).visual.lesion?.dentinDepth).toBe(0);
    expect(run({ depth: 'deep-dentin' }).visual.lesion!.dentinDepth).toBeGreaterThan(run({ depth: 'outer-dentin' }).visual.lesion!.dentinDepth);
  });
});
