import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { cutsBox, diagramGeometry, equipmentPorts, orthogonalPoints } from './diagram-geometry';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';

type Point = [number, number];

function segments(points: Point[]) {
  return points.slice(1).map((to, index) => ({ from: points[index], to }));
}

function overlaps(a: ReturnType<typeof segments>[number], b: ReturnType<typeof segments>[number]) {
  const aVertical = a.from[0] === a.to[0];
  const bVertical = b.from[0] === b.to[0];
  if (aVertical !== bVertical) return false;
  if (aVertical) {
    return a.from[0] === b.from[0]
      && Math.min(Math.max(a.from[1], a.to[1]), Math.max(b.from[1], b.to[1]))
        > Math.max(Math.min(a.from[1], a.to[1]), Math.min(b.from[1], b.to[1]));
  }
  return a.from[1] === b.from[1]
    && Math.min(Math.max(a.from[0], a.to[0]), Math.max(b.from[0], b.to[0]))
      > Math.max(Math.min(a.from[0], a.to[0]), Math.min(b.from[0], b.to[0]));
}

function crosses(a: ReturnType<typeof segments>[number], b: ReturnType<typeof segments>[number]) {
  const aVertical = a.from[0] === a.to[0];
  const bVertical = b.from[0] === b.to[0];
  if (aVertical === bVertical) return false;
  const vertical = aVertical ? a : b;
  const horizontal = aVertical ? b : a;
  return vertical.from[0] > Math.min(horizontal.from[0], horizontal.to[0])
    && vertical.from[0] < Math.max(horizontal.from[0], horizontal.to[0])
    && horizontal.from[1] > Math.min(vertical.from[1], vertical.to[1])
    && horizontal.from[1] < Math.max(vertical.from[1], vertical.to[1]);
}

function touches(a: ReturnType<typeof segments>[number], b: ReturnType<typeof segments>[number]) {
  const aVertical = a.from[0] === a.to[0];
  const bVertical = b.from[0] === b.to[0];
  if (aVertical === bVertical) return false;
  const vertical = aVertical ? a : b;
  const horizontal = aVertical ? b : a;
  const x = vertical.from[0]; const y = horizontal.from[1];
  return x >= Math.min(horizontal.from[0], horizontal.to[0])
    && x <= Math.max(horizontal.from[0], horizontal.to[0])
    && y >= Math.min(vertical.from[1], vertical.to[1])
    && y <= Math.max(vertical.from[1], vertical.to[1]);
}

