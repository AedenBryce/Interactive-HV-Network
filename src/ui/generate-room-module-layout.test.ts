import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutAgent3RoomModuleTree } from './agent3-room-module-tree-candidate';

it('writes the deterministic room-module whole-network layout artifact', () => {
  const candidate = layoutAgent3RoomModuleTree(currentNetworkModel);
  const artifact = {
    modelId: currentNetworkModel.id,
    modelVersion: currentNetworkModel.version,
    assetCount: currentNetworkModel.assets.length,
    connectionCount: currentNetworkModel.connections.length,
    positions: candidate.positions,
    terminalPositions: candidate.secondAlign.candidate.terminalPositions,
    labels: Object.fromEntries(candidate.labels),
    routes: Object.fromEntries(candidate.routing.routes),
    frames: candidate.roomFrames,
    unresolvedConnectionIds: candidate.routing.remaining,
  };
  writeFileSync(resolve(process.cwd(), 'src/models/site/room-module-layout.json'), `${JSON.stringify(artifact)}\n`);
  console.info('ROOM_MODULE_LAYOUT_ARTIFACT', JSON.stringify({
    assets: artifact.assetCount,
    positioned: Object.keys(artifact.positions).length,
    connections: artifact.connectionCount,
    routed: Object.keys(artifact.routes).length,
    unresolved: artifact.unresolvedConnectionIds.length,
    frames: artifact.frames.length,
  }));
}, 300_000);
