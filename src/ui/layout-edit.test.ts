import { describe, expect, it } from 'vitest';
import { applyLayoutEdits, emptyLayoutEdits, selectLayoutBox, validateLayoutEdits, type EditableGeometry } from './layout-edit';
import type { Point } from './diagram-geometry';
import { attachLineRoute, moveLineSegment, validateLineRoutes, snapCoordinate, snapLineDelta, simplifyLineRoute, removeLineSegment } from './line-routing';
import { boxesIntersect, routeInViewport } from './viewport-geometry';

describe('viewport rendering projection', () => {
  const viewport = { x: 0, y: 0, width: 100, height: 100 };
  it('keeps wires crossing the screen even when both endpoints are off-screen', () => {
    expect(routeInViewport([[-200, 50], [300, 50]], viewport)).toBe(true);
    expect(routeInViewport([[50, -200], [50, 300]], viewport)).toBe(true);
    expect(routeInViewport([[-200, -50], [300, -50]], viewport)).toBe(false);
  });
  it('includes touching bounds and labels extending into the view', () => {
    expect(boxesIntersect({ x: -200, y: 20, width: 220, height: 40 }, viewport)).toBe(true);
    expect(boxesIntersect({ x: 100, y: 20, width: 20, height: 40 }, viewport)).toBe(true);
    expect(boxesIntersect({ x: 101, y: 20, width: 20, height: 40 }, viewport)).toBe(false);
  });
});

describe('manual line routing', () => {
  it('removes a floating-point hairpin without moving its endpoints', () => {
    const points: Point[] = [[100, 0], [100, 40], [20, 40], [20, 0], [20 + 1e-11, 0], [20 + 1e-11, 100]];
    expect(simplifyLineRoute(points)).toEqual([[100, 0], [100, 40], [20 + 1e-11, 40], [20 + 1e-11, 100]]);
  });
  it('removes the diagonal backtrack shown in the owner example and joins the vertical neighbours', () => {
    const points: Point[] = [[299, 74], [299, 205], [344, 205], [68, 238], [299, 238], [299, 375]];
    const result = removeLineSegment(points, 2);
    expect(result).toEqual([[299, 74], [299, 375]]);
    expect(validateLineRoutes({ earth: result })).toEqual({ earth: result });
  });
  it('reconnects offset neighbours with an elbow, retaining both endpoints and unrelated bends', () => {
    const result = removeLineSegment([[0, 0], [0, 50], [100, 50], [100, 100], [200, 100]], 1);
    expect(result).toEqual([[0, 0], [0, 100], [200, 100]]);
    expect(removeLineSegment([[0, 0], [100, 0], [100, 100]], 0)).toEqual([[0, 0], [0, 100], [100, 100]]);
    expect(removeLineSegment([[0, 0], [0, 100]], 0)).toEqual([[0, 0], [0, 100]]);
  });
  it('snaps a near-aligned dogleg exactly to its endpoints and removes redundant bends', () => {
    const route: Point[] = [[0, 0], [30, 0], [30, 100], [0, 100]];
    const snap = snapLineDelta(route, 1, [-27, 0], 8);
    expect(snap.guide).toEqual({ axis: 'x', value: 0 });
    expect(simplifyLineRoute(moveLineSegment(route, 1, snap.delta))).toEqual([[0, 0], [0, 100]]);
    expect(snapLineDelta(route, 1, [-20, 0], 8).delta).toEqual([-20, 0]);
  });
  it('snaps horizontal lines with a screen-scaled tolerance and preserves free movement outside it', () => {
    const route: Point[] = [[0, 0], [0, 30], [100, 30], [100, 0]];
    expect(snapLineDelta(route, 1, [0, -20], 16).guide).toEqual({ axis: 'y', value: 0 });
    expect(snapCoordinate(11, [0, 20], 8)).toEqual({ value: 11, snapped: false });
    expect(snapCoordinate(13, [0, 20], 8)).toEqual({ value: 20, snapped: true });
  });
  const assertSquare = (points: Point[]) => {
    for (let i = 1; i < points.length; i++) expect(points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1]).toBe(true);
  };
  it('moves a straight segment sideways without moving either equipment endpoint', () => {
    const points = moveLineSegment([[0, 0], [0, 100]], 0, [30, 50]);
    expect(points).toEqual([[0, 0], [30, 0], [30, 100], [0, 100]]);
    assertSquare(points);
  });
  it('keeps a saved straight route orthogonal when its attached endpoint moves', () => {
    const vertical = attachLineRoute([[0, 0], [0, 100]], [0, 0], [50, 100]);
    expect(vertical).toEqual([[0, 0], [0, 100], [50, 100]]); assertSquare(vertical);
    const horizontal = attachLineRoute([[0, 0], [100, 0]], [0, 0], [100, 50]);
    expect(horizontal).toEqual([[0, 0], [100, 0], [100, 50]]); assertSquare(horizontal);
  });
  it('moves an interior segment and keeps adjacent segments square', () => {
    const points = moveLineSegment([[0, 0], [0, 50], [100, 50], [100, 100]], 1, [80, 20]);
    expect(points).toEqual([[0, 0], [0, 70], [100, 70], [100, 100]]);
    assertSquare(points);
  });
  it('keeps manual bends attached after one endpoint moves, and translates a group rigidly', () => {
    const original: Point[] = [[0, 0], [30, 0], [30, 100], [0, 100]];
    const attached = attachLineRoute(original, [50, 20], [0, 100]);
    expect(attached[0]).toEqual([50, 20]); expect(attached.at(-1)).toEqual([0, 100]); assertSquare(attached);
    expect(attachLineRoute(original, [50, 20], [50, 120])).toEqual([[50, 20], [80, 20], [80, 120], [50, 120]]);
  });
  it('rejects diagonal or malformed saved routes', () => {
    expect(() => validateLineRoutes({ feed: [[0, 0], [10, 10]] })).toThrow();
    expect(() => validateLineRoutes({ feed: [[0, 0], [0, Infinity]] })).toThrow();
    expect(validateLineRoutes(undefined)).toEqual({});
  });
});

