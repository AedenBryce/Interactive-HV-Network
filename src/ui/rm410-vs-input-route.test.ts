import { describe, expect, it } from 'vitest';
import { rm410VsInputBRoute } from './rm410-vs-input-route';
import type { Point } from './diagram-geometry';

const crosses = (a: Point, b: Point, c: Point, d: Point) => {
  if (a[0] === b[0] && c[1] === d[1]) return c[1] >= Math.min(a[1], b[1]) && c[1] <= Math.max(a[1], b[1]) && a[0] >= Math.min(c[0], d[0]) && a[0] <= Math.max(c[0], d[0]);
  if (a[1] === b[1] && c[0] === d[0]) return c[0] >= Math.min(a[0], b[0]) && c[0] <= Math.max(a[0], b[0]) && a[1] >= Math.min(c[1], d[1]) && a[1] <= Math.max(c[1], d[1]);
  return false;
};

describe('RM410 VS4101 input B route', () => {
  it('drops below the adjacent SW435 TF435 bus link', () => {
    const from: Point = [402.75, 29604];
    const to: Point = [699.25, 29924];
    const busDrop: Point[] = [[486.25, 29377], [443.75, 29377], [443.75, 29817], [486.25, 29817]];

    const route = rm410VsInputBRoute(from, to, busDrop);

    expect(route[0]).toEqual(from);
    expect(route.at(-1)).toEqual(to);
    expect(route.at(-2)?.[1]).toBeGreaterThan(29817);
    expect(route.slice(1).every((point, index) => point[0] === route[index][0] || point[1] === route[index][1])).toBe(true);
    for (let i = 1; i < route.length; i++) for (let j = 1; j < busDrop.length; j++) {
      expect(crosses(route[i - 1], route[i], busDrop[j - 1], busDrop[j])).toBe(false);
    }
  });
});
