import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { orthogonalPoints } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

/** Isolated test only: keep the SW411 source fixed and shift SW426/RM714 16,296 units right. */
export function sw426DestinationPlus600Candidate(
  model: NetworkModel,
  base: ReturnType<typeof continuousNetwork> = continuousNetwork(model),
) {
  const moved = new Set<string>();
  const frames = base.panels.map(frame => {
    if (frame.id !== 'desands/hv' && frame.id !== 'desands/laboratory') return { ...frame };
    for (const id of frame.assetIds) if (id !== 'sw411:tier-14:interface') moved.add(id);
    return { ...frame, x: frame.x + 16_296 };
  });
  const join = model.connections.find(link => link.id === 'whole:join:sw426')!;
  const owners = base.owners;
  // The interface is a hidden boundary marker and is intentionally not a
  // room's visible asset list; include only its destination endpoint here.
  const destinationOwner = owners.get(join.to);
  if (destinationOwner === 'sw426:interface:sw411') moved.add(destinationOwner);
  if (!moved.has('sw426:interface:sw411') || moved.has('sw411:tier-14:interface')) throw new Error('SW426/source ownership check failed');

  const positions = Object.fromEntries(Object.entries(base.view.layout.assets).map(([id, p]) => [id, [...p] as [number, number]]));
  const terminals = Object.fromEntries(Object.entries(base.view.layout.terminals).map(([id, p]) => [id, [...p] as [number, number]]));
  const labels = new Map([...base.labels].map(([id, label]) => [id, { ...label }]));
  const shift = (p: [number, number]) => [p[0] + 16_296, p[1]] as [number, number];
  for (const id of moved) {
    if (positions[id]) positions[id] = shift(positions[id]);
    const asset = model.assets.find(item => item.id === id);
    for (const terminal of asset?.terminals ?? []) if (terminals[terminal]) terminals[terminal] = shift(terminals[terminal]);
    const label = labels.get(id); if (label) labels.set(id, { ...label, x: label.x + 16_296 });
  }
  const routes = new Map([...base.routes].map(([id, points]) => [id, points.map(p => [...p] as [number, number])]));
  for (const connection of model.connections) {
    const fromMoved = moved.has(owners.get(connection.from) ?? '');
    const toMoved = moved.has(owners.get(connection.to) ?? '');
    if (fromMoved && toMoved && connection.id !== 'whole:join:sw426') routes.set(connection.id, routes.get(connection.id)!.map(shift));
  }
  const link = join;
  const from = terminals[link.from]; const to = terminals[link.to];
  if (!from || !to || owners.get(link.from) !== 'sw411:tier-14:interface' || owners.get(link.to) !== 'sw426:interface:sw411') throw new Error('SW426 join endpoint ownership changed');
  routes.set(link.id, orthogonalPoints([from, [from[0], from[1] + 90], [to[0], from[1] + 90], to]));

  const findings = validateDiagramGeometry({
    routes: [...routes].map(([id, points]): GeometryRoute => {
      const connection = model.connections.find(item => item.id === id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    }),
    roomFrames: frames.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  });
  return { base, frames, routes, findings, movedAssetCount: moved.size, movedAssetIds: [...moved].sort(), from, to };
}
