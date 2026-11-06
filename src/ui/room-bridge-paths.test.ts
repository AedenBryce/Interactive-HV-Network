import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { switchroomMemberships } from './switchroom-frames';
import { extractSw411RoomBridgePaths } from './room-bridge-paths';

describe('isolated SW411 room bridge path extraction', () => {
  it('extracts the eight direct feed paths and keeps the confirmed ring separate', () => {
    const model = currentNetworkModel;
    const diagram = continuousNetwork(model);
    const extraction = extractSw411RoomBridgePaths(model, diagram.treeEdgeIds);
    const rooms = new Map(switchroomMemberships(model).map(room => [room.id, new Set(room.assetIds)]));
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));

    expect(new Set(extraction.bridges.map(bridge => bridge.sourceCoreAssetId)).size).toBe(8);
    expect(extraction.bridges.map(bridge => bridge.childRoomId).sort()).toEqual([
      'crushing-1/hv', 'crushing-2/sw435-hv', 'cv006/rm406-hv', 'cv006/rm410-hv',
      'desands/hv', 'screening/hv', 'services/rm721', 'stockpile/stockpile-hv', 'train-loading/hv',
    ].sort());
    expect(extraction.ring).toEqual({
      id: 'whole:join:crushing-tie',
      fromRoomId: 'crushing-1/hv',
      toRoomId: 'crushing-2/sw435-hv',
      fromAssetId: 'sw431:interface:sw435',
      toAssetId: 'sw435:interface:sw431',
      connectionIds: ['whole:join:crushing-tie'],
    });
    expect(extraction.bridgeConnectionIds).not.toContain('whole:join:crushing-tie');
    expect(extraction.inventoryConnectionIds.filter(id => id === 'whole:join:crushing-tie')).toHaveLength(1);
    expect(extraction.missingConnectionIds).toEqual([]);
    expect(extraction.duplicateInventoryConnectionIds).toEqual([]);
    expect(new Set(extraction.bridgeConnectionIds).size).toBe(extraction.bridgeConnectionIds.length);

    for (const bridge of extraction.bridges) {
      expect(bridge.parentRoomId).toBe('sw411/overview');
      expect(rooms.get(bridge.parentRoomId)?.has(bridge.sourceCoreAssetId)).toBe(true);
      expect(rooms.get(bridge.childRoomId)?.has(bridge.childCoreAssetId)).toBe(true);
      expect(bridge.orderedAssetIds).toHaveLength(bridge.orderedConnectionIds.length + 1);
      expect(bridge.orderedAssetIds[0]).toBe(bridge.sourceCoreAssetId);
      expect(bridge.orderedAssetIds.at(-1)).toBe(bridge.childCoreAssetId);
      bridge.orderedConnectionIds.forEach((id, index) => {
        const connection = connectionById.get(id)!;
        const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        expect(endpoints).toContain(bridge.orderedAssetIds[index]);
        expect(endpoints).toContain(bridge.orderedAssetIds[index + 1]);
        expect(diagram.treeEdgeIds.has(id)).toBe(true);
      });
      expect(bridge.sharedConnectionIds).toEqual(bridge.orderedConnectionIds.filter(id => extraction.sharedConnectionIds.includes(id)));
    }

    const cv406 = extraction.bridges.find(bridge => bridge.childRoomId === 'cv006/rm406-hv')!;
    const cv410 = extraction.bridges.find(bridge => bridge.childRoomId === 'cv006/rm410-hv')!;
    const cvShared = cv406.orderedConnectionIds.filter(id => cv410.orderedConnectionIds.includes(id));
    expect([...cvShared].sort()).toEqual([...extraction.sharedConnectionIds.filter(id => cv406.orderedConnectionIds.includes(id))].sort());

    console.info('SW411 bridge extraction', {
      bridgeCount: extraction.bridges.length,
      bridges: extraction.bridges.map(({ childRoomId, sourceCoreAssetId, childCoreAssetId, sourceTerminalId, childTerminalId, orderedAssetIds, orderedConnectionIds, sharedConnectionIds, exclusiveConnectionIds, sharedBridgeAssetIds, exclusiveBridgeAssetIds }) => ({
        childRoomId, sourceCoreAssetId, childCoreAssetId, sourceTerminalId, childTerminalId,
        assetPath: orderedAssetIds.join(' → '),
        connectionPath: orderedConnectionIds.join(' → '),
        sharedConnectionIds: sharedConnectionIds.join(' | '),
        exclusiveConnectionIds: exclusiveConnectionIds.join(' | '),
        sharedBridgeAssetIds: sharedBridgeAssetIds.join(' | '),
        exclusiveBridgeAssetIds: exclusiveBridgeAssetIds.join(' | '),
      })),
      sharedConnectionIds: extraction.sharedConnectionIds,
      uniqueTreeConnections: extraction.bridgeConnectionIds.length,
      ring: extraction.ring,
    });
  }, 30_000);
});
