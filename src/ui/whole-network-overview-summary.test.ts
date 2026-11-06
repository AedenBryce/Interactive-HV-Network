import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { roomClusterOwnership } from './room-cluster-ownership';
import { switchroomMemberships } from './switchroom-frames';
import { buildWholeNetworkOverviewSummary, type OverviewConductor, type OverviewPoint } from './whole-network-overview-summary';

function intersects(a: OverviewPoint, b: OverviewPoint, c: OverviewPoint, d: OverviewPoint): OverviewPoint | undefined {
  const aHorizontal = a[1] === b[1]; const cHorizontal = c[1] === d[1];
  if (aHorizontal === cHorizontal) {
    if (aHorizontal && a[1] === c[1]) {
      const lo = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const hi = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
      if (lo < hi) throw new Error(`Overlapping horizontal conductors at y=${a[1]}`);
      if (lo === hi) return [lo, a[1]];
    }
    if (!aHorizontal && a[0] === c[0]) {
      const lo = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      const hi = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
      if (lo < hi) throw new Error(`Overlapping vertical conductors at x=${a[0]}`);
      if (lo === hi) return [a[0], lo];
    }
    return undefined;
  }
  const h1 = aHorizontal ? a : c; const h2 = aHorizontal ? b : d;
  const v1 = aHorizontal ? c : a; const v2 = aHorizontal ? d : b;
  if (v1[0] >= Math.min(h1[0], h2[0]) && v1[0] <= Math.max(h1[0], h2[0])
    && h1[1] >= Math.min(v1[1], v2[1]) && h1[1] <= Math.max(v1[1], v2[1])) return [v1[0], h1[1]];
  return undefined;
}

function allSegments(conductors: readonly OverviewConductor[]) {
  return conductors.flatMap(conductor => conductor.points.slice(1).map((point, index) => ({
    conductorId: conductor.id,
    a: conductor.points[index],
    b: point,
  })));
}

describe('whole-network compact overview candidate', () => {
  it('covers every source and room once with an orthogonal, crossing-free tree summary', () => {
    const memberships = switchroomMemberships(currentNetworkModel);
    const geometry = continuousNetwork(currentNetworkModel);
    const terminalOwner = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const assetTree = [...geometry.treeEdgeIds].flatMap(id => {
      const connection = currentNetworkModel.connections.find(item => item.id === id);
      if (!connection) return [];
      const parentAssetId = terminalOwner.get(connection.from); const childAssetId = terminalOwner.get(connection.to);
      return parentAssetId && childAssetId ? [{ id, parentAssetId, childAssetId }] : [];
    });
    const earthBranches = currentNetworkModel.assets.flatMap(asset => {
      if (asset.kind !== 'earth-switch') return [];
      const attached = currentNetworkModel.connections.filter(connection => connection.from && connection.to
        && (asset.terminals.includes(connection.from) || asset.terminals.includes(connection.to)));
      if (attached.length !== 1) return [];
      const connection = attached[0];
      const peerTerminal = asset.terminals.includes(connection.from) ? connection.to : connection.from;
      const ownerAssetId = terminalOwner.get(peerTerminal);
      return ownerAssetId ? [{ id: `earth:${asset.id}`, earthSwitchAssetId: asset.id, ownerAssetId, direction: 'owner-to-earth-switch' as const }] : [];
    });
    const ownership = roomClusterOwnership(currentNetworkModel, assetTree, earthBranches);
    const summary = buildWholeNetworkOverviewSummary(currentNetworkModel, geometry.treeEdgeIds, memberships, ownership.ownerByAssetId, {
      roomWidth: 5_000, sourceWidth: 4_400, cardHeight: 2_600, horizontalGap: 500, verticalGap: 2_100, rootGap: 1_200,
    });

    const expectedSources = currentNetworkModel.sources.map(source => source.assetId);
    const actualSources = summary.cards.filter(card => card.kind === 'source').map(card => card.id);
    expect(actualSources).toEqual(expectedSources);
    const actualRooms = summary.cards.filter(card => card.kind === 'room').map(card => card.id);
    expect(actualRooms).toHaveLength(memberships.length);
    expect(new Set(actualRooms).size).toBe(memberships.length);
    expect(new Set(summary.cards.map(card => card.id)).size).toBe(summary.cards.length);

    const cardById = new Map(summary.cards.map(card => [card.id, card]));
    for (const edge of summary.edges) {
      expect(cardById.has(edge.from), `${edge.id} parent exists`).toBe(true);
      expect(cardById.has(edge.to), `${edge.id} child exists`).toBe(true);
      expect(summary.conductors.some(conductor => conductor.edgeIds.includes(edge.id)), `${edge.id} has a route`).toBe(true);
    }
    for (const conductor of summary.conductors) {
      for (let i = 1; i < conductor.points.length; i++) {
        const [x1, y1] = conductor.points[i - 1]; const [x2, y2] = conductor.points[i];
        expect(x1 === x2 || y1 === y2, `${conductor.id} segment ${i - 1} is orthogonal`).toBe(true);
      }
    }
    for (let i = 0; i < summary.cards.length; i++) for (let j = i + 1; j < summary.cards.length; j++) {
      const a = summary.cards[i]; const b = summary.cards[j];
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
    }

    const segments = allSegments(summary.conductors);
    let crossingCount = 0;
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const left = segments[i]; const right = segments[j];
      const point = intersects(left.a, left.b, right.a, right.b);
      if (!point) continue;
      const leftRoute = summary.conductors.find(item => item.id === left.conductorId)!;
      const rightRoute = summary.conductors.find(item => item.id === right.conductorId)!;
      const leftEndsHere = [left.a, left.b].some(p => p[0] === point[0] && p[1] === point[1]);
      const rightEndsHere = [right.a, right.b].some(p => p[0] === point[0] && p[1] === point[1]);
      const sharedTreeEdges = leftRoute.edgeIds.some(id => rightRoute.edgeIds.includes(id));
      const sameJunction = sharedTreeEdges && (leftEndsHere || rightEndsHere);
      if (sameJunction) continue;
      crossingCount++;
    }
    expect(crossingCount, 'no unplanned conductor crossings').toBe(0);

    const { width, height } = summary.bounds;
    expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
    console.log(JSON.stringify({
      sources: actualSources.length,
      rooms: actualRooms.length,
      summaryEdges: summary.edges.length,
      roots: summary.roots.map(id => ({ id, label: cardById.get(id)!.label })),
      conductorSegments: segments.length,
      dimensions: summary.bounds,
      aspectRatio: Number((width / height).toFixed(3)),
      crossings: crossingCount,
    }, null, 2));
  }, 30_000);
});
