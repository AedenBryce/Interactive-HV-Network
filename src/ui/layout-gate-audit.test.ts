import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { composeRoomPanels } from './room-composition-prototype';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

const intersectsSegment = (a: [number, number], b: [number, number], box: { x: number; y: number; width: number; height: number }) => {
  if (a[0] === b[0]) return a[0] >= box.x && a[0] <= box.x + box.width
    && Math.max(Math.min(a[1], b[1]), box.y) < Math.min(Math.max(a[1], b[1]), box.y + box.height);
  if (a[1] === b[1]) return a[1] >= box.y && a[1] <= box.y + box.height
    && Math.max(Math.min(a[0], b[0]), box.x) < Math.min(Math.max(a[0], b[0]), box.x + box.width);
  return true;
};

const crossesFrameInterior = (a: [number, number], b: [number, number], frame: { x: number; y: number; width: number; height: number }) => {
  if (a[0] === b[0]) return a[0] > frame.x && a[0] < frame.x + frame.width
    && Math.max(Math.min(a[1], b[1]), frame.y) < Math.min(Math.max(a[1], b[1]), frame.y + frame.height);
  if (a[1] === b[1]) return a[1] > frame.y && a[1] < frame.y + frame.height
    && Math.max(Math.min(a[0], b[0]), frame.x) < Math.min(Math.max(a[0], b[0]), frame.x + frame.width);
  return true;
};

const hasPositiveOverlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

type RoutedSegment = { routeId: string; index: number; from: [number, number]; to: [number, number] };

const sharedLength = (a: RoutedSegment, b: RoutedSegment) => {
  if (a.from[0] === a.to[0] && b.from[0] === b.to[0] && a.from[0] === b.from[0]) {
    return Math.max(0, Math.min(Math.max(a.from[1], a.to[1]), Math.max(b.from[1], b.to[1])) - Math.max(Math.min(a.from[1], a.to[1]), Math.min(b.from[1], b.to[1])));
  }
  if (a.from[1] === a.to[1] && b.from[1] === b.to[1] && a.from[1] === b.from[1]) {
    return Math.max(0, Math.min(Math.max(a.from[0], a.to[0]), Math.max(b.from[0], b.to[0])) - Math.max(Math.min(a.from[0], a.to[0]), Math.min(b.from[0], b.to[0])));
  }
  return 0;
};

const endpointContact = (a: RoutedSegment, b: RoutedSegment): [number, number] | undefined => {
  for (const first of [a.from, a.to]) for (const second of [b.from, b.to]) {
    if (first[0] === second[0] && first[1] === second[1]) return first;
  }
  return undefined;
};

const summarizeRoutingDiagnostics = (diagnostics: readonly {
  conflictCount: number;
  reroutedConnectionIds: string[];
  unresolvedConnectionIds: string[];
}[]) => ({
  passes: diagnostics.length,
  conflictCountPerPass: diagnostics.map(item => item.conflictCount),
  finalConflictCount: diagnostics.at(-1)?.conflictCount ?? 0,
  finalReroutedConnectionIds: diagnostics.at(-1)?.reroutedConnectionIds ?? [],
  finalUnresolvedConnectionIds: diagnostics.at(-1)?.unresolvedConnectionIds ?? [],
  reroutedConnectionIds: [...new Set(diagnostics.flatMap(item => item.reroutedConnectionIds))].sort(),
  unresolvedConnectionIds: [...new Set(diagnostics.flatMap(item => item.unresolvedConnectionIds))].sort(),
});

