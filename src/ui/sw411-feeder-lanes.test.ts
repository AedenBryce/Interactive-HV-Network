import { describe, expect, it } from 'vitest';
import type { DiagramLayout } from '../session/presentation';
import { separateSw411FeederLanes } from './sw411-feeder-lanes';

describe('separateSw411FeederLanes', () => {
  it('gives each feeder its own x lane and moves its downstream branch with it', () => {
    const layout: Pick<DiagramLayout, 'assets'> = {
      assets: {
        'sw411:tier-01:cb': [100, 200],
        'sw411:tier-02:cb': [100, 200],
        'sw411:tier-03:cb': [100, 200],
        'sw411:tier-04:cb': [100, 200],
        'sw411:tier-13:cb': [1000, 400],
        'sw411:tier-14:cb': [1000, 400],
        'sw411:tier-15:cb': [1000, 400],
        'sw411:tier-16:cb': [1000, 400],
        'sw411:tier-03:interface': [100, 900],
      },
    };
    const children = new Map<string, string[]>([['sw411:tier-03:cb', ['sw411:tier-03:interface']]]);
    const moveBranch = (root: string, deltaX: number, deltaY: number) => {
      const queue = [root];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const id = queue[cursor];
        const [x, y] = layout.assets[id];
        layout.assets[id] = [x + deltaX, y + deltaY];
        queue.push(...(children.get(id) ?? []));
      }
    };

    separateSw411FeederLanes(layout, moveBranch);

    for (const tiers of [['01', '02', '03', '04'], ['13', '14', '15', '16']]) {
      const xs = tiers.map(tier => layout.assets[`sw411:tier-${tier}:cb`][0]);
      expect(new Set(xs).size).toBe(4);
      expect(xs[1] - xs[0]).toBe(900);
      expect(xs[2] - xs[1]).toBe(900);
      expect(xs[3] - xs[2]).toBe(900);
    }
    expect(layout.assets['sw411:tier-03:interface'][0]).toBe(layout.assets['sw411:tier-03:cb'][0]);
    expect(layout.assets['sw411:tier-03:interface'][1]).toBe(900);
  });
});
