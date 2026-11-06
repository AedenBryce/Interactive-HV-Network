import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { westernHoppersModel } from '../models/site/western-hoppers';
import type { NetworkModel } from './model';

// Defines software-only operation on copied geometry. These permissions, fuse
// continuity and transformer transfers do not confirm any actual site facts.
function fictionalContract(area: 'h1' | 'h8' | 'h9' = 'h1'): NetworkModel {
  const fixture = structuredClone(westernHoppersModel);
  fixture.id = `fictional-western-hoppers-${area}`; fixture.version = 'fictional-connectivity-check-1'; fixture.synthetic = true;
  fixture.name = 'Fictional western-hopper software connectivity contract';
  fixture.evidence!.push({ id: 'fictional-western-contract', status: 'supported', summary: 'Explicit fictional contract: candidate source pairs and fuse continuity are defined, cross-winding earth is absent, no physical restrictions, phase contacts service/closed except reverse motor contactors, earth contacts open, one external source enabled. Establishes no installed permission or state.', references: [{ document: 'Fictional Western Hopper software contract', revision: '1', page: 1, clause: 'Defined software example only' }] });
  for (const claim of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-western-contract']; }
  fixture.boundaries = [];
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length).map(asset => [asset.id, asset.positions.some(position => position.id === 'service') ? 'service' : asset.kind === 'earth-switch' || asset.id.endsWith(':rc') ? 'open' : 'closed']));
  const assetId = area === 'h1' ? 'wh:h1:interface:rm413' : area === 'h8' ? 'wh:h8:interface:rm406' : 'wh:h9:interface:rm410';
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional test supply', assetId, terminal: `${assetId}:port`, knowledge: 'supported', evidenceIds: ['fictional-western-contract'] }]; fixture.starting.sources = { 'fictional-source': true };
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional contract only; no site permission established.', evidence: [] })), rules: [] };
  return fixture;
}

