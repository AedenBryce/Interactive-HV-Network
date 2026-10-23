import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { continuationNetworkModel } from '../models/site/current-network';
import { withOwnerTf406bRoute } from '../models/site/owner-tf406b-route';
import { withOwnerLvEndpointScope } from '../models/site/owner-lv-endpoint-scope';
import { withOwnerSelectorContacts } from '../models/site/owner-selector-contacts';
import { withOwnerBinaryAcContacts } from '../models/site/owner-binary-ac-contacts';

function prior() { return withOwnerSelectorContacts(withOwnerLvEndpointScope(withOwnerTf406bRoute(continuationNetworkModel, 'test-binary-route9'), 'test-binary-scope9'), 'test-binary-selectors9'); }

describe('owner95/96 binary contacts and LV AC paths', () => {
  it('selects six separate AC contact/wire paths without accepting equipment, upstream routes or winding-earth claims', () => {
    const base = prior(); const session = new SimulationSession(withOwnerBinaryAcContacts(base, 'test-binary-ac9')); const snapshot = session.snapshot();
    for (const prefix of ['rm406:vs4061:input-a', 'rm406:vs4061:input-b', 'rm410:vs4101:input-a', 'rm410:vs4101:input-b', 'rm413a:ac-input-a', 'rm413a:ac-input-b']) {
      if (prefix.startsWith('rm413a')) expect(snapshot.connectivity[`${prefix}:boundary`].possibleSourceIds.length).toBeGreaterThan(0);
      else expect(snapshot.connectivity[`${prefix}:boundary`].sourceIds.length).toBeGreaterThan(0);
      for (const suffix of ['winding-cable', 'switch-boundary']) expect(snapshot.model.connections.find(link => link.id === `${prefix}:${suffix}`)?.knowledge).toBe('owner-confirmed');
      expect(snapshot.model.assets.find(asset => asset.id === `${prefix}:switch`)?.knowledge).toBe('provisional');
    }
    expect(snapshot.model.assets.flatMap(asset => asset.positions).filter(position => position.supportScope === 'relationship')).toHaveLength(105);
    expect(snapshot.model.starting).toEqual(base.starting); expect(snapshot.model.interlocks).toEqual(base.interlocks);
    expect(snapshot.model.earths).toEqual(base.earths); expect(snapshot.model.boundaries).toEqual(base.boundaries);
    expect(session.changeDevice('rm406:vs4061:input-a:switch', 'open').ok).toBe(true);
    expect(session.snapshot().connectivity['rm406:vs4061:input-a:boundary'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['rm406:vs4061:input-b:boundary'].sourceIds.length).toBeGreaterThan(0);
  }, 30_000);

  it('rejects modified contact pairs and cable endpoints instead of broadening the approved24/12 selection', () => {
    const base = prior();
    for (const mutate of [
      (model: typeof base) => { model.assets.find(asset => asset.id === 'rm712:in02')!.positions.find(position => position.id === 'closed')!.pairs = []; },
      (model: typeof base) => { model.connections.find(link => link.id === 'rm413a:ac-input-a:winding-cable')!.to = 'rm413a:ac-input-b:switch:a'; },
    ]) {
      const changed = structuredClone(base); mutate(changed);
      expect(() => new SimulationSession(withOwnerBinaryAcContacts(changed, 'test-stale-binary9'))).toThrow(/Review required/);
    }
    expect(() => withOwnerBinaryAcContacts(base, base.version)).toThrow();
    expect(() => withOwnerBinaryAcContacts(withOwnerBinaryAcContacts(base, 'test-binary-once9'), 'test-binary-twice9')).toThrow();
  });
});
