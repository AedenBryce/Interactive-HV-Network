import { applyLineRoutes } from './line-routing';
import { withFinalBoardFrames } from './final-board-frames';
import { transformerPortLayout } from './transformer-port-layout';
import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import baseline from '../../docs/goals/hv-layout-baseline.json';
import { loadAuthoredLayout, modelFingerprint } from './authored-layout-loader';
import type { AuthoredSchematic } from './authored-schematic';
import savedDrawing from '../models/site/authored-network.json';
import { applyLayoutEdits } from './layout-edit';
import { compactEquipmentLabel, healthyFuseState, isFuse } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import { isObsoleteReference } from './obsolete-references';
import { switchroomBuses } from './switchroom-buses';
import { initialLayoutReview } from './layout-review';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EquipmentSymbol } from './EquipmentSymbol';
import { threePositionContacts } from './three-position-contacts';
import { applyBusTakeoffs, drawingBusEarthMoves, centredBusEarthMoves, busEarthPairs, busEndClearance } from './bus-earth-layout';
import { condensePositions, enlargeLabels, fitCompactFrames } from './compact-presentation';

const incomplete = (): AuthoredSchematic => ({ schemaVersion: 1, modelId: currentNetworkModel.id,
  modelVersion: currentNetworkModel.version, topologyFingerprint: baseline.topologySha256,
  modelFingerprint: baseline.modelSha256, status: 'external-routing-pending',
  identities: { assets: [], connections: [] }, modules: [], externalRoutes: {} });

