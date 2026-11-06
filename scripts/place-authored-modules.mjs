import { readFile, writeFile } from 'node:fs/promises';

// Compile the one authored lane/band plan using measured local bounds.
// This is a development command; accepted transforms are saved in the artifact.
const local = JSON.parse(await readFile('src/models/site/authored-local-modules.json', 'utf8'));
const plan = JSON.parse(await readFile('src/models/site/authored-placement.json', 'utf8'));
const modules = new Map(local.modules.map(module => [module.id, module]));
const bounds = new Map(local.sourceCoverage.map(item => [item.groupId, item.bounds]));
const localGap = 320; const branchGap = 1000; const trackGap = 100;
if (modules.size !== plan.groups.length || plan.groups.some(item => !modules.has(item.groupId))) throw new Error('Placement/module coverage differs.');
const bandKey = item => `${item.laneId}:${item.row}`;
const bands = new Map();
for (const item of plan.groups) {
  const key = bandKey(item);
  if (!bands.has(key)) bands.set(key, { key, lane: item.laneId, row: item.row, items: [] });
  bands.get(key).items.push(item);
}
const groupPlan = new Map(plan.groups.map(item => [item.groupId, item]));
for (const band of bands.values()) {
  band.items.sort((a, b) => a.slot - b.slot);
  band.width = band.items.reduce((sum, item) => sum + bounds.get(item.groupId)[2], 0) + localGap * (band.items.length - 1);
  band.height = Math.max(...band.items.map(item => bounds.get(item.groupId)[3]));
  const previous = [...bands.values()].filter(item => item.lane === band.lane && item.row < band.row).sort((a, b) => b.row - a.row)[0];
  band.dependencies = new Set(previous ? [previous.key] : []);
  for (const item of band.items) if (item.parentGroupId) {
    const parent = groupPlan.get(item.parentGroupId);
    if (!parent) throw new Error(`Unknown placement parent ${item.parentGroupId}`);
    if (bandKey(parent) !== band.key) band.dependencies.add(bandKey(parent));
  }
}
const lanes = new Map(); let x = 0;
for (const lane of [...plan.lanes].sort((a, b) => a.order - b.order)) {
  const laneBands = [...bands.values()].filter(band => band.lane === lane.id);
  const width = Math.max(0, ...laneBands.map(band => band.width));
  const tracks = plan.externalConnections.filter(link => JSON.stringify(link).includes(`lane:${lane.id}:`)).length;
  const gutter = branchGap + tracks * trackGap;
  lanes.set(lane.id, { x: x + gutter, width, gutter }); x += width + gutter * 2;
}
const solved = new Map();
while (solved.size < bands.size) {
  const eligible = [...bands.values()].filter(band => !solved.has(band.key) && [...band.dependencies].every(key => solved.has(key)));
  if (!eligible.length) throw new Error('Placement bands have cyclic dependencies.');
  for (const band of eligible) {
    band.y = Math.max(0, ...[...band.dependencies].map(key => solved.get(key).y + solved.get(key).height + branchGap));
    solved.set(band.key, band);
  }
}
// Explicit paired-room top-edge alignment, followed by downstream constraint propagation.
const sameRowAdjacencies = plan.adjacencies.filter(item => item.relationship === 'same-row-facing-sides');
for (const adjacency of sameRowAdjacencies) {
  const ids = [adjacency.fromGroupId, adjacency.toGroupId];
  const selected = ids.map(id => solved.get(bandKey(groupPlan.get(id))));
  if (selected.length) { const y = Math.max(...selected.map(band => band.y)); for (const band of selected) band.y = y; }
}
for (let pass = 0; pass < bands.size; pass++) {
  let changed = false;
  for (const band of solved.values()) {
    const minY = Math.max(0, ...[...band.dependencies].map(key => solved.get(key).y + solved.get(key).height + branchGap));
    if (band.y < minY) { band.y = minY; changed = true; }
  }
  for (const adjacency of sameRowAdjacencies) {
    const selected = [adjacency.fromGroupId, adjacency.toGroupId].map(id => solved.get(bandKey(groupPlan.get(id))));
    const y = Math.max(...selected.map(band => band.y));
    for (const band of selected) if (band.y !== y) { band.y = y; changed = true; }
  }
  if (!changed) break;
}
const placed = []; const measured = [];
for (const band of solved.values()) {
  const lane = lanes.get(band.lane); let cursor = lane.x + (lane.width - band.width) / 2;
  for (const item of band.items) {
    const module = modules.get(item.groupId); const [bx, by, width, height] = bounds.get(item.groupId);
    const origin = [cursor - bx, band.y - by];
    placed.push({ ...module, origin }); measured.push({ groupId: module.id, x: cursor, y: band.y, width, height }); cursor += width + localGap;
  }
}
// Explicit authored pins change only their own rigid transform. They do not
// propagate through lane bands or relocate electrical descendants.
for (const pin of plan.pinnedGroups ?? []) {
  const module = placed.find(item => item.id === pin.groupId);
  const measuredGroup = measured.find(item => item.groupId === pin.groupId);
  if (!module || !measuredGroup) throw new Error(`Unknown pinned group ${pin.groupId}`);
  const [bx, by] = bounds.get(pin.groupId);
  module.origin = [pin.measuredOrigin[0] - bx, pin.measuredOrigin[1] - by];
  measuredGroup.x = pin.measuredOrigin[0]; measuredGroup.y = pin.measuredOrigin[1];
}
// Once authored positions are accepted, measurements may change their footprint
// but cannot move other groups through lane-width or dependency propagation.
for (const [id, point] of Object.entries(plan.fixedModuleOrigins ?? {})) {
  const module = placed.find(item => item.id === id);
  const measuredGroup = measured.find(item => item.groupId === id);
  if (!module || !measuredGroup) throw new Error(`Unknown fixed group ${id}`);
  const [bx, by] = bounds.get(id);
  module.origin = [...point];
  measuredGroup.x = point[0] + bx; measuredGroup.y = point[1] + by;
}
const overlaps = measured.flatMap((a, i) => measured.slice(i + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => [a.groupId, b.groupId]));
if (overlaps.length) throw new Error(`Measured group overlap: ${JSON.stringify(overlaps)}`);
const output = { schemaVersion: 1, modelId: local.modelId, modelVersion: local.modelVersion, topologyFingerprint: local.topologyFingerprint,
  status: 'placement-only-external-routing-pending', modules: placed, measuredGroups: measured, lanes: Object.fromEntries(lanes),
  localFindings: local.summary, externalConnectionPlan: plan.externalConnections };
if (plan.fixedLanes) output.lanes = plan.fixedLanes;
await writeFile('src/models/site/authored-placed-modules.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ groups: placed.length, assets: placed.reduce((sum, module) => sum + module.assetIds.length, 0),
  width: Math.max(...measured.map(item => item.x + item.width)) - Math.min(...measured.map(item => item.x)),
  height: Math.max(...measured.map(item => item.y + item.height)) - Math.min(...measured.map(item => item.y)),
  overlaps: overlaps.length, pendingExternalRoutes: plan.externalConnections.length }, null, 2));
