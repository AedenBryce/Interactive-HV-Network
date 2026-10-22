import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { relationshipsFixture } from '../models/relationships-fixture';
import type { NetworkModel } from './model';

describe('explicit equipment relationships', () => {
  it('uses the declared winding transfer without joining the unrepresented third winding', () => {
    const session = new SimulationSession(relationshipsFixture);
    expect(session.snapshot().devices['cb-01']).toBe('service');
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(session.snapshot().connectivity['lv-bus-b'].sourceIds).toEqual([]);
    expect(session.changeDevice('cb-01', 'isolated')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual([]);
  });

  it('permits backfeed only through the explicitly bidirectional source relationship', () => {
    const session = new SimulationSession(relationshipsFixture);
    session.changeSource('source-a', false);
    session.changeSource('source-b', true);
    expect(session.snapshot().connectivity['tf-01'].terminalSources).toEqual({ 'tf-hv': ['source-b'], 'tf-lv-a': ['source-b'], 'tf-lv-b': [] });
    expect(session.snapshot().connectivity['supply-a'].sourceIds).toEqual(['source-b']);
    expect(session.snapshot().connectivity['lv-bus-b'].sourceIds).toEqual([]);
    session.changeDevice('cb-01', 'isolated');
    expect(session.snapshot().connectivity['supply-a'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-b']);
  });

  it('blocks the fictional earthing restriction and rejects unsupported positions without mutation', () => {
    const session = new SimulationSession(relationshipsFixture);
    const before = session.snapshot();
    expect(session.changeDevice('cb-01', 'earthed')).toMatchObject({ ok: false, error: expect.stringContaining('disable HV source A and LV source B') });
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice('cb-01', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unsupported position') });
    expect(session.snapshot()).toEqual(before);
  });

  it('does not propagate a winding earth through a source-transfer relationship', () => {
    const session = new SimulationSession(relationshipsFixture);
    session.changeSource('source-a', false);
    expect(session.changeDevice('cb-01', 'earthed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['tf-01'].terminalEarths).toEqual({ 'tf-hv': ['device-earth'], 'tf-lv-a': [], 'tf-lv-b': [] });
    expect(session.snapshot().connectivity['lv-bus-a'].earthIds).toEqual([]);
    expect(session.snapshot().connectivity['supply-a'].earthIds).toEqual([]);
    expect(session.snapshot().conflicts).toEqual([]);
  });

  it('can report source transfer to earth without joining the winding earth results', () => {
    const session = new SimulationSession(relationshipsFixture);
    session.changeSource('source-a', false);
    session.changeDevice('cb-01', 'earthed');
    session.changeSource('source-b', true);
    expect(session.snapshot().conflicts).toEqual([{
      sourceId: 'source-b', earthId: 'device-earth',
      terminalPath: ['source-b-out', 'lv-a', 'tf-lv-a', 'tf-hv', 'ds-out', 'ds-earth'],
      connectionIds: ['lv-backfeed', 'winding-a-bus', 'device-hv'],
    }]);
    expect(session.snapshot().connectivity['lv-bus-a'].earthIds).toEqual([]);
    expect(session.snapshot().connectivity['lv-bus-a'].conflictSourceIds).toEqual(['source-b']);
  });

  it('reports unresolved positions conservatively without creating cross-winding earth transfer', () => {
    const fixture = structuredClone(relationshipsFixture);
    const model = { ...fixture, starting: { ...fixture.starting, devices: { 'cb-01': null } } };
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus-a'].sourceStatus).toBe('unconfirmed');
    expect(session.snapshot().connectivity['lv-bus-a'].possibleSourceIds).toEqual(['source-a']);
    expect(session.snapshot().connectivity['lv-bus-a'].earthStatus).toBe('disconnected');
    expect(session.snapshot().connectivity['tf-01'].earthStatus).toBe('unconfirmed');
  });

  it('rejects relationships to terminals outside their equipment without replacing the session', () => {
    const session = new SimulationSession(relationshipsFixture);
    const before = session.snapshot();
    const invalid = structuredClone(relationshipsFixture);
    invalid.assets[2].sourcePairs = [['tf-hv', 'lv-a']];
    expect(session.loadModel(invalid)).toMatchObject({ ok: false, error: expect.stringContaining('external or missing terminal') });
    expect(session.snapshot()).toEqual(before);
  });

  it('requires separate source and earth relationships for a real transformer', () => {
    const session = new SimulationSession(relationshipsFixture);
    const before = session.snapshot();
    const invalid: NetworkModel = { ...structuredClone(relationshipsFixture), synthetic: false };
    invalid.assets[2].conductivePairs = [['tf-hv', 'tf-lv-a']];
    expect(session.loadModel(invalid)).toMatchObject({ ok: false, error: expect.stringContaining('cannot use shared conductive relationships') });
    expect(session.snapshot()).toEqual(before);
    const absent = structuredClone(invalid);
    delete absent.assets[2].earthPairs;
    expect(session.loadModel(absent)).toMatchObject({ ok: false, error: expect.stringContaining('requires explicit source and earth relationships') });
    expect(session.snapshot()).toEqual(before);
  });
});