describe('western hopper drawing construction through the session', () => {
  it('opens Hopper1 and its separate Hopper3 continuation with unknown actual states and no invented source', () => {
    const result = new SimulationSession(westernHoppersModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(result.sources).toEqual({});
    expect(result.model.assets.find(asset => asset.id === 'wh:h1:rm417:bus')?.kind).toBe('bus');
    expect(result.model.assets.find(asset => asset.id === 'wh:h1:mc417a:bus')?.kind).toBe('bus');
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416a:interface')).toMatchObject({ kind: 'interface', positions: [] });
    expect(Object.values(result.devices).every(state => state === null)).toBe(true);
    expect(result.connectivity['wh:h1:rm417:bus'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['wh:h3:mc416a:interface'].sourceStatus).toBe('unconfirmed');
  });

  it('retains Hopper1 HV bus and paired sizer contact paths with separate maintenance earths', () => {
    const result = new SimulationSession(westernHoppersModel).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'wh:h1:mc417:bus')).toMatchObject({ kind: 'bus', aliases: expect.arrayContaining(['6.6kV bar; transformer labelled6.9kV']) });
    for (const motor of ['1', '2']) {
      expect(result.model.assets.find(asset => asset.id === `wh:h1:mc417:m${motor}:fc`)?.kind).toBe('disconnector');
      expect(result.model.assets.find(asset => asset.id === `wh:h1:mc417:m${motor}:rc`)?.kind).toBe('disconnector');
      expect(result.model.assets.find(asset => asset.id === `wh:h1:mc417:m${motor}:earth`)?.kind).toBe('earth-switch');
    }
    expect(result.model.evidence?.find(record => record.id === 'WH-h1-KEY-NOTES')?.summary).toContain('KEY CAPTIVE WHEN EARTH SWITCH “ON”');
  });

  it('retains Hopper7/9 supplies, distinct Hopper8 identities and conflicting source aliases', () => {
    const result = new SimulationSession(westernHoppersModel).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'wh:h7:rm418:bus')?.kind).toBe('bus');
    expect(result.model.assets.find(asset => asset.id === 'wh:h9:rm419:bus')?.kind).toBe('bus');
    expect(result.model.connections.find(connection => connection.id === 'wh:h9-to-h7:cable')).toMatchObject({ from: 'wh:h9:rm419:sw02:line', to: 'wh:h7:rm418:sw01:a' });
    expect(result.model.assets.find(asset => asset.id === 'wh:h8:tf416a')?.aliases).toContain('HOPPER8');
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:tf416a')?.id).not.toBe('wh:h8:tf416a');
    expect(result.model.assets.find(asset => asset.id === 'wh:h7:rm418:cb03')?.aliases).toEqual(expect.arrayContaining(['RM418-CB03 (0001 rev6)', 'RM418-CB01-A03 (CV006)']));
    expect(result.model.assets.find(asset => asset.id === 'wh:h7:tf418')?.aliases).toContain('SS418-TF418A (CV006 6.9kV label)');
    expect(result.model.assets.find(asset => asset.id === 'wh:h7:tf418a')?.aliases).toContain('SS418-TF418B (CV006 415V label)');
    expect(result.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(10);
  });

  it('blocks all real controls atomically and distinguishes the administrative note from physical rules', () => {
    const session = new SimulationSession(westernHoppersModel); const before = session.snapshot();
    expect(Object.keys(before.devices)).toHaveLength(49);
    expect(Object.values(before.switching).every(control => control.reviewStatus === 'unresolved' && control.positions.every(position => !position.allowed))).toBe(true);
    for (const [assetId, control] of Object.entries(before.switching)) expect(session.changeDevice(assetId, control.positions[0].id)).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(before); expect(before.history).toEqual([]);
    expect(before.model.interlocks?.rules).toEqual([]);
    expect(before.model.evidence?.find(record => record.id === 'WH-H9-ADMINISTRATIVE-NOTE')?.summary).toContain('ADMINISTRATIVE CONTROLS IN PLACE');
    expect(before.model.evidence?.find(record => record.id === 'WH-h9-KEY-NOTES')?.summary).toContain('omits the captive-when-ON sentence');
  });

  it('keeps administrative and legacy-control evidence attached to the affected inspectable assets', () => {
    const result = new SimulationSession(westernHoppersModel).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'wh:h9:rm419:sw04')?.evidenceIds).toContain('WH-H9-ADMINISTRATIVE-NOTE');
    expect(result.model.assets.find(asset => asset.id === 'wh:h7:rm418:cb03')?.evidenceIds).toContain('WH-H7-CONTROL-ALIASES');
    for (const id of ['wh:h3:tf416', 'wh:h3:tf416a', 'wh:h8:tf416', 'wh:h8:tf416a']) expect(result.model.assets.find(asset => asset.id === id)?.reviewIds).toEqual(expect.arrayContaining(['WH-Q01', 'WH-Q07']));
  });

  it('demonstrates the two-ended Hopper9-to-Hopper7 route, impact and undo only in the fictional package', () => {
    const session = new SimulationSession(fictionalContract('h9'));
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().connectivity['wh:h9:mc419a:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().connectivity['wh:h1:mc417a:bus'].sourceIds).toEqual([]);
    expect(session.trace('wh:h7:mc418a:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ assetIds: expect.arrayContaining(['wh:h9:rm419:sw02', 'wh:h7:rm418:sw01', 'wh:h7:rm418:cb03', 'wh:h7:tf418a']) })] });
    expect(session.changeDevice('wh:h9:rm419:sw02', 'isolated')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['wh:h9:mc419a:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().impact.find(item => item.assetId === 'wh:h7:mc418a:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.changeDevice('wh:h7:rm418:sw01', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual([]);
    expect(session.reset()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h7:mc418a:bus'].sourceIds).toEqual(['fictional-source']);
  });

  it.each([['h1', 'wh:h3:mc416a:interface', 'wh:h8:mc416a:interface'], ['h8', 'wh:h8:mc416a:interface', 'wh:h3:mc416a:interface']] as const)('keeps %s supply on its own source-scoped SS416 construction', (source, own, other) => {
    const session = new SimulationSession(fictionalContract(source));
    expect(session.snapshot().connectivity[own].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().connectivity[other].sourceIds).toEqual([]);
  });

  it('retains bar-side ring earth and transformer-side feeder earth commons in the fictional contact contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.changeDevice('wh:h1:rm417:sw01', 'earthed')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity['wh:h1:rm417:bus'].earthIds).toEqual(['wh:h1:rm417:sw01:earth-termination']);
    expect(result.connectivity['wh:h1:interface:rm413'].earthIds).toEqual([]);
    expect(session.changeDevice('wh:h1:rm417:sw01', 'service')).toEqual({ ok: true });
    expect(session.changeDevice('wh:h1:rm417:sw03', 'earthed')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['wh:h1:tf417'].terminalEarths['wh:h1:tf417:hv']).toEqual(['wh:h1:rm417:sw03:earth-termination']);
    expect(result.connectivity['wh:h1:tf417a'].terminalEarths['wh:h1:tf417a:hv']).toEqual(['wh:h1:rm417:sw03:earth-termination']);
    expect(result.connectivity['wh:h1:rm417:bus'].earthIds).toEqual([]);
    expect(result.connectivity['wh:h1:mc417a:bus'].earthIds).toEqual([]);
    expect(result.connectivity['wh:h1:mc417:bus'].earthIds).toEqual([]);
  });

  it('exposes the complete three-terminal position contract without an invariant source or earth shortcut', () => {
    const result = new SimulationSession(westernHoppersModel).snapshot();
    const contact = result.model.assets.find(asset => asset.id === 'wh:h1:rm417:sw01');
    expect(contact).toMatchObject({ knowledge: 'provisional', conductivePairs: [], sourcePairs: [], earthPairs: [], terminals: ['wh:h1:rm417:sw01:line', 'wh:h1:rm417:sw01:common', 'wh:h1:rm417:sw01:earth'] });
    expect(contact?.positions).toEqual([
      { id: 'service', label: 'Service (candidate)', pairs: [['wh:h1:rm417:sw01:line', 'wh:h1:rm417:sw01:common']] },
      { id: 'isolated', label: 'Isolated (candidate)', pairs: [] },
      { id: 'earthed', label: 'Earthed (candidate)', pairs: [['wh:h1:rm417:sw01:common', 'wh:h1:rm417:sw01:earth']] },
    ]);
  });

  it('demonstrates separate forward/reverse reachability and motor-side maintenance earth only in the fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.changeDevice('wh:h1:mc417:m1:fc', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h1:mc417:m1:motor'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['wh:h1:mc417:m2:motor'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('wh:h1:mc417:m1:earth', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h1:mc417:m1:motor'].earthIds).toEqual(['wh:h1:mc417:m1:earth:earth']);
    expect(session.snapshot().connectivity['wh:h1:mc417:bus'].earthIds).toEqual([]);
    expect(session.changeDevice('wh:h1:mc417:m1:rc', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h1:mc417:m1:motor'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'fictional-source', earthId: 'wh:h1:mc417:m1:earth:earth' })]));
  });

  it('round-trips exact evidence, missing endpoints and readable detail navigation without PDFs', () => {
    const session = new SimulationSession(westernHoppersModel); const before = session.snapshot();
    expect(before.model.presentation?.views).toHaveLength(12);
    expect(before.model.presentation?.views.find(view => view.id === 'h1-lv')?.label).toBe('Hopper1 · MC417A final LV');
    expect(before.model.presentation?.views.find(view => view.id === 'h1-lv')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'wh:h1:mc417a:supply', remoteAssetId: 'wh:h1:tf417a', targetViewId: 'h1-rmu', position: [3550, 170] }));
    expect(before.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(9);
    expect(before.model.assets.filter(asset => /mc41[789]a:bus$/.test(asset.id)).map(asset => asset.id)).toEqual(['wh:h1:mc417a:bus', 'wh:h7:mc418a:bus', 'wh:h9:mc419a:bus']);
    for (const id of ['wh:h3:mc416:interface', 'wh:h3:mc416a:interface', 'wh:h8:mc416:interface', 'wh:h8:mc416a:interface']) expect(before.model.boundaries?.find(boundary => boundary.terminal === `${id}:port`)).toMatchObject({ sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' });
    expect(new Set(before.model.evidence?.flatMap(record => record.references.map(reference => reference.document))).size).toBe(20);
    expect(before.model.assets.every(asset => asset.evidenceIds?.length)).toBe(true);
    expect(before.model.connections.every(connection => connection.evidenceIds?.length)).toBe(true);
    expect(before.model.evidence?.every(record => record.references.every(reference => reference.revision && reference.page === 1 && reference.clause))).toBe(true);
    expect(before.model.reviews).toHaveLength(14); expect(before.model.reviews?.every(review => review.status === 'open')).toBe(true);
    expect(before.model.reviews?.every(review => review.evidenceIds.length > 0)).toBe(true);
    const file = JSON.parse(JSON.stringify(session.saveScenario())); const reopened = new SimulationSession(westernHoppersModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true }); expect(reopened.snapshot()).toEqual(before);
    file.model.presentation.views[1].boundaries[0].targetViewId = 'unrepresented-view';
    expect(reopened.loadScenario(file).ok).toBe(false); expect(reopened.snapshot()).toEqual(before);
  });
});
