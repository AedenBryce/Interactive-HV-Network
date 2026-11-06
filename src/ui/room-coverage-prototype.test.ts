import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { auditRoomCoverage, composeCoverageCandidate } from './room-coverage-prototype';

describe('actual-model room coverage inventory', () => {
  it('reports coordinate and view coverage without fabricating positions', () => {
    const report = auditRoomCoverage(currentNetworkModel);
    console.log(JSON.stringify({
      totals: { assets: report.assetCount, connections: report.connectionCount, views: report.viewCount,
        canonicalGroups: report.canonicalGroupCount, assignedAssets: report.assignedAssetCount,
        uncoveredAssets: report.uncoveredAssets.length, uncoveredWithCoordinates: report.uncoveredAssets.length - report.unresolvedAssets.length,
        uncoveredWithoutCoordinates: report.unresolvedAssets.length, duplicatedAcrossViews: report.duplicateAssets.length,
        assetsMissingAnyTerminalCoordinates: report.missingTerminalCoordinate.length,
        connectionsWithCoViewCoordinates: report.connectionsWithCommonView, connectionsWithoutCoViewCoordinates: report.unresolvedConnections.length },
      uncoveredAssetInventory: report.uncoveredAssets.map(asset => ({ id: asset.id, kind: asset.kind, candidateViews: asset.candidates.map(item => item.viewId) })),
      noSourceCoordinateIds: report.unresolvedAssets.map(asset => asset.id),
      duplicateAssetViews: report.duplicateAssets.map(asset => ({ id: asset.id, views: asset.candidates.map(item => item.viewId) })),
      missingTerminalCoordinateIds: report.missingTerminalCoordinate.map(asset => asset.id),
      connectionsWithoutCoViewCoordinates: report.unresolvedConnections,
    }, null, 2));
    expect(report.assetCount).toBe(684);
    expect(report.connectionCount).toBe(677);
    expect(report.viewCount).toBe(92);
    expect(report.canonicalGroupCount).toBe(29);
    expect(report.uncoveredAssets).toHaveLength(234);
    expect(report.unresolvedAssets.length + report.duplicateAssets.length).toBeGreaterThanOrEqual(report.unresolvedAssets.length);
  }, 30000);

  it('assigns one source-view route to every modeled connection', () => {
    const candidate = composeCoverageCandidate(currentNetworkModel);
    console.log(JSON.stringify({ assetsWithHomeView: candidate.homeViewByAsset.size,
      assetsWithPanelOwner: candidate.panelByAsset.size, panelsIncludingTopLevel: candidate.panelInventory.size,
      topLevelPanels: [...candidate.panelInventory.keys()].filter(id => id.startsWith('trunk:') || id.startsWith('detail:')),
      sourceViewsWithoutSharedAssetAnchors: [...candidate.transforms].filter(([,transform]) => transform.sharedAssets === 0).map(([viewId]) => viewId),
      viewsWithNonTranslationAnchorDrift: [...candidate.transforms].filter(([,transform]) => transform.maxAnchorDrift > 0 && Number.isFinite(transform.maxAnchorDrift)).map(([viewId,transform]) => ({ viewId, sharedAssets: transform.sharedAssets, maxAnchorDrift: transform.maxAnchorDrift })),
      connections: currentNetworkModel.connections.length, connectionsWithOneRoute: candidate.routeViewByConnection.size,
      positionedAssets: candidate.assetPositions.size, positionedTerminals: candidate.terminalPositions.size,
      globalRoutes: candidate.globalRoutes.size, unresolvedGlobalRouteIds: candidate.unresolvedGlobalRouteIds,
      globalBounds: { width: Math.max(...candidate.panels.map(panel=>panel.x+panel.width))-Math.min(...candidate.panels.map(panel=>panel.x)), height: Math.max(...candidate.panels.map(panel=>panel.y+panel.height))-Math.min(...candidate.panels.map(panel=>panel.y)) },
      routeFindings: { overlaps:candidate.globalRouteFindings.overlaps.length,crossings:candidate.globalRouteFindings.crossings.length,nonOrthogonal:candidate.globalRouteFindings.nonOrthogonal.length,sharedTerminalIntersections:candidate.globalRouteFindings.sharedTerminalIntersections.length },
      unresolvedRouteIds: currentNetworkModel.connections.filter(connection => !candidate.routeViewByConnection.has(connection.id)).map(connection => connection.id),
      geometryViewsUsed: candidate.geometryViewCount,
      multiCandidateConnectionCount: [...candidate.routeCandidatesByConnection.values()].filter(views => views.length > 1).length }, null, 2));
    expect(candidate.homeViewByAsset.size).toBe(684);
    expect(candidate.panelByAsset.size).toBe(684);
    expect(candidate.routeViewByConnection.size).toBe(677);
    expect(candidate.assetPositions.size).toBe(684);
    expect(candidate.terminalPositions.size).toBe(currentNetworkModel.assets.reduce((sum,asset)=>sum+asset.terminals.length,0));
    expect(candidate.globalRoutes.size).toBe(677);
    expect(candidate.unresolvedGlobalRouteIds).toEqual([]);
    expect(candidate.globalRouteFindings.overlaps).toEqual([]);
    expect(candidate.globalRouteFindings.crossings).toEqual([]);
    expect(candidate.globalRouteFindings.nonOrthogonal).toEqual([]);
  }, 60000);
});
