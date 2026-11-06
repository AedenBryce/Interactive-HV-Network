import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry } from './geometry-validator';
import { resolveRoutes } from './resolve-routes';

/**
 * Experimental fixed-coordinate rip-up pass. It reroutes one crossing route
 * at a time while reserving every other connection, so accepted changes cannot
 * erase or merge the rest of the network. This is deliberately not wired into
 * the production renderer.
 */
export function repairCrossingsOneAtATime(model: NetworkModel, maxAttempts = 8) {
  const network = continuousNetwork(model);
  const initialEndpoints = new Map([...network.routes].map(([id, points]) => [id, [points[0], points.at(-1)!] as const]));
  const routeCounts = () => {
    const routes = [...model.connections].flatMap(connection => {
      const points = network.routes.get(connection.id);
      return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
    });
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: network.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    });
    return {
      routes,
      crossings: findings.filter(item => item.type === 'route-crossing'),
      shared: findings.filter(item => item.type === 'shared-route-length'),
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior'),
      frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap'),
    };
  };

  const initial = routeCounts();
  const attempted = new Set<string>();
  const accepted: string[] = [];
  const unresolved = new Set<string>();
  const startedAt = Date.now();
  for (let pass = 0; pass < maxAttempts; pass++) {
    const state = routeCounts();
    if (!state.crossings.length) break;
    const frequency = new Map<string, number>();
    for (const finding of state.crossings) for (const id of finding.routeIds) frequency.set(id, (frequency.get(id) ?? 0) + 1);
    const candidates = [...frequency].filter(([id]) => !attempted.has(id))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const candidate = candidates[0]?.[0];
    if (!candidate) break;
    attempted.add(candidate);
    const before = network.routes.get(candidate)?.map(point => [...point]) ?? [];
    const diagnostic = resolveRoutes(
      model,
      network.view.layout,
      network.labels,
      network.routes,
      network.hiddenIds,
      new Set([candidate]),
      undefined,
      network.panels,
      { clearance: 16, maxLocalSearchPadding: 2048, maxSearchAttempts: 2, maxGridNodes: 35_000 },
    );
    const after = network.routes.get(candidate) ?? [];
    const changed = before.length !== after.length || before.some((point, index) => point[0] !== after[index]?.[0] || point[1] !== after[index]?.[1]);
    if (diagnostic.unresolvedConnectionIds.includes(candidate) || !changed) unresolved.add(candidate);
    else accepted.push(candidate);
  }
  const final = routeCounts();
  return {
    network,
    metrics: {
      initial: { crossings: initial.crossings.length, sharedRouteLengths: initial.shared.length, endpointContacts: initial.endpointContacts.length, frameOverlaps: initial.frameOverlaps.length },
      final: { crossings: final.crossings.length, sharedRouteLengths: final.shared.length, endpointContacts: final.endpointContacts.length, frameOverlaps: final.frameOverlaps.length },
      accepted,
      unresolved: [...unresolved],
      attempted: [...attempted],
      runtimeMs: Date.now() - startedAt,
      routeCount: network.routes.size,
      assetCount: network.assets.length,
      positionedAssetCount: Object.keys(network.view.layout.assets).length,
      endpointsPreserved: [...initialEndpoints].every(([id, endpoints]) => {
        const current = network.routes.get(id);
        return !!current && samePoint(current[0], endpoints[0]) && samePoint(current.at(-1)!, endpoints[1]);
      }),
    },
  };
}

function samePoint(a: readonly number[], b: readonly number[]) {
  return a[0] === b[0] && a[1] === b[1];
}
