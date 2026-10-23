import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { electricalPolicyNetworkModel as policyNetworkModel } from '../models/site/current-network';
import { withOwnerNetworkContinuations } from '../models/site/owner-network-continuations';

describe('owner83–85 network continuation decisions through SimulationSession', () => {
  it('disconnects only the three absent external cables while retaining installed controls, baseline and earth arrangements', () => {
    const original = new SimulationSession(policyNetworkModel).saveScenario();
    const session = new SimulationSession(withOwnerNetworkContinuations(policyNetworkModel, 'test-continuations8'));
    const saved = session.saveScenario(); const model = saved.model;
    for (const [device, terminal, stub, marker] of [
      ['rm713:in02', 'rm713:in02:a', 'rm713:in02-undestinated', 'rm713:interface:in02'],
      ['rm714:in02', 'rm714:in02:a', 'rm714:in02:external-stub', 'rm714:interface:ring-in02'],
      ['wh:h1:rm417:sw02', 'wh:h1:rm417:sw02:line', 'wh:h1:rm417:sw02-stub', 'wh:h1:rm417:sw02:interface'],
    ]) {
      expect(model.connections.some(link => link.id === stub)).toBe(false);
      expect(model.assets.find(asset => asset.id === device)).toEqual(original.model.assets.find(asset => asset.id === device));
      const reference = model.assets.find(asset => asset.id === marker)!;
      expect(reference.label).toContain('No external cable');
      expect(model.connections.some(link => reference.terminals.includes(link.from) || reference.terminals.includes(link.to))).toBe(false);
      expect(model.boundaries).toContainEqual(expect.objectContaining({ terminal, sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed' }));
      expect(session.snapshot().connectivity[device].sourceBoundaryIds).not.toContain(`${marker}:coverage`);
    }
    expect(model.connections).toHaveLength(673);
    expect(saved.devices).toEqual(original.devices); expect(saved.sources).toEqual(original.sources);
    expect(model.earths).toEqual(original.model.earths); expect(model.interlocks).toEqual(original.model.interlocks);
    expect(new SimulationSession(policyNetworkModel).saveScenario()).toEqual(original);
    expect(session.changeDevice('rm713:in02', 'open').ok).toBe(true);
    expect(session.changeDevice('rm713:in02', 'closed').ok).toBe(true);
    expect(session.changeDevice('wh:h1:rm417:sw02', 'isolated').ok).toBe(true);
    expect(session.changeDevice('wh:h1:rm417:sw02', 'earthed').ok).toBe(true);
    expect(session.reset().ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
  }, 30_000);

  it('rejects stale or additional external attachments rather than interpreting a changed topology', () => {
    for (const mutate of [
      (model: typeof policyNetworkModel) => { model.connections.find(link => link.id === 'rm713:in02-undestinated')!.to = 'rm713:in02:b'; },
      (model: typeof policyNetworkModel) => { model.connections.push({ id: 'unexpected-external', from: 'rm713:in02:a', to: 'rm713:in01:a' }); },
      (model: typeof policyNetworkModel) => { model.connections.find(link => link.id === 'rm714:in02:es:branch')!.from = 'rm714:in02:b'; },
    ]) {
      const changed = structuredClone(policyNetworkModel); mutate(changed);
      expect(() => new SimulationSession(withOwnerNetworkContinuations(changed, 'test-stale-continuation8'))).toThrow(/Review required/);
    }
    expect(() => withOwnerNetworkContinuations(policyNetworkModel, policyNetworkModel.version)).toThrow();
    expect(() => withOwnerNetworkContinuations(withOwnerNetworkContinuations(policyNetworkModel, 'test-repeat8'), 'test-repeat9')).toThrow();
  });
});
