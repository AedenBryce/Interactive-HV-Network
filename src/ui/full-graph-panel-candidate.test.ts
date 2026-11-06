import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutFullGraphPanels } from './full-graph-panel-candidate';

const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

describe('isolated panel-first full-network candidate', () => {
  it('keeps every asset and connection and reports strict geometry metrics', () => {
    const model = currentNetworkModel;
    const layout = layoutFullGraphPanels(model);
    const owner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const routes: GeometryRoute[] = [...layout.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const geometry = validateDiagramGeometry({ routes, roomFrames: layout.panelFrames });
    const frameOverlaps = geometry.filter(f => f.type === 'room-frame-overlap');
    const crossings = geometry.filter(f => f.type === 'route-crossing');
    const shared = geometry.filter(f => f.type === 'shared-route-length');
    const diagonal = geometry.filter(f => f.type === 'non-orthogonal');
    const frameHits = geometry.filter(f => f.type === 'route-room-frame');
    const unownedFrameHits = frameHits.filter(f => f.type === 'route-room-frame' && ![
      owner.get(connectionById.get(f.routeId)!.from), owner.get(connectionById.get(f.routeId)!.to),
    ].some(id => layout.panelByAsset.get(id!) === f.roomFrameId));
    const labels = [...layout.labels];
    const labelOverlaps: string[] = [];
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (overlap(labels[i][1], labels[j][1])) labelOverlaps.push(`${labels[i][0]}/${labels[j][0]}`);
    const symbolLabelHits: string[] = [];
    for (const route of routes) for (let i = 1; i < route.points.length; i++) {
      const connection = connectionById.get(route.id)!;
      for (const [id, box] of labels) if (id !== owner.get(connection.from) && id !== owner.get(connection.to)
        && cutsBox(route.points[i - 1] as [number, number], route.points[i] as [number, number], box)) symbolLabelHits.push(`${route.id}/${id}`);
    }
    const panelGroupCounts = new Map<string, number>();
    for (const group of layout.panelByAsset.values()) panelGroupCounts.set(group, (panelGroupCounts.get(group) ?? 0) + 1);
    console.info('panel-first full-network candidate audit', {
      assets: model.assets.length, positioned: Object.keys(layout.positions).length,
      connections: model.connections.length, routed: layout.routes.size, unresolved: layout.unresolved.length,
      treeEdges: layout.treeConnectionIds.size, alternateEdges: model.connections.length - layout.treeConnectionIds.size,
      panelCount: layout.panelFrames.length, groups: Object.fromEntries(panelGroupCounts),
      bounds: layout.bounds, fitDesktopPercent: +(Math.min(1340 / layout.bounds.width, 720 / layout.bounds.height) * 100).toFixed(2),
      fitNarrowPercent: +(Math.min(350 / layout.bounds.width, 820 / layout.bounds.height) * 100).toFixed(2),
      frameOverlaps: frameOverlaps.length, routeCrossings: crossings.length, sharedRouteLengths: shared.length,
      diagonalSegments: diagonal.length, labelOverlaps: labelOverlaps.length, routeLabelHits: symbolLabelHits.length,
      unownedFrameHits: unownedFrameHits.length, sampleUnresolved: layout.unresolved.slice(0, 60),
      sampleCrossings: crossings.slice(0, 40).map(f => f.type === 'route-crossing' ? f.routeIds.join(' <> ') : f),
      sampleShared: shared.slice(0, 20).map(f => f.type === 'shared-route-length' ? `${f.routeIds.join(' <> ')} length=${f.length}` : f),
    });
    expect(Object.keys(layout.positions)).toHaveLength(model.assets.length);
    expect(layout.panelByAsset.size).toBe(model.assets.length);
    expect(layout.routes.size).toBe(model.connections.length);
    expect(layout.unresolved).toEqual([]);
    expect(frameOverlaps).toEqual([]);
    expect(crossings).toEqual([]);
    expect(shared).toEqual([]);
    expect(diagonal).toEqual([]);
    expect(labelOverlaps).toEqual([]);
    expect(symbolLabelHits).toEqual([]);
    expect(unownedFrameHits).toEqual([]);
  }, 120_000);
});
