import { describe, expect, it } from 'vitest';
import { createLayoutReviewDocument, layoutReviewStorageKey, parseLayoutReviewDocument } from './layout-review';
import type { LayoutEdits } from './layout-edit';

const identity = { modelId: 'network', modelVersion: 'model-11', layoutRevision: 'layout-5' };
const assets = ['cb1', 'es1'];
const rooms = ['room1'];

describe('saved layout review documents', () => {
  it('round trips independent primary and embedded earth captions, rejecting unknown or invalid anchors',()=>{
    const document={...createLayoutReviewDocument(identity,{assets:{},rooms:{}},[]),labelPositions:{cb1:[100,-50], 'cb1#earth':[40,230]}};
    expect(parseLayoutReviewDocument(JSON.stringify(document),identity,assets,rooms).labelPositions).toEqual(document.labelPositions);
    for(const labelPositions of [{unknown:[0,0]},{'cb1#bad':[0,0]},{cb1:[Infinity,0]},{cb1:[2_000_000,0]}])expect(()=>parseLayoutReviewDocument(JSON.stringify({...document,labelPositions}),identity,assets,rooms)).toThrow();
  });
  it('round trips bus takeoffs and rejects positions outside the bus', () => {
    const document = { ...createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []), busTakeoffs: { earth: .5 } };
    expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms).busTakeoffs).toEqual({ earth: .5 });
    expect(() => parseLayoutReviewDocument(JSON.stringify({ ...document, busTakeoffs: { earth: 1.1 } }), identity, assets, rooms)).toThrow('bus takeoff');
  });
  it('keeps appearance controls in the downloaded review while accepting older files', () => {
    const document = { ...createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []), appearance: { lineWidth: 3, symbolScale: 2 } };
    expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms).appearance).toEqual(document.appearance);
    expect(() => parseLayoutReviewDocument(JSON.stringify({ ...document, appearance: { lineWidth: 3, symbolScale: 99 } }), identity, assets, rooms)).toThrow('appearance');
  });
  it('round trips larger symbols, text and the compact layout setting', () => {
    const document = { ...createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []), appearance: { lineWidth: 1.4, symbolScale: 4, textScale: 2 }, compactFrames: true, framePaddingScale: .55 };
    expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms)).toEqual(document);
  });
  it('round trips manually routed lines while old review files still load', () => {
    const route: [number, number][] = [[0, 0], [30, 0], [30, 100], [0, 100]];
    const document = createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, [], { feed: route });
    route[1][0] = 999;
    expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms).lineRoutes?.feed[1]).toEqual([30, 0]);
    expect(parseLayoutReviewDocument(JSON.stringify(createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, [])), identity, assets, rooms).lineRoutes).toBeUndefined();
  });
  it('round trips offsets and deletion proposals without borrowing mutable inputs', () => {
    const edits: LayoutEdits = { assets: { cb1: [40, -20] }, rooms: { room1: [100, 200] } };
    const marks = ['es1', 'cb1', 'es1'];
    const document = createLayoutReviewDocument(identity, edits, marks);
    edits.assets.cb1[0] = 999;
    marks.push('unknown');

    expect(document.edits.assets.cb1).toEqual([40, -20]);
    expect(document.markedForDeletion).toEqual(['cb1', 'es1']);
    expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms)).toEqual(document);
    expect(assets).toEqual(['cb1', 'es1']);
  });

  it('rejects stale model/layout revisions and unsupported schemas', () => {
    const document = createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []);
    for (const changed of [{ modelId: 'other' }, { modelVersion: 'model-10' }, { layoutRevision: 'layout-4' }, { schemaVersion: 2 }]) {
      expect(() => parseLayoutReviewDocument(JSON.stringify({ ...document, ...changed }), identity, assets, rooms)).toThrow();
    }
  });

  it('rejects deletion proposals for unknown assets instead of silently losing them', () => {
    const document = createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, ['unknown']);
    expect(() => parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms)).toThrow('unknown asset ID');
  });

  it('rejects unknown movement targets and malformed/nonfinite coordinates', () => {
    const document = createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []);
    for (const edits of [
      { assets: { unknown: [1, 2] }, rooms: {} },
      { assets: {}, rooms: { unknown: [1, 2] } },
      { assets: { cb1: [null, 2] }, rooms: {} },
      { assets: { cb1: [1, '2'] }, rooms: {} },
    ]) {
      expect(() => parseLayoutReviewDocument(JSON.stringify({ ...document, edits }), identity, assets, rooms)).toThrow();
    }
    expect(() => createLayoutReviewDocument(identity, { assets: { cb1: [Infinity, 0] }, rooms: {} }, [])).toThrow();
  });

  it('isolates browser storage keys by exact model and geometry revision', () => {
    const key = layoutReviewStorageKey(identity);
    expect(layoutReviewStorageKey({ ...identity, layoutRevision: 'layout-6' })).not.toBe(key);
    expect(layoutReviewStorageKey({ ...identity, modelVersion: 'model-12' })).not.toBe(key);
    expect(layoutReviewStorageKey({ ...identity, modelId: 'network:2' })).not.toBe(key);
  });
});

