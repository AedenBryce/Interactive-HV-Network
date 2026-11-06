import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { planOrthogonalRoutes, type ReservedRoute } from './orthogonal-route-planner';

/** Reroute one selected tie feeder around all fixed routes and visible blockers. */
export function rerouteSw454ToSw505(
  model: NetworkModel,
  network: ReturnType<typeof import('./continuous-network').continuousNetwork>,
) {
  const id = 'sw454:sw505:cable-SW505-P-01';
  const points = network.routes.get(id);
  if (!points || points.length < 2) return { applied: false as const, reason: 'route-not-found' as const };
  const connection = model.connections.find(item => item.id === id);
  if (!connection) return { applied: false as const, reason: 'connection-not-found' as const };
  const memberRoom = new Map(network.panels.flatMap(panel => (panel.memberAssetIds ?? panel.assetIds).map(assetId => [assetId, panel.id] as const)));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const fromAsset = ownerByTerminal.get(connection.from) ?? '';
  const toAsset = ownerByTerminal.get(connection.to) ?? '';
  const fromRoom = memberRoom.get(fromAsset);
  const toRoom = memberRoom.get(toAsset);
  const frameObstacles = network.panels.map(panel => ({ id: `frame:${panel.id}`, x: panel.x, y: panel.y, width: panel.width, height: panel.height }));
  const assetObstacles = model.assets.map(asset => {
    const [x, y] = network.view.layout.assets[asset.id];
    return { id: `symbol:${asset.id}`, x: x - 38, y: y - 38, width: 76, height: 76 };
  });
  const labelObstacles = [...network.labels].map(([assetId, label]) => ({ id: `label:${assetId}`, ...label }));
  const ignored = [
    `symbol:${fromAsset}`, `symbol:${toAsset}`, `label:${fromAsset}`, `label:${toAsset}`,
    ...(fromRoom ? [`frame:${fromRoom}`] : []),
    ...(toRoom && toRoom !== fromRoom ? [`frame:${toRoom}`] : []),
  ];
  const request = {
    id,
    from: points[0] as Point,
    to: points.at(-1)! as Point,
    fromTerminalId: connection.from,
    toTerminalId: connection.to,
    preferDown: true,
    order: 0,
    ignoredObstacleIds: ignored,
  };
  const reservedRoutes: ReservedRoute[] = [...network.routes]
    .filter(([routeId]) => routeId !== id)
    .map(([routeId, route]) => {
      const other = model.connections.find(item => item.id === routeId)!;
      return { id: routeId, points: route, fromTerminalId: other.from, toTerminalId: other.to };
    });
  const result = planOrthogonalRoutes([request], {
    obstacles: [...frameObstacles, ...assetObstacles, ...labelObstacles],
    reservedRoutes,
    clearance: 16,
    localSearchPadding: 1_200,
    maxLocalSearchPadding: 20_000,
    maxSearchAttempts: 5,
    maxGridNodes: 80_000,
    bendPenalty: 240,
    allowCrossings: false,
  });
  const replacement = result.routes.get(id);
  if (!replacement) return { applied: false as const, reason: result.unresolved[0]?.reason ?? 'no-path' };
  const updated = new Map(network.routes);
  updated.set(id, replacement.map(point => [point[0], point[1]] as Point));
  return { applied: true as const, routes: updated, original: points, replacement, unresolved: result.unresolved };
}
