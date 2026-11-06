import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// A bounded authored-prefix correction. Continue on the cable's actual source
// terminal column to its existing, explicitly recorded south port. This permits
// the physical shared stem of a same-terminal earth branch instead of crossing
// that branch after an artificial sideways departure. No placement or search.
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const sourcePath = 'src/models/site/authored-network.json';
const [artifact, report] = await Promise.all([
  read(sourcePath), read('tmp/authored-external-top-down-candidate.json'),
]);
const before = structuredClone(artifact);
const selected = [
  'sw435:tf435:cable-TF435-P-01', 'sw435:tf433:cable-TF433-P-01', 'sw435:tf453:cable-TF453-P-01', 'hpgr:cable-SW438-P-01',
  'sw426:tf440:hv-cable', 'sw426:tf426:hv-cable', 'sw426:tf428:hv-cable', 'sw426:tf427:hv-cable', 'sw426:tf429:hv-cable', 'sw426:tf439:hv-cable', 'sw426:tf430:hv-cable', 'sw426:tf443:hv-cable', 'sw426:laboratory:cable',
  'sw454:sw505:cable-SW505-P-01', 'sw454:tf454:cable-TF454-P-01',
  'sw505:tf506:cable-TF506-P-01', 'sw505:tf507:cable-TF507-P-01', 'sw505:tf508:cable-TF508-P-01', 'sw505:tf505a:cable-TF505A-P-01', 'sw505:tf505b:cable-TF505B-P-01', 'sw505:tf505c:cable-TF505C-P-01',
  'rm721:current-rm713-cable', 'rm721:rm412:cable',
  'rm420:tf420a:cable-SS420-TF420A-P01', 'rm420:tf420b:cable-SS420-TF420B-P01',
  'rm412:tf412:incoming-cable', 'wh:h7:tf418a:input',
];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const on = (p, a, b) => a[0] === b[0]
  ? p[0] === a[0] && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1])
  : a[1] === b[1] && p[1] === a[1] && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]);
const simplify = points => {
  const result = [];
  for (const point of points) {
    if (result.length && same(result.at(-1), point)) continue;
    while (result.length > 1 && ((result.at(-2)[0] === result.at(-1)[0] && result.at(-1)[0] === point[0]) || (result.at(-2)[1] === result.at(-1)[1] && result.at(-1)[1] === point[1]))) result.pop();
    result.push([...point]);
  }
  return result;
};
const globalTerminal = terminal => {
  const module = artifact.modules.find(item => item.layout.terminals[terminal]);
  if (!module) throw Error(`Missing terminal: ${terminal}`);
  const local = module.layout.terminals[terminal];
  return [local[0] + module.origin[0], local[1] + module.origin[1]];
};
const changes = [], skipped = [];
for (const id of selected) {
  const entry = report.entries.find(item => item.connectionId === id);
  const link = artifact.identities.connections.find(item => item.id === id);
  const original = artifact.externalRoutes[id];
  if (!entry || !link || !original || entry.fromSide !== 'south') {
    skipped.push({ id, reason: 'No verified south-source port contract.' }); continue;
  }
  if (!same(original[0], globalTerminal(link.from)) || !same(original.at(-1), globalTerminal(link.to))) throw Error(`Existing endpoint mismatch: ${id}`);
  const port = entry.fromPort;
  const route = original.map(point => [...point]);
  let portIndex = route.findIndex(point => same(point, port));
  if (portIndex < 0) {
    const segment = route.findIndex((point, i) => i < route.length - 1 && on(port, point, route[i + 1]));
    if (segment < 0) { skipped.push({ id, reason: 'Recorded source port is not on the current route.', port }); continue; }
    route.splice(segment + 1, 0, [...port]); portIndex = segment + 1;
  }
  const source = route[0];
  if (portIndex === 0 || port[1] <= source[1]) { skipped.push({ id, reason: 'Recorded port is not downstream of source.', port }); continue; }
  const retainedSuffix = route.slice(portIndex);
  const newPrefix = [source, [source[0], port[1]], port];
  const changed = simplify([...newPrefix, ...retainedSuffix.slice(1)]);
  if (!same(changed[0], original[0]) || !same(changed.at(-1), original.at(-1))) throw Error(`Changed endpoint: ${id}`);
  if (changed.slice(1).some((point, i) => point[0] !== changed[i][0] && point[1] !== changed[i][1])) throw Error(`Diagonal candidate: ${id}`);
  artifact.externalRoutes[id] = changed;
  changes.push({ id, fromPort: port, oldPrefix: route.slice(0, portIndex + 1), newPrefix: simplify(newPrefix), retainedMacroAndTarget: retainedSuffix, endpointsPreserved: true });
}
const changedIds = new Set(changes.map(item => item.id));
for (const [id, points] of Object.entries(before.externalRoutes)) if (!changedIds.has(id) && JSON.stringify(points) !== JSON.stringify(artifact.externalRoutes[id])) throw Error(`Unexpected route mutation: ${id}`);
if (JSON.stringify(before.modules) !== JSON.stringify(artifact.modules)) throw Error('Source-stem correction mutated modules.');
const candidate = 'tmp/authored-network-source-stems.json';
await writeFile(candidate, JSON.stringify(artifact, null, 2) + '\n');
const result = { status: 'candidate-not-promoted', sourcePath, sourceSha256: createHash('sha256').update(await readFile(sourcePath)).digest('hex'), candidate, requestedRoutes: selected.length, changedRoutes: changes.length, unchangedRoutes: Object.keys(artifact.externalRoutes).length - changes.length, modulesPreserved: true, changes, skipped, validation: 'Exact endpoint and orthogonality checks only; full geometry/frame/crossing audit required before promotion.' };
await writeFile('tmp/authored-source-stems-report.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, changes: result.changes.map(({ id }) => id) }, null, 2));