function fixture(): EditableGeometry & { states: Record<string, string> } {
  return {
    view: { id: 'whole', label: 'Whole', assetIds: ['bus', 'cb', 'load'], bounds: [-100, -50, 300, 450], layout: {
      assets: { bus: [0, 0], cb: [40, 100], load: [40, 300] },
      terminals: { 'bus:bar': [0, 0], 'cb:a': [40, 80], 'cb:b': [40, 120], 'load:in': [40, 280] },
      rotations: { bus: 90 }, busSpans: { bus: 100 },
    } },
    assets: [{ id: 'bus', terminals: ['bus:bar'] }, { id: 'cb', terminals: ['cb:a', 'cb:b'] }, { id: 'load', terminals: ['load:in'] }],
    connections: [{ id: 'feed', from: 'bus:bar', to: 'cb:a' }, { id: 'out', from: 'cb:b', to: 'load:in' }],
    owners: new Map([['bus:bar', 'bus'], ['cb:a', 'cb'], ['cb:b', 'cb'], ['load:in', 'load']]),
    labels: new Map([
      ['bus', { x: -30, y: -40, width: 60, height: 30, lines: ['Bus'] }],
      ['cb', { x: 80, y: 80, width: 100, height: 40, lines: ['CB'] }],
      ['load', { x: 80, y: 290, width: 100, height: 40, lines: ['Load'] }],
    ]),
    routes: new Map<string, Point[]>([
      ['feed', [[40, 0], [40, 80]]],
      ['out', [[40, 120], [40, 200], [100, 200], [100, 280], [40, 280]]],
    ]),
    panels: [{ id: 'room', x: -100, y: -50, width: 300, height: 250, assetIds: ['bus', 'cb'], memberAssetIds: ['bus', 'cb'] }],
    states: { cb: 'closed' },
  };
}

function expectOrthogonal(geometry: EditableGeometry) {
  for (const route of geometry.routes.values()) {
    expect(route.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < route.length; i++) expect(route[i][0] === route[i - 1][0] || route[i][1] === route[i - 1][1]).toBe(true);
  }
}

