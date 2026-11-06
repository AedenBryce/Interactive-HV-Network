import { describe, expect, it } from 'vitest';
import { planVerticalWholeNetworkCandidate } from './vertical-whole-network-layout-candidate';

describe('planVerticalWholeNetworkCandidate', () => {
  it('keeps the confirmed SW431/SW435 tie adjacent below SW411', () => {
    const frames = [
      { id: 'sw411/overview', width: 1800, height: 1200 },
      { id: 'crushing-1/hv', width: 2400, height: 1600 },
      { id: 'crushing-2/sw435-hv', width: 2100, height: 1400 },
    ];

    const result = planVerticalWholeNetworkCandidate(frames, [], new Map());
    const source = result.positions['sw411/overview'];
    const sw431 = result.positions['crushing-1/hv'];
    const sw435 = result.positions['crushing-2/sw435-hv'];

    expect(result.unplaced).toEqual([]);
    expect(sw431.y).toBeGreaterThan(source.y + 1200);
    expect(sw435.y).toBe(sw431.y);
    expect(sw435.x).toBe(sw431.x + 2400 + 640);
  });

  it('is deterministic for a fixed frame list and hierarchy', () => {
    const frames = [
      { id: 'sw411/overview', width: 1800, height: 1200 },
      { id: 'crushing-1/hv', width: 2400, height: 1600 },
      { id: 'crushing-2/sw435-hv', width: 2100, height: 1400 },
    ];

    expect(planVerticalWholeNetworkCandidate(frames, [], new Map()))
      .toEqual(planVerticalWholeNetworkCandidate(frames, [], new Map()));
  });
});
