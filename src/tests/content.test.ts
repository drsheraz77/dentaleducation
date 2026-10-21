import { describe, expect, it } from 'vitest';
import { REFERENCES, getReference } from '../data/references';
import { ANATOMY } from '../data/anatomy';
import { CARIES_STAGES, CLASSIFICATION_EXAMPLES } from '../data/cariesStages';
import { PROCEDURES } from '../data/procedures';
import { MATERIALS } from '../data/materials';
import { INSTRUMENTS } from '../data/instruments';
import { QUIZ } from '../data/quiz';
import { CASES } from '../data/cases';
import { CONTENT_REVIEW } from '../data/review';

const allContent = [
  ...Object.values(ANATOMY),
  ...CARIES_STAGES,
  ...CLASSIFICATION_EXAMPLES,
  ...PROCEDURES,
  ...MATERIALS,
  ...Object.values(INSTRUMENTS),
  ...CASES,
];

describe('educational content integrity', () => {
  it('only cites references that exist in the reference list', () => {
    const used = [...allContent.flatMap((c) => c.refs), ...QUIZ.flatMap((q) => q.refs)];
    const missing = used.filter((id) => !getReference(id));
    expect(missing).toEqual([]);
  });

  it('has unique reference ids', () => {
    expect(new Set(REFERENCES.map((r) => r.id)).size).toBe(REFERENCES.length);
  });

  it('marks reviewed content as expert-reviewed and only known new items as drafts', () => {
    expect(CONTENT_REVIEW.status).toBe('expert-reviewed');
    expect(CONTENT_REVIEW.reviewer).not.toBe('');
    expect(CONTENT_REVIEW.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Content added after the review stays a draft until it is approved.
    const drafts = allContent.filter((c) => c.verification === 'draft-needs-expert-review').map((c) => c.id);
    expect(drafts).toEqual(['neurovascular', 'tubules']);
    allContent
      .filter((c) => !drafts.includes(c.id))
      .forEach((c) => expect(c.verification).toBe(CONTENT_REVIEW.status));
  });

  it('defines objectives, prerequisites, steps, visual state, limitations and references for each procedure', () => {
    for (const p of PROCEDURES) {
      expect(p.learningObjectives.length).toBeGreaterThan(0);
      expect(p.prerequisites.length).toBeGreaterThan(0);
      expect(p.safetyLimitations.length).toBeGreaterThan(0);
      expect(p.refs.length).toBeGreaterThan(0);
      p.steps.forEach((s) => {
        expect(s.description.length).toBeGreaterThan(10);
        expect(s.visual).toBeDefined();
      });
    }
  });

  it('describes every material fully and defines a workflow', () => {
    for (const m of MATERIALS) {
      for (const key of ['adhesion', 'moisture', 'placement', 'setting'] as const) expect(m[key].length).toBeGreaterThan(10);
      expect(m.composition.length && m.indications.length && m.advantages.length && m.limitations.length).toBeTruthy();
      expect(m.workflow.length).toBeGreaterThanOrEqual(6);
      expect(m.preparations.some((p) => p.supported)).toBe(true);
    }
  });

  it('has at least ten quiz questions covering anatomy, caries, classification and materials', () => {
    expect(QUIZ.length).toBeGreaterThanOrEqual(10);
    for (const t of ['anatomy', 'caries', 'classification', 'materials']) expect(QUIZ.some((q) => q.topic === t)).toBe(true);
    QUIZ.forEach((q) => expect(q.correctIndex).toBeLessThan(q.options.length));
  });

  it('gives every case question at least one best answer', () => {
    CASES.forEach((c) => c.questions.forEach((q) => expect(q.options.some((o) => o.appropriate === 'best')).toBe(true)));
  });
});
