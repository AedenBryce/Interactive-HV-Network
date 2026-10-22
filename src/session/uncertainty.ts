import { buildGraph, evaluateSources, walkGraph } from './connectivity';
import type { Connectivity } from './connectivity';
import type { NetworkModel, SourceStates, DeviceStates } from './model';
import { evaluateEarths } from './earth';
import type { EarthConnectivity, SourceEarthConflict } from './earth';
import { isSupported } from './evidence';

export type ConnectivityStatus = 'connected' | 'disconnected' | 'unconfirmed';
export type UncertaintyConnectivity = {
  sourceStatus: ConnectivityStatus;
  earthStatus: ConnectivityStatus;
  possibleSourceIds: string[];
  possibleEarthIds: string[];
  possibleConflictSourceIds: string[];
  sourceBoundaryIds: string[];
  earthBoundaryIds: string[];
  hasSourceUncertainty: boolean;
  hasEarthUncertainty: boolean;
  evidenceIds: string[];
  reviewIds: string[];
  possiblePaths: Connectivity['paths'];
};
export type ConnectionResult = { sourceStatus: ConnectivityStatus; earthStatus: ConnectivityStatus; unconfirmed: boolean };
const status = (known: boolean, possible: boolean): ConnectivityStatus => known ? 'connected' : possible ? 'unconfirmed' : 'disconnected';

export function evaluateUncertainty(model: NetworkModel, devices: DeviceStates, sources: SourceStates, definite: Record<string, Connectivity & EarthConnectivity>, definiteConflicts: SourceEarthConflict[]) {
  const graph = buildGraph(model, devices, { includeUnconfirmed: true });
  const possible = evaluateSources(model, graph, sources, { includeUnconfirmed: true });
  const earths = evaluateEarths(model, graph, sources, { includeUnconfirmed: true });
  const boundaryReach = new Map((model.boundaries ?? []).map(boundary => [boundary.id, walkGraph(graph, boundary.terminal, { stopAt: new Set((model.earths ?? []).map(earth => earth.terminal)) })]));
  const connectivity: Record<string, UncertaintyConnectivity> = Object.fromEntries(model.assets.map(asset => {
    const known = definite[asset.id];
    const upper = possible[asset.id];
    const possibleSourceIds = upper.sourceIds.filter(id => !known.sourceIds.includes(id));
    const possibleEarthIds = earths.connectivity[asset.id].earthIds.filter(id => !known.earthIds.includes(id));
    const sourceBoundaryIds = (model.boundaries ?? []).filter(boundary => boundary.sourceCoverage === 'unconfirmed' && asset.terminals.some(terminal => boundaryReach.get(boundary.id)!.has(terminal))).map(boundary => boundary.id);
    const earthBoundaryIds = (model.boundaries ?? []).filter(boundary => boundary.earthCoverage === 'unconfirmed' && asset.terminals.some(terminal => boundaryReach.get(boundary.id)!.has(terminal))).map(boundary => boundary.id);
    const changedEdges = new Set(upper.routeEdgeIds.filter(id => !known.routeEdgeIds.includes(id)));
    const relevantEdges = graph.edges.filter(edge => changedEdges.has(edge.id));
    const claims = [asset,
      ...model.connections.filter(connection => relevantEdges.some(edge => edge.connectionId === connection.id)),
      ...model.assets.filter(item => relevantEdges.some(edge => edge.assetId === item.id)),
      ...model.sources.filter(source => possibleSourceIds.includes(source.id)),
      ...(model.earths ?? []).filter(earth => possibleEarthIds.includes(earth.id)),
      ...(model.boundaries ?? []).filter(boundary => [...sourceBoundaryIds, ...earthBoundaryIds].includes(boundary.id)),
    ];
    return [asset.id, {
      sourceStatus: status(known.sourceIds.length > 0, possibleSourceIds.length + sourceBoundaryIds.length > 0),
      earthStatus: status(known.earthIds.length > 0, possibleEarthIds.length + earthBoundaryIds.length > 0),
      possibleSourceIds, possibleEarthIds,
      sourceBoundaryIds, earthBoundaryIds,
      possibleConflictSourceIds: earths.connectivity[asset.id].conflictSourceIds.filter(id => !known.conflictSourceIds.includes(id)),
      hasSourceUncertainty: possibleSourceIds.length > 0 || sourceBoundaryIds.length > 0 || upper.routeEdgeIds.some(id => !known.routeEdgeIds.includes(id)),
      hasEarthUncertainty: possibleEarthIds.length > 0 || earthBoundaryIds.length > 0,
      evidenceIds: [...new Set(claims.flatMap(claim => claim.evidenceIds ?? []))],
      reviewIds: [...new Set(claims.flatMap(claim => claim.reviewIds ?? []))],
      possiblePaths: upper.paths.filter(path => !known.paths.some(knownPath => knownPath.sourceId === path.sourceId && JSON.stringify(knownPath.terminals) === JSON.stringify(path.terminals))),
    }];
  }));
  const terminalSources = Object.assign({}, ...Object.values(definite).map(result => result.terminalSources)) as Record<string, string[]>;
  const upperSources = Object.assign({}, ...Object.values(possible).map(result => result.terminalSources)) as Record<string, string[]>;
  const terminalEarths = Object.assign({}, ...Object.values(definite).map(result => result.terminalEarths)) as Record<string, string[]>;
  const connectionResults: Record<string, ConnectionResult> = Object.fromEntries(model.connections.map(connection => {
    const endpoints = [connection.from, connection.to];
    const sourceStatus = status(isSupported(model, connection) && endpoints.some(t => terminalSources[t]?.length), endpoints.some(t => upperSources[t]?.length) || (model.boundaries ?? []).some(boundary => boundary.sourceCoverage === 'unconfirmed' && endpoints.some(t => boundaryReach.get(boundary.id)!.has(t))));
    const earthStatus = status(isSupported(model, connection) && endpoints.some(t => terminalEarths[t]?.length), endpoints.some(t => earths.terminalEarths[t]?.length) || (model.boundaries ?? []).some(boundary => boundary.earthCoverage === 'unconfirmed' && endpoints.some(t => boundaryReach.get(boundary.id)!.has(t))));
    return [connection.id, { sourceStatus, earthStatus, unconfirmed: !isSupported(model, connection) || sourceStatus === 'unconfirmed' || earthStatus === 'unconfirmed' }];
  }));
  return { connectivity, connectionResults, possibleConflicts: earths.conflicts.filter(possible => !definiteConflicts.some(known => known.sourceId === possible.sourceId && known.earthId === possible.earthId)) };
}
