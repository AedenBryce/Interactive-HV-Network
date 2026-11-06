import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { switchroomMemberships } from './switchroom-frames';

function boxOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe('isolated topology-first full-network layout experiment', () => {
  it('audits full real-model asset, route, label, symbol and room coverage', () => {
    const model = currentNetworkModel;
    const layout = layoutTopDownFullNetwork(model);
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const routes: GeometryRoute[] = [...layout.routes].map(([id, points]) => {
      const connection = model.connections.find(item => item.id === id)!;
      return { id, points: points.map(([x, y]) => [x, y] as [number, number]), terminals: [connection.from, connection.to] };
    });
    const symbolOverlaps: string[] = [];
    const symbols = layout.symbolBoxes;
    for (let i = 0; i < symbols.length; i++) for (let j = i + 1; j < symbols.length; j++) {
      if (boxOverlap(symbols[i], symbols[j])) symbolOverlaps.push(`${symbols[i].id}/${symbols[j].id}`);
    }
    const labelOverlaps: string[] = [];
    const labelEntries = [...layout.labels];
    for (let i = 0; i < labelEntries.length; i++) for (let j = i + 1; j < labelEntries.length; j++) {
      if (boxOverlap(labelEntries[i][1], labelEntries[j][1])) labelOverlaps.push(`${labelEntries[i][0]}/${labelEntries[j][0]}`);
    }
    const symbolLabelOverlaps: string[] = [];
    for (const symbol of symbols) for (const [assetId, label] of labelEntries) {
      if (symbol.id !== `symbol:${assetId}` && boxOverlap(symbol, label)) symbolLabelOverlaps.push(`${symbol.id}/${assetId}`);
    }
    const lineLabelHits: string[] = [];
    const lineSymbolHits: string[] = [];
    for (const route of routes) for (let i = 1; i < route.points.length; i++) {
      const from = route.points[i - 1] as [number, number];
      const to = route.points[i] as [number, number];
      for (const [assetId, label] of labelEntries) {
        const connection = model.connections.find(item => item.id === route.id)!;
        if (owners.get(connection.from) === assetId || owners.get(connection.to) === assetId) continue;
        if (cutsBox(from, to, label)) lineLabelHits.push(`${route.id}/${assetId}`);
      }
      for (const symbol of symbols) {
        const connection = model.connections.find(item => item.id === route.id)!;
        if (symbol.id === `symbol:${owners.get(connection.from)}` || symbol.id === `symbol:${owners.get(connection.to)}`) continue;
        if (cutsBox(from, to, symbol)) lineSymbolHits.push(`${route.id}/${symbol.id}`);
      }
    }
    const geometryFindings = validateDiagramGeometry({ routes, roomFrames: layout.roomFrames });
    const frameOverlaps = geometryFindings.filter(item => item.type === 'room-frame-overlap');
    const crossings = geometryFindings.filter(item => item.type === 'route-crossing');
    const sharedLengths = geometryFindings.filter(item => item.type === 'shared-route-length');
    const nonOrthogonal = geometryFindings.filter(item => item.type === 'non-orthogonal');
    const borderHits = geometryFindings.filter(item => item.type === 'route-room-frame');
    const roomMembership = switchroomMemberships(model);
    const frameById = new Map(roomMembership.map(item => [item.id, new Set(item.memberAssetIds)]));
    const unapprovedBorderHits = borderHits.filter(finding => {
      if (finding.type !== 'route-room-frame') return false;
      const connection = model.connections.find(item => item.id === finding.routeId)!;
      const members = frameById.get(finding.roomFrameId);
      if (!members) return true;
      return !members.has(owners.get(connection.from)!) && !members.has(owners.get(connection.to)!);
    });
    const fitScales = {
      desktop1440x900: Math.min(1340 / layout.bounds.width, 720 / layout.bounds.height),
      narrow390x1000: Math.min(350 / layout.bounds.width, 820 / layout.bounds.height),
    };
    const metrics = {
      assets: model.assets.length,
      positionedAssets: Object.keys(layout.positions).length,
      connections: model.connections.length,
      routedConnections: layout.routes.size,
      unresolvedConnections: layout.connectionsWithoutRoute.length,
      routingStages: layout.routingStages,
      roots: new Set([...layout.treeConnectionIds]).size,
      bounds: layout.bounds,
      aspectRatio: +(layout.bounds.width / layout.bounds.height).toFixed(3),
      desktopFitPercent: +(fitScales.desktop1440x900 * 100).toFixed(2),
      narrowFitPercent: +(fitScales.narrow390x1000 * 100).toFixed(2),
      roomFrames: layout.roomFrames.length,
      roomFramesWithoutOverlap: frameOverlaps.length === 0,
      roomFrameOverlapCount: frameOverlaps.length,
      assetsWithoutRoom: layout.assetsWithoutRoom.length,
      symbolOverlaps: symbolOverlaps.length,
      labelOverlaps: labelOverlaps.length,
      symbolLabelOverlaps: symbolLabelOverlaps.length,
      lineLabelHits: lineLabelHits.length,
      lineSymbolHits: lineSymbolHits.length,
      crossings: crossings.length,
      sharedRouteLengths: sharedLengths.length,
      nonOrthogonal: nonOrthogonal.length,
      unapprovedRoomBorderHits: unapprovedBorderHits.length,
      unresolvedReasons: layout.unresolved.slice(0, 30),
    };
    console.info('top-down full-network prototype audit', metrics);

    // Coverage and geometry gates are deliberately strict: a partial layout is
    // not evidence that the whole-network single-line is ready to integrate.
    expect(layout.positions).toHaveProperty(model.assets[0].id);
    expect(Object.keys(layout.positions)).toHaveLength(model.assets.length);
    expect(layout.routes.size).toBe(model.connections.length);
    expect(layout.connectionsWithoutRoute).toEqual([]);
    expect(layout.unresolved).toEqual([]);
    expect(frameOverlaps).toEqual([]);
    expect(symbolOverlaps).toEqual([]);
    expect(labelOverlaps).toEqual([]);
    expect(symbolLabelOverlaps).toEqual([]);
    expect(lineLabelHits).toEqual([]);
    expect(lineSymbolHits).toEqual([]);
    expect(crossings).toEqual([]);
    expect(sharedLengths).toEqual([]);
    expect(nonOrthogonal).toEqual([]);
    expect(unapprovedBorderHits).toEqual([]);
  }, 120_000);
});
