import { describe, expect, it } from 'vitest';
import { getDentinTubules } from '../three/geometry/toothSingleton';

describe('dentinal tubules on the section', () => {
  it('builds tubules in the crown and both roots, all behind the cut plane', () => {
    const g = getDentinTubules();
    const pos = g.getAttribute('position');
    expect(pos.count).toBeGreaterThan(1000);
    let crown = 0, mesial = 0, distal = 0;
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getZ(i)).toBeLessThan(0);
      const y = pos.getY(i), x = pos.getX(i);
      if (y > 1) crown++;
      else if (y < -4 && x > 0) mesial++;
      else if (y < -4 && x < 0) distal++;
    }
    console.log({ crown, mesial, distal, count: pos.count });
    expect(crown).toBeGreaterThan(200);
    expect(mesial).toBeGreaterThan(200);
    expect(distal).toBeGreaterThan(200);
  });
});
