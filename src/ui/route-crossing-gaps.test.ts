import { describe, expect, it } from 'vitest';
import { applyVisualCrossingGaps, crossingGapWidthForScale, crossingRouteIds, findVisualRouteCrossings, separateVisualCrossings } from './route-crossing-gaps';
import { currentNetworkModel } from '../models/site/current-network';
import savedDrawing from '../models/site/authored-network.json';
import { composeAuthoredSchematic } from './authored-schematic';
import type { AuthoredSchematic } from './authored-schematic';

describe('visual route crossings', () => {
  it('keeps the visual gap near eight screen pixels across zoom levels', () => {
    for (const scale of [0.01, 0.1, 0.5]) {
      expect(crossingGapWidthForScale(scale) * scale).toBeCloseTo(8);
    }
    expect(crossingGapWidthForScale(0) * 0.0125).toBeCloseTo(8);
  });

  it('breaks the horizontal line at a proper crossing regardless of connection order', () => {
    const routes = new Map([
      ['vertical', [[50, 0], [50, 100]] as [number, number][]],
      ['horizontal', [[0, 50], [100, 50]] as [number, number][]],
    ]);
    const separated = separateVisualCrossings([
      { id: 'vertical', from: 'north', to: 'south' },
      { id: 'horizontal', from: 'west', to: 'east' },
    ], routes, 20);

    expect(separated.get('vertical')).toEqual([[[50, 0], [50, 100]]]);
    expect(separated.get('horizontal')).toEqual([[[0, 50], [40, 50]], [[60, 50], [100, 50]]]);
  });

  it('selects only horizontal routes in proper crossings for conflict-only rerouting', () => {
    const routes = new Map([
      ['vertical', [[50, 0], [50, 100]] as [number, number][]],
      ['horizontal', [[0, 50], [100, 50]] as [number, number][]],
      ['clear', [[150, 0], [150, 100]] as [number, number][]],
    ]);
    const selected = crossingRouteIds([
      { id: 'vertical', from: 'north', to: 'south' },
      { id: 'horizontal', from: 'west', to: 'east' },
      { id: 'clear', from: 'top', to: 'bottom' },
    ], routes);

    expect(selected).toEqual(new Set(['horizontal']));
  });

  it('keeps an actual shared terminal joined', () => {
    const routes = new Map([
      ['vertical', [[50, 0], [50, 50]] as [number, number][]],
      ['horizontal', [[0, 50], [50, 50]] as [number, number][]],
    ]);
    const separated = separateVisualCrossings([
      { id: 'vertical', from: 'north', to: 'bus' },
      { id: 'horizontal', from: 'west', to: 'bus' },
    ], routes);

    expect(separated.get('horizontal')).toEqual([[[0, 50], [50, 50]]]);
  });

  it('preserves both endpoint stubs when an overview gap exceeds a short segment', () => {
    const routes = new Map([
      ['short', [[0, 10], [5, 10]] as [number, number][]],
      ['vertical', [[0.5, 0], [0.5, 20]] as [number, number][]],
    ]);
    const separated = separateVisualCrossings([
      { id: 'short', from: 'a', to: 'b' },
      { id: 'vertical', from: 'c', to: 'd' },
    ], routes, 1333);
    expect(separated.get('short')).toEqual([[[0, 10], [0.25, 10]], [[4, 10], [5, 10]]]);
  });

  it('keeps the full authored network attached at overview and detail scales without reconnecting crossings', () => {
    const geometry = composeAuthoredSchematic(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const crossings = findVisualRouteCrossings(currentNetworkModel.connections, geometry.routes);
    expect(crossings.length).toBeGreaterThan(0);
    for (const scale of [0.006, 0.0125, 0.1, 0.29, 0.45, 0.8, 1]) {
      const rendered = applyVisualCrossingGaps(geometry.routes, crossings, crossingGapWidthForScale(scale));
      for (const [id, points] of geometry.routes) {
        const vertices = rendered.get(id)!.flat();
        expect(vertices, `${id} at ${scale}: first terminal`).toContainEqual(points[0]);
        expect(vertices, `${id} at ${scale}: last terminal`).toContainEqual(points.at(-1));
      }
      for (const crossing of crossings) {
        const points = geometry.routes.get(crossing.routeId)!;
        const y = points[crossing.segmentIndex][1];
        const stillJoined = rendered.get(crossing.routeId)!.some(piece => piece.slice(1).some((to, i) =>
          piece[i][1] === y && to[1] === y && crossing.x > Math.min(piece[i][0], to[0]) && crossing.x < Math.max(piece[i][0], to[0])));
        expect(stillJoined, `${crossing.routeId} at ${scale}`).toBe(false);
      }
    }
  });
});
