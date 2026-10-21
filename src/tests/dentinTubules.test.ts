import { describe, expect, it } from 'vitest';
import { STIMULI, TUBULES_VERIFICATION, tubuleResponse } from '../data/dentinTubules';

const byId = (id: string) => STIMULI.find((s) => s.id === id)!;

describe('hydrodynamic model of dentin sensitivity', () => {
  it('moves fluid and fires nerves only for open, exposed tubules', () => {
    const cold = byId('cold');
    expect(tubuleResponse(cold, true, false)).toMatchObject({ fluidMoves: true, nerveFires: true, flow: 'outward' });
    expect(tubuleResponse(cold, false, false)).toMatchObject({ fluidMoves: false, nerveFires: false });
    expect(tubuleResponse(cold, true, true)).toMatchObject({ fluidMoves: false, nerveFires: false });
  });

  it('gives each stimulus its fluid direction', () => {
    expect(byId('air').flow).toBe('outward');
    expect(byId('sweet').flow).toBe('outward');
    expect(byId('heat').flow).toBe('inward');
    expect(byId('probe').flow).toBe('oscillating');
    expect(tubuleResponse(byId('none'), true, false).nerveFires).toBe(false);
  });

  it('is marked as reviewed (approved in the review addendum)', () => {
    expect(TUBULES_VERIFICATION).toBe('expert-reviewed');
  });
});
