import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { singleSupply } from '../models/synthetic';
import { interlockFixture } from '../models/interlock-fixture';

describe('accepted session history and restoration', () => {
  it('records device/source changes and undoes them in reverse order with recomputed connectivity', () => {
    const session = new SimulationSession(singleSupply);
    expect(session.snapshot().history).toEqual([]);
    expect(session.snapshot().canUndo).toBe(false);
    session.changeDevice('cb-01', 'open');
    session.changeSource('source-a', false);
    expect(session.snapshot().history).toEqual([
      { id: 1, kind: 'device', assetId: 'cb-01', from: 'closed', to: 'open' },
      { id: 2, kind: 'source', sourceId: 'source-a', from: true, to: false },
    ]);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().sources).toEqual({ 'source-a': true });
    expect(session.snapshot().devices).toEqual({ 'cb-01': 'open' });
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(session.undo()).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.devices).toEqual({ 'cb-01': 'closed' });
    expect(result.connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(result.impact.find(item => item.assetId === 'lv-bus')?.connectivityChanged).toBe(true);
    expect(result.history).toEqual([]);
    expect(result.canUndo).toBe(false);
    expect(session.undo()).toMatchObject({ ok: false, error: expect.stringContaining('No accepted action') });
    expect(session.snapshot()).toEqual(result);
  });

  it('resets both device positions and source availability, preserving unknown baseline values', () => {
    const session = new SimulationSession({ ...singleSupply, starting: { devices: { 'cb-01': null }, sources: { 'source-a': null } } });
    session.changeDevice('cb-01', 'closed');
    session.changeSource('source-a', true);
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('connected');
    expect(session.reset()).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.devices).toEqual({ 'cb-01': null });
    expect(result.sources).toEqual({ 'source-a': null });
    expect(result.connectivity['lv-bus'].sourceStatus).toBe('unconfirmed');
    expect(result.impact.find(item => item.assetId === 'lv-bus')?.connectivityChanged).toBe(true);
    expect(result.history).toEqual([]);
    expect(result.canUndo).toBe(false);
    expect(session.undo().ok).toBe(false);
    expect(session.snapshot()).toEqual(result);
  });

  it('keeps history on rejected model loads and clears it only after a valid replacement', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    expect(session.loadModel({ id: 'invalid' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    expect(session.loadModel(singleSupply)).toEqual({ ok: true });
    expect(session.snapshot().history).toEqual([]);
    expect(session.snapshot().canUndo).toBe(false);
    expect(session.snapshot().impact).toEqual([]);
    expect(session.snapshot().devices).toEqual({ 'cb-01': 'closed' });
    session.changeSource('source-a', false);
    expect(session.snapshot().history).toEqual([{ id: 1, kind: 'source', sourceId: 'source-a', from: true, to: false }]);
  });

  it('does not accept blocked or unsupported actions into history and restores preceding full states', () => {
    const session = new SimulationSession(interlockFixture);
    session.changeDevice('cb-01', 'open');
    session.changeDevice('es-01', 'closed');
    session.changeSource('source-a', false);
    const before = session.snapshot();
    expect(before.history).toHaveLength(3);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(false);
    expect(session.changeDevice('es-02', 'open').ok).toBe(false);
    expect(session.changeDevice('missing', 'open').ok).toBe(false);
    expect(session.changeSource('missing', true).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    session.undo();
    expect(session.snapshot().sources['source-a']).toBe(true);
    expect(session.snapshot().devices).toEqual({ 'cb-01': 'open', 'es-01': 'closed', 'es-02': 'open' });
    expect(session.snapshot().connectivity['lv-bus'].earthIds).toEqual(['earth-a']);
    session.undo();
    expect(session.snapshot().devices['es-01']).toBe('open');
    expect(session.snapshot().connectivity['lv-bus'].earthIds).toEqual([]);
    session.undo();
    expect(session.snapshot().devices['cb-01']).toBe('closed');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
  });

  it('keeps permitted no-op requests out of history and leaves the last impact intact', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    expect(session.changeDevice('cb-01', 'open')).toEqual({ ok: true });
    expect(session.changeSource('source-a', true)).toEqual({ ok: true });
    expect(session.snapshot()).toEqual(before);
  });

  it('returns detached history data and restores unknown historical values after new exploration', () => {
    const session = new SimulationSession({ ...singleSupply, starting: { devices: { 'cb-01': null }, sources: { 'source-a': null } } });
    session.changeDevice('cb-01', 'closed');
    session.changeSource('source-a', true);
    const exposed = session.snapshot();
    exposed.history[0].from = 'open';
    exposed.history.length = 0;
    expect(session.snapshot().history).toHaveLength(2);
    session.undo();
    expect(session.snapshot().sources['source-a']).toBeNull();
    expect(session.snapshot().devices['cb-01']).toBe('closed');
    session.undo();
    expect(session.snapshot().devices['cb-01']).toBeNull();
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('unconfirmed');
    session.changeDevice('cb-01', 'open');
    expect(session.snapshot().history).toEqual([{ id: 3, kind: 'device', assetId: 'cb-01', from: null, to: 'open' }]);
  });

  it('reset clears a round-trip history even when the device has returned to its baseline', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    session.changeDevice('cb-01', 'closed');
    expect(session.snapshot().history).toHaveLength(2);
    expect(session.reset()).toEqual({ ok: true });
    expect(session.snapshot().history).toEqual([]);
    expect(session.snapshot().devices).toEqual({ 'cb-01': 'closed' });
    expect(session.snapshot().sources).toEqual({ 'source-a': true });
    expect(session.snapshot().impact).toEqual([]);
  });
});
