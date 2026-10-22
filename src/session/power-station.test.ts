import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { powerStationModel } from '../models/site/power-station';
import type { NetworkModel } from './model';

// Software-only fixture: explicitly invents baseline/permission and confirms every
// proposed transfer candidate. It establishes no installed site fact or permission.
function fictionalStationFixture(generator = 23): NetworkModel {
  const model = structuredClone(powerStationModel);
  model.id = `fictional-station-check-gen${generator}`;
  model.version = 'fictional-station-connectivity-test-1';
  model.name = 'Fictional station software connectivity fixture';
  model.synthetic = true;
  model.starting.devices = Object.fromEntries(Object.keys(model.starting.devices).map(id => [id, 'open']));
  model.starting.sources = Object.fromEntries(model.sources.map(source => [source.id, source.id === `station:gen-${String(generator).padStart(2, '0')}:source`]));
  for (const claim of [...model.assets, ...model.connections, ...model.sources, ...(model.earths ?? [])]) delete claim.knowledge;
  model.interlocks = { reviews: model.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Fictional test permission only; does not establish site interlock permission.', evidence: [] })), rules: [] };
  return model;
}

describe('station and 33 kV line drawing construction', () => {
  it('loads distinct generator roles with unconfirmed availability and no invented external source', () => {
    const result = new SimulationSession(powerStationModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toHaveLength(23);
    expect(Object.values(result.sources)).toHaveLength(23);
    expect(Object.values(result.sources).every(value => value === null)).toBe(true);
    expect(Object.values(result.devices).every(value => value === null)).toBe(true);
    expect(result.connectivity['station:sb01:bus'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['station:sb02:bus'].sourceStatus).toBe('unconfirmed');
    expect(result.conflicts).toEqual([]);
  });

  it('requires both independent tie breakers in series with the fixed limiting fuse', () => {
    const session = new SimulationSession(fictionalStationFixture());
    const fuse = session.snapshot().model.assets.find(asset => asset.id === 'station:tie:limiting-fuse');
    expect(fuse).toMatchObject({ kind: 'interface', positions: [], conductivePairs: [['station:tie:limiting-fuse:a', 'station:tie:limiting-fuse:b']] });
    expect(session.snapshot().model.sources.some(source => source.assetId === fuse?.id)).toBe(false);
    expect(session.changeDevice('station:gen-23:cb', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['station:sb01:bus'].sourceIds).toEqual(['station:gen-23:source']);
    expect(session.snapshot().connectivity['station:sb02:bus'].sourceIds).toEqual([]);
    expect(session.changeDevice('station:sb01:f2:cb', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['station:sb02:bus'].sourceIds).toEqual([]);
    expect(session.changeDevice('station:sb02:coupler:cb', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['station:sb02:bus'].sourceIds).toEqual(['station:gen-23:source']);
    expect(session.changeDevice('station:sb01:f2:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['station:sb02:bus'].sourceIds).toEqual([]);
  });

  it('keeps all actual station and line switching blocked with cited unresolved interlock conditions', () => {
    const session = new SimulationSession(powerStationModel);
    const before = session.snapshot();
    for (const [assetId, switching] of Object.entries(before.switching)) {
      expect(switching.reviewStatus).toBe('unresolved');
      expect(switching.positions.every(position => !position.allowed)).toBe(true);
      expect(switching.evidence[0]).toMatchObject({ document: assetId.startsWith('line33:') ? 'CB21OP055B-10016-DR-EL-0089.pdf' : '500CBC0002-13015-DR-EL-0001.pdf', page: 1, clause: expect.any(String) });
      expect(session.changeDevice(assetId, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(before);
    expect(before.history).toEqual([]);
  });

  it('retains all 23 distinct source/breaker/earth-switch roles and their cited bus membership', () => {
    const { model } = new SimulationSession(powerStationModel).snapshot();
    const membership = model.sources.map(source => {
      const key = source.id.replace(':source', '');
      const sourceAsset = model.assets.find(asset => asset.id === source.assetId);
      const breaker = model.assets.find(asset => asset.id === `${key}:cb`);
      const earth = model.assets.find(asset => asset.id === `${key}:es`);
      expect(sourceAsset?.kind).toBe('source'); expect(breaker?.kind).toBe('breaker'); expect(earth?.kind).toBe('earth-switch');
      expect(new Set([sourceAsset?.id, breaker?.id, earth?.id]).size).toBe(3);
      expect(sourceAsset?.aliases).toEqual(breaker?.aliases); expect(earth?.aliases).toEqual(breaker?.aliases);
      expect(model.connections.find(connection => connection.id === `${key}:source-link`)).toMatchObject({ from: `${key}:source:out`, to: `${key}:cb:in` });
      expect(model.connections.find(connection => connection.id === `${key}:es:branch`)).toMatchObject({ from: `${key}:cb:in`, to: `${key}:es:in` });
      return model.connections.find(connection => connection.id === `${key}:bus-link`)?.to;
    });
    expect(membership.filter(terminal => terminal === 'station:sb01:bus:bar')).toHaveLength(16);
    expect(membership.filter(terminal => terminal === 'station:sb02:bus:bar')).toHaveLength(7);
    expect(model.assets.every(asset => asset.evidenceIds?.length)).toBe(true);
    expect(model.connections.every(connection => connection.evidenceIds?.length)).toBe(true);
    expect(model.evidence?.every(record => record.references.every(reference => reference.document && reference.revision && reference.page === 1 && reference.clause))).toBe(true);
  });

  it.each([[23, 'sb01', 'sb02'], [16, 'sb02', 'sb01']])('retains generator %s source-side earthing outside its open breaker', (generator, own, other) => {
    const session = new SimulationSession(fictionalStationFixture(generator));
    const key = `station:gen-${generator}`;
    expect(session.changeDevice(`${key}:es`, 'closed')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity[`${key}:source`].earthIds).toEqual([`${key}:es:termination`]);
    expect(result.connectivity[`station:${own}:bus`].earthIds).toEqual([]);
    expect(result.connectivity[`station:${other}:bus`].earthIds).toEqual([]);
    expect(result.connectivity[`station:${own}:bus`].sourceIds).toEqual([]);
    expect(session.changeDevice(`${key}:cb`, 'closed')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity[`station:${own}:bus`].earthIds).toEqual([`${key}:es:termination`]);
    expect(result.connectivity[`station:${own}:bus`].sourceIds).toEqual([`${key}:source`]);
    expect(result.connectivity[`station:${other}:bus`].sourceIds).toEqual([]);
  });

  it('gives the station tie, provisional station-line join and AMR/IOP join reciprocal detail navigation', () => {
    const { model } = new SimulationSession(powerStationModel).snapshot();
    const view = (id: string) => model.presentation?.views.find(view => view.id === id);
    expect(view('sb01')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'station:tie:fuse-to-sb02', targetViewId: 'sb02', remoteAssetId: 'station:sb02:coupler:cb' }));
    expect(view('sb02')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'station:tie:fuse-to-sb02', targetViewId: 'sb01', remoteAssetId: 'station:tie:limiting-fuse' }));
    expect(view('sb02')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'line33:station-to-recloser', targetViewId: 'amr' }));
    expect(view('amr')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'line33:station-to-recloser', targetViewId: 'sb02' }));
    expect(view('amr')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'line33:tie-to-201', targetViewId: 'iop' }));
    expect(view('iop')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'line33:tie-to-201', targetViewId: 'amr' }));
  });

  it('retains transformer transfer candidates and unfinished LV points without inventing phase-earth continuity', () => {
    const { model } = new SimulationSession(powerStationModel).snapshot();
    const transformers = model.assets.filter(asset => asset.kind === 'transformer');
    expect(transformers).toHaveLength(9);
    for (const asset of transformers) {
      expect(asset.knowledge).toBe('provisional');
      expect(asset.conductivePairs).toEqual([]); expect(asset.earthPairs).toEqual([]);
      expect(asset.reviewIds).toContain('PS-WINDINGS');
      expect(model.boundaries?.filter(boundary => asset.terminals.includes(boundary.terminal))).toHaveLength(2);
      expect(model.evidence?.find(record => record.id === asset.evidenceIds?.[0])?.status).toBe('provisional');
    }
    for (const id of ['station:sb01:f6:transformer', 'station:sb02:f2:transformer']) {
      expect(transformers.find(asset => asset.id === id)?.sourcePairs).toEqual([]);
      expect(model.earths?.find(earth => earth.id === `${id}:drawn-ground`)?.terminal).toBe(`${id}:earth-reference`);
    }
    const duplicateTf04 = transformers.filter(asset => asset.aliases?.includes('TF-04'));
    expect(duplicateTf04.map(asset => asset.id).sort()).toEqual(['station:sb01:spare-tf04:transformer', 'station:sb02:f4:transformer']);
    for (const id of ['station:sb01:f5:interface', 'station:sb02:f3:interface', 'station:sb01:spare-tf04:interface']) {
      expect(model.assets.find(asset => asset.id === id)).toMatchObject({ kind: 'interface', knowledge: 'unresolved' });
      expect(model.boundaries?.find(boundary => boundary.terminal === `${id}:port`)).toMatchObject({ sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' });
    }
    expect(model.connections.find(connection => connection.id === 'line33:station-to-recloser')).toMatchObject({ knowledge: 'provisional', reviewIds: ['PS-SB02-SR002', 'PS-DUPLICATE-TF04'] });
  });

  it('retains the line trunk and independent branches without treating arrestors as earth switches', () => {
    const session = new SimulationSession(fictionalStationFixture(16));
    const lineDevices = session.snapshot().model.assets.filter(asset => asset.id.startsWith('line33:') && asset.positions.length);
    expect(lineDevices).toHaveLength(10);
    expect(lineDevices.some(asset => asset.kind === 'earth-switch')).toBe(false);
    expect(session.snapshot().model.earths?.some(earth => earth.id.startsWith('line33:'))).toBe(false);
    for (const id of ['station:gen-16:cb', 'station:sb02:f4:cb', 'line33:pole-1-recloser', 'line33:pole-2-abs', 'line33:tie-in-abs', 'line33:pole-201-abs']) expect(session.changeDevice(id, 'closed')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity['line33:bigge-sp1:interface'].sourceIds).toEqual(['station:gen-16:source']);
    expect(result.connectivity['line33:bigge-sp1-sp2:interface'].sourceIds).toEqual(['station:gen-16:source']);
    expect(result.connectivity['line33:hopper-10:interface'].sourceIds).toEqual([]);
    expect(result.connectivity['line33:norfolk:interface'].sourceIds).toEqual([]);
    expect(result.connectivity['line33:end-287:interface'].sourceIds).toEqual([]);
    expect(session.changeDevice('line33:hopper-286-fused-abs', 'closed')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['line33:hopper-10:interface'].sourceIds).toEqual(['station:gen-16:source']);
    expect(result.connectivity['line33:norfolk:interface'].sourceIds).toEqual([]);
    expect(session.changeDevice('line33:pole-2-abs', 'open')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['line33:hopper-10:interface'].sourceIds).toEqual([]);
    expect(result.connectivity['line33:bigge-sp1:interface'].sourceIds).toEqual([]);
  });

  it('keeps the provisional winding source candidate separate from unconfirmed earth transfer', () => {
    const session = new SimulationSession(fictionalStationFixture(16));
    session.changeDevice('station:sb02:f4:es', 'closed');
    const result = session.snapshot();
    expect(result.connectivity['station:sb02:f4:transformer'].terminalEarths).toEqual({
      'station:sb02:f4:transformer:hv': ['station:sb02:f4:es:termination'],
      'station:sb02:f4:transformer:output': [],
    });
    expect(result.connectivity['line33:pole-1-recloser'].earthIds).toEqual([]);
    expect(result.connectivity['station:sb02:bus'].earthIds).toEqual([]);
  });

  it('round-trips exact source evidence, unknown states and model-owned presentation without PDFs', () => {
    const original = new SimulationSession(powerStationModel);
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(powerStationModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const result = reopened.snapshot();
    expect(result.model).toEqual(original.snapshot().model);
    expect(result.devices).toEqual(original.snapshot().devices);
    expect(result.sources).toEqual(original.snapshot().sources);
    expect(result.connectivity).toEqual(original.snapshot().connectivity);
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'sb01', 'sb02', 'amr', 'iop', 'sb01-generators-1', 'sb01-generators-2', 'sb01-generators-3', 'sb01-generators-4', 'sb02-generators-1', 'sb02-generators-2']);
    expect(result.model.evidence?.find(record => record.id === 'PS-TIE')?.references[0]).toEqual({ document: '500CBC0002-13015-DR-EL-0001.pdf', revision: '3 (18/07/2022; UPDATED AS PER REDLINES)', page: 1, clause: 'Drawing region: C-E, SB01 F2 / limiting fuse / SB02 incoming coupler' });
    expect(result.model.evidence?.find(record => record.id === 'PL-END-hopper-10')?.summary).toContain('520CBC0007-2130-DR-EL-0003');
    expect(result.model.assets.find(asset => asset.id === 'station:sb01:f4:interface')?.aliases).toContain('MINE OPF O/H LINE No.2');
    expect(result.model.assets.find(asset => asset.id === 'station:sb02:f1:interface')?.aliases).toContain('MINE OPF O/H LINE No.1');
    expect(result.mode).toBe('exploration');
    expect(Object.values(result.switching).every(status => status.positions.every(position => !position.allowed))).toBe(true);
  });
});
