import { readFile, writeFile } from 'node:fs/promises';

// Scoped authored update: move only the five explicitly placed header groups
// and reconnect their existing terminal pairs. No electrical model is edited.
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [before, placed, plan] = await Promise.all([
  read('tmp/water-header-before/authored-network.json'),
  read('src/models/site/authored-placed-modules.json'),
  read('src/models/site/authored-placement.json'),
]);
const candidate = { ...before, layoutRevision: plan.layoutRevision, modules: placed.modules };
candidate.externalRoutes = structuredClone(before.externalRoutes);
const terminal = id => {
  const module = candidate.modules.find(item => item.layout.terminals[id]);
  if (!module) throw new Error(`Missing header terminal ${id}`);
  const point = module.layout.terminals[id];
  return [point[0] + module.origin[0], point[1] + module.origin[1]];
};
const pointsFor = id => {
  const link = before.identities.connections.find(item => item.id === id);
  if (!link) throw new Error(`Missing header connection ${id}`);
  return [terminal(link.from), terminal(link.to)];
};
const first = 'whole:join:tf11-in03';
const [from, to] = pointsFor(first);
candidate.externalRoutes[first] = [from, [from[0], 3358], [to[0], 3358], to];
for (const id of ['whole:join:tf12-in04', 'owner:tf12:opf1-7-to-in04', 'mine:sw441:incoming:cable', 'mine:tf441:hv-cable']) {
  const points = pointsFor(id);
  if (points[0][0] !== points[1][0]) throw new Error(`Header feeder columns are not aligned: ${id}`);
  candidate.externalRoutes[id] = points;
}
await writeFile('tmp/authored-water-header-candidate.json', JSON.stringify(candidate, null, 2) + '\n');
console.log('Complete water-header candidate saved; validate before promotion.');
