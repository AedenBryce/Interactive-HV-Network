import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import { withOwnerScopeConnections } from '../models/site/owner-scope-connections';
import { withOwnerFollowups } from '../models/site/owner-followups';

const input = () => withOwnerScopeConnections(withStationBatteryLimits(wholeNetworkModel, 'followup-input'), 'followup-base');

describe('subsequent scoped owner confirmations', () => {
  it('excludes RM718 only while explicitly retaining water and the earlier immutable scope decisions', () => {
    const base = input(); const before = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerFollowups(base, 'followup-scope')).snapshot();
    expect(base).toEqual(before);
    expect(snapshot.model.assets.some(asset => /^mine:(rm718|sw718)/.test(asset.id) || asset.id === 'mine:interface:rm718-pole')).toBe(false);
    for (const id of ['mine:sw441:bus', 'mine:tf441', 'mine:mc441:bus', 'mine:wt1:cb', 'mine:interface:water-opf1']) expect(snapshot.model.assets.some(asset => asset.id === id)).toBe(true);
    expect(snapshot.model.presentation!.views.some(view => view.id.includes('rm718'))).toBe(false);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'mine-camp/overview')?.label).toContain('Water');
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-RM718-WATER-SCOPE')).toMatchObject({ status: 'owner-confirmed', confirmation: { decision: 'RM718/TF718/SW718 excluded. SW441/TF441/MC441 should be included' } });
    expect(Object.values(snapshot.devices).every(value => value === null)).toBe(true);
    expect(Object.values(snapshot.switching).every(control => control.positions.every(position => !position.allowed))).toBe(true);
  }, 20_000);
  it('confirms RM721 to RM713 IN01 separately from the later former-route answer', () => {
    const { model } = new SimulationSession(withOwnerFollowups(input(), 'followup-rm713')).saveScenario();
    expect(model.connections.find(connection => connection.id === 'rm721:current-rm713-cable')).toMatchObject({ from: 'rm721:rm713:b', to: 'rm713:in01:a', knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-RM721-RM713-IN01']) });
    expect(model.evidence!.find(record => record.id === 'WN-RM721-RM713-IN01')).toMatchObject({ confirmation: { decision: 'RM721 does still feed RM713 and it is still connected at both ends. It connect at RM713 to SF RM713 IN01' } });
    expect(model.evidence!.find(record => record.id === 'WN-RM721-RM713-IN01')?.summary).toContain('does not establish the separate former RM712 IN01 cable status');
  });
  it('retains the coarse TF712 confirmation as evidence when a later answer supplies exact endpoints', () => {
    const base = input(); const session = new SimulationSession(withOwnerFollowups(base, 'followup-tf712')); const { model } = session.saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-TF712-LV-CONNECTED')).toMatchObject({ confirmation: { decision: 'TF712 LV cables are currently connected to SW712.' } });
    expect(model.assets.find(asset => asset.id === 'rm712:tf712:removed-lv-cable-end')?.label).toContain('Connected to CB SW712 IN');
    expect(model.evidence!.find(record => record.id === 'SV-TF712-REMOVED-CABLE')).toEqual(base.evidence!.find(record => record.id === 'SV-TF712-REMOVED-CABLE'));
    const historical = new SimulationSession(wholeNetworkModel);
    expect(historical.loadScenario(JSON.parse(JSON.stringify(session.saveScenario())))).toEqual({ ok: true });
    expect(historical.saveScenario().model).toEqual(model);
  });
  it('records MC431A as downstream LV outside scope without resolving other Crushing 1 questions', () => {
    const base = input(); const { model } = new SimulationSession(withOwnerFollowups(base, 'followup-mc431a')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-MC431A-SCOPE')).toMatchObject({ confirmation: { decision: 'MC431A is an LV switchboard that is fed from MC431. Not required for this tool.' } });
    expect(model.reviews!.find(review => review.id === 'C1-R01')).toMatchObject({ status: 'resolved' });
    expect(model.assets.some(asset => asset.id.toLowerCase().includes('mc431a'))).toBe(false);
    expect(model.reviews!.filter(review => review.id.startsWith('C1-') && review.id !== 'C1-R01')).toEqual(base.reviews!.filter(review => review.id.startsWith('C1-') && review.id !== 'C1-R01'));
  });
  it('detaches the former RM712 IN01 external cable without changing its switch state or earth mechanism', () => {
    const snapshot = new SimulationSession(withOwnerFollowups(input(), 'followup-unused-in01')).snapshot();
    expect(snapshot.model.connections.some(connection => connection.id === 'rm712:former-rm713-cable')).toBe(false);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-RM712-IN01-UNCONNECTED')).toMatchObject({ confirmation: { decision: 'nothing is connected.' } });
    expect(snapshot.model.boundaries).toContainEqual(expect.objectContaining({ id: 'owner:rm712:in01:no-external-cable', terminal: 'rm712:in01:a', sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed' }));
    expect(snapshot.devices['rm712:in01']).toBeNull();
    expect(snapshot.switching['rm712:in01'].positions.every(position => !position.allowed)).toBe(true);
    expect(snapshot.model.assets.find(asset => asset.id === 'rm712:in01')?.positions).toEqual(wholeNetworkModel.assets.find(asset => asset.id === 'rm712:in01')?.positions);
  }, 20_000);
  it('connects TF712 to the SW712 incoming cable side and excludes MCS/DG scope without bypassing the incomer', () => {
    const snapshot = new SimulationSession(withOwnerFollowups(input(), 'followup-tf712-entry')).snapshot();
    expect(snapshot.model.connections.find(connection => connection.id === 'owner:tf712-sw712-incoming')).toMatchObject({ from: 'rm712:tf712:removed-lv-cable-end:port', to: 'rm712:sw712:cb:a', knowledge: 'owner-confirmed' });
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-TF712-SW712-INCOMER')).toMatchObject({ confirmation: { decision: 'a the SW712 incomer. Ignore changeover switch for this' } });
    expect(snapshot.model.assets.some(asset => asset.id.startsWith('rm712:mcs') || /^rm712:dg[17]$/.test(asset.id))).toBe(false);
    expect(snapshot.model.sources).toHaveLength(3);
    expect(snapshot.model.connections.filter(connection => connection.to === 'rm712:sw712:bus:bar')).toEqual([wholeNetworkModel.connections.find(connection => connection.id === 'rm712:sw712:incomer-bar')]);
    expect(snapshot.devices['rm712:sw712:cb']).toBeNull();
    expect(snapshot.switching['rm712:sw712:cb'].positions.every(position => !position.allowed)).toBe(true);
    expect(snapshot.model.reviews!.find(review => review.id === 'SV-Q05')).toMatchObject({ status: 'open', question: expect.stringContaining('interlocks') });
  }, 20_000);
  it('uses the corrected TF12 OPF1-7 water spur and retains the superseded TF712 source answer as history', () => {
    const { model } = new SimulationSession(withOwnerFollowups(input(), 'followup-water')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-WATER-SPUR-SUPERSEDED')).toMatchObject({ confirmation: { decision: 'This is fed from a spur off TF712. It branches off that main line, goes through WT1-CB Recloser, then to the SW441 IN01 CB' } });
    expect(model.evidence!.find(record => record.id === 'WN-WATER-TF12-OPF1-7')).toMatchObject({ confirmation: { decision: 'aplogies, i made a mistake, it is fed from TF12, not TF712. It branches offat OPF1-7 Pole' } });
    expect(model.assets.find(asset => asset.id === 'owner:tf12:opf1-7')).toMatchObject({ kind: 'interface', terminals: ['owner:tf12:opf1-7:port'], positions: [], knowledge: 'owner-confirmed' });
    expect(model.connections.find(connection => connection.id === 'whole:join:tf12-in04')).toMatchObject({ from: 'station:sb02:f1:interface:port', to: 'owner:tf12:opf1-7:port' });
    expect(model.connections.find(connection => connection.id === 'owner:tf12:opf1-7-to-in04')).toMatchObject({ from: 'owner:tf12:opf1-7:port', to: 'sw411:in-04:interface:port', knowledge: 'owner-confirmed' });
    expect(model.connections.find(connection => connection.id === 'owner:tf12:opf1-7-water')).toMatchObject({ from: 'owner:tf12:opf1-7:port', to: 'mine:interface:water-opf1:port', knowledge: 'owner-confirmed' });
    expect(model.connections.find(connection => connection.id === 'mine:wt1:source')?.knowledge).toBe('owner-confirmed');
    expect(model.connections.find(connection => connection.id === 'mine:sw441:incoming:cable')?.knowledge).toBe('owner-confirmed');
    expect(model.connections.some(connection => [connection.from, connection.to].some(terminal => terminal.startsWith('rm712:')) && [connection.from, connection.to].some(terminal => terminal.startsWith('mine:')))).toBe(false);
    expect(model.presentation!.views.some(view => view.id === 'supplemental/water-tf12-source')).toBe(true);
  });
  it('records TF436 as an uninstalled spare downstream while retaining unconfirmed cubicle hardware and states', () => {
    const snapshot = new SimulationSession(withOwnerFollowups(input(), 'followup-tf436')).snapshot();
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-TF436-SPARE')).toMatchObject({ confirmation: { decision: 'TF436 is a spare cubicle. Nothing installed' } });
    expect(snapshot.model.connections.some(connection => connection.id === 'sw435:tf436:future-continuation')).toBe(false);
    expect(snapshot.model.reviews!.find(review => review.id === 'C2-R01')).toMatchObject({ status: 'resolved' });
    expect(snapshot.model.assets.find(asset => asset.id === 'sw435:interface:mc436')?.label).toContain('No installed downstream');
    for (const id of ['sw435:tf436:hv-cb', 'sw435:tf436:hv-es']) {
      expect(snapshot.devices[id]).toBeNull();
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
      expect(snapshot.model.assets.find(asset => asset.id === id)?.knowledge).toBe('provisional');
    }
  }, 20_000);
  it('confirms installed TF453/SW453 supply from SW435 without confirming winding behaviour or interlocks', () => {
    const base = input(); const snapshot = new SimulationSession(withOwnerFollowups(base, 'followup-sw453')).snapshot();
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-SW453-INSTALLED')).toMatchObject({ confirmation: { decision: 'Yes, installed and connected' }, summary: expect.stringContaining('SW435 tier8') });
    expect(snapshot.model.reviews!.find(review => review.id === 'C2-R02')).toMatchObject({ status: 'resolved' });
    expect(snapshot.model.connections.find(connection => connection.id === 'sw435:tf453:cable-TF453-P-01')).toMatchObject({ knowledge: 'owner-confirmed' });
    const transformer = snapshot.model.assets.find(asset => asset.id === 'sw435:tf453:transformer')!;
    expect(transformer.knowledge).toBe('provisional');
    expect(transformer.sourcePairs).toEqual(base.assets.find(asset => asset.id === transformer.id)!.sourcePairs);
    expect(transformer.earthPairs).toEqual([]);
    expect(snapshot.model.reviews!.find(review => review.id === 'C2-R09')?.status).toBe('open');
    expect(snapshot.devices['sw435:tf453:hv-cb']).toBeNull();
    expect(snapshot.switching['sw435:tf453:hv-cb'].positions.every(position => !position.allowed)).toBe(true);
  }, 20_000);
});
