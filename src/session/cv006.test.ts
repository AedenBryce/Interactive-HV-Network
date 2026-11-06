import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { cv006Model } from '../models/site/cv006';
import type { NetworkModel } from './model';

function fictionalSwitchingContract(): NetworkModel {
  const fixture = structuredClone(cv006Model);
  fixture.id = 'fictional-cv006-connectivity'; fixture.version = 'fictional-check-1'; fixture.synthetic = true;
  fixture.name = 'Fictional CV006 switching contract';
  fixture.evidence!.push({ id: 'fictional-cv006-contract', status: 'supported', summary: 'Explicit fictional software example only: copied candidate source paths/MC410A continuation and RMU position relationships are defined for these checks; winding earth transfer is absent, RMU switches start Service, binary contacts closed, source enabled and no interlocks apply. No installed-network permission or acceptance is established.', references: [{ document: 'Fictional CV006 software contract', revision: '1', page: 1, clause: 'Explicitly defined example' }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-cv006-contract']; }
  fixture.boundaries = [];
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional enabled source', assetId: 'cv006:interface:sw411', terminal: 'cv006:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-cv006-contract'] }];
  fixture.starting.sources = { 'fictional-source': true };
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.positions.some(position => position.id === 'service') ? 'service' : 'closed']));
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicitly defined fictional contract; not actual switching permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('CV006 drawing construction through the session', () => {
  it('keeps the SW411-fed overhead route distinct from the disputed station/33kV comparison', () => {
    const result = new SimulationSession(cv006Model).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(result.sources).toEqual({});
    expect(result.model.assets.find(asset => asset.id === 'cv006:interface:sw411')?.aliases).toEqual(expect.arrayContaining(['SW411 tier 3', 'CB SPARE', 'CB OHL FD', 'OHL WEST']));
    expect(result.model.assets.find(asset => asset.id === 'cv006:interface:line-comparison')).toMatchObject({ kind: 'interface', terminals: ['cv006:interface:line-comparison:22kv', 'cv006:interface:line-comparison:33kv'], conductivePairs: [], sourcePairs: [], earthPairs: [] });
    expect(result.model.assets.some(asset => asset.id === 'station:tf04' || asset.id === 'cv006:tf04')).toBe(false);
    expect(Object.keys(result.devices).filter(id => id.startsWith('cv006:'))).toHaveLength(6);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    expect(result.connectivity['cv006:pole:201'].sourceStatus).toBe('unconfirmed');
    expect(result.model.assets.find(asset => asset.id === 'cv006:interface:hopper10')?.aliases).toContain('RMU420');
    expect(result.model.assets.find(asset => asset.id === 'cv006:interface:drop-tower-workshop')?.kind).toBe('interface');
    expect(result.model.connections.find(connection => connection.id === 'cv006:pole286-to-287')?.from).toBe('cv006:pole:286:port');
    expect(result.model.connections.find(connection => connection.id === 'cv006:pole286-fused-branch')?.from).toBe('cv006:pole:286:port');
  });

  it('keeps RMU breakers separate from their earth-contact switches and preserves the Hopper8/RM419/RM418 HV interfaces', () => {
    const result = new SimulationSession(cv006Model).snapshot();
    for (const board of ['rm406', 'rm410']) {
      expect(result.model.assets.find(asset => asset.id === `${board}:bus`)?.kind).toBe('bus');
      for (const suffix of ['sw01', 'sw02', 'sw03', 'sw04']) {
        const asset = result.model.assets.find(item => item.id === `${board}:${suffix}`);
        expect(asset).toMatchObject({ kind: 'disconnector', knowledge: 'provisional', terminals: [`${board}:${suffix}:line`, `${board}:${suffix}:cable`, `${board}:${suffix}:earth`] });
        expect(asset?.positions.map(position => position.id)).toEqual(['service', 'isolated', 'earthed']);
        expect(result.devices[`${board}:${suffix}`]).toBe(null);
      }
      for (const suffix of ['cb01', 'cb02', 'cb03']) expect(result.model.assets.find(asset => asset.id === `${board}:${suffix}`)?.kind).toBe('breaker');
    }
    expect(result.model.assets.find(asset => asset.id === 'rm406:sw01')?.aliases).toContain('RM418-RM406-P1 (retained cable tag; not another live feed)');
    expect(result.model.assets.find(asset => asset.id === 'rm406:interface:hopper8')?.aliases).toContain('SS416-HV416');
    expect(result.model.assets.find(asset => asset.id === 'rm410:interface:rm419')?.aliases).toContain('RM419-SW01');
    expect(result.model.assets.find(asset => asset.id === 'rm410:interface:rm418')?.aliases).toContain('RM418-SW01');
    expect(result.model.assets.some(asset => asset.id === 'rm419:sw01' || asset.id === 'rm418:sw01' || asset.id === 'ss416:tf416')).toBe(false);
    expect(result.model.connections.find(item => item.id === 'rm406:incoming-pole57')?.from).toBe('cv006:fused-abs:57:b');
    expect(result.model.connections.find(item => item.id === 'rm410:incoming-pole49-40')?.from).toBe('cv006:abs:49-40:b');
  });

  it('retains four separate VSD AC boundaries and the MC410A→MC410B chain without a phase-MEN earth connection', () => {
    const result = new SimulationSession(cv006Model).snapshot();
    expect(Object.keys(result.devices)).toHaveLength(26);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    expect(result.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(4);
    expect(result.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(4);
    for (const id of ['rm406:mc406a:bus', 'rm410:mc410b:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    for (const [board, drive] of [['rm406', 'vs4061'], ['rm410', 'vs4101']]) {
      for (const input of ['a', 'b']) expect(result.model.assets.find(asset => asset.id === `${board}:${drive}:input-${input}:boundary`)).toMatchObject({ kind: 'interface', conductivePairs: [], positions: [], knowledge: 'provisional' });
    }
    expect(result.model.assets.find(asset => asset.id === 'rm410:interface:mc410a')).toMatchObject({ kind: 'interface', positions: [], terminals: ['rm410:interface:mc410a:input', 'rm410:interface:mc410a:to-mc410b'], knowledge: 'provisional' });
    expect(result.model.connections.find(item => item.id === 'rm410:mc410a-to-mc410b')?.from).toBe('rm410:interface:mc410a:to-mc410b');
    expect(result.model.assets.find(asset => asset.id === 'rm406:tf406b:transformer')?.aliases).toEqual(expect.arrayContaining(['RM406 CB02/SW03 in RMU sheets', 'RM406-SW02 in MC406A sheet', '433V /415V unresolved']));
    expect(result.model.evidence?.find(record => record.id === 'CV-MC410B-MEN-REDLINE')?.summary).toContain('MEN LINK REMOVED LOCATED IN MC410A');
    expect(result.model.assets.some(asset => asset.kind === 'earth-switch')).toBe(false);
    for (const transformer of result.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(transformer.knowledge).toBe('provisional');
      expect(transformer.conductivePairs).toEqual([]);
      expect(transformer.earthPairs).toEqual([]);
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.sourceCoverage === 'unconfirmed' && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
  });

  it('saves all focused views and exact provenance, blocks unresolved controls and rejects a damaged scenario atomically', () => {
    const session = new SimulationSession(cv006Model); const result = session.snapshot();
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'overhead', 'rm406-hv', 'rm410-hv', 'head-lv', 'tail-lv']);
    expect(result.model.presentation?.views.find(view => view.id === 'overview')?.assetIds).not.toContain('rm410:mc410b:cb');
    expect(result.model.presentation?.views.find(view => view.id === 'rm406-hv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'rm406:vs4061:input-a:switch', targetViewId: 'head-lv' }));
    expect(result.model.presentation?.views.find(view => view.id === 'head-lv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'rm406:sw02', targetViewId: 'rm406-hv' }));
    expect(result.model.evidence?.find(record => record.id === 'CV-MC410B-MEN-REDLINE')?.references).toContainEqual(expect.objectContaining({ document: 'CB19OP001B-04057-DR-EL-0005.pdf', revision: '2A redline / underlying 2 (11.01.22 / underlying 27.08.21; UPDATED TIER NUMBER AND MCCB SIZE; AS BUILT changes-as-marked)', page: 1 }));
    expect(new Set(result.model.evidence?.flatMap(record => record.references.map(reference => reference.document))).size).toBe(10);
    expect(result.model.reviews?.map(review => review.id)).toEqual(['CV-R01', 'CV-R02', 'CV-R03', 'CV-R04', 'CV-R05', 'CV-R06', 'CV-R07', 'CV-R08', 'CV-R09', 'CV-R10', 'CV-R11']);
    expect(result.model.reviews?.every(review => review.status === 'open')).toBe(true);
    for (const id of Object.keys(result.devices)) {
      const position = id.startsWith('rm') && /:sw0[1-4]$/.test(id) ? 'service' : 'closed';
      expect(session.changeDevice(id, position)).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(result);
    const file = JSON.parse(JSON.stringify(session.saveScenario())); const reopened = new SimulationSession(cv006Model);
    expect(reopened.loadScenario(file)).toEqual({ ok: true }); expect(reopened.snapshot()).toEqual(result);
    file.model.connections[0].from = 'unrepresented-terminal';
    expect(reopened.loadScenario(file).ok).toBe(false); expect(reopened.snapshot()).toEqual(result);
  });

  it('demonstrates head/tail independence, MC410B tracing and impact/undo only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.snapshot().model.version).toBe('fictional-check-1');
    expect(session.snapshot().connectivity['rm410:mc410b:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.trace('rm410:mc410b:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-source', assetIds: expect.arrayContaining(['cv006:abs:49-40', 'rm410:sw01', 'rm410:cb02', 'rm410:sw03', 'rm410:tf410b:transformer', 'rm410:interface:mc410a', 'rm410:mc410b:cb']) })] });
    expect(session.changeDevice('rm410:cb02', 'open')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity['rm410:mc410b:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['rm406:mc406a:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.impact.find(item => item.assetId === 'rm410:mc410b:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.changeDevice('rm406:sw01', 'isolated')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['rm406:mc406a:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['rm410:mc410b:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.reset()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['rm406:mc406a:bus'].sourceIds).toEqual(['fictional-source']);
    expect(new SimulationSession(cv006Model).snapshot().devices['rm406:sw01']).toBe(null);
  });

  it('keeps fictional RMU cable earthing separate from source service and transformer winding earth continuity', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.changeDevice('rm406:sw03', 'earthed')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['rm406:tf406b:transformer'].terminalEarths['rm406:tf406b:hv']).toEqual(['rm406:sw03:earth-termination']);
    expect(result.connectivity['rm406:tf406b:transformer'].terminalEarths['rm406:tf406b:lv']).toEqual([]);
    expect(result.connectivity['rm406:mc406a:bus'].earthStatus).toBe('disconnected');
    expect(result.connectivity['rm406:mc406a:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['rm406:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.conflicts).toEqual([]);
  });
});
