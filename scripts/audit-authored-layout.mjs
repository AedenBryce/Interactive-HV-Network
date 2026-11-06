import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { validateAuthoredOwnership } from './validate-authored-ownership.mjs';

// Read-only audit of authored geometry. Never invokes the legacy layout/routing solver.
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const local = await read('src/models/site/authored-local-modules.json');
const placed = await read('src/models/site/authored-placed-modules.json');
const manifest = await read('src/models/site/authored-ownership.json');
const model = await read(manifest.baselineModelPath);
const ownership = validateAuthoredOwnership(model, manifest);
const byId = new Map(model.assets.map(a => [a.id, a]));
const links = new Map(model.connections.map(c => [c.id, c]));
const coverage = new Map(local.sourceCoverage.map(c => [c.groupId, c]));
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const pointOn = (p, a, b) => a[0] === b[0] ? p[0] === a[0] && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]) : a[1] === b[1] && p[1] === a[1] && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]);
const shift = (p, o) => [p[0] + o[0], p[1] + o[1]];
const boxShift = (b, o) => ({ ...b, x: b.x + o[0], y: b.y + o[1] });
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const segmentBox = (a, b, box) => {
  const v = a[0] === b[0]; const axis = v ? 1 : 0; const cross = v ? box.x : box.y; const size = v ? box.width : box.height;
  if ((v ? a[0] : a[1]) < cross || (v ? a[0] : a[1]) > cross + size) return undefined;
  const low = Math.max(Math.min(a[axis], b[axis]), v ? box.y : box.x);
  const high = Math.min(Math.max(a[axis], b[axis]), v ? box.y + box.height : box.x + box.width);
  if (low > high) return undefined;
  const p = value => v ? [a[0], value] : [value, a[1]];
  const boundaryOnly = low === high || (v ? a[0] : a[1]) === cross || (v ? a[0] : a[1]) === cross + size;
  return { interval: [p(low), p(high)], length: high - low, boundaryOnly, relation: boundaryOnly ? 'boundary-touch' : 'interior-cut' };
};
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: { local: 'src/models/site/authored-local-modules.json', placed: 'src/models/site/authored-placed-modules.json', baseline: manifest.baselineModelPath }, preservation: ownership.summary, scopes: [] };
try {
  const { validateDiagramGeometry } = await server.ssrLoadModule('/src/ui/geometry-validator.ts');
  const { equipmentPorts, orthogonalPoints } = await server.ssrLoadModule('/src/ui/diagram-geometry.ts');
  const { composeAuthoredSchematic } = await server.ssrLoadModule('/src/ui/authored-schematic.ts');
  const audit = (name, modules, externalRoutes = {}, global = false) => {
    const findings = []; const add = (type, detail, disposition = 'review-required') => findings.push({ type, disposition, ...detail });
    const layout = { assets: {}, terminals: {}, rotations: {}, busSpans: {} }; const boxes = []; const leads = []; const routes = []; const owners = new Map();
    for (const module of modules) {
      const o = global ? module.origin : [0, 0]; const c = coverage.get(module.id);
      if (!c) { add('missing-measurements', { groupId: module.id }); continue; }
      if (global) {
        const source = local.modules.find(m => m.id === module.id);
        if (!source || JSON.stringify({ ...module, origin: [0, 0] }) !== JSON.stringify({ ...source, origin: [0, 0] })) add('full-artifact-mutated-local-payload', { groupId: module.id });
      }
      for (const id of module.assetIds) {
        if (owners.has(id)) add('duplicate-asset-owner', { assetId: id }); owners.set(id, module.id);
        if (!module.layout.assets[id]) { add('missing-anchor', { assetId: id }); continue; }
        layout.assets[id] = shift(module.layout.assets[id], o);
        layout.rotations[id] = module.layout.rotations?.[id] ?? 0; layout.busSpans[id] = module.layout.busSpans?.[id];
        for (const t of byId.get(id)?.terminals ?? []) {
          if (!module.layout.terminals[t]) add('missing-terminal', { assetId: id, terminal: t });
          else layout.terminals[t] = shift(module.layout.terminals[t], o);
        }
        if (!module.hiddenAssetIds?.includes(id)) {
          if (!c.symbolBoxes[id]) add('missing-symbol-measurement', { groupId: module.id, assetId: id });
          if (!module.labels[id]) add('missing-card', { groupId: module.id, assetId: id });
        }
      }
      for (const [id, b] of Object.entries(c.symbolBoxes)) boxes.push({ ...boxShift(b, o), id, groupId: module.id, kind: byId.get(id).kind === 'bus' ? 'busbar' : 'symbol' });
      for (const [id, b] of Object.entries(module.labels)) {
        const asset = byId.get(id);
        const hiddenHandoff = asset?.kind === 'interface' && asset.terminals.length === 1 && !asset.positions.length && !asset.conductivePairs.length && id.includes(':interface') && model.connections.filter(link => link.from === asset.terminals[0] || link.to === asset.terminals[0]).length === 2;
        if (!module.hiddenAssetIds?.includes(id) && !hiddenHandoff) boxes.push({ ...boxShift(b, o), id, groupId: module.id, kind: 'card' });
      }
      for (const l of c.leadSegments) leads.push({ ...l, from: shift(l.from, o), to: shift(l.to, o), groupId: module.id });
      for (const [id, points] of Object.entries(module.routes)) routes.push({ id, points: points.map(p => shift(p, o)), terminals: [links.get(id)?.from, links.get(id)?.to], groupId: module.id });
      // Leads are independently rebuilt from the renderer port helper, rather than trusting a zero finding count.
      for (const id of module.assetIds.filter(id => byId.get(id)?.kind !== 'bus' && !module.hiddenAssetIds?.includes(id))) {
        const asset = byId.get(id); const { ports } = equipmentPorts(asset, module.layout); const anchor = module.layout.assets[id];
        ports.slice(0, asset.terminals.length).forEach((p, i) => {
          const terminal = asset.terminals[i]; const points = orthogonalPoints([module.layout.terminals[terminal], shift(p, anchor)]);
          const expected = points.slice(1).map((to, j) => ({ assetId: id, terminal, from: points[j], to }));
          const measured = c.leadSegments.filter(l => l.assetId === id && l.terminal === terminal);
          const near = (p, q) => p.every((v, axis) => Math.abs(v - q[axis]) < 1e-8);
          if (expected.length !== measured.length || expected.some((l, j) => !near(l.from, measured[j].from) || !near(l.to, measured[j].to))) add('lead-measurement-mismatch', { groupId: module.id, assetId: id, terminal, expected, measured });
        });
      }
    }
    for (const [id, points] of Object.entries(externalRoutes)) routes.push({ id, points, terminals: [links.get(id)?.from, links.get(id)?.to], groupId: 'external' });
    const seenRoutes = new Set(); const expectedLinks = global ? model.connections : ownership.internalConnections;
    const onBus = (id, p) => {
      const a = byId.get(id); const center = layout.assets[id]; if (a?.kind !== 'bus' || !center) return false;
      const axis = Math.abs(layout.rotations[id] % 180) === 90 ? 0 : 1;
      return p[1 - axis] === center[1 - axis] && Math.abs(p[axis] - center[axis]) <= layout.busSpans[id] / 2;
    };
    for (const r of routes) {
      if (seenRoutes.has(r.id)) add('duplicate-route', { routeId: r.id }); seenRoutes.add(r.id);
      const link = links.get(r.id); if (!link) { add('unknown-route', { routeId: r.id }); continue; }
      if (r.points.length < 2 || r.points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) { add('invalid-route', { routeId: r.id }); continue; }
      for (const [t, p] of [[link.from, r.points[0]], [link.to, r.points.at(-1)]]) if (!same(layout.terminals[t], p) && !onBus(ownership.terminalAssetIds.get(t), p)) add('detached-endpoint', { routeId: r.id, terminal: t, point: p, terminalPoint: layout.terminals[t] });
    }
    for (const link of expectedLinks) if (!seenRoutes.has(link.id)) add('missing-route', { routeId: link.id });
    for (const asset of model.assets) if (!owners.has(asset.id)) add('missing-asset', { assetId: asset.id });
    // Model terminal points are electrical identities, including the opposite
    // terminal of an endpoint asset. Endpoint asset membership is no waiver.
    for (const r of routes) for (const [terminal, point] of Object.entries(layout.terminals)) {
      const assetId = ownership.terminalAssetIds.get(terminal);
      if (!global && owners.get(assetId) !== r.groupId) continue;
      const atOwnEndpoint = (terminal === r.terminals[0] && same(point, r.points[0])) || (terminal === r.terminals[1] && same(point, r.points.at(-1)));
      if (atOwnEndpoint) continue;
      const segmentIndices = r.points.slice(1).flatMap((to, i) => !same(r.points[i], to) && pointOn(point, r.points[i], to) ? [i] : []);
      if (!segmentIndices.length) continue;
      const ownBus = r.terminals.some(t => ownership.terminalAssetIds.get(t) === assetId) && onBus(assetId, point);
      const interior = !same(point, r.points[0]) && !same(point, r.points.at(-1));
      add(interior ? 'terminal-on-route-interior' : 'other-terminal-at-route-endpoint', { routeId: r.id, terminal, terminalAssetId: assetId, routeEndpointTerminals: r.terminals, point, segmentIndices }, ownBus ? 'allowed-own-busbar-axis' : 'review-required');
    }
    const routeMap = new Map(routes.map(r => [r.id, r]));
    const physicalShared = (a, b, interval) => {
      const common = a.terminals.filter(t => b.terminals.includes(t));
      return common.find(t => {
        const oriented = r => r.terminals[0] === t ? [...r.points] : [...r.points].reverse();
        const pa = oriented(a).filter((p, i, all) => !i || !same(p, all[i - 1]));
        const pb = oriented(b).filter((p, i, all) => !i || !same(p, all[i - 1]));
        // Different feeder taps on the same explicitly modeled bar meet physically
        // through that bar; this does not authorize off-bar common-terminal contacts.
        const assetId = ownership.terminalAssetIds.get(t);
        if (onBus(assetId, pa[0]) && onBus(assetId, pb[0]) && interval.every(p => onBus(assetId, p))) return true;
        if (!same(pa[0], pb[0]) || !(same(layout.terminals[t], pa[0]) || onBus(ownership.terminalAssetIds.get(t), pa[0]))) return false;
        const shared = []; let current = pa[0]; let ia = 1; let ib = 1;
        while (ia < pa.length && ib < pb.length) {
          const ea = pa[ia]; const eb = pb[ib];
          const da = ea.map((v, axis) => Math.sign(v - current[axis])); const db = eb.map((v, axis) => Math.sign(v - current[axis]));
          if (!same(da, db)) break;
          const dist = p => Math.abs(p[0] - current[0]) + Math.abs(p[1] - current[1]);
          const next = dist(ea) <= dist(eb) ? ea : eb; shared.push([current, next]); current = next;
          if (same(current, ea)) ia++; if (same(current, eb)) ib++;
        }
        return interval.every(p => same(p, pa[0]) || shared.some(([from, to]) => pointOn(p, from, to)));
      });
    };
    // In local mode each module is a separate coordinate space.
    const batches = global ? [routes] : modules.map(m => routes.filter(r => r.groupId === m.id));
    for (const batch of batches) {
      for (const f of validateDiagramGeometry({ routes: batch, roomFrames: [], terminalPoints: layout.terminals })) {
        let disposition = f.type === 'route-crossing' ? 'proper-crossing-visual-review' : 'review-required'; let allowanceTerminal;
        if (f.routeIds && f.routeIds[0] !== f.routeIds[1]) {
          const a = routeMap.get(f.routeIds[0]); const b = routeMap.get(f.routeIds[1]);
          allowanceTerminal = physicalShared(a, b, f.overlap ?? (f.point ? [f.point] : []));
          if (allowanceTerminal) disposition = 'allowed-physical-common-terminal';
        }
        add(f.type, { ...f, ...(allowanceTerminal ? { allowanceTerminal } : {}) }, disposition);
      }
      // The shared validator omits coincident segment endpoints. Detect all such contacts explicitly.
      for (let i = 0; i < batch.length; i++) for (const b of batch.slice(i + 1)) {
        const a = batch[i]; const contacts = new Map();
        for (const p of a.points) for (const q of b.points) if (same(p, q)) contacts.set(p.join(','), p);
        for (const point of contacts.values()) {
          const terminal = physicalShared(a, b, [point]);
          add('route-vertex-contact', { routeIds: [a.id, b.id], point, ...(terminal ? { allowanceTerminal: terminal } : {}) }, terminal ? 'allowed-physical-common-terminal' : 'review-required');
        }
      }
    }
    for (const r of routes) for (let i = 1; i < r.points.length; i++) {
      const from = r.points[i - 1]; const to = r.points[i]; if (same(from, to)) continue;
      for (const box of boxes) {
        if (!global && box.groupId !== r.groupId) continue;
        const contact = segmentBox(from, to, box); if (!contact) continue;
        const ownTerminal = r.terminals.find(t => ownership.terminalAssetIds.get(t) === box.id);
        const endpoint = ownTerminal && (r.terminals[0] === ownTerminal ? r.points[0] : r.points.at(-1));
        // A cable's own bus tap is a contact with the thick painted bus envelope.
        const ownEnd = ownTerminal && (same(from, endpoint) || same(to, endpoint));
        const allowedBus = box.kind === 'busbar' && ownEnd && onBus(box.id, endpoint);
        const inside = p => p[0] >= box.x && p[0] <= box.x + box.width && p[1] >= box.y && p[1] <= box.y + box.height;
        // A marker terminal may be at its center. Bends before the cable first
        // exits that same marker remain its physical terminal attachment.
        const oriented = ownTerminal && r.terminals[0] !== ownTerminal ? [...r.points].reverse() : r.points;
        const orientedIndex = ownTerminal && r.terminals[0] !== ownTerminal ? r.points.length - 1 - i : i - 1;
        const insidePrefix = ownTerminal && inside(endpoint) && oriented.slice(0, orientedIndex + 1).every(inside);
        const allowedSymbol = box.kind === 'symbol' && ((ownEnd && contact.interval.some(p => same(p, endpoint))) || insidePrefix);
        add(`route-${box.kind}`, { routeId: r.id, segmentIndex: i - 1, assetId: box.id, endpointAsset: !!ownTerminal, box: { x: box.x, y: box.y, width: box.width, height: box.height }, ...contact }, allowedBus ? 'allowed-own-bus-tap' : allowedSymbol ? 'allowed-own-terminal-envelope' : contact.boundaryOnly ? 'boundary-touch-review' : ownTerminal && box.kind === 'symbol' ? 'endpoint-asset-envelope-review' : 'review-required');
      }
    }
    for (const lead of leads) {
      if (same(lead.from, lead.to)) continue;
      for (const box of boxes) {
        if ((!global && box.groupId !== lead.groupId) || box.id === lead.assetId && box.kind !== 'card') continue;
        const contact = segmentBox(lead.from, lead.to, box); if (contact) add(`lead-${box.kind}`, { lead, assetId: box.id, ...contact }, contact.boundaryOnly ? 'boundary-touch-review' : 'review-required');
      }
    }
    for (let i = 0; i < boxes.length; i++) for (const b of boxes.slice(i + 1)) {
      const a = boxes[i]; if ((!global && a.groupId !== b.groupId) || !overlap(a, b)) continue;
      add('box-overlap', { boxes: [a, b] });
    }
    const counts = key => Object.fromEntries([...new Set(findings.map(f => f[key]))].sort().map(value => [value, findings.filter(f => f[key] === value).length]));
    return { name, coordinateSpace: global ? 'composed global' : 'independent module local', checks: { assets: owners.size, expectedAssets: model.assets.length, routes: seenRoutes.size, expectedRoutes: expectedLinks.length, endpointChecks: routes.length * 2, boxes: boxes.length, leads: leads.length }, summary: { byType: counts('type'), byDisposition: counts('disposition'), hardFaultCount: findings.filter(f => f.disposition === 'review-required' || f.disposition === 'endpoint-asset-envelope-review').length, boundaryTouchReviewCount: findings.filter(f => f.disposition === 'boundary-touch-review').length, properCrossingVisualReviewCount: findings.filter(f => f.disposition === 'proper-crossing-visual-review').length, reviewRequired: findings.filter(f => f.disposition.endsWith('review') || f.disposition === 'review-required').length, unrelatedInteriorCuts: findings.filter(f => f.relation === 'interior-cut' && !f.endpointAsset && f.disposition === 'review-required').length }, findings };
  };
  report.scopes.push(audit('local-modules', local.modules));
  // Validate rigid placement: the local payload must be preserved exactly apart from origin.
  const rigidFindings = [];
  for (const m of placed.modules) {
    const source = local.modules.find(x => x.id === m.id);
    if (!source || JSON.stringify({ ...m, origin: [0, 0] }) !== JSON.stringify({ ...source, origin: [0, 0] })) rigidFindings.push({ type: 'placement-mutated-local-payload', groupId: m.id });
  }
  report.placementPreservation = { localModules: local.modules.length, placedModules: placed.modules.length, findings: rigidFindings };
  if (process.argv.includes('--full')) try {
    const artifactPath = process.argv.find(arg => arg.startsWith('--artifact='))?.slice('--artifact='.length) ?? 'src/models/site/authored-network.json';
    const full = await read(artifactPath);
    report.fullFingerprint = { model: full.modelFingerprint, expectedModel: ownership.summary.modelSha256, topology: full.topologyFingerprint, expectedTopology: ownership.summary.topologySha256, matches: full.modelFingerprint === ownership.summary.modelSha256 && full.topologyFingerprint === ownership.summary.topologySha256 };
    if (!report.fullFingerprint.matches) throw new Error('Authored artifact model/topology fingerprint differs from frozen baseline.');
    const composed = composeAuthoredSchematic(model, full);
    report.fullComposition = { status: 'verified', assets: composed.assets.length, routes: composed.routes.size };
    report.scopes.push(audit('full-authored-network', full.modules, full.externalRoutes, true));
  } catch (error) {
    if (error.code === 'ENOENT') report.fullComposition = { status: 'unconfirmed', reason: 'Full authored-network.json is not available; external routes and composed geometry have not been audited.' };
    else { report.fullComposition = { status: 'failed', reason: error.message }; process.exitCode = 1; }
  } else report.fullComposition = { status: 'not-audited', reason: 'Local-only invocation. Run with --full after external routing is complete to validate the final artifact through the compositor and audit transformed global geometry.' };
  report.source.sha256 = createHash('sha256').update(JSON.stringify(local)).digest('hex');
  report.status = report.scopes.some(scope => scope.summary.hardFaultCount) || report.placementPreservation.findings.length || report.fullComposition.status === 'failed' ? 'geometry-review-required' : 'geometry-checks-complete-visual-review-pending';
  report.limitations = ['Symbol/body checks use the measured conservative envelopes in sourceCoverage; contact with an envelope is reported and does not prove an SVG ink intersection.', 'Proper route crossings are geometrically distinct from ambiguous contacts but still require visual review of crossing gaps and ring readability. Their count is not a blanket acceptance of routing. A shared terminal ID alone never waives a contact; coincident physical endpoints or an actual common bus axis are required.', 'No room-frame routing policy is inferred or audited. No legacy geometry solver is called.'];
  await mkdir('tmp', { recursive: true });
    const reportPath = process.argv.find(arg => arg.startsWith('--report='))?.slice('--report='.length) ?? 'tmp/authored-geometry-audit.json';
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ scopes: report.scopes.map(({ name, checks, summary }) => ({ name, checks, summary })), placementPreservation: report.placementPreservation, fullComposition: report.fullComposition }, null, 2));
} finally { await server.close(); }
