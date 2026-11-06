import type { Point } from './diagram-geometry';

type RouteDetour = {
  id: string;
  expected: readonly Point[];
  replacement: readonly Point[];
};

// These orthogonal detours preserve the exact modeled terminals. Each applies
// only while its source route matches the reviewed geometry; the full layout
// audit remains the source of truth for whether the combined routes are clear.
export const measuredRouteCrossingDetours: readonly RouteDetour[] = [
  {
    id: 'line33:284-to-286',
    expected: [[-208.73528137424, 16574.48528137424], [-208.73528137424, 17108], [-723, 17108]],
    replacement: [[-208.73528137424, 16574.48528137424], [-160.73528137424, 16574.48528137424], [-160.73528137424, 17108], [-723, 17108]],
  },
  {
    id: 'rm410:sw04-rm419',
    expected: [[2307.75, 29094], [2127.75, 29094], [2127.75, 31384], [2407.75, 31384]],
    replacement: [[2307.75, 29094], [2127.75, 29094], [2127.75, 31704], [2407.75, 31704], [2407.75, 31384]],
  },
  {
    id: 'rm410:vs4101:input-b:winding-cable',
    expected: [[402.75, 29604], [402.75, 29648], [699.25, 29648], [699.25, 29924]],
    replacement: [[402.75, 29604], [402.75, 29136], [699.25, 29136], [699.25, 29924]],
  },
  {
    id: 'wh:h7:rm418:cb03:earth:branch',
    expected: [[1387.375, 43348], [1387.375, 44158], [1187.375, 44158], [1187.375, 43898]],
    replacement: [[1387.375, 43348], [1387.375, 44158], [1267.375, 44158], [1267.375, 43898], [1187.375, 43898]],
  },
  {
    id: 'wh:h9-to-h7:cable',
    expected: [[-814.625, 36064], [-814.625, 36104], [2196.625, 36104], [2196.625, 41428]],
    replacement: [[-814.625, 36064], [-814.625, 35784], [2196.625, 35784], [2196.625, 41428]],
  },
  {
    id: 'rm721:rm412:cable',
    expected: [[12723.42578125, 37646], [12723.42578125, 37678], [1291.5, 37678], [1291.5, 37869]],
    replacement: [[12723.42578125, 37646], [12723.42578125, 37486], [1291.5, 37486], [1291.5, 37869]],
  },
  {
    id: 'rm420:mc420:motor-02:fc:contact-motor',
    expected: [[-3461.5625, 24946], [-3461.5625, 25526], [-3761.5625, 25526], [-3761.5625, 25496]],
    replacement: [[-3461.5625, 24946], [-3461.5625, 25014], [-3761.5625, 25014], [-3761.5625, 25496]],
  },
  {
    id: 'whole:join:sw454',
    expected: [[-11801.30078125, 1966], [-11801.30078125, 18986], [770.8125, 18986], [770.8125, 21446]],
    replacement: [[-11801.30078125, 1966], [-11801.30078125, 19178], [770.8125, 19178], [770.8125, 21446]],
  },
  {
    id: 'wh:h3:mc416:incoming-bar',
    expected: [[-1854, 46766], [-1854, 47206]],
    replacement: [[-1854, 46766], [-2174, 46766], [-2174, 47206], [-1854, 47206]],
  },
  {
    id: 'cv006-lv:mc410a:bar',
    expected: [[1557.25, 30724], [1557.25, 31164]],
    replacement: [[1557.25, 30724], [1749.25, 30724], [1749.25, 31164], [1557.25, 31164]],
  },
];

function samePoints(actual: readonly Point[], expected: readonly Point[]) {
  return actual.length === expected.length && actual.every((point, index) =>
    point[0] === expected[index][0] && point[1] === expected[index][1]);
}

function orthogonal(points: readonly Point[]) {
  return points.slice(1).every((point, index) => point[0] === points[index][0] || point[1] === points[index][1]);
}

export function applyMeasuredRouteCrossingDetours(routes: Map<string, Point[]>) {
  const applied: string[] = [];
  const skipped: string[] = [];
  for (const detour of measuredRouteCrossingDetours) {
    const current = routes.get(detour.id);
    const preservesEndpoints = current?.length && detour.replacement.length
      && current[0][0] === detour.replacement[0][0]
      && current[0][1] === detour.replacement[0][1]
      && current.at(-1)![0] === detour.replacement.at(-1)![0]
      && current.at(-1)![1] === detour.replacement.at(-1)![1];
    if (!current || !samePoints(current, detour.expected) || !preservesEndpoints || !orthogonal(detour.replacement)) {
      skipped.push(detour.id);
      continue;
    }
    routes.set(detour.id, detour.replacement.map(([x, y]) => [x, y]));
    applied.push(detour.id);
  }
  return { applied, skipped };
}
