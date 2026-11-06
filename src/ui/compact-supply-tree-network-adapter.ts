import { currentNetworkModel } from '../models/site/current-network';
import { hasDeviceCard } from './equipment-appearance';
import { continuousNetwork } from './continuous-network';
import { deviceCard } from './device-card';
import { compactSupplyTreeLayout, type TreeFootprint } from './compact-supply-tree-layout';
/** Read-only adapter for measuring the candidate against the frozen .10 package. */
export function layoutCurrentWholeNetwork(layoutOptions: {
  horizontalGap?: number;
  verticalGap?: number;
  maxWidth?: number;
  rootGap?: number;
  baseGeometry?: ReturnType<typeof continuousNetwork>;
} = {}) {
  const model = currentNetworkModel;
  const assets = model.assets;
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacent = new Map(assets.map(asset => [asset.id, [] as { id: string; connectionId: string; localTerminal: string }[]]));
  const edgeEndpoints = new Map<string, [string, string]>();

  for (const connection of model.connections) {
    const a = owners.get(connection.from);
    const b = owners.get(connection.to);
    if (!a || !b || a === b) continue;
    adjacent.get(a)!.push({ id: b, connectionId: connection.id, localTerminal: connection.from });
    adjacent.get(b)!.push({ id: a, connectionId: connection.id, localTerminal: connection.to });
    edgeEndpoints.set(connection.id, [a, b]);
  }

  // Preserve the production rendering forest's special treatment of single-ended
  // earth branches: they are attached to their one equipment owner, not traversed
  // as a competing supply route. This copies only topology selection, not routing.
  const earthOwner = new Map(assets
    .filter(asset => asset.kind === 'earth-switch' && adjacent.get(asset.id)!.length === 1)
    .map(asset => [asset.id, adjacent.get(asset.id)![0].id] as const));
  const roots = [...new Set(model.sources.map(source => source.assetId).filter(id => byId.has(id)))];
  const children = new Map(assets.map(asset => [asset.id, [] as string[]]));
  const parent = new Map<string, string>();
  const treeConnectionIds = new Set<string>();
  const visited = new Set<string>();

  const traverse = (componentRoots: readonly string[]) => {
    const queue = [...componentRoots];
    for (const root of componentRoots) visited.add(root);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      for (const peer of adjacent.get(id)!) {
        if (visited.has(peer.id) || earthOwner.has(peer.id)) continue;
        visited.add(peer.id);
        parent.set(peer.id, id);
        children.get(id)!.push(peer.id);
        treeConnectionIds.add(peer.connectionId);
        queue.push(peer.id);
      }
    }
  };

  traverse(roots);
  const allRoots = [...roots];
  for (const asset of assets) {
    if (!visited.has(asset.id) && !earthOwner.has(asset.id)) {
      allRoots.push(asset.id);
      traverse([asset.id]);
    }
  }
  for (const [earthId, ownerId] of earthOwner) {
    children.get(ownerId)!.push(earthId);
    parent.set(earthId, ownerId);
    visited.add(earthId);
    const edge = adjacent.get(earthId)![0];
    treeConnectionIds.add(edge.connectionId);
  }

  for (const asset of assets) {
    children.get(asset.id)!.sort((left, right) => {
      const pin = (id: string) => asset.terminals.indexOf(adjacent.get(asset.id)!.find(peer => peer.id === id)!.localTerminal);
      return pin(left) - pin(right) || left.localeCompare(right);
    });
  }

  const base = layoutOptions.baseGeometry ?? continuousNetwork(model);
  const contentOffsets = new Map<string, { left: number; right: number; top: number; bottom: number }>();
  for (const asset of assets) {
    const point = base.view.layout.assets[asset.id] ?? [0, 0];
    const label = base.labels.get(asset.id);
    const boxes = hasDeviceCard(asset) && label
      ? (() => {
          const card = deviceCard(asset, point, label);
          return [
            { left: card.x, right: card.x + card.width, top: card.y, bottom: card.y + card.height },
            { left: label.x - point[0], right: label.x - point[0] + label.width, top: label.y - point[1], bottom: label.y - point[1] + label.height },
          ];
        })()
      : [
          { left: -46, right: 46, top: -46, bottom: 46 },
          ...(label ? [{ left: label.x - point[0], right: label.x - point[0] + label.width, top: label.y - point[1], bottom: label.y - point[1] + label.height }] : []),
        ];
    contentOffsets.set(asset.id, {
      left: Math.min(...boxes.map(box => box.left)) - 12,
      right: Math.max(...boxes.map(box => box.right)) + 12,
      top: Math.min(...boxes.map(box => box.top)) - 12,
      bottom: Math.max(...boxes.map(box => box.bottom)) + 12,
    });
  }
  const footprints = new Map<string, TreeFootprint>(assets.map(asset => {
    const content = contentOffsets.get(asset.id)!;
    return [asset.id, { left: content.left, right: content.right }];
  }));

  const result = compactSupplyTreeLayout(allRoots, children, footprints, {
    horizontalGap: layoutOptions.horizontalGap ?? 90,
    verticalGap: layoutOptions.verticalGap ?? 700,
    maxWidth: layoutOptions.maxWidth ?? 12_000,
    rootGap: layoutOptions.rootGap ?? 500,
  });
  const nonTreeConnectionIds = model.connections
    .filter(connection => edgeEndpoints.has(connection.id) && !treeConnectionIds.has(connection.id))
    .map(connection => connection.id);
  const parentCounts = new Map<string, number>();
  for (const descendants of children.values()) for (const child of descendants) parentCounts.set(child, (parentCounts.get(child) ?? 0) + 1);
  const footprintCollisions: [string, string][] = [];
  const entries = assets.map(asset => {
    const [x, y] = result.positions[asset.id];
    const extent = footprints.get(asset.id)!;
    const vertical = contentOffsets.get(asset.id)!;
    return { id: asset.id, left: x + extent.left, right: x + extent.right, top: y + vertical.top, bottom: y + vertical.bottom };
  });
  const footprintCollisionDetails: { a: typeof entries[number]; b: typeof entries[number] }[] = [];
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i]; const b = entries[j];
    if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
      footprintCollisions.push([a.id, b.id]);
      footprintCollisionDetails.push({ a, b });
    }
  }

  return {
    model: { id: model.id, version: model.version, assetCount: assets.length, connectionCount: model.connections.length },
    roots: allRoots,
    children,
    footprints,
    positions: result.positions,
    bounds: {
      x: Math.min(...entries.map(entry => entry.left)),
      y: Math.min(...entries.map(entry => entry.top)),
      width: Math.max(...entries.map(entry => entry.right)) - Math.min(...entries.map(entry => entry.left)),
      height: Math.max(...entries.map(entry => entry.bottom)) - Math.min(...entries.map(entry => entry.top)),
    },
    rowCount: result.rowCount,
    unplacedAssetIds: assets.map(asset => asset.id).filter(id => !result.positions[id]),
    multiParentAssetIds: [...parentCounts].filter(([, count]) => count > 1).map(([id]) => id),
    nonTreeConnectionIds,
    footprintCollisions,
    footprintCollisionDetails,
  };
}

