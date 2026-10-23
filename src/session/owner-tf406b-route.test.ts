import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { continuationNetworkModel } from '../models/site/current-network';
import { withOwnerTf406bRoute } from '../models/site/owner-tf406b-route';

describe('owner90 TF406B feeder decision through SimulationSession', () => {
  it('confirms the CB02/SW03 route without accepting ratings, provisional contact paths or changing local profiles', () => {
    const before = new SimulationSession(continuationNetworkModel).saveScenario();
    const session = new SimulationSession(withOwnerTf406bRoute(continuationNetworkModel, 'test-tf406b9'));
    const snapshot = session.snapshot(); const model = snapshot.model;
    expect(model.connections.find(link => link.id === 'rm406:tf406b:cable-TF406B-P1')).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-TF406B-CB02-SW03-ROUTE']) });
    expect(snapshot.connectivity['rm406:mc406a:bus'].possibleSourceIds).toContain('boundary:tf11');
    for (const device of ['rm406:sw01', 'rm406:sw03']) expect(model.assets.find(asset => asset.id === device)).toEqual(before.model.assets.find(asset => asset.id === device));
    expect(model.reviews!.find(review => review.id === 'CV-R04')?.status).toBe('resolved');
    expect(model.reviews!.find(review => review.id === 'CV-R05')).toEqual(before.model.reviews!.find(review => review.id === 'CV-R05'));
    expect(model.assets.find(asset => asset.id === 'rm406:tf406b:transformer')?.knowledge).toBe('provisional');
    expect(model.starting).toEqual(before.model.starting); expect(model.interlocks).toEqual(before.model.interlocks);
    expect(model.earths).toEqual(before.model.earths); expect(model.boundaries).toEqual(before.model.boundaries);
    expect(session.changeDevice('rm406:cb02', 'open').ok).toBe(true);
    expect(session.snapshot().connectivity['rm406:mc406a:bus'].sourceIds).toEqual([]);
    expect(session.changeDevice('rm406:sw03', 'isolated').ok).toBe(true);
    expect(session.changeDevice('rm406:cb02', 'closed').ok).toBe(false);
    expect(session.reset().ok).toBe(true);
    expect(new SimulationSession(continuationNetworkModel).saveScenario()).toEqual(before);
  }, 30_000);
});
