import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import { withOwnerScopeConnections } from '../models/site/owner-scope-connections';
import { withOwnerFollowups } from '../models/site/owner-followups';
import { withOwnerIdentityCorrections } from '../models/site/owner-identities';

const previous = () => withOwnerFollowups(withOwnerScopeConnections(withStationBatteryLimits(wholeNetworkModel, 'identity-base'), 'identity-base'), 'identity-base');

describe('later hardware and identity confirmations', () => {
  it('confirms spare CB/ES presence and no outgoing cable while preserving states, earths, topology and its input', () => {
    const base = previous(); const before = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerIdentityCorrections(base, 'identity-spare')).snapshot();
    expect(base).toEqual(before);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-TF436-SPARE-HARDWARE')).toMatchObject({ confirmation: { decision: 'There is a breaker and earth switcb but it is a spare and does not feed anything, no outgoing cables.' } });
    for (const id of ['sw435:tf436:hv-cb', 'sw435:tf436:hv-es']) {
      expect(snapshot.model.assets.find(asset => asset.id === id)).toMatchObject({ knowledge: 'owner-confirmed' });
      expect(snapshot.model.assets.find(asset => asset.id === id)?.positions).toEqual(base.assets.find(asset => asset.id === id)?.positions);
      expect(snapshot.devices[id]).toBeNull();
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
    }
    expect(snapshot.model.connections).toEqual(base.connections);
    expect(snapshot.model.earths).toEqual(base.earths);
    expect(snapshot.model.boundaries).toContainEqual(expect.objectContaining({ id: 'owner:tf436:no-outgoing-cable', terminal: 'sw435:tf436:hv-cb:b', knowledge: 'owner-confirmed', sourceCoverage: 'complete', earthCoverage: 'unconfirmed' }));
  }, 20_000);
  it('uses tier5 for TF432 while retaining tier3 source provenance and unchanged relationships', () => {
    const base = previous(); const { model } = new SimulationSession(withOwnerIdentityCorrections(base, 'identity-tier')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-TF432-TIER5')).toMatchObject({ confirmation: { decision: 'Tier 5' } });
    expect(model.assets.find(asset => asset.id === 'sw431:tf432:hv-cb')?.label).toContain('Tier 5');
    expect(model.assets.find(asset => asset.id === 'sw431:tf432:hv-cb')?.aliases).toContain('Tier 3 in detailed HV sheet');
    expect(model.reviews!.find(review => review.id === 'C1-R02')).toMatchObject({ status: 'resolved' });
    expect(model.connections).toEqual(base.connections);
    expect(model.evidence!.find(record => record.id === 'C1-DISCREPANCY-SOURCES')).toEqual(base.evidence!.find(record => record.id === 'C1-DISCREPANCY-SOURCES'));
  });
  it('keeps MC001 and MC438 on one existing endpoint while retaining broader HPGR questions', () => {
    const base = previous(); const session = new SimulationSession(withOwnerIdentityCorrections(base, 'identity-mcc')); const { model } = session.saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-HPGR-MC001-MC438')).toMatchObject({ confirmation: { decision: 'Both names used for same board' } });
    expect(model.assets.find(asset => asset.id === 'hpgr:mc001:bus')).toMatchObject({ aliases: expect.arrayContaining(['MC001', 'MC438']), label: expect.stringContaining('same board') });
    expect(model.assets.filter(asset => asset.kind === 'bus' && asset.aliases?.includes('MC438'))).toHaveLength(1);
    expect(model.assets.map(asset => asset.id)).toEqual(base.assets.map(asset => asset.id));
    expect(model.connections).toEqual(base.connections);
    expect(model.reviews!.find(review => review.id === 'C2-R06')).toMatchObject({ status: 'open', question: expect.stringContaining('440/415') });
    for (const id of ['C2-R05', 'C2-R09', 'C2-R11']) expect(model.reviews!.find(review => review.id === id)?.status).toBe('open');
    const historical = new SimulationSession(wholeNetworkModel);
    expect(historical.loadScenario(JSON.parse(JSON.stringify(session.saveScenario())))).toEqual({ ok: true });
    expect(historical.saveScenario().model).toEqual(model);
  });
  it('retains reviewed 0008 control-sheet provenance without adding phase paths or switching permissions', () => {
    const base = previous(); const { model } = new SimulationSession(withOwnerIdentityCorrections(base, 'identity-source')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'C2-CONTROL0008-SUPPLEMENT')).toMatchObject({ status: 'supported', references: [expect.objectContaining({ document: 'CB112-02006-DR-EL-0008', revision: '4 (11.12.13; AS BUILT)', page: 1 })] });
    expect(model.evidence!.find(record => record.id === 'C2-DISCREPANCIES')?.summary).toContain('0008 has now been visually reviewed');
    expect(model.connections).toEqual(base.connections);
    expect(model.interlocks).toEqual(base.interlocks);
    expect(model.starting).toEqual(base.starting);
    for (const id of ['C2-R09', 'C2-R11']) expect(model.reviews!.find(review => review.id === id)?.status).toBe('open');
  });
});
