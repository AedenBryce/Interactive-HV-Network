import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { cutsBox } from './diagram-geometry';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { supplementTopDownRoutes, supplementTopDownRoutesLocalFirst } from './top-down-supplemental-route-pass';
import { switchroomMemberships } from './switchroom-frames';

describe('isolated topology-first supplemental route pass', () => {
  it('preserves accepted paths and reports exact unresolved and collision diagnostics', () => {
    const model = currentNetworkModel;
    const candidate = layoutTopDownFullNetwork(model);
    const firstPass = supplementTopDownRoutes(model, candidate);
    const supplemental = supplementTopDownRoutesLocalFirst(model, candidate, firstPass.routes);
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const byConnection = new Map(model.connections.map(connection => [connection.id, connection]));
    const geometryRoutes: GeometryRoute[] = [...supplemental.routes].map(([id, points]) => {
      const connection = byConnection.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({ routes: geometryRoutes, roomFrames: candidate.roomFrames });
    const supplementalIds = new Set([...supplemental.routes.keys()].filter(id => !candidate.routes.has(id)));
    const crossingFindings = findings.filter((item): item is Extract<typeof item, { type: 'route-crossing' }> => item.type === 'route-crossing');
    const sharedFindings = findings.filter((item): item is Extract<typeof item, { type: 'shared-route-length' }> => item.type === 'shared-route-length');
    const endpointFindings = findings.filter((item): item is Extract<typeof item, { type: 'route-endpoint-on-interior' }> => item.type === 'route-endpoint-on-interior');
    const diagonalFindings = findings.filter((item): item is Extract<typeof item, { type: 'non-orthogonal' }> => item.type === 'non-orthogonal');
    const roomOverlapFindings = findings.filter((item): item is Extract<typeof item, { type: 'room-frame-overlap' }> => item.type === 'room-frame-overlap');
    const frameCutFindings = findings.filter((item): item is Extract<typeof item, { type: 'route-room-frame' }> => item.type === 'route-room-frame');
    const cuts: string[] = [];
    for (const route of geometryRoutes) for (let index = 1; index < route.points.length; index++) {
      const from = route.points[index - 1] as [number, number]; const to = route.points[index] as [number, number];
      const connection = byConnection.get(route.id)!;
      for (const [assetId, label] of candidate.labels) {
        if ([ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)].includes(assetId)) continue;
        if (cutsBox(from, to, label)) cuts.push(`${route.id}→${assetId}:label`);
      }
      for (const symbol of candidate.symbolBoxes) {
        if ([`symbol:${ownerByTerminal.get(connection.from)}`, `symbol:${ownerByTerminal.get(connection.to)}`].includes(symbol.id)) continue;
        if (cutsBox(from, to, symbol)) cuts.push(`${route.id}→${symbol.id}`);
      }
    }
    const summary = {
      initialRouteCount: candidate.routes.size,
      initialUnresolvedCount: candidate.connectionsWithoutRoute.length,
      initialUnresolved: candidate.unresolved,
      firstPassRoutesAdded: firstPass.routedSupplementCount,
      routesAddedSecondPass: supplemental.routedSupplementCount,
      secondPassFailuresByReason: Object.fromEntries([...new Set(supplemental.failures.map(item => item.reason))].map(reason => [reason, supplemental.failures.filter(item => item.reason === reason).map(item => item.id)])),
      remainingCount: supplemental.connectionsWithoutRoute.length,
      remaining: supplemental.connectionsWithoutRoute,
      supplementalIds: [...supplementalIds],
      supplementalCrossings: crossingFindings.filter(item => item.routeIds.some(id => supplementalIds.has(id))).map(item => item.routeIds.join('|')),
      supplementalSharedLengths: sharedFindings.filter(item => item.routeIds.some(id => supplementalIds.has(id))).map(item => item.routeIds.join('|')),
      supplementalEndpointContacts: endpointFindings.filter(item => item.routeIds.some(id => supplementalIds.has(id))).map(item => item.routeIds.join('|')),
      supplementalNonOrthogonal: diagonalFindings.filter(item => supplementalIds.has(item.routeId)).map(item => item.routeId),
      frameOverlaps: roomOverlapFindings.map(item => item.roomFrameIds.join('|')),
      supplementalFrameCuts: frameCutFindings.filter(item => supplementalIds.has(item.routeId)).map(item => `${item.routeId}→${item.roomFrameId}`),
      symbolLabelCuts: [...new Set(cuts.filter(item => supplementalIds.has(item.split('→')[0])))],
      expectedEndpointRoomCuts: (() => {
        const memberships = switchroomMemberships(model);
        return frameCutFindings.filter(item => supplementalIds.has(item.routeId)).filter(finding => {
          const connection = byConnection.get(finding.routeId)!;
          const members = memberships.find(room => room.id === finding.roomFrameId)?.memberAssetIds ?? [];
          return members.includes(ownerByTerminal.get(connection.from)!) || members.includes(ownerByTerminal.get(connection.to)!);
        }).map(item => `${item.routeId}→${item.roomFrameId}`);
      })(),
      unrelatedRoomCuts: (() => {
        const memberships = switchroomMemberships(model);
        return frameCutFindings.filter(item => supplementalIds.has(item.routeId)).filter(finding => {
          const connection = byConnection.get(finding.routeId)!;
          const members = memberships.find(room => room.id === finding.roomFrameId)?.memberAssetIds ?? [];
          return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
        }).map(item => `${item.routeId}→${item.roomFrameId}`);
      })(),
    };
    console.info('top-down supplemental pass', JSON.stringify(summary));
    expect(candidate.routes.size).toBe(614);
    expect(candidate.connectionsWithoutRoute).toHaveLength(63);
  }, 180_000);
});
