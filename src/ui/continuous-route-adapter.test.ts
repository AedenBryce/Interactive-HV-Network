import { describe, expect, it } from 'vitest';
import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { routeContinuousConnectors } from './continuous-route-adapter';

const model = {
  id: 'routing-fixture', version: '1', name: 'Routing fixture', synthetic: true,
  assets: ['a', 'blocker', 'b'].map((id, index) => ({
    id, label: id, kind: 'interface' as const, terminals: [`${id}:terminal`], conductivePairs: [], positions: [],
    x: index * 100,
  })),
  connections: [{ id: 'a-to-b', from: 'a:terminal', to: 'b:terminal' }],
  sources: [], starting: { devices: {}, sources: {} },
} as unknown as NetworkModel;

describe('continuous route adapter', () => {
  it('routes model connectors around other assets and ignores their endpoint room frame', () => {
    const layout: DiagramLayout = {
      assets: { a: [0, 0], blocker: [100, 0], b: [200, 0] },
      terminals: { 'a:terminal': [0, 0], 'blocker:terminal': [100, 0], 'b:terminal': [200, 0] },
    };
    const labels = new Map([
      ['a', { x: -40, y: -80, width: 80, height: 20, lines: ['a'] }],
      ['blocker', { x: 60, y: -80, width: 80, height: 20, lines: ['blocker'] }],
      ['b', { x: 160, y: -80, width: 80, height: 20, lines: ['b'] }],
    ]);
    const before = structuredClone(model.connections);
    const result = routeContinuousConnectors(model, layout, labels, {
      hiddenAssetIds: new Set(['a', 'b']),
      roomFrames: [{ id: 'room-b', x: 150, y: -60, width: 100, height: 120 }],
      clearance: 0,
    });

    const route = result.routes.get('a-to-b');
    expect(route).toBeDefined();
    expect(route![0]).toEqual([0, 0]);
    expect(route!.at(-1)).toEqual([200, 0]);
    expect(route!.length).toBeGreaterThan(2);
    expect(result.diagnostics.unresolved).toEqual([]);
    expect(result.diagnostics.routedConnectionCount).toBe(model.connections.length);
    expect(model.connections).toEqual(before);
  });
});
