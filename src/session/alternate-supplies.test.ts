import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { alternateSupplies } from '../models/synthetic';

describe('exploring alternate supplies and loops', () => {
  it('retains the second supply after opening one route and recomputes source loss without changing devices', () => {
    const session = new SimulationSession(alternateSupplies);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a', 'source-b']);
    session.changeDevice('cb-01', 'open');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-b']);
    const devices = session.snapshot().devices;
    expect(session.changeSource('source-b', false).ok).toBe(true);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(session.snapshot().devices).toEqual(devices);
    expect(session.changeSource('missing', true).ok).toBe(false);
  });

  it('explains the remaining source path through the bus tie and handles the closed loop', () => {
    const session = new SimulationSession(alternateSupplies);
    session.changeDevice('cb-01', 'open');
    const trace = session.trace('lv-bus');
    expect(trace.ok).toBe(true);
    if (!trace.ok) throw new Error(trace.error);
    expect(trace.paths).toContainEqual(expect.objectContaining({ sourceId: 'source-b', assetIds: ['supply-b', 'cb-02', 'bus-b', 'tie-01', 'bus-a', 'tf-01', 'lv-bus'] }));
    session.changeDevice('tie-01', 'open');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-b']);
    session.changeDevice('loop-01', 'open');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    session.changeDevice('tie-01', 'closed');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-b']);
    expect(session.trace('missing').ok).toBe(false);
  });

  it('distinguishes loss of an alternate route from loss of source connectivity', () => {
    const session = new SimulationSession(alternateSupplies);
    session.changeDevice('loop-01', 'open');
    const snapshot = session.snapshot();
    expect(snapshot.connectivity['lv-bus'].sourceIds).toEqual(['source-a', 'source-b']);
    expect(snapshot.impact.find(item => item.assetId === 'lv-bus')).toMatchObject({ connectivityChanged: false, routesChanged: true });
    expect(snapshot.connectivity['lv-bus'].routeEdgeIds).not.toContain('connection:loop-bus-a');
    expect(snapshot.connectivity['lv-bus'].routeEdgeIds).toContain('connection:bus-a-tie');
    session.changeSource('source-b', false);
    expect(session.snapshot().impact.find(item => item.assetId === 'lv-bus')).toMatchObject({ connectivityChanged: true });
  });

  it('does not report a supply-route change for an unrelated branch', () => {
    const model = structuredClone(alternateSupplies);
    model.assets.push({ id: 'spare-switch', label: 'Spare switch', kind: 'breaker', terminals: ['spare-in', 'spare-out'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['spare-in', 'spare-out']] },
    ] });
    model.connections.push({ id: 'spare-branch', from: 'hv-a', to: 'spare-in' });
    model.starting.devices['spare-switch'] = 'closed';
    const session = new SimulationSession(model);
    const before = session.trace('lv-bus');
    session.changeDevice('spare-switch', 'open');
    expect(session.trace('lv-bus')).toEqual(before);
    expect(session.snapshot().impact.some(item => item.assetId === 'lv-bus')).toBe(false);
    expect(session.snapshot().impact.some(item => item.assetId === 'spare-switch')).toBe(true);
  });
});
