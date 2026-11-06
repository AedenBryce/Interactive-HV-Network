import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer, transformWithOxc } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Static, vector review exports of the real authored geometry and baseline
// session. These are diagram exports, not browser screenshots or field records.
const file = process.argv[2] ?? 'src/models/site/authored-network.json';
const output = 'docs/review/hv-layout';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [schematic, ownership] = await Promise.all([read(file), read('src/models/site/authored-ownership.json')]);
const model = await read(ownership.baselineModelPath);
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
// Vite's development JSX SSR resolver misreads this Windows workspace's encoded
// spaces when externalising React. Transpile a temporary mirror of the unchanged
// symbol modules with Vite's own transformer; Node resolves React itself.
const mirrorRoot = resolve('tmp/authored-review-runtime'); const mirrored = new Set();
async function symbolModule(source) {
  const target = resolve(mirrorRoot, relative(process.cwd(), source)).replace(/\.tsx?$/, '.mjs');
  if (mirrored.has(source)) return target;
  mirrored.add(source);
  let code = (await transformWithOxc(await readFile(source, 'utf8'), source, { jsx: { runtime: 'automatic' } })).code;
  const imports = [...code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)];
  for (const match of imports) {
    const spec = match[1]; let next = resolve(dirname(source), spec);
    if (!extname(next)) {
      try { await access(next + '.ts'); next += '.ts'; } catch { next += '.tsx'; }
    }
    const compiled = await symbolModule(next);
    let replacement = relative(dirname(target), compiled).replaceAll('\\', '/');
    if (!replacement.startsWith('.')) replacement = './' + replacement;
    code = code.replaceAll(`'${spec}'`, `'${replacement}'`).replaceAll(`"${spec}"`, `"${replacement}"`);
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, code);
  return target;
}
try {
  const [{ composeAuthoredSchematic }, { SimulationSession }, { EquipmentSymbol }, appearance, { deviceCard }, crossing] = await Promise.all([
    server.ssrLoadModule('/src/ui/authored-schematic.ts'), server.ssrLoadModule('/src/session/session.ts'),
    symbolModule(resolve('src/ui/EquipmentSymbol.tsx')).then(path => import(pathToFileURL(path).href)), server.ssrLoadModule('/src/ui/equipment-appearance.ts'),
    server.ssrLoadModule('/src/ui/device-card.ts'), server.ssrLoadModule('/src/ui/route-crossing-gaps.ts'),
  ]);
  if (schematic.status !== 'complete') throw new Error(`Refusing incomplete review export: ${schematic.status}`);
  const geometry = composeAuthoredSchematic(model, schematic);
  const snapshot = new SimulationSession(model).snapshot();
  const h = React.createElement;
  // The same glyph JSX uses split primitive title children. Flatten only those
  // text nodes for React's standalone-SVG serializer; glyph paths are untouched.
  const normaliseGlyph = node => {
    if (Array.isArray(node)) return node.map((value, index) => {
      const child = normaliseGlyph(value);
      return React.isValidElement(child) ? React.cloneElement(child, { key: child.key ?? index }) : child;
    });
    if (!React.isValidElement(node)) return node;
    if (typeof node.type === 'function') return React.cloneElement(normaliseGlyph(node.type(node.props)), { key: node.key });
    const children = node.type === 'title' && Array.isArray(node.props.children)
      ? node.props.children.filter(value => value !== null && value !== undefined && value !== false).join('')
      : normaliseGlyph(node.props.children);
    return React.cloneElement(node, undefined, children);
  };
  const css = `
    svg{background:#0b111a;color:#d8e2ef;font-family:Inter,'Segoe UI',sans-serif}
    .wire{fill:none;stroke-linejoin:round;vector-effect:non-scaling-stroke;stroke-width:1.3}
    .wire.connected{stroke:#39ff14}.wire.disconnected{stroke:#ff3b3b}.wire.conflict{stroke:#b93838}
    .canvas-area rect{fill:#111c29;fill-opacity:.62;stroke:#526a82;vector-effect:non-scaling-stroke;stroke-width:1}
    .canvas-area text{fill:#c4d5e6;font-weight:600;paint-order:stroke;stroke:#0b111a;stroke-width:5;vector-effect:non-scaling-stroke}
    .device-card{fill:#101b27;stroke:#486079;stroke-width:1.5}.label-leader{fill:none;stroke:#637d96;stroke-width:1.5}
    .equipment-symbol{color:#d8e2ef}.equipment-lead,.equipment-earth,.rack-out-marks{fill:none;stroke:currentColor;stroke-width:3;stroke-linejoin:round}
    .equipment-symbol path,.equipment-symbol circle,.equipment-symbol rect{vector-effect:non-scaling-stroke;stroke-width:1.3}
    .motor-symbol circle,.drive-symbol rect,.drive-symbol path,.fuse-symbol rect,.fuse-symbol path{fill:#101b27;stroke:currentColor;stroke-width:3}
    .drive-symbol path,.fuse-symbol path{fill:none}.motor-symbol text{fill:currentColor;font-size:30px;font-weight:600}.drive-symbol text{fill:currentColor;font-size:15px}
    .asset-label rect{fill:#0b111a}.asset-label.card-label rect{fill:transparent}.asset-label text{fill:#d8e2ef;font-size:32px;font-weight:600}
    .asset-label text.position-label{fill:#9baec5;font-size:26px}.winding-labels text{fill:#bed0e3;font-size:20px}
    .overview .device-card,.overview .label-leader{display:none}.overview .wire{stroke-width:.65}
  `;
  const moduleBounds = m => {
    const points = [...Object.values(m.layout.assets), ...Object.values(m.layout.terminals)];
    const xs = points.map(p => p[0]); const ys = points.map(p => p[1]);
    for (const label of Object.values(m.labels)) { xs.push(label.x, label.x + label.width); ys.push(label.y, label.y + label.height); }
    if (m.frame) { xs.push(m.frame[0], m.frame[0] + m.frame[2]); ys.push(m.frame[1], m.frame[1] + m.frame[3]); }
    return [Math.min(...xs) + m.origin[0], Math.min(...ys) + m.origin[1], Math.max(...xs) + m.origin[0], Math.max(...ys) + m.origin[1]];
  };
  const union = ids => {
    const selected = schematic.modules.filter(m => ids.includes(m.id)).map(moduleBounds);
    if (selected.length !== ids.length) throw new Error(`Missing export group in ${ids.join(', ')}`);
    const x = Math.min(...selected.map(b => b[0])) - 180; const y = Math.min(...selected.map(b => b[1])) - 180;
    return [x, y, Math.max(...selected.map(b => b[2])) - x + 180, Math.max(...selected.map(b => b[3])) - y + 180];
  };
  const exports = [
    { id: 'overview', label: 'Complete network — authored baseline', bounds: geometry.view.bounds, width: 3000, overview: true },
    { id: 'sw411', label: 'SW411 switchgear — authored baseline', bounds: union(['sw411/overview']), width: 3600 },
    { id: 'sw426', label: 'SW426 switchroom — authored baseline', bounds: union(['desands/hv']), width: 4800 },
    { id: 'tf04-rm420', label: 'TF04 to RM420 — authored baseline', bounds: union(ownership.groups.filter(m => m.placementFamily === 'tf04-rm420-outer-column').map(m => m.id)), width: 2600 },
    { id: 'sw505', label: 'SW505 drives — authored baseline', bounds: union(['stockpile/wet-hv', 'stockpile/lv-dual-windings', 'stockpile/mv-drives']), width: 4800 },
  ];
  await mkdir(output, { recursive: true });
  const manifest = [];
  for (const item of exports) {
    const [x, y, w, height] = item.bounds; const scale = item.width / w;
    const fragments = crossing.separateVisualCrossings(model.connections, geometry.routes, crossing.crossingGapWidthForScale(scale));
    const children = [h('title', { key: 'title' }, `${item.label}. Educational source connectivity model; no live equipment status.`), h('style', { key: 'style' }, css), h('rect', { key: 'background', x, y, width: w, height, fill: '#0b111a' })];
    for (const panel of geometry.panels) {
      const fontSize = Math.min(16 / scale, panel.width / Math.max(1, panel.title.length * .62));
      children.push(h('g', { key: `panel:${panel.id}`, className: 'canvas-area', 'data-group-id': panel.id }, h('rect', { x: panel.x, y: panel.y, width: panel.width, height: panel.height, rx: 8 }), h('text', { x: panel.x + 18, y: panel.y + Math.max(34, fontSize * 1.35), fontSize }, panel.title)));
    }
    for (const link of model.connections) {
      const result = snapshot.connectionResults[link.id];
      const conflict = snapshot.conflicts.some(c => c.connectionIds.includes(link.id));
      children.push(h('g', { key: link.id, 'data-connection-id': link.id }, h('title', null, `${link.id}; source ${result.sourceStatus}; earth ${result.earthStatus}`), ...(fragments.get(link.id) ?? [geometry.routes.get(link.id)]).map((points, index) => h('polyline', { key: index, points: points.map(p => p.join(',')).join(' '), className: `wire ${result.sourceStatus === 'connected' ? 'connected' : 'disconnected'}${conflict ? ' conflict' : ''}` }))));
    }
    for (const asset of geometry.assets.filter(a => !geometry.hiddenIds.has(a.id))) {
      const [ax, ay] = geometry.view.layout.assets[asset.id]; const label = geometry.labels.get(asset.id); const state = snapshot.devices[asset.id];
      const card = appearance.hasDeviceCard(asset);
      const parts = [h('title', { key: 'title' }, `${asset.id} — ${asset.label}`)];
      if (card) parts.push(h('rect', { key: 'card', className: 'device-card', ...deviceCard(asset, [ax, ay], label), rx: 6 }));
      else parts.push(h('path', { key: 'leader', className: 'label-leader', d: geometry.inlineIds.has(asset.id) ? label.x > ax && label.y + label.height < ay - 38 ? `M0 -38 V${label.y + label.height - ay} H${label.x - ax}` : `M-10 0 H${label.x - ax + label.width + 6}` : `M45 0 H${label.x - ax - 6}` }));
      parts.push(normaliseGlyph(h(EquipmentSymbol, { key: 'symbol', asset, state, layout: geometry.view.layout, inline: geometry.inlineIds.has(asset.id) })));
      if (appearance.isDrive(asset)) parts.push(h('g', { key: 'windings', className: 'winding-labels' }, h('text', { x: -45, y: -110, textAnchor: 'end' }, /ac-star$/.test(asset.terminals[0]) ? 'Y' : 'D'), h('text', { x: 45, y: -110 }, /ac-star$/.test(asset.terminals[0]) ? 'D' : 'Y')));
      children.push(h('g', { key: `asset:${asset.id}`, 'data-asset-id': asset.id, transform: `translate(${ax},${ay})` }, ...parts));
      if (!item.overview && label.width > 0) children.push(h('g', { key: `label:${asset.id}`, className: `asset-label${card ? ' card-label' : ''}` }, h('rect', { x: label.x, y: label.y, width: label.width, height: label.height, rx: 4 }), h('text', { x: label.x + label.width / 2, y: label.y + 33, textAnchor: 'middle' }, ...label.lines.map((line, index) => h('tspan', { key: index, x: label.x + label.width / 2, dy: index ? 35 : 0 }, line))), state !== undefined ? h('text', { className: 'position-label', x: label.x + label.width / 2, y: label.y + label.height - 8, textAnchor: 'middle' }, typeof state === 'object' && state !== null ? `${state.contact ?? '?'} · Rack ${state.racking ?? '?'}` : state ?? 'Unconfirmed') : null));
    }
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: item.width, height: Math.round(height * scale), viewBox: item.bounds.join(' '), className: item.overview ? 'overview' : 'detail', role: 'img', 'aria-label': item.label }, ...children)) + '\n';
    const path = `${output}/${item.id}.svg`; await writeFile(path, svg);
    manifest.push({ path, label: item.label, viewBox: item.bounds, assets: model.assets.length, connections: model.connections.length, sha256: createHash('sha256').update(svg).digest('hex') });
  }
  await writeFile(`${output}/manifest.json`, JSON.stringify({ source: file, sourceSha256: createHash('sha256').update(await readFile(file)).digest('hex'), layoutRevision: schematic.layoutRevision, modelId: model.id, modelVersion: model.version, modelFingerprint: schematic.modelFingerprint, topologyFingerprint: schematic.topologyFingerprint, state: 'Agreed model baseline; diagram exports, not browser screenshots.', images: manifest }, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally { await server.close(); }
