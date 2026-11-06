import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { withRoomModuleLayout } from './room-module-layout-preview';
import { orthogonalPoints } from './diagram-geometry';
import { resolveRoutes } from './resolve-routes';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

describe('room-module candidate completion diagnostic', () => {
  it('fills missing candidate routes from modeled terminals and reports full graph geometry', () => {
    const model = currentNetworkModel;
    const base = continuousNetwork(model);
    const candidate = withRoomModuleLayout(model, base);
    const routes = new Map(candidate.routes);
    const missing = model.connections.filter(connection => !routes.has(connection.id));
    for (const connection of missing) {
      const from = candidate.view.layout.terminals[connection.from];
      const to = candidate.view.layout.terminals[connection.to];
      if (from && to) routes.set(connection.id, orthogonalPoints([from, [to[0], from[1]], to]));
    }
    const selected = new Set(missing.map(connection => connection.id));
    const diagnostics = [];
    for (let pass = 0; pass < 3; pass++) {
      const result = resolveRoutes(
        model,
        candidate.view.layout,
        candidate.labels,
        routes,
        candidate.hiddenIds ?? new Set(),
        selected,
        undefined,
        candidate.panels,
      );
      diagnostics.push(result);
      if (!result.conflictCount || !result.reroutedConnectionIds.length) break;
    }
    const geometryRoutes: GeometryRoute[] = model.connections.flatMap(connection => {
      const points = routes.get(connection.id);
      return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] }] : [];
    });
    const findings = validateDiagramGeometry({
      routes: geometryRoutes,
      roomFrames: candidate.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    });
    const count = (type: string) => findings.filter(finding => finding.type === type).length;
    console.log(JSON.stringify({
      assetCount: Object.keys(candidate.view.layout.assets).length,
      connectionCount: model.connections.length,
      routedConnections: routes.size,
      initiallyMissingRoutes: missing.map(connection => connection.id),
      remainingMissingRoutes: model.connections.filter(connection => !routes.has(connection.id)).map(connection => connection.id),
      diagnostics,
      properCrossings: count('route-crossing'),
      sharedRouteLengths: count('shared-route-length'),
      endpointOnInterior: count('route-endpoint-on-interior'),
      roomFrameOverlaps: count('room-frame-overlap'),
      routeFrameIntersections: count('route-room-frame'),
      nonOrthogonal: count('non-orthogonal'),
    }, null, 2));
  }, 180_000);
});