describe('saved authored drawing loader', () => {
  it('condenses actual asset positions by 15% without changing equipment, connection IDs or label dimensions', async () => {
    const base = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const review = initialLayoutReview({ modelId: currentNetworkModel.id, modelVersion: currentNetworkModel.version, layoutRevision: savedDrawing.layoutRevision }, base.assets.map(asset => asset.id), base.panels.map(panel => panel.id));
    const before = switchroomBuses(applyLayoutEdits(base, review.edits));
    const compact = condensePositions(before, review.edits);
    const after = switchroomBuses(applyLayoutEdits(base, compact.edits), true);
    for (const asset of after.assets.filter(asset => asset.kind !== 'bus' && !base.hiddenIds?.has(asset.id))) {
      expect(after.view.layout.assets[asset.id][0], asset.id).toBeCloseTo(before.view.layout.assets[asset.id][0] * .85, 5);
      expect(after.view.layout.assets[asset.id][1], asset.id).toBeCloseTo(before.view.layout.assets[asset.id][1] * .85, 5);
      expect(after.labels.get(asset.id)!.width).toBe(before.labels.get(asset.id)!.width);
    }
    expect(after.assets).toBe(base.assets); expect(after.connections).toBe(base.connections);
    for (const points of Object.values(compact.routes)) for (let i = 1; i < points.length; i++) expect(points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1]).toBe(true);
    const large = enlargeLabels(after, 2, 4);
    for (const [id, label] of large.labels) { expect(label.width, id).toBeGreaterThan(0); expect(label.lines.length, id).toBeGreaterThan(0); }
  });
  it('leaves at least 120 units between bus ends and their outermost non-earth tap', async () => {
    const base = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const geometry = busEndClearance(switchroomBuses(base));
    const assets = new Map(geometry.assets.map(asset => [asset.id, asset]));
    for (const connection of geometry.connections) {
      const from = assets.get(geometry.owners.get(connection.from)!)!, to = assets.get(geometry.owners.get(connection.to)!)!;
      const bus = from.kind === 'bus' ? from : to.kind === 'bus' ? to : undefined;
      const peer = bus === from ? to : from;
      if (!bus || peer.kind === 'earth-switch') continue;
      const route = geometry.routes.get(connection.id)!, tap = bus === from ? route[0] : route.at(-1)!;
      const axis = geometry.view.layout.rotations?.[bus.id] === 90 ? 0 : 1;
      expect(geometry.view.layout.busSpans![bus.id] / 2 - Math.abs(tap[axis] - geometry.view.layout.assets[bus.id][axis]), bus.id).toBeGreaterThanOrEqual(119.999);
    }
    expect(busEndClearance(geometry).view.layout.busSpans).toEqual(geometry.view.layout.busSpans);
  });
  it('centres all directly bus-connected earth takeoffs and aligns them with the local earth-switch row', async () => {
    const base = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const geometry = switchroomBuses(base), moves = centredBusEarthMoves(geometry);
    expect(moves).toHaveLength(13);
    const input = { assets: Object.fromEntries(moves.map(move => [move.assetId, move.delta])), rooms: {} };
    const positioned = switchroomBuses(applyLayoutEdits(geometry, input));
    const after = applyBusTakeoffs(positioned, Object.fromEntries(moves.map(move => [move.connectionId, move.fraction])));
    expect(Math.abs(after.view.layout.assets['rm412:e100'][0] - after.view.layout.assets['rm412:e101'][0])).toBeGreaterThanOrEqual(650);
    for (const move of moves) {
      expect(move.fraction).toBeGreaterThanOrEqual(.15);
      expect(move.fraction).toBeLessThanOrEqual(.85);
      expect(after.view.layout.assets[move.assetId][1], move.assetId).toBeCloseTo(move.row);
      const pair = busEarthPairs(after).find(pair => pair.connection.id === move.connectionId)!;
      const route = after.routes.get(move.connectionId)!;
      const tap = pair.busFrom ? route[0] : route.at(-1)!;
      expect(tap[1], move.assetId).toBe(after.view.layout.assets[pair.bus.id][1]);
      expect(route.length, move.assetId).toBeLessThanOrEqual(3);
      for (let i = 1; i < route.length; i++) expect(route[i][0] === route[i - 1][0] || route[i][1] === route[i - 1][1]).toBe(true);
    }
    expect(after.connections).toBe(base.connections);
    expect(after.assets).toBe(base.assets);
  });
  it('draws two perpendicular end ticks on every bus without scaling the bus length', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const buses = geometry.assets.filter(item => item.kind === 'bus');
    expect(buses.length).toBeGreaterThan(30);
    for (const asset of buses) {
      const svg = renderToStaticMarkup(createElement(EquipmentSymbol, { asset, state: undefined, layout: geometry.view.layout, symbolScale: 2, diagramScale: .5 }));
      expect(svg, asset.id).toContain('class="bus-end-caps"');
      expect(svg, asset.id).toContain('class="equipment-glyph" transform="scale(1)"');
      const cap = svg.match(/class="bus-end-caps" d="([^"]+)"/)![1];
      expect(cap.match(/M/g), asset.id).toHaveLength(2);
      expect(cap.match(/H/g), asset.id).toHaveLength(2);
    }
  });
  it('enlarges the glyph and its lead attachment together without moving electrical terminals', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const asset = geometry.assets.find(item => item.kind === 'earth-switch')!;
    const before = JSON.stringify(geometry.view.layout.terminals);
    const svg = renderToStaticMarkup(createElement(EquipmentSymbol, { asset, state: 'open', layout: geometry.view.layout, symbolScale: 2 }));
    expect(svg).toContain('transform="scale(2)"');
    expect(svg).toContain('points="-120,0 0,0"');
    expect(svg).not.toContain('M-40 0 H0');
    expect(JSON.stringify(geometry.view.layout.terminals)).toBe(before);
  });
  it('draws earth destinations locally without stray ground-anchor leads throughout the current model', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const earthAssets = geometry.assets.filter(asset => asset.kind === 'earth-switch' || threePositionContacts(asset));
    expect(earthAssets.length).toBeGreaterThan(120);
    for (const asset of earthAssets) {
      const ground = threePositionContacts(asset)?.ground ?? asset.terminals[1];
      expect(currentNetworkModel.connections.filter(link => link.from === ground || link.to === ground), asset.id).toEqual([]);
      for (const state of asset.kind === 'earth-switch' ? ['open', 'closed'] : ['service', 'isolated', 'earthed']) {
        const svg = renderToStaticMarkup(createElement(EquipmentSymbol, { asset, state, layout: geometry.view.layout }));
        expect(svg, asset.id).not.toContain(`data-terminal="${ground}"`);
        for (const phase of asset.terminals.filter(terminal => terminal !== ground)) expect(svg, asset.id).toContain(`data-terminal="${phase}"`);
        if (asset.kind === 'earth-switch') expect(svg, asset.id).toContain(state === 'open' ? 'M0 0 L18 20' : 'M0 0 V30');
      }
    }
  });
  it('reviews every room with incomers above a horizontal shared bus and local feeders below, using the shipped default positions', async () => {
    const base = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const review = initialLayoutReview({ modelId: currentNetworkModel.id, modelVersion: currentNetworkModel.version, layoutRevision: savedDrawing.layoutRevision }, base.assets.map(asset => asset.id), base.panels.map(panel => panel.id));
    const geometry = switchroomBuses(applyLayoutEdits(base, review.edits), review.compactFrames);
    const byId = new Map(geometry.assets.map(asset => [asset.id, asset]));
    const incoming = new Set([
      'sw411:in-01:cb', 'sw411:in-02:cb', 'sw411:in-03:cb', 'sw411:in-04:cb',
      'sw431:in:cb', 'sw435:in:cb', 'sw454:in:cb', 'sw426:in:cb', 'sw505:in:cb', 'sw421:in:cb', 'sw451:in:cb',
      'rm721:in01', 'rm712:in01', 'rm712:in02', 'rm712:sw712:cb', 'rm713:in01', 'rm713:in02', 'rm713:sw713:cb',
      'rm420:sw01', 'hpgr:tf001', 'rm406:sw01', 'rm410:sw01', 'rm412:s100', 'rm412:s101', 'rm413:in01',
      'rm420:mc420:in:vcb', 'rm714:in01', 'rm714:in02', 'rm714:sw714:in:cb',
      'wh:h1:rm417:sw01', 'wh:h1:rm417:sw02', 'wh:h1:mc417:in', 'wh:h8:mc416:in', 'mine:sw441:in:cb',
      'wh:h9:rm419:sw01', 'wh:h9:mc419:in', 'wh:h3:mc416:in', 'wh:h7:rm418:sw01', 'wh:h7:rm418:sw02', 'wh:h7:mc418:in',
    ]);
    expect(geometry.panels).toHaveLength(29);
    let buses = 0;
    for (const panel of geometry.panels) for (const id of panel.memberAssetIds) {
      if (byId.get(id)?.kind !== 'bus') continue;
      buses++;
      const center = geometry.view.layout.assets[id], span = geometry.view.layout.busSpans![id];
      expect(geometry.view.layout.rotations![id], id).toBe(90);
      for (const link of geometry.connections) {
        const from = geometry.owners.get(link.from)!, to = geometry.owners.get(link.to)!;
        const peerId = from === id ? to : to === id ? from : undefined;
        if (!peerId || !panel.memberAssetIds.includes(peerId)) continue;
        const peer = byId.get(peerId)!;
        if (peer.kind === 'earth-switch' || peerId === 'sw411:bus-tie:cb') continue;
        const p = geometry.view.layout.assets[peerId];
        expect(incoming.has(peerId) ? p[1] < center[1] : p[1] > center[1], `${panel.id}: ${peerId}`).toBe(true);
        const path = geometry.routes.get(link.id)!;
        const terminal = geometry.view.layout.terminals[from === id ? link.to : link.from];
        expect((terminal[1] - p[1]) * (center[1] - p[1]), `${peerId} bus-facing port`).toBeGreaterThan(0);
        expect(path, link.id).toHaveLength(2);
        expect(path[0][0], link.id).toBe(path[1][0]);
        const tap = from === id ? path[0] : path[1];
        expect(tap[1], link.id).toBe(center[1]);
        expect(Math.abs(tap[0] - center[0]), link.id).toBeLessThanOrEqual(span / 2);
      }
    }
    expect(buses).toBe(33);
    for (const hopper of ['h3', 'h8']) {
      for (const suffix of ['interface:supply', 'supplemental-supply']) {
        const path = geometry.routes.get(`wh:${hopper}:mc416:${suffix}`)!;
        expect(path[0][1], `${hopper} forward incoming path`).toBeLessThan(path.at(-1)![1]);
      }
      const transformer = byId.get(`wh:${hopper}:tf416`)!;
      const forward = transformer.sourceArcs!.find(arc => arc.knowledge === 'owner-confirmed' && arc.id.includes(':forward-'))!;
      expect(geometry.view.layout.terminals[forward.from][1]).toBeLessThan(geometry.view.layout.terminals[forward.to][1]);
    }
    const routed = applyLineRoutes(transformerPortLayout(applyBusTakeoffs(busEndClearance(geometry),review.busTakeoffs??{}),4),review.lineRoutes??{});
    const names={...Object.fromEntries(routed.assets.map(a=>[a.id,compactEquipmentLabel(a,currentAssetLabel(currentNetworkModel,a))])),...review.names};
    const frames=fitCompactFrames(withFinalBoardFrames(enlargeLabels(routed,2,4,names)),4).panels;
    for (const [index, a] of frames.entries()) for (const b of frames.slice(index + 1)) {
      expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y, `${a.id} / ${b.id}`).toBe(false);
    }
    expect(geometry.assets).toBe(currentNetworkModel.assets);
    expect(geometry.connections).toBe(currentNetworkModel.connections);
    for (const route of geometry.routes.values()) for (let i = 1; i < route.length; i++) expect(route[i][0] === route[i - 1][0] || route[i][1] === route[i - 1][1]).toBe(true);
  });
  it('removes 24 obsolete disconnected references from the diagram, preserving any reference that acquires a real connection', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const obsolete = currentNetworkModel.assets.filter(asset => isObsoleteReference(currentNetworkModel, asset));
    expect(obsolete).toHaveLength(24);
    for (const asset of obsolete) {
      expect(geometry.hiddenIds.has(asset.id)).toBe(true);
      expect(geometry.labels.has(asset.id)).toBe(false);
    }
    const asset = obsolete[0];
    expect(isObsoleteReference({ ...currentNetworkModel, connections: [...currentNetworkModel.connections, { id: 'connected-reference', from: asset.terminals[0], to: currentNetworkModel.connections[0].from }] }, asset)).toBe(false);
  });
  it('shows all 32 intact model fuses as Healthy (Closed) without changing their fixed continuity or layout', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const fuses = currentNetworkModel.assets.filter(isFuse);
    expect(fuses).toHaveLength(32);
    for (const fuse of fuses) {
      expect(currentAssetLabel(currentNetworkModel, fuse)).toContain(healthyFuseState);
      expect(geometry.labels.get(fuse.id)!.lines).toContain(healthyFuseState);
      expect(geometry.labels.get(fuse.id)!.lines.join(' ')).not.toMatch(/unconfirmed/i);
      expect(fuse.positions).toEqual([]);
      expect(fuse.sourceArcs).toHaveLength(2);
      expect(currentNetworkModel.starting.devices).not.toHaveProperty(fuse.id);
    }
  });
  it('keeps the actual SW421 incoming feeder attached when only its visible assets were moved', async () => {
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    const panel = geometry.panels.find(item => item.id === 'screening/hv')!;
    const assets = Object.fromEntries(panel.memberAssetIds.filter(id => !geometry.hiddenIds.has(id)).map(id => [id, [2400, 1600]]));
    const moved = applyLayoutEdits(geometry, { assets, rooms: {} });
    const before = geometry.routes.get('whole:join:sw421')!;
    const incoming = moved.routes.get('whole:join:sw421')!;
    expect(incoming[0]).toEqual(before[0]);
    expect(incoming.at(-1)).toEqual([before.at(-1)![0] + 2400, before.at(-1)![1] + 1600]);
    expect(incoming.length).toBeLessThanOrEqual(4);
    const length = incoming.slice(1).reduce((total, point, index) => total + Math.abs(point[0] - incoming[index][0]) + Math.abs(point[1] - incoming[index][1]), 0);
    expect(length).toBe(Math.abs(incoming.at(-1)![0] - incoming[0][0]) + Math.abs(incoming.at(-1)![1] - incoming[0][1]));
    expect(moved.routes.get('sw421:incoming:cable-SW421-P-01')?.[0]).toEqual(incoming.at(-1));
    expect(moved.routes.get('sw421:incoming:cable-SW421-P-01')?.at(-1)).toEqual(moved.view.layout.terminals['sw421:in:cb:a']);
  });
  it('loads the complete frozen network without modifying the model or saved drawing', async () => {
    const originalModel = JSON.stringify(currentNetworkModel);
    const originalDrawing = JSON.stringify(savedDrawing);
    const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
    expect(geometry.view.assetIds.toSorted()).toEqual(currentNetworkModel.assets.map(asset => asset.id).toSorted());
    expect([...geometry.routes.keys()].toSorted()).toEqual(currentNetworkModel.connections.map(link => link.id).toSorted());
    expect(Object.keys(geometry.view.layout.terminals)).toHaveLength(currentNetworkModel.assets.flatMap(a=>a.terminals).length);
    expect(geometry.groupByAsset.size).toBe(currentNetworkModel.assets.length);
    expect(JSON.stringify(currentNetworkModel)).toBe(originalModel);
    expect(JSON.stringify(savedDrawing)).toBe(originalDrawing);
  });
  it('uses the same canonical fingerprint as the frozen complete model', async () => {
    expect(await modelFingerprint(currentNetworkModel)).toBe(savedDrawing.modelFingerprint);
  });
  it('rejects a partial drawing instead of falling back to legacy geometry', async () => {
    await expect(loadAuthoredLayout(currentNetworkModel, incomplete())).rejects.toThrow('incomplete');
  });
  it('rejects a model metadata change even when IDs, version and topology match', async () => {
    const drawing = incomplete(); drawing.status = 'complete';
    const changed = structuredClone(currentNetworkModel); changed.name += ' changed';
    await expect(loadAuthoredLayout(changed, drawing)).rejects.toThrow('different model snapshot');
  });
});


