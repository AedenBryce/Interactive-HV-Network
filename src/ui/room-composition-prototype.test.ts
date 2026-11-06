import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { composeRoomPanels } from './room-composition-prototype';

describe('actual-model room composition prototype', () => {
  it('composes all canonical room panels and routes each cross-room connection once', () => {
    const composition = composeRoomPanels(currentNetworkModel);
    const panelOverlaps: string[] = [];
    for (let i = 0; i < composition.panels.length; i++) for (let j = i + 1; j < composition.panels.length; j++) {
      const a = composition.panels[i]; const b = composition.panels[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) panelOverlaps.push(`${a.id}/${b.id}`);
    }
    const crossRouteFindings = composition.routeFindings;
    const assetByTerminal = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, { id: asset.id, label: asset.label }] as const)));
    const unresolvedDetails = composition.unresolvedEndpointIds.map(id => {
      const connection = currentNetworkModel.connections.find(item => item.id === id)!;
      const fromAsset = assetByTerminal.get(connection.from);
      const toAsset = assetByTerminal.get(connection.to);
      return { id, from: fromAsset, to: toAsset, fromTerminal: connection.from, toTerminal: connection.to,
        fromViews: currentNetworkModel.presentation!.views.filter(view => view.assetIds.includes(fromAsset!.id)).map(view => view.id),
        toViews: currentNetworkModel.presentation!.views.filter(view => view.assetIds.includes(toAsset!.id)).map(view => view.id),
        boundaryViews: currentNetworkModel.presentation!.views.filter(view => view.boundaries?.some(boundary => boundary.connectionId === id)).map(view => view.id) };
    });
    console.log(JSON.stringify({
      modelAssets: currentNetworkModel.assets.length,
      modelConnections: currentNetworkModel.connections.length,
      unassignedAssets: composition.unassignedAssetIds.length,
      unassignedAssetGroups: Object.entries(composition.unassignedAssetIds.reduce<Record<string, number>>((counts, id) => {
        const group = id.split(':')[0]; counts[group] = (counts[group] ?? 0) + 1; return counts;
      }, {})).sort((a, b) => b[1] - a[1]),
      roomPanels: composition.panels.length,
      assetsInPanels: new Set(composition.panels.flatMap(panel => panel.assetIds)).size,
      crossRoomConnections: composition.crossRoomConnectionIds.length,
      routedCrossRoomConnections: composition.externalRoutes.size,
      localModeledConnections: composition.localConnectionIds.length,
      unassignedConnections: composition.unassignedConnectionIds.length,
      routedLocalConnections: composition.localConnectionIds.length - composition.unresolvedLocalConnectionIds.length,
      unresolvedLocalConnections: composition.unresolvedLocalConnectionIds,
      unresolvedConnections: composition.unresolvedEndpointIds,
      unresolvedDetails,
      bounds: composition.bounds,
      widthToHeight: +(composition.bounds.width / composition.bounds.height).toFixed(3),
      largestPanels: [...composition.panels].sort((a, b) => b.width - a.width).slice(0, 4).map(({id,width,height}) => ({id,width,height})),
      unplacedTreeEdges: composition.treeEdges.filter(edge => {
        const from = composition.panels.find(panel => panel.assetIds.includes(edge.parentAssetId));
        const to = composition.panels.find(panel => panel.assetIds.includes(edge.childAssetId));
        return from && to && from.id !== to.id && from.y >= to.y && !edge.id.includes('crushing-tie');
      }).map(edge => edge.id),
      panelOverlaps,
      crossAndLocalRouteOverlaps: crossRouteFindings.overlaps.length,
      crossAndLocalRouteCrossings: crossRouteFindings.crossings.length,
      nonOrthogonalSegments: crossRouteFindings.nonOrthogonal.length,
    }, null, 2));
    expect(composition.panels).toHaveLength(29);
    expect(new Set(composition.panels.flatMap(panel => panel.assetIds)).size).toBeGreaterThan(300);
    expect(composition.externalRoutes.size + composition.unresolvedEndpointIds.length).toBe(composition.crossRoomConnectionIds.length);
    expect(composition.unassignedAssetIds).toHaveLength(234);
    expect(composition.unassignedConnectionIds).toHaveLength(232);
    expect(composition.localConnectionIds.length).toBeGreaterThan(400);
    expect(composition.localConnectionIds.length - composition.unresolvedLocalConnectionIds.length).toBe(composition.localConnectionIds.length);
    expect(composition.bounds.width).toBeGreaterThan(0);
    expect(composition.bounds.height).toBeGreaterThan(0);
    expect(panelOverlaps).toEqual([]);
    expect(composition.unresolvedEndpointIds).toHaveLength(9);
    expect(composition.externalRoutes.size).toBe(13);
    expect(composition.routeFindings.nonOrthogonal).toEqual([]);
    expect(composition.routeFindings.overlaps.length).toBeGreaterThan(0);
    expect(composition.routeFindings.crossings.length).toBeGreaterThan(0);
  }, 30000);
});
