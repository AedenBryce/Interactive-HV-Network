import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutSw411RoomMacroCandidate } from './sw411-room-macro-candidate';

describe('SW411 shared-corridor candidate', () => {
  it('builds and audits one isolated shared-corridor candidate', () => {
    const candidate = layoutSw411RoomMacroCandidate(currentNetworkModel);
    console.info('SW411 group summary', JSON.stringify({
      routes: candidate.routes.size,
      missing: candidate.remainingUnresolved,
      crossings: candidate.findings.filter(item => item.type === 'route-crossing').map(item => `${item.routeIds.join('|')}`),
      shared: candidate.findings.filter(item => item.type === 'shared-route-length').map(item => `${item.routeIds.join('|')}`),
      endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').map(item => `${item.routeIds.join('|')}`),
      frameOverlaps: candidate.findings.filter(item => item.type === 'room-frame-overlap'),
      diagonals: candidate.findings.filter(item => item.type === 'non-orthogonal'),
      unrelatedFrames: candidate.routeFrameHits.filter(item => !item.intended).map(item => `${item.routeId}→${item.frameId}`),
      hits: candidate.routeHits,
      bounds: candidate.bounds,
      ring: candidate.routes.get('whole:join:crushing-tie'),
    }));
    expect(candidate.routeInventoryIds).toHaveLength(34);
  }, 90_000);
});
