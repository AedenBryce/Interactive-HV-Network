import { describe, expect, it } from 'vitest';
import { singleSupply } from '../models/synthetic';
import { composeAuthoredSchematic, type AuthoredSchematic } from './authored-schematic';
import type { Point } from './diagram-geometry';

function fixture(): AuthoredSchematic {
  const modules = singleSupply.assets.map((asset, index) => ({
    id: asset.id, label: asset.label, origin: [0, index * 300] as Point, assetIds: [asset.id],
    layout: { assets: { [asset.id]: [0, 0] as Point }, terminals: Object.fromEntries(asset.terminals.map((terminal, i) => [terminal, [0, i * 20] as Point])) },
    labels: { [asset.id]: { x: 50, y: 0, width: 100, height: 40, lines: [asset.label] } }, routes: {},
  }));
  const terminal = (id: string): Point => {
    const module = modules.find(item => id in item.layout.terminals)!;
    const point = module.layout.terminals[id]; return [point[0] + module.origin[0], point[1] + module.origin[1]];
  };
  return { schemaVersion: 1, modelId: singleSupply.id, modelVersion: singleSupply.version, topologyFingerprint: 'fixture',
    identities: {
      assets: singleSupply.assets.map(({ id, terminals }) => ({ id, terminals })).sort((a, b) => a.id.localeCompare(b.id)),
      connections: singleSupply.connections.map(({ id, from, to }) => ({ id, from, to })).sort((a, b) => a.id.localeCompare(b.id)),
    }, modules, externalRoutes: Object.fromEntries(singleSupply.connections.map(link => [link.id, [terminal(link.from), terminal(link.to)]])) };
}

describe('authored schematic composition contract', () => {
  it('preserves every identity, is deterministic and leaves its inputs unchanged', () => {
    const input = fixture(); const before = JSON.stringify(input);
    const first = composeAuthoredSchematic(singleSupply, input);
    expect(first.view.assetIds).toEqual(singleSupply.assets.map(asset => asset.id));
    expect([...first.routes.keys()]).toEqual(singleSupply.connections.map(link => link.id));
    expect(composeAuthoredSchematic(singleSupply, input)).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('rejects duplicated ownership and missing assets', () => {
    const duplicate = fixture(); duplicate.modules.push({ ...duplicate.modules[0], id: 'duplicate' });
    expect(() => composeAuthoredSchematic(singleSupply, duplicate)).toThrow('multiply owned');
    const missing = fixture(); missing.modules.pop();
    expect(() => composeAuthoredSchematic(singleSupply, missing)).toThrow('Unowned assets');
  });
  it('rejects changed electrical endpoints even when model version and counts match', () => {
    const input = fixture(); input.identities.connections[0].to = 'wrong-terminal';
    expect(() => composeAuthoredSchematic(singleSupply, input)).toThrow('topology differs');
  });
  it('rejects missing and detached routes', () => {
    const input = fixture(); const id = singleSupply.connections[0].id;
    delete input.externalRoutes[id];
    expect(() => composeAuthoredSchematic(singleSupply, input)).toThrow('Missing or detached');
    const detached = fixture(); detached.externalRoutes[id][0][0] += 1;
    expect(() => composeAuthoredSchematic(singleSupply, detached)).toThrow('Missing or detached');
  });
  it('rejects diagonal conductors with correct endpoints', () => {
    const input = fixture(); const route = input.externalRoutes[singleSupply.connections[0].id];
    route.splice(1, 0, [100, 100]);
    expect(() => composeAuthoredSchematic(singleSupply, input)).toThrow('Diagonal');
  });
  it('accepts a real horizontal bus tap and rejects a point outside that busbar', () => {
    const input = fixture();
    const bus = singleSupply.assets.find(asset => asset.kind === 'bus')!;
    const module = input.modules.find(item => item.assetIds.includes(bus.id))!;
    module.layout.rotations = { [bus.id]: 90 };
    module.layout.busSpans = { [bus.id]: 200 };
    const link = singleSupply.connections.find(connection => bus.terminals.includes(connection.to))!;
    const points = input.externalRoutes[link.id];
    const to: Point = [points.at(-1)![0] + 80, module.origin[1]];
    input.externalRoutes[link.id] = [points[0], [points[0][0], to[1]], to];
    expect(() => composeAuthoredSchematic(singleSupply, input)).not.toThrow();
    input.externalRoutes[link.id].at(-1)![0] += 100;
    expect(() => composeAuthoredSchematic(singleSupply, input)).toThrow('detached');
  });
  it('moves only one group and its incident paths, leaving every other local drawing fixed', () => {
    const input = fixture(); const before = composeAuthoredSchematic(singleSupply, input);
    const moved = input.modules[0]; moved.origin[0] = 400;
    for (const link of singleSupply.connections) {
      const fromMoved = moved.assetIds.some(id => singleSupply.assets.find(asset => asset.id === id)!.terminals.includes(link.from));
      const toMoved = moved.assetIds.some(id => singleSupply.assets.find(asset => asset.id === id)!.terminals.includes(link.to));
      if (!fromMoved && !toMoved) continue;
      const from: Point = [...before.view.layout.terminals[link.from]];
      const to: Point = [...before.view.layout.terminals[link.to]];
      if (fromMoved) from[0] += 400;
      if (toMoved) to[0] += 400;
      input.externalRoutes[link.id] = [from, [to[0], from[1]], to];
    }
    const after = composeAuthoredSchematic(singleSupply, input);
    for (const asset of singleSupply.assets.filter(asset => !moved.assetIds.includes(asset.id))) {
      expect(after.view.layout.assets[asset.id]).toEqual(before.view.layout.assets[asset.id]);
      expect(after.labels.get(asset.id)).toEqual(before.labels.get(asset.id));
      for (const terminal of asset.terminals) expect(after.view.layout.terminals[terminal]).toEqual(before.view.layout.terminals[terminal]);
    }
  });
});