it('uses concise drawing tags without changing model labels', () => {
 const tf = currentNetworkModel.assets.find(asset => asset.kind === 'transformer' && /TF451/.test(asset.label))!;
 expect(compactEquipmentLabel(tf, tf.label)).toBe('TF451');
 const bus = currentNetworkModel.assets.find(asset => asset.kind === 'bus' && /SW506 Y/.test(asset.label))!;
 expect(compactEquipmentLabel(bus, bus.label)).toBe('SW506 Y 690V BUS');
 const es = currentNetworkModel.assets.find(asset => asset.kind === 'earth-switch' && /ES TF436/.test(asset.label))!;
 expect(compactEquipmentLabel(es, es.label)).toBe('ES TF436 FD');
 const dcEarth = currentNetworkModel.assets.find(asset => asset.label === 'VS50501\nDC earth')!;
 const output = currentNetworkModel.assets.find(asset => asset.label === 'VS50501\nOutput contact')!;
 expect(compactEquipmentLabel(dcEarth, dcEarth.label)).toBe('VS50501 DC earth');
 expect(compactEquipmentLabel(output, output.label)).toBe('VS50501 Output contact');
});

it('places nine depicted bus earths in their drawing tier bays', async () => {
 const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
 const moves = drawingBusEarthMoves(geometry);
 expect(moves).toHaveLength(9);
 for (const move of moves) expect(move.fraction).toBeGreaterThanOrEqual(0);
});