describe('editable presentation geometry', () => {
  it('uses one elbow and chooses the side that clears an intervening label', () => {
    const base = fixture();
    base.labels = new Map([['obstacle', { x: 10, y: 300, width: 60, height: 40, lines: ['Other equipment'] }]]);
    const result = applyLayoutEdits(base, { assets: { load: [200, 100] }, rooms: {} });
    expect(result.routes.get('out')).toEqual([[40, 120], [240, 120], [240, 380]]);
  });
  it('retains two elbows when both one-elbow routes cut through labels', () => {
    const base = fixture();
    base.labels = new Map([
      ['left-obstacle', { x: 10, y: 300, width: 60, height: 40, lines: ['Left'] }],
      ['top-obstacle', { x: 180, y: 100, width: 40, height: 40, lines: ['Top'] }],
    ]);
    const result = applyLayoutEdits(base, { assets: { load: [200, 100] }, rooms: {} });
    expect(result.routes.get('out')).toEqual([[40, 120], [40, 250], [240, 250], [240, 380]]);
  });
  it('discards obsolete bends and uses minimum orthogonal distance after an endpoint move', () => {
    const base = fixture();
    for (const [dx, dy] of [[500, -200], [-300, 100], [0, 400]]) {
      const result = applyLayoutEdits(base, { assets: { load: [dx, dy] }, rooms: {} });
      const route = result.routes.get('out')!;
      const length = route.slice(1).reduce((sum, point, index) => sum + Math.abs(point[0] - route[index][0]) + Math.abs(point[1] - route[index][1]), 0);
      expect(route.length).toBeLessThanOrEqual(4);
      expect(length).toBe(Math.abs(route[0][0] - route.at(-1)![0]) + Math.abs(route[0][1] - route.at(-1)![1]));
      expectOrthogonal(result);
    }
  });
  it('redraws a moved cross-module cable directly even when both ends move together', () => {
    const base = fixture();
    base.groupByAsset = new Map([['bus', 'board'], ['cb', 'board'], ['load', 'other-board']]);
    const result = applyLayoutEdits(base, { assets: { cb: [50, -20], load: [50, -20] }, rooms: {} });
    expect(result.routes.get('out')).toEqual([[90, 100], [90, 260]]);
  });
  it('keeps an unrelated unmoved cable on its existing route', () => {
    const base = fixture();
    base.groupByAsset = new Map([['bus', 'board'], ['cb', 'board'], ['load', 'other-board']]);
    const result = applyLayoutEdits(base, { assets: { bus: [50, 20] }, rooms: {} });
    expect(result.routes.get('out')).toEqual(base.routes.get('out'));
  });
  it('moves a hidden incoming cable join with its visible incomer, including existing saved asset moves', () => {
    const base = fixture();
    base.assets = [...base.assets, { id: 'handoff', terminals: ['handoff:port'] }];
    base.view.layout.assets.handoff = [40, 50]; base.view.layout.terminals['handoff:port'] = [40, 50];
    base.owners = new Map([...base.owners, ['handoff:port', 'handoff']]);
    base.hiddenIds = new Set(['handoff']);
    base.groupByAsset = new Map([['bus', 'upstream'], ['handoff', 'board'], ['cb', 'board'], ['load', 'downstream']]);
    base.connections = [{ id: 'feed', from: 'bus:bar', to: 'handoff:port' }, { id: 'incoming', from: 'handoff:port', to: 'cb:a' }, base.connections[1]];
    base.routes = new Map([...base.routes, ['feed', [[40, 0], [40, 50]]], ['incoming', [[40, 50], [40, 80]]]]);
    const result = applyLayoutEdits(base, { assets: { cb: [600, 200] }, rooms: {} });
    expect(result.view.layout.assets.handoff).toEqual([640, 250]);
    expect(result.routes.get('feed')?.[0]).toEqual([40, 0]);
    expect(result.routes.get('feed')?.at(-1)).toEqual([640, 250]);
    expect(result.routes.get('incoming')).toEqual([[640, 250], [640, 280]]);
    expect(result.view.layout.assets.bus).toEqual([0, 0]);
    expect(result.view.layout.assets.load).toEqual([40, 300]);
    expectOrthogonal(result);
  });
  it('selects an arbitrary subset with a dragged rectangle', () => {
    expect(selectLayoutBox(fixture(), [20, 60], [70, 150])).toEqual({ assets: ['cb'], rooms: [] });
  });
  it('selects a fully enclosed frame and its members in either drag direction', () => {
    expect(selectLayoutBox(fixture(), [200, 200], [-100, -50])).toEqual({ assets: ['bus', 'cb'], rooms: ['room'] });
  });
  it('can select an asset by enclosing its tag while the symbol is outside', () => {
    expect(selectLayoutBox(fixture(), [75, 75], [185, 125])).toEqual({ assets: ['cb'], rooms: [] });
  });
  it('moves an arbitrary selection together and preserves its internal wire shape', () => {
    const base = fixture();
    const selected = selectLayoutBox(base, [20, 60], [190, 350]);
    const assets = Object.fromEntries(selected.assets.map(id => [id, [50, -20] as Point]));
    const result = applyLayoutEdits(base, { assets, rooms: {} });
    expect(selected.assets).toEqual(['cb', 'load']);
    expect(result.view.layout.assets.bus).toEqual(base.view.layout.assets.bus);
    expect(result.routes.get('out')).toEqual(base.routes.get('out')!.map(([x, y]) => [x + 50, y - 20]));
    expect(result.routes.get('feed')?.[0]).toEqual([40, 0]);
    expectOrthogonal(result);
  });
  it('moves a switchroom rigidly while its external cable keeps the remote endpoint attached', () => {
    const base = fixture();
    const result = applyLayoutEdits(base, { assets: {}, rooms: { room: [200, 50] } });
    expect(result.view.layout.assets.cb).toEqual([240, 150]);
    expect(result.view.layout.assets.bus).toEqual([200, 50]);
    expect(result.view.layout.assets.load).toEqual([40, 300]);
    expect(result.routes.get('feed')).toEqual([[240, 50], [240, 130]]);
    expect(result.routes.get('out')?.[0]).toEqual([240, 170]);
    expect(result.routes.get('out')?.at(-1)).toEqual([40, 280]);
    expect(result.panels?.[0]).toMatchObject({ x: 100, y: 0, width: 300, height: 250 });
    expect(result.labels.get('cb')).toMatchObject({ x: 280, y: 130 });
    expectOrthogonal(result);
  });

  it('moves an asset, its label and terminal coordinates without changing topology, state or the base drawing', () => {
    const base = fixture(); const before = structuredClone(base);
    const result = applyLayoutEdits(base, { assets: { cb: [50, -30] }, rooms: {} });
    expect(result.view.layout.assets.cb).toEqual([90, 70]);
    expect(result.view.layout.terminals['cb:a']).toEqual([90, 50]);
    expect(result.view.layout.terminals['cb:b']).toEqual([90, 90]);
    expect(result.labels.get('cb')).toMatchObject({ x: 130, y: 50 });
    expect(result.routes.get('feed')?.[0]).toEqual([40, 0]);
    expect(result.routes.get('feed')?.at(-1)).toEqual([90, 50]);
    expect(result.routes.get('out')?.[0]).toEqual([90, 90]);
    expect(result.routes.get('out')?.at(-1)).toEqual([40, 280]);
    expect(result.assets).toBe(base.assets); expect(result.connections).toBe(base.connections); expect(result.states).toBe(base.states);
    expect(base).toEqual(before);
    expectOrthogonal(result);
  });

  it('preserves the real tap offset when a bus moves rather than snapping the cable to its centre', () => {
    const result = applyLayoutEdits(fixture(), { assets: { bus: [80, 40] }, rooms: {} });
    expect(result.view.layout.terminals['bus:bar']).toEqual([80, 40]);
    expect(result.routes.get('feed')?.[0]).toEqual([120, 40]);
    expect(result.routes.get('feed')?.at(-1)).toEqual([40, 80]);
    expectOrthogonal(result);
  });

  it('adds individual and room offsets, expanding only the edited room to contain a moved asset', () => {
    const base = fixture();
    const result = applyLayoutEdits(base, { assets: { cb: [500, -200] }, rooms: { room: [100, 50] } });
    expect(result.view.layout.assets.cb).toEqual([640, -50]);
    expect(result.view.layout.assets.bus).toEqual([100, 50]);
    const panel = result.panels![0]; const label = result.labels.get('cb')!;
    expect(panel.x).toBe(0); expect(panel.y).toBeLessThanOrEqual(-114);
    expect(panel.x + panel.width).toBeGreaterThanOrEqual(label.x + label.width);
    expect(result.view.layout.assets.load).toEqual(base.view.layout.assets.load);
    expect(result.view.bounds[0]).toBeLessThan(panel.x);
    expectOrthogonal(result);
  });

  it('keeps the full moved busbar within its room frame', () => {
    const base = fixture(); base.view.layout.busSpans!.bus = 1_000;
    const result = applyLayoutEdits(base, { assets: { bus: [800, 0] }, rooms: {} });
    expect(result.panels![0].x + result.panels![0].width).toBeGreaterThanOrEqual(1_300);
  });

  it('handles horizontal and vertical single-segment wires when both endpoints move independently', () => {
    const base = fixture();
    for (const route of [[[40, 0], [40, 80]], [[0, 80], [40, 80]]] satisfies Point[][]) {
      base.routes = new Map(base.routes).set('feed', route);
      const result = applyLayoutEdits(base, { assets: { bus: [400, -150], cb: [-220, 360] }, rooms: {} });
      expect(result.routes.get('feed')?.[0]).toEqual([route[0][0] + 400, route[0][1] - 150]);
      expect(result.routes.get('feed')?.at(-1)).toEqual([route[1][0] - 220, route[1][1] + 360]);
      expectOrthogonal(result);
    }
  });

  it('rejects unknown identities and unsafe offset documents, and copies accepted coordinates', () => {
    const source = { assets: { cb: [2, 3] }, rooms: { room: [-5, 6] } };
    const result = validateLayoutEdits(source, ['cb'], ['room']);
    source.assets.cb[0] = 999;
    expect(result.assets.cb).toEqual([2, 3]);
    for (const input of [null, [], { connections: {} }, { assets: { missing: [0, 0] } }, { rooms: { missing: [0, 0] } }, { assets: { cb: [NaN, 0] } }, { assets: { cb: [Infinity, 0] } }, { assets: { cb: [1_000_001, 0] } }, { assets: { cb: ['2', 3] } }]) {
      expect(() => validateLayoutEdits(input, ['cb'], ['room'])).toThrow();
    }
    expect(validateLayoutEdits({}, [], [])).toEqual(emptyLayoutEdits());
  });

  it('reuses untouched base geometry for an empty edit set', () => {
    const base = fixture(); expect(applyLayoutEdits(base, emptyLayoutEdits())).toBe(base);
  });
});

