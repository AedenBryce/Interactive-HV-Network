import { describe, expect, it } from 'vitest';
import { compactSupplyTreeLayout } from './compact-supply-tree-layout';

function assertTopDownAndClear(
  result: ReturnType<typeof compactSupplyTreeLayout>,
  children: ReadonlyMap<string, readonly string[]>,
  footprints: ReadonlyMap<string, { left: number; right: number }>,
  nodeHeight: number,
) {
  for (const [parent, descendants] of children) for (const child of descendants) {
    expect(result.positions[child][1], `${parent} → ${child} must go downward`).toBeGreaterThan(result.positions[parent][1]);
  }
  const entries = [...footprints].map(([id, extent]) => {
    const [x, y] = result.positions[id];
    return { id, left: x + extent.left, right: x + extent.right, top: y - nodeHeight / 2, bottom: y + nodeHeight / 2 };
  });
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i]; const b = entries[j];
    const overlap = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
  }
}

describe('compactSupplyTreeLayout', () => {
  it('keeps every feeder strictly below its parent and centres each tree over its child span', () => {
    const roots = ['source'];
    const children = new Map<string, readonly string[]>([
      ['source', ['bus']], ['bus', ['feeder-a', 'feeder-b']], ['feeder-a', ['load-a']], ['feeder-b', ['load-b']],
      ['load-a', []], ['load-b', []],
    ]);
    const footprints = new Map([...children.keys()].map(id => [id, { left: -110, right: 180 }]));
    const result = compactSupplyTreeLayout(roots, children, footprints, { verticalGap: 800, maxWidth: 2_000 });

    assertTopDownAndClear(result, children, footprints, 220);
    expect(result.bounds.width).toBeLessThanOrEqual(2_000);
    expect(result.positions.source[0]).toBeGreaterThan(result.positions['feeder-a'][0]);
    expect(result.positions.source[0]).toBeLessThan(result.positions['feeder-b'][0]);
  });

  it('wraps broad branches vertically when their combined footprint exceeds the width limit', () => {
    const children = new Map<string, readonly string[]>([
      ['root', ['a', 'b', 'c', 'd', 'e']], ['a', ['a1']], ['b', ['b1']], ['c', ['c1']], ['d', ['d1']], ['e', ['e1']],
      ['a1', []], ['b1', []], ['c1', []], ['d1', []], ['e1', []],
    ]);
    const footprints = new Map([...children.keys()].map(id => [id, { left: -250, right: 250 }]));
    const result = compactSupplyTreeLayout(['root'], children, footprints, { horizontalGap: 160, verticalGap: 700, maxWidth: 1_800 });

    assertTopDownAndClear(result, children, footprints, 180);
    expect(result.bounds.width).toBeLessThanOrEqual(1_800);
    expect(result.rowCount).toBeGreaterThan(6);
    expect(result.bounds.height).toBeLessThan(12_000);
  });

  it('lays out a 684-node generated forest without node collisions or upward edges', () => {
    const total = 684;
    const roots = ['n0', 'n1', 'n2'];
    const children = new Map<string, string[]>(Array.from({ length: total }, (_, index) => [`n${index}`, []]));
    let frontier = roots;
    let nextIndex = roots.length;
    while (nextIndex < total) {
      const next: string[] = [];
      for (const parent of frontier) for (let childIndex = 0; childIndex < 3 && nextIndex < total; childIndex++) {
        const child = `n${nextIndex++}`;
        children.get(parent)!.push(child);
        next.push(child);
      }
      frontier = next;
    }
    const footprints = new Map([...children.keys()].map((id, index) => [id, {
      left: -(70 + index % 5 * 8), right: 110 + index % 7 * 10,
    }]));
    const result = compactSupplyTreeLayout(roots, children, footprints, {
      horizontalGap: 90, verticalGap: 440, maxWidth: 4_500, rootGap: 500,
    });

    expect(Object.keys(result.positions)).toHaveLength(total);
    assertTopDownAndClear(result, children, footprints, 120);
    expect(result.bounds.width).toBeLessThan(3 * (4_500 + 500));
    expect(result.bounds.width).toBeLessThan(result.bounds.height);
    expect(result.bounds.height).toBeGreaterThan(0);
    expect(result.rowCount).toBeGreaterThan(5);
  });

  it('rejects cycles, missing roots and invalid geometry before returning a partial layout', () => {
    const footprints = new Map([['a', { left: -1, right: 1 }], ['b', { left: -1, right: 1 }]]);
    expect(() => compactSupplyTreeLayout(['a'], new Map([['a', ['b']], ['b', ['a']]]), footprints)).toThrow(/Cycle/);
    expect(() => compactSupplyTreeLayout(['a'], new Map([['a', ['b']]]), footprints)).toThrow(/Missing child list/);
    expect(() => compactSupplyTreeLayout(['a'], new Map([['a', []]]), new Map([['a', { left: 1, right: 1 }]]))).toThrow(/Invalid footprint/);
  });
});
