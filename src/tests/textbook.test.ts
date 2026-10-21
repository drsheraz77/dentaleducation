import { describe, expect, it } from 'vitest';
import { textbookAnchors } from '../three/AnatomyLabels';
import { isTextbookView, mergeVisual } from '../state/selectors';
import { CARIES_STAGES } from '../data/cariesStages';

describe('textbook anatomy section', () => {
  it('is used for the anatomy module in section view only', () => {
    expect(isTextbookView({ topic: 'anatomy', viewMode: 'section' })).toBe(true);
    expect(isTextbookView({ topic: 'anatomy', viewMode: 'external' })).toBe(false);
    expect(isTextbookView({ topic: 'caries', viewMode: 'section' })).toBe(false);
  });

  it('labels every tissue of the figure with callouts and adds crown/root brackets', () => {
    const anchors = textbookAnchors(mergeVisual({}), true);
    const ids = anchors.filter((a) => a.kind === 'callout').map((a) => a.structureId);
    expect(ids).toEqual(
      expect.arrayContaining(['enamel', 'dentin', 'pulp', 'rootCanal', 'cementum', 'pdl', 'bone', 'gingiva', 'neurovascular']),
    );
    expect(anchors.filter((a) => a.kind === 'bracket').map((a) => a.text)).toEqual(['Crown', 'Root']);
    // Leader lines run to a column on the right, so every anchor sits on the right half of the cut face.
    anchors.filter((a) => a.kind === 'callout').forEach((a) => expect(a.pos[0]).toBeGreaterThan(0));
  });

  it('drops periodontal labels when gingiva and bone are hidden, and adds the lesion in pathological view', () => {
    const plain = textbookAnchors(mergeVisual({}), false).map((a) => a.structureId);
    expect(plain).not.toContain('bone');
    const diseased = textbookAnchors(mergeVisual(CARIES_STAGES[5].visual), true).map((a) => a.structureId);
    expect(diseased).toContain('lesion');
  });
});
