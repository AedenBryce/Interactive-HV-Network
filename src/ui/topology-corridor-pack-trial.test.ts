import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';

describe('topology room-tree corridor placement trial', () => {
  it('measures complete layout geometry after topology-based room packing', () => {
    const model = currentNetworkModel;
    const layout = layoutTopDownFullNetwork(model, { placement: 'topology-staggered' });
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const byConnection = new Map(model.connections.map(connection => [connection.id, connection]));
    const routes: GeometryRoute[] = [...layout.routes].map(([id, points]) => ({
      id,
      points: points.map(([x, y]) => [x, y] as [number, number]),
      terminals: [byConnection.get(id)!.from, byConnection.get(id)!.to],
    }));
    const symbols = layout.symbolBoxes;
    const lineLabelHits: string[] = [];
    const lineSymbolHits: string[] = [];
    for (const route of routes) for (let index = 1; index < route.points.length; index++) {
      const from = route.points[index - 1] as [number, number];
      const to = route.points[index] as [number, number];
      const connection = byConnection.get(route.id)!;
      for (const [assetId, label] of layout.labels) {
        if (owners.get(connection.from) === assetId || owners.get(connection.to) === assetId) continue;
        if (cutsBox(from, to, label)) lineLabelHits.push(`${route.id}/${assetId}`);
      }
      for (const symbol of symbols) {
        if (symbol.id === `symbol:${owners.get(connection.from)}` || symbol.id === `symbol:${owners.get(connection.to)}`) continue;
        if (cutsBox(from, to, symbol)) lineSymbolHits.push(`${route.id}/${symbol.id}`);
      }
    }
    const findings = validateDiagramGeometry({ routes, roomFrames: layout.roomFrames });
    console.info('topology corridor packing trial', {
      assets: model.assets.length,
      positionedAssets: Object.keys(layout.positions).length,
      connections: model.connections.length,
      routedConnections: layout.routes.size,
      aspectRatio: +(layout.bounds.width / layout.bounds.height).toFixed(3),
      roomFrames: layout.roomFrames.length,
      assetsWithoutRoom: layout.assetsWithoutRoom.length,
      unresolvedConnections: layout.connectionsWithoutRoute.length,
      crossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: findings.filter(item => item.type === 'shared-route-length').length,
      frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      lineLabelHits: lineLabelHits.length,
      lineSymbolHits: lineSymbolHits.length,
    });
  }, 120_000);
});
