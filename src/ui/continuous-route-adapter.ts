import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { equipmentPorts } from './diagram-geometry';
import type { AssetLabel, Point } from './diagram-geometry';
import { hasDeviceCard } from './equipment-appearance';
import { deviceCard } from './device-card';
import { planOrthogonalRoutes } from './orthogonal-route-planner';
import type { OrthogonalRouteOptions, ReservedRoute, RouteUnresolved } from './orthogonal-route-planner';

export type RouteRoomFrame = { id: string; x: number; y: number; width: number; height: number };
export type ConnectionEndpoints = (connection: NetworkModel['connections'][number]) => { from: Point; to: Point };
export type ContinuousRouteAdapterOptions = Omit<OrthogonalRouteOptions, 'obstacles' | 'reservedRoutes'> & {
  endpoints?: ConnectionEndpoints;
  preferredRoutes?: ReadonlyMap<string, readonly Point[]>;
  roomFrames?: readonly RouteRoomFrame[];
  hiddenAssetIds?: ReadonlySet<string>;
  /** Tree edges route first, helping the page read from supply roots downward. */
  treeEdgeIds?: ReadonlySet<string>;
};
export type ContinuousRouteDiagnostics = {
  routedConnectionCount: number;
  reservedLeadCount: number;
  obstacleCount: number;
  unresolved: readonly (RouteUnresolved | { routeId: string; reason: 'missing-terminal-coordinate' })[];
};
export type ContinuousRouteAdapterResult = {
  routes: Map<string, Point[]>;
  diagnostics: ContinuousRouteDiagnostics;
};

/**
 * Builds geometry-only obstacles and lead reservations, then plans every model
 * connection. This function consumes the immutable model but never changes it.
 * A caller may supply the same tapped endpoints it uses for its existing routes.
 */
export function routeContinuousConnectors(
  model: NetworkModel,
  layout: DiagramLayout,
  labels: ReadonlyMap<string, AssetLabel>,
  options: ContinuousRouteAdapterOptions = {},
): ContinuousRouteAdapterResult {
  const hidden = options.hiddenAssetIds ?? new Set<string>();
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const endpointRoomFrameIds = (point: Point) => (options.roomFrames ?? [])
    .filter(room => point[0] >= room.x && point[0] <= room.x + room.width
      && point[1] >= room.y && point[1] <= room.y + room.height)
    .map(room => `room-frame:${room.id}`);

  const obstacles = [] as NonNullable<OrthogonalRouteOptions['obstacles']>[number][];
  for (const asset of model.assets) {
    if (hidden.has(asset.id)) continue;
    const position = layout.assets[asset.id]; const label = labels.get(asset.id);
    if (!position || !label) continue;
    if (hasDeviceCard(asset)) {
      const card = deviceCard(asset, position, label);
      obstacles.push({ id: `asset-card:${asset.id}`, x: position[0] + card.x, y: position[1] + card.y, width: card.width, height: card.height });
    } else {
      obstacles.push({ id: `asset-symbol:${asset.id}`, x: position[0] - 48, y: position[1] - 48, width: 96, height: 96 });
    }
    obstacles.push({ id: `asset-label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
  }
  for (const room of options.roomFrames ?? []) obstacles.push({ ...room, id: `room-frame:${room.id}` });

  const reservedRoutes: ReservedRoute[] = [];
  for (const asset of model.assets) {
    if (hidden.has(asset.id) || !layout.assets[asset.id]) continue;
    const { ports } = equipmentPorts(asset, layout);
    asset.terminals.forEach((terminal, index) => {
      const terminalPoint = layout.terminals[terminal]; const port = ports[index];
      if (!terminalPoint || !port) return;
      const center = layout.assets[asset.id];
      const portPoint: Point = [center[0] + port[0], center[1] + port[1]];
      if (samePoint(terminalPoint, portPoint)) return;
      const points = orthogonalLead(terminalPoint, portPoint);
      reservedRoutes.push({
        id: `device-lead:${asset.id}:${terminal}`,
        points,
        fromTerminalId: terminal,
        toTerminalId: `symbol-port:${asset.id}:${terminal}`,
      });
    });
  }

  const unresolved: ContinuousRouteDiagnostics['unresolved'][number][] = [];
  const requests = [] as Parameters<typeof planOrthogonalRoutes>[0][number][];
  for (const connection of model.connections) {
    const endpointOwners = [owners.get(connection.from), owners.get(connection.to)];
    const endpoints = options.endpoints?.(connection) ?? {
      from: layout.terminals[connection.from], to: layout.terminals[connection.to],
    };
    if (!endpoints?.from || !endpoints?.to || !endpoints.from.every(Number.isFinite) || !endpoints.to.every(Number.isFinite)) {
      unresolved.push({ routeId: connection.id, reason: 'missing-terminal-coordinate' });
      continue;
    }
    const [fromOwner, toOwner] = endpointOwners;
    const ignoredObstacleIds = [
      ...(fromOwner ? [`asset-card:${fromOwner}`, `asset-symbol:${fromOwner}`] : []),
      ...(toOwner ? [`asset-card:${toOwner}`, `asset-symbol:${toOwner}`] : []),
      ...endpointRoomFrameIds(endpoints.from),
      ...endpointRoomFrameIds(endpoints.to),
    ];
    const topDown = options.treeEdgeIds?.has(connection.id) ?? false;
    const reverse = topDown && endpoints.to[1] < endpoints.from[1];
    const from = reverse ? endpoints.to : endpoints.from;
    const to = reverse ? endpoints.from : endpoints.to;
    requests.push({
      id: connection.id,
      from,
      to,
      fromTerminalId: reverse ? connection.to : connection.from,
      toTerminalId: reverse ? connection.from : connection.to,
      preferDown: topDown,
      order: topDown ? 0 : 1,
      ignoredObstacleIds,
      preferredPath: (() => {
        const preferred = options.preferredRoutes?.get(connection.id);
        return preferred ? (reverse ? [...preferred].reverse() : preferred) : undefined;
      })(),
    });
  }

  const plan = planOrthogonalRoutes(requests, {
    ...options,
    obstacles,
    reservedRoutes,
  });
  const routes = new Map<string, Point[]>();
  for (const [id, points] of plan.routes) {
    const request = requests.find(candidate => candidate.id === id)!;
    const connection = model.connections.find(candidate => candidate.id === id)!;
    const reversed = request.fromTerminalId === connection.to && request.toTerminalId === connection.from;
    routes.set(id, (reversed ? [...points].reverse() : [...points]).map(point => [point[0], point[1]]));
  }
  unresolved.push(...plan.unresolved);
  return {
    routes,
    diagnostics: {
      routedConnectionCount: routes.size,
      reservedLeadCount: reservedRoutes.length,
      obstacleCount: obstacles.length,
      unresolved,
    },
  };
}

function orthogonalLead(from: Point, to: Point): Point[] {
  if (from[0] === to[0] || from[1] === to[1]) return [[...from], [...to]];
  return [[...from], [to[0], from[1]], [...to]];
}
function samePoint(a: Point, b: Point) { return a[0] === b[0] && a[1] === b[1]; }
