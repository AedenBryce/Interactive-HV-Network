import type { Asset } from '../session/model';
import type { Point } from './diagram-geometry';
import type { EditableGeometry } from './layout-edit';

/** Draw each shared electrical bus once, with vertical taps at its devices.
 * Coordinates and terminal orientation only; electrical identities never change.
 */
export function switchroomBuses<T extends Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] }>(geometry: T, tight = false): T {
  const layout = { ...geometry.view.layout, assets: { ...geometry.view.layout.assets }, terminals: { ...geometry.view.layout.terminals },
    rotations: { ...geometry.view.layout.rotations }, busSpans: { ...geometry.view.layout.busSpans } };
  const labels = new Map(geometry.labels), routes = new Map(geometry.routes);
  const byId = new Map(geometry.assets.map(asset => [asset.id, asset]));
  const busRooms = new Map((geometry.panels ?? []).flatMap(panel => [...(panel.memberAssetIds ?? panel.assetIds)].filter(id => byId.get(id)?.kind === 'bus').map(id => [id, panel] as const)));
  const roomBuses = new Set((geometry.panels ?? []).flatMap(panel => [...(panel.memberAssetIds ?? panel.assetIds)]).filter(id => byId.get(id)?.kind === 'bus'));
  const links = geometry.connections.flatMap(link => {
    const from = geometry.owners.get(link.from)!, to = geometry.owners.get(link.to)!;
    const bus = roomBuses.has(from) ? from : roomBuses.has(to) ? to : undefined;
    if (!bus) return [];
    const peer = byId.get(bus === from ? to : from)!;
    const panel = busRooms.get(bus)!;
    if (!(panel.memberAssetIds ?? panel.assetIds).includes(peer.id)) return [];
    if (peer.kind === 'earth-switch' || peer.kind === 'bus') return [];
    return [{ link, bus, peer, busFrom: bus === from, terminal: bus === from ? link.to : link.from }];
  });
  const changed = new Set<string>();
  const flip = (asset: Asset) => {
    const cy = layout.assets[asset.id][1];
    for (const terminal of asset.terminals) {
      const p = layout.terminals[terminal];
      layout.terminals[terminal] = [p[0], 2 * cy - p[1]];
      changed.add(terminal);
    }
  };
  for (const { bus, peer, terminal } of links) {
    // A tie between two bus sections keeps its horizontal ports.
    if (links.filter(item => item.peer.id === peer.id).length > 1) continue;
    const center = layout.assets[peer.id], port = layout.terminals[terminal], y = layout.assets[bus][1];
    if (Math.abs(port[0] - center[0]) < 1 && port[1] !== center[1]
      && (port[1] - center[1]) * (y - center[1]) < 0) flip(peer);
  }
  // These two source-reviewed transformers were drawn with their primary at
  // the bottom. Use the recorded forward arc to face the supply upward.
  for (const id of ['wh:h3:tf416', 'wh:h8:tf416']) {
    const asset = byId.get(id);
    const forward = asset?.sourceArcs?.find(arc => arc.knowledge === 'owner-confirmed' && arc.id.includes(':forward-'));
    if (asset && forward && layout.terminals[forward.from][1] > layout.terminals[forward.to][1]) flip(asset);
  }
  for (const link of geometry.connections) {
    if (!changed.has(link.from) && !changed.has(link.to)) continue;
    const a = layout.terminals[link.from], b = layout.terminals[link.to];
    routes.set(link.id, a[0] === b[0] || a[1] === b[1] ? [a, b] : [a, [b[0], a[1]], b]);
  }
  for (const id of roomBuses) {
    const bus = byId.get(id)!, taps = links.filter(item => item.bus === id);
    const ordinary = taps.filter(item => links.filter(other => other.peer.id === item.peer.id).length === 1);
    if (!ordinary.length) continue;
    const old = layout.assets[id], y = old[1], xs = ordinary.map(item => layout.terminals[item.terminal][0]);
    const span = layout.busSpans[id] ?? 60;
    const left = Math.min(...(tight ? [] : [old[0] - span / 2]), ...xs.map(x => x - 30));
    const right = Math.max(...(tight ? [] : [old[0] + span / 2]), ...xs.map(x => x + 30));
    const x = (left + right) / 2;
    layout.assets[id] = [x, y]; layout.rotations[id] = 90; layout.busSpans[id] = right - left;
    for (const terminal of bus.terminals) layout.terminals[terminal] = [layout.terminals[terminal][0] + x - old[0], layout.terminals[terminal][1]];
    const label = labels.get(id);
    if (label) labels.set(id, { ...label, x: label.x + x - old[0] });
    for (const { link, terminal, busFrom } of ordinary) {
      const p = layout.terminals[terminal], tap: Point = [p[0], y];
      routes.set(link.id, busFrom ? [tap, p] : [p, tap]);
    }
  }
  const section=byId.get('sw451:mc451b:section'),main=layout.assets['sw451:mc451:bus'];
  if(section&&main){
    const old=layout.assets[section.id],next:Point=[main[0],old[1]];
    layout.assets[section.id]=next;layout.rotations[section.id]=90;layout.busSpans[section.id]=layout.busSpans['sw451:mc451:bus']??300;
    for(const t of section.terminals)layout.terminals[t]=next;
    const label=labels.get(section.id);if(label)labels.set(section.id,{...label,x:label.x+next[0]-old[0]});
    const bridge=geometry.connections.find(c=>section.terminals.includes(c.from)||section.terminals.includes(c.to));
    if(bridge){const a=layout.terminals[bridge.from],b=layout.terminals[bridge.to];routes.set(bridge.id,[a,[a[0],b[1]],b]);}
  }
  // The RM419 onward ring leaves the outgoing bay below its bus and passes
  // outside the intervening motor board, rather than through that board.
  const ring = geometry.connections.find(link => link.id === 'wh:h9-to-h7:cable');
  if (ring) {
    const a = layout.terminals[ring.from], b = layout.terminals[ring.to];
    const rooms = geometry.panels?.filter(panel => ['western/h9-rmu', 'western/h9-hv', 'western/h7-rmu'].includes(panel.id));
    if (rooms?.length) {
      const x = Math.min(...rooms.map(panel => panel.x)) - 180;
      routes.set(ring.id, [a, [x, a[1]], [x, b[1]], b]);
    }
  }
  return { ...geometry, view: { ...geometry.view, layout }, labels, routes };
}