it('keeps every breaker caption right and earth caption below its symbol', async () => {
 const geometry = await loadAuthoredLayout(currentNetworkModel, savedDrawing as unknown as AuthoredSchematic);
 const labelled = enlargeLabels(geometry, 2, 4);
 for (const asset of labelled.assets) {
   const label = labelled.labels.get(asset.id); if (!label) continue;
   const [x,y] = labelled.view.layout.assets[asset.id];
   if (asset.kind === 'breaker') expect(label.x, asset.id).toBeGreaterThan(x);
   if (asset.kind === 'earth-switch') expect(label.y, asset.id).toBeGreaterThan(y + 4*73);
 }
});

it('separates the final SW714 board and both SW423 incomers from upstream HV rooms', async () => {
 const geometry=await loadAuthoredLayout(currentNetworkModel,savedDrawing as unknown as AuthoredSchematic);
 const grouped=withFinalBoardFrames(geometry);
 const sw714=grouped.panels.find(p=>p.id.startsWith('final-board/')&&p.label==='SW714')!;
 expect(sw714.memberAssetIds).toContain('rm714:sw714:in:cb');
 expect(sw714.memberAssetIds).toContain('rm714:sw714:bus');
 expect(grouped.panels.find(p=>p.id==='desands/laboratory')!.memberAssetIds).not.toContain('rm714:sw714:bus');
 const sw423=grouped.panels.find(p=>p.id.startsWith('final-board/')&&p.label==='SW423')!;
 expect(sw423.memberAssetIds).toContain('sw421:sw423:d:cb');
 expect(sw423.memberAssetIds).toContain('sw421:sw423:y:cb');
});
it('normalises transformer exits without moving unrelated per-feeder bus taps', async () => {
 const geometry=await loadAuthoredLayout(currentNetworkModel,savedDrawing as unknown as AuthoredSchematic);
 const normal=transformerPortLayout(geometry,4);
 expect(normal.routes.get('sw411:tier-01:bus-link')).toEqual(geometry.routes.get('sw411:tier-01:bus-link'));
 for(const asset of normal.assets.filter(a=>a.kind==='transformer')){
  const [x,y]=normal.view.layout.assets[asset.id];
  expect(normal.view.layout.terminals[asset.terminals[0]][0],asset.id).toBe(x);
  expect(normal.view.layout.terminals[asset.terminals[0]][1],asset.id).toBeLessThan(y);
  for(const terminal of asset.terminals.slice(1)) expect(normal.view.layout.terminals[terminal][1],asset.id).toBeGreaterThan(y);
 }
});

