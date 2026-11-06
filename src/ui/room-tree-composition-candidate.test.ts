import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { switchroomMemberships } from './switchroom-frames';
import { roomClusterOwnership } from './room-cluster-ownership';
import { planWholeNetworkRooms } from './whole-network-room-layout';
import type { NetworkModel } from '../session/model';

function inspectRoomTree(model: NetworkModel) {
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacent = new Map(model.assets.map(asset => [asset.id, [] as { peer: string; connectionId: string }[]]));
  for (const connection of model.connections) {
    const from = terminalOwner.get(connection.from); const to = terminalOwner.get(connection.to);
    if (!from || !to || from === to) continue;
    adjacent.get(from)!.push({ peer: to, connectionId: connection.id });
    adjacent.get(to)!.push({ peer: from, connectionId: connection.id });
  }
  const roots = [...new Set(model.sources.map(source => source.assetId))];
  const visited = new Set<string>(); const treeEdges: { id: string; parentAssetId: string; childAssetId: string }[] = [];
  const traverse = (starts: string[]) => {
    const queue = [...starts]; starts.forEach(id => visited.add(id));
    for (let i = 0; i < queue.length; i++) for (const edge of adjacent.get(queue[i]) ?? []) {
      if (visited.has(edge.peer)) continue;
      visited.add(edge.peer); treeEdges.push({ id: edge.connectionId, parentAssetId: queue[i], childAssetId: edge.peer }); queue.push(edge.peer);
    }
  };
  traverse(roots);
  for (const asset of model.assets) if (!visited.has(asset.id) && (adjacent.get(asset.id)?.length ?? 0)) { roots.push(asset.id); traverse([asset.id]); }
  const earthBranches = model.assets.filter(asset => asset.kind === 'earth-switch' && adjacent.get(asset.id)?.length === 1)
    .map(asset => ({ id: `earth:${asset.id}`, earthSwitchAssetId: asset.id, ownerAssetId: adjacent.get(asset.id)![0].peer, direction: 'owner-to-earth-switch' as const }));
  const ownership = roomClusterOwnership(model, treeEdges, earthBranches);
  const memberships = switchroomMemberships(model);
  const roomIds = new Set(memberships.map(room => room.id));
  const roomEdges = new Map<string, { id: string; from: string; to: string; tree: boolean }>();
  const treeIds = new Set(treeEdges.map(edge => edge.id));
  for (const connection of model.connections) {
    const fromAsset = terminalOwner.get(connection.from)!; const toAsset = terminalOwner.get(connection.to)!;
    const from = ownership.ownerByAssetId.get(fromAsset); const to = ownership.ownerByAssetId.get(toAsset);
    if (!from || !to || from === to || !roomIds.has(from) || !roomIds.has(to)) continue;
    roomEdges.set(connection.id, { id: connection.id, from, to, tree: treeIds.has(connection.id) });
  }
  const geometry = continuousNetwork(model);
  const panels = geometry.panels ?? [];
  const roomPlacement = planWholeNetworkRooms(panels, treeEdges, ownership.ownerByAssetId);
  const roomRects = panels.flatMap(panel => {
    const target = roomPlacement.positions[panel.id];
    return target ? [{ id: panel.id, x: target.x, y: target.y, width: panel.width, height: panel.height }] : [];
  });
  const roomOverlaps: string[] = [];
  for (let i = 0; i < roomRects.length; i++) for (let j = i + 1; j < roomRects.length; j++) {
    const a = roomRects[i]; const b = roomRects[j];
    if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) roomOverlaps.push(`${a.id} <> ${b.id}`);
  }
  const roomBounds = roomRects.length ? {
    width: Math.max(...roomRects.map(rect => rect.x + rect.width)) - Math.min(...roomRects.map(rect => rect.x)),
    height: Math.max(...roomRects.map(rect => rect.y + rect.height)) - Math.min(...roomRects.map(rect => rect.y)),
  } : { width: 0, height: 0 };
  const sameRoom = (fromTerminal: string, toTerminal: string) => {
    const from = ownership.ownerByAssetId.get(terminalOwner.get(fromTerminal)!);
    const to = ownership.ownerByAssetId.get(terminalOwner.get(toTerminal)!);
    return !!from && from === to;
  };
  const sameRoomAlternateEdges = model.connections.filter(connection =>
    !treeIds.has(connection.id) && sameRoom(connection.from, connection.to));
  const sameRoomTreeEdges = model.connections.filter(connection =>
    treeIds.has(connection.id) && sameRoom(connection.from, connection.to));
  return {
    assetCount: model.assets.length,
    connectionCount: model.connections.length,
    roomCount: memberships.length,
    assignedAssets: ownership.ownerByAssetId.size,
    unassigned: [...ownership.unassignedAssetIds],
    ambiguous: [...ownership.ambiguousAssetIds],
    panelDims: panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    roomPlacementUnplaced: roomPlacement.unplaced,
    roomPlacementPlacedCount: roomRects.length,
    roomPlacementOverlaps: roomOverlaps,
    roomPlacementBounds: roomBounds,
    roomPlacementAspectRatio: roomBounds.width / roomBounds.height,
    panelOwnedEdges: roomEdges.size,
    panelTreeEdges: [...roomEdges.values()].filter(edge => edge.tree).length,
    panelAltEdges: [...roomEdges.values()].filter(edge => !edge.tree).length,
    rawSameRoomEdges: sameRoomAlternateEdges.length + sameRoomTreeEdges.length,
    sameRoomTreeEdges: sameRoomTreeEdges.length,
    sameRoomAlternateEdges: sameRoomAlternateEdges.length,
    sameRoomAlternateExamples: sameRoomAlternateEdges.map(connection => connection.id),
    visibleIfOnlySameRoomTreeEdgesAreHidden: model.connections.length - sameRoomTreeEdges.length,
    geometryFitBounds: geometry.view.bounds,
    routeCount: geometry.routes.size,
  };
}

describe('room-tree composition candidate audit', () => {
  it('reports room contraction coverage and routes without changing model data', () => {
    const report = inspectRoomTree(currentNetworkModel);
    expect(report.assetCount).toBe(684);
    expect(report.connectionCount).toBe(677);
    expect(report.routeCount).toBe(677);
    console.log(JSON.stringify(report, null, 2));
  }, 30_000);
});
