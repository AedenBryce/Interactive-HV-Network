import { describe, expect, it } from 'vitest';
import { placeTopDownRooms } from './top-down-room-placement';
import type { TopDownRoomPlan } from './top-down-room-placement';

const room = (_id: string, parents: TopDownRoomPlan[string]['parents'], order = 1) => ({
  topology: 'owner-confirmed' as const,
  parents: parents.map(parent => ({ ...parent, order: parent.order ?? order })),
});
const supply = (id: 'source:TF11' | 'source:TF12' | 'source:TF04', order = 1) => ({ kind: 'supply-anchor' as const, id, order, route: `${id} feed` });
const parent = (id: string, order = 1) => ({ kind: 'room' as const, id, order, route: `${id} feed` });

describe('placeTopDownRooms', () => {
  it('places confirmed descendants below their parents with enough room for the parent frame', () => {
    const result = placeTopDownRooms([
      { id: 'root', width: 900, height: 700 },
      { id: 'child', width: 500, height: 400 },
      { id: 'grandchild', width: 300, height: 250 },
    ], {
      plan: {
        root: room('root', [supply('source:TF11')]),
        child: room('child', [parent('root')]),
        grandchild: room('grandchild', [parent('child')]),
      },
    });

    expect(result.unplaced).toEqual([]);
    expect(result.positions.child.y).toBeGreaterThanOrEqual(result.positions.root.y + 700 + 360);
    expect(result.positions.grandchild.y).toBeGreaterThanOrEqual(result.positions.child.y + 400 + 360);
    expect(result.positions.grandchild.layer).toBe(2);
  });

  it('keeps confirmed ring rooms adjacent on the same row and orders them independent of input order', () => {
    const result = placeTopDownRooms([
      { id: 'sw435', width: 800, height: 600 },
      { id: 'sw411', width: 900, height: 500 },
      { id: 'sw431', width: 700, height: 650 },
    ], {
      plan: {
        sw411: room('sw411', [supply('source:TF11')]),
        sw431: room('sw431', [parent('sw411', 5)]),
        sw435: room('sw435', [parent('sw411', 4)]),
      },
      adjacentPairs: [{ from: 'sw431', to: 'sw435' }],
    });

    expect(result.positions.sw431.layer).toBe(result.positions.sw435.layer);
    expect(result.positions.sw431.y).toBe(result.positions.sw435.y);
    expect(result.positions.sw435.x).toBeGreaterThan(result.positions.sw431.x);
    expect(result.positions.sw435.x - (result.positions.sw431.x + 700)).toBe(240);
  });

  it('wraps wide sibling groups into a narrower, staggered layout without overlaps', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const dimensions = [{ id: 'root', width: 800, height: 500 }, ...ids.map(id => ({ id, width: 1000, height: 600 }))];
    const plan: Record<string, TopDownRoomPlan[string]> = { root: room('root', [supply('source:TF12')]) };
    ids.forEach((id, index) => { plan[id] = room(id, [parent('root', index + 1)]); });

    const result = placeTopDownRooms(dimensions, { plan, maxRoomsPerRow: 2 });

    expect(result.unplaced).toEqual([]);
    expect(new Set(ids.map(id => result.positions[id].y)).size).toBeGreaterThan(1);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = result.positions[ids[i]]; const b = result.positions[ids[j]];
      const overlaps = a.x < b.x + 1000 && a.x + 1000 > b.x && a.y < b.y + 600 && a.y + 600 > b.y;
      expect(overlaps, `${ids[i]} overlaps ${ids[j]}`).toBe(false);
    }
  });

  it('centers each sibling cohort on its own parent when a row has different feeders', () => {
    const result = placeTopDownRooms([
      { id: 'wide-root', width: 3000, height: 500 },
      { id: 'narrow-root', width: 500, height: 500 },
      { id: 'wide-child', width: 700, height: 400 },
      { id: 'narrow-child', width: 700, height: 400 },
    ], {
      horizontalGap: 200,
      verticalGap: 300,
      maxRoomsPerRow: 4,
      plan: {
        'wide-root': room('wide-root', [supply('source:TF11', 1)]),
        'narrow-root': room('narrow-root', [supply('source:TF12', 2)]),
        'wide-child': room('wide-child', [parent('wide-root')]),
        'narrow-child': room('narrow-child', [parent('narrow-root')]),
      },
    });

    const center = (id: string, width: number) => result.positions[id].x + width / 2;
    expect(center('wide-child', 700)).toBe(center('wide-root', 3000));
    expect(center('narrow-child', 700)).toBe(center('narrow-root', 500));
    expect(result.positions['wide-child'].y).toBeGreaterThan(result.positions['wide-root'].y);
    expect(result.positions['narrow-child'].y).toBeGreaterThan(result.positions['narrow-root'].y);
  });

  it('balances horizontal drift across crowded sibling cohorts', () => {
    const result = placeTopDownRooms([
      { id: 'left-root', width: 400, height: 500 },
      { id: 'right-root', width: 400, height: 500 },
      { id: 'left-child', width: 1000, height: 400 },
      { id: 'right-child', width: 1000, height: 400 },
    ], {
      horizontalGap: 1200,
      verticalGap: 300,
      maxRoomsPerRow: 4,
      plan: {
        'left-root': room('left-root', [supply('source:TF11', 1)]),
        'right-root': room('right-root', [supply('source:TF12', 2)]),
        'left-child': room('left-child', [parent('left-root')]),
        'right-child': room('right-child', [parent('right-root')]),
      },
    });

    const center = (id: string, width: number) => result.positions[id].x + width / 2;
    const leftDrift = center('left-child', 1000) - center('left-root', 400);
    const rightDrift = center('right-child', 1000) - center('right-root', 400);
    expect(leftDrift).toBe(-300);
    expect(rightDrift).toBe(300);
  });

  it('leaves unconfirmed rooms and their descendants unplaced instead of inventing a parent', () => {
    const result = placeTopDownRooms([
      { id: 'known', width: 800, height: 500 },
      { id: 'unknown', width: 700, height: 500 },
      { id: 'downstream', width: 500, height: 400 },
    ], {
      plan: {
        known: room('known', [supply('source:TF04')]),
        unknown: { topology: 'unconfirmed', parents: [] },
        downstream: room('downstream', [parent('unknown')]),
      },
    });

    expect(result.positions.known).toBeDefined();
    expect(result.positions.unknown).toBeUndefined();
    expect(result.positions.downstream).toBeUndefined();
    expect(result.unplaced).toEqual([
      { id: 'unknown', reason: 'unconfirmed-parent', parentIds: [] },
      { id: 'downstream', reason: 'unconfirmed-parent', parentIds: ['unknown'] },
    ]);
  });

  it('reports missing parents, cycles and invalid dimensions', () => {
    const result = placeTopDownRooms([
      { id: 'missing', width: 700, height: 500 },
      { id: 'cycle-a', width: 700, height: 500 },
      { id: 'cycle-b', width: 700, height: 500 },
      { id: 'bad-dimensions', width: 0, height: 500 },
    ], {
      plan: {
        missing: room('missing', [parent('absent')]),
        'cycle-a': room('cycle-a', [parent('cycle-b')]),
        'cycle-b': room('cycle-b', [parent('cycle-a')]),
        'bad-dimensions': room('bad-dimensions', [supply('source:TF11')]),
      },
    });

    expect(result.unplaced).toEqual([
      { id: 'missing', reason: 'missing-parent', parentIds: ['absent'] },
      { id: 'cycle-a', reason: 'cyclic-parent', parentIds: ['cycle-b'] },
      { id: 'cycle-b', reason: 'cyclic-parent', parentIds: ['cycle-a'] },
      { id: 'bad-dimensions', reason: 'missing-dimensions', parentIds: [] },
    ]);
  });
});