it('keeps corrected single-winding transformer columns straight and unrelated rooms clear', async()=>{
 const review = (await import('../models/site/reviewed-layout.json')).default;
 const base=await loadAuthoredLayout(currentNetworkModel,savedDrawing as unknown as AuthoredSchematic);
 const positioned=switchroomBuses(applyLayoutEdits(base,review.edits),true);
 const routed=applyLineRoutes(transformerPortLayout(applyBusTakeoffs(busEndClearance(positioned),review.busTakeoffs??{}),4),review.lineRoutes??{});
 const names={...Object.fromEntries(routed.assets.map(a=>[a.id,compactEquipmentLabel(a,currentAssetLabel(currentNetworkModel,a))])),...review.names};
 const {clearConnectorCaptions}=await import('./connector-clearance');
 const {cutsBox}=await import('./diagram-geometry');
 const {MIN_ROOM_CLEARANCE,paddedRoom,roomGap}=await import('./room-clearance');
 const g=clearConnectorCaptions(fitCompactFrames(withFinalBoardFrames(enlargeLabels(routed,2,4,names)),4),4);
 for(const id of ['rm712:tf712','rm713:tf713','rm714:tf714']){
  const tf=g.assets.find(a=>a.id===id)!;
  const upstream=g.panels.find(p=>(p.memberAssetIds??p.assetIds).includes(id))!;
  expect(g.view.layout.terminals[tf.terminals[0]][1],`${id} above-field room clearance`).toBeGreaterThan(upstream.y+upstream.height);
  const paths=g.connections.filter(c=>tf.terminals.includes(c.from)||tf.terminals.includes(c.to));
  expect(paths.length).toBe(2);
  for(const c of paths){const path=g.routes.get(c.id)!;expect(Math.max(...path.map(p=>p[0]))-Math.min(...path.map(p=>p[0])),c.id).toBeLessThan(1e-6);}
 }
 for(const [i,a]of g.panels.entries())for(const b of g.panels.slice(i+1))expect(roomGap(a,b),`${a.id} / ${b.id}`).toBeGreaterThanOrEqual(MIN_ROOM_CLEARANCE-.01);
 for(const bus of g.assets.filter(a=>a.kind==='bus')){
  const p=g.panels.find(p=>(p.memberAssetIds??p.assetIds).includes(bus.id));if(!p)continue;
  const [x,y]=g.view.layout.assets[bus.id],span=g.view.layout.busSpans?.[bus.id]??60,h=g.view.layout.rotations?.[bus.id]===90;
  expect(Math.min(x-(h?span/2:0)-p.x,p.x+p.width-x-(h?span/2:0),y-(h?0:span/2)-p.y,p.y+p.height-y-(h?0:span/2)),bus.id).toBeGreaterThanOrEqual(MIN_ROOM_CLEARANCE-.01);
 }
 for(const c of g.connections){
  const path=g.routes.get(c.id)!,owners=[g.owners.get(c.from),g.owners.get(c.to)];
  for(const p of g.panels){
   if(owners.some(id=>id&&(p.memberAssetIds??p.assetIds).includes(id)))continue;
   const inside=(v:readonly number[])=>v[0]>=p.x&&v[0]<=p.x+p.width&&v[1]>=p.y&&v[1]<=p.y+p.height;
   if(inside(path[0])||inside(path.at(-1)!))continue;
   expect(path.slice(1).some((v,i)=>cutsBox(path[i],v,paddedRoom(p))),`${c.id} through ${p.id}`).toBe(false);
  }
 }
});




