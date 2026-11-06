import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import type { NetworkModel } from './model';

function fictionalWhole(): NetworkModel {
  const fixture = structuredClone(wholeNetworkModel);
  fixture.id = 'fictional-whole-network'; fixture.version = 'fictional-cross-area-1'; fixture.synthetic = true;
  fixture.name = 'Fictional whole-network software contract · no site permission';
  fixture.evidence!.push({ id: 'fictional-whole-contract', status: 'supported', summary: 'Software-only contract: copied declared relationships are defined conducting candidates, independent transformer earth arrays stay empty, all contacts open except four defined supply contacts; one invented test source at Bus B. No actual state, interlock permission, source availability or installed acceptance is asserted.', references: [{ document: 'Fictional whole-network software contract', revision: '1', page: 1, clause: 'Explicit software example only' }] });
  for (const claim of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-whole-contract']; }
  fixture.boundaries = [];
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length).map(asset => [asset.id, asset.positions.some(position => position.id === 'isolated') ? 'isolated' : 'open']));
  for (const id of ['sw411:tier-13:cb', 'sw431:in:cb', 'sw431:tf431:hv-cb', 'sw431:mc431:cb']) fixture.starting.devices[id] = 'closed';
  fixture.sources = [{ id: 'fictional-whole-source', assetId: 'sw411:bus-b', terminal: 'sw411:bus-b:bar', label: 'Invented software source at SW411 Bus B', knowledge: 'supported', evidenceIds: ['fictional-whole-contract'] }];
  fixture.starting.sources = { 'fictional-whole-source': true };
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional software contract only; no site permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('whole-network construction through the session', { timeout: 60000 }, () => {
  it('opens all thirteen real packages with separate review identities and unconfirmed actual states', () => {
    const result = new SimulationSession(wholeNetworkModel).snapshot();
    expect(result.model).toMatchObject({ id: 'site-whole-network', synthetic: false });
    for (const id of ['sw411:bus-a', 'station:sb01:bus', 'sw431:bus', 'sw435:bus', 'sw421:bus', 'sw426:bus', 'sw454:bus', 'sw451:bus', 'rm406:bus', 'wh:h1:rm417:bus', 'rm721:bus', 'rm420:bus', 'camp:rm700:bus']) expect(result.model.assets.some(asset => asset.id === id)).toBe(true);
    expect(result.model.evidence?.filter(record => record.id.startsWith('WN-AREA-'))).toHaveLength(13);
    expect(result.model.assets).toHaveLength(961);
    expect(Object.keys(result.devices)).toHaveLength(558);
    expect(Object.keys(result.sources)).toHaveLength(28);
    expect(result.model.reviews?.find(review => review.id === 'sw411:R001')?.evidenceIds).toContain('SW411-IN-03');
    expect(result.model.reviews?.find(review => review.id === 'station:R001')?.evidenceIds).toContain('PS-SB01-F4');
    expect(result.model.assets.find(asset => asset.id === 'sw411:in-03:interface')?.reviewIds).toContain('sw411:R001');
    expect(Object.values(result.devices).every(state => state === null)).toBe(true);
    expect(Object.values(result.sources).every(state => state === null)).toBe(true);
    expect(Object.values(result.switching).every(control => control.reviewStatus === 'unresolved')).toBe(true);
    expect(result.model.reviews?.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  });

  it('reconciles exact cable ends without retaining the remote RM419 bypass or inventing disputed supplies', () => {
    const { model } = new SimulationSession(wholeNetworkModel).saveScenario();
    for (const [id, from, to] of [
      ['sw454', 'sw411:tier-01:interface:port', 'sw454:interface:sw411:port'],
      ['sw451', 'sw411:tier-02:interface:port', 'sw451:interface:sw411:port'],
      ['sw435', 'sw411:tier-04:interface:port', 'sw435:interface:sw411:port'],
      ['sw431', 'sw411:tier-13:interface:port', 'sw431:interface:sw411:port'],
      ['sw426', 'sw411:tier-14:interface:port', 'sw426:interface:sw411:port'],
      ['sw421', 'sw411:tier-15:interface:port', 'sw421:interface:sw411:port'],
      ['crushing-tie', 'sw431:interface:sw435:port', 'sw435:interface:sw431:port'],
      ['hopper1', 'rm413:interface:rm417:port', 'wh:h1:interface:rm413:port'],
      ['hopper8', 'rm406:interface:hopper8:port', 'wh:h8:interface:rm406:port'],
      ['hopper9', 'rm410:interface:rm419:incoming', 'wh:h9:interface:rm410:port'],
    ]) expect(model.connections.find(connection => connection.id === `whole:join:${id}`)).toMatchObject({ from, to });
    for (const [id, from, to] of [
      ['rm721', 'sw411:tier-16:interface:port', 'services:interface:sw411:port'],
      ['mine-tf03', 'station:sb01:f1:interface:port', 'mine:interface:station-tf03:port'],
      ['village', 'station:sb01:f3:interface:port', 'camp:interface:station-village:port'],
    ]) {
      expect(model.connections.find(connection => connection.id === `whole:join:${id}`)).toMatchObject({ from, to, knowledge: 'provisional', evidenceIds: [`WN-JOIN-${id}`], reviewIds: [`WN-JOIN-${id}`] });
      expect(model.reviews?.find(review => review.id === `WN-JOIN-${id}`)?.status).toBe('open');
      expect(model.evidence?.find(record => record.id === `WN-JOIN-${id}`)?.references.every(reference => reference.page === 1 && reference.revision && reference.clause)).toBe(true);
    }
    expect(model.assets.find(asset => asset.id === 'rm410:interface:rm419')).toMatchObject({ conductivePairs: [], sourcePairs: [], earthPairs: [] });
    expect(model.connections.some(connection => connection.id === 'rm410:rm419-through-rm418')).toBe(false);
    expect(model.connections.filter(connection => connection.id === 'wh:h9-to-h7:cable')).toHaveLength(1);
    const unjoined = ['cv006:interface:hopper10:port', 'rm712:interface:sw426:port', 'sw426:interface:rm712:port', 'rm721:interface:rm712:port', 'sw411:in-01:interface:port', 'sw411:in-02:interface:port', 'rm420:tf420a:primary-connection:port', 'rm420:tf420b:primary-connection:port'];
    expect(model.connections.filter(connection => connection.id.startsWith('whole:join:')).some(connection => unjoined.includes(connection.from) || unjoined.includes(connection.to))).toBe(false);
    expect(model.connections.filter(connection => connection.id.startsWith('whole:join:'))).toHaveLength(17);
  });

  it('provides a separated whole-network orientation and navigable area views with original detail geometry', () => {
    const { model } = new SimulationSession(wholeNetworkModel).saveScenario();
    const presentation = model.presentation!;
    expect(presentation.overviewId).toBe('whole/overview');
    // 121 original area views, whole orientation and separated former-line references.
    expect(presentation.views).toHaveLength(123);
    const overview = presentation.views.find(view => view.id === 'whole/overview')!;
    const buses = ['sw411:bus-a', 'station:sb01:bus', 'sw431:bus', 'sw435:bus', 'sw421:bus', 'sw426:bus', 'sw454:bus', 'sw451:bus', 'rm406:bus', 'wh:h1:rm417:bus', 'rm721:bus', 'rm420:bus', 'camp:rm700:bus'];
    for (const id of buses) expect(overview.assetIds).toContain(id);
    expect(new Set(buses.map(id => overview.layout.assets[id].join(','))).size).toBe(13);
    const sw411 = presentation.views.find(view => view.id === 'sw411/overview')!;
    expect(sw411.layout.assets['sw411:bus-a']).toEqual([500, 400]);
    const boundary = sw411.boundaries?.find(item => item.connectionId === 'whole:join:sw454');
    expect(boundary).toMatchObject({ remoteAssetId: 'sw454:interface:sw411' });
    expect(boundary?.targetViewId.startsWith('stockpile/')).toBe(true);
    expect(overview.boundaries?.find(item => item.connectionId === 'whole:join:hopper1')?.targetViewId).toMatch(/^(services|western)\//);
  });

  it('demonstrates two-ended cross-area source paths, impacts, undo and reset only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalWhole());
    let result = session.snapshot();
    expect(result.model).toMatchObject({ id: 'fictional-whole-network', version: 'fictional-cross-area-1', synthetic: true });
    expect(result.connectivity['sw431:mc431:bus'].sourceIds).toEqual(['fictional-whole-source']);
    expect(session.trace('sw431:mc431:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ connectionIds: expect.arrayContaining(['whole:join:sw431']), assetIds: expect.arrayContaining(['sw411:tier-13:cb', 'sw431:in:cb', 'sw431:tf431:transformer']) })] });
    expect(session.changeDevice('sw411:tier-13:cb', 'open')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['sw431:mc431:bus'].sourceIds).toEqual([]);
    expect(result.impact.find(item => item.assetId === 'sw431:mc431:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw431:mc431:bus'].sourceIds).toEqual(['fictional-whole-source']);
    expect(session.changeDevice('sw431:in:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw431:mc431:bus'].sourceIds).toEqual([]);
    expect(session.reset()).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['sw431:mc431:bus'].sourceIds).toEqual(['fictional-whole-source']);
    expect(result.history).toEqual([]);
  });

  it('carries cable-side earth across the real join without bridging transformer windings in the fictional contract', () => {
    const session = new SimulationSession(fictionalWhole());
    expect(session.changeDevice('sw431:in:cb', 'open')).toEqual({ ok: true });
    expect(session.changeDevice('sw431:in:es', 'closed')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw411:tier-13:interface'].earthIds).toEqual(['sw431:in:es:termination']);
    expect(result.connectivity['sw431:bus'].earthIds).toEqual([]);
    expect(result.connectivity['sw431:mc431:bus'].earthIds).toEqual([]);
    expect(result.conflicts).toEqual([expect.objectContaining({ sourceId: 'fictional-whole-source', earthId: 'sw431:in:es:termination', connectionIds: expect.arrayContaining(['whole:join:sw431']) })]);
  });

  it('round-trips original evidence, scoped reviews, all detail targets and missing endpoints without PDFs', () => {
    const session = new SimulationSession(wholeNetworkModel); const saved = JSON.parse(JSON.stringify(session.saveScenario()));
    expect(saved.model.boundaries.some((boundary: { terminal: string }) => boundary.terminal === 'rm420:mc420a:interface:port')).toBe(true);
    expect(saved.model.boundaries.some((boundary: { terminal: string }) => boundary.terminal === 'wh:h3:mc416a:interface:port')).toBe(true);
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(saved)).toEqual({ ok: true });
    expect(reopened.saveScenario()).toEqual(saved);
    const invalid = structuredClone(saved);
    invalid.model.assets.find((asset: { id: string }) => asset.id === 'sw411:in-03:interface').reviewIds = ['R001'];
    expect(reopened.loadScenario(invalid).ok).toBe(false);
    expect(reopened.saveScenario()).toEqual(saved);
    const invalidTarget = structuredClone(saved); invalidTarget.model.presentation.views[0].boundaries[0].targetViewId = 'missing-area';
    expect(reopened.loadScenario(invalidTarget).ok).toBe(false);
    expect(reopened.saveScenario()).toEqual(saved);
    const historical = structuredClone(saved); historical.model.version = 'construction-historical-example'; historical.modelVersion = historical.model.version;
    expect(reopened.loadScenario(historical)).toEqual({ ok: true });
    expect(reopened.changeDevice('sw411:tier-13:cb', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(reopened.changeSource('station:gen-23:supply', true)).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
  });

  it('requires the actual RM419 switching route rather than the removed CV006 conducting proxy in a fictional scenario', () => {
    const fixture = fictionalWhole(); fixture.version = 'fictional-western-cross-area-1';
    fixture.sources = [{ id: 'fictional-western-source', label: 'Invented RM410 bus source', assetId: 'rm410:bus', terminal: 'rm410:bus:bar', knowledge: 'supported', evidenceIds: ['fictional-whole-contract'] }];
    fixture.starting.sources = { 'fictional-western-source': true };
    fixture.starting.devices['rm410:cb03'] = 'closed'; fixture.starting.devices['rm410:sw04'] = 'service';
    for (const id of ['wh:h9:rm419:sw01', 'wh:h9:rm419:sw02']) fixture.starting.devices[id] = 'service';
    for (const id of ['wh:h7:rm418:sw01', 'wh:h7:rm418:cb03', 'wh:h7:rm418:cb03:disconnect', 'wh:h7:mc418a:in']) fixture.starting.devices[id] = 'closed';
    fixture.evidence!.find(record => record.id === 'fictional-whole-contract')!.summary += ' Additional western software contract: RM410 CB03 closed / SW04 service, actual RM419 SW01/SW02 service, RM418 SW01/CB03/disconnecting contact and MC418A incomer closed. No actual site states or permissions established.';
    const session = new SimulationSession(fixture);
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual(['fictional-western-source']);
    expect(session.trace('wh:h7:mc418a:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ connectionIds: expect.arrayContaining(['whole:join:hopper9', 'wh:h9-to-h7:cable']), assetIds: expect.arrayContaining(['rm410:cb03', 'rm410:sw04', 'wh:h9:rm419:sw01', 'wh:h9:rm419:sw02', 'wh:h7:rm418:sw01']) })] });
    expect(session.changeDevice('wh:h9:rm419:sw01', 'isolated')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual([]);
  });

  it('records only the owner-confirmed TF04 33 kV feed to Hopper10 and preserves its exact decision in scenarios', () => {
    const session = new SimulationSession(wholeNetworkModel); const saved = session.saveScenario(); const model = saved.model;
    expect(model.version).toBe('construction-2026-10-22.4');
    expect(model.connections.find(connection => connection.id === 'whole:join:hopper10-tf04')).toMatchObject({ from: 'line33:hopper-10:interface:port', to: 'rm420:interface:pole286:port', knowledge: 'owner-confirmed', evidenceIds: ['WN-H10-TF04-SOURCE'], reviewIds: ['WN-H10-TF04-SOURCE'] });
    const decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'the 33kV TF04 line feeds Hopper10' };
    expect(model.evidence?.find(record => record.id === 'WN-H10-TF04-SOURCE')).toMatchObject({ status: 'owner-confirmed', confirmation: decision, references: [expect.objectContaining({ document: 'CB21OP055B-10016-DR-EL-0089.pdf', revision: '0 (10.06.22; ISSUED FOR CONSTRUCTION)', page: 1 }), expect.objectContaining({ document: '520CBC0007-2130-DR-EL-0003.pdf', revision: '3 (28.01.25; MODIFIED AS FOUND 23.10.23)', page: 1 })] });
    expect(model.reviews?.find(review => review.id === 'WN-H10-TF04-SOURCE')).toMatchObject({ status: 'resolved', resolution: decision });
    expect(model.reviews?.find(review => review.id === 'H10-Q01')?.status).toBe('open');
    expect(model.reviews?.find(review => review.id === 'CV-R01')?.status).toBe('open');
    expect(model.assets.find(asset => asset.id === 'rm420:interface:pole286')?.label).toContain('TF04 33 kV');
    expect(model.connections.some(connection => [connection.from, connection.to].includes('cv006:interface:hopper10:port') && [connection.from, connection.to].includes('rm420:interface:pole286:port'))).toBe(false);
    expect(model.connections.some(connection => /^whole:join:/.test(connection.id) && [connection.from, connection.to].some(terminal => /rm420:tf420[ab]:primary/.test(terminal)))).toBe(false);
    expect(Object.values(saved.devices).every(state => state === null)).toBe(true);
    expect(Object.values(saved.sources).every(state => state === null)).toBe(true);
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(reopened.saveScenario()).toEqual(saved);
  });

  it('offers thirteen nonoverlapping labelled area cards with preserved scenario navigation targets', () => {
    const session = new SimulationSession(wholeNetworkModel); const saved = session.saveScenario();
    const overview = saved.model.presentation!.views.find(view => view.id === 'whole/overview')!;
    expect(overview.regions).toHaveLength(13);
    const regions = overview.regions!;
    expect(regions.map(region => region.id)).toEqual(['sw411', 'station', 'crushing-1', 'crushing-2', 'screening', 'desands', 'stockpile', 'train-loading', 'cv006', 'western', 'services', 'hopper-10', 'mine-camp']);
    expect(regions.find(region => region.id === 'station')).toMatchObject({ label: 'Power station\n33 kV line', bounds: [20, 0, 1060, 950], targetViewId: 'station/overview' });
    expect(regions.find(region => region.id === 'hopper-10')?.label).toBe('Hopper 10\nTF04 33 kV');
    for (const region of regions) {
      expect(saved.model.presentation!.views.some(view => view.id === region.targetViewId)).toBe(true);
      const [x, y, width, height] = region.bounds;
      expect(x).toBeGreaterThanOrEqual(overview.bounds[0]); expect(y).toBeGreaterThanOrEqual(overview.bounds[1]);
      expect(x + width).toBeLessThanOrEqual(overview.bounds[0] + overview.bounds[2]);
      expect(y + height).toBeLessThanOrEqual(overview.bounds[1] + overview.bounds[3]);
      for (const other of regions.filter(candidate => candidate.id !== region.id)) {
        const [ox, oy, ow, oh] = other.bounds;
        expect(x + width <= ox || ox + ow <= x || y + height <= oy || oy + oh <= y).toBe(true);
      }
    }
    expect(overview.layout.assets['station:sb01:bus'][1]).toBeGreaterThan(250);
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(reopened.saveScenario().model.presentation!.views[0].regions).toEqual(regions);
  });

  it('records both selected 33 kV primaries without adding a selector, 22 kV feed or confirmed winding-transfer policy', () => {
    const session = new SimulationSession(wholeNetworkModel); const saved = session.saveScenario(); const model = saved.model;
    const decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'They are connected with 33kV from the Primary to the 33kV Bus, back through RM420-SW01 onto the 33kV line fed from TF04 supply' };
    expect(model.evidence?.find(record => record.id === 'WN-H10-PRIMARY33-CONFIGURATION')).toMatchObject({ status: 'owner-confirmed', confirmation: decision });
    expect(model.reviews?.find(review => review.id === 'WN-H10-PRIMARY33-CONFIGURATION')).toMatchObject({ status: 'resolved', resolution: decision });
    expect(model.assets.find(asset => asset.id === 'rm420:bus')).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-H10-PRIMARY33-CONFIGURATION']) });
    for (const suffix of ['a', 'b']) {
      const prefix = `rm420:tf420${suffix}`;
      expect(model.connections.find(connection => connection.id === `whole:primary33:tf420${suffix}`)).toMatchObject({ from: `${prefix}:primary-connection:port`, to: `${prefix}:primary33`, knowledge: 'owner-confirmed', evidenceIds: ['WN-H10-PRIMARY33-CONFIGURATION'] });
      expect(model.assets.find(asset => asset.id === prefix)).toMatchObject({ knowledge: 'provisional', positions: [], earthPairs: [] });
      expect(model.connections.some(connection => connection.from === `${prefix}:primary22` || connection.to === `${prefix}:primary22`)).toBe(false);
      expect(model.boundaries?.find(boundary => boundary.terminal === `${prefix}:primary22`)).toMatchObject({ sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' });
      expect(model.connections.find(connection => connection.id === `${prefix}:cb-sw`)).toMatchObject({ from: `${prefix}:cb:out`, to: `${prefix}:sw:in` });
      expect(model.connections.find(connection => connection.id === `${prefix}:cable-SS420-TF420${suffix.toUpperCase()}-P01`)).toMatchObject({ from: `${prefix}:sw:out`, to: `${prefix}:primary-connection:port` });
      expect(saved.devices[`${prefix}:cb`]).toBeNull(); expect(saved.devices[`${prefix}:sw`]).toBeNull();
    }
    expect(saved.devices['rm420:sw01']).toBeNull(); expect(Object.values(saved.sources).every(state => state === null)).toBe(true);
    expect(model.reviews?.find(review => review.id === 'H10-Q04')?.status).toBe('open');
    expect(model.reviews?.find(review => review.id === 'CV-R01')?.status).toBe('open');
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(reopened.saveScenario()).toEqual(saved);
  });

  it('uses the confirmed SW411 tier03 RMU feed and removes the former 22 kV Hopper10 line without merging pole identities', () => {
    const model = new SimulationSession(wholeNetworkModel).saveScenario().model;
    const decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'Rm406 and Rm410 do get their 22kV from SW411 tier 03. The line coming off pole 49-38-1 to Hopper 10 does not exist anymore. It used to be 22kV to hopper 10 but now that is a 33kV line.' };
    expect(model.evidence?.find(record => record.id === 'WN-CV006-FEED-AND-REMOVED-H10')).toMatchObject({ status: 'owner-confirmed', confirmation: decision });
    expect(model.reviews?.find(review => review.id === 'WN-CV006-FEED-AND-REMOVED-H10')).toMatchObject({ status: 'resolved', resolution: decision });
    expect(model.connections.find(connection => connection.id === 'whole:join:cv006')).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-CV006-FEED-AND-REMOVED-H10']) });
    const removed = ['cv006:abs-branch-pole201', 'cv006:pole201-pole286', 'cv006:pole286-to-287', 'cv006:pole286-fused-branch', 'cv006:fused-abs286-hopper10', 'cv006:22kv-comparison-port'];
    expect(model.connections.some(connection => removed.includes(connection.id))).toBe(false);
    for (const view of model.presentation!.views) {
      expect(view.boundaries?.some(boundary => removed.includes(boundary.connectionId)) ?? false).toBe(false);
      expect(Object.keys(view.layout.bends ?? {}).some(id => removed.includes(id))).toBe(false);
    }
    expect(model.presentation!.views.find(view => view.id === 'cv006/former-hopper10-22')?.label).toContain('Former 22 kV');
    expect(model.presentation!.views.find(view => view.id === 'cv006/overhead')?.assetIds).not.toContain('cv006:pole:201');
    expect(model.assets.find(asset => asset.id === 'cv006:pole:201')?.label).toContain('Former 22 kV');
    expect(model.assets.find(asset => asset.id === 'rm420:comparison:cv00622')?.label).toContain('Former 22 kV');
    expect(model.boundaries?.find(boundary => boundary.id === 'rm420:cv00622:coverage')).toMatchObject({ sourceCoverage: 'complete', earthCoverage: 'unconfirmed' });
    const fixture = fictionalWhole(); fixture.version = 'fictional-current-cv006-1';
    fixture.sources = [{ id: 'fictional-cv006-source', label: 'Invented SW411 Bus A test source', assetId: 'sw411:bus-a', terminal: 'sw411:bus-a:bar', knowledge: 'supported', evidenceIds: ['fictional-whole-contract'] }];
    fixture.starting.sources = { 'fictional-cv006-source': true };
    for (const id of ['sw411:tier-03:cb', 'cv006:abs:49-1', 'cv006:recloser:49-39a', 'cv006:abs:49-40', 'cv006:fused-abs:57', 'cv006:abs:49-38-1', 'cv006:fused-abs:286', 'rm420:sw01']) fixture.starting.devices[id] = 'closed';
    fixture.starting.devices['rm406:sw01'] = 'service'; fixture.starting.devices['rm410:sw01'] = 'service';
    const session = new SimulationSession(fixture); const result = session.snapshot();
    expect(result.connectivity['rm406:bus'].sourceIds).toEqual(['fictional-cv006-source']);
    expect(result.connectivity['rm410:bus'].sourceIds).toEqual(['fictional-cv006-source']);
    expect(result.connectivity['rm420:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['cv006:pole:201'].sourceIds).toEqual([]);
    expect(session.trace('rm410:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ connectionIds: expect.arrayContaining(['whole:join:cv006', 'rm410:incoming-pole49-40']) })] });
  });

  it('records the confirmed station incomer assignments and no external supply at spare IN01/IN02 without inferring switch positions', () => {
    const session = new SimulationSession(wholeNetworkModel); const result = session.snapshot(); const model = result.model;
    const decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'TF11->IN03, TF12-> IN04. IN01 and IN02 are spares and not in use, they are currently not supplied from anywhere' };
    expect(model.evidence?.find(record => record.id === 'WN-SW411-INCOMING-ASSIGNMENT')).toMatchObject({ status: 'owner-confirmed', confirmation: decision });
    expect(model.reviews?.find(review => review.id === 'WN-SW411-INCOMING-ASSIGNMENT')).toMatchObject({ status: 'resolved', resolution: decision });
    for (const [id, from, to] of [['tf11-in03', 'station:sb01:f4:interface:port', 'sw411:in-03:interface:port'], ['tf12-in04', 'station:sb02:f1:interface:port', 'sw411:in-04:interface:port']]) {
      expect(model.connections.find(connection => connection.id === `whole:join:${id}`)).toMatchObject({ from, to, knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-SW411-INCOMING-ASSIGNMENT']) });
      expect(model.reviews?.find(review => review.id === `WN-JOIN-${id}`)?.status).toBe('resolved');
    }
    for (const [id, bus] of [['in-01', 'sw411:bus-a'], ['in-02', 'sw411:bus-b']]) {
      expect(model.boundaries?.find(boundary => boundary.id === `sw411:${id}:coverage`)).toMatchObject({ sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-SW411-INCOMING-ASSIGNMENT']) });
      expect(model.assets.find(asset => asset.id === `sw411:${id}:interface`)?.label).toContain('Spare · no incoming external supply');
      expect(result.connectivity[bus].sourceBoundaryIds).not.toContain(`sw411:${id}:coverage`);
      expect(result.devices[`sw411:${id}:cb`]).toBeNull(); expect(result.devices[`sw411:${id}:es`]).toBeNull();
    }
    expect(Object.values(result.sources).every(state => state === null)).toBe(true);
    expect(Object.values(result.switching).every(control => control.reviewStatus === 'unresolved')).toBe(true);
    expect(model.reviews?.find(review => review.id === 'station:R001')?.status).toBe('open');
    const reopened = new SimulationSession(wholeNetworkModel); const saved = session.saveScenario();
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(reopened.saveScenario()).toEqual(saved);
  });

  it('applies the owner-directed tier16 model tags while retaining drawing aliases and the unresolved cable scope', () => {
    const session = new SimulationSession(wholeNetworkModel); const before = session.saveScenario(); const model = before.model;
    const decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'Good pickup, the Tier 16 should be CB RM721 FD01 and ES RM721 FD 01' };
    expect(model.evidence?.find(record => record.id === 'WN-SW411-TIER16-TAGS')).toMatchObject({ status: 'owner-confirmed', confirmation: decision });
    expect(model.reviews?.find(review => review.id === 'WN-SW411-TIER16-TAGS')).toMatchObject({ status: 'resolved', resolution: decision });
    expect(model.assets.find(asset => asset.id === 'sw411:tier-16:cb')).toMatchObject({ label: 'CB RM721 FD01', aliases: expect.arrayContaining(['CB SW454 FD 01']), evidenceIds: expect.arrayContaining(['WN-SW411-TIER16-TAGS']) });
    expect(model.assets.find(asset => asset.id === 'sw411:tier-16:es')).toMatchObject({ label: 'ES RM721 FD 01', aliases: expect.arrayContaining(['ES SW454 FD 01']) });
    expect(before.devices['sw411:tier-16:cb']).toBeNull(); expect(before.devices['sw411:tier-16:es']).toBeNull();
    expect(session.changeDevice('sw411:tier-16:cb', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.saveScenario()).toEqual(before);
    expect(model.reviews?.find(review => review.id === 'R002')?.status).toBe('open');
    expect(model.connections.find(connection => connection.id === 'whole:join:rm721')?.knowledge).toBe('provisional');
  });
});
