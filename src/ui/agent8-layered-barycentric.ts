import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import type { Point } from './diagram-geometry';

/**
 * Trial 8: ranked, weighted barycentric ordering for rigid switchroom modules.
 * Rank and row membership stay fixed; only sibling order changes. Room internals
 * are translated as rigid modules, then the whole graph is rerouted globally.
 */
export function layoutAgent8Barycentric(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const frameById = new Map(seed.frames.map(frame => [frame.id, frame] as const));
  const rooms = seed.frames.map(frame => {
    const placement = seed.placement.positions[frame.id];
    return {
      id: frame.id,
      frame,
      layer: placement?.layer ?? 0,
      row: placement?.row ?? 0,
      x: frame.x,
      center: frame.x + frame.width / 2,
      width: frame.width,
    };
  });
  const rankById = new Map(rooms.map(room => [room.id, room.layer] as const));
  const neighbors = new Map(rooms.map(room => [room.id, new Map<string, number>()] as const));
  const addEdge = (a: string | undefined, b: string | undefined, weight: number) => {
    if (!a || !b || a === b || !neighbors.has(a) || !neighbors.has(b)) return;
    neighbors.get(a)!.set(b, (neighbors.get(a)!.get(b) ?? 0) + weight);
    neighbors.get(b)!.set(a, (neighbors.get(b)!.get(a) ?? 0) + weight);
  };
  for (const [childId, node] of Object.entries(seed.safePlan)) {
    for (const parent of node.parents) if (parent.kind === 'room') addEdge(parent.id, childId, 12);
  }
  const roomOwner = seed.roomOwnerByAsset;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const connection of model.connections) {
    const from = roomOwner.get(ownerByTerminal.get(connection.from) ?? '');
    const to = roomOwner.get(ownerByTerminal.get(connection.to) ?? '');
    if (from && to) addEdge(from, to, base.treeEdgeIds.has(connection.id) ? 1 : 2);
  }

  const groups = new Map<string, typeof rooms>();
  for (const room of rooms) {
    const key = `${room.layer}:${room.row}`;
    groups.set(key, [...(groups.get(key) ?? []), room]);
  }
  const positions = new Map(rooms.map(room => [room.id, room.center] as const));
  const stableCompare = (a: string, b: string) => rooms.find(room => room.id === a)!.center - rooms.find(room => room.id === b)!.center || a.localeCompare(b);
  const barycenter = (roomId: string, adjacent: (other: string) => boolean) => {
    const weighted: [number, number][] = [];
    for (const [other, weight] of neighbors.get(roomId) ?? []) if (adjacent(other)) weighted.push([positions.get(other)!, weight]);
    const total = weighted.reduce((sum, [, weight]) => sum + weight, 0);
    return total ? weighted.reduce((sum, [x, weight]) => sum + x * weight, 0) / total : positions.get(roomId)!;
  };
  const sweep = (descending: boolean) => {
    const layerGroups = [...groups.entries()].sort((a, b) => {
      const la = Number(a[0].split(':')[0]); const lb = Number(b[0].split(':')[0]);
      return descending ? lb - la : la - lb;
    });
    for (const [, group] of layerGroups) {
      const ordered = group.map(room => room.id).sort((a, b) => {
        const layerA = rankById.get(a)!; const layerB = rankById.get(b)!;
        const scoreA = barycenter(a, other => descending ? rankById.get(other)! > layerA : rankById.get(other)! < layerA);
        const scoreB = barycenter(b, other => descending ? rankById.get(other)! > layerB : rankById.get(other)! < layerB);
        return scoreA - scoreB || stableCompare(a, b);
      });
      const gap = 220;
      const width = group.reduce((sum, room) => sum + room.width, 0) + Math.max(0, group.length - 1) * gap;
      const oldLeft = Math.min(...group.map(room => room.x));
      let x = oldLeft;
      for (const id of ordered) {
        const room = frameById.get(id)!;
        positions.set(id, x + room.width / 2);
        x += room.width + gap;
      }
      // Preserve the row's original center to limit top-level drift.
      const newLeft = oldLeft;
      const centerBefore = group.reduce((sum, room) => sum + room.center, 0) / group.length;
      const centerAfter = newLeft + width / 2;
      const shift = centerBefore - centerAfter;
      for (const id of ordered) positions.set(id, positions.get(id)! + shift);
    }
  };
  for (let pass = 0; pass < 8; pass++) {
    sweep(pass % 2 === 1);
  }

  const roomTranslations: Record<string, Point> = {};
  for (const room of rooms) {
    const targetCenter = positions.get(room.id)!;
    const baselineFrame = base.panels.find(frame => frame.id === room.id);
    const existingTranslationX = baselineFrame ? room.frame.x - baselineFrame.x : 0;
    roomTranslations[room.id] = [existingTranslationX + targetCenter - room.center, 0];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, routeBudget: 'quick' });
  return {
    candidate,
    seed,
    roomTranslations,
    determinismKey: rooms.map(room => `${room.id}:${room.layer}:${room.row}:${positions.get(room.id)}`).join('|'),
  };
}
