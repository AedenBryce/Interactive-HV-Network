import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { searchGlobalRoomPlacements } from './global-room-placement-search';
import { validateDiagramGeometry } from './geometry-validator';
import { switchroomMemberships } from './switchroom-frames';

type Category = 'room-internal' | 'bridge' | 'macro-edge';

function routeCategoryIndex() {
  const model = currentNetworkModel;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map<string, string>();
  for (const room of switchroomMemberships(model)) for (const assetId of room.assetIds) {
    if (!roomByAsset.has(assetId)) roomByAsset.set(assetId, room.id);
    else if (roomByAsset.get(assetId) !== room.id) roomByAsset.delete(assetId);
  }
  const categoryByConnection = new Map<string, Category>();
  for (const connection of model.connections) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from)!);
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to)!);
    categoryByConnection.set(connection.id, fromRoom && fromRoom === toRoom
      ? 'room-internal'
      : fromRoom && toRoom && fromRoom !== toRoom ? 'macro-edge' : 'bridge');
  }
  return categoryByConnection;
}

function countByCategory(ids: readonly string[], categories: ReadonlyMap<string, Category>) {
  const result: Record<Category, number> = { 'room-internal': 0, bridge: 0, 'macro-edge': 0 };
  for (const id of ids) result[categories.get(id) ?? 'bridge']++;
  return result;
}