describe('whole-network diagram layout', () => {
  const { view, routes, panels, treeEdgeIds, labels, hiddenIds, owners } = continuousNetwork(currentNetworkModel);


  it('draws every modeled asset and connection in the whole-network view', () => {
    expect(new Set(view.assetIds).size).toBe(currentNetworkModel.assets.length);
    expect(routes.size).toBe(currentNetworkModel.connections.length);
    const missingRoutes = currentNetworkModel.connections.filter(connection => !routes.has(connection.id)).map(connection => connection.id);
    expect(missingRoutes, `connections without a rendered route: ${missingRoutes.join(', ')}`).toEqual([]);
    const missingLabels = currentNetworkModel.assets.filter(asset => !hiddenIds.has(asset.id) && !labels.has(asset.id)).map(asset => asset.id);
    expect(missingLabels, `visible assets without labels: ${missingLabels.join(', ')}`).toEqual([]);
  });

  it('keeps the confirmed RM406/Hopper8, RM410/Hopper9 and SW411/SW421 room links local and top-down', () => {
    const routeLength = (id: string) => routes.get(id)!.slice(1).reduce((total, point, index) =>
      total + Math.abs(point[0] - routes.get(id)![index][0]) + Math.abs(point[1] - routes.get(id)![index][1]), 0);
    const frame = (title: string) => panels.find(panel => panel.title === title)!;
    const below = (childTitle: string, parentTitle: string) => {
      const child = frame(childTitle); const parent = frame(parentTitle);
      return child.y >= parent.y + parent.height;
    };

    expect(routeLength('wh:h8:rm406-cable')).toBeLessThan(1_000);
    expect(routeLength('whole:join:hopper9')).toBeLessThan(2_500);
    expect(routeLength('whole:join:sw421')).toBeLessThan(30_000);
    expect(below('MC416 · H8', 'RM406')).toBe(true);
    expect(below('RM419 · H9', 'RM410')).toBe(true);
    expect(below('SW421', 'SW411')).toBe(true);
    expect(below('MC419 · H9', 'RM419 · H9')).toBe(true);
    expect(below('MC418 · H7', 'RM418 · H7')).toBe(true);
  });

  it('keeps every connector orthogonal and avoids shared-length overlaps and interior crossings', () => {
    const routed = [...routes.entries()].flatMap(([id, points]) => segments(points).map((segment, index) => ({ id, index, ...segment })));
    const diagonal = routed.find(({ from, to }) => from[0] !== to[0] && from[1] !== to[1]);
    expect(diagonal, diagonal && `diagonal route: ${diagonal.id}`).toBeUndefined();

    const overlapsFound: string[] = [];
    const crossingsFound: string[] = [];
    for (let i = 0; i < routed.length; i++) for (let j = i + 1; j < routed.length; j++) {
      if (routed[i].id === routed[j].id && Math.abs(routed[i].index - routed[j].index) <= 1) continue;
      if (overlaps(routed[i], routed[j])) overlapsFound.push(`${routed[i].id} / ${routed[j].id}`);
      if (crosses(routed[i], routed[j])) crossingsFound.push(`${routed[i].id} / ${routed[j].id}`);
    }

    expect(overlapsFound, `overlapping routes: ${overlapsFound.join(', ')}`).toEqual([]);
    expect(crossingsFound, `crossing routes: ${crossingsFound.join(', ')}`).toEqual([]);
  });

  it('keeps independent parallel wires visually separated from fit scale through readable detail zoom', () => {
    const connectionById = new Map(currentNetworkModel.connections.map(connection => [connection.id, connection]));
    const routed = [...routes.entries()].flatMap(([id, points]) => segments(points).map((segment, index) => ({ id, index, ...segment })));
    const crowded: string[] = [];
    for (let i = 0; i < routed.length; i++) for (let j = i + 1; j < routed.length; j++) {
      const a = routed[i]; const b = routed[j];
      if (a.id === b.id && Math.abs(a.index - b.index) <= 1) continue;
      const verticalA = a.from[0] === a.to[0]; const verticalB = b.from[0] === b.to[0];
      if (verticalA !== verticalB) continue;
      const aMin = verticalA ? Math.min(a.from[1], a.to[1]) : Math.min(a.from[0], a.to[0]);
      const aMax = verticalA ? Math.max(a.from[1], a.to[1]) : Math.max(a.from[0], a.to[0]);
      const bMin = verticalA ? Math.min(b.from[1], b.to[1]) : Math.min(b.from[0], b.to[0]);
      const bMax = verticalA ? Math.max(b.from[1], b.to[1]) : Math.max(b.from[0], b.to[0]);
      if (Math.min(aMax, bMax) <= Math.max(aMin, bMin)) continue;
      const gap = Math.abs(verticalA ? a.from[0] - b.from[0] : a.from[1] - b.from[1]);
      // Internal room routes are hidden at fit scale and shown from the
      // structure zoom onward. Keep the minimum gap larger than a rendered
      // non-scaling stroke at that transition; separate checks catch actual
      // overlaps and crossings at every zoom level.
      if (gap >= 40) continue;
      const first = connectionById.get(a.id)!; const second = connectionById.get(b.id)!;
      const commonTerminal = [first.from, first.to].some(terminal => terminal === second.from || terminal === second.to);
      if (!commonTerminal) crowded.push(`${a.id} / ${b.id}: ${gap} layout units; ${JSON.stringify([a, b])}`);
    }
    expect(crowded, `independent wires merge at readable detail zoom: ${crowded.join(', ')}`).toEqual([]);
  });

  it('keeps symbol leads and connector routes from overlapping or crossing', () => {
    const connectionById = new Map(currentNetworkModel.connections.map(link => [link.id, link]));
    const allLines = [...routes.entries()].flatMap(([id, points]) => {
      const connection = connectionById.get(id)!;
      return segments(points).map(segment => ({ ...segment, id, terminals: [connection.from, connection.to] }));
    });
    for (const asset of currentNetworkModel.assets) {
      if (hiddenIds.has(asset.id)) continue;
      const [x, y] = view.layout.assets[asset.id];
      equipmentPorts(asset, view.layout).ports.forEach((port, index) => {
        const terminal = asset.terminals[index];
        const lead = orthogonalPoints([view.layout.terminals[terminal], [x + port[0], y + port[1]]]);
        allLines.push(...segments(lead).map(segment => ({ ...segment, id: `lead:${asset.id}:${terminal}`, terminals: [terminal] })));
      });
    }
    const overlapsFound: string[] = [];
    const crossingsFound: string[] = [];
    for (let i = 0; i < allLines.length; i++) for (let j = i + 1; j < allLines.length; j++) {
      const a = allLines[i]; const b = allLines[j];
      if (a.id === b.id) continue;
      if (overlaps(a, b)) overlapsFound.push(`${a.id} / ${b.id}`);
      if (crosses(a, b)) crossingsFound.push(`${a.id} / ${b.id}`);
    }
    expect(overlapsFound, `overlapping rendered lines: ${overlapsFound.join(', ')}`).toEqual([]);
    expect(crossingsFound, `crossing rendered lines: ${crossingsFound.join(', ')}`).toEqual([]);
  });

  it('keeps independent connector lines from touching except at a shared modeled terminal', () => {
    const connectionById = new Map(currentNetworkModel.connections.map(connection => [connection.id, connection]));
    // RM413 IN02 has an owner-confirmed double-boot to the RM413A bar. Its
    // upper earth lead tees into that shared cable/bar connection without
    // sharing the same pair of terminal IDs.
    const confirmedTees = new Set(['rm413:in02-rm417/rm413a:es-q8:upper:branch']);
    const routed = [...routes.entries()].flatMap(([id, points]) => segments(points).map((segment, index) => ({ id, index, ...segment })));
    const misleadingTouches: string[] = [];
    for (let i = 0; i < routed.length; i++) for (let j = i + 1; j < routed.length; j++) {
      const a = routed[i]; const b = routed[j];
      if (a.id === b.id && Math.abs(a.index - b.index) <= 1) continue;
      if (!touches(a, b)) continue;
      if (confirmedTees.has([a.id, b.id].sort().join('/'))) continue;
      const first = connectionById.get(a.id)!; const second = connectionById.get(b.id)!;
      const commonTerminal = [first.from, first.to].some(terminal => terminal === second.from || terminal === second.to);
      if (!commonTerminal) misleadingTouches.push(`${a.id} / ${b.id}: ${JSON.stringify({ a, b })}`);
    }
    expect(misleadingTouches, `independent routes touching without a shared terminal: ${misleadingTouches.join(', ')}`).toEqual([]);
  });

  it('keeps SW411 detail-view bus taps and earth branches from doubling over cable routes', () => {
    const source = currentNetworkModel.presentation!.views.find(item => item.id === 'sw411/overview')!;
    const detail = diagramGeometry(currentNetworkModel, source);
    const routed = [...detail.routes.entries()].flatMap(([id, points]) => segments(points).map((segment, index) => ({ id, index, ...segment })));
    const overlapsFound: string[] = [];
    const crossingsFound: string[] = [];
    for (let i = 0; i < routed.length; i++) for (let j = i + 1; j < routed.length; j++) {
      if (routed[i].id === routed[j].id && Math.abs(routed[i].index - routed[j].index) <= 1) continue;
      if (overlaps(routed[i], routed[j])) overlapsFound.push(`${routed[i].id} / ${routed[j].id}`);
      if (crosses(routed[i], routed[j])) crossingsFound.push(`${routed[i].id} / ${routed[j].id}`);
    }
    expect(overlapsFound, `SW411 detail-view line overlaps: ${overlapsFound.join(', ')}`).toEqual([]);
    expect(crossingsFound, `SW411 detail-view line crossings: ${crossingsFound.join(', ')}`).toEqual([]);
  });

  it('keeps inter-asset connectors close to their direct orthogonal path', () => {
    const detours = [...routes].flatMap(([id, points]) => {
      const routeLength = points.slice(1).reduce((sum, point, index) => sum + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]), 0);
      const directLength = Math.abs(points.at(-1)![0] - points[0][0]) + Math.abs(points.at(-1)![1] - points[0][1]);
      return routeLength - directLength > 1000 ? [`${id} adds ${routeLength - directLength} layout units`] : [];
    });
    expect(detours, `large connector detours: ${detours.join(', ')}`).toEqual([]);
  });

  it('keeps local earth-switch branches beside their associated switching device', () => {
    const ownerByTerminal = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const earthOwners = new Set(currentNetworkModel.assets.filter(asset => asset.kind === 'earth-switch').map(asset => asset.id));
    const longEarthBranches = currentNetworkModel.connections.flatMap(link => {
      const from = ownerByTerminal.get(link.from)!; const to = ownerByTerminal.get(link.to)!;
      if (!earthOwners.has(from) && !earthOwners.has(to)) return [];
      const route = routes.get(link.id)!;
      const length = route.slice(1).reduce((sum, point, index) => sum
        + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
      return length > 1000 ? [`${link.id}: ${length} layout units`] : [];
    });
    expect(longEarthBranches, `earth switches detached by long local runs: ${longEarthBranches.join(', ')}`).toEqual([]);
  });

  it('keeps each source-tree route flowing top-down without reversing upward', () => {
    // The bus tie is an intentional cross-link; terminal offsets can introduce
    // sub-10-unit symbol leads without changing the visual top-down direction.
    const tieLinks = new Set(['sw411:tie-to-bus-a', 'sw411:tie-to-bus-b']);
    const upwardRoutes = [...treeEdgeIds].filter(id => !tieLinks.has(id)).flatMap(id => {
      const points = [...routes.get(id)!];
      if (points[0][1] > points.at(-1)![1]) points.reverse();
      const upwardDistance = points.slice(1).reduce((sum, point, index) => sum + Math.max(0, points[index][1] - point[1]), 0);
      // Tiny local bends clear symbol terminals while the route still reads
      // top-down. Larger reversals indicate a layout or route failure.
      return upwardDistance > 150 ? [`${id} reverses upward by ${upwardDistance} units`] : [];
    });
    expect(upwardRoutes, `upward-running tree routes: ${upwardRoutes.join(', ')}`).toEqual([]);
  });

  it('keeps each confirmed SW411 feeder attached to the topology-driven tree regardless of contact state', () => {
    for (const room of ['sw454', 'sw451', 'sw435', 'sw431', 'sw426', 'sw421', 'rm721']) {
      expect(treeEdgeIds.has(`whole:join:${room}`), `${room} supply should remain in the source tree even when a contact is open or unconfirmed`).toBe(true);
    }
  });

  it('stair-steps independent SW411 destinations while keeping the confirmed ring rooms level', () => {
    const y = (title: string) => panels.find(panel => panel.title === title)!.y;
    expect(y('SW451')).toBeGreaterThan(y('SW454'));
    expect(y('SW421')).toBeGreaterThan(y('SW454'));
    expect(Math.abs(y('SW431') - y('SW435'))).toBeLessThan(100);
    expect(y('SW426')).toBeGreaterThan(y('SW451'));
  });

  it('keeps the adjacent SW431/SW435 ring bays level and close together', () => {
    const route = routes.get('whole:join:crushing-tie')!;
    const length = route.slice(1).reduce((sum, point, index) => sum
      + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
    expect(route.every(point => point[1] === route[0][1])).toBe(true);
    expect(length, 'the room-to-room tie should stay in the short corridor between the adjacent rooms').toBeLessThan(500);
    expect(hiddenIds.has('sw431:interface:sw435')).toBe(true);
    expect(hiddenIds.has('sw435:interface:sw431')).toBe(true);
  });

  it('keeps RM714 beside the SW426 supply without a long room-to-room run', () => {
    const route = routes.get('sw426:laboratory:cable')!;
    const length = route.slice(1).reduce((sum, point, index) => sum
      + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
    expect(route.at(-1)![1]).toBeGreaterThan(route[0][1]);
    expect(length, 'the SW426 → RM714 connection should stay a short downward link').toBeLessThan(1000);
    const sw426 = panels.find(panel => panel.title === 'SW426')!;
    const rm714 = panels.find(panel => panel.title === 'RM714')!;
    expect(rm714.y).toBeGreaterThan(sw426.y + sw426.height);
    expect(rm714.y - (sw426.y + sw426.height)).toBeLessThan(400);
  });

  it('keeps SW505 directly below its SW454 supply room', () => {
    const route = routes.get('sw454:sw505:cable-SW505-P-01')!;
    const length = route.slice(1).reduce((sum, point, index) => sum
      + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
    expect(route.every(point => point[0] === route[0][0])).toBe(true);
    expect(route.at(-1)![1]).toBeGreaterThan(route[0][1]);
    expect(length, 'the SW454 → SW505 feed should stay a short downward link').toBeLessThan(700);
    const sw454 = panels.find(panel => panel.title === 'SW454')!;
    const sw505 = panels.find(panel => panel.title === 'SW505')!;
    expect(sw505.y).toBeGreaterThan(sw454.y + sw454.height);
    expect(sw505.y - (sw454.y + sw454.height)).toBeLessThan(800);
  });

  it('keeps every direct room-to-room connection within one short link span', () => {
    const roomByAsset = new Map(panels.flatMap(panel => panel.assetIds.map(id => [id, panel.title] as const)));
    const longLinks = currentNetworkModel.connections.flatMap(link => {
      const fromRoom = roomByAsset.get(owners.get(link.from)!);
      const toRoom = roomByAsset.get(owners.get(link.to)!);
      if (!fromRoom || !toRoom || fromRoom === toRoom) return [];
      const route = routes.get(link.id)!;
      const length = route.slice(1).reduce((sum, point, index) => sum
        + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
      return length > 1000 ? [`${link.id} (${fromRoom} → ${toRoom}): ${length}`] : [];
    });
    expect(longLinks, `long direct room-to-room routes: ${longLinks.join(', ')}`).toEqual([]);
  });

  it('keeps connector lines clear of visible asset labels and prevents label-box collisions', () => {
    const visibleLabels = [...labels.entries()].filter(([id]) => !hiddenIds.has(id));
    const lineLabelCollisions = [...routes.entries()].flatMap(([id, points]) => segments(points).flatMap(segment =>
      visibleLabels.flatMap(([assetId, label]) => cutsBox(segment.from, segment.to, label) ? [`${id} / ${assetId}: ${JSON.stringify({ segment, label })}`] : []),
    ));
    const labelCollisions: string[] = [];
    for (let i = 0; i < visibleLabels.length; i++) for (let j = i + 1; j < visibleLabels.length; j++) {
      const [aId, a] = visibleLabels[i]; const [bId, b] = visibleLabels[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) labelCollisions.push(`${aId} / ${bId}: ${JSON.stringify({ a, b })}`);
    }
    expect(lineLabelCollisions, `routes through label boxes: ${lineLabelCollisions.join(', ')}`).toEqual([]);
    expect(labelCollisions, `overlapping label boxes: ${labelCollisions.join(', ')}`).toEqual([]);
  });

  it('keeps control cards clear of other control cards and labels', () => {
    const assetsById = new Map(currentNetworkModel.assets.map(asset => [asset.id, asset]));
    const cards = [...labels.entries()].flatMap(([id, label]) => {
      const asset = assetsById.get(id)!;
      if (!hasDeviceCard(asset)) return [];
      const [x, y] = view.layout.assets[id];
      const bounds = deviceCard(asset, [x, y], label);
      return [{ id, x: x + bounds.x, y: y + bounds.y, width: bounds.width, height: bounds.height }];
    });
    const overlapsFound: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]; const b = cards[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlapsFound.push(`${a.id} / ${b.id}: ${JSON.stringify({ a, b })}`);
    }
    for (const card of cards) for (const [id, label] of labels) {
      if (id !== card.id && card.x < label.x + label.width && card.x + card.width > label.x && card.y < label.y + label.height && card.y + card.height > label.y) overlapsFound.push(`${card.id} card / ${id} label: ${JSON.stringify({ card, label })}`);
    }
    expect(overlapsFound, `control-card collisions: ${overlapsFound.join(', ')}`).toEqual([]);
  });

  it('keeps connector routes out of unrelated device cards', () => {
    const assetsById = new Map(currentNetworkModel.assets.map(asset => [asset.id, asset]));
    const connectionById = new Map(currentNetworkModel.connections.map(connection => [connection.id, connection]));
    const cards = [...labels.entries()].flatMap(([id, label]) => {
      const asset = assetsById.get(id)!;
      if (!hasDeviceCard(asset)) return [];
      const [x, y] = view.layout.assets[id];
      const bounds = deviceCard(asset, [x, y], label);
      return [{ id, x: x + bounds.x, y: y + bounds.y, width: bounds.width, height: bounds.height }];
    });
    const collisions = [...routes.entries()].flatMap(([routeId, points]) => {
      const connection = connectionById.get(routeId)!;
      const endpointOwners = new Set([owners.get(connection.from)!, owners.get(connection.to)!]);
      return segments(points).flatMap(segment => cards.flatMap(card => {
        if (endpointOwners.has(card.id) || !cutsBox(segment.from, segment.to, card)) return [];
        return [`${routeId} crosses ${card.id}: ${JSON.stringify({ segment, card })}`];
      }));
    });
    expect(collisions, `routes through unrelated device cards: ${collisions.join(', ')}`).toEqual([]);
  });

  it('keeps switchroom boxes separated and the named equipment within each box', () => {
    for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i]; const b = panels[j];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x
        && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlaps, `${a.title} overlaps ${b.title}`).toBe(false);
    }

    for (const panel of panels) for (const id of panel.assetIds) {
      const [x, y] = view.layout.assets[id];
      expect(x, `${id} is left of ${panel.title}`).toBeGreaterThanOrEqual(panel.x);
      expect(y, `${id} is above ${panel.title}`).toBeGreaterThanOrEqual(panel.y);
      expect(x, `${id} is right of ${panel.title}`).toBeLessThanOrEqual(panel.x + panel.width);
      expect(y, `${id} is below ${panel.title}`).toBeLessThanOrEqual(panel.y + panel.height);
      const label = labels.get(id)!;
      expect(label.x, `${id} label is left of ${panel.title}`).toBeGreaterThanOrEqual(panel.x);
      expect(label.y, `${id} label is above ${panel.title}`).toBeGreaterThanOrEqual(panel.y);
      expect(label.x + label.width, `${id} label is right of ${panel.title}`).toBeLessThanOrEqual(panel.x + panel.width);
      expect(label.y + label.height, `${id} label is below ${panel.title}`).toBeLessThanOrEqual(panel.y + panel.height);
    }
  });
});
