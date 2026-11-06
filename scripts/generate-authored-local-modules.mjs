import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';

// Development-only source extraction. No global placement or routing solver.
const manifest = JSON.parse(await readFile('src/models/site/authored-ownership.json', 'utf8'));
const modelBytes = await readFile(manifest.baselineModelPath);
const model = JSON.parse(modelBytes);
if (createHash('sha256').update(modelBytes).digest('hex') !== manifest.baselineFileSha256) throw new Error('Frozen source fingerprint differs from ownership manifest.');
const baseline = JSON.parse(await readFile('docs/goals/hv-layout-baseline.json', 'utf8'));
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { labelLines, orthogonalPoints, equipmentPorts, cutsBox } = await server.ssrLoadModule('/src/ui/diagram-geometry.ts');
  const { compactEquipmentLabel, isDrive, isMotor, isFuse } = await server.ssrLoadModule('/src/ui/equipment-appearance.ts');
  const { currentAssetLabel } = await server.ssrLoadModule('/src/ui/review-updates.ts');
  const { threePositionGeometry } = await server.ssrLoadModule('/src/ui/three-position-contacts.ts');
  const { getRemovableMechanism } = await server.ssrLoadModule('/src/session/mechanisms.ts');
  const byId = new Map(model.assets.map(a => [a.id, a]));
  const views = new Map(model.presentation.views.map(v => [v.id, v]));
  const terminalOwner = new Map(model.assets.flatMap(a => a.terminals.map(t => [t, a.id])));
  const groupByAsset = new Map(manifest.groups.flatMap(g => g.assetIds.map(id => [id, g.id])));
  const declaredAssets = manifest.groups.flatMap(g => g.assetIds);
  if (new Set(declaredAssets).size !== declaredAssets.length || declaredAssets.length !== model.assets.length || model.assets.some(a => !groupByAsset.has(a.id))) throw new Error('Ownership does not exactly cover frozen model assets.');
  const scale = 4;
  const padding = 90;
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const missing = [];
  const modules = [];
  const sourceCoverage = [];
  const compactGroupLabel = group => {
    const titles = {
      'station/amr': 'AMR', 'station/iop': 'IOP',
      'western/h3': 'Hopper 3 · HV assembly', 'western/h8': 'Hopper 8 · HV assembly',
      'hopper-10/transformers': 'Hopper 10 · Transformers',
      'cv006/former-hopper10-22': 'CV006 · Former Hopper10 references',
      'mine-camp/mine-overlaps': 'Mine / camp · References',
      'desands/services': 'Desands · Service references',
      'cv006/overhead': 'CV006 · Overhead line', 'cv006/drop-tower': 'CV006 · Drop Tower',
    };
    if (titles[group.id]) return titles[group.id];
    const hopper = group.id.match(/(?:western(?:-supplemental)?\/h|hopper-)(\d+)/)?.[1] ?? group.id.match(/supplemental\/hopper(\d+)/)?.[1];
    const parts = group.label.split(/ · |\n/);
    const identifier = parts.find(part => /\b(?:SW|RM|MC|TF|SS)\d/i.test(part) && !/rev|unconfirmed|candidate|reference|selected|feed confirmed/i.test(part));
    if (hopper) return `Hopper ${hopper} · ${identifier?.replace(/ overview.*| final.*| first.*| primary.*| switchgear.*/i, '') ?? parts.at(-1).replace(/ · .*/, '')}`;
    if (group.id.startsWith('source/')) return parts.slice(0, 2).join(' · ');
    if (group.id === 'sw411/overview') return 'SW411';
    return (identifier ?? parts.slice(0, 2).join(' · ')).replace(/ · (?:drawing|source|other|unresolved).*| · \d{4} rev.*/i, '').replace(/ HV.*$/i, '');
  };
  for (const group of manifest.groups) {
    // IN04 is explicitly a one-terminal source boundary marker, with no device
    // states or conductive pairs. Preserve the model identity/terminal; its
    // marker lies directly on the original earth-branch conductor.
    const hiddenAssetIds = group.id === 'sw411/overview' ? ['sw411:in-04:interface'] : [];
    for (const id of hiddenAssetIds) {
      const asset = byId.get(id);
      if (asset.kind !== 'interface' || asset.terminals.length !== 1 || asset.positions.length || asset.conductivePairs.length || isMotor(asset) || isDrive(asset) || isFuse(asset)) throw new Error(`Cannot hide operational equipment: ${id}`);
    }
    const layout = { assets: {}, terminals: {}, rotations: {}, busSpans: {} };
    const routes = {}; const labels = {}; const selected = new Map(); const sourceViewByAsset = {}; const sourceViewByConnection = {};
    const localFindings = []; const authoredCorrections = [];
    const sourceTransforms = Object.fromEntries(group.sourceViewIds.map(id => [id, { scale, translation: [0, 0] }]));
    // These detail views use separate origins. Their shared bus is one explicit
    // conductor; the two complete phase arrangements occupy distinct tiles.
    if (/^western-supplemental\/h[38]\/mv$/.test(group.id)) {
      const prefix = group.id.slice(0, -3);
      sourceTransforms[`${prefix}/motor-1`].translation = [1200 * scale, 20 * scale];
      sourceTransforms[`${prefix}/motor-2`].translation = [2400 * scale, 20 * scale];
    }
    const transform = (id, p) => p.map((v, axis) => v * scale + sourceTransforms[id].translation[axis]);
    for (const id of group.assetIds) {
      const asset = byId.get(id);
      // A view may retain real full-sheet geometry outside its visible subset.
      // Prefer visible membership, then explicitly listed full-sheet references.
      const candidates = group.sourceViewIds.map(id => views.get(id)).filter(Boolean);
      const source = candidates.find(v => v.assetIds.includes(id) && v.layout.assets[id]) ?? candidates.find(v => v.layout.assets[id]);
      if (!asset || !source) { missing.push({ groupId: group.id, assetId: id, reason: 'Missing listed source anchor' }); continue; }
      selected.set(id, source); sourceViewByAsset[id] = source.id;
      layout.assets[id] = transform(source.id, source.layout.assets[id]);
      layout.rotations[id] = source.layout.rotations?.[id] ?? equipmentPorts(asset, source.layout).rotation;
      for (const terminal of asset.terminals) {
        const p = source.layout.terminals[terminal];
        if (!p) missing.push({ groupId: group.id, terminal, sourceViewId: source.id });
        else layout.terminals[terminal] = transform(source.id, p);
      }
      if (asset.kind === 'bus') layout.busSpans[id] = (source.layout.busSpans?.[id] ?? 60) * scale;
    }
    if (missing.some(item => item.groupId === group.id)) continue;
    if (group.id === 'sw411/overview') {
      const id = 'sw411:in-04:interface';
      const y = transform(selected.get(id).id, [0, 70])[1];
      layout.assets[id][1] = y;
      for (const terminal of byId.get(id).terminals) layout.terminals[terminal][1] = y;
      authoredCorrections.push({ type: 'source-boundary-port', assetId: id, sourceY: 70, reason: 'Align hidden incoming boundary port with other incomer source ports, clear of the earth branch.' });
    }
    const links = model.connections.filter(link => groupByAsset.get(terminalOwner.get(link.from)) === group.id && groupByAsset.get(terminalOwner.get(link.to)) === group.id);
    for (const link of links) {
      const fromId = terminalOwner.get(link.from); const toId = terminalOwner.get(link.to);
      const fromSource = selected.get(fromId); const toSource = selected.get(toId);
      const source = fromSource === toSource ? fromSource
        : byId.get(fromId).kind === 'bus' ? toSource
          : byId.get(toId).kind === 'bus' ? fromSource
            : group.sourceViewIds.map(id => views.get(id)).find(v => v?.layout.terminals[link.from] && v.layout.terminals[link.to]);
      if (!source) { missing.push({ groupId: group.id, connectionId: link.id, reason: 'No listed view contains both terminal coordinates' }); continue; }
      let from = layout.terminals[link.from]; let to = layout.terminals[link.to];
      // Shared bus endpoints use the selected source tile's bus coordinate as
      // an explicit tap. Non-bus endpoints always use their actual local owner.
      if (byId.get(fromId).kind === 'bus' && source.layout.terminals[link.from]) from = transform(source.id, source.layout.terminals[link.from]);
      if (byId.get(toId).kind === 'bus' && source.layout.terminals[link.to]) to = transform(source.id, source.layout.terminals[link.to]);
      const bends = (source.layout.bends?.[link.id] ?? []).map(p => transform(source.id, p));
      let points = orthogonalPoints([from, ...bends, to]);
      // A bus-axis lead belongs to the bar itself, so terminate the cable at
      // its distinct tap rather than drawing parallel copies over the bar.
      for (const [id, end] of [[fromId, 'start'], [toId, 'end']]) if (byId.get(id).kind === 'bus') {
        const horizontal = Math.abs(layout.rotations[id] % 180) === 90;
        const axis = horizontal ? 1 : 0;
        if (end === 'start') while (points.length > 2 && points[0][axis] === points[1][axis]) points.shift();
        else while (points.length > 2 && points.at(-1)[axis] === points.at(-2)[axis]) points.pop();
      }
      if (points.length === 1) points = [points[0], [...points[0]]];
      if (link.id === 'sw411:in-04:interface-link') points = orthogonalPoints([layout.terminals[link.from], layout.terminals[link.to]]);
      const toAsset = byId.get(toId);
      if (toAsset.kind === 'earth-switch' && link.to === toAsset.terminals[0]) {
        const other = layout.terminals[toAsset.terminals[1]];
        const bypassesOther = points.some((p, i) => i && (p[0] === points[i - 1][0]
          ? other[0] === p[0] && other[1] > Math.min(p[1], points[i - 1][1]) && other[1] < Math.max(p[1], points[i - 1][1])
          : other[1] === p[1] && other[0] > Math.min(p[0], points[i - 1][0]) && other[0] < Math.max(p[0], points[i - 1][0])));
        if (bypassesOther) {
          const start = points[0]; const target = layout.terminals[link.to];
          const approachY = target[1] - 160;
          points = orthogonalPoints([start, [start[0], approachY], [target[0], approachY], target]);
          authoredCorrections.push({ type: 'earth-input-approach', connectionId: link.id, reason: 'Approach earth input from above on its own terminal column, avoiding the opposite terminal and switch body.' });
        }
      }
      if (link.id === 'cv006:recloser-abs49-40') {
        // The default horizontal-first elbow reaches ABS49-40:a through its
        // opposite :b terminal and the switch body. Turn in the open midpoint
        // channel, then approach :a horizontally on its own terminal row.
        const channelX = (from[0] + to[0]) / 2;
        points = orthogonalPoints([from, [channelX, from[1]], [channelX, to[1]], to]);
        authoredCorrections.push({ type: 'reserved-local-terminal-approach', connectionId: link.id, reason: 'Approach ABS49-40:a without passing through its opposite :b terminal or symbol.' });
      }
      if (/^wh:h[179]:mc41[789]:in-earth:branch$/.test(link.id) || /^wh:h7:rm418:sw0[12]:es:branch$/.test(link.id)) {
        points = orthogonalPoints([from, [to[0], from[1]], to]);
        authoredCorrections.push({ type: 'earth-cable-side-departure', connectionId: link.id, reason: 'Leave the cable-side terminal sideways, clear of its source switch body, before entering the earth input column.' });
      }
      if (['cv006:pole49-abs49-1', 'cv006:pole49-39-recloser'].includes(link.id)) {
        const channelX = (from[0] + to[0]) / 2;
        points = orthogonalPoints([from, [channelX, from[1]], [channelX, to[1]], to]);
        authoredCorrections.push({ type: 'overhead-input-approach', connectionId: link.id, reason: 'Turn before the destination switch, then approach its input on the terminal row without cutting the body.' });
      }
      if (link.id === 'line33:hopper-286-fused-abs-output') {
        points = orthogonalPoints([from, [from[0], to[1]], to]);
        authoredCorrections.push({ type: 'overhead-output-departure', connectionId: link.id, reason: 'Depart along the output terminal column instead of returning through the ABS symbol center.' });
      }
      if (/^wh:h[179]:mc41[789]a:supply$/.test(link.id) || link.id === 'owner:tf712-sw712-incoming') {
        // These recorded bends return up the final LV bar's axis. Replace that
        // stale sheet detour with one reserved midpoint channel from the actual
        // local endpoints, entering the incomer from above its final bus.
        const channelX = (from[0] + to[0]) / 2;
        const channelY = Math.min(from[1], to[1]) - 320;
        points = orthogonalPoints([from, [channelX, from[1]], [channelX, channelY], [to[0], channelY], to]);
        authoredCorrections.push({ type: 'reserved-local-supply-channel', connectionId: link.id, channelX, channelY, reason: 'Original source bends ran through the unrelated final LV bus.' });
      }
      routes[link.id] = points; sourceViewByConnection[link.id] = source.id;
      if (fromSource !== toSource && byId.get(fromId).kind !== 'bus' && byId.get(toId).kind !== 'bus' && !authoredCorrections.some(c => c.connectionId === link.id)) localFindings.push({ type: 'cross-source-route-review', connectionId: link.id, sourceViewId: source.id });
    }
    // Measure one bar enclosing every explicit tap, respecting renderer rotation.
    for (const id of group.assetIds.filter(id => byId.get(id).kind === 'bus')) {
      const horizontal = Math.abs(layout.rotations[id] % 180) === 90; const axis = horizontal ? 0 : 1; const other = 1 - axis;
      const center = layout.assets[id];
      const taps = links.flatMap(link => terminalOwner.get(link.from) === id ? [routes[link.id]?.[0]] : terminalOwner.get(link.to) === id ? [routes[link.id]?.at(-1)] : []).filter(Boolean);
      for (const tap of taps) if (tap[other] !== center[other]) localFindings.push({ type: 'off-axis-bus-tap', assetId: id, point: tap });
      const values = [center[axis] - layout.busSpans[id] / 2, center[axis] + layout.busSpans[id] / 2, ...taps.map(p => p[axis])];
      const low = Math.min(...values) - 30; const high = Math.max(...values) + 30;
      center[axis] = (low + high) / 2; layout.busSpans[id] = high - low;
      for (const terminal of byId.get(id).terminals) layout.terminals[terminal] = [...center];
    }
    const symbolBoxes = {};
    const leadSegments = [];
    for (const id of group.assetIds) {
      const asset = byId.get(id); const source = selected.get(id); const [x, y] = layout.assets[id];
      if (hiddenAssetIds.includes(id)) continue;
      const state = !!(asset.positions.length || getRemovableMechanism(asset));
      const lines = labelLines(compactEquipmentLabel(asset, currentAssetLabel(model, asset)));
      const width = Math.max(state ? 185 : 0, ...lines.map(line => line.length * 15 + 20));
      const height = lines.length * 35 + 12 + (state ? 32 : 0);
      const offset = source.layout.labelOffsets?.[id] ?? [0, 65];
      labels[id] = { x: x + offset[0] * scale - width / 2, y: y + offset[1] * scale - height / 2, width, height, lines };
      const { rotation, ports } = equipmentPorts(asset, layout);
      let relative = asset.kind === 'bus' ? (Math.abs(layout.rotations[id] % 180) === 90 ? [-layout.busSpans[id] / 2, -3, layout.busSpans[id], 6] : [-3, -layout.busSpans[id] / 2, 6, layout.busSpans[id]])
        : asset.kind === 'earth-switch' ? [-32, -32, 54, 73]
          : isDrive(asset) ? [-36, -42, 72, 105]
            : isMotor(asset) ? [-32, -32, 64, 64]
              : isFuse(asset) ? [-11, -32, 22, 64]
                : asset.kind === 'interface' ? [-20, -20, 40, 40]
                  : asset.kind === 'transformer' ? [-35, -23 - Math.max(0, asset.terminals.length - 2) * 12, 70, 46 + Math.max(0, asset.terminals.length - 2) * 24]
                    : asset.kind === 'source' ? [-32, -32, 64, 64] : [-32, -23, 64, 46];
      const selector = threePositionGeometry(asset, layout);
      if (selector) relative = [-21, Math.min(-42, selector.tapY), 93, Math.max(42, selector.tapY + 81) - Math.min(-42, selector.tapY)];
      else if (!['bus', 'earth-switch', 'interface', 'source'].includes(asset.kind) && !isFuse(asset) && Math.abs(rotation % 180) === 90) relative = [-relative[1] - relative[3], relative[0], relative[3], relative[2]];
      symbolBoxes[id] = { x: x + relative[0], y: y + relative[1], width: relative[2], height: relative[3] };
      if (asset.kind !== 'bus') ports.forEach((p, index) => {
        const terminal = asset.terminals[index]; if (!terminal) return;
        const points = orthogonalPoints([layout.terminals[terminal], [x + p[0], y + p[1]]]);
        points.slice(1).forEach((to, i) => leadSegments.push({ assetId: id, terminal, from: points[i], to }));
      });
    }
    // Labels use the renderer's measured card dimensions. Preserve the authored
    // offset where clear; otherwise select a fixed adjacent card slot. Symbols,
    // source bends and topology never move during this label-only pass.
    const placedLabels = [];
    const wireSegments = [...Object.values(routes).flatMap(path => path.slice(1).map((to, i) => ({ from: path[i], to }))), ...leadSegments];
    for (const id of group.assetIds) {
      if (hiddenAssetIds.includes(id)) continue;
      const preferred = labels[id]; const [x, y] = layout.assets[id]; const { width, height } = preferred;
      const candidates = [preferred];
      for (const distance of [110, 180, 260, 380, 540, 760, 1000]) {
        candidates.push({ x: x + distance, y: y - height / 2, width, height }, { x: x - distance - width, y: y - height / 2, width, height }, { x: x - width / 2, y: y + distance, width, height }, { x: x - width / 2, y: y - distance - height, width, height });
      }
      const score = box => 1e9 * [...Object.values(symbolBoxes), ...placedLabels].filter(other => overlap(box, other)).length + 1e8 * wireSegments.filter(segment => cutsBox(segment.from, segment.to, box)).length + Math.abs(box.x - preferred.x) + Math.abs(box.y - preferred.y);
      let box = candidates[0]; let best = score(box);
      for (const candidate of candidates.slice(1)) { const value = score(candidate); if (value < best) { box = candidate; best = value; } }
      labels[id] = { ...box, lines: preferred.lines }; placedLabels.push(box);
    }
    if (group.id === 'station/iop') {
      const id = 'line33:pole-284'; const [x, y] = layout.assets[id];
      labels[id] = { ...labels[id], x: x + 110, y: y + 110 };
      authoredCorrections.push({ type: 'local-label-slot', assetId: id, reason: 'Bottom takeoff occupies the authored centered card position; use the clear lower-right slot.' });
    }
    if (group.id === 'western-supplemental/h8/lv') {
      const id = 'wh:h8:tf416a'; const [x, y] = layout.assets[id];
      labels[id] = { ...labels[id], x: x + 110, y: y - labels[id].height / 2 };
      authoredCorrections.push({ type: 'local-label-slot', assetId: id, reason: 'Place transformer card right of the vertical terminal/lead column with measured clearance for the external HV approach.' });
    }
    for (const [id, box] of Object.entries(labels)) {
      for (const [other, symbol] of Object.entries(symbolBoxes)) if (overlap(box, symbol)) localFindings.push({ type: 'label-symbol', labelAssetId: id, symbolAssetId: other });
      for (const [other, label] of Object.entries(labels)) if (id < other && overlap(box, label)) localFindings.push({ type: 'label-label', assetIds: [id, other] });
    }
    for (const [id, box] of Object.entries(symbolBoxes)) for (const [other, otherBox] of Object.entries(symbolBoxes)) if (id < other && overlap(box, otherBox)) localFindings.push({ type: 'symbol-symbol', assetIds: [id, other] });
    for (const link of links) {
      const path = routes[link.id]; if (!path) continue;
      const own = new Set([terminalOwner.get(link.from), terminalOwner.get(link.to)]);
      for (const [id, box] of Object.entries(labels)) if (path.some((p, i) => i && cutsBox(path[i - 1], p, box))) localFindings.push({ type: 'route-label', connectionId: link.id, assetId: id });
      for (const [id, box] of Object.entries(symbolBoxes)) if (!own.has(id) && path.some((p, i) => i && cutsBox(path[i - 1], p, box))) localFindings.push({ type: 'route-symbol', connectionId: link.id, assetId: id });
    }
    const boxes = [...Object.values(symbolBoxes), ...Object.values(labels), ...Object.values(layout.terminals).map(([x, y]) => ({ x, y, width: 0, height: 0 })), ...Object.values(routes).flat().map(([x, y]) => ({ x, y, width: 0, height: 0 }))];
    const minX = Math.min(...boxes.map(b => b.x)) - padding;
    // Retain the H8 LV template's measured top card slot as reserved space even
    // after its transformer card moves sideways; normalization must not shift
    // operating equipment or external terminal coordinates.
    const reservedTop = group.id === 'western-supplemental/h8/lv'
      ? layout.assets['wh:h8:tf416a'][1] - 180 - labels['wh:h8:tf416a'].height : Infinity;
    const minY = Math.min(reservedTop, ...boxes.map(b => b.y)) - padding - 60;
    const width = Math.max(...boxes.map(b => b.x + b.width)) - minX + padding; const height = Math.max(...boxes.map(b => b.y + b.height)) - minY + padding;
    const normalize = p => [p[0] - minX, p[1] - minY];
    for (const field of ['assets', 'terminals']) for (const id of Object.keys(layout[field])) layout[field][id] = normalize(layout[field][id]);
    for (const label of Object.values(labels)) { label.x -= minX; label.y -= minY; }
    for (const id of Object.keys(routes)) routes[id] = routes[id].map(normalize);
    for (const box of Object.values(symbolBoxes)) { box.x -= minX; box.y -= minY; }
    for (const lead of leadSegments) { lead.from = normalize(lead.from); lead.to = normalize(lead.to); }
    for (const entry of Object.values(sourceTransforms)) entry.translation = normalize(entry.translation);
    for (const correction of authoredCorrections) if (correction.type === 'reserved-local-supply-channel') { correction.channelX -= minX; correction.channelY -= minY; }
    const module = { id: group.id, label: compactGroupLabel(group), origin: [0, 0], assetIds: [...group.assetIds], layout, labels, routes, ...(hiddenAssetIds.length ? { hiddenAssetIds } : {}), ...(group.frame ? { frame: [0, 0, width, height] } : {}) };
    modules.push(module);
    const busTaps = links.flatMap(link => [[link.from, routes[link.id]?.[0]], [link.to, routes[link.id]?.at(-1)]].flatMap(([terminal, point]) => byId.get(terminalOwner.get(terminal)).kind === 'bus' && point ? [{ connectionId: link.id, terminal, assetId: terminalOwner.get(terminal), point }] : []));
    for (const link of links) {
      const path = routes[link.id]; if (!path) continue;
      if (path.some((p, i) => i && p[0] !== path[i - 1][0] && p[1] !== path[i - 1][1])) throw new Error(`Non-orthogonal local path: ${link.id}`);
      for (const [terminal, point] of [[link.from, path[0]], [link.to, path.at(-1)]]) {
        const id = terminalOwner.get(terminal); const center = layout.assets[id]; const target = layout.terminals[terminal];
        const exact = point[0] === target[0] && point[1] === target[1];
        const axis = Math.abs(layout.rotations[id] % 180) === 90 ? 0 : 1;
        const onBus = byId.get(id).kind === 'bus' && point[1 - axis] === center[1 - axis] && Math.abs(point[axis] - center[axis]) <= layout.busSpans[id] / 2;
        if (!exact && !onBus) throw new Error(`Detached local endpoint: ${link.id} / ${terminal}`);
      }
    }
    sourceCoverage.push({ groupId: group.id, sourceLabel: group.label, sourceViewByAsset, sourceViewByConnection, sourceTransforms, bounds: [0, 0, width, height], symbolBoxes, leadSegments, busTaps, authoredCorrections, findings: localFindings });
  }
  // SW411 is the parent bus of the whole drawing. Its taps must span the
  // downstream branches rather than funnel every feeder through a side gutter.
  // Explicit assembly translations preserve all vertical arrangements and every
  // electrical identity. Coordinates are local to its fixed [35805,3819.5] origin.
  {
    const module = modules.find(item => item.id === 'sw411/overview');
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    const globalOriginX = 35805;
    const tierStems = { '01': 4696.25, '02': 1500, '03': 20461.25, '04': 36620,
      '13': 53010, '14': 48600, '15': 65000, '16': 71853.75 };
    const shifts = new Map();
    const moveAsset = (id, dx) => {
      shifts.set(id, dx);
      module.layout.assets[id][0] += dx;
      for (const terminal of byId.get(id).terminals) module.layout.terminals[terminal][0] += dx;
      if (module.labels[id]) module.labels[id].x += dx;
      if (coverage.symbolBoxes[id]) coverage.symbolBoxes[id].x += dx;
    };
    for (const [tier, globalX] of Object.entries(tierStems)) {
      const prefix = `sw411:tier-${tier}:`;
      const dx = globalX - globalOriginX - module.layout.assets[`${prefix}cb`][0];
      for (const id of module.assetIds.filter(id => id.startsWith(prefix))) moveAsset(id, dx);
      for (const id of Object.keys(module.routes).filter(id => id.startsWith(prefix))) module.routes[id] = module.routes[id].map(([x, y]) => [x + dx, y]);
    }
    for (const [bus, globalX] of [['a', 900], ['b', 72753.75]]) {
      const id = `sw411:bus-${bus}:es`;
      const dx = globalX - globalOriginX - module.layout.assets[id][0];
      moveAsset(id, dx);
      const terminal = module.layout.terminals[`${id}:line`];
      module.routes[`sw411:bus-${bus}:earth-branch`] = [[terminal[0], 1666], [...terminal]];
    }
    for (const [bus, left, right] of [['a', 600, 39300], ['b', 40900, 73000]]) {
      const id = `sw411:bus-${bus}`;
      const x = (left + right) / 2 - globalOriginX;
      module.layout.assets[id][0] = x;
      module.layout.terminals[`${id}:bar`][0] = x;
      module.layout.busSpans[id] = right - left;
      coverage.symbolBoxes[id] = { x: left - globalOriginX, y: 1663, width: right - left, height: 6 };
      module.labels[id].x = x - module.labels[id].width / 2;
    }
    // Tie leads end within their own bus sections without crossing the open tie.
    module.routes['sw411:tie-to-bus-a'] = [module.layout.terminals['sw411:bus-tie:cb:bus-a'], [38785 - globalOriginX, 1666]];
    module.routes['sw411:tie-to-bus-b'] = [module.layout.terminals['sw411:bus-tie:cb:bus-b'], [41505 - globalOriginX, 1666]];
    for (const lead of coverage.leadSegments) {
      const dx = shifts.get(lead.assetId) ?? 0;
      lead.from[0] += dx; lead.to[0] += dx;
    }
    const localLinks = model.connections.filter(link => module.routes[link.id]);
    coverage.busTaps = localLinks.flatMap(link => [[link.from, module.routes[link.id][0]], [link.to, module.routes[link.id].at(-1)]].flatMap(([terminal, point]) => byId.get(terminalOwner.get(terminal)).kind === 'bus' ? [{ connectionId: link.id, terminal, assetId: terminalOwner.get(terminal), point }] : []));
    module.frame = [400 - globalOriginX, 0, 73150 - 400, module.frame[3]];
    coverage.bounds = [...module.frame];
    coverage.authoredCorrections.push({ type: 'whole-network-parent-bus', globalOriginX, tierStems,
      reason: 'Span the actual downstream columns; SW451, SW426 and SW421 use dedicated vertical bypass stems outside intervening rooms. Other room interiors remain unchanged.' });
    coverage.findings = [];
    for (const link of localLinks) {
      const path = module.routes[link.id]; const own = new Set([terminalOwner.get(link.from), terminalOwner.get(link.to)]);
      for (const [id, box] of Object.entries(module.labels)) if (path.some((p, i) => i && cutsBox(path[i - 1], p, box))) coverage.findings.push({ type: 'route-label', connectionId: link.id, assetId: id });
      for (const [id, box] of Object.entries(coverage.symbolBoxes)) if (!own.has(id) && path.some((p, i) => i && cutsBox(path[i - 1], p, box))) coverage.findings.push({ type: 'route-symbol', connectionId: link.id, assetId: id });
    }
  }
  // Take bus earths from the outer end of their actual horizontal bus, rather
  // than carrying the earth branch across the outgoing feeder stems below it.
  for (const id of ['sw431:bus:es:branch', 'sw435:bus:es:branch', 'sw454:bus:es:branch', 'sw426:bus:es:branch', 'sw505:bus:es:branch', 'sw421:bus:es:branch']) {
    const module = modules.find(item => item.routes[id]);
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    const link = model.connections.find(item => item.id === id);
    const busId = terminalOwner.get(link.from);
    if (byId.get(busId).kind !== 'bus' || module.layout.rotations[busId] !== 90 || module.routes[id].length !== 4) throw new Error(`Unexpected bus-earth tap contract: ${id}`);
    const left = module.layout.assets[busId][0] - module.layout.busSpans[busId] / 2;
    module.routes[id][0][0] = left; module.routes[id][1][0] = left;
    for (const tap of coverage.busTaps.filter(item => item.connectionId === id && item.assetId === busId)) tap.point = [...module.routes[id][0]];
    coverage.authoredCorrections.push({ type: 'outer-bus-earth-tap', connectionId: id, x: left, reason: 'Use the same modeled bus at its outer end, clear of all outgoing feeder stems.' });
  }
  for (const id of ['sw431:tf431:transformer', 'sw431:tf432:transformer', 'sw431:tf437:transformer', 'sw431:tf442:transformer', 'hpgr:tf003', 'hpgr:tf002', 'sw421:tf421:transformer', 'sw421:tf422:transformer', 'sw421:tf423:transformer', 'sw451:tf451', 'sw451:tf452']) {
    const module = modules.find(item => item.assetIds.includes(id));
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    const label = module.labels[id]; label.x = module.layout.assets[id][0] + 80;
    label.y = module.layout.assets[id][1] - label.height / 2;
    if (label.x + label.width > coverage.bounds[0] + coverage.bounds[2]) throw new Error(`Transformer label exceeds its measured group: ${id}`);
    coverage.authoredCorrections.push({ type: 'straight-primary-label-slot', assetId: id, reason: 'Keep the transformer identification beside its vertical primary input, clear of the conductor.' });
  }
  {
    const id = 'wh:h8:hv416';
    const module = modules.find(item => item.assetIds.includes(id));
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    const label = module.labels[id];
    label.x = module.layout.assets[id][0] + 80;
    label.y = module.layout.assets[id][1] - label.height / 2;
    coverage.bounds[2] = Math.max(coverage.bounds[2], label.x + label.width - coverage.bounds[0] + 50);
    coverage.authoredCorrections.push({ type: 'shared-supply-label-slot', assetId: id, reason: 'Keep the kiosk identifier beside the common supply stem instead of covering the conductor.' });
  }
  // The owner requested the water spur on the right, above SR411. Keep the
  // confirmed OPF1-7 junction fixed within this module; only its spur assembly
  // moves sideways. This does not change any electrical connection.
  {
    const module = modules.find(item => item.id === 'supplemental/water-tf12-source');
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    const moved = new Set(['mine:interface:water-opf1', 'mine:wt1:cb']);
    const dx = 24760 - module.layout.assets['mine:wt1:cb'][0];
    for (const id of moved) {
      module.layout.assets[id][0] += dx;
      for (const terminal of byId.get(id).terminals) module.layout.terminals[terminal][0] += dx;
      module.labels[id].x += dx;
      coverage.symbolBoxes[id].x += dx;
    }
    for (const lead of coverage.leadSegments) if (moved.has(lead.assetId)) { lead.from[0] += dx; lead.to[0] += dx; }
    module.routes['mine:wt1:source'] = module.routes['mine:wt1:source'].map(([x, y]) => [x + dx, y]);
    const junction = module.layout.terminals['owner:tf12:opf1-7:port'];
    const spur = module.layout.terminals['mine:interface:water-opf1:port'];
    module.routes['owner:tf12:opf1-7-water'] = [[...junction], [spur[0], junction[1]], [...spur]];
    const label = module.labels['owner:tf12:opf1-7'];
    label.x = junction[0] - label.width - 80; label.y = junction[1] - label.height / 2;
    const left = Math.min(0, label.x - 50);
    const right = Math.max(...Object.values(module.labels).map(item => item.x + item.width)) + 50;
    coverage.bounds = [left, 0, right - left, coverage.bounds[3]];
    coverage.authoredCorrections.push({ type: 'right-hand-water-spur', branchColumn: 24760, reason: 'Owner markup places WT1 and SW441 above and right of SR411; OPF1-7 remains the same source junction.' });
  }
  {
    const module = modules.find(item => item.id === 'mine-camp/mine-mc441');
    const label = module.labels['mine:tf441'];
    label.x = module.layout.assets['mine:tf441'][0] + 80;
    label.y = module.layout.assets['mine:tf441'][1] - label.height / 2;
    sourceCoverage.find(item => item.groupId === module.id).authoredCorrections.push({ type: 'straight-primary-label-slot', assetId: 'mine:tf441', reason: 'Keep the TF441 label beside its straight primary feeder.' });
  }
  {
    const module = modules.find(item => item.id === 'mine-camp/mine-sw441');
    const coverage = sourceCoverage.find(item => item.groupId === module.id);
    for (const id of ['mine:sw441:in:cb', 'mine:tf441:cb']) {
      const label = module.labels[id]; const point = module.layout.assets[id];
      label.x = point[0] + 110; label.y = point[1] - label.height / 2;
      coverage.authoredCorrections.push({ type: 'straight-feeder-label-slot', assetId: id, reason: 'Keep breaker identification beside the new straight incoming/outgoing conductor.' });
    }
  }
  const findings = sourceCoverage.flatMap(g => g.findings.map(f => ({ groupId: g.groupId, ...f })));
  const artifact = { schemaVersion: 1, modelId: model.id, modelVersion: model.version, topologyFingerprint: baseline.topologySha256, baselineFileSha256: manifest.baselineFileSha256,
    status: missing.length ? 'incomplete-source-data' : findings.length ? 'local-review-required' : 'local-geometry-ready-for-review',
    description: 'Local source extraction only. All origins are zero. No global positions or external routes are included; collision findings are not acceptance waivers.',
    extraction: { sourceScale: scale, framePadding: padding, coordinatePolicy: 'Authored source coordinates and bends scaled uniformly; separate H3/H8 motor views translated explicitly. Shared buses measured across their explicit taps. Source transforms include normalization.', labelMetrics: 'NetworkDiagram continuous labels: 35 line height, 15 estimated character width, 20 horizontal padding; device state adds 32 height.' },
    modules, sourceCoverage, summary: { groupCount: modules.length, assetCount: modules.reduce((n, g) => n + g.assetIds.length, 0), terminalCount: modules.reduce((n, g) => n + Object.keys(g.layout.terminals).length, 0), internalRouteCount: modules.reduce((n, g) => n + Object.keys(g.routes).length, 0), externalConnectionCount: model.connections.filter(c => groupByAsset.get(terminalOwner.get(c.from)) !== groupByAsset.get(terminalOwner.get(c.to))).length, missingSourceData: missing, localFindingCount: findings.length, findingsByType: Object.fromEntries([...new Set(findings.map(f => f.type))].map(type => [type, findings.filter(f => f.type === type).length])) } };
  await writeFile('src/models/site/authored-local-modules.json', JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify(artifact.summary, null, 2));
  if (missing.length) process.exitCode = 1;
} finally { await server.close(); }
