import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const directory = 'tmp/hv-layout-baseline-20261105';
if (existsSync('docs/goals/hv-layout-baseline.json')) throw new Error('Frozen baseline already exists. Do not overwrite it; capture any new baseline separately.');
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { currentNetworkModel: model } = await server.ssrLoadModule('/src/models/site/current-network.ts');
  const assets = model.assets.map(asset => ({ id: asset.id, terminals: [...asset.terminals] })).sort((a, b) => a.id.localeCompare(b.id));
  const connections = model.connections.map(({ id, from, to }) => ({ id, from, to })).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(assets.map(asset => asset.id)).size !== assets.length) throw new Error('Duplicate asset ID');
  const terminals = assets.flatMap(asset => asset.terminals);
  if (new Set(terminals).size !== terminals.length) throw new Error('Duplicate terminal ownership');
  for (const link of connections) if (!terminals.includes(link.from) || !terminals.includes(link.to)) throw new Error(`Unknown terminal in ${link.id}`);
  const files = JSON.parse(await readFile(`${directory}/files.json`, 'utf8').then(text => text.replace(/^\uFEFF/, '')));
  const record = {
    revision: (await readFile(`${directory}/head.txt`, 'utf8')).trim(),
    sourceSnapshot: directory,
    sourceManifestSha256: hash(files),
    modelId: model.id, modelVersion: model.version,
    modelSha256: hash(model), topologySha256: hash({ assets, connections }),
    assetCount: assets.length, connectionCount: connections.length, terminalCount: terminals.length,
    assets, connections,
  };
  await writeFile(`${directory}/model.json`, JSON.stringify(model, null, 2));
  await writeFile('docs/goals/hv-layout-baseline.json', JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ ...record, assets: undefined, connections: undefined }, null, 2));
} finally { await server.close(); }