it('persists custom drawing names and rejects unknown object IDs', () => {
 const document = { ...createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []), names: { cb1: 'CB renamed' } };
 expect(parseLayoutReviewDocument(JSON.stringify(document), identity, assets, rooms).names).toEqual(document.names);
 expect(() => parseLayoutReviewDocument(JSON.stringify({ ...document, names: { missing: 'Name' } }), identity, assets, rooms)).toThrow('custom asset name');
});

it('round trips explicit manual-route ownership without pinning old automatic routes',()=>{
 const lineRoutes={wire:[[0,0],[50,0],[50,100],[0,100]] as [number,number][]};
 const saved={...createLayoutReviewDocument(identity,{assets:{},rooms:{}},[],lineRoutes),manualLineRoutes:['wire']};
 expect(parseLayoutReviewDocument(JSON.stringify(saved),identity,assets,rooms).manualLineRoutes).toEqual(['wire']);
 expect(parseLayoutReviewDocument(JSON.stringify({...saved,manualLineRoutes:undefined}),identity,assets,rooms).manualLineRoutes).toBeUndefined();
 expect(()=>parseLayoutReviewDocument(JSON.stringify({...saved,manualLineRoutes:['missing']}),identity,assets,rooms)).toThrow('manual line route');
});

it('round trips independently moved drawing joins',()=>{
 const saved={...createLayoutReviewDocument(identity,{assets:{cb1:[10,20]},rooms:{}},[]),independentAssetPositions:['cb1']};
 expect(parseLayoutReviewDocument(JSON.stringify(saved),identity,assets,rooms).independentAssetPositions).toEqual(['cb1']);
 expect(()=>parseLayoutReviewDocument(JSON.stringify({...saved,independentAssetPositions:['missing']}),identity,assets,rooms)).toThrow('independent asset');
});

it('round trips quarter-turn object rotations and rejects invalid angles',()=>{
 const saved={...createLayoutReviewDocument(identity,{assets:{},rooms:{}},[]),rotations:{cb1:90,es1:270}};
 expect(parseLayoutReviewDocument(JSON.stringify(saved),identity,assets,rooms).rotations).toEqual(saved.rotations);
 expect(()=>parseLayoutReviewDocument(JSON.stringify({...saved,rotations:{cb1:45}}),identity,assets,rooms)).toThrow('object rotations');
});
it('persists deleted labels independently from equipment deletion marks',()=>{
 const saved={...createLayoutReviewDocument(identity,{assets:{},rooms:{}},[]),hiddenLabels:['cb1','cb1#earth']};
 const restored=parseLayoutReviewDocument(JSON.stringify(saved),identity,assets,rooms);
 expect(restored.hiddenLabels).toEqual(saved.hiddenLabels);
 expect(restored.markedForDeletion).toEqual([]);
 expect(parseLayoutReviewDocument(JSON.stringify({...saved,hiddenLabels:[]}),identity,assets,rooms).hiddenLabels).toEqual([]);
 for(const hiddenLabels of [['missing'],['cb1#invalid'],'cb1',[null]])expect(()=>parseLayoutReviewDocument(JSON.stringify({...saved,hiddenLabels}),identity,assets,rooms)).toThrow('Hidden labels');
});