it('removes the final elbow segment instead of recreating the same Pole17-style stub',()=>{
 const route:[number,number][]=[[100,0],[100,200],[0,200]];
 expect(removeLineSegment(route,1)).toEqual([[100,0],[0,0],[0,200]]);
 expect(removeLineSegment([[0,0],[200,0],[200,100]],1)).toEqual([[0,0],[0,100],[200,100]]);
});

it('lets an explicitly dragged hidden interface move without its nearby incomer',()=>{
 const base=fixture();
 base.assets=[...base.assets,{id:'handoff',terminals:['handoff:port']}];
 base.view.layout.assets.handoff=[40,50];base.view.layout.terminals['handoff:port']=[40,50];
 base.owners=new Map([...base.owners,['handoff:port','handoff']]);base.hiddenIds=new Set(['handoff']);
 base.groupByAsset=new Map([['handoff','board'],['cb','board'],['bus','upstream']]);
 base.connections=[{id:'feed',from:'bus:bar',to:'handoff:port'},{id:'incoming',from:'handoff:port',to:'cb:a'}];
 base.routes=new Map([['feed',[[40,0],[40,50]]],['incoming',[[40,50],[40,80]]]]);
 const moved=applyLayoutEdits(base,{assets:{handoff:[100,20]},rooms:{}},new Set(['handoff']));
 expect(moved.view.layout.assets.handoff).toEqual([140,70]);
 expect(moved.view.layout.terminals['handoff:port']).toEqual([140,70]);
 expect(moved.view.layout.assets.cb).toEqual(base.view.layout.assets.cb);
 expect(moved.routes.get('feed')?.at(-1)).toEqual([140,70]);
 expect(moved.routes.get('incoming')?.[0]).toEqual([140,70]);
});
