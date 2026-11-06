import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import type { Point } from './diagram-geometry';
import { roomPlacementPlan } from './room-placement-plan';

const SOURCE_ROOM = 'sw411/overview';
const SW426_ROOM = 'desands/hv';
const RM714_ROOM = 'desands/laboratory';
const SHIFT_X = 15_696;

/** Candidate: hold the SW411 tier14 interface fixed; shift only SW426 + RM714. */
export function shiftSw426DestinationOnly(model: NetworkModel) {
  const base = continuousNetwork(model);
  const byId = new Map(base.panels.map(panel => [panel.id, panel]));
  const sourcePanel = byId.get(SOURCE_ROOM);
  const sw426Panel = byId.get(SW426_ROOM);
  const rm714Panel = byId.get(RM714_ROOM);
  if (!sourcePanel || !sw426Panel || !rm714Panel) throw new Error('Required SW411, SW426 or RM714 frame is missing.');

  const join = model.connections.find(connection => connection.id === 'whole:join:sw426');
  if (!join) throw new Error('whole:join:sw426 is missing.');
  const sourceEndpointAssetId = base.owners.get(join.from);
  const destinationEndpointAssetId = base.owners.get(join.to);
  if (sourceEndpointAssetId !== 'sw411:tier-14:interface' || destinationEndpointAssetId !== 'sw426:interface:sw411') {
    throw new Error(`Unexpected join endpoints: ${sourceEndpointAssetId} → ${destinationEndpointAssetId}`);
  }
  const laboratoryPlacement = roomPlacementPlan[RM714_ROOM];
  if (!laboratoryPlacement?.parents.some(parent => parent.kind === 'room' && parent.id === SW426_ROOM)) {
    throw new Error('RM714 is not explicitly placed as a child of SW426.');
  }

  const sourceOwnedIds = new Set([...sourcePanel.assetIds, ...sourcePanel.memberAssetIds]);
  const destinationIds = new Set([
    ...sw426Panel.assetIds, ...sw426Panel.memberAssetIds,
    ...rm714Panel.assetIds, ...rm714Panel.memberAssetIds,
  ]);
  const ambiguous = [...destinationIds].filter(id => sourceOwnedIds.has(id) && id !== sourceEndpointAssetId);
  if (ambiguous.length) throw new Error(`Destination/source ownership overlap is ambiguous: ${ambiguous.join(', ')}`);
  if (!destinationIds.has(destinationEndpointAssetId)) throw new Error('The SW426 destination endpoint is not owned by the SW426/RM714 group.');
  destinationIds.delete(sourceEndpointAssetId);

  const crossBoundary = model.connections.filter(connection =>
    destinationIds.has(base.owners.get(connection.from) ?? '') !== destinationIds.has(base.owners.get(connection.to) ?? ''),
  );
  if (crossBoundary.length !== 1 || crossBoundary[0].id !== join.id) {
    throw new Error(`Unexpected external boundary connections: ${crossBoundary.map(item => item.id).join(', ')}`);
  }

  const view = {
    ...base.view,
    layout: {
      ...base.view.layout,
      assets: { ...base.view.layout.assets },
      terminals: { ...base.view.layout.terminals },
    },
    bounds: [...base.view.bounds] as [number, number, number, number],
  };
  const labels = new Map([...base.labels].map(([id, label]) => [id, { ...label, lines: [...label.lines] }]));
  const routes = new Map([...base.routes].map(([id, points]) => [id, points.map(([x, y]) => [x, y] as Point)]));
  const panels = base.panels.map(panel => ({ ...panel, assetIds: [...panel.assetIds], memberAssetIds: [...panel.memberAssetIds] }));
  const assetsById = new Map(model.assets.map(asset => [asset.id, asset]));

  for (const assetId of destinationIds) {
    const asset = assetsById.get(assetId);
    const position = view.layout.assets[assetId];
    if (!asset || !position) continue;
    view.layout.assets[assetId] = [position[0] + SHIFT_X, position[1]];
    for (const terminalId of asset.terminals) {
      const terminal = view.layout.terminals[terminalId];
      if (terminal) view.layout.terminals[terminalId] = [terminal[0] + SHIFT_X, terminal[1]];
    }
    const label = labels.get(assetId);
    if (label) labels.set(assetId, { ...label, x: label.x + SHIFT_X });
  }
  for (const panel of panels) if (panel.id === SW426_ROOM || panel.id === RM714_ROOM) panel.x += SHIFT_X;

  for (const connection of model.connections) {
    const fromMoved = destinationIds.has(base.owners.get(connection.from) ?? '');
    const toMoved = destinationIds.has(base.owners.get(connection.to) ?? '');
    if (fromMoved && toMoved) {
      const points = routes.get(connection.id);
      if (points) routes.set(connection.id, points.map(([x, y]) => [x + SHIFT_X, y]));
    }
  }

  const oldJoin = base.routes.get(join.id);
  const oldFromTerminal = base.view.layout.terminals[join.from];
  const oldToTerminal = base.view.layout.terminals[join.to];
  const newFromTerminal = view.layout.terminals[join.from];
  const newToTerminal = view.layout.terminals[join.to];
  if (!oldJoin || oldJoin.length < 2 || !oldFromTerminal || !oldToTerminal || !newFromTerminal || !newToTerminal) {
    throw new Error('SW426 join live terminal or route endpoint is missing.');
  }
  // The existing routed endpoint includes the bus/interface tap offset. Keep
  // that exact contact point and move it with the room; keep SW411's source
  // contact fixed. The live terminal is still checked against the shifted asset.
  const source: Point = [newFromTerminal[0] + (oldJoin[0][0] - oldFromTerminal[0]), newFromTerminal[1] + (oldJoin[0][1] - oldFromTerminal[1])];
  const destination: Point = [newToTerminal[0] + (oldJoin.at(-1)![0] - oldToTerminal[0]), newToTerminal[1] + (oldJoin.at(-1)![1] - oldToTerminal[1])];
  const departure = oldJoin[1];
  routes.set(join.id, simplify([source, departure, [destination[0], departure[1]], destination]));

  const allPoints = [...Object.values(view.layout.assets), ...[...routes.values()].flat()];
  const minX = Math.min(...allPoints.map(point => point[0])) - 100;
  const minY = Math.min(...allPoints.map(point => point[1])) - 150;
  const maxX = Math.max(...allPoints.map(point => point[0]), ...[...labels.values()].map(label => label.x + label.width)) + 100;
  const maxY = Math.max(...allPoints.map(point => point[1]), ...[...labels.values()].map(label => label.y + label.height)) + 150;
  view.bounds = [minX, minY, maxX - minX, maxY - minY];

  return {
    base,
    candidate: { ...base, view, labels, routes, panels },
    movedRoomIds: [SW426_ROOM, RM714_ROOM],
    movedAssetIds: [...destinationIds].sort(),
    sourceEndpointAssetId,
    destinationEndpointAssetId,
    sourceEndpointUnchanged: samePoint(source, oldJoin[0]),
    destinationEndpoint: destination,
    shift: { x: SHIFT_X, y: 0 },
  };
}

function simplify(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && samePoint(previous, point)) continue;
    while (result.length >= 2) {
      const a = result.at(-2)!; const b = result.at(-1)!;
      if ((a[0] === b[0] && b[0] === point[0]) || (a[1] === b[1] && b[1] === point[1])) result.pop();
      else break;
    }
    result.push([point[0], point[1]]);
  }
  return result;
}
function samePoint(a: readonly number[], b: readonly number[]) { return a[0] === b[0] && a[1] === b[1]; }
