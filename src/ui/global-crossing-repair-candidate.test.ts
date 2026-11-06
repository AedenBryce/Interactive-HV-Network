import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { repairCrossingsOneAtATime } from './global-crossing-repair-candidate';

describe('experimental global crossing repair candidate', () => {
  it('keeps whole-model coverage and reports route geometry after fixed-coordinate rip-up', () => {
    const { network, metrics } = repairCrossingsOneAtATime(currentNetworkModel, 8);
    const missingRoutes = currentNetworkModel.connections.filter(connection => !network.routes.has(connection.id));
    const missingAssets = currentNetworkModel.assets.filter(asset => !network.view.layout.assets[asset.id]);
    const nonOrthogonal = [...network.routes].flatMap(([id, points]) => points.slice(1).flatMap((point, index) =>
      point[0] === points[index][0] || point[1] === points[index][1] ? [] : [`${id}[${index}]`],
    ));
    console.log(JSON.stringify({ metrics, missingRoutes: missingRoutes.map(item => item.id), missingAssets: missingAssets.map(item => item.id), nonOrthogonal }, null, 2));
    expect(missingRoutes).toEqual([]);
    expect(missingAssets).toEqual([]);
    expect(metrics.endpointsPreserved).toBe(true);
    expect(nonOrthogonal).toEqual([]);
    expect(metrics.positionedAssetCount).toBe(currentNetworkModel.assets.length);
    expect(metrics.routeCount).toBe(currentNetworkModel.connections.length);
  }, 180_000);
});
