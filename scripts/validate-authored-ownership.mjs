import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const baselineUrl = new URL('../tmp/hv-layout-baseline-20261105/model.json', import.meta.url);
const baselineRecordUrl = new URL('../docs/goals/hv-layout-baseline.json', import.meta.url);
const manifestUrl = new URL('../src/models/site/authored-ownership.json', import.meta.url);
const sha256 = value => createHash('sha256').update(value).digest('hex');
// Match scripts/capture-layout-baseline.mjs: retain array order, sort object keys.
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const canonicalHash = value => sha256(JSON.stringify(canonical(value)));
const fail = message => { throw new Error(`Authored ownership: ${message}`); };
const sorted = values => [...values].sort();
const signature = values => JSON.stringify(sorted(values));

/** Validate only identity and authored ownership. No topology traversal or geometry solver. */
export function validateAuthoredOwnership(model, manifest) {
  const baselineBytes = readFileSync(baselineUrl);
  const baseline = JSON.parse(baselineBytes.toString('utf8'));
  const baselineRecord = JSON.parse(readFileSync(baselineRecordUrl, 'utf8'));
  const modelSha256 = canonicalHash(baseline);
  const topologyAssets = model.assets.map(asset => ({ id: asset.id, terminals: [...asset.terminals] })).sort((a, b) => a.id.localeCompare(b.id));
  const topologyConnections = model.connections.map(({ id, from, to }) => ({ id, from, to })).sort((a, b) => a.id.localeCompare(b.id));
  const topologySha256 = canonicalHash({ assets: topologyAssets, connections: topologyConnections });
  if (modelSha256 !== baselineRecord.modelSha256) fail('canonical frozen model fingerprint differs from baseline record');
  if (topologySha256 !== baselineRecord.topologySha256) fail('canonical topology fingerprint differs from baseline record');
  if (manifest.schemaVersion !== 1) fail('unsupported schemaVersion');
  if (manifest.baselineFileSha256 !== sha256(baselineBytes)) fail('frozen baseline fingerprint changed');
  if (manifest.modelId !== baseline.id || manifest.modelVersion !== baseline.version) fail('manifest model identity differs from baseline');
  if (model.id !== baseline.id || model.version !== baseline.version) fail('input model identity differs from baseline');
  const assetSignature = source => signature(source.assets.map(a => a.id));
  const terminalSignature = source => signature(source.assets.flatMap(a => a.terminals.map(t => JSON.stringify([a.id, t]))));
  const connectionSignature = source => signature(source.connections.map(c => JSON.stringify([c.id, c.from, c.to])));
  if (assetSignature(model) !== assetSignature(baseline)) fail('asset IDs differ from frozen baseline');
  if (terminalSignature(model) !== terminalSignature(baseline)) fail('asset terminal IDs or ownership differ from frozen baseline');
  if (connectionSignature(model) !== connectionSignature(baseline)) fail('connection IDs or endpoint-terminal pairs differ from frozen baseline');
  const assets = new Map();
  const terminalAssetIds = new Map();
  for (const asset of model.assets) {
    if (assets.has(asset.id)) fail(`duplicate model asset ${asset.id}`);
    assets.set(asset.id, asset);
    for (const terminal of asset.terminals) {
      if (terminalAssetIds.has(terminal)) fail(`duplicate model terminal ${terminal}`);
      terminalAssetIds.set(terminal, asset.id);
    }
  }
  const views = new Map(model.presentation.views.map(view => [view.id, view]));
  const groupIds = new Set();
  const assetOwners = new Map();
  const terminalOwners = new Map();
  if (!Array.isArray(manifest.groups) || !manifest.groups.length) fail('groups are missing');
  for (const group of manifest.groups) {
    if (!group.id || groupIds.has(group.id)) fail(`missing or duplicate group ID ${group.id}`);
    groupIds.add(group.id);
    if (!group.label || typeof group.frame !== 'boolean' || !group.rationale) fail(`incomplete group metadata ${group.id}`);
    if (!Array.isArray(group.assetIds) || !group.assetIds.length) fail(`empty group ${group.id}`);
    if (!Array.isArray(group.sourceViewIds) || !group.sourceViewIds.length) fail(`missing source views ${group.id}`);
    for (const viewId of group.sourceViewIds) if (!views.has(viewId)) fail(`unknown view ${viewId}`);
    for (const assetId of group.assetIds) {
      const asset = assets.get(assetId);
      if (!asset) fail(`unknown asset ${assetId} in ${group.id}`);
      if (assetOwners.has(assetId)) fail(`multiple owners for ${assetId}`);
      if (!group.sourceViewIds.some(v => views.get(v).assetIds.includes(assetId))) fail(`source views omit ${assetId} in ${group.id}`);
      assetOwners.set(assetId, group.id);
      for (const terminal of asset.terminals) terminalOwners.set(terminal, group.id);
    }
  }
  const missing = model.assets.filter(asset => !assetOwners.has(asset.id));
  if (missing.length) fail(`unowned assets: ${missing.map(asset => asset.id).join(', ')}`);
  if (terminalOwners.size !== terminalAssetIds.size) fail('not every model terminal has an owner');
  const connectionIds = new Set();
  const connections = model.connections.map(connection => {
    if (connectionIds.has(connection.id)) fail(`duplicate connection ${connection.id}`);
    connectionIds.add(connection.id);
    const fromGroupId = terminalOwners.get(connection.from);
    const toGroupId = terminalOwners.get(connection.to);
    if (!fromGroupId || !toGroupId) fail(`unowned endpoint on ${connection.id}`);
    return {
      id: connection.id, from: connection.from, to: connection.to,
      fromAssetId: terminalAssetIds.get(connection.from), toAssetId: terminalAssetIds.get(connection.to),
      fromGroupId, toGroupId,
      classification: fromGroupId === toGroupId ? 'internal' : 'external',
    };
  });
  const repeatedAssets = new Set(model.assets.filter(a => model.presentation.views.filter(v => v.id !== 'whole/overview' && v.assetIds.includes(a.id)).length > 1).map(a => a.id));
  const decisions = new Set();
  for (const choice of manifest.duplicateViewChoices ?? []) {
    if (decisions.has(choice.assetId) || !repeatedAssets.has(choice.assetId)) fail(`invalid duplicate-view choice ${choice.assetId}`);
    decisions.add(choice.assetId);
    if (choice.ownerGroupId !== assetOwners.get(choice.assetId) || !choice.rationale) fail(`invalid owner rationale ${choice.assetId}`);
    const expectedViews = model.presentation.views.filter(v => v.id !== 'whole/overview' && v.assetIds.includes(choice.assetId)).map(v => v.id);
    if (signature(choice.sourceViewIds) !== signature(expectedViews)) fail(`incomplete duplicate views ${choice.assetId}`);
  }
  if (decisions.size !== repeatedAssets.size) fail('missing duplicate-view ownership rationale');
  const internalConnections = connections.filter(c => c.classification === 'internal');
  const externalConnections = connections.filter(c => c.classification === 'external');
  return {
    assetOwners, terminalOwners, terminalAssetIds, connections, internalConnections, externalConnections,
    summary: {
      assets: assets.size, terminals: terminalOwners.size, connections: connections.length,
      groups: groupIds.size, framedGroups: manifest.groups.filter(g => g.frame).length,
      internalConnections: internalConnections.length, externalConnections: externalConnections.length,
      duplicateViewChoices: decisions.size,
      modelSha256, topologySha256,
      baselineFileSha256: sha256(baselineBytes),
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = JSON.parse(readFileSync(baselineUrl, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const result = validateAuthoredOwnership(model, manifest);
  console.log(JSON.stringify(result.summary, null, 2));
}
