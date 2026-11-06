import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Four explicit source-prefix corrections using measured existing route
// intersections. No routing search, inferred ports, or module movement.
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const sourcePath = 'src/models/site/authored-network.json';
const [artifact, placed, ownership] = await Promise.all([
  read(sourcePath), read('src/models/site/authored-placed-modules.json'), read('src/models/site/authored-ownership.json'),
]);
const model = await read(ownership.baselineModelPath);
const before = structuredClone(artifact);
const terminalOwner = new Map(artifact.modules.flatMap(module => Object.keys(module.layout.terminals).map(id => [id, module.id])));
const links = new Map(model.connections.map(link => [link.id, link]));
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const between = (v, a, b) => Math.min(a, b) <= v && v <= Math.max(a, b);
const on = (p, a, b) => a[0] === b[0] ? p[0] === a[0] && between(p[1], a[1], b[1]) : a[1] === b[1] && p[1] === a[1] && between(p[0], a[0], b[0]);
const simplify = points => {
  const result = [];
  for (const point of points) {
    if (result.length && same(result.at(-1), point)) continue;
    while (result.length > 1 && on(result.at(-1), result.at(-2), point)) result.pop();
    result.push([...point]);
  }
  return result;
};
const corrections = [
  ['sw454:tf454:cable-TF454-P-01', 'measured-south-boundary'],
  ['wh:h3:tf416a:input', 'existing-horizontal-source-column-intersection'],
  ['wh:h8:tf416:input', 'existing-horizontal-source-column-intersection'],
  ['wh:h8:tf416a:input', 'existing-horizontal-source-column-intersection'],
];
const changes = [];
for (const [id, method] of corrections) {
  const original = artifact.externalRoutes[id];
  if (!original) throw Error(`Missing route: ${id}`);
  const source = original[0], groupId = terminalOwner.get(links.get(id).from);
  const bounds = placed.measuredGroups.find(group => group.groupId === groupId);
  if (!bounds) throw Error(`Missing measured source bounds: ${id}`);
  const bottom = bounds.y + bounds.height;
  let segmentIndex = -1, intersection;
  for (let i = 0; i < original.length - 1; i++) {
    const a = original[i], b = original[i + 1];
    if (method === 'measured-south-boundary' && a[0] === b[0] && a[1] < bottom && b[1] >= bottom) {
      segmentIndex = i; intersection = [a[0], bottom]; break;
    }
    if (method !== 'measured-south-boundary' && a[1] === b[1] && a[1] > bottom && between(source[0], a[0], b[0])) {
      segmentIndex = i; intersection = [source[0], a[1]]; break;
    }
  }
  if (!intersection || !on(intersection, original[segmentIndex], original[segmentIndex + 1])) throw Error(`No verified existing route intersection: ${id}`);
  const prefix = method === 'measured-south-boundary' ? [source, [source[0], bottom], intersection] : [source, intersection];
  const suffix = [intersection, ...original.slice(segmentIndex + 1)];
  const changed = simplify([...prefix, ...suffix.slice(1)]);
  if (!same(changed[0], original[0]) || !same(changed.at(-1), original.at(-1))) throw Error(`Endpoint changed: ${id}`);
  if (changed.slice(1).some((point, i) => point[0] !== changed[i][0] && point[1] !== changed[i][1])) throw Error(`Diagonal generated: ${id}`);
  artifact.externalRoutes[id] = changed;
  changes.push({ id, method, groupId, measuredSouthBoundary: bottom, source, intersection, oldPrefix: [...original.slice(0, segmentIndex + 1), intersection], newPrefix: simplify(prefix), retainedSuffix: suffix, endpointsPreserved: true });
}
const selected = new Set(corrections.map(([id]) => id));
for (const [id, points] of Object.entries(before.externalRoutes)) if (!selected.has(id) && JSON.stringify(points) !== JSON.stringify(artifact.externalRoutes[id])) throw Error(`Unexpected route mutation: ${id}`);
if (JSON.stringify(before.modules) !== JSON.stringify(artifact.modules)) throw Error('Junction correction mutated modules.');
const candidate = 'tmp/authored-network-junction-stems.json';
await writeFile(candidate, JSON.stringify(artifact, null, 2) + '\n');
const report = { status: 'candidate-not-promoted', sourcePath, sourceSha256: createHash('sha256').update(await readFile(sourcePath)).digest('hex'), candidate, changedRoutes: changes.length, unchangedRoutes: Object.keys(artifact.externalRoutes).length - changes.length, modulesPreserved: true, changes, validation: 'Measured existing intersections, exact endpoint and orthogonality checks only; full geometry/frame/crossing audit required.' };
await writeFile('tmp/authored-junction-stems-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, changes: changes.map(({ id, source, intersection }) => ({ id, source, intersection })) }, null, 2));
