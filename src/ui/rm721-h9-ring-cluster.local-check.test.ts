import { expect, it } from 'vitest';
import { applyRm721H9RingClusterCandidate } from './rm721-h9-ring-cluster';

it('fits the RM721/H9 candidate around the audited local routes without changing endpoints', () => {
  const routes = new Map([
    ['wh:h9-to-h7:cable', [[-814.625, 36064], [-814.625, 35784], [2196.625, 35784], [2196.625, 41428]]],
    ['rm721:rm412:cable', [[12723.42578125, 37646], [1291.5, 37646], [1291.5, 37869]]],
    ['wh:h9:tf419a:input', [[1827.125, 36624], [1827.125, 36664], [-3182.625, 36664], [-3182.625, 37509]]],
    ['rm721:in02:es:branch', [[8136.55078125, 37646], [8276.55078125, 37646], [8276.55078125, 37696]]],
    ['rm412:f1:winding-cable', [[2562.375, 40349], [2562.375, 40381], [1988.125, 40381], [1988.125, 40669]]],
  ]);
  const h9Endpoints = [routes.get('wh:h9-to-h7:cable')![0], routes.get('wh:h9-to-h7:cable')!.at(-1)];
  const rm721Endpoints = [routes.get('rm721:rm412:cable')![0], routes.get('rm721:rm412:cable')!.at(-1)];

  expect(applyRm721H9RingClusterCandidate(routes)).toMatchObject({
    applied: true,
    h9LaneX: -3222.625,
    h9ApproachY: 41528,
    rm721RunY: 37826,
  });
  expect([routes.get('wh:h9-to-h7:cable')![0], routes.get('wh:h9-to-h7:cable')!.at(-1)]).toEqual(h9Endpoints);
  expect([routes.get('rm721:rm412:cable')![0], routes.get('rm721:rm412:cable')!.at(-1)]).toEqual(rm721Endpoints);
});