describe('isolated macro layout failure classification', () => {
  it('classifies the current fixed and compact candidate by room-internal, bridge, and macro edges', () => {
    const categories = routeCategoryIndex();
    const baseline = continuousNetwork(currentNetworkModel);
    const baselineFindings = validateDiagramGeometry({
      routes: [...baseline.routes].map(([id, points]) => ({ id, points })),
      roomFrames: baseline.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    });
    const baselineRouteIds = [...baseline.routes.keys()];
    const baselineRouteFindingIds = (type: string) => baselineFindings
      .filter(item => item.type === type)
      .flatMap(item => 'routeId' in item ? [item.routeId] : 'routeIds' in item ? [...item.routeIds] : []);
    const result = searchGlobalRoomPlacements(currentNetworkModel, { routeCandidates: false });
    const candidate = result.fullyRouted[0];
    const candidateUnresolved = candidate?.unresolved ?? [];
    const unresolvedByCategory: Record<Category, Record<string, string[]>> = {
      'room-internal': {}, bridge: {}, 'macro-edge': {},
    };
    for (const entry of candidateUnresolved) {
      const separator = entry.lastIndexOf(':');
      const id = entry.slice(0, separator); const reason = entry.slice(separator + 1);
      const category = categories.get(id) ?? 'bridge';
      (unresolvedByCategory[category][reason] ??= []).push(id);
    }
    const coreOwner = new Map<string, string>();
    const conflictingOwners = new Set<string>();
    for (const room of switchroomMemberships(currentNetworkModel)) for (const assetId of room.assetIds) {
      if (coreOwner.has(assetId) && coreOwner.get(assetId) !== room.id) { coreOwner.delete(assetId); conflictingOwners.add(assetId); }
      else if (!conflictingOwners.has(assetId)) coreOwner.set(assetId, room.id);
    }
    const ownerByTerminal = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const treeEdges = currentNetworkModel.connections.filter(connection => baseline.treeEdgeIds.has(connection.id)).flatMap(connection => {
      const a = ownerByTerminal.get(connection.from); const b = ownerByTerminal.get(connection.to);
      return a && b ? [{ id: connection.id, a, b }] : [];
    });
    const externalIds = new Set(currentNetworkModel.assets.map(asset => asset.id).filter(assetId => !coreOwner.has(assetId)));
    const externalNeighbors = new Map([...externalIds].map(id => [id, [] as { id: string; connectionId: string }[]]));
    const externalAttachmentRooms = new Map<string, Set<string>>();
    for (const edge of treeEdges) {
      if (externalIds.has(edge.a) && externalIds.has(edge.b)) {
        externalNeighbors.get(edge.a)!.push({ id: edge.b, connectionId: edge.id });
        externalNeighbors.get(edge.b)!.push({ id: edge.a, connectionId: edge.id });
      } else if (externalIds.has(edge.a) && coreOwner.has(edge.b)) {
        const rooms = externalAttachmentRooms.get(edge.a) ?? new Set<string>(); rooms.add(coreOwner.get(edge.b)!); externalAttachmentRooms.set(edge.a, rooms);
      } else if (externalIds.has(edge.b) && coreOwner.has(edge.a)) {
        const rooms = externalAttachmentRooms.get(edge.b) ?? new Set<string>(); rooms.add(coreOwner.get(edge.a)!); externalAttachmentRooms.set(edge.b, rooms);
      }
    }
    const visitedExternal = new Set<string>();
    const externalComponents: { assetCount: number; treeConnectionCount: number; attachedRooms: string[]; attachedAssetIds: string[] }[] = [];
    for (const root of externalIds) {
      if (visitedExternal.has(root)) continue;
      const queue = [root]; visitedExternal.add(root); const assetIds: string[] = []; const roomIds = new Set<string>(); let edgeCount = 0;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const current = queue[cursor]; assetIds.push(current);
        for (const roomId of externalAttachmentRooms.get(current) ?? []) roomIds.add(roomId);
        for (const neighbor of externalNeighbors.get(current) ?? []) {
          edgeCount++;
          if (!visitedExternal.has(neighbor.id)) { visitedExternal.add(neighbor.id); queue.push(neighbor.id); }
        }
      }
      externalComponents.push({ assetCount: assetIds.length, treeConnectionCount: edgeCount / 2, attachedRooms: [...roomIds].sort(), attachedAssetIds: assetIds });
    }
    const attachmentHistogram = externalComponents.reduce<Record<string, number>>((histogram, component) => {
      const bucket = String(component.attachedRooms.length);
      histogram[bucket] = (histogram[bucket] ?? 0) + 1;
      return histogram;
    }, {});
    console.info('macro layout failure classification', JSON.stringify({
      baseline: {
        routeCount: baseline.routes.size,
        categoryTotals: countByCategory(baselineRouteIds, categories),
        crossings: countByCategory(baselineRouteFindingIds('route-crossing'), categories),
        sharedLengths: countByCategory(baselineRouteFindingIds('shared-route-length'), categories),
        endpointContacts: countByCategory(baselineRouteFindingIds('route-endpoint-on-interior'), categories),
        frameCuts: countByCategory(baselineRouteFindingIds('route-room-frame'), categories),
        treeEdgeCount: baseline.treeEdgeIds.size,
        nonTreeConnectionCount: currentNetworkModel.connections.length - baseline.treeEdgeIds.size,
        coreAssetCount: coreOwner.size,
        ambiguousCoreAssetIds: [...conflictingOwners],
        externalAssetCount: externalIds.size,
        externalTreeComponents: externalComponents.length,
        attachmentHistogram,
        externalTreeComponentsWithMultipleRoomAttachments: externalComponents.filter(component => component.attachedRooms.length > 1)
          .map(({ assetCount, treeConnectionCount, attachedRooms, attachedAssetIds }) => ({ assetCount, treeConnectionCount, attachedRooms, attachedAssetIds })),
      },
      compactCandidate: candidate ? {
        routeCount: candidate?.routeCount,
        unresolvedCount: candidate?.unresolvedCount,
        unresolvedByCategory,
        crossings: candidate?.crossings,
        sharedLengths: candidate?.sharedLengths,
        endpointContacts: candidate?.endpointContacts,
        frameOverlaps: candidate?.frameOverlaps,
        contentBoxCollisions: candidate?.contentBoxCollisions,
        missingSw411Joins: candidate?.missingSw411Joins,
      } : { status: 'not rerun; exact full-audit classification retained from preceding pass' },
    }, null, 2));
    expect(result.productionBaseline.routes).toBe(currentNetworkModel.connections.length);
  }, 90_000);
});