describe('whole-network layout acceptance audit (diagnostic; intentionally records failures)', () => {
  it('reports complete production and room-composition geometry', () => {
    const model = currentNetworkModel;
    const layoutStrategy = process.env.HV_LAYOUT_STRATEGY === 'vertical-candidate'
      ? 'vertical-candidate'
      : process.env.HV_LAYOUT_STRATEGY === 'sw505-corridor-candidate'
        ? 'sw505-corridor-candidate'
        : process.env.HV_LAYOUT_STRATEGY === 'crossing-optimizer-candidate'
          ? 'crossing-optimizer-candidate'
          : 'production';
    const production = continuousNetwork(model, layoutStrategy);
    const routeMap = production.routes;
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const modelConnectionIds = new Set(model.connections.map(connection => connection.id));
    const routedIds = new Set(routeMap.keys());
    const routes: GeometryRoute[] = model.connections.flatMap(connection => {
      const points = routeMap.get(connection.id);
      return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
    });
    const routeFindings = validateDiagramGeometry({
      routes,
      roomFrames: production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    });
    const roomByAsset = new Map(production.panels.flatMap(panel => (panel.memberAssetIds ?? panel.assetIds).map(id => [id, panel.id] as const)));
    const routeFrameClassifications = routeFindings.flatMap(finding => {
      if (finding.type !== 'route-room-frame') return [];
      const connection = model.connections.find(candidate => candidate.id === finding.routeId)!;
      const endpointRooms = new Set([roomByAsset.get(ownerByTerminal.get(connection.from)!), roomByAsset.get(ownerByTerminal.get(connection.to)!)]);
      return [{ ...finding, classification: endpointRooms.has(finding.roomFrameId) ? 'endpoint-room-entry' as const : 'unrelated-room-crossing' as const }];
    });
    const endpointOnInterior = routeFindings.filter(item => item.type === 'route-endpoint-on-interior');
    const classifiedEndpointOnInterior = endpointOnInterior.map(finding => ({
      ...finding,
      terminals: finding.commonTerminalIds.map(terminal => ({
        terminal,
        position: production.view.layout.terminals[terminal],
        matchesContact: production.view.layout.terminals[terminal]?.[0] === finding.point[0]
          && production.view.layout.terminals[terminal]?.[1] === finding.point[1],
      })),
    }));
    const unconfirmedEndpointOnInterior = classifiedEndpointOnInterior.filter(finding => !finding.terminals.some(terminal => terminal.matchesContact));
    const routedSegments: RoutedSegment[] = routes.flatMap(route => route.points.slice(1).map((to, index) => ({
      routeId: route.id,
      index,
      from: route.points[index],
      to,
    })));
    const selfOverlaps: string[] = [];
    const unrelatedEndpointTouches: string[] = [];
    for (let i = 0; i < routedSegments.length; i++) for (let j = i + 1; j < routedSegments.length; j++) {
      const a = routedSegments[i]; const b = routedSegments[j];
      if (a.routeId === b.routeId) {
        // Adjacent segments meet at their intentional bend. Any later
        // collinear segment sharing positive length means the route doubled
        // back over itself.
        if (Math.abs(a.index - b.index) > 1 && sharedLength(a, b) > 0) selfOverlaps.push(`${a.routeId}[${a.index},${b.index}]`);
        continue;
      }
      const point = endpointContact(a, b);
      if (!point) continue;
      const routeA = routes.find(route => route.id === a.routeId)!;
      const routeB = routes.find(route => route.id === b.routeId)!;
      const routeBTerminals = new Set(routeB.terminals ?? []);
      const commonTerminals = (routeA.terminals ?? []).filter(terminal => routeBTerminals.has(terminal));
      const sharedModeledTerminal = commonTerminals.some(terminal => {
        const terminalPoint = production.view.layout.terminals[terminal];
        if (terminalPoint?.[0] === point[0] && terminalPoint?.[1] === point[1]) return true;
        // Bus terminals are rendered at their shared busbar tap, which can
        // differ from the nominal terminal coordinate. Permit the touch only
        // when it lies on that exact modeled busbar.
        const terminalOwnerId = ownerByTerminal.get(terminal);
        const terminalOwner = model.assets.find(asset => asset.id === terminalOwnerId);
        if (!terminalOwner) return false;
        if (terminalOwner.kind === 'bus') {
          const [centerX, centerY] = production.view.layout.assets[terminalOwner.id];
          const span = production.view.layout.busSpans?.[terminalOwner.id] ?? 60;
          const horizontal = Math.abs((production.view.layout.rotations?.[terminalOwner.id] ?? 0) % 180) === 90;
          return horizontal
            ? point[1] === centerY && point[0] >= centerX - span / 2 && point[0] <= centerX + span / 2
            : point[0] === centerX && point[1] >= centerY - span / 2 && point[1] <= centerY + span / 2;
        }
        // Hidden inline interface assets can use a short physical drawing lead
        // between the nominal anchor and the common port. If both model links
        // share that single terminal, a route-end touch within that local lead
        // is an intentional junction rather than an unmodeled wire contact.
        if (terminalOwner.kind !== 'interface' || terminalOwner.terminals.length !== 1) return false;
        const [assetX, assetY] = production.view.layout.assets[terminalOwner.id];
        return Math.abs(point[0] - assetX) <= 100 && Math.abs(point[1] - assetY) <= 100;
      });
      if (!sharedModeledTerminal) {
        const terminals = commonTerminals.map(terminal => {
          const ownerId = ownerByTerminal.get(terminal);
          const owner = model.assets.find(asset => asset.id === ownerId);
          return { terminal, ownerId, kind: owner?.kind, asset: ownerId ? production.view.layout.assets[ownerId] : undefined, terminalPoint: production.view.layout.terminals[terminal] };
        });
        unrelatedEndpointTouches.push(`${a.routeId}[${a.index}] / ${b.routeId}[${b.index}] at ${point.join(',')} shared=${JSON.stringify(terminals)}`);
      }
    }
    const unownedFrameIntersections = routes.flatMap(route => {
      const connection = model.connections.find(candidate => candidate.id === route.id)!;
      const endpointRooms = new Set([roomByAsset.get(ownerByTerminal.get(connection.from)!), roomByAsset.get(ownerByTerminal.get(connection.to)!)].filter(Boolean));
      return production.panels.flatMap(panel => endpointRooms.has(panel.id) ? [] : route.points.slice(1).flatMap((to, index) =>
        crossesFrameInterior(route.points[index], to, panel) ? [{ routeId: route.id, roomId: panel.id, segmentIndex: index }] : [],
      ));
    });
    const labelEntries = [...production.labels.entries()].filter(([assetId]) => !production.hiddenIds.has(assetId));
    const labelHits = routes.flatMap(route => {
      const connection = model.connections.find(candidate => candidate.id === route.id)!;
      const endpointOwners = new Set([ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)]);
      return labelEntries.flatMap(([assetId, label]) => endpointOwners.has(assetId) ? [] : route.points.slice(1).flatMap((to, index) =>
        intersectsSegment(route.points[index], to, label) ? [{ routeId: route.id, labelAssetId: assetId, segmentIndex: index }] : [],
      ));
    });
    const symbolHits = routes.flatMap(route => {
      const connection = model.connections.find(candidate => candidate.id === route.id)!;
      const endpointOwners = new Set([ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)]);
      return model.assets.filter(asset => !production.hiddenIds.has(asset.id)).flatMap(asset => endpointOwners.has(asset.id) ? [] : route.points.slice(1).flatMap((to, index) =>
        intersectsSegment(route.points[index], to, { x: production.view.layout.assets[asset.id][0] - 38, y: production.view.layout.assets[asset.id][1] - 38, width: 76, height: 76 })
          ? [{ routeId: route.id, assetId: asset.id, segmentIndex: index }] : [],
      ));
    });
    const busbarHits = routes.flatMap(route => {
      const connection = model.connections.find(candidate => candidate.id === route.id)!;
      const endpointOwners = new Set([ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)]);
      return model.assets.filter(asset => asset.kind === 'bus' && !endpointOwners.has(asset.id)).flatMap(asset => {
        const [cx, cy] = production.view.layout.assets[asset.id];
        const span = production.view.layout.busSpans?.[asset.id] ?? 60;
        const horizontal = Math.abs((production.view.layout.rotations?.[asset.id] ?? 0) % 180) === 90;
        const bus = horizontal ? [[cx - span / 2, cy], [cx + span / 2, cy]] as [[number, number], [number, number]]
          : [[cx, cy - span / 2], [cx, cy + span / 2]] as [[number, number], [number, number]];
        return route.points.slice(1).flatMap((to, index) => {
          const from = route.points[index];
          const orthogonalCrossing = from[0] === to[0] && bus[0][1] === bus[1][1]
            ? from[0] > Math.min(bus[0][0], bus[1][0]) && from[0] < Math.max(bus[0][0], bus[1][0])
              && bus[0][1] > Math.min(from[1], to[1]) && bus[0][1] < Math.max(from[1], to[1])
            : from[1] === to[1] && bus[0][0] === bus[1][0]
              ? from[1] > Math.min(bus[0][1], bus[1][1]) && from[1] < Math.max(bus[0][1], bus[1][1])
                && bus[0][0] > Math.min(from[0], to[0]) && bus[0][0] < Math.max(from[0], to[0])
              : false;
          const collinearOverlap = from[1] === to[1] && bus[0][1] === bus[1][1] && from[1] === bus[0][1]
            ? Math.min(Math.max(from[0], to[0]), Math.max(bus[0][0], bus[1][0])) > Math.max(Math.min(from[0], to[0]), Math.min(bus[0][0], bus[1][0]))
            : from[0] === to[0] && bus[0][0] === bus[1][0] && from[0] === bus[0][0]
              ? Math.min(Math.max(from[1], to[1]), Math.max(bus[0][1], bus[1][1])) > Math.max(Math.min(from[1], to[1]), Math.min(bus[0][1], bus[1][1]))
              : false;
          return orthogonalCrossing || collinearOverlap ? [{ routeId: route.id, busId: asset.id, segmentIndex: index }] : [];
        });
      });
    });
    const busAssets = model.assets.filter(asset => asset.kind === 'bus');
    const busbars = busAssets.map(asset => {
      const [cx, cy] = production.view.layout.assets[asset.id];
      const span = production.view.layout.busSpans?.[asset.id] ?? 60;
      const horizontal = Math.abs((production.view.layout.rotations?.[asset.id] ?? 0) % 180) === 90;
      return {
        id: asset.id,
        a: horizontal ? [cx - span / 2, cy] as [number, number] : [cx, cy - span / 2] as [number, number],
        b: horizontal ? [cx + span / 2, cy] as [number, number] : [cx, cy + span / 2] as [number, number],
      };
    });
    const busbarOverlaps: { busIds: string[]; point?: [number, number]; overlapLength?: number }[] = [];
    for (let index = 0; index < busbars.length; index++) for (const b of busbars.slice(index + 1)) {
      const a = busbars[index];
      const aHorizontal = a.a[1] === a.b[1];
      const bHorizontal = b.a[1] === b.b[1];
      if (aHorizontal !== bHorizontal) {
        const h = aHorizontal ? a : b;
        const v = aHorizontal ? b : a;
        const crosses = v.a[0] > Math.min(h.a[0], h.b[0]) && v.a[0] < Math.max(h.a[0], h.b[0])
          && h.a[1] > Math.min(v.a[1], v.b[1]) && h.a[1] < Math.max(v.a[1], v.b[1]);
        if (crosses) busbarOverlaps.push({ busIds: [a.id, b.id], point: [v.a[0], h.a[1]] });
        continue;
      }
      const sameLine = aHorizontal ? a.a[1] === b.a[1] : a.a[0] === b.a[0];
      const aStart = aHorizontal ? Math.min(a.a[0], a.b[0]) : Math.min(a.a[1], a.b[1]);
      const aEnd = aHorizontal ? Math.max(a.a[0], a.b[0]) : Math.max(a.a[1], a.b[1]);
      const bStart = aHorizontal ? Math.min(b.a[0], b.b[0]) : Math.min(b.a[1], b.b[1]);
      const bEnd = aHorizontal ? Math.max(b.a[0], b.b[0]) : Math.max(b.a[1], b.b[1]);
      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);
      if (sameLine && overlapEnd > overlapStart) busbarOverlaps.push({ busIds: [a.id, b.id], overlapLength: overlapEnd - overlapStart });
    }
    const labelOverlaps: string[] = [];
    for (let i = 0; i < labelEntries.length; i++) for (let j = i + 1; j < labelEntries.length; j++) {
      if (hasPositiveOverlap(labelEntries[i][1], labelEntries[j][1])) labelOverlaps.push(`${labelEntries[i][0]}/${labelEntries[j][0]}`);
    }
    const fitMetrics = (width: number, height: number) => {
      const scale = Math.min(width / production.view.bounds[2], height / production.view.bounds[3]);
      return {
        viewport: `${width}x${height}`,
        scale: +scale.toFixed(5),
        labelPixelsAt20Units: +(20 * scale).toFixed(2),
        symbolPixelsAt76Units: +(76 * scale).toFixed(2),
      };
    };
    const placedAssets = Object.keys(production.view.layout.assets);
    const missingAssets = model.assets.filter(asset => !production.view.layout.assets[asset.id]).map(asset => asset.id);
    const missingConnections = [...modelConnectionIds].filter(id => !routedIds.has(id));
    const productionReport = {
      assets: model.assets.length,
      placedAssets: placedAssets.length,
      missingAssets,
      connections: model.connections.length,
      routedConnections: routedIds.size,
      missingConnections,
      viewBounds: production.view.bounds,
      widthToHeight: +(production.view.bounds[2] / production.view.bounds[3]).toFixed(3),
      roomFrames: production.panels.length,
      clearanceRoutingDiagnostics: summarizeRoutingDiagnostics(production.clearanceRoutingDiagnostics),
      finalRoutingDiagnostics: summarizeRoutingDiagnostics(production.finalRoutingDiagnostics),
      geometryFindings: {
        diagonalSegments: routeFindings.filter(item => item.type === 'non-orthogonal').length,
        properCrossings: routeFindings.filter(item => item.type === 'route-crossing').length,
        crossingExamples: routeFindings.filter(item => item.type === 'route-crossing').slice(0, 20).map(finding => ({
          ...finding,
          routePoints: finding.type === 'route-crossing' ? finding.routeIds.map(id => ({ id, points: routeMap.get(id) })) : [],
        })),
        sharedLengthOverlaps: routeFindings.filter(item => item.type === 'shared-route-length').length,
        selfOverlaps: selfOverlaps.length,
        selfOverlapExamples: selfOverlaps.slice(0, 20),
        unrelatedEndpointTouches: unrelatedEndpointTouches.length,
        unrelatedEndpointTouchExamples: unrelatedEndpointTouches.slice(0, 20),
        endpointOnInterior: endpointOnInterior.length,
        endpointOnInteriorExamples: classifiedEndpointOnInterior.slice(0, 30),
        unconfirmedEndpointOnInterior: unconfirmedEndpointOnInterior.length,
        sharedLengthExamples: routeFindings.filter(item => item.type === 'shared-route-length').slice(0, 10).map(finding => ({
          ...finding,
          routePoints: finding.type === 'shared-route-length' ? finding.routeIds.map(id => ({ id, points: routeMap.get(id) })) : [],
        })),
        frameOverlaps: routeFindings.filter(item => item.type === 'room-frame-overlap').length,
        routeFrameIntersections: routeFindings.filter(item => item.type === 'route-room-frame').length,
      },
      labelHits: labelHits.length,
      labelHitDetails: labelHits.map(finding => ({
        ...finding,
        routePoints: routeMap.get(finding.routeId),
        labelBox: labelEntries.find(([id]) => id === finding.labelAssetId)?.[1],
      })),
      symbolHits: symbolHits.length,
      symbolHitDetails: symbolHits.slice(0, 20).map(finding => ({
        ...finding,
        routePoints: routeMap.get(finding.routeId),
        assetPosition: production.view.layout.assets[finding.assetId],
      })),
        busbarHits: busbarHits.length,
      busbarOverlaps: busbarOverlaps.length,
      busbarOverlapDetails: busbarOverlaps.slice(0, 30),
        busbarHitDetails: busbarHits.slice(0, 20).map(hit => {
          const bus = model.assets.find(asset => asset.id === hit.busId)!;
          const [x, y] = production.view.layout.assets[bus.id];
          const span = production.view.layout.busSpans?.[bus.id] ?? 60;
          const horizontal = Math.abs((production.view.layout.rotations?.[bus.id] ?? 0) % 180) === 90;
          const connection = model.connections.find(candidate => candidate.id === hit.routeId)!;
          return {
            ...hit,
            connectionTerminals: [connection.from, connection.to],
            connectionEndpointAssets: [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)],
            routePoints: routeMap.get(hit.routeId),
            busCenter: [x, y],
            busSpan: span,
            busRotation: production.view.layout.rotations?.[bus.id] ?? 0,
            busEnds: horizontal ? [[x - span / 2, y], [x + span / 2, y]] : [[x, y - span / 2], [x, y + span / 2]],
            busPeers: model.connections.filter(candidate => ownerByTerminal.get(candidate.from) === bus.id || ownerByTerminal.get(candidate.to) === bus.id).map(candidate => {
              const peerTerminal = ownerByTerminal.get(candidate.from) === bus.id ? candidate.to : candidate.from;
              const peerId = ownerByTerminal.get(peerTerminal)!;
              return { connectionId: candidate.id, peerId, peerPosition: production.view.layout.assets[peerId], peerTerminalPosition: production.view.layout.terminals[peerTerminal], route: routeMap.get(candidate.id) };
            }),
          };
        }),
      labelOverlaps,
      fitScale: [fitMetrics(1440, 700), fitMetrics(369, 625)],
      routeFramePairs: [...new Set(routeFindings.flatMap(item => item.type === 'route-room-frame' ? [`${item.routeId}/${item.roomFrameId}/${item.relation}`] : []))].length,
      routeFrameClassification: {
        endpointRoomEntry: routeFrameClassifications.filter(item => item.classification === 'endpoint-room-entry').length,
        unrelatedRoomCrossing: routeFrameClassifications.filter(item => item.classification === 'unrelated-room-crossing').length,
      },
      routeFrameExamples: routeFrameClassifications.filter(item => item.classification === 'unrelated-room-crossing').map(item => {
        const connection = model.connections.find(candidate => candidate.id === item.routeId)!;
        const endpointAssetIds = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        const frame = production.panels.find(candidate => candidate.id === item.roomFrameId)!;
        return {
          ...item,
          routePoints: routeMap.get(item.routeId),
          endpointAssetIds,
          endpointAssetsInVisibleFrame: endpointAssetIds.map(id => !!id && frame.assetIds.includes(id)),
          endpointAssetsInMemberFrame: endpointAssetIds.map(id => !!id && (frame.memberAssetIds ?? frame.assetIds).includes(id)),
          frameBounds: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
        };
      }),
      unownedFrameIntersections: unownedFrameIntersections.length,
      unownedFrameExamples: unownedFrameIntersections,
    };

    const prototype = composeRoomPanels(model);
    const prototypeAssetIds = new Set(prototype.panels.flatMap(panel => panel.assetIds));
    const prototypeRepresentedConnections = new Set([...prototype.localConnectionIds, ...prototype.crossRoomConnectionIds]);
    const prototypePanelOverlaps: string[] = [];
    for (let i = 0; i < prototype.panels.length; i++) for (let j = i + 1; j < prototype.panels.length; j++) {
      if (hasPositiveOverlap(prototype.panels[i], prototype.panels[j])) prototypePanelOverlaps.push(`${prototype.panels[i].id}/${prototype.panels[j].id}`);
    }
    const prototypeReport = {
      roomPanels: prototype.panels.length,
      canonicalAssets: prototypeAssetIds.size,
      unassignedAssets: model.assets.length - prototypeAssetIds.size,
      panelBounds: prototype.bounds,
      widthToHeight: +(prototype.bounds.width / prototype.bounds.height).toFixed(3),
      panelOverlaps: prototypePanelOverlaps.length,
      localConnections: prototype.localConnectionIds.length,
      routedLocalConnections: prototype.localConnectionIds.length - prototype.unresolvedLocalConnectionIds.length,
      unresolvedLocalConnections: prototype.unresolvedLocalConnectionIds.length,
      crossRoomConnections: prototype.crossRoomConnectionIds.length,
      routedCrossRoomConnections: prototype.externalRoutes.size,
      unresolvedCrossRoomConnections: prototype.unresolvedEndpointIds.length,
      representedConnections: prototypeRepresentedConnections.size,
      unrepresentedConnections: model.connections.length - prototypeRepresentedConnections.size,
      routeFindings: {
        diagonalSegments: prototype.routeFindings.nonOrthogonal.length,
        sharedLengthOverlaps: prototype.routeFindings.overlaps.length,
        properCrossings: prototype.routeFindings.crossings.length,
      },
    };

    console.log(JSON.stringify({ [layoutStrategy]: productionReport, roomCompositionPrototype: prototypeReport }, null, 2));
    expect(missingAssets).toEqual([]);
    expect(missingConnections).toEqual([]);
    expect(routeFindings.filter(item => item.type === 'non-orthogonal')).toEqual([]);
    expect(routeFindings.filter(item => item.type === 'route-crossing')).toEqual([]);
    expect(routeFindings.filter(item => item.type === 'shared-route-length')).toEqual([]);
    expect(selfOverlaps, `routes double back over themselves: ${selfOverlaps.join(', ')}`).toEqual([]);
    expect(unrelatedEndpointTouches, `unrelated routes touch and look electrically joined: ${unrelatedEndpointTouches.slice(0, 30).join('; ')}`).toEqual([]);
    expect(routeFindings.filter(item => item.type === 'room-frame-overlap')).toEqual([]);
    expect(labelHits).toEqual([]);
    expect(symbolHits).toEqual([]);
    expect(busbarHits, `routes cross unrelated busbars: ${JSON.stringify(busbarHits.map(hit => ({ ...hit, route: routeMap.get(hit.routeId), busPosition: production.view.layout.assets[hit.busId], busSpan: production.view.layout.busSpans?.[hit.busId] })))}`).toEqual([]);
    expect(busbarOverlaps).toEqual([]);
    expect(labelOverlaps).toEqual([]);
  }, 180_000);
});