it('centres paired transformer load columns and keeps MC451B horizontal on the main bus centreline',async()=>{
 const review=(await import('../models/site/reviewed-layout.json')).default;
 const g=switchroomBuses(applyLayoutEdits(await loadAuthoredLayout(currentNetworkModel,savedDrawing as unknown as AuthoredSchematic),review.edits),true);
 for(const tf of g.assets.filter(a=>a.kind==='transformer'&&a.terminals.length===3)){
  const peers=tf.terminals.slice(1).map(t=>g.connections.filter(c=>c.from===t||c.to===t).map(c=>g.owners.get(c.from===t?c.to:c.from)!).find(id=>g.assets.find(a=>a.id===id)?.kind!=='earth-switch'));
  if(peers.some(id=>!id||!g.view.layout.assets[id]))continue;
  const midpoint=(g.view.layout.assets[peers[0]!][0]+g.view.layout.assets[peers[1]!][0])/2;
  expect(g.view.layout.assets[tf.id][0],tf.id).toBeCloseTo(midpoint,1);
 }
 expect(g.view.layout.rotations?.['sw451:mc451b:section']).toBe(90);
 expect(g.view.layout.assets['sw451:mc451b:section'][0]).toBe(g.view.layout.assets['sw451:mc451:bus'][0]);
 const frame=withFinalBoardFrames(g).panels.find(p=>(p.memberAssetIds??p.assetIds).includes('sw451:mc451:bus'))!;
 expect(frame.memberAssetIds).toContain('sw451:mc451b:section');
});
