import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import type { Point } from './diagram-geometry';

const SW426_ROOM_ID = 'desands/hv';
const RM714_ROOM_ID = 'desands/laboratory';
const SHIFT_X = 15_696;

/**
 * Isolated room-shift hypothesis: keep SW411 fixed and move SW426 plus its
 * RM714 child room east together. Room-local wires and labels move with their
 * equipment; the SW411→SW426 join is rebuilt between its live terminal ends.
 */
export function shiftSw426AndRm714Candidate(model: NetworkModel) {
  const base = continuousNetwork(model);
  const panelById = new Map(base.panels.map(panel => [panel.id, panel]));
  const sourcePanel = panelById.get(SW426_ROOM_ID);
  const childPanel = panelById.get(RM714_ROOM_ID);
  if (!sourcePanel || !childPanel) throw new Error('SW426 or RM714 room frame is missing.');

  const movedAssetIds = new Set([...sourcePanel.assetIds, ...sourcePanel.memberAssetIds, ...childPanel.assetIds, ...childPanel.memberAssetIds]);
  const assetsById = new Map(model.assets.map(asset => [asset.id, asset]));
  const crossBoundary = model.connections.filter(connection =>
    movedAssetIds.has(base.owners.get(connection.from) ?? '') !== movedAssetIds.has(base.owners.get(connection.to) ?? ''),
  );
  if (crossBoundary.length !== 1 || crossBoundary[0].id !== 'whole:join:sw426') {
    throw new Error(`Expected only whole:join:sw426 to cross the moved rooms; found ${crossBoundary.map(item => item.id).join(', ')}`);
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

  for (const assetId of movedAssetIds) {
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
  for (const panel of panels) if (panel.id === SW426_ROOM_ID || panel.id === RM714_ROOM_ID) panel.x += SHIFT_X;

  for (const connection of model.connections) {
    const fromMoved = movedAssetIds.has(base.owners.get(connection.from) ?? '');
    const toMoved = movedAssetIds.has(base.owners.get(connection.to) ?? '');
    if (fromMoved && toMoved) {
      const points = routes.get(connection.id);
      if (points) routes.set(connection.id, points.map(([x, y]) => [x + SHIFT_X, y]));
    }
  }

  const join = model.connections.find(connection => connection.id === 'whole:join:sw426')!;
  const from = view.layout.terminals[join.from];
  const to = view.layout.terminals[join.to];
  const oldRoute = base.routes.get(join.id);
  if (!from || !to || !oldRoute || oldRoute.length < 2) throw new Error('Live SW411/SW426 join terminals are missing.');
  const departure = oldRoute[1];
  routes.set(join.id, simplify([
    from,
    [from[0], departure[1]],
    [to[0], departure[1]],
    to,
  ]));

  const allPoints = [
    ...Object.values(view.layout.assets),
    ...[...routes.values()].flat(),
  ];
  const minX = Math.min(...allPoints.map(point => point[0])) - 100;
  const minY = Math.min(...allPoints.map(point => point[1])) - 150;
  const maxX = Math.max(...allPoints.map(point => point[0]), ...[...labels.values()].map(label => label.x + label.width)) + 100;
  const maxY = Math.max(...allPoints.map(point => point[1]), ...[...labels.values()].map(label => label.y + label.height)) + 150;
  view.bounds = [minX, minY, maxX - minX, maxY - minY];

  return {
    base,
    candidate: { ...base, view, labels, routes, panels },
    movedRoomIds: [SW426_ROOM_ID, RM714_ROOM_ID],
    movedAssetIds: [...movedAssetIds].sort(),
    shift: { x: SHIFT_X, y: 0 },
    join: { from, to, points: routes.get(join.id)! },
  };
}

function simplify(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && previous[0] === point[0] && previous[1] === point[1]) continue;
    while (result.length >= 2) {
      const a = result.at(-2)!; const b = result.at(-1)!;
      if ((a[0] === b[0] && b[0] === point[0]) || (a[1] === b[1] && b[1] === point[1])) result.pop();
      else break;
    }
    result.push([point[0], point[1]]);
  }
  return result;
}
