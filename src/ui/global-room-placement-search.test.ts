import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { currentNetworkModel } from '../models/site/current-network';
import { searchGlobalRoomPlacements } from './global-room-placement-search';

describe('isolated global room-placement search', () => {
  it('ranks whole-room placements and audits the best complete route candidate', () => {
    const progressPath = join(tmpdir(), 'interactive-hv-global-room-search-progress.json');
    const result = searchGlobalRoomPlacements(currentNetworkModel, {
      routeCandidates: true,
      routeCandidateLimit: 1,
      onProgress: (phase, detail) => writeFileSync(progressPath, JSON.stringify({ phase, detail }, null, 2)),
    });
    console.info('global room placement single route result', JSON.stringify({
      productionBaseline: result.productionBaseline,
      geometryCandidateCount: result.geometryCandidateCount,
      topCandidate: result.fullyRouted[0] && {
        id: result.fullyRouted[0].id,
        routeCount: result.fullyRouted[0].routeCount,
        unresolvedCount: result.fullyRouted[0].unresolvedCount,
        crossings: result.fullyRouted[0].crossings,
        sharedLengths: result.fullyRouted[0].sharedLengths,
        endpointContacts: result.fullyRouted[0].endpointContacts,
        frameOverlaps: result.fullyRouted[0].frameOverlaps,
        frameCuts: result.fullyRouted[0].frameCuts,
        unrelatedFrameCuts: result.fullyRouted[0].unrelatedFrameCuts,
        contentBoxCollisions: result.fullyRouted[0].contentBoxCollisions,
        symbolLabelRouteHits: result.fullyRouted[0].symbolLabelRouteHits,
        routedSw411Joins: result.fullyRouted[0].routedSw411Joins,
        missingSw411Joins: result.fullyRouted[0].missingSw411Joins,
        bounds: result.fullyRouted[0].bounds,
      },
      rankedWholeLayouts: result.fullyRouted.map(candidate => ({
        id: candidate.id,
        routed: candidate.routeCount,
        unresolved: candidate.unresolvedCount,
        crossings: candidate.crossings,
        sharedLengths: candidate.sharedLengths,
        endpointContacts: candidate.endpointContacts,
        frameOverlaps: candidate.frameOverlaps,
        frameCuts: candidate.frameCuts,
        unrelatedFrameCuts: candidate.unrelatedFrameCuts,
        contentBoxCollisions: candidate.contentBoxCollisions,
        symbolLabelRouteHits: candidate.symbolLabelRouteHits,
        aspectRatio: candidate.aspectRatio,
        routeLength: candidate.routeLength,
        score: candidate.score,
        bounds: candidate.bounds,
      })),
      progressPath,
    }));
    expect(result.geometryCandidateCount).toBeGreaterThan(0);
    expect(result.fullyRouted).toHaveLength(1);
  }, 300_000);
});
