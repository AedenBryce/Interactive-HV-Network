import { describe, expect, it } from 'vitest';
import { isSimpleOrthogonalPath, planOrthogonalRoutes, type RoutePoint } from './orthogonal-route-planner';

describe('orthogonal route planner', () => {
  it('routes a multi-branch tree orthogonally without crossings or shared lengths', () => {
    const result = planOrthogonalRoutes([
      { id: 'branch-b', from: [0, 0], to: [180, 260], fromTerminalId: 'root', toTerminalId: 'b', preferDown: true },
      { id: 'branch-a', from: [0, 0], to: [-180, 260], fromTerminalId: 'root', toTerminalId: 'a', preferDown: true },
      { id: 'branch-c', from: [0, 0], to: [0, 320], fromTerminalId: 'root', toTerminalId: 'c', preferDown: true },
    ], {
      obstacles: [{ id: 'room', x: -50, y: 80, width: 100, height: 120 }],
      clearance: 16,
    });

    expect(result.unresolved).toEqual([]);
    expect(result.routes.size).toBe(3);
    for (const points of result.routes.values()) {
      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points[0]).toEqual([0, 0]);
      for (let index = 1; index < points.length; index++) {
        expect(points[index - 1][0] === points[index][0] || points[index - 1][1] === points[index][1]).toBe(true);
      }
    }

    const entries = [...result.routes];
    for (let left = 0; left < entries.length; left++) {
      for (let right = left + 1; right < entries.length; right++) {
        const [leftId, leftPath] = entries[left];
        const [rightId, rightPath] = entries[right];
        for (const [a, b] of segments(leftPath)) for (const [c, d] of segments(rightPath)) {
          const collision = intersection(a, b, c, d);
          if (collision === 'overlap') throw new Error(`${leftId} and ${rightId} share connector length`);
          if (collision) expect(collision).toEqual([0, 0]);
        }
      }
    }
  });

  it('reports no-path when a hard routing boundary is divided by an obstacle wall', () => {
    const result = planOrthogonalRoutes([
      { id: 'blocked', from: [10, 10], to: [90, 90], fromTerminalId: 'left', toTerminalId: 'right' },
    ], {
      bounds: { id: 'viewport', x: 0, y: 0, width: 100, height: 100 },
      obstacles: [{ id: 'wall', x: 45, y: -20, width: 10, height: 140 }],
      clearance: 0,
    });

    expect(result.routes.size).toBe(0);
    expect(result.unresolved).toEqual([{ routeId: 'blocked', reason: 'no-path' }]);
  });

  it('uses the configured maximum padding on the final bounded search attempt', () => {
    const result = planOrthogonalRoutes([{
      id: 'detour-around-room', from: [0, 0], to: [100, 0], fromTerminalId: 'left', toTerminalId: 'right',
    }], {
      obstacles: [{ id: 'wide-room-wall', x: 45, y: -500, width: 10, height: 1000 }],
      clearance: 0,
      localSearchPadding: 100,
      maxLocalSearchPadding: 1000,
      maxSearchAttempts: 2,
    });

    expect(result.unresolved).toEqual([]);
    expect(result.routes.get('detour-around-room')).toBeDefined();
    expect(result.routes.get('detour-around-room')!.some(([, y]) => Math.abs(y) >= 500)).toBe(true);
  });

  it('applies a hard search viewport to an individual route', () => {
    const result = planOrthogonalRoutes([{
      id: 'individually-bounded',
      from: [10, 50], to: [90, 50], fromTerminalId: 'left', toTerminalId: 'right',
      bounds: { id: 'local-room', x: 0, y: 0, width: 100, height: 100 },
    }], {
      obstacles: [{ id: 'wall', x: 45, y: -200, width: 10, height: 400 }],
      clearance: 0,
    });

    expect(result.routes.size).toBe(0);
    expect(result.unresolved).toEqual([{ routeId: 'individually-bounded', reason: 'no-path' }]);
  });

  it('reports endpoints blocked by an obstacle instead of silently routing from it', () => {
    const result = planOrthogonalRoutes([
      { id: 'blocked-end', from: [5, 5], to: [80, 80], fromTerminalId: 'a', toTerminalId: 'b' },
    ], { obstacles: [{ id: 'device-card', x: 0, y: 0, width: 20, height: 20 }] });

    expect(result.unresolved).toEqual([{ routeId: 'blocked-end', reason: 'blocked-endpoint' }]);
  });

  it('can use a penalized interior crossing when the bounded layout makes it unavoidable', () => {
    const requests = [
      { id: 'north-south', from: [50, 0] as RoutePoint, to: [50, 100] as RoutePoint, fromTerminalId: 'n', toTerminalId: 's' },
      { id: 'west-east', from: [0, 50] as RoutePoint, to: [100, 50] as RoutePoint, fromTerminalId: 'w', toTerminalId: 'e' },
    ];
    const bounds = { id: 'switchroom', x: 0, y: 0, width: 100, height: 100 };
    const crossingFree = planOrthogonalRoutes(requests, { bounds, clearance: 0, localSearchPadding: 100, maxLocalSearchPadding: 100 });
    expect(crossingFree.routes.size).toBe(1);
    expect(crossingFree.unresolved.map(item => item.routeId)).toEqual(['west-east']);

    const withCrossing = planOrthogonalRoutes(requests, {
      bounds, clearance: 0, localSearchPadding: 100, maxLocalSearchPadding: 100,
      allowCrossings: true, crossingPenalty: 10_000,
    });
    expect(withCrossing.unresolved).toEqual([]);
    expect(withCrossing.routes.size).toBe(2);
    const [vertical, horizontal] = [withCrossing.routes.get('north-south')!, withCrossing.routes.get('west-east')!];
    expect(vertical).toEqual([[50, 0], [50, 100]]);
    expect(horizontal).toEqual([[0, 50], [100, 50]]);
    expect(intersection(...segments(vertical)[0], ...segments(horizontal)[0])).toEqual([50, 50]);
  });

  it('can exempt endpoint cards while keeping unrelated obstacles hard-blocked', () => {
    const result = planOrthogonalRoutes([
      {
        id: 'through-cards', from: [5, 5], to: [95, 5], fromTerminalId: 'a', toTerminalId: 'b',
        ignoredObstacleIds: ['from-card', 'to-card'],
      },
    ], {
      obstacles: [
        { id: 'from-card', x: 0, y: 0, width: 20, height: 20 },
        { id: 'to-card', x: 80, y: 0, width: 20, height: 20 },
        { id: 'unrelated-room', x: 40, y: -20, width: 20, height: 40 },
      ],
      clearance: 0,
    });

    const path = result.routes.get('through-cards');
    expect(result.unresolved).toEqual([]);
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThan(2);
    expect(path!.every(point => !(point[0] > 40 && point[0] < 60 && point[1] > -20 && point[1] < 20))).toBe(true);
  });

  it('rejects a preferred route that crosses itself and selects a simple path', () => {
    const result = planOrthogonalRoutes([{
      id: 'self-crossing-preference',
      from: [0, 0], to: [120, 100], fromTerminalId: 'a', toTerminalId: 'b',
      preferredPath: [[0, 0], [120, 0], [120, 100], [0, 100], [0, 50], [120, 50], [120, 100]],
    }], { clearance: 0 });

    const path = result.routes.get('self-crossing-preference');
    expect(result.unresolved).toEqual([]);
    expect(path).toBeDefined();
    expect(isSimpleOrthogonalPath(path!)).toBe(true);
  });

  it('keeps remote route groups out of each other’s search grids', () => {
    const obstacles = [0, 100_000].flatMap((origin, group) => Array.from({ length: 12 }, (_, index) => ({
      id: `group-${group}-obstacle-${index}`,
      x: origin + 20 + index * 2,
      y: 100 + index * 2,
      width: 1,
      height: 1,
    })));
    const result = planOrthogonalRoutes([
      { id: 'near-origin', from: [0, 0], to: [200, 0], fromTerminalId: 'a', toTerminalId: 'b' },
      { id: 'far-origin', from: [100_000, 0], to: [100_200, 0], fromTerminalId: 'c', toTerminalId: 'd' },
    ], { obstacles, clearance: 0, localSearchPadding: 250, maxLocalSearchPadding: 250, maxGridNodes: 1000 });

    expect(result.unresolved).toEqual([]);
    expect(result.routes.size).toBe(2);
  });
});

function segments(points: readonly RoutePoint[]): [RoutePoint, RoutePoint][] {
  return points.slice(1).map((point, index) => [points[index], point]);
}

function intersection(a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): RoutePoint | 'overlap' | undefined {
  const aVertical = a[0] === b[0]; const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical && a[0] === c[0]) {
      const low = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      const high = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
      if (low > high) return undefined;
      return low < high ? 'overlap' : [a[0], low];
    }
    if (!aVertical && a[1] === c[1]) {
      const low = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const high = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
      if (low > high) return undefined;
      return low < high ? 'overlap' : [low, a[1]];
    }
    return undefined;
  }
  const v = aVertical ? [a, b] : [c, d];
  const h = aVertical ? [c, d] : [a, b];
  const x = v[0][0]; const y = h[0][1];
  return x >= Math.min(h[0][0], h[1][0]) && x <= Math.max(h[0][0], h[1][0])
    && y >= Math.min(v[0][1], v[1][1]) && y <= Math.max(v[0][1], v[1][1]) ? [x, y] : undefined;
}
