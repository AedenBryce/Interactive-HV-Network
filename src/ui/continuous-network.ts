import type { NetworkModel } from '../session/model';
import type { DiagramView } from '../session/presentation';
import { contactPosition, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import { clearRoute, cutsBox, labelLines, orthogonalPoints, sharedLength } from './diagram-geometry';
import type { AssetLabel, Point, Segment } from './diagram-geometry';
import { currentAssetLabel } from './review-updates';
import { compactEquipmentLabel, isDrive, isMotor, isMotorJunction } from './equipment-appearance';
import { layoutDriveAssemblies, layoutMotorAssemblies } from './assembly-layout';
import { separateSwitchroomFrames, switchroomFrames } from './switchroom-frames';
import {
  applyWholeNetworkRoomPlacement,
  orderWholeNetworkRoomClustersTopDown,
  planWholeNetworkRooms,
  wholeNetworkPlacementOwnerByAssetId,
} from './whole-network-room-layout';
import { threePositionContacts } from './three-position-contacts';
import { compactSupplyTreeLayout } from './compact-supply-tree-layout';
import { separateSw411FeederLanes } from './sw411-feeder-lanes';
import { resolveRoutes, type RouteResolveOptions } from './resolve-routes';
import { resolveAssetLabels } from './label-layout';
import { roomClusterOwnership } from './room-cluster-ownership';
import { applyMeasuredRouteCrossingDetours } from './route-crossing-detours';
import { planVerticalWholeNetworkCandidate } from './vertical-whole-network-layout-candidate';
import { crossingRouteIds } from './route-crossing-gaps';
import { planOrthogonalRoutes, type ReservedRoute } from './orthogonal-route-planner';

const crossesSegment = (a: Point, b: Point, segment: Segment) => {
  const vertical = a[0] === b[0];
  if (vertical === (segment.from[0] === segment.to[0])) return false;
  const x = vertical ? a[0] : segment.from[0]; const y = vertical ? segment.from[1] : a[1];
  return x > Math.min(vertical ? segment.from[0] : a[0], vertical ? segment.to[0] : b[0]) && x < Math.max(vertical ? segment.from[0] : a[0], vertical ? segment.to[0] : b[0]) && y > Math.min(vertical ? a[1] : segment.from[1], vertical ? b[1] : segment.to[1]) && y < Math.max(vertical ? a[1] : segment.from[1], vertical ? b[1] : segment.to[1]);
};


// Rendering forest only. The immutable model supplies every terminal/connection.
// Agreed starting states prefer the main drawing backbone; live switching never
// changes this layout. Earth switches remain attached side branches, not roots.
export type ContinuousNetworkLayoutStrategy = 'production' | 'vertical-candidate' | 'sw505-corridor-candidate' | 'crossing-optimizer-candidate';

export function continuousNetwork(
  model: NetworkModel,
  layoutStrategy: ContinuousNetworkLayoutStrategy = 'production',
) {
  const assets = model.assets;
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const owners = new Map(assets.flatMap(asset => asset.terminals.map(t => [t, asset.id] as const)));
  const adjacent = new Map(assets.map(asset => [asset.id, [] as { id: string; link: string; terminal: string }[]]));
  for (const link of model.connections) {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    if (a === b) continue;
    adjacent.get(a)!.push({ id: b, link: link.id, terminal: link.from });
    adjacent.get(b)!.push({ id: a, link: link.id, terminal: link.to });
  }
  const earthParents = new Map(assets.filter(a => a.kind === 'earth-switch' && adjacent.get(a.id)!.length === 1).map(a => [a.id, adjacent.get(a.id)![0].id]));
  const children = new Map(assets.map(a => [a.id, [] as string[]]));
  const parent = new Map<string, string>(); const parentLink = new Map<string, string>();
  const roots = [...new Set(model.sources.map(source => source.assetId))];
  const visited = new Set(roots); const treeEdgeIds = new Set<string>();
  const isOpen = (id: string) => {
    const asset = byId.get(id)!; const state = model.starting.devices[id];
    if (!asset.positions.length && !getRemovableMechanism(asset)) return false;
    return isIndependentState(state) ? state.contact !== 'closed' || state.racking !== 'in' : !['closed', 'service'].includes(String(contactPosition(state)));
  };
  function traverse() {
    const queue = [...visited];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const peer of adjacent.get(id)!) {
        if (visited.has(peer.id) || earthParents.has(peer.id)) continue;
        visited.add(peer.id); parent.set(peer.id, id); parentLink.set(peer.id, peer.link); treeEdgeIds.add(peer.link);
        children.get(id)!.push(peer.id); queue.push(peer.id);
      }
    }
  }
  // The diagram is a fixed wiring map: open or unconfirmed contacts affect
  // simulation connectivity, but they must not detach downstream rooms from
  // their depicted supply tree.
  traverse();
  for (const asset of assets) if (!visited.has(asset.id) && !earthParents.has(asset.id) && adjacent.get(asset.id)!.length) {
    roots.push(asset.id); visited.add(asset.id); traverse();
  }
  for (const asset of assets) children.get(asset.id)!.sort((a, b) => {
    const pin = (id: string) => asset.terminals.indexOf(adjacent.get(asset.id)!.find(peer => peer.id === id)!.terminal);
    return pin(a) - pin(b) || Number(isOpen(a)) - Number(isOpen(b));
  });
  // Spare incomers remain connected to their recorded bus, but are drawn above
  // it like the supplied incomers, rather than among the outgoing feeders.
  const spareIncomers: [string, string][] = [['sw411:in-01:cb', 'sw411:bus-a'], ['sw411:in-02:cb', 'sw411:bus-b']];
  const aboveBus = new Map(spareIncomers.filter(([id, bus]) => parent.get(id) === bus));
  for (const [id, bus] of aboveBus) children.set(bus, children.get(bus)!.filter(child => child !== id));
  const inlineIds = new Set(assets.filter(asset => asset.kind === 'interface' && asset.terminals.length === 1 && adjacent.get(asset.id)!.length > 1 && !roots.includes(asset.id) && !isMotor(asset) && !isMotorJunction(asset)).map(asset => asset.id));
  const labelWidth = (id: string) => Math.max(185, ...labelLines(compactEquipmentLabel(byId.get(id)!, currentAssetLabel(model, byId.get(id)!))).map(line => line.length * 12.5 + 18));
  const footprints = new Map(assets.map(asset => [asset.id, inlineIds.has(asset.id) ? { left: -labelWidth(asset.id) - 60, right: 40 } : { left: -100, right: Math.max(110 + labelWidth(asset.id) + 30, ...[...earthParents].filter(([, owner]) => owner === asset.id).map(([earth]) => 225 + labelWidth(earth) + 30)) }]));
  // Wrap sibling feeder branches into a bounded-width source-to-load tree.
  // The earlier contour layout let each descendant branch push its room's
  // feeder controls farther sideways; that made the whole drawing wide and
  // turned room frames into long bars. Keep the same rooted model tree, but
  // stagger overflow branches onto lower rows so the diagram reads top-down.
  const compactRoots = [...roots, ...aboveBus.keys()];
  const compactMembers = new Set(compactRoots);
  const compactQueue = [...compactRoots];
  for (let cursor = 0; cursor < compactQueue.length; cursor++) {
    for (const child of children.get(compactQueue[cursor]) ?? []) {
      if (compactMembers.has(child)) continue;
      compactMembers.add(child);
      compactQueue.push(child);
    }
  }
  // Single-ended earth switches and drawing-only references are attached
  // after the source tree is placed, so they intentionally have no tree edge.
  const compactChildren = new Map([...compactMembers].map(id => [id, (children.get(id) ?? []).filter(child => compactMembers.has(child))]));
  const compactFootprints = new Map([...footprints].filter(([id]) => compactMembers.has(id)));
  const compactTree = compactSupplyTreeLayout(compactRoots, compactChildren, compactFootprints, {
    horizontalGap: 180,
    verticalGap: 560,
    // Keep sibling groups compact and let deeper branches descend into new
    // rows. A broad width budget pushed secondary branches far from their
    // parent and created long cross-map connectors in the overview.
    maxWidth: 20_000,
    rootGap: 1_000,
  });
  const layout: DiagramView['layout'] = {
    assets: Object.fromEntries(Object.entries(compactTree.positions).map(([id, point]) => [id, [point[0], point[1]] as [number, number]])),
    terminals: {}, rotations: {}, busSpans: {},
  };
  // Keep SW411's two bus sections level while leaving the downstream feeder
  // branches in the topology-driven tree positions computed above.
  const busIds = ['sw411:bus-a', 'sw411:bus-b'].filter(id => layout.assets[id]);
  const busY = Math.max(...busIds.map(id => layout.assets[id][1]));
  function moveBranch(id: string, deltaX: number, deltaY: number) {
    const position = layout.assets[id];
    if (!position) return;
    layout.assets[id] = [position[0] + deltaX, position[1] + deltaY];
    children.get(id)!.forEach(child => moveBranch(child, deltaX, deltaY));
  }
  // Leave vertical separation between adjacent 33 kV poles 227 and 272.
  // Their owner-confirmed/excluded takeoff stubs otherwise occupy the same
  // narrow screen lane at whole-network zoom.
  if (layout.assets['line33:pole-272']) moveBranch('line33:pole-272', 0, 180);
  // Place the owner-confirmed TF12 water spur and SW441 just east of the
  // independent TF04 pole corridor so their feeder stays in one column.
  // The confirmed Hopper 1 TF417 primary is downstream of RM417 SW03, and
  // its secondary feeds the MC417 incomer. Keep the transformer and its
  // downstream tree below that source switch.
  if (layout.assets['wh:h1:tf417']) moveBranch('wh:h1:tf417', 0, 3000);
  // Hopper 3 is a separate destination beyond the Hopper 1 ring feeder. Give
  // its switchroom a lower row so its incoming cables do not run through the
  // adjacent Hopper 1 branch symbols.
  for (const asset of assets.filter(asset => asset.id.startsWith('wh:h3:'))) {
    const position = layout.assets[asset.id];
    if (position) layout.assets[asset.id] = [position[0], position[1] + 1500];
  }
  // Give SW411's bus sections separate rows so their physical bar spans and
  // tie connections cannot overlap. Keep the Bus B shift local to its selected
  // supply-tree subtree; later connector routing restores the external spur.
  for (const id of busIds) {
    if (id === 'sw411:bus-b') moveBranch(id, 0, busY + 2500 - layout.assets[id][1]);
    else layout.assets[id] = [layout.assets[id][0], busY];
  }
  // Give each outgoing SW411 feeder its own descending x lane. Compact tree
  // wrapping can stack feeder branches at the same x coordinate, which makes
  // the vertical bus connections and later inter-room ties appear to overlap.
  separateSw411FeederLanes(layout, moveBranch);
  const centerByBus = new Map(busIds.map(id => [id, layout.assets[id][0]]));
  // TF04 is a separate station source tree, but it belongs beside the two
  // SW411 feeds in the overview. Keep it near the station trunk instead of at
  // the far end of supplyTreeLayout's source-by-source cursor.
  const tf04Root = 'boundary:tf04';
  // Keep TF04 beside the SW411 station feeds while preserving the tree
  // layout's reserved horizontal lane for its descendants.
  const tf04X = (centerByBus.get('sw411:bus-b') ?? 5750) + 2500;
  if (roots.includes(tf04Root)) moveBranch(tf04Root, tf04X - layout.assets[tf04Root][0], 0);
  // This is an out-of-scope future branch marker. Keep it beside pole 214 so
  // its stub does not run across the adjacent water-feeder column.
  const future214Id = 'line33:future-214:interface';
  if (layout.assets[future214Id] && layout.assets['line33:pole-214']) {
    const [poleX, poleY] = layout.assets['line33:pole-214'];
    // This is a takeoff marker only. Keep its short lead above the backbone,
    // rather than carrying a long vertical stub through later branches.
    layout.assets[future214Id] = [poleX + 160, poleY - 180];
  }
  // Place the out-of-scope Norfolk takeoff beside pole 227, clear of the
  // neighboring backbone and WT1-CB route.
  const norfolkId = 'line33:norfolk:interface';
  if (layout.assets[norfolkId] && layout.assets['line33:pole-227']) {
    // V1 only needs to show that this branch leaves pole 227. Keep its marker
    // beside the pole instead of drawing the out-of-scope Norfolk route below
    // the 33 kV backbone.
    const [poleX, poleY] = layout.assets['line33:pole-227'];
    // The takeoff leaves the pole westward. Keeping it on that side avoids
    // sharing the eastbound backbone run or the southbound continuation.
    // The interface port sits 240 units east of its anchor, so place the
    // anchor far enough west for the actual port to leave the pole westward.
    layout.assets[norfolkId] = [poleX - 330, poleY + 120];
  }
  // These two confirmed branch markers leave adjacent sides of the same pole.
  // Keep the first marker west of the 33 kV backbone so its lead does not cross
  // the continuous pole conductor or the parallel Bigge takeoff.
  // Keep each retained station feed as a straight top-down trunk above its
  // SW411 incomer. The TF12 spur leaves to the side of that trunk.
  for (const [bus, boundary, prefix, incomer] of [
    ['sw411:bus-a', 'boundary:tf11', 'station:sb01:f4', 'sw411:in-03'],
    ['sw411:bus-b', 'boundary:tf12', 'station:sb02:f1', 'sw411:in-04'],
  ] as const) {
    const x = layout.assets[bus][0];
    for (const id of [boundary, `${prefix}:cb`, `${prefix}:es`, `${prefix}:transformer`, `${prefix}:interface`, `${incomer}:cb`]) {
      if (layout.assets[id]) layout.assets[id] = [x, layout.assets[id][1]];
    }
    const earthId = `${incomer}:es`;
    if (layout.assets[earthId]) layout.assets[earthId] = [x + 170, layout.assets[earthId][1]];
    const stationEarth = `${prefix}:es`;
    if (layout.assets[stationEarth]) layout.assets[stationEarth] = [x + 170, layout.assets[stationEarth][1]];
  }
  // TF12's owner-confirmed OPF1-7 water spur is a side branch from its retained
  // overhead line, before SW411 IN04.
  const tf12Bus = centerByBus.get('sw411:bus-b');
  const tf12TrunkX = tf12Bus;
  // Keep the OPF1-7 pole on the TF12 → SW411 trunk. Moving that junction
  // sideways also dragged the transformer and IN04 continuation with it,
  // creating a several-kilometre looking horizontal link in the overview.
  // Only the water destination is a side branch.
  const waterDestination = 'mine:interface:water-opf1';
  if (layout.assets[waterDestination] && tf12Bus !== undefined) moveBranch(waterDestination, tf12Bus - 1092 - layout.assets[waterDestination][0], 0);
  // Keep WT1-CB on the OPF1-7 riser. Place SW441 west of the separate 33 kV
  // pole spine so its room and TF441 transformer stay outside that corridor.
  if (layout.assets['mine:wt1:cb'] && layout.assets[waterDestination]) layout.assets['mine:wt1:cb'] = [layout.assets[waterDestination][0], 7400];
  if (layout.assets['mine:sw441:in:cb']) moveBranch('mine:sw441:in:cb', -787, 800);
  // Keep the MC441 incomer card below the SW421 bus-earth drop while preserving
  // its top-down relationship to the SW441 feeder.
  if (layout.assets['mine:mc441:in']) moveBranch('mine:mc441:in', -350, 550);
  // Keep the unconnected RM420 spare cubicle clear of the SW426 MC430 bus
  // riser, while keeping it inside the RM420 room group.
  if (layout.assets['rm420:spare:cb']) moveBranch('rm420:spare:cb', 0, 350);
  // The Hopper10 final LV board sits below the SW426 feeders. Keep its
  // incoming riser in a clear east-side column instead of routing it through
  // the TF443 feeder and earth-switch area.
  if (layout.assets['rm420:mc420a:interface']) moveBranch('rm420:mc420a:interface', 490, 0);
  // Keep the MC420 incomer cable on its own lane beside the SW426 MC430 drop.
  // Move the board-side branch only; the TF420A supply remains its parent.
  if (layout.assets['rm420:mc420:in:vcb']) moveBranch('rm420:mc420:in:vcb', 180, 0);
  // The tree walker may orient the single-terminal junction as a child of the
  // water leg. Re-pin the confirmed main-line junction and TF12 → IN04 chain
  // after moving that leg so the main supply remains a short vertical trunk.
  if (tf12TrunkX !== undefined) {
    for (const id of ['boundary:tf12', 'station:sb02:f1:cb', 'station:sb02:f1:es', 'station:sb02:f1:transformer', 'station:sb02:f1:interface', 'owner:tf12:opf1-7', 'sw411:in-04:cb']) {
      if (layout.assets[id]) layout.assets[id] = [tf12TrunkX, layout.assets[id][1]];
    }
  }
  const upward = new Set<string>();
  function placeAbove(id: string, x: number, y: number) {
    upward.add(id); layout.assets[id] = [x, y];
    children.get(id)!.forEach(child => placeAbove(child, x, y - 400));
  }
  for (const [id, bus] of aboveBus) { const [x, y] = layout.assets[bus]; placeAbove(id, x - 800, y - 400); }
  const tie = byId.get('sw411:bus-tie:cb');
  if (tie && busIds.length === 2) {
    const ends = busIds.map(id => adjacent.get(id)!.filter(peer => peer.id !== tie.id && byId.get(peer.id)!.kind === 'breaker').map(peer => layout.assets[peer.id][0]));
    const tieX = (Math.max(...ends[0]) + Math.min(...ends[1])) / 2;
    const tieY = (layout.assets[busIds[0]][1] + layout.assets[busIds[1]][1]) / 2;
    layout.assets[tie.id] = [tieX, tieY];
  }
  const merges = layoutMotorAssemblies(model, layout);
  layoutDriveAssemblies(model, layout);
  // Keep Hopper10's two motor assemblies below the CV006 Pole49 corridor.
  // Shift every asset in both assemblies together so their motor links remain
  // intact while the fixed pole routes clear the maintenance-earth symbols.
  for (const asset of assets.filter(asset => /^rm420:mc420:motor-0[12]:/.test(asset.id))) {
    const position = layout.assets[asset.id];
    if (position) layout.assets[asset.id] = [position[0], position[1] + 1500];
  }
  // Keep the TF439 feeder column west of the nearby Hopper10 pole takeoff so
  // its bus drop remains a clean vertical run inside the SW426 room.
  if (layout.assets['sw426:tf439:cb']) moveBranch('sw426:tf439:cb', -220, 0);
  // Keep the TF430/MC430 branch to the east of the Laboratory frame; this
  // avoids making its feeder lines look as though they enter that room.
  if (layout.assets['sw426:tf430:cb']) moveBranch('sw426:tf430:cb', 4300, 0);
  // Keep the MC406A bus riser just west of the Hopper8 MV room frame. The
  // original route sat only 9 units inside that unrelated frame; a small local
  // shift preserves the branch arrangement while clearing the frame edge.
  if (layout.assets['rm406:mc406a:cb']) moveBranch('rm406:mc406a:cb', -40, 0);
  // SW451 spare outputs are unconfirmed. Keep their modeled continuation
  // endpoints just below their breaker outputs so each is visibly a short
  // isolated stub, never a loop back to the bus-side lead.
  // Keep the CV006 pole line and its confirmed RM406 / Drop Tower branches
  // below the broad SW411 outline. The SW411 feeder reaches pole17 once, then
  // the rest of the OHL descends outside the switchroom frame.
  if (layout.assets['cv006:pole:17']) moveBranch('cv006:pole:17', 0, 1200);
  // Keep the Drop Tower takeoff west of the SW411 feeder column. Its prior
  // east-side position forced the branch across unrelated SW411 bus links.
  if (layout.assets['cv006:interface:drop-tower-workshop']) moveBranch('cv006:interface:drop-tower-workshop', -2200, 0);
  // TF418 is downstream of the RM418 feeder. Keep its primary and downstream
  // branch below that source so the drawing reads top-down.
  if (layout.assets['wh:h7:tf418']) moveBranch('wh:h7:tf418', 0, 1600);
  // Keep Hopper10's MV switchboard below the Desands LV bus drops. The
  // independent boards otherwise occupy the same vertical band and their
  // feeder routes have to weave between one another.
  // Keep the Process Water spur clear of the overhead line's Pole 214→227
  // continuation. This is a diagram placement only; the modeled connection
  // still leaves the owner-confirmed OPF1-7 takeoff.
  const biggeSp1Asset = layout.assets['line33:bigge-sp1:interface'];
  if (biggeSp1Asset) layout.assets['line33:bigge-sp1:interface'] = [biggeSp1Asset[0] - 420, biggeSp1Asset[1]];
  // Keep the SW431 incomer on the outside edge of its room. That leaves a
  // clear lateral corridor for the confirmed SW431–SW435 ring connection.
  // The compact feeder bank above already places SW431 and SW435 adjacent.
  // Keep their incoming breakers directly above their own bus instead of
  // shifting either room sideways into a long SW411 riser.
  // Keep SW421 in its own east-side tree column, clear of adjacent feeders
  // and the TF04 overhead corridor.
  if (layout.assets['sw451:interface:sw411']) moveBranch('sw451:interface:sw411', 0, 560);
  if (layout.assets['sw421:interface:sw411']) moveBranch('sw421:interface:sw411', 1200, 0);
  const hiddenIds = new Set(assets.filter(asset => isMotorJunction(asset) || asset.kind === 'interface' && /\binterface\s*$/i.test(asset.label)).map(asset => asset.id));
  // These two multi-line labels are non-operating handoff markers; the actual
  // RM419 SW01 is in the Hopper9 tree, so keep the line continuous without
  // displaying duplicate “interface” placeholders at the boundary.
  hiddenIds.add('rm410:interface:rm419');
  hiddenIds.add('wh:h9:interface:rm410');
  hiddenIds.add('sw431:interface:sw435');
  hiddenIds.add('sw435:interface:sw431');
  for (const [id, owner] of earthParents) {
    const [x, y] = layout.assets[owner];
    const ownerLink = adjacent.get(owner)!.find(peer => peer.id === id)!;
    const incoming = adjacent.get(owner)!.find(peer => peer.link === parentLink.get(owner))?.terminal;
    const siblings = [...earthParents].filter(([, main]) => main === owner).map(([earth]) => earth);
    const index = siblings.indexOf(id);
    const incomingSide = byId.get(owner)!.kind !== 'bus' && !hiddenIds.has(owner) && ownerLink.terminal === incoming;
    if (byId.get(owner)!.kind === 'bus') {
      // Put the bus earth outside the feeder drops with a dedicated branch.
      const connectedTaps = adjacent.get(owner)!.filter(peer => peer.id !== id).map(peer => layout.assets[peer.id]?.[0]).filter((value): value is number => value !== undefined);
      const firstTap = Math.min(x, ...connectedTaps);
      const busEarthDrop = id === 'sw426:bus:es' ? 560 : 360;
      const busEarthLeftOffset = id === 'sw426:bus:es' ? 700 : 420;
      const earthX = firstTap - busEarthLeftOffset - index * 220;
      layout.assets[id] = [earthX, y + busEarthDrop];
    } else {
      const farRightEarths = new Set(['sw435:tf435:hv-es']);
      const extendedRightEarths = new Set(['sw435:tf433:hv-es', 'sw435:tf453:hv-es']);
      const westEarths = new Set(['sw411:tier-13:es', 'sw431:sw435:es', 'wh:h7:rm418:cb03:earth', 'rm420:tf420b:es', 'mine:sw441:in:es', 'sw426:tf440:es', 'sw426:tf439:es', 'sw421:tf421:hv-es', 'rm413a:es-q8:upper']);
      const earthSide = westEarths.has(id) ? -1 : 1;
      const customEarthOffsets = new Map<string, number>([
        ['sw426:tf440:es', 500], ['sw426:tf439:es', 310], ['sw421:tf421:hv-es', 150],
        ['sw411:tier-13:es', 700], ['sw421:tf421:hv-es', 700], ['rm420:tf420b:es', 700], ['sw454:tf456:hv-es', 700],
        ['rm714:tf714:es', 900], ['rm413a:es-q8:upper', 900], ['mine:sw441:in:es', 700],
        ['sw431:tf442:hv-es', 500], ['wh:h3:mc416:in-earth', 350], ['wh:h8:mc416:in-earth', 350],
      ]);
      const earthOffset = farRightEarths.has(id) || extendedRightEarths.has(id) ? 450 : customEarthOffsets.get(id) ?? 170;
      const baseY = y + ((upward.has(owner) ? !incomingSide : incomingSide) ? -1 : 1) * (200 + index * 200);
      const yAdjustment = id === 'sw435:tf436:hv-es' ? 350
        : id === 'sw431:tf442:hv-es' ? 200
        : id === 'sw426:tf439:es' ? 500
          : id === 'wh:h3:mc416:in-earth' ? -30
            : id === 'wh:h8:mc416:in-earth' ? -60
        : id === 'wh:h7:rm418:cb03:earth' ? 500
        : id === 'sw426:ss714:es' ? -40
          : id === 'rm420:es01' ? 180
            : 0;
      layout.assets[id] = [x + earthSide * earthOffset, baseY + yAdjustment];
      if (id === 'wh:h8:mc416:m1:earth') {
        // Keep Hopper8 M1's maintenance earth to the right of the contactor
        // cards and just left of the second motor's branch.
        const fc = layout.assets['wh:h8:mc416:m1:fc'];
        layout.assets[id] = fc ? [fc[0] + 520, fc[1] + 100] : [x + 620, y + 350];
      }
    }
    visited.add(id); treeEdgeIds.add(adjacent.get(id)![0].link);
  }
  // Keep the RM420 TF420A feeder in electrical order. The tree placer put its
  // primary interface below the transformer and the switch below the CB,
  // forcing the primary lead to double back through the switchgear. This
  // local placement follows the confirmed feeder sequence down the page.
  const tf420aX = layout.assets['rm420:tf420a:cb']?.[0];
  const rm420BusY = layout.assets['rm420:bus']?.[1];
  if (tf420aX !== undefined && rm420BusY !== undefined) {
    layout.assets['rm420:tf420a:cb'] = [tf420aX, rm420BusY + 120];
    layout.assets['rm420:tf420a:sw'] = [tf420aX, rm420BusY + 460];
    layout.assets['rm420:tf420a:primary-connection'] = [tf420aX, rm420BusY + 960];
    // Put the TF420A earth branch on the opposite side of the down-going
    // transformer cable. Both leave the switch's cable-side terminal; sending
    // the earth branch west made the router duplicate the cable's first run.
    layout.assets['rm420:tf420a:es'] = [tf420aX + 350, rm420BusY + 300];
    // Keep the incoming earth symbol clear of the SW426→MC420 cable riser.
    // The earth is still attached to the same cable-side terminal; only its
    // presentation position moves into the open east-side clearance.
    layout.assets['rm420:mc420:in:es'] = [layout.assets['rm420:mc420:in:vcb'][0] + 310, layout.assets['rm420:mc420:in:vcb'][1] + 200];
  }
  const mainBottom = Math.max(...Object.values(layout.assets).map(p => p[1])) + 600;
  const references = assets.filter(asset => !visited.has(asset.id));
  references.forEach((asset, i) => { layout.assets[asset.id] = [310 + i % 8 * 680, mainBottom + Math.floor(i / 8) * 400]; });
  for (const asset of assets) {
    const [x, y] = layout.assets[asset.id];
    if (asset.kind === 'bus') layout.rotations![asset.id] = 90;
    if (earthParents.has(asset.id)) {
      const input = adjacent.get(asset.id)![0].terminal;
      asset.terminals.forEach(t => { layout.terminals[t] = t === input ? [x - 30, y - 30] : [x, y + 39]; }); continue;
    }
    if (hiddenIds.has(asset.id)) { asset.terminals.forEach(t => { layout.terminals[t] = isMotor(asset) ? [x, y - 30] : [x, y]; }); continue; }
    if (inlineIds.has(asset.id)) { asset.terminals.forEach(t => { layout.terminals[t] = [x, y]; }); continue; }
    if (isMotor(asset)) { asset.terminals.forEach(t => { layout.terminals[t] = [x, y - 30]; }); continue; }
    if (isDrive(asset)) {
      asset.terminals.forEach(t => { layout.terminals[t] = /:ac-(?:star|d)$/.test(t) ? [x - 35, y - 100] : /:ac-(?:delta|y)$/.test(t) ? [x + 35, y - 100] : t.endsWith(':dc') ? [x + 70, y] : [x, y + 100]; }); continue;
    }
    const incoming = adjacent.get(asset.id)!.find(peer => peer.link === parentLink.get(asset.id))?.terminal;
    const selector = threePositionContacts(asset);
    if (selector) {
      const upper = selector.main.includes(incoming ?? '') ? incoming! : selector.main[0];
      const tapY = selector.common === upper ? -40 : 40;
      asset.terminals.forEach(terminal => { layout.terminals[terminal] = terminal === selector.ground ? [x + 50, y + tapY + 79] : [x, y + (terminal === upper ? -150 : 170)]; });
      continue;
    }
    const lower = asset.terminals.filter(t => t !== incoming);
    for (const terminal of asset.terminals) {
      const direction = upward.has(asset.id) ? -1 : 1;
      layout.terminals[terminal] = asset.kind === 'bus' ? [x, y] : terminal === incoming ? [x, y - 120 * direction] : [x + (lower.indexOf(terminal) - (lower.length - 1) / 2) * 70, y + 120 * direction];
    }
  }
  // Align the FC common-side terminal with the shared motor junction. The
  // FC device remains in place; its short orthogonal lead approaches from the
  // side, leaving the junction's east lane free for the maintenance earth.
  const h8FcCommon = layout.terminals['wh:h8:mc416:m1:common:port'];
  const h8FcOutput = layout.terminals['wh:h8:mc416:m1:fc:b'];
  if (h8FcCommon && h8FcOutput) layout.terminals['wh:h8:mc416:m1:fc:b'] = [h8FcCommon[0], h8FcOutput[1]];
  const hpgrIncomingEarthId = 'hpgr:sw002:a01:q8';
  const hpgrIncomingEarthOwner = earthParents.get(hpgrIncomingEarthId);
  if (hpgrIncomingEarthOwner && layout.assets[hpgrIncomingEarthId] && layout.assets[hpgrIncomingEarthOwner]) {
    // Place A01 west of the shared cable terminal. Its short branch leaves
    // opposite the SW435 earth lead and stays clear of the TF001 riser.
    const [oldX, y] = layout.assets[hpgrIncomingEarthId];
    const x = layout.assets[hpgrIncomingEarthOwner][0] - 650;
    layout.assets[hpgrIncomingEarthId] = [x, y];
    for (const terminal of byId.get(hpgrIncomingEarthId)!.terminals) layout.terminals[terminal][0] += x - oldX;
  }
  // Give the OPF1-7 pole and WT1-CB one clean top-down riser, west of the TF04
  // pole spine; keep the connected SW441 room on its own west-side column.
  if (layout.assets[waterDestination]) {
    layout.assets[waterDestination] = [layout.assets[waterDestination][0] + 171, layout.assets[waterDestination][1]];
    const marker = byId.get(waterDestination)!;
    marker.terminals.forEach(terminal => { layout.terminals[terminal][0] += 171; });
    const wt1Breaker = byId.get('mine:wt1:cb');
    if (wt1Breaker && layout.assets[wt1Breaker.id]) {
      layout.assets[wt1Breaker.id] = [layout.assets[waterDestination][0], layout.assets[wt1Breaker.id][1]];
      wt1Breaker.terminals.forEach(terminal => { layout.terminals[terminal][0] = layout.terminals[marker.terminals[0]][0]; });
    }
  }
  const busTapX = new Map<string, Map<string, number>>();
  for (const bus of assets.filter(asset => asset.kind === 'bus')) {
    const taps = adjacent.get(bus.id)!.map(peer => {
      const peerTerminal = adjacent.get(peer.id)!.find(item => item.link === peer.link)?.terminal;
      const [peerX] = peerTerminal && layout.terminals[peerTerminal] ? layout.terminals[peerTerminal] : layout.assets[peer.id];
      const tapX = bus.id === 'sw435:bus' && peer.link === 'sw435:tf436:bus-link' ? peerX - 500 : peerX;
      const positions = busTapX.get(peer.link) ?? new Map<string, number>();
      positions.set(bus.id, tapX); busTapX.set(peer.link, positions);
      return tapX;
    });
    if (!taps.length) continue;
    const min = Math.min(...taps); const max = Math.max(...taps);
    const center = (min + max) / 2;
    layout.assets[bus.id] = [center, layout.assets[bus.id][1]];
    layout.terminals[bus.terminals[0]] = [center, layout.assets[bus.id][1]];
    const overhang = 160;
    layout.busSpans![bus.id] = Math.max(180, max - min + overhang);
  }
  // Inline poles and splitter junctions have a single logical terminal, but
  // several physical branches. Give each wire a distinct point on the small
  // junction mark so parallel drops do not lie on top of one another.
  const junctionTap = new Map<string, Map<string, Point>>();
  for (const id of inlineIds) {
    const [x, y] = layout.assets[id]; const peers = adjacent.get(id)!;
    const parentId = parentLink.get(id);
    const ordered = [
      ...peers.filter(peer => peer.link === parentId),
      ...peers.filter(peer => parent.get(peer.id) === id).sort((a, b) => layout.assets[a.id][0] - layout.assets[b.id][0]),
      ...peers.filter(peer => peer.link !== parentId && parent.get(peer.id) !== id).sort((a, b) => a.link.localeCompare(b.link)),
    ];
    const taps = new Map<string, Point>();
    if (ordered.length === 2) {
      taps.set(ordered[0].link, [x - 12, y]); taps.set(ordered[1].link, [x + 12, y]);
    } else if (ordered.length === 3 && parentId) {
      // Give a three-way supply junction cardinal terminal offsets. The former
      // 45-degree taps made an upstream leg, a through leg and a side takeoff
      // converge on nearly the same orthogonal lane, creating short shared runs
      // and crossings at pole 4, pole 17, pole 49 and the TF12 water tee.
      const parentPeer = ordered.find(peer => peer.link === parentId)!;
      const childPeers = ordered.filter(peer => peer.link !== parentId);
      const parentPosition = layout.assets[parentPeer.id];
      const dx = parentPosition[0] - x; const dy = parentPosition[1] - y;
      const parentDirection: Point = Math.abs(dx) > Math.abs(dy)
        ? [Math.sign(dx) || -1, 0]
        : [0, Math.sign(dy) || -1];
      const forwardDirection: Point = [-parentDirection[0], -parentDirection[1]];
      taps.set(parentPeer.link, [x + parentDirection[0] * 18, y + parentDirection[1] * 18]);

      const through = childPeers.find(peer => Math.abs(layout.assets[peer.id][0] - x) <= 120)
        ?? childPeers.reduce((best, peer) => {
          const position = layout.assets[peer.id];
          const bestPosition = layout.assets[best.id];
          const projection = (position[0] - x) * forwardDirection[0] + (position[1] - y) * forwardDirection[1];
          const bestProjection = (bestPosition[0] - x) * forwardDirection[0] + (bestPosition[1] - y) * forwardDirection[1];
          return projection > bestProjection ? peer : best;
        });
      taps.set(through.link, [x + forwardDirection[0] * 18, y + forwardDirection[1] * 18]);

      const side = childPeers.find(peer => peer !== through)!;
      const sidePosition = layout.assets[side.id];
      const sideDirection: Point = parentDirection[1] !== 0
        ? [sidePosition[0] < x ? -1 : 1, 0]
        : [0, sidePosition[1] < y ? -1 : 1];
      taps.set(side.link, [x + sideDirection[0] * 18, y + sideDirection[1] * 18]);
    } else {
      ordered.forEach((peer, index) => {
        const angle = parentId && peer.link === parentId ? -Math.PI / 2
          : peers.some(item => item.link === parentId) && parent.get(peer.id) === id
            ? Math.PI / 2 + (index - 1) * Math.min(Math.PI / 4, Math.PI / Math.max(4, ordered.length))
            : 2 * Math.PI * index / ordered.length;
        taps.set(peer.link, [x + Math.cos(angle) * 12, y + Math.sin(angle) * 12]);
      });
    }
    for (const peer of peers) { const positions = junctionTap.get(peer.link) ?? new Map<string, Point>(); positions.set(id, taps.get(peer.link)!); junctionTap.set(peer.link, positions); }
  }
  const connectionPoints = (link: NetworkModel['connections'][number]) => {
    const fromOwner = owners.get(link.from)!; const toOwner = owners.get(link.to)!;
    const from = byId.get(fromOwner)!.kind === 'bus' ? [busTapX.get(link.id)?.get(fromOwner) ?? layout.assets[fromOwner][0], layout.assets[fromOwner][1]] as Point : junctionTap.get(link.id)?.get(fromOwner) ?? layout.terminals[link.from];
    const to = byId.get(toOwner)!.kind === 'bus' ? [busTapX.get(link.id)?.get(toOwner) ?? layout.assets[toOwner][0], layout.assets[toOwner][1]] as Point : junctionTap.get(link.id)?.get(toOwner) ?? layout.terminals[link.to];
    return { from, to };
  };
  if (tie && busIds.length === 2) for (const [index, bus] of busIds.entries()) {
    const link = model.connections.find(link => tie.terminals.includes(link.from) && owners.get(link.to) === bus || tie.terminals.includes(link.to) && owners.get(link.from) === bus)!;
    layout.terminals[tie.terminals.includes(link.from) ? link.from : link.to] = [layout.assets[tie.id][0], layout.assets[tie.id][1] + (index === 0 ? -120 : 120)];
  }
  const labels = new Map<string, AssetLabel>();
  for (const asset of assets) {
    const lines = labelLines(compactEquipmentLabel(asset, currentAssetLabel(model, asset))); const [x, y] = layout.assets[asset.id]; const state = !!(asset.positions.length || getRemovableMechanism(asset));
    const earthOwner = earthParents.get(asset.id);
    // Keep label geometry compact so room outlines and routed connectors retain
    // their proven spacing; the view reveals labels only when they can be read.
    const height = lines.length * 35 + 12 + (state ? 32 : 0);
    const width = Math.max(state ? 185 : 0, ...lines.map(line => line.length * 15 + 20));
    const labelX = inlineIds.has(asset.id) ? x - width - 45 : x + (earthOwner ? 55 : 110);
    const labelY = y + (asset.kind === 'bus' ? -height - 25 : earthOwner ? -25 : -35);
    labels.set(asset.id, {
      x: asset.id === 'mine:interface:water-opf1' ? x + 110
        : ['rm420:mc420:in:es', 'sw426:tf440:es'].includes(asset.id) ? x - width - 55
        : asset.id === 'rm420:interface:pole286' ? x - width - 420
        : asset.id === 'line33:hopper-10:interface' ? x - width - 120 : labelX,
      y: asset.id === 'line33:hopper-10:interface' ? y - height - 55
        : asset.id === 'mine:interface:water-opf1' ? y - height - 43
        : asset.id === 'rm420:interface:pole286' ? y - height - 125
          : asset.id === 'rm420:tf420a:primary-connection' ? labelY + 90
          : labelY,
      width, height, lines,
    });
    if (asset.id === tie?.id) labels.set(asset.id, { x: x - width / 2, y: y - height - 65, width, height, lines });
  }
  const hpgrEarthLabel = labels.get('hpgr:sw002:a01:q8');
  const hpgrEarthPosition = layout.assets['hpgr:sw002:a01:q8'];
  if (hpgrEarthLabel && hpgrEarthPosition) labels.set('hpgr:sw002:a01:q8', {
    ...hpgrEarthLabel,
    x: hpgrEarthPosition[0] - hpgrEarthLabel.width - 60,
  });
  // WT1-CB is an overhead-line recloser upstream of the SW441 switchroom. Keep
  // it outside that room's spacing cluster so the supply tree stays top-down.
  const treeEdges = [...parent].flatMap(([childAssetId, parentAssetId]) => {
    const id = parentLink.get(childAssetId);
    return id ? [{ id, parentAssetId, childAssetId }] : [];
  });
  const earthBranches = [...earthParents].map(([earthSwitchAssetId, ownerAssetId]) => ({
    id: `earth-branch:${earthSwitchAssetId}`,
    ownerAssetId,
    earthSwitchAssetId,
    direction: 'owner-to-earth-switch' as const,
  }));
  const clusterOwnership = roomClusterOwnership(model, treeEdges, earthBranches);
  const outsideFrameAssets = new Set(['mine:wt1:cb', 'wh:h3:hv416', 'wh:h3:tf416a']);
  const initialRoomFrames = switchroomFrames(model, layout, labels);
  const placementOwnerByAssetId = wholeNetworkPlacementOwnerByAssetId(treeEdges, clusterOwnership.ownerByAssetId);
  let roomPlacement = layoutStrategy === 'vertical-candidate'
    ? planVerticalWholeNetworkCandidate(initialRoomFrames, treeEdges, placementOwnerByAssetId)
    : planWholeNetworkRooms(initialRoomFrames, treeEdges, placementOwnerByAssetId);
  applyWholeNetworkRoomPlacement(
    initialRoomFrames,
    roomPlacement,
    layout,
    labels,
    placementOwnerByAssetId,
    new Map(assets.map(asset => [asset.id, asset.terminals])),
    junctionTap,
    busTapX,
    outsideFrameAssets,
  );
  // Capture the already-planned positions. The next frame pass may add small
  // clearance shifts; only those deltas should be applied to the tap caches.
  const tapAnchors = new Map([...new Set([...inlineIds, ...busIds])].map(id => [id, [...layout.assets[id]] as Point]));
  const topDownRoomOrder = orderWholeNetworkRoomClustersTopDown(initialRoomFrames, treeEdges, placementOwnerByAssetId);
  const panels = separateSwitchroomFrames(
    model,
    initialRoomFrames,
    layout,
    labels,
    outsideFrameAssets,
    placementOwnerByAssetId,
    topDownRoomOrder,
  );
  // Extend diagram-only room ownership to the complete selected tree branches.
  // The original drawing memberships cover switchgear but leave many ordinary
  // feeder assets ungrouped, making the map-fit overview draw their full wiring.
  // Ownership follows only the selected presentation tree and explicit earth
  // branches; it does not change the model or the underlying connection graph.
  const membersByRoom = new Map<string, string[]>();
  for (const [assetId, roomId] of placementOwnerByAssetId) {
    membersByRoom.set(roomId, [...(membersByRoom.get(roomId) ?? []), assetId]);
  }
  for (const panel of panels) panel.memberAssetIds = membersByRoom.get(panel.id) ?? panel.assetIds;
  // Room separation translates whole connected branches. Keep the unique
  // junction and bus tap coordinates attached to those branches; stale tap
  // coordinates make wires leave a pole or bus and then loop back across the
  // drawing to find the moved room.
  for (const [id, before] of tapAnchors) {
    const after = layout.assets[id];
    const dx = after[0] - before[0]; const dy = after[1] - before[1];
    if (!dx && !dy) continue;
    for (const taps of junctionTap.values()) {
      const point = taps.get(id);
      if (point) taps.set(id, [point[0] + dx, point[1] + dy]);
    }
    if (dx) for (const taps of busTapX.values()) {
      const x = taps.get(id);
      if (x !== undefined) taps.set(id, x + dx);
    }
  }
  // Switchroom separation can translate a whole motor feeder tree after the
  // assembly helper has cached its RC/FC merge point. Re-anchor that point to
  // the moved common-conductor/motor asset before routes are generated.
  for (const [id, merge] of merges) {
    const position = layout.assets[id];
    if (position) merges.set(id, { ...merge, x: position[0], y: position[1] });
  }
  // RM714 is supplied directly from the SW426 SS714 feeder. Keep the room
  // beside that feeder's lower edge instead of stacking it far below the
  // SW426 group; this makes the confirmed connection a short, readable drop.
  function translateBranch(root: string, delta: Point) {
    const branch = new Set<string>();
    const earthChildren = new Map<string, string[]>();
    for (const [earth, parent] of earthParents) earthChildren.set(parent, [...(earthChildren.get(parent) ?? []), earth]);
    function collect(id: string) {
      if (branch.has(id)) return;
      branch.add(id);
      children.get(id)?.forEach(collect);
      earthChildren.get(id)?.forEach(collect);
    }
    collect(root);
    for (const id of branch) {
      const position = layout.assets[id];
      if (position) layout.assets[id] = [position[0] + delta[0], position[1] + delta[1]];
      const asset = byId.get(id);
      for (const terminal of asset?.terminals ?? []) {
        const point = layout.terminals[terminal];
        if (point) layout.terminals[terminal] = [point[0] + delta[0], point[1] + delta[1]];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + delta[0], y: label.y + delta[1] });
      for (const taps of junctionTap.values()) {
        const point = taps.get(id);
        if (point) taps.set(id, [point[0] + delta[0], point[1] + delta[1]]);
      }
    }
    // Motor assembly routing uses these cached common-point coordinates after
    // placement. Keep them in step with a moved room tree; otherwise RC/FC
    // conductors still converge at the old junction and double back through
    // their fuse symbols.
    for (const [id, merge] of merges) {
      if (branch.has(id) || merge.controls.every(control => branch.has(control))) {
        merges.set(id, { ...merge, x: merge.x + delta[0], y: merge.y + delta[1] });
      }
    }
    if (delta[0]) for (const link of model.connections) {
      const fromOwner = owners.get(link.from)!;
      const toOwner = owners.get(link.to)!;
      const shiftedBus = byId.get(fromOwner)?.kind === 'bus' && branch.has(fromOwner) ? fromOwner
        : byId.get(toOwner)?.kind === 'bus' && branch.has(toOwner) ? toOwner
          : undefined;
      if (shiftedBus) {
        const tap = busTapX.get(link.id)?.get(shiftedBus);
        if (tap !== undefined) busTapX.get(link.id)!.set(shiftedBus, tap + delta[0]);
      }
    }
    for (const panel of panels.filter(candidate => candidate.assetIds.some(id => branch.has(id)))) {
      panel.x += delta[0];
      panel.y += delta[1];
    }
    return branch;
  }
  // Stagger the independent SW451 row below SW454. Move RM410's complete
  // feeder tree down with it so the two switchroom frames stay separated.
  translateBranch('sw451:interface:sw411', [0, 350]);
  translateBranch('rm410:sw01', [0, layoutStrategy === 'sw505-corridor-candidate' ? 350 : 450]);
  // Place the RM419 interface below RM410 and just to the east of its SW04
  // outlet. Keeping both endpoints west of the long SW454→SW505 cable spine
  // lets the RM410→RM419 route stay local instead of crossing that spine.
  translateBranch('rm410:interface:rm419', [100, 1900]);
  // TF04 already has a dedicated source column beside the SW411 feeds from
  // the initial tree pass above. Pushing it beyond SW411's full room frame
  // creates an unnecessarily long horizontal corridor at overview scale.
  // This adjacent feed crosses one clean corridor between the two rooms.
  translateBranch('sw505:in:cb', layoutStrategy === 'sw505-corridor-candidate' ? [10500, 0] : [0, -250]);
  // Keep the SW429 Y-phase LV cable clear of the neighboring SW439 D bus-link
  // pocket. Move only the Y incomer subtree; the transformer and D phase stay
  // in their existing positions.
  translateBranch('sw426:sw429:y:in:cb', [-500, 0]);
  // RM714 is supplied directly from the SW426 SS714 feeder. Keep the room
  // beside that feeder's lower edge instead of stacking it far below the
  // SW426 group; this makes the confirmed connection a short, readable drop.
  // Keep the confirmed SW431-P-02 ring bays beside each other on the facing
  // sides of their rooms. Their endpoints are a cross-link in the network, so
  // generic tree traversal can otherwise place them at unrelated depths.
  const sw431Room = panels.find(panel => panel.title === 'SW431');
  const sw435Room = panels.find(panel => panel.title === 'SW435');
  const sw431BusPosition = layout.assets['sw431:bus'];
  const sw435BusPosition = layout.assets['sw435:bus'];
  if (sw431Room && sw435Room && sw431BusPosition && sw435BusPosition) {
    // Keep both crushing boards below their respective SW411 feeder outputs.
    // SW431's source tier is already lower than SW435's, so align the room row
    // one step below SW435's original position rather than routing SW431's
    // incoming line upward through its own breaker.
    translateBranch('sw435:interface:sw411', [0, layoutStrategy === 'sw505-corridor-candidate' ? 1100 : 1000]);
    const sameRowY = sw435Room.y;
    // The two rooms share a confirmed tie, so place them beside one another
    // with a narrow corridor between their frames. Moving the whole SW431 tree
    // keeps its SW411 supply route downward and shortens the room-to-room ring.
    const sideBySideX = sw435Room.x + sw435Room.width + 320;
    translateBranch('sw431:interface:sw411', [sideBySideX - sw431Room.x, sameRowY - sw431Room.y]);
    const movedSw431Room = panels.find(panel => panel.title === 'SW431')!;
    const movedSw431BusPosition = layout.assets['sw431:bus']!;
    // Drop the tie breaker bay below SW431's bus-earth card, then keep the
    // hidden cable ports only 300 units below the breaker outputs. The former
    // deep port lane drew a large U-shaped loop through both rooms.
    const movedSw435BusPosition = layout.assets['sw435:bus']!;
    const bayY = Math.max(movedSw431BusPosition[1], movedSw435BusPosition[1]) + 700;
    const portY = bayY + 300;
    const placements: [string, number, number][] = [
      ['sw431:sw435:cb', movedSw431Room.x + 80, bayY],
      ['sw431:sw435:es', movedSw431Room.x + 260, bayY + 150],
      ['sw431:interface:sw435', movedSw431Room.x + 80, portY],
      ['sw435:sw431:cb', sw435Room.x + sw435Room.width - 80, bayY],
      ['sw435:sw431:es', sw435Room.x + sw435Room.width - 210, bayY + 550],
      ['sw435:interface:sw431', sw435Room.x + sw435Room.width - 130, portY],
    ];
    for (const [id, x, y] of placements) {
      const asset = byId.get(id);
      const before = layout.assets[id];
      if (!asset || !before) continue;
      const dx = x - before[0]; const dy = y - before[1];
      layout.assets[id] = [x, y];
      for (const terminal of asset.terminals) {
        const point = layout.terminals[terminal];
        if (point) layout.terminals[terminal] = [point[0] + dx, point[1] + dy];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
      for (const taps of junctionTap.values()) {
        const point = taps.get(id);
        if (point) taps.set(id, [point[0] + dx, point[1] + dy]);
      }
    }
    const sw431BusTap = busTapX.get('sw431:sw435:bus-link');
    if (sw431BusTap) sw431BusTap.set('sw431:bus', layout.assets['sw431:sw435:cb'][0] - 100);
    const sw435BusTap = busTapX.get('sw435:sw431:bus-link');
    if (sw435BusTap) sw435BusTap.set('sw435:bus', layout.assets['sw435:sw431:cb'][0] + 100);
    const sw435CbLabel = labels.get('sw435:sw431:cb');
    if (sw435CbLabel) labels.set('sw435:sw431:cb', { ...sw435CbLabel, x: layout.assets['sw435:sw431:cb'][0] - sw435CbLabel.width - 55 });
    for (const [breaker, port, cable] of [
      ['sw431:sw435:cb', 'sw431:interface:sw435', 'sw431:cross-link:cable-SW431-P-02'],
      ['sw435:sw431:cb', 'sw435:interface:sw431', 'sw435:cross-link:cable-SW431-P-02'],
    ]) {
      const link = model.connections.find(item => item.id === cable);
      const breakerTerminal = link && (owners.get(link.from) === breaker ? link.from : link.to);
      const breakerPoint = breakerTerminal && layout.terminals[breakerTerminal];
      if (!link || !breakerPoint) continue;
      const point: Point = [breakerPoint[0], portY];
      junctionTap.get(cable)?.set(port, point);
      junctionTap.get('whole:join:crushing-tie')?.set(port, point);
    }
  }
  // Keep the RM721 → RM412 incoming device and its downstream room together.
  // Moving only the RM412 bus leaves the incoming S100 at its old coordinate,
  // so the confirmed inter-room cable becomes a map-spanning detour.
  const rm721Frame = panels.find(panel => panel.title === 'RM721');
  const rm412Frame = panels.find(panel => panel.title === 'RM412');
  if (rm721Frame && rm412Frame && layout.assets['rm412:s100']) {
    const targetY = rm721Frame.y + rm721Frame.height + 320;
    translateBranch('rm412:s100', [0, targetY - rm412Frame.y]);
  }
  // RM413A's incoming double-boot lands on its bar. Move the bar and the full
  // downstream branch together; moving Q1 alone leaves the cable endpoint and
  // switchroom frame behind.
  const rm413Frame = panels.find(panel => panel.title === 'RM413');
  const rm413aFrame = panels.find(panel => panel.title === 'RM413A');
  if (rm413Frame && rm413aFrame && layout.assets['rm413a:bus']) {
    // RM417 and RM413A are sibling takeoffs from the RM413 IN02 double boot.
    // Keep RM413A just east and below the RM413 IN02 takeoff. The prior
    // 1300-unit east / 1800-unit south move made the confirmed double-boot a
    // long map-spanning link; room-frame clearance is handled after placement.
    const targetY = rm413Frame.y + rm413Frame.height;
    // Place RM413A west of the nearby Hopper7 feeder corridor. Its prior
    // frame enclosed Hopper7 CB03-to-TF418A equipment and routes.
    translateBranch('rm413a:bus', [-2_000, targetY + 100 - rm413aFrame.y]);
    // Pull the RM413A Q1 branch toward its incoming double-boot to keep the
    // busbar span compact. The lower row clears RM413's transformer cable.
    const q1Shift = -450;
    translateBranch('rm413a:q1', [q1Shift, 0]);
    const q1BusTap = busTapX.get('rm413a:q1-bar')?.get('rm413a:bus');
    if (q1BusTap !== undefined) busTapX.get('rm413a:q1-bar')!.set('rm413a:bus', q1BusTap + q1Shift);
    const rm413aBus = byId.get('rm413a:bus');
    if (rm413aBus) {
      const tapXs = [...busTapX.values()].flatMap(taps => taps.has('rm413a:bus') ? [taps.get('rm413a:bus')!] : []);
      const minTap = Math.min(...tapXs); const maxTap = Math.max(...tapXs);
      const center = (minTap + maxTap) / 2;
      layout.assets['rm413a:bus'] = [center, layout.assets['rm413a:bus'][1]];
      layout.terminals[rm413aBus.terminals[0]] = [center, layout.assets['rm413a:bus'][1]];
      layout.busSpans!['rm413a:bus'] = Math.max(180, maxTap - minTap + 160);
    }
    // Leave a 29-unit gap from the neighbouring RM417 frame after the x shift.
    translateBranch('rm413a:es-q8:upper', [-78, 0]);
  }
  // RM417 and RM413A are sibling takeoffs from RM413 IN02. Move the complete
  // RM417 branch west so the two downstream room outlines occupy distinct
  // columns while remaining close to their shared double-boot source.
  translateBranch('wh:h1:interface:rm413', [-500, 0]);
  // RM721's RM713 ring bay and the RM713 IN01 room are separate control cards.
  // Drop the downstream room far enough below RM721 that its incomer card and
  // approach lead do not sit on top of the upstream ring earth card.
  translateBranch('rm713:in01', [0, 500]);
  // Place the RM714 room just below the SW426 frame. The extra clearance keeps
  // its incomer earth-switch card out of SW426's feeder and bus-earth symbols.
  translateBranch('rm714:in01', [0, -200]);
  // Keep the owner-confirmed TF12 water spur top-down and outside SW411 Bus B's
  // span. Place the spur's source and receiving switchroom east of both the
  // SW411 frame and Bus B, so the downstream feeder does not cross either.
  const tf12WaterJunction = layout.terminals['owner:tf12:opf1-7:port'];
  const waterSourcePosition = layout.assets[waterDestination];
  if (tf12WaterJunction && waterSourcePosition) {
    const sw411Frame = panels.find(panel => panel.title === 'SW411');
    const sw411FrameRight = sw411Frame ? sw411Frame.x + sw411Frame.width : tf12WaterJunction[0] + 1000;
    // OPF1-7 branches before the SW411 incomer. Keep the water takeoff above
    // the SW411 outline, then run it down the outside edge of the room. This
    // prevents the confirmed WT1/SW441 supply from cutting across Bus B.
    const sourceTarget: Point = [sw411FrameRight + 520, (sw411Frame?.y ?? tf12WaterJunction[1]) - 80];
    translateBranch(waterDestination, [sourceTarget[0] - waterSourcePosition[0], sourceTarget[1] - waterSourcePosition[1]]);
    const wt1Position = layout.assets['mine:wt1:cb'];
    const wt1Y = sw411Frame ? sw411Frame.y + sw411Frame.height + 320 : sourceTarget[1] + 1100;
    if (wt1Position) translateBranch('mine:wt1:cb', [sourceTarget[0] - wt1Position[0], wt1Y - wt1Position[1]]);
    const sw441Position = layout.assets['mine:sw441:in:cb'];
    const sw441TargetY = Math.max(wt1Y + 1000, sw411Frame ? sw411Frame.y + sw411Frame.height + 950 : 0);
    if (sw441Position) translateBranch('mine:sw441:in:cb', [sourceTarget[0] - sw441Position[0], sw441TargetY - sw441Position[1]]);
  }
  // Keep the HPGR supply train top-down: SW435's feeder and CB reach SW438-P-01,
  // then JB001, TF001 primary, TF001 secondary and the SW002 bus. The original
  // tree order placed the transformer above the JB, so move the TF001 subtree
  // below the JB as one connected branch. A01 remains a short side earth branch.
  translateBranch('hpgr:tf001', [0, 1600]);
  // Branch/ring placement above is final for this layout pass. Rebuild room
  // borders from the resulting device and label positions so later manual
  // placement cannot leave stale boxes behind the equipment.
  const roomMembers = new Map(panels.map(panel => [panel.id, panel.memberAssetIds ?? panel.assetIds]));
  // Put the CV006 trunk and its Drop Tower takeoff below SW411's unusually
  // broad overview frame. This is a diagram-only placement; both OHL links
  // remain attached to their existing modeled terminals.
  translateBranch('cv006:pole:17', [0, 1400]);
  // TF419A and the Hopper9 HV board are descendants of the RM419 feeder, but
  // the compact tree placed them above RM419 while their feeder breaker and
  // TF419B branch are below it. Align TF419A with TF419B so the confirmed
  // breaker→transformer leg stays a short, downward connection. This changes
  // presentation coordinates only; the modeled branch and terminals remain.
  const h9Tf419a = layout.assets['wh:h9:tf419a'];
  const h9Tf419b = layout.assets['wh:h9:tf419b'];
  if (h9Tf419a && h9Tf419b) translateBranch('wh:h9:tf419a', [0, h9Tf419b[1] - h9Tf419a[1]]);
  // Keep RM419 immediately downstream of its actual RM410 parent. The old
  // tree placed RM419 below unrelated SW421/SW435 rooms, making the confirmed
  // incoming lead a long run through their switchroom boxes. Move the complete
  // RM419→RM418 presentation branch beside the RM410 source endpoint.
  const rm410ToH9 = layout.assets['rm410:interface:rm419'];
  const h9Incoming = layout.assets['wh:h9:interface:rm410'];
  if (rm410ToH9 && h9Incoming) {
    translateBranch('wh:h9:interface:rm410', [
      rm410ToH9[0] - h9Incoming[0],
      rm410ToH9[1] + 600 - h9Incoming[1],
    ]);
  }
  // Keep the RM406-confirmed Hopper8 destination beside its source interface.
  // The SS416/transformer/MCC tree therefore continues below the source in the
  // CV006 branch band instead of dropping through RM721's unrelated frame.
  const h8Source = layout.assets['wh:h8:interface:rm406'];
  const h8Junction = layout.assets['wh:h8:hv416'];
  if (h8Source && h8Junction) {
    translateBranch('wh:h8:hv416', [
      h8Source[0] - h8Junction[0],
      h8Source[1] + 600 - h8Junction[1],
    ]);
  }
  // SW421 is a confirmed SW411 tier15 child. Place its receiving room just
  // below the parent and west of SW411, using the open corridor outside SW435.
  // This moves the complete SW421 tree together and keeps the feeder endpoint
  // out of the SW435 frame; it does not alter the modeled connection.
  const currentFrames = switchroomFrames(model, layout, labels);
  const sw411Room = currentFrames.find(panel => panel.title === 'SW411');
  const sw421Room = currentFrames.find(panel => panel.title === 'SW421');
  const sw421Incoming = layout.assets['sw421:interface:sw411'];
  if (sw411Room && sw421Room && sw421Incoming) {
    const frameOffsetX = sw421Room.x - sw421Incoming[0];
    const frameOffsetY = sw421Room.y - sw421Incoming[1];
    const targetFrameX = sw411Room.x - 2_000;
    const targetFrameY = sw411Room.y + sw411Room.height + 1_000;
    translateBranch('sw421:interface:sw411', [
      targetFrameX - frameOffsetX - sw421Incoming[0],
      targetFrameY - frameOffsetY - sw421Incoming[1],
    ]);
  }
  // Give the owner-confirmed RM413A double-boot a near-side entry point on its
  // continuous bus. This keeps the exact link inside the room edge and avoids
  // routing across the bus; the bus span grows only enough to contain the tap.
  const rm413aTapLink = model.connections.find(link => link.id === 'rm413:double-boot-rm413a');
  if (rm413aTapLink) {
    const fromOwner = owners.get(rm413aTapLink.from)!;
    const toOwner = owners.get(rm413aTapLink.to)!;
    const busOwner = byId.get(fromOwner)?.kind === 'bus' ? fromOwner : byId.get(toOwner)?.kind === 'bus' ? toOwner : undefined;
    const cableTerminal = busOwner === fromOwner ? rm413aTapLink.to : rm413aTapLink.from;
    const tap = busOwner && busTapX.get(rm413aTapLink.id);
    if (busOwner && tap) {
      const entryX = layout.terminals[cableTerminal][0] + 200;
      tap.set(busOwner, entryX);
      layout.busSpans![busOwner] = Math.max(layout.busSpans![busOwner] ?? 0, 2 * Math.abs(layout.assets[busOwner][0] - entryX));
    }
  }
  const finalRoomFrames = switchroomFrames(model, layout, labels).map(panel => ({
    ...panel,
    memberAssetIds: roomMembers.get(panel.id) ?? panel.memberAssetIds,
  }));
  // Keep an up-to-date frame index for the remaining endpoint alignment work.
  // The definitive room solve runs once after all asset placement is complete.
  panels.splice(0, panels.length, ...finalRoomFrames);
  // Final frame clearance can move whole child rooms after their links were
  // initially laid out. Re-pack these three confirmed parent/child groups
  // after clearance so the selected presentation tree remains top-down and
  // the short inter-room links stay local. These are diagram coordinates
  // only; the model connections and their evidence are unchanged.
  const alignBranchRoot = (root: string, target: Point) => {
    const position = layout.assets[root];
    if (position) translateBranch(root, [target[0] - position[0], target[1] - position[1]]);
  };
  const rm406H8Source = layout.assets['rm406:interface:hopper8'];
  if (rm406H8Source) alignBranchRoot('wh:h8:interface:rm406', [rm406H8Source[0], rm406H8Source[1] + 500]);
  const rm410H9Source = layout.assets['rm410:interface:rm419'];
  if (rm410H9Source) alignBranchRoot('wh:h9:interface:rm410', [rm410H9Source[0], rm410H9Source[1] + 500]);

  // Hopper8's RM406 boundary interface is deliberately outside the H8 room
  // membership. Its downstream SS416 interface and room therefore need one
  // explicit cluster move after frame clearance; the selected tree direction
  // does not include the room when rooted at the boundary interface.
  const translateAssetSet = (ids: Set<string>, delta: Point) => {
    if (!delta[0] && !delta[1]) return;
    for (const id of ids) {
      const position = layout.assets[id];
      if (position) layout.assets[id] = [position[0] + delta[0], position[1] + delta[1]];
      const asset = byId.get(id);
      for (const terminal of asset?.terminals ?? []) {
        const point = layout.terminals[terminal];
        if (point) layout.terminals[terminal] = [point[0] + delta[0], point[1] + delta[1]];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + delta[0], y: label.y + delta[1] });
      for (const taps of junctionTap.values()) {
        const point = taps.get(id);
        if (point) taps.set(id, [point[0] + delta[0], point[1] + delta[1]]);
      }
    }
    for (const [id, merge] of merges) {
      if (ids.has(id) || merge.controls.every(control => ids.has(control))) {
        merges.set(id, { ...merge, x: merge.x + delta[0], y: merge.y + delta[1] });
      }
    }
    if (delta[0]) for (const link of model.connections) {
      const fromOwner = owners.get(link.from)!;
      const toOwner = owners.get(link.to)!;
      const shiftedBus = byId.get(fromOwner)?.kind === 'bus' && ids.has(fromOwner) ? fromOwner
        : byId.get(toOwner)?.kind === 'bus' && ids.has(toOwner) ? toOwner
          : undefined;
      if (shiftedBus) {
        const tap = busTapX.get(link.id)?.get(shiftedBus);
        if (tap !== undefined) busTapX.get(link.id)!.set(shiftedBus, tap + delta[0]);
      }
    }
    for (const panel of panels.filter(candidate => [...candidate.assetIds, ...(candidate.memberAssetIds ?? [])].some(id => ids.has(id)))) {
      panel.x += delta[0]; panel.y += delta[1];
    }
  };
  // RM721's RM712 and RM713 feeds leave from separate outgoing positions.
  // Keep each receiving switchroom aligned beneath its own cable-side source
  // terminal so the two independent top-down drops do not converge on one
  // long shared horizontal lane.
  const alignReceivingRoomToFeed = (frameId: string, connectionId: string, receivingPrefix: string, targetX?: number) => {
    const frame = panels.find(candidate => candidate.id === frameId);
    const connection = model.connections.find(candidate => candidate.id === connectionId);
    if (!frame || !connection) return;
    const receivingTerminal = owners.get(connection.from)?.startsWith(receivingPrefix) ? connection.from
      : owners.get(connection.to)?.startsWith(receivingPrefix) ? connection.to
        : undefined;
    if (!receivingTerminal) return;
    const sourceTerminal = receivingTerminal === connection.from ? connection.to : connection.from;
    const sourcePoint = layout.terminals[sourceTerminal];
    const receivingPoint = layout.terminals[receivingTerminal];
    if (!sourcePoint || !receivingPoint) return;
    const members = new Set([...frame.assetIds, ...(frame.memberAssetIds ?? [])]);
    translateAssetSet(members, [(targetX ?? sourcePoint[0]) - receivingPoint[0], 0]);
  };
  alignReceivingRoomToFeed('services/mine-services', 'owner:join:rm721-rm712', 'rm712:');
  alignReceivingRoomToFeed('services/workshop', 'rm721:current-rm713-cable', 'rm713:');
  const h8Boundary = layout.assets['wh:h8:interface:rm406'];
  const h8Ss416 = layout.assets['wh:h8:hv416'];
  const h8Room = panels.find(panel => panel.id === 'western-supplemental/h8/mv');
  if (h8Boundary && h8Ss416 && h8Room) {
    const h8Cluster = new Set([...(h8Room.memberAssetIds ?? h8Room.assetIds), 'wh:h8:hv416']);
    translateAssetSet(h8Cluster, [h8Boundary[0] - h8Ss416[0], h8Boundary[1] + 600 - h8Ss416[1]]);
  }

  // Put SW421 directly below the SW411/H10 region, with its incoming endpoint
  // vertically aligned to the SW411 tier15 source. This keeps the connector
  // out of the horizontal feeder fan and places the room below nearby frames.
  const sw411RoomAfterClearance = panels.find(panel => panel.title === 'SW411');
  const sw421RoomAfterClearance = panels.find(panel => panel.title === 'SW421');
  const mc420RoomAfterClearance = panels.find(panel => panel.title === 'MC420 · H10');
  const sw421Feed = model.connections.find(link => link.id === 'whole:join:sw421');
  const sw421Interface = layout.assets['sw421:interface:sw411'];
  if (sw411RoomAfterClearance && sw421RoomAfterClearance && mc420RoomAfterClearance && sw421Feed && sw421Interface) {
    const frameOffsetX = sw421RoomAfterClearance.x - sw421Interface[0];
    const frameOffsetY = sw421RoomAfterClearance.y - sw421Interface[1];
    const incomingTerminal = owners.get(sw421Feed.from) === 'sw421:interface:sw411' ? sw421Feed.from : sw421Feed.to;
    const upstreamTerminal = incomingTerminal === sw421Feed.from ? sw421Feed.to : sw421Feed.from;
    const upstreamPosition = layout.terminals[upstreamTerminal];
    const targetFrameX = (upstreamPosition?.[0] ?? sw421Interface[0]) + frameOffsetX;
    const targetFrameY = mc420RoomAfterClearance.y + mc420RoomAfterClearance.height + 700;
    const targetInterfaceX = targetFrameX - frameOffsetX;
    const targetInterfaceY = targetFrameY - frameOffsetY;
    alignBranchRoot('sw421:interface:sw411', [targetInterfaceX, targetInterfaceY]);
  }
  // Keep the H9/H7 LV motor-control rooms below their confirmed RMU parents.
  // Their original selected-tree order put both large rooms inside the SW411
  // outline. Place them on opposite sides of the RMU column to retain a clear
  // vertical hierarchy without overlapping each other.
  const rm419Room = panels.find(panel => panel.title === 'RM419 · H9');
  const h9McRoom = panels.find(panel => panel.title === 'MC419 · H9');
  if (rm419Room && h9McRoom) {
    // SW505 and RM418 bracket RM419 vertically with too little clearance.
    // Shift the complete RM419 room slightly west, carrying its RM410-facing
    // interface with it, so both room borders clear without a long cable run.
    const rm419Ids = new Set(rm419Room.memberAssetIds ?? rm419Room.assetIds);
    translateAssetSet(rm419Ids, [-1_500, 0]);
    const targetX = rm419Room.x - 700 - h9McRoom.width;
    const targetY = rm419Room.y + rm419Room.height + 700;
    const ids = new Set(h9McRoom.memberAssetIds ?? h9McRoom.assetIds);
    const anchor = layout.assets['wh:h9:mc419:bus'];
    if (anchor) translateAssetSet(ids, [targetX - h9McRoom.x, targetY - h9McRoom.y]);
  }
  const rm418Room = panels.find(panel => panel.title === 'RM418 · H7');
  const h7McRoom = panels.find(panel => panel.title === 'MC418 · H7');
  if (rm418Room && h7McRoom) {
    const targetX = rm418Room.x + rm418Room.width + 700;
    const targetY = rm418Room.y + rm418Room.height + 2300;
    const ids = new Set(h7McRoom.memberAssetIds ?? h7McRoom.assetIds);
    const anchor = layout.assets['wh:h7:mc418:bus'];
    if (anchor) translateAssetSet(ids, [targetX - h7McRoom.x, targetY - h7McRoom.y]);
  }
  // Solve room clearance after every whole-branch and assembly placement is
  // final. The solver computes all room shifts from one immutable snapshot;
  // applying the resulting asset deltas once avoids move-and-repair cascades.
  const finalTapAnchors = new Map([...new Set([...inlineIds, ...busIds])].map(id => [id, [...layout.assets[id]] as Point]));
  const finalFramesBeforeSolve = switchroomFrames(model, layout, labels).map(panel => ({
    ...panel,
    memberAssetIds: roomMembers.get(panel.id) ?? panel.memberAssetIds,
  }));
  const solvedFinalFrames = separateSwitchroomFrames(
    model,
    finalFramesBeforeSolve,
    layout,
    labels,
    outsideFrameAssets,
    placementOwnerByAssetId,
    topDownRoomOrder,
  );
  for (const [id, before] of finalTapAnchors) {
    const after = layout.assets[id];
    if (!after) continue;
    const dx = after[0] - before[0]; const dy = after[1] - before[1];
    if (!dx && !dy) continue;
    for (const taps of junctionTap.values()) {
      const point = taps.get(id);
      if (point) taps.set(id, [point[0] + dx, point[1] + dy]);
    }
    if (dx) for (const taps of busTapX.values()) {
      const x = taps.get(id);
      if (x !== undefined) taps.set(id, x + dx);
    }
  }
  for (const [id, merge] of merges) {
    const position = layout.assets[id];
    if (position) merges.set(id, { ...merge, x: position[0], y: position[1] });
  }
  panels.splice(0, panels.length, ...solvedFinalFrames);
  // The final frame solver can move receiving rooms after the earlier feed
  // alignment. Align the confirmed RM721→RM712→RM713 service chain from its
  // actual feeder terminals so the rooms follow the top-down supply tree.
  alignReceivingRoomToFeed('services/rm721', 'whole:join:rm721', 'services:interface:');
  alignReceivingRoomToFeed('services/mine-services', 'owner:join:rm721-rm712', 'rm712:');
  alignReceivingRoomToFeed('services/workshop', 'rm721:current-rm713-cable', 'rm713:');
  // Place SW505 so its incoming feeder can descend through the open corridor
  // between SW435 and Crushing 1. The lane is derived from their measured edges.
  const sw435Frame = panels.find(panel => panel.id === 'crushing-2/sw435-hv');
  const crushing1Frame = panels.find(panel => panel.id === 'crushing-1/hv');
  const desandsFrame = panels.find(panel => panel.id === 'desands/hv');
  const sw505LaneX = sw435Frame && crushing1Frame
    ? (sw435Frame.x + sw435Frame.width + crushing1Frame.x) / 2
    : undefined;
  if (layoutStrategy === 'sw505-corridor-candidate') {
    // Keep the complete SW505 tree in its measured right-side column; the
    // cross-room cable receives a dedicated corridor after all frame shifts.
  } else {
    alignReceivingRoomToFeed('stockpile/wet-hv', 'sw454:sw505:cable-SW505-P-01', 'sw505:in:', sw505LaneX);
  }
  // Desands currently straddles the nearly vertical H8 RM406-to-HV416 cable
  // column, forcing that short connection into a long down-and-back dogleg.
  // Move the complete room only far enough to clear the cable corridor.
  const h8Rm406Cable = model.connections.find(link => link.id === 'wh:h8:rm406-cable');
  if (desandsFrame && h8Rm406Cable) {
    const { from, to } = connectionPoints(h8Rm406Cable);
    const h9HvLaneFrame = panels.find(panel => panel.id === 'western/h9-hv');
    const dumpLaneFrame = panels.find(panel => panel.id === 'services/dump-pocket-hv');
    const laneLeft = h9HvLaneFrame ? h9HvLaneFrame.x + h9HvLaneFrame.width : Number.POSITIVE_INFINITY;
    const laneRight = dumpLaneFrame?.x ?? Number.NEGATIVE_INFINITY;
    const clearCorridorRight = laneRight > laneLeft ? (laneLeft + laneRight) / 2 - 200 : Number.POSITIVE_INFINITY;
    const desiredRight = Math.min(Math.min(from[0], to[0]) - 600, clearCorridorRight);
    const moveLeftBy = Math.min(0, desiredRight - (desandsFrame.x + desandsFrame.width));
    const members = new Set([...desandsFrame.assetIds, ...(desandsFrame.memberAssetIds ?? [])]);
    translateAssetSet(members, [moveLeftBy, 0]);
  }
  // Keep Hopper 3's shared HV416 source directly below its confirmed RM417
  // SW04 outlet, after all room/branch translations have settled. Use owner
  // identity rather than link order to select each real connection endpoint.
  const h3SourceLink = model.connections.find(link => link.id === 'wh:h1:hopper3-cable');
  const h3Tf416Link = model.connections.find(link => link.id === 'wh:h3:tf416:input');
  const h3Tf416aLink = model.connections.find(link => link.id === 'wh:h3:tf416a:input');
  const h3JunctionAsset = byId.get('wh:h3:hv416');
  const endpointFor = (link: NetworkModel['connections'][number], assetId: string) => {
    const points = connectionPoints(link);
    return owners.get(link.from) === assetId ? points.from : points.to;
  };
  if (h3SourceLink && h3Tf416Link && h3Tf416aLink && h3JunctionAsset) {
    const source = endpointFor(h3SourceLink, 'wh:h1:rm417:sw04');
    const junction = endpointFor(h3SourceLink, 'wh:h3:hv416');
    const targetJunction: Point = [source[0], source[1] + 480];
    translateBranch('wh:h3:hv416', [targetJunction[0] - junction[0], targetJunction[1] - junction[1]]);

    // Put both primary terminals on the same downstream row, separated enough
    // for their labels and standard transformer symbols. Each move carries its
    // full tree, including TF416A's LV interface and final bus point.
    const junctionNow = endpointFor(h3SourceLink, 'wh:h3:hv416');
    for (const [assetId, link, xOffset] of [
      ['wh:h3:tf416', h3Tf416Link, -1200],
      ['wh:h3:tf416a', h3Tf416aLink, 1200],
    ] as const) {
      const current = endpointFor(link, assetId);
      const target: Point = [junctionNow[0] + xOffset, junctionNow[1] + 1000];
      translateBranch(assetId, [target[0] - current[0], target[1] - current[1]]);
    }

    // Keep TF416A's LV endpoint compactly below its secondary winding. Room
    // separation had placed it far below the transformer despite tree ownership.
    const h3Tf416aSupply = model.connections.find(link => link.id === 'wh:h3:mc416a:interface:supply');
    if (h3Tf416aSupply) {
      const secondary = endpointFor(h3Tf416aSupply, 'wh:h3:tf416a');
      const interfaceTerminal = endpointFor(h3Tf416aSupply, 'wh:h3:mc416a:interface');
      const targetInterface: Point = [secondary[0], secondary[1] + 720];
      translateBranch('wh:h3:mc416a:interface', [
        targetInterface[0] - interfaceTerminal[0],
        targetInterface[1] - interfaceTerminal[1],
      ]);
    }
  }
  const routes = new Map<string, Point[]>(); const occupied: Segment[] = [];
  const remember = (id: string, points: Point[]) => {
    routes.set(id, points); const link = model.connections.find(link => link.id === id)!;
    points.slice(1).forEach((p, i) => occupied.push({ from: points[i], to: p, terminals: [link.from, link.to] }));
  };
  const resolveRoutesUntilStable = (
    maxPasses: number,
    routeIds?: Set<string>,
    searchOptions?: RouteResolveOptions,
  ) => {
    const diagnostics = [];
    for (let pass = 0; pass < maxPasses; pass++) {
      const before = new Map([...routes].map(([id, points]) => [id, points.map(point => [point[0], point[1]] as Point)]));
      diagnostics.push(resolveRoutes(model, layout, labels, routes, hiddenIds, routeIds, connectionPoints, panels, searchOptions));
      const unchanged = before.size === routes.size && [...before].every(([id, points]) => {
        const after = routes.get(id);
        return !!after && points.length === after.length && points.every((point, index) => point[0] === after[index][0] && point[1] === after[index][1]);
      });
      // The route planner is deterministic for the same geometry. If it did
      // not change a point, repeating this stage cannot produce a new result.
      if (unchanged) break;
    }
    return diagnostics;
  };
  const mergeLinks = new Set(model.connections.filter(link => {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    return merges.get(a)?.controls.includes(b) || merges.get(b)?.controls.includes(a);
  }).map(link => link.id));
  for (const link of model.connections.filter(link => treeEdgeIds.has(link.id) || mergeLinks.has(link.id))) {
    const { from, to } = connectionPoints(link); const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    if (earthParents.has(a) || earthParents.has(b)) {
      const earth = earthParents.has(a) ? a : b;
      const start = earth === a ? to : from; const end = earth === a ? from : to;
      // Branch sideways off the live conductor first. Dropping down from the
      // same terminal as the main cable laid the earth lead directly over it.
      let points: Point[];
      if (link.id === 'wh:h8:mc416:m1:earth:branch') {
        // With the FC common link vertical, this east-side route reaches the
        // earth switch without sharing the FC or motor-cable runs.
        points = orthogonalPoints([start, [end[0], start[1]], end]);
      } else points = orthogonalPoints([start, [end[0], start[1]], end]);
      remember(link.id, earth === a ? points.reverse() : points); continue;
    }
    if (mergeLinks.has(link.id)) {
      const merge = merges.get(a) ?? merges.get(b)!; const targetFirst = merges.has(a);
      const start = targetFirst ? to : from; const end = targetFirst ? from : to;
      const points = orthogonalPoints([start, [start[0], merge.y], [merge.x, merge.y], end]);
      remember(link.id, targetFirst ? points.reverse() : points); continue;
    }
    const upper = parent.get(b) === a ? a : b;
    const terminal = upper === a ? link.from : link.to;
    const upperAsset = byId.get(upper)!;
    const channel = layout.assets[upper][1] + (upperAsset.kind === 'bus' ? 0 : inlineIds.has(upper) ? 90 : (upward.has(upper) ? -1 : 1) * (threePositionContacts(upperAsset) ? 210 : 140 + upperAsset.terminals.indexOf(terminal) * 12));
    const incoming = adjacent.get(upper)!.find(peer => peer.link === parentLink.get(upper))?.terminal;
    if (terminal === incoming && upperAsset.terminals.length > 1 && upperAsset.kind !== 'bus') {
      // A same-terminal continuation must leave beside the symbol. Passing down
      // its centre could visually join a different, independent terminal.
      const start = upper === a ? from : to; const end = upper === a ? to : from;
      const points = orthogonalPoints([start, [start[0] - 90, start[1]], [start[0] - 90, channel], [end[0], channel], end]);
      remember(link.id, upper === a ? points : points.reverse());
    } else if (link.id === 'wh:h8:rm406-cable') {
      // Hopper8's RM406 lead must not pass through the HPGR switchroom. Leave
      // the source on the west side, descend in a dedicated corridor outside
      // the HPGR frame, then enter Hopper8 below that frame.
      const hpgrFrame = panels.find(panel => panel.label.includes('HPGR SW002'));
      const corridorX = (hpgrFrame?.x ?? from[0] - 1000) - 580;
      const belowHpgrY = (hpgrFrame ? hpgrFrame.y + hpgrFrame.height : from[1]) + 240;
      const routeY = Math.max(to[1], belowHpgrY);
      // Step below the adjacent SW435 and RM406 feeder runs before travelling
      // west; leaving earlier would cut across their vertical conductors.
      const leaveY = from[1] + 800;
      remember(link.id, orthogonalPoints([from, [from[0], leaveY], [corridorX, leaveY], [corridorX, routeY], [to[0], routeY], to]));
    } else remember(link.id, orthogonalPoints([from, [from[0], channel], [to[0], channel], to]));
  }
  const symbols = assets.map(asset => { const [x, y] = layout.assets[asset.id]; return { id: asset.id, x: x - 38, y: y - 38, width: 76, height: 76 }; });
  for (const link of model.connections.filter(link => !treeEdgeIds.has(link.id) && !mergeLinks.has(link.id))) {
    const { from, to } = connectionPoints(link); const own = new Set([owners.get(link.from), owners.get(link.to)]);
    const left = Math.min(from[0], to[0]) - 400; const right = Math.max(from[0], to[0]) + 400;
    const top = Math.min(from[1], to[1]) - 400; const bottom = Math.max(from[1], to[1]) + 400;
    const obstacles = [...symbols.filter(box => !own.has(box.id) && !hiddenIds.has(box.id)), ...assets.filter(asset => !hiddenIds.has(asset.id)).map(asset => labels.get(asset.id)!)].filter(box => box.x + box.width >= left && box.x <= right && box.y + box.height >= top && box.y <= bottom).map(box => ({ x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 }));
    const others = occupied.filter(s => !s.terminals.includes(link.from) && !s.terminals.includes(link.to) && Math.max(s.from[0], s.to[0]) >= left && Math.min(s.from[0], s.to[0]) <= right && Math.max(s.from[1], s.to[1]) >= top && Math.min(s.from[1], s.to[1]) <= bottom);
    const candidates = [orthogonalPoints([from, to])];
    for (const x of [left + 100, right - 100, from[0] - 100, from[0] + 100, to[0] - 100, to[0] + 100]) candidates.push(orthogonalPoints([from, [x, from[1]], [x, to[1]], to]));
    for (const y of [top + 100, bottom - 100, (from[1] + to[1]) / 2]) candidates.push(orthogonalPoints([from, [from[0], y], [to[0], y], to]));
    const score = (points: Point[]) => points.slice(1).reduce((cost, p, i) => cost + Math.abs(p[0] - points[i][0]) + Math.abs(p[1] - points[i][1]) + obstacles.filter(box => cutsBox(points[i], p, box)).length * 1e10 + others.reduce((sum, s) => sum + sharedLength(points[i], p, s) * 1e7 + (crossesSegment(points[i], p, s) ? 1e9 : 0), 0), 0);
    let route = candidates.reduce((best, route) => score(route) < score(best) ? route : best);
    const blocked = route.some((p, i) => i > 0 && obstacles.some(box => cutsBox(route[i - 1], p, box)));
    const overlaps = route.some((p, i) => i > 0 && others.some(s => sharedLength(route[i - 1], p, s) > 0));
    const crosses = route.some((p, i) => i > 0 && others.some(s => crossesSegment(route[i - 1], p, s)));
    if (blocked || overlaps || crosses) { const alternative = clearRoute(from, to, obstacles, others); if (alternative && score(alternative) < score(route)) route = alternative; }
    remember(link.id, route);
  }
  // Tree geometry supplies the direct topology; this single clearance pass
  // adjusts only routes that still collide with equipment or another wire.
  resolveRoutes(model, layout, labels, routes, hiddenIds, undefined, connectionPoints, panels);
  const hopper7Earth = model.connections.find(link => link.id === 'wh:h7:rm418:cb03:earth:branch');
  if (hopper7Earth) {
    const { from, to } = connectionPoints(hopper7Earth);
    const lane = Math.max(from[1], to[1]) + 260;
    routes.set(hopper7Earth.id, orthogonalPoints([from, [from[0], lane], [to[0], lane], to]));
  }
  // An earth branch should leave the RM420 cable sideways from its connection
  // point, not reuse the incoming cable's short vertical tail.
  const rm420Earth = model.connections.find(link => link.id === 'rm420:es01:branch');
  if (rm420Earth) {
    const fromOwner = owners.get(rm420Earth.from)!;
    const { from, to } = connectionPoints(rm420Earth);
    const start = earthParents.has(fromOwner) ? to : from;
    const end = earthParents.has(fromOwner) ? from : to;
    // Leave the cable connection sideways before dropping to the earth
    // switch. A vertical first leg followed the adjacent TF443 cable and made
    // two independent conductors look joined at whole-network scale.
    const sideX = end[0];
    const points = orthogonalPoints([start, [sideX, start[1]], end]);
    routes.set(rm420Earth.id, earthParents.has(fromOwner) ? points.reverse() : points);
  }
  // SW426's bus-earth branch leaves on the side opposite the SW453 cable drop,
  // keeping the earth path distinct from the adjacent outgoing feeder column.
  const sw426BusEarth = model.connections.find(link => link.id === 'sw426:bus:es:branch');
  if (sw426BusEarth) {
    const { from, to } = connectionPoints(sw426BusEarth);
    const lane = Math.max(from[0], to[0]) + 120;
    routes.set(sw426BusEarth.id, orthogonalPoints([from, [lane, from[1]], [lane, to[1]], to]));
  }
  const clearanceRoutes = new Set([
    'line33:amr-trunk', 'line33:pole-2-to-4', 'line33:201-to-214', 'owner-scope:line33:takeoff:future-214',
    'line33:272-to-284', 'owner-scope:line33:takeoff:pole-272-1', 'line33:284-to-286',
    'owner-scope:line33:takeoff:bigge-sp1', 'owner-scope:line33:takeoff:bigge-sp1-sp2',
    'line33:hopper-286-fused-abs-input', 'line33:hopper-286-fused-abs-output', 'rm420:incoming:cable',
    'whole:join:hopper10-tf04', 'sw421:sw423:y:cable-SW423-P-02-group',
    'owner-scope:line33:takeoff:end-287', 'rm712:tf712:bar', 'owner:tf712-sw712-incoming',
    'rm712:tf712:incoming-cable', 'rm712:tf712:removed-cable-segment',
    'rm420:tf420b:bus-cb', 'rm420:tf420b:lv-continuation', 'ep:h10:mc420a:incoming',
    'rm420:tf420b:es:branch', 'rm420:tf420b:cable-SS420-TF420B-P01', 'whole:primary33:tf420b',
    'wh:h1:hopper3-cable', 'wh:h3:tf416:input', 'wh:h3:tf416a:input',
    'wh:h1:tf417:input', 'rm420:mc420:motor-02:fc:bus-fuse',
    'hpgr:tf004:bus-k202', 'sw426:sw429:y:lv-cable', 'station:sb02:f4:es:branch',
    'station:sb02:f4:transformer:input-link', 'line33:214-to-227', 'line33:227-to-272',
    'wh:h1:mc417:in-earth:branch', 'wh:h1:mc417:supply', 'rm420:tf420b:es:branch',
    'mine:sw441:incoming:bar', 'sw431:tf442:cable-TF442-P-01', 'sw435:incoming:cable-SW435-P-01',
    'sw431:sw442:d:winding-cable', 'sw435:incoming:bus-link', 'wh:h1:tf417a:input',
    'wh:h1:mc417:incoming-bus', 'mine:tf441:bar', 'owner-scope:line33:takeoff:norfolk',
    'whole:join:crushing-tie', 'owner:tf12:opf1-7-to-in04', 'owner:tf12:opf1-7-water', 'wh:h7:rm418:cb03:earth:branch',
    'mine:sw441:incoming:bar', 'wh:h1:cb02-sw04', 'wh:h1:hopper3-cable',
  ]);
  // Keep the adjacent Crushing 1/2 cable riser straight after choosing its
  // separate tree column above.
  const sw435Incoming = model.connections.find(link => link.id === 'sw435:incoming:cable-SW435-P-01');
  if (sw435Incoming) {
    const { from, to } = connectionPoints(sw435Incoming);
    routes.set(sw435Incoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // Keep the OHL series connections direct and top-down. Their junction
  // terminals already provide the required branch point.
  const tieTo201 = model.connections.find(link => link.id === 'line33:tie-to-201');
  if (tieTo201) {
    const { from, to } = connectionPoints(tieTo201);
    routes.set(tieTo201.id, orthogonalPoints([from, to]));
  }
  const clearPole214to227 = model.connections.find(link => link.id === 'line33:214-to-227');
  if (clearPole214to227) {
    const { from, to } = connectionPoints(clearPole214to227);
    routes.set(clearPole214to227.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const hopperOneTf417a = model.connections.find(link => link.id === 'wh:h1:tf417a:input');
  if (hopperOneTf417a) {
    const { from, to } = connectionPoints(hopperOneTf417a);
    const lane = Math.min(from[1], to[1]) + 150;
    const departureX = from[0] + 120;
    routes.set(hopperOneTf417a.id, orthogonalPoints([from, [departureX, from[1]], [departureX, lane], [to[0], lane], to]));
  }
  const hopperOneTf417 = model.connections.find(link => link.id === 'wh:h1:tf417:input');
  if (hopperOneTf417) {
    const { from, to } = connectionPoints(hopperOneTf417);
    routes.set(hopperOneTf417.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const hopperOneMc417Bus = model.connections.find(link => link.id === 'wh:h1:mc417:incoming-bus');
  if (hopperOneMc417Bus) {
    const { from, to } = connectionPoints(hopperOneMc417Bus);
    routes.set(hopperOneMc417Bus.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const sw441Incoming = model.connections.find(link => link.id === 'mine:sw441:incoming:cable');
  const tf12WaterSpur = model.connections.find(link => link.id === 'owner:tf12:opf1-7-water');
  if (sw441Incoming) {
    const { from, to } = connectionPoints(sw441Incoming);
    routes.set(sw441Incoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const sw441Bar = model.connections.find(link => link.id === 'mine:sw441:incoming:bar');
  if (sw441Bar) {
    const { from, to } = connectionPoints(sw441Bar);
    routes.set(sw441Bar.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const future214 = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:future-214');
  if (future214) {
    const { from, to } = connectionPoints(future214);
    routes.set(future214.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const hopperThreeMc416aIncoming = model.connections.find(link => link.id === 'ep:h3:mc416a:incoming');
  if (hopperThreeMc416aIncoming) {
    const { from, to } = connectionPoints(hopperThreeMc416aIncoming);
    routes.set(hopperThreeMc416aIncoming.id, orthogonalPoints([from, to]));
  }
  const hopperThreeCable = model.connections.find(link => link.id === 'wh:h1:hopper3-cable');
  if (hopperThreeCable) {
    const { from, to } = connectionPoints(hopperThreeCable);
    routes.set(hopperThreeCable.id, orthogonalPoints([from, to]));
  }
  const hopperThreeTf416Input = model.connections.find(link => link.id === 'wh:h3:tf416:input');
  if (hopperThreeTf416Input) {
    const { from, to } = connectionPoints(hopperThreeTf416Input);
    routes.set(hopperThreeTf416Input.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  const hopperThreeTf416aInput = model.connections.find(link => link.id === 'wh:h3:tf416a:input');
  if (hopperThreeTf416aInput) {
    const { from, to } = connectionPoints(hopperThreeTf416aInput);
    routes.set(hopperThreeTf416aInput.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  // Resolve the topology routes before the small number of final, locally
  // tuned clearance paths below.
  resolveRoutesUntilStable(8, clearanceRoutes);
  // Keep the 214→227 span arriving from above at the pole junction. The
  // resolver detoured this short backbone around adjacent takeoff terminals.
  const finalPole214to227 = model.connections.find(link => link.id === 'line33:214-to-227');
  if (finalPole214to227) {
    const { from, to } = connectionPoints(finalPole214to227);
    routes.set(finalPole214to227.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // Preserve the direct inter-room tie and keep the water/Hopper3 tee routes
  // on their separately cleared columns.
  const crushingTie = model.connections.find(link => link.id === 'whole:join:crushing-tie');
  if (crushingTie) {
    // Keep endpoints attached to the modeled terminal locations. Using the
    // endpoints of neighboring cable routes can silently detach this tie when
    // either cable is rerouted independently.
    const { from, to } = connectionPoints(crushingTie);
    routes.set(crushingTie.id, orthogonalPoints([from, to]));
  }
  const sw431IncomingBusLink = model.connections.find(link => link.id === 'sw431:incoming:bus-link');
  if (sw431IncomingBusLink) {
    const { from, to } = connectionPoints(sw431IncomingBusLink);
    routes.set(sw431IncomingBusLink.id, orthogonalPoints([from, to]));
  }
  if (hopperThreeMc416aIncoming) {
    const { from, to } = connectionPoints(hopperThreeMc416aIncoming);
    routes.set(hopperThreeMc416aIncoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const hopperThreeMc416aSupply = model.connections.find(link => link.id === 'wh:h3:mc416a:interface:supply');
  if (hopperThreeMc416aSupply) {
    const { from, to } = connectionPoints(hopperThreeMc416aSupply);
    routes.set(hopperThreeMc416aSupply.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const wt1Source = model.connections.find(link => link.id === 'mine:wt1:source');
  if (wt1Source) {
    const { from, to } = connectionPoints(wt1Source);
    // Step just below the Pole 1 recloser, then continue east into the WT1-CB
    // room outside the station feed's west-side clearance route.
    routes.set(wt1Source.id, orthogonalPoints([from, to]));
  }
  const tf04StationToRecloser = model.connections.find(link => link.id === 'line33:station-to-recloser');
  if (tf04StationToRecloser) {
    const { from, to } = connectionPoints(tf04StationToRecloser);
    routes.set(tf04StationToRecloser.id, orthogonalPoints([from, to]));
  }
  // Keep the confirmed TF12 water spur on a reserved corridor between its
  // terminals. This passes west of the line33 284–286 span and stays clear of
  // the RM420 incomer and earth-switch branches.
  if (tf12WaterSpur) {
    const { from, to } = connectionPoints(tf12WaterSpur);
    routes.set(tf12WaterSpur.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // WT1 and SW441 share the outside-edge supply riser placed above.
  if (sw441Incoming) {
    const { from, to } = connectionPoints(sw441Incoming);
    routes.set(sw441Incoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  if (sw441Bar) {
    const { from, to } = connectionPoints(sw441Bar);
    routes.set(sw441Bar.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const tf441Bar = model.connections.find(link => link.id === 'mine:tf441:bar');
  if (tf441Bar) {
    const { from, to } = connectionPoints(tf441Bar);
    routes.set(tf441Bar.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const tf443Earth = model.connections.find(link => link.id === 'sw426:tf443:es:branch');
  if (tf443Earth) {
    const { from, to } = connectionPoints(tf443Earth);
    routes.set(tf443Earth.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  for (const id of [
    'sw426:tf443:hv-cable',
    'sw421:tf421:cable-TF421-P-01',
    'rm420:tf420b:cable-SS420-TF420B-P01',
    'sw411:tier-13:interface-link',
    'rm420:mc420:in:es:branch',
    'sw431:sw442:y:incomer-bus',
    'sw426:sw443:y:bus-link',
    'sw426:tf443:bus-link',
    'sw421:incoming:bus-link',
    'sw454:incoming:bus-link',
    'sw505:incoming:bus-link',
  ]) {
    const link = model.connections.find(connection => connection.id === id);
    if (!link) continue;
    const { from, to } = connectionPoints(link);
    routes.set(id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const rm420LvIncomerBus = model.connections.find(link => link.id === 'rm420:mc420:incomer-bus');
  if (rm420LvIncomerBus) {
    const { from, to } = connectionPoints(rm420LvIncomerBus);
    const laneX = from[0] - 40;
    routes.set(rm420LvIncomerBus.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  for (const id of ['sw431:cross-link:cable-SW431-P-02', 'sw435:cross-link:cable-SW431-P-02']) {
    const link = model.connections.find(connection => connection.id === id);
    if (!link) continue;
    const { from, to } = connectionPoints(link);
    const laneX = from[0];
    routes.set(id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const sw426Tf439BusLink = model.connections.find(link => link.id === 'sw426:tf439:bus-link');
  if (sw426Tf439BusLink) {
    const { from, to } = connectionPoints(sw426Tf439BusLink);
    routes.set(sw426Tf439BusLink.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const biggeSp1 = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:bigge-sp1');
  const pole284Continuation = model.connections.find(link => link.id === 'line33:284-to-286');
  if (pole284Continuation) {
    const { from, to } = connectionPoints(pole284Continuation);
    routes.set(pole284Continuation.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const pole272Continuation = model.connections.find(link => link.id === 'line33:272-to-284');
  if (pole272Continuation) {
    const { from, to } = connectionPoints(pole272Continuation);
    routes.set(pole272Continuation.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  const pole272Takeoff = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:pole-272-1');
  if (pole272Takeoff) {
    const { from, to } = connectionPoints(pole272Takeoff);
    routes.set(pole272Takeoff.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  const biggeSp1Sp2 = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:bigge-sp1-sp2');
  if (biggeSp1Sp2) {
    const { from, to } = connectionPoints(biggeSp1Sp2);
    routes.set(biggeSp1Sp2.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  if (biggeSp1) {
    const { from, to } = connectionPoints(biggeSp1);
    routes.set(biggeSp1.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  const future214Final = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:future-214');
  if (future214Final) {
    const { from, to } = connectionPoints(future214Final);
    const laneX = to[0] - 100;
    // Use this branch's own Pole 214 junction tap. Reusing the main-line tap
    // made two independently represented links touch away from their shared
    // terminal, so they looked like an accidental splice.
    routes.set(future214Final.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const norfolkTakeoff = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:norfolk');
  if (norfolkTakeoff) {
    const { from, to } = connectionPoints(norfolkTakeoff);
    const outerLane = from[0] + 70;
    routes.set(norfolkTakeoff.id, orthogonalPoints([from, [outerLane, from[1]], [outerLane, to[1]], to]));
  }
  // Keep SW426's Y-bus drops moving down through the clear channels between
  // the MC420 motor feeder cards instead of looping above and below that room.
  const sw427Y = model.connections.find(link => link.id === 'sw426:sw427:y:bus-link');
  const sw427DRoute = routes.get('sw426:sw427:d:bus-link');
  const sw427DLabel = labels.get('sw426:sw427:d:bus');
  if (sw427Y && sw427DRoute && sw427DLabel) {
    const { from, to } = connectionPoints(sw427Y);
    routes.set(sw427Y.id, orthogonalPoints([from, to]));
  }
  const sw429Y = model.connections.find(link => link.id === 'sw426:sw429:y:bus-link');
  const sw429DRoute = routes.get('sw426:sw429:d:bus-link');
  const mc420Motor2RcFuse = byId.get('rm420:mc420:motor-02:rc:fuse');
  const mc420Motor2RcLabel = labels.get('rm420:mc420:motor-02:rc:fuse');
  if (sw429Y && sw429DRoute && mc420Motor2RcFuse && mc420Motor2RcLabel) {
    const { from, to } = connectionPoints(sw429Y);
    routes.set(sw429Y.id, orthogonalPoints([from, to]));
  }
  const tf429Cable = model.connections.find(link => link.id === 'sw426:tf429:hv-cable');
  if (tf429Cable) {
    const { from, to } = connectionPoints(tf429Cable);
    routes.set(tf429Cable.id, orthogonalPoints([from, to]));
  }
  const rm420IncomingCable = model.connections.find(link => link.id === 'rm420:incoming:cable');
  if (rm420IncomingCable) {
    const { from, to } = connectionPoints(rm420IncomingCable);
    routes.set(rm420IncomingCable.id, orthogonalPoints([from, to]));
  }
  for (const id of ['rm420:tf420a:cb-sw', 'rm420:tf420a:cable-SS420-TF420A-P01', 'whole:primary33:tf420a']) {
    const link = model.connections.find(connection => connection.id === id);
    if (!link) continue;
    const { from, to } = connectionPoints(link);
    routes.set(id, orthogonalPoints([from, to]));
  }
  // MC420's incoming-cable earth is on the CB input side. Leave the input
  // terminal horizontally before dropping to the earth switch so its lead
  // cannot run through the CB output terminal or form a false bus junction.
  const mc420IncomingEarth = model.connections.find(link => link.id === 'rm420:mc420:in:es:branch');
  if (mc420IncomingEarth) {
    const { from, to } = connectionPoints(mc420IncomingEarth);
    const laneX = Math.max(from[0], to[0]) + 120;
    routes.set(mc420IncomingEarth.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  resolveAssetLabels(assets, layout, labels, routes, panels, hiddenIds);
  const pole272Label = labels.get('line33:pole-272');
  if (pole272Label) labels.set('line33:pole-272', { ...pole272Label, y: pole272Label.y - 200 });
  // Pole 286 is the incoming TF04 marker beside RM420. The default east-side
  // label position collides with the adjacent RM420 switch card, so keep its
  // long confirmation label on the open west side of its own marker.
  const pole286Label = labels.get('rm420:interface:pole286');
  const pole286Position = layout.assets['rm420:interface:pole286'];
  if (pole286Label && pole286Position) labels.set('rm420:interface:pole286', {
    ...pole286Label,
    x: pole286Position[0] - pole286Label.width - 420,
  });
  const tf420aLabel = labels.get('rm420:tf420a');
  const tf420aPosition = layout.assets['rm420:tf420a'];
  if (tf420aLabel && tf420aPosition) labels.set('rm420:tf420a', {
    ...tf420aLabel,
    x: tf420aPosition[0] - tf420aLabel.width - 250,
  });
  const sw435RingBusLink = model.connections.find(link => link.id === 'sw435:sw431:bus-link');
  if (sw435RingBusLink) {
    const { from, to } = connectionPoints(sw435RingBusLink);
    const laneY = from[1] - 80;
    routes.set(sw435RingBusLink.id, orthogonalPoints([from, [from[0], laneY], [to[0], laneY], to]));
  }
  // Resolve against final label positions: device cards follow their labels,
  // and several dense-room routes receive deliberate, late adjustments above.
  // A few passes let each detour settle around the routes placed before it.
  const preSpurRoutingDiagnostics = resolveRoutesUntilStable(3);
  // Preserve the intentional top-down TF12 → OPF1-7 → WT1 → SW441 feeder
  // after the generic clearance pass. The water source and WT1-CB were moved
  // into this order above, so each lead now takes a short, non-crossing path.
  if (tf12WaterSpur) {
    const { from, to } = connectionPoints(tf12WaterSpur);
    routes.set(tf12WaterSpur.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  if (wt1Source) {
    const { from, to } = connectionPoints(wt1Source);
    routes.set(wt1Source.id, orthogonalPoints([from, to]));
  }
  if (sw441Incoming) {
    const { from, to } = connectionPoints(sw441Incoming);
    routes.set(sw441Incoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // Recheck after the last presentation-specific lane adjustments. Cross-room
  // runs must pass around unrelated switchroom frames while retaining their
  // original model terminals and connections.
  const clearanceRoutingDiagnostics = resolveRoutesUntilStable(3);
  // Keep the separate SW443 Delta/Star LV cables on distinct approach lanes.
  // The D cable drops directly from its own source point before turning to
  // the Delta winding, so it does not share the Y cable's initial run.
  const sw443DeltaLv = model.connections.find(link => link.id === 'sw426:sw443:d:lv-cable');
  if (sw443DeltaLv) {
    const { from, to } = connectionPoints(sw443DeltaLv);
    routes.set(sw443DeltaLv.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // The SW431–SW435 ring enters from the left edge of the SW431 bus. Keep its
  // approach above the busbar, then drop outside the left end to its CB.
  const sw435ToSw431 = model.connections.find(link => link.id === 'sw435:sw431:bus-link');
  if (sw435ToSw431) {
    const { from, to } = connectionPoints(sw435ToSw431);
    const approachY = from[1] - 120;
    routes.set(sw435ToSw431.id, orthogonalPoints([from, [from[0], approachY], [to[0], approachY], to]));
  }
  // SW439's D cable and riser occupy the narrow lane west of the RM420 board.
  // Take the Y cable east first, turn west above MC420's bus, then drop between
  // the D lane and the busbar; this keeps both winding routes separate.
  const sw439StarLv = model.connections.find(link => link.id === 'sw426:sw439:y:lv-cable');
  const sw439DeltaLvRoute = routes.get('sw426:sw439:d:lv-cable');
  const mc420BusY = layout.assets['rm420:mc420:bus']?.[1];
  if (sw439StarLv && sw439DeltaLvRoute && mc420BusY !== undefined) {
    const { from, to } = connectionPoints(sw439StarLv);
    const yApproach = mc420BusY - 53;
    const dCableEndX = sw439DeltaLvRoute.at(-1)![0];
    const yDropX = Math.min(from[0] - 130, dCableEndX + 147);
    routes.set(sw439StarLv.id, orthogonalPoints([from, [from[0], yApproach], [yDropX, yApproach], [yDropX, to[1]], to]));
  }
  const sw439DeltaBreakerLabel = labels.get('sw426:sw439:d:in:cb');
  const sw439DeltaBreakerPosition = layout.assets['sw426:sw439:d:in:cb'];
  if (sw439DeltaBreakerLabel && sw439DeltaBreakerPosition) labels.set('sw426:sw439:d:in:cb', {
    ...sw439DeltaBreakerLabel,
    x: sw439DeltaBreakerPosition[0] - sw439DeltaBreakerLabel.width - 120,
  });
  // Keep the confirmed RM413→RM413A cable on the direct top-down approach.
  // Its earth switch is placed outside this approach lane above, so the cable
  // does not need the previous wide U-shaped detour around that device.
  const rm413Tf413Incoming = model.connections.find(link => link.id === 'rm413:tf413:incoming-cable');
  if (rm413Tf413Incoming) {
    const { from, to } = connectionPoints(rm413Tf413Incoming);
    routes.set(rm413Tf413Incoming.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // The RM420 TF420A earth branch leaves its switch terminal upward before
  // turning west, so it does not run on top of the first 12 units of the
  // separate transformer cable connection.
  // The SW435-side ring earth lead passes east of its SW431 interface label;
  // the final approach remains below the label and lands on the original
  // earth terminal.
  const sw435RingEarthFinal = model.connections.find(link => link.id === 'sw435:sw431:es:branch');
  if (sw435RingEarthFinal) {
    const { from, to } = connectionPoints(sw435RingEarthFinal);
    // The earth lead passes west of its interface label, below the tie's
    // approach, and avoids sharing the opposite-end earth lead's first span.
    const westLane = Math.min(from[0], to[0]) - 180;
    routes.set(sw435RingEarthFinal.id, orthogonalPoints([from, [westLane, from[1]], [westLane, to[1]], to]));
  }
  const sw426Tf430Cable = model.connections.find(link => link.id === 'sw426:tf430:hv-cable');
  if (sw426Tf430Cable) {
    const { from, to } = connectionPoints(sw426Tf430Cable);
    // This branch enters a dense RM420 cluster. Let the same obstacle-aware
    // resolver used elsewhere choose its local orthogonal lane after every
    // other presentation override has been applied.
    routes.set(sw426Tf430Cable.id, orthogonalPoints([from, to]));
    resolveRoutes(model, layout, labels, routes, hiddenIds, new Set([sw426Tf430Cable.id]), connectionPoints, panels);
  }
  // The RM418 breaker tail is a real three-way branch. Leave its common
  // junction through three different directions so the drawing shows a
  // single, unambiguous fan-out instead of stacked identical stubs.
  for (const id of ['wh:h7:tf418:input', 'wh:h7:tf418a:input']) {
    const connection = model.connections.find(link => link.id === id);
    if (!connection) continue;
    const { from, to } = connectionPoints(connection);
    if (id === 'wh:h7:tf418:input') {
      // Retain only the actual CB03 common stem to TF418A, then branch east
      // before the CB04 earth lead and drop below the MC418 bus corridor.
      const forkX = from[0] + 610;
      const approachY = to[1] - 120;
      routes.set(id, orthogonalPoints([from, [forkX, from[1]], [forkX, approachY], [to[0], approachY], to]));
    } else {
      const laneX = to[0];
      routes.set(id, orthogonalPoints([from, [laneX, from[1]], to]));
    }
  }
  // Keep the Norfolk marker as a short westward branch from pole 227. Its
  // first section must not duplicate either the eastbound backbone or the
  // southbound pole continuation.
  const norfolkTakeoffFinal = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:norfolk');
  if (norfolkTakeoffFinal) {
    const { to } = connectionPoints(norfolkTakeoffFinal);
    const pole = layout.terminals['line33:pole-227:port'];
    const branchLaneY = pole[1] - 20;
    routes.set(norfolkTakeoffFinal.id, orthogonalPoints([pole, [pole[0], branchLaneY], [to[0], branchLaneY], to]));
  }
  // Keep the HPGR incoming-earth lead above the adjacent SW438 cable's lower
  // vertical segment, then approach the earth switch from its own column.
  const hpgrIncomingEarth = model.connections.find(link => link.id === 'hpgr:sw002:a01:q8:branch');
  if (hpgrIncomingEarth) {
    const { from, to } = connectionPoints(hpgrIncomingEarth);
    // Leave the shared cable terminal to the west, opposite the SW435 earth
    // lead. A west-side A01 position keeps this short branch out of both the
    // feeder riser and the nearby earth-switch label.
    routes.set(hpgrIncomingEarth.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  const hpgrCbToJunctionBox = model.connections.find(link => link.id === 'hpgr:cable-SW438-P-01');
  if (hpgrCbToJunctionBox) {
    const { from, to } = connectionPoints(hpgrCbToJunctionBox);
    routes.set(hpgrCbToJunctionBox.id, orthogonalPoints([from, to]));
  }
  const hpgrJunctionBoxToTransformer = model.connections.find(link => link.id === 'hpgr:cable-TF001-P-01');
  if (hpgrJunctionBoxToTransformer) {
    const { from, to } = connectionPoints(hpgrJunctionBoxToTransformer);
    routes.set(hpgrJunctionBoxToTransformer.id, orthogonalPoints([from, to]));
  }
  // Approach the Hopper10 Y and Delta LV winding terminals from outside their
  // motor-feeder columns so the LV cables do not cross the RC/FC bus-fuse runs.
  const rm420StarLv = model.connections.find(link => link.id === 'sw426:sw439:y:lv-cable');
  if (rm420StarLv) {
    const { from, to } = connectionPoints(rm420StarLv);
    const laneX = Math.min(from[0], to[0]) - 180;
    routes.set(rm420StarLv.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const rm420DeltaLv = model.connections.find(link => link.id === 'sw426:sw443:d:lv-cable');
  if (rm420DeltaLv) {
    const { from, to } = connectionPoints(rm420DeltaLv);
    const laneX = Math.min(from[0], to[0]) - 100;
    routes.set(rm420DeltaLv.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const sw429StarLv = model.connections.find(link => link.id === 'sw426:sw429:y:lv-cable');
  if (sw429StarLv) {
    const { from, to } = connectionPoints(sw429StarLv);
    // Use a dedicated west-side lane so the Y cable clears the Delta breaker,
    // bus link and parallel winding cable at every zoom level.
    const laneX = Math.min(from[0], to[0]) - 180;
    routes.set(sw429StarLv.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const rm410ToRm419 = model.connections.find(link => link.id === 'rm410:sw04-rm419');
  if (rm410ToRm419) {
    const { from, to } = connectionPoints(rm410ToRm419);
    // Keep the RM410→RM419 ring west of the SW435 risers. The direct receiving
    // column collides with the neighboring SW453 feeder cable, so use a
    // separate parallel approach lane.
    const laneX = from[0] - 180;
    routes.set(rm410ToRm419.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  const sw431RingLabel = labels.get('sw431:interface:sw435');
  if (sw431RingLabel) labels.set('sw431:interface:sw435', {
    ...sw431RingLabel,
    x: sw431RingLabel.x - sw431RingLabel.width - 60,
  });
  // All presentation-specific routes and label adjustments are complete.
  // Resolve the whole diagram last so no hand-authored route can reintroduce
  // a crossing, shared run, or collision with a label, symbol, busbar, or
  // unrelated switchroom frame.
  const finalRoutingDiagnostics = resolveRoutesUntilStable(3);
  const finalSw429StarLv = model.connections.find(link => link.id === 'sw426:sw429:y:lv-cable');
  if (finalSw429StarLv) {
    const { from, to } = connectionPoints(finalSw429StarLv);
    const laneX = Math.min(from[0], to[0]) - 180;
    routes.set(finalSw429StarLv.id, orthogonalPoints([from, [laneX, from[1]], [laneX, to[1]], to]));
  }
  // The RM413 IN02 cable-side double boot is a true two-way branch. The
  // RM417 continuation leaves downward/left; take RM413A sideways/right
  // before dropping to its bus so the shared terminal is drawn only once.
  const rm413aDoubleBoot = model.connections.find(link => link.id === 'rm413:double-boot-rm413a');
  if (rm413aDoubleBoot) {
    const { from, to } = connectionPoints(rm413aDoubleBoot);
    routes.set(rm413aDoubleBoot.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  // SW454 and SW451 are separate SW411 feeder branches. Drop each link below
  // the outgoing feeder bank before crossing toward its receiving room; their
  // distinct corridor rows keep the two long top-down routes from appearing
  // as one shared conductor or crossing tier04/tie wiring.
  const sw411FeederBankIds = model.connections
    .filter(link => /^sw411:tier-(?:01|02|03|04|13|14|15|16):/.test(link.id))
    .map(link => link.id);
  const feederBankBottom = Math.max(0, ...sw411FeederBankIds.flatMap(id => routes.get(id)?.map(point => point[1]) ?? []));
  for (const [index, id] of ['whole:join:sw454', 'whole:join:sw451'].entries()) {
    const link = model.connections.find(candidate => candidate.id === id);
    if (!link) continue;
    const { from, to } = connectionPoints(link);
    // Keep both drops below the SW411 feeder bank, but clear the Hopper10
    // frame whose top edge sits just below the second feeder corridor.
    const laneY = Math.max(from[1] + 220, feederBankBottom + 220 + index * 160);
    if (laneY < to[1] - 120) routes.set(id, orthogonalPoints([from, [from[0], laneY], [to[0], laneY], to]));
  }
  // Re-run the obstacle and wire planner after every final manually separated
  // route above; no authored route may bypass the gate.
  finalRoutingDiagnostics.push(...resolveRoutesUntilStable(3));
  // Keep the RM410 converter cable's final riser west of the adjacent SW435
  // bus-earth drop, then enter the converter terminal from below.
  const rm410VsInputA = model.connections.find(link => link.id === 'rm410:vs4101:input-a:winding-cable');
  if (rm410VsInputA) {
    const { from, to } = connectionPoints(rm410VsInputA);
    const approachY = from[1] + 32;
    const laneX = to[0] + 100;
    routes.set(rm410VsInputA.id, orthogonalPoints([from, [from[0], approachY], [laneX, approachY], [laneX, to[1]], to]));
  }
  // The RM714 incoming earth is a branch off its cable-side terminal. Fan it
  // out horizontally before dropping to the earth switch so it is not drawn
  // on top of the incoming cable itself.
  const rm714In01Earth = model.connections.find(link => link.id === 'rm714:in01:es:branch');
  if (rm714In01Earth) {
    const { from, to } = connectionPoints(rm714In01Earth);
    routes.set(rm714In01Earth.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  // The Desands frame has been moved clear of this cable's direct vertical
  // corridor, so keep the H8 incoming link on that short top-down path.
  const finalH8Rm406Cable = model.connections.find(link => link.id === 'wh:h8:rm406-cable');
  if (finalH8Rm406Cable) {
    const { from, to } = connectionPoints(finalH8Rm406Cable);
    routes.set(finalH8Rm406Cable.id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  // Fan the Hopper 9 motor earth vertically from its modeled common terminal.
  // The previous horizontal approach reused 140 units of the FC common cable.
  const h9Mc419M1Earth = model.connections.find(link => link.id === 'wh:h9:mc419:m1:earth:branch');
  if (h9Mc419M1Earth) {
    const { from, to } = connectionPoints(h9Mc419M1Earth);
    const laneY = from[1] - 140;
    const laneX = to[0] + 300;
    routes.set(h9Mc419M1Earth.id, orthogonalPoints([from, [from[0], laneY], [laneX, laneY], [laneX, to[1]], to]));
  }
  const h8Mc416M2Earth = model.connections.find(link => link.id === 'wh:h8:mc416:m2:earth:branch');
  if (h8Mc416M2Earth) {
    const { from, to } = connectionPoints(h8Mc416M2Earth);
    const laneY = from[1] - 140;
    const laneX = to[0] + 300;
    routes.set(h8Mc416M2Earth.id, orthogonalPoints([from, [from[0], laneY], [laneX, laneY], [laneX, to[1]], to]));
  }
  // The TF435 feeder earth lead crosses the adjacent RM410 input-B switch
  // symbol on its direct run. Step west of the cable riser, rise above the
  // switch, then cross its x column and return to the earth lead terminal.
  const sw435Tf435Earth = model.connections.find(link => link.id === 'sw435:tf435:hv-es:branch');
  const rm410InputBSwitch = layout.assets['rm410:vs4101:input-b:switch'];
  if (sw435Tf435Earth && rm410InputBSwitch) {
    const { from, to } = connectionPoints(sw435Tf435Earth);
    const aboveSwitchY = rm410InputBSwitch[1] - 72;
    const sideStepX = from[0] - 72;
    routes.set(sw435Tf435Earth.id, orthogonalPoints([
      from,
      [sideStepX, from[1]],
      [sideStepX, aboveSwitchY],
      [to[0], aboveSwitchY],
      to,
    ]));
  }
  // Carry the SW439 D-phase LV lead below and west of TF439's earth-switch
  // symbol and its branch. The short default dogleg passed through the ES
  // graphic; the previous north-side lane crossed the earth lead.
  const sw439DeltaLvCable = model.connections.find(link => link.id === 'sw426:sw439:d:lv-cable');
  const sw439DeltaEarth = layout.assets['sw426:tf439:es'];
  if (sw439DeltaLvCable && sw439DeltaEarth) {
    const { from, to } = connectionPoints(sw439DeltaLvCable);
    const belowEarthY = sw439DeltaEarth[1] + 80;
    const westEarthX = sw439DeltaEarth[0] - 72;
    routes.set(sw439DeltaLvCable.id, orthogonalPoints([
      from,
      [from[0], belowEarthY],
      [westEarthX, belowEarthY],
      [westEarthX, to[1]],
      to,
    ]));
  }
  const finalSw505Feed = model.connections.find(link => link.id === 'sw454:sw505:cable-SW505-P-01');
  if (finalSw505Feed) {
    const { from, to } = connectionPoints(finalSw505Feed);
    const trainLoadingFrame = panels.find(panel => panel.id === 'train-loading/hv');
    const sourceRoomFrame = panels.find(panel => panel.id === 'stockpile/stockpile-hv');
    const sourceRoomMembers = new Set([
      ...(sourceRoomFrame?.assetIds ?? []),
      ...(sourceRoomFrame?.memberAssetIds ?? []),
    ]);
    const internalSourceRouteBottom = model.connections
      .filter(link => sourceRoomMembers.has(owners.get(link.from)!) && sourceRoomMembers.has(owners.get(link.to)!))
      .flatMap(link => routes.get(link.id) ?? [])
      .reduce((bottom, point) => Math.max(bottom, point[1]), from[1]);
    const leaveSourceRoomX = sourceRoomFrame
      ? sourceRoomFrame.x - 240
      : from[0] - 800;
    const clearOfFramesY = Math.max(
      from[1] + 600,
      internalSourceRouteBottom + 240,
      (trainLoadingFrame ? trainLoadingFrame.y + trainLoadingFrame.height : from[1]) + 240,
      (sourceRoomFrame ? sourceRoomFrame.y + sourceRoomFrame.height : from[1]) + 240,
    );
    if (layoutStrategy === 'sw505-corridor-candidate') {
      const rm410Frame = panels.find(panel => panel.id === 'cv006/rm410-hv');
      const sw435Frame = panels.find(panel => panel.id === 'crushing-2/sw435-hv');
      const corridorY = rm410Frame && sw435Frame
        ? (rm410Frame.y + rm410Frame.height + sw435Frame.y) / 2
        : undefined;
      const westRiserX = sourceRoomFrame ? sourceRoomFrame.x - 700 : from[0] - 1_000;
      const eastRiserX = to[0] + 500;
      routes.set(finalSw505Feed.id, orthogonalPoints(corridorY === undefined ? [from, [westRiserX, from[1]], [westRiserX, clearOfFramesY], [eastRiserX, clearOfFramesY], [eastRiserX, to[1]], to] : [
        from,
        [westRiserX, from[1]],
        [westRiserX, corridorY],
        [eastRiserX, corridorY],
        [eastRiserX, to[1]],
        to,
      ]));
    } else {
      routes.set(finalSw505Feed.id, orthogonalPoints([
        from,
        [leaveSourceRoomX, from[1]],
        [leaveSourceRoomX, clearOfFramesY],
        [to[0], clearOfFramesY],
        to,
      ]));
    }
  }
  const cv006Pole17To49 = model.connections.find(link => link.id === 'cv006:pole17-pole49');
  if (cv006Pole17To49) {
    const { from, to } = connectionPoints(cv006Pole17To49);
    const sw411Overview = panels.find(panel => panel.id === 'sw411/overview');
    const westGutterX = sw411Overview ? sw411Overview.x - 240 : Math.min(from[0], to[0]) - 1_000;
    const upstreamFeederDrops = ['whole:join:sw454', 'whole:join:sw451'];
    const feederDropBottoms = upstreamFeederDrops.flatMap(id => {
      const points = routes.get(id) ?? [];
      return points.slice(1).flatMap((point, index) => {
        const previous = points[index];
        return previous[0] === point[0] && previous[0] < from[0] && previous[0] > westGutterX
          ? [Math.max(previous[1], point[1])]
          : [];
      });
    });
    const leaveOverviewY = Math.max(from[1] + 600, ...feederDropBottoms) + 240;
    const motorEarthRouteIds = ['rm420:mc420:motor-01:es:branch', 'rm420:mc420:motor-02:es:branch'];
    const motorEarthVerticals = motorEarthRouteIds.flatMap(id => {
      const points = routes.get(id) ?? [];
      return points.slice(1).flatMap((point, index) => {
        const previous = points[index];
        const overlapsApproach = Math.max(Math.min(previous[1], point[1]), to[1] - 250)
          <= Math.min(Math.max(previous[1], point[1]), to[1] + 250);
        return previous[0] === point[0] && overlapsApproach ? [point[0]] : [];
      });
    });
    const motorContactRouteIds = [
      'rm420:mc420:motor-01:rc:contact-motor',
      'rm420:mc420:motor-01:fc:contact-motor',
      'rm420:mc420:motor-02:rc:contact-motor',
      'rm420:mc420:motor-02:fc:contact-motor',
    ];
    const motorContactTops = motorContactRouteIds
      .flatMap(id => routes.get(id) ?? [])
      .map(point => point[1]);
    const approachY = (motorContactTops.length ? Math.min(...motorContactTops) : to[1] - 600) - 200;
    const approachX = Math.max(to[0], ...motorEarthVerticals) + 240;
    routes.set(cv006Pole17To49.id, orthogonalPoints([
      from,
      [from[0], leaveOverviewY],
      [westGutterX, leaveOverviewY],
      [westGutterX, approachY],
      [approachX, approachY],
      [approachX, to[1]],
      to,
    ]));
  }
  // Rebuild the three Hopper3 supply paths after all placements, using their
  // final terminals: one vertical RM417→HV416 trunk and two downward branches.
  if (hopperThreeCable) {
    const { from, to } = connectionPoints(hopperThreeCable);
    routes.set(hopperThreeCable.id, orthogonalPoints([from, to]));
  }
  if (hopperThreeTf416Input) {
    const { from, to } = connectionPoints(hopperThreeTf416Input);
    routes.set(hopperThreeTf416Input.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  if (hopperThreeTf416aInput) {
    const { from, to } = connectionPoints(hopperThreeTf416aInput);
    routes.set(hopperThreeTf416aInput.id, orthogonalPoints([from, [to[0], from[1]], to]));
  }
  const mc416aJunction = layout.terminals['wh:h3:mc416a:interface:port'];
  if (mc416aJunction) {
    const mcIncoming = model.connections.find(link => link.id === 'ep:h3:mc416a:incoming');
    if (mcIncoming) {
      const { to } = connectionPoints(mcIncoming);
      routes.set(mcIncoming.id, orthogonalPoints([mc416aJunction, [mc416aJunction[0], to[1]], to]));
    }
    const mcSupply = model.connections.find(link => link.id === 'wh:h3:mc416a:interface:supply');
    if (mcSupply) {
      const { from } = connectionPoints(mcSupply);
      routes.set(mcSupply.id, orthogonalPoints([from, [from[0], mc416aJunction[1]], mc416aJunction]));
    }
  }
  const h7Junction = layout.terminals['wh:h7:rm418:cb03:disconnect:b'];
  const h7Tf418a = model.connections.find(link => link.id === 'wh:h7:tf418a:input');
  if (h7Junction && h7Tf418a) {
    const { to } = connectionPoints(h7Tf418a);
    const upperLane = h7Junction[1] - 200;
    // Keep the return leg to the right of RM413A Q1's label box. The route
    // exits north from the shared CB03 terminal, away from TF418's eastbound
    // feed and the CB03 earth lead, then approaches TF418A from the label-free
    // side while staying inside the existing RM413A frame.
    const q1Label = labels.get('rm413a:q1');
    const innerLane = Math.max(
      h7Junction[0] + 270,
      (q1Label?.x ?? h7Junction[0]) + (q1Label?.width ?? 0) + 68,
    );
    routes.set(h7Tf418a.id, orthogonalPoints([
      h7Junction,
      [h7Junction[0], upperLane],
      [innerLane, upperLane],
      [innerLane, to[1]],
      to,
    ]));
  }
  const h7Tf418 = model.connections.find(link => link.id === 'wh:h7:tf418:input');
  if (h7Junction && h7Tf418 && h7Tf418a) {
    const { to } = connectionPoints(h7Tf418);
    const tf418aTarget = connectionPoints(h7Tf418a).to;
    const forkX = h7Junction[0] + 610;
    const tf418aPosition = layout.assets['wh:h7:tf418a'];
    const branchY = (tf418aPosition?.[1] ?? tf418aTarget[1]) + 120;
    const approachY = to[1] - 120;
    // Drop the TF418 main branch below TF418A's return endpoint before
    // heading east. This avoids crossing that return lane at the CB03 tee.
    routes.set(h7Tf418.id, orthogonalPoints([
      h7Junction,
      [h7Junction[0], branchY],
      [forkX, branchY],
      [forkX, approachY],
      [to[0], approachY],
      to,
    ]));
  }
  const pole227 = layout.terminals['line33:pole-227:port'];
  const line214to227 = model.connections.find(link => link.id === 'line33:214-to-227');
  if (pole227 && line214to227) {
    const { from } = connectionPoints(line214to227);
    routes.set(line214to227.id, orthogonalPoints([from, [from[0], pole227[1]], pole227]));
  }
  const pole227Norfolk = model.connections.find(link => link.id === 'owner-scope:line33:takeoff:norfolk');
  if (pole227 && pole227Norfolk) {
    const { to } = connectionPoints(pole227Norfolk);
    const laneY = pole227[1] - 20;
    routes.set(pole227Norfolk.id, orthogonalPoints([pole227, [pole227[0], laneY], [to[0], laneY], to]));
  }
  // The spare continuation connections end below each breaker output. Use a
  // direct short orthogonal drop from that output to its own marker.
  for (const id of ['sw451:spare-6:continuation', 'sw451:spare-7:continuation']) {
    const connection = model.connections.find(link => link.id === id);
    if (!connection) continue;
    const { from, to } = connectionPoints(connection);
    routes.set(id, orthogonalPoints([from, [from[0], to[1]], to]));
  }
  applyMeasuredRouteCrossingDetours(routes);
  if (layoutStrategy === 'production' || layoutStrategy === 'crossing-optimizer-candidate') {
    // Freeze room and asset coordinates. Select only the horizontal members of
    // proper connector crossings; `resolveRoutes` reserves all other routes as
    // fixed geometry and the orthogonal planner preserves each endpoint.
    const crossingRoutes = crossingRouteIds(model.connections, routes);
    finalRoutingDiagnostics.push(...resolveRoutesUntilStable(4, crossingRoutes, {
      clearance: 24,
      maxLocalSearchPadding: 4096,
      maxSearchAttempts: 4,
      maxGridNodes: 50_000,
    }));
  }
  // Keep SW505 and the SW426/RM714 cluster in compact top-down positions.
  // These are presentation-only translations after routing is complete, so
  // they cannot alter source order or electrical connectivity. Each receiving
  // room is moved with its tested asset set and only its confirmed boundary
  // route is redrawn.
  const sw505SourceFrame = panels.find(panel => panel.id === 'stockpile/stockpile-hv');
  const sw505TargetFrame = panels.find(panel => panel.id === 'stockpile/wet-hv');
  if (sw505SourceFrame && sw505TargetFrame) {
    const moved = new Set(sw505TargetFrame.memberAssetIds ?? sw505TargetFrame.assetIds);
    const targetX = sw505SourceFrame.x + (sw505SourceFrame.width - sw505TargetFrame.width) / 2;
    const targetY = sw505SourceFrame.y + sw505SourceFrame.height + 640;
    const delta: Point = [targetX - sw505TargetFrame.x, targetY - sw505TargetFrame.y];
    for (const id of moved) {
      const position = layout.assets[id];
      if (position) layout.assets[id] = [position[0] + delta[0], position[1] + delta[1]];
      const asset = byId.get(id);
      for (const terminal of asset?.terminals ?? []) {
        const point = layout.terminals[terminal];
        if (point) layout.terminals[terminal] = [point[0] + delta[0], point[1] + delta[1]];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + delta[0], y: label.y + delta[1] });
    }
    sw505TargetFrame.x = targetX;
    sw505TargetFrame.y = targetY;

    const external = model.connections.filter(link => moved.has(owners.get(link.from) ?? '') !== moved.has(owners.get(link.to) ?? ''));
    if (external.length !== 1 || external[0]?.id !== 'sw454:sw505:cable-SW505-P-01') {
      throw new Error(`SW505 presentation move expected one SW454 boundary cable; found ${external.map(link => link.id).join(', ')}`);
    }
    {
      const boundary = external[0];
      for (const link of model.connections) {
        const bothMoved = moved.has(owners.get(link.from) ?? '') && moved.has(owners.get(link.to) ?? '');
        if (!bothMoved || link.id === boundary.id) continue;
        const points = routes.get(link.id);
        if (points) routes.set(link.id, points.map(([x, y]) => [x + delta[0], y + delta[1]] as Point));
      }
      const endpointOwners = [owners.get(boundary.from)!, owners.get(boundary.to)!];
      const ignoredObstacleIds = [
        `symbol:${endpointOwners[0]}`, `symbol:${endpointOwners[1]}`,
        `label:${endpointOwners[0]}`, `label:${endpointOwners[1]}`,
        `frame:${sw505SourceFrame.id}`, `frame:${sw505TargetFrame.id}`,
      ];
      const request = {
        id: boundary.id,
        from: layout.terminals[boundary.from],
        to: layout.terminals[boundary.to],
        fromTerminalId: boundary.from,
        toTerminalId: boundary.to,
        preferDown: true,
        order: 0,
        ignoredObstacleIds,
      };
      const reservedRoutes: ReservedRoute[] = [...routes]
        .filter(([id]) => id !== boundary.id)
        .map(([id, points]) => {
          const link = model.connections.find(candidate => candidate.id === id)!;
          return { id, points, fromTerminalId: link.from, toTerminalId: link.to };
        });
      const symbolObstacles = assets.map(asset => {
        const [x, y] = layout.assets[asset.id];
        return { id: `symbol:${asset.id}`, x: x - 38, y: y - 38, width: 76, height: 76 };
      });
      const labelObstacles = [...labels].map(([id, box]) => ({ id: `label:${id}`, ...box }));
      const frameObstacles = panels.map(panel => ({ id: `frame:${panel.id}`, x: panel.x, y: panel.y, width: panel.width, height: panel.height }));
      const plan = planOrthogonalRoutes([request], {
        obstacles: [...symbolObstacles, ...labelObstacles, ...frameObstacles],
        reservedRoutes,
        clearance: 16,
        localSearchPadding: 1_000,
        maxLocalSearchPadding: 18_000,
        maxSearchAttempts: 5,
        maxGridNodes: 80_000,
        bendPenalty: 180,
      });
      const replacement = plan.routes.get(boundary.id);
      if (!replacement) throw new Error(`SW505 boundary cable could not be rerouted after room placement: ${plan.unresolved[0]?.reason ?? 'no path'}`);
      routes.set(boundary.id, replacement.map(([x, y]) => [x, y] as Point));
    }
  }

  // Route and room placement overrides above can make an earlier resolved
  // label choice stale. Re-check labels against the final routes and frames
  // before computing the view bounds.
  resolveAssetLabels(assets, layout, labels, routes, panels, hiddenIds);
  const points = [...Object.values(layout.assets), ...[...routes.values()].flat()];
  const minX = Math.min(...points.map(p => p[0])) - 100; const minY = Math.min(...points.map(p => p[1])) - 150;
  const maxX = Math.max(...points.map(p => p[0]), ...[...labels.values()].map(label => label.x + label.width)) + 100;
  const maxY = Math.max(...points.map(p => p[1]), ...[...labels.values()].map(label => label.y + label.height)) + 150;
  const referenceBounds = references.length ? (() => {
    const left = Math.min(...references.map(asset => Math.min(layout.assets[asset.id][0] - 120, labels.get(asset.id)!.x - 20)));
    const right = Math.max(...references.map(asset => Math.max(layout.assets[asset.id][0] + 140, labels.get(asset.id)!.x + labels.get(asset.id)!.width + 20)));
    const top = mainBottom - 135;
    const bottom = Math.max(...references.map(asset => Math.max(layout.assets[asset.id][1] + 150, labels.get(asset.id)!.y + labels.get(asset.id)!.height + 24)));
    return { x: left, y: top, width: right - left, height: bottom - top };
  })() : undefined;
  // Interface markers are hidden after whole-network links are composed; their
  // labels are not diagram labels and should not affect the visible layout.
  for (const id of hiddenIds) labels.delete(id);
  const view: DiagramView = { id: 'continuous-network', label: 'Whole network · downward supply tree', assetIds: assets.map(asset => asset.id), layout, bounds: [minX, minY, maxX - minX, maxY - minY] };
  return { view, assets, connections: model.connections, owners, labels, routes, panels, hiddenIds, inlineIds, referenceTop: references.length ? mainBottom : undefined, referenceLabel: 'Drawing references without network connections', referenceBounds, referenceIds: references.map(asset => asset.id), treeEdgeIds, preSpurRoutingDiagnostics, clearanceRoutingDiagnostics, finalRoutingDiagnostics };
}
