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
    expect(r.pathways.find((p) => p.id === 'non-restorable')?.fit).toBe('refer');
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

describe('caries pathway upgrade (ICDAS, cleansability, dentition, follow-up)', () => {
  it('treats a sound surface (ICDAS 0) with prevention only', () => {
    const r = run({ icdas: '0', cavitation: 'non-cavitated', depth: 'enamel' });
    expect(r.pathways.map((p) => p.id)).toEqual(['prevent']);
    expect(r.visual.lesion?.enamelDepth).toBe(0);
    expect(run({ icdas: '0', risk: 'high' }).pathways.map((p) => p.id)).toContain('seal-sound');
  });

  it('labels every option with an intervention category', () => {
    for (const patch of [{}, { icdas: '5', cavitation: 'cavitated', depth: 'middle-dentin' }, { icdas: '6', cavitation: 'cavitated', depth: 'deep-dentin' }] as Partial<DiagnosisInput>[]) {
      for (const p of run(patch).pathways) expect(['preventive', 'non-operative', 'micro-invasive', 'restorative', 'pulp', 'extraction']).toContain(p.category);
    }
  });

  it('offers non-restorative cavity control for an arrested, cleansable cavity', () => {
    const r = run({ icdas: '5', cavitation: 'cavitated', depth: 'outer-dentin', activity: 'inactive', cleansability: 'cleansable' });
    expect(r.pathways.find((p) => p.id === 'ncc')?.fit).toBe('consider');
    expect(r.pathways.find((p) => p.id === 'restore')?.fit).toBe('may-consider');
    const closed = run({ icdas: '5', cavitation: 'cavitated', depth: 'outer-dentin', activity: 'active', cleansability: 'non-cleansable' });
    expect(closed.pathways.find((p) => p.id === 'restore')?.fit).toBe('consider');
    expect(closed.pathways.map((p) => p.id)).not.toContain('ncc');
  });

  it('offers micro-invasive care for a non-cavitated proximal lesion, and no occlusal sealant', () => {
    const ids2 = ids({ surface: 'proximal', depth: 'enamel' });
    expect(ids2).toContain('infiltration');
    expect(ids2).not.toContain('seal');
    expect(run({ surface: 'proximal' }).pathways.find((p) => p.id === 'infiltration')?.category).toBe('micro-invasive');
  });

  it('adds primary-tooth options and alerts', () => {
    const r = run({ dentition: 'primary', icdas: '5', cavitation: 'cavitated', depth: 'middle-dentin' });
    expect(r.pathways.find((p) => p.id === 'hall')?.fit).toBe('consider');
    expect(r.pathways.find((p) => p.id === 'sdf')?.fit).toBe('consider');
    expect(r.alerts.join(' ')).toMatch(/primary teeth/i);
    expect(run({ icdas: '5', cavitation: 'cavitated', depth: 'middle-dentin' }).pathways.map((p) => p.id)).not.toContain('hall');
  });

  it('keeps selective removal as the deep-caries option and never recommends complete excavation', () => {
    const r = run({ icdas: '6', cavitation: 'cavitated', depth: 'deep-dentin' });
    expect(r.pathways.find((p) => p.id === 'selective')?.fit).toBe('consider');
    expect(r.pathways.find((p) => p.id === 'non-selective')?.fit).toBe('generally-not-indicated');
    expect(r.alerts.join(' ')).toMatch(/assess the pulp/i);
  });

  it('flags disagreement between visual and radiographic findings', () => {
    expect(run({ icdas: '1', depth: 'deep-dentin' }).alerts.join(' ')).toMatch(/disagree/i);
    expect(run({ icdas: '6', cavitation: 'cavitated', depth: 'enamel' }).alerts.join(' ')).toMatch(/cannot be confined to enamel/i);
  });

  it('always gives follow-up, tied to risk and to the chosen pathway', () => {
    expect(run({ risk: 'high' }).followUp.join(' ')).toMatch(/shorter recall/i);
    expect(run({ icdas: '6', cavitation: 'cavitated', depth: 'deep-dentin' }).followUp.join(' ')).toMatch(/pulp sensibility/i);
    expect(run({}).followUp.length).toBeGreaterThan(0);
  });
});
