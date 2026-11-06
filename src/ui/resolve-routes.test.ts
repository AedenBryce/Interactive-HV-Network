import { describe, expect, it } from 'vitest';
import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { Point } from './diagram-geometry';
import { resolveRoutes } from './resolve-routes';

describe('resolveRoutes busbar clearance', () => {
  it('takes a short orthogonal path around an unrelated busbar', () => {
    const model = {
      assets: [
        { id: 'source', label: 'Source', kind: 'source', terminals: ['source:out'], conductivePairs: [], positions: [] },
        { id: 'load', label: 'Load', kind: 'interface', terminals: ['load:in'], conductivePairs: [], positions: [] },
        { id: 'unrelated-bus', label: 'Unrelated bus', kind: 'bus', terminals: ['unrelated:left', 'unrelated:right'], conductivePairs: [], positions: [] },
      ],
      connections: [{ id: 'source-to-load', from: 'source:out', to: 'load:in' }],
    } as unknown as NetworkModel;
    const layout = {
      assets: { source: [100, 0], load: [100, 200], 'unrelated-bus': [100, 100] },
      terminals: { 'source:out': [100, 0], 'load:in': [100, 200], 'unrelated:left': [0, 100], 'unrelated:right': [200, 100] },
      rotations: { 'unrelated-bus': 90 },
      busSpans: { 'unrelated-bus': 200 },
    } as DiagramLayout;
    const labels = new Map(model.assets.map(asset => [asset.id, { x: 400, y: 400, width: 80, height: 30, lines: [asset.label] }]));
    const route: Point[] = [[100, 0], [100, 200]];
    const routes = new Map([['source-to-load', route]]);
    const points: Point[] = [];
    resolveRoutes(model, layout, labels, routes, new Set(), undefined, () => ({ from: [100, 0], to: [100, 200] }), []);
    const resolved = routes.get('source-to-load')!;
    expect(resolved).not.toEqual(route);
    expect(resolved.every((point, index) => index === 0 || point[0] === resolved[index - 1][0] || point[1] === resolved[index - 1][1])).toBe(true);
    expect(resolved.slice(1).some((to, index) => {
      const from = resolved[index];
      return from[0] === to[0] && from[0] > 0 && from[0] < 200 && Math.max(Math.min(from[1], to[1]), 96) < Math.min(Math.max(from[1], to[1]), 104);
    })).toBe(false);
    expect(points).toEqual([]);
  });

});
