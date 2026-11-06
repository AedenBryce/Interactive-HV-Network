import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { planOrthogonalRoutes, type ReservedRoute } from './orthogonal-route-planner';

/**
 * Isolated tree-layout trial: place only the SW505 room directly below and
 * centered on SW454. This is display geometry only; it makes no geographic
 * claim and does not edit owner confirmation or electrical topology.
 */
export function placeSw505BelowSw454(
  model: NetworkModel,
  network: ReturnType<typeof import('./continuous-network').continuousNetwork>,
) {
  const sourceId = 'stockpile/stockpile-hv';
  const targetId = 'stockpile/wet-hv';
  const source = network.panels.find(frame => frame.id === sourceId);
  const target = network.panels.find(frame => frame.id === targetId);
  if (!source || !target) return { applied: false as const, reason: 'room-frame-not-found' as const };
  const targetX = source.x + (source.width - target.width) / 2;
  const targetY = source.y + source.height + 640;
  const dx = targetX - target.x;
  const dy = targetY - target.y;
  const moved = new Set(target.memberAssetIds ?? target.assetIds);
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const externalConnections = model.connections.filter(connection => {
    const fromMoved = moved.has(owners.get(connection.from) ?? '');
    const toMoved = moved.has(owners.get(connection.to) ?? '');
    return fromMoved !== toMoved;
  });
  const positions = { ...network.view.layout.assets };
  for (const id of moved) if (positions[id]) positions[id] = [positions[id][0] + dx, positions[id][1] + dy];
  const terminals = { ...network.view.layout.terminals };
  for (const assetId of moved) {
    const asset = model.assets.find(candidate => candidate.id === assetId);
    for (const terminal of asset?.terminals ?? []) if (terminals[terminal]) terminals[terminal] = [terminals[terminal][0] + dx, terminals[terminal][1] + dy];
  }
  const labels = new Map(network.labels);
  for (const id of moved) {
    const label = labels.get(id);
    if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
  }
  const panels = network.panels.map(frame => frame.id === targetId ? { ...frame, x: targetX, y: targetY } : frame);
  const routes = new Map(network.routes);
  for (const connection of model.connections) {
    const fromMoved = moved.has(owners.get(connection.from) ?? '');
    const toMoved = moved.has(owners.get(connection.to) ?? '');
    if (fromMoved && toMoved) {
      const current = routes.get(connection.id);
      if (current) routes.set(connection.id, current.map(([x, y]) => [x + dx, y + dy] as Point));
    } else if (fromMoved !== toMoved) {
      routes.delete(connection.id);
    }
  }
  if (externalConnections.length !== 1) {
    return { applied: false as const, reason: 'unexpected-external-connection-count' as const, externalConnectionIds: externalConnections.map(item => item.id), movedAssetCount: moved.size, dx, dy, panels };
  }
  const connection = externalConnections[0];
  const routeRequest = {
    id: connection.id,
    from: terminals[connection.from] as Point,
    to: terminals[connection.to] as Point,
    fromTerminalId: connection.from,
    toTerminalId: connection.to,
    preferDown: true,
    order: 0,
    ignoredObstacleIds: [
      `symbol:${owners.get(connection.from)}`,
      `symbol:${owners.get(connection.to)}`,
      `label:${owners.get(connection.from)}`,
      `label:${owners.get(connection.to)}`,
      `frame:${sourceId}`,
      `frame:${targetId}`,
    ],
  };
  const reservedRoutes: ReservedRoute[] = [...routes].map(([id, points]) => {
    const link = model.connections.find(item => item.id === id)!;
    return { id, points, fromTerminalId: link.from, toTerminalId: link.to };
  });
  const symbolObstacles = model.assets.map(asset => {
    const [x, y] = positions[asset.id];
    return { id: `symbol:${asset.id}`, x: x - 38, y: y - 38, width: 76, height: 76 };
  });
  const labelObstacles = [...labels].map(([id, box]) => ({ id: `label:${id}`, ...box }));
  const frameObstacles = panels.map(frame => ({ id: `frame:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const planned = planOrthogonalRoutes([routeRequest], {
    obstacles: [...symbolObstacles, ...labelObstacles, ...frameObstacles],
    reservedRoutes,
    clearance: 16,
    localSearchPadding: 1_000,
    maxLocalSearchPadding: 18_000,
    maxSearchAttempts: 5,
    maxGridNodes: 80_000,
    bendPenalty: 180,
  });
  const replacement = planned.routes.get(connection.id);
  if (!replacement) return {
    applied: false as const,
    reason: planned.unresolved[0]?.reason ?? 'no-path',
    externalConnectionIds: externalConnections.map(item => item.id),
    movedAssetCount: moved.size,
    delta: [dx, dy] as Point,
    sourceFrame: source,
    targetFrame: target,
    targetBounds: { x: targetX, y: targetY, width: target.width, height: target.height },
    movedRouteIds: [...routes.keys()].filter(id => moved.has(owners.get(model.connections.find(item => item.id === id)?.from ?? '') ?? '')),
  };
  routes.set(connection.id, replacement.map(([x, y]) => [x, y] as Point));
  return {
    applied: true as const,
    routes,
    positions,
    terminals,
    labels,
    panels,
    movedAssetCount: moved.size,
    externalConnectionIds: externalConnections.map(item => item.id),
    delta: [dx, dy] as Point,
    sourceFrame: source,
    targetFrame: target,
    targetBounds: { x: targetX, y: targetY, width: target.width, height: target.height },
    original: network.routes.get(connection.id),
    replacement,
  };
}
