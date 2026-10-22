import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction identifiers and terminal roles are not printed terminal tags.
// Supported means drawn; installed arrangement, interlocks and starting states remain unconfirmed.
const documents = {
  hv: { document: '11098-07110-EL-DR-2351.pdf', revision: '5 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27/10/25; ISSUED FOR USE; AS BUILT stamp)', page: 1 },
  sw423: { document: '11098-07110-EL-DR-2465.pdf', revision: '7 (28/10/25; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  sw423s2: { document: '11098-07110-EL-DR-2466.pdf', revision: '5 (18/11/25; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  sw423s3: { document: '11098-07110-EL-DR-2467.pdf', revision: '10 (18/11/25; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  sw423s4: { document: '11098-07110-EL-DR-2474.pdf', revision: '4 (20/08/09; ISSUED FOR AS-BUILT)', page: 1 },
  mc421: { document: '11098-07110-EL-DR-2650.pdf', revision: '10 (23/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  mc421s2: { document: '11098-07110-EL-DR-2671.pdf', revision: '5B (10/02/26; RE-ISSUED FOR REVIEW - CB25OP003A)', page: 1 },
  mc422: { document: '11098-07110-EL-DR-2652.pdf', revision: '10 (23/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
};
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Point = [number, number];
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const hvIds: string[] = [];
const lvIds: string[] = [];

function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([document, region]) => ({ ...documents[document], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], area: 'hv' | 'lv' | 'both' = 'hv') {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminalPoints[index]; });
  if (area !== 'lv') hvIds.push(asset.id);
  if (area !== 'hv') lvIds.push(asset.id);
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim });
  if (bends) layout.bends![id] = bends;
}
function switcher(id: string, label: string, kind: 'breaker' | 'earth-switch', point: Point, claim: Claim, aliases: string[] = [], area: 'hv' | 'lv' = 'hv') {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], area);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, claim: Claim, aliases: string[] = []) {
  const terminals = switcher(id, label, 'earth-switch', point, claim, aliases);
  layout.rotations![id] = 0; layout.labelOffsets![id] = [0, 65];
  layout.terminals[terminals[0]] = [point[0] - 30, point[1]]; layout.terminals[terminals[1]] = [point[0] + 30, point[1]];
  link(`${id}:branch`, from, terminals[0], claim, [[layout.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminals[1], ...claim });
}
function unknownCoverage(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}

const bus = fact('SC-BUS', 'SW421 single drawn 22kV phase bar; SS421 is the screening substation alias, not a second switchboard.', [['hv', 'C / 1-10, main phase bar'], ['overview', 'E-G / 6-8, SS421 panel']], ['SC-R01', 'SC-R05']);
add({ id: 'sw421:bus', label: 'SW421\n22 kV HV bus', aliases: ['SW421', 'SS421', 'Screening'], kind: 'bus', terminals: ['sw421:bus:bar'], conductivePairs: [], positions: [], ...bus }, [900, 340], [[900, 340]]);
layout.rotations!['sw421:bus'] = 90; layout.labelOffsets!['sw421:bus'] = [0, -45];
const incoming = fact('SC-INCOMING', 'SW421-P-01 enters CB SW421 IN 01 from the SW411 interface; ES SW421 IN 01 branches on its incoming cable side. Upstream devices remain in the SW411 area; no source availability is asserted.', [['hv', 'A-C / 1-2, incomer'], ['sw411', 'D-G / 10-11, tier15 CB/ES SW421 FD 01 and SW421-P-01'], ['overview', 'SW411 tier15 and SS421 incoming route']], ['SC-R01', 'SC-R02', 'SC-R05']);
add({ id: 'sw421:interface:sw411', label: 'SW411 interface\nSW421-P-01', aliases: ['SW421-P-01', 'SW411 tier 15', 'CB SW421 FD 01 at SW411', 'CB SW421 FD01', 'ES SW421 FD 01 at SW411', 'ES SW421 FD01'], kind: 'interface', terminals: ['sw421:interface:sw411:port'], conductivePairs: [], positions: [], ...incoming }, [160, 60], [[160, 60]]);
const incomingCb = switcher('sw421:in:cb', 'CB SW421 IN 01', 'breaker', [160, 220], incoming, ['CB SW421 IN01']);
link('sw421:incoming:cable-SW421-P-01', 'sw421:interface:sw411:port', incomingCb[0], incoming);
link('sw421:incoming:bus-link', incomingCb[1], 'sw421:bus:bar', incoming, [[160, 340]]);
earthBranch('sw421:in:es', 'ES SW421 IN 01', incomingCb[0], [265, 125], incoming, ['ES SW421 IN01']);
unknownCoverage('sw421:sw411:coverage', 'sw421:interface:sw411:port', 'Unconfirmed SW411 source/earth continuation and availability', incoming);
earthBranch('sw421:bus:es', 'ES SW421\nBus earth · tier 3', 'sw421:bus:bar', [65, 445], fact('SC-BUS-EARTH', 'ES SW421 is a direct phase-bar earth branch, distinct from cable-side incoming and feeder earth switches.', [['hv', 'C-E / 3-4, tier3 bus earth'], ['overview', 'SS421 tier3']], ['SC-R02', 'SC-R05']), ['ES SW421', 'Tier 3']);

const branches = [
  { tf: 'tf421', board: 'mc421', x: 520, source: 'mc421', dual: false, tier: 4, region: 'TF421 A-C / 5-6; CB MC421 IN C-D / 5; 400V bar D / 1-10' },
  { tf: 'tf422', board: 'mc422', x: 1000, source: 'mc422', dual: false, tier: 5, region: 'TF422 A-C / 5-6; CB MC422 IN C-D / 5; 400V bar D / 1-12' },
  { tf: 'tf423', board: 'sw423', x: 1480, source: 'sw423', dual: true, tier: 6, region: 'TF423 A / 5-6; D/Y incomers A-C / 1-2, 9-10; separate 690V bars C / 1-10' },
] satisfies { tf: string; board: string; x: number; source: keyof typeof documents; dual: boolean; tier: number; region: string }[];
const crossings: { feederCable: string; transformerId: string; feederId: string; outputCables: { id: string; cbId: string }[] }[] = [];
for (const branch of branches) {
  const tf = branch.tf.toUpperCase(); const board = branch.board.toUpperCase(); const prefix = `sw421:${branch.tf}`;
  const feederClaim = fact(`SC-${tf}-FEEDER`, `${tf}-P-01 links CB ${tf} FD to ${tf}; ES ${tf} FD is on the outgoing cable side. Protection/CT/control references are not power connections.`, [['hv', `C-G, tier${branch.tier} ${tf} feeder and cable`], [branch.source, branch.region]], ['SC-R01', 'SC-R02', 'SC-R05']);
  const feeder = switcher(`${prefix}:hv-cb`, `CB ${tf} FD\nTier ${branch.tier}`, 'breaker', [branch.x, 490], feederClaim, [`CB ${tf} FD`, `Tier ${branch.tier}`]);
  link(`${prefix}:bus-link`, 'sw421:bus:bar', feeder[0], feederClaim, [[branch.x, 340]]);
  earthBranch(`${prefix}:hv-es`, `ES ${tf} FD`, feeder[1], [branch.x + 95, 580], feederClaim, [`ES ${tf} FD`]);
  const terminals = [`${prefix}:hv`, ...(branch.dual ? [`${prefix}:lv-d`, `${prefix}:lv-y`] : [`${prefix}:lv`])];
  const transfer = fact(`SC-${tf}-TRANSFER`, `Inference: provisional bidirectional source-pair candidates link the depicted ${tf} HV winding with each distinct LV winding. Reverse energisation and secondary-to-secondary transfer remain unconfirmed. Empty earthPairs does not confirm absence of earth transfer; winding boundaries retain unknown source and earth coverage. Neutral/MEN or screen-earth annotations do not create a phase-earth path.`, [[branch.source, branch.region], ['hv', `G, ${tf} output reference`]], ['SC-R01', 'SC-R04'], 'provisional');
  const transformerId = `${prefix}:transformer`;
  add({ id: transformerId, label: `${tf}\n${branch.dual ? '22 kV / 690 V / 690 V · 5 MVA' : '22 kV / 400 V · 2.0 MVA'}\nTransfer unconfirmed`, aliases: [tf, branch.dual ? 'Three distinct windings; 5MVA' : 'Two windings; 2.0MVA'], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...transfer }, [branch.x, 725], [[branch.x, 695], ...(branch.dual ? [[branch.x - 45, 755], [branch.x + 45, 755]] as Point[] : [[branch.x, 755]] as Point[])], 'both');
  layout.rotations![transformerId] = 90; layout.labelOffsets![transformerId] = [0, -55];
  const feederCable = `${prefix}:cable-${tf}-P-01`;
  link(feederCable, feeder[1], terminals[0], feederClaim);
  for (const terminal of terminals) unknownCoverage(`${terminal}:coverage`, terminal, `${tf} winding source/backfeed and earth-transfer policy unconfirmed`, transfer);
  const endpointLocations: [keyof typeof documents, string][] = [[branch.source, branch.region]];
  if (branch.tf === 'tf421') endpointLocations.push(['mc421s2', 'D / 1-10, same continued 400V phase bar; no additional incomer']);
  if (branch.dual) endpointLocations.push(['sw423s2', 'C / 1-10, D/Y phase-bar continuations'], ['sw423s3', 'B-C / 1-10, D/Y bars; lower reference table SW243 alias'], ['sw423s4', 'B-C, two separate continued bars ending near column7']);
  const endpoint = fact(`SC-${board}-LV-ENDPOINTS`, `${board} ${branch.dual ? 'separate D/Y 690V phase bars each follow their named incomer; no depicted tie on the four reviewed sheets' : '400V phase bar follows the named LV incomer'}. Continuation pages are the same bars, not extra endpoints. Outgoing LV circuits are outside scope; installation, interlocks and starting states remain unconfirmed.`, endpointLocations, ['SC-R01', 'SC-R03', 'SC-R05', ...(branch.dual ? ['SC-R06'] : [])]);
  const outputCables: { id: string; cbId: string }[] = [];
  for (const [index, suffix] of (branch.dual ? ['d', 'y'] : ['single']).entries()) {
    const lvPrefix = branch.dual ? `sw421:${branch.board}:${suffix}` : `sw421:${branch.board}`;
    const x = branch.x + (branch.dual ? index === 0 ? -105 : 105 : 0); const windingLabel = branch.dual ? ` ${suffix.toUpperCase()}` : '';
    const cbId = `${lvPrefix}:cb`; const cb = switcher(cbId, `CB ${board} IN${windingLabel}`, 'breaker', [x, 965], endpoint, [`CB ${board} IN${windingLabel}`], 'lv');
    const cableId = branch.dual ? `${lvPrefix}:cable-SW423-P-0${index + 1}-group` : `${lvPrefix}:winding-cable`;
    const cableClaim = branch.dual ? fact(`SC-SW423-CABLE-${suffix.toUpperCase()}`, `SW423-P-0${index + 1}-1 to -5 is one depicted parallel cable group from TF423 ${windingLabel.trim()} winding through its own incomer; not five separate sources.`, [['sw423', index === 0 ? 'A-C / 1-2, SW423-P-01-1 to -5 and CB SW423 IN D' : 'A-C / 9-10, SW423-P-02-1 to -5 and CB SW423 IN Y']], ['SC-R01', 'SC-R03', 'SC-R06']) : endpoint;
    link(cableId, terminals[index + 1], cb[0], cableClaim, [[x, 825]]); outputCables.push({ id: cableId, cbId });
    const busId = `${lvPrefix}:bus`; const port = `${busId}:bar`;
    add({ id: busId, label: `${board}${branch.dual ? ` ${suffix === 'd' ? 'Δ' : 'Y'}` : ''}\n${branch.dual ? '690' : '400'} V final LV bus`, aliases: [board, ...(branch.dual ? [`SW423 ${suffix.toUpperCase()} bar`, 'SW243 (disputed reference description)', '2465 → 2466 → 2467 → 2474 continuation'] : branch.tf === 'tf421' ? ['2650 → 2671 same continued bar'] : [])], kind: 'bus', terminals: [port], conductivePairs: [], positions: [], ...endpoint }, [x, 1130], [[x, 1130]], 'lv');
    layout.rotations![busId] = 90; layout.labelOffsets![busId] = [0, 65];
    link(`${lvPrefix}:incomer-bus`, cb[1], port, endpoint);
  }
  crossings.push({ feederCable, transformerId, feederId: `${prefix}:hv-cb`, outputCables });
}
for (const [tier, x] of [[2, 300], [7, 1880]] as const) {
  const prefix = `sw421:spare:tier${tier}`;
  const spare = fact(`SC-SPARE-TIER${tier}`, `SW421 tier${tier} has CB SPARE FD and cable-side ES SPARE FD. No named downstream power asset is drawn. Unconfirmed continuation is retained, not declared disconnected.`, [['hv', tier === 2 ? 'C-G / 1-2, spare tier2' : 'C-G / 8-10, spare tier7'], ['overview', `SS421 spare tier${tier}`]], ['SC-R01', 'SC-R02', 'SC-R05']);
  const cb = switcher(`${prefix}:cb`, `CB SPARE FD\nTier ${tier}`, 'breaker', [x, 490], spare, ['CB SPARE FD', `SW421 tier ${tier}`]);
  link(`${prefix}:bus-link`, 'sw421:bus:bar', cb[0], spare, [[x, 340]]);
  earthBranch(`${prefix}:es`, `ES SPARE FD\nTier ${tier}`, cb[1], [x + 75, 580], spare, ['ES SPARE FD', `SW421 tier ${tier}`]);
  const port = `${prefix}:interface:port`;
  add({ id: `${prefix}:interface`, label: `Spare tier ${tier}\nContinuation unconfirmed`, aliases: [`SW421 spare tier ${tier}`], kind: 'interface', terminals: [port], conductivePairs: [], positions: [], ...spare }, [x, 760], [[x, 760]]);
  link(`${prefix}:unnamed-outgoing`, cb[1], port, spare);
  unknownCoverage(`${prefix}:coverage`, port, `Unnamed spare tier${tier} source/earth continuation unconfirmed`, spare);
}

evidence.push({ id: 'SC-OUTGOING-INTERLOCK-SCOPE', status: 'supported', summary: '2467 note2 explicitly describes SH101/SH106 outgoing power-isolator key-switch and auxiliary-contact/VSD-contactor trip behavior. Those circuits are beyond the final LV bus boundary; this note establishes no HV or LV-incomer rule.', references: [{ ...documents.sw423s3, clause: 'A-B / 11-12, note 2; SH101/SH106 outgoing equipment F-G' }] });
evidence.push({ id: 'SC-INTERLOCK-GAPS', status: 'unresolved', summary: 'Reviewed HV and LV incomers lack complete physical-interlock, key and withdrawal/earthing-state conditions. The source does not confirm permission or absence of restrictions. Overview notes defer to SLDs, HV switching programs and key-interlocking procedures. Drawing poses and revision labels are not starting-configuration acceptance.', references: [{ ...documents.hv, clause: 'SW421 incoming, bus earth, transformer and spare bays' }, { ...documents.sw423, clause: 'A-C / 1-2 and 9-10, D/Y incomers' }, { ...documents.mc421, clause: 'C-D / 5, CB MC421 IN' }, { ...documents.mc422, clause: 'C-D / 5, CB MC422 IN' }, { ...documents.overview, clause: 'Notes 1-2, lower left; switching-program/key-interlocking references' }] });

const reviews: NonNullable<NetworkModel['reviews']> = [
  { id: 'SC-R01', question: 'Confirm the governing supplied revisions and installed configuration; dates and revision status do not establish precedence.', status: 'open', evidenceIds: ['SC-BUS'] },
  { id: 'SC-R02', question: 'Confirm SW421 physical interlocks, withdrawal/earthing positions and spare-device identities. The source does not confirm permitted transitions.', status: 'open', evidenceIds: ['SC-INCOMING', 'SC-BUS-EARTH'] },
  { id: 'SC-R03', question: 'Confirm physical interlock conditions for MC421/MC422 and SW423 D/Y incomers; absence of stated restrictions is not confirmation.', status: 'open', evidenceIds: ['SC-MC421-LV-ENDPOINTS', 'SC-MC422-LV-ENDPOINTS', 'SC-SW423-LV-ENDPOINTS'] },
  { id: 'SC-R04', question: 'Confirm independent source transfer/backfeed and earth policies for TF421/TF422 and all three TF423 windings. Secondary-to-secondary transfer and phase-earth paths remain unconfirmed.', status: 'open', evidenceIds: ['SC-TF421-TRANSFER', 'SC-TF422-TRANSFER', 'SC-TF423-TRANSFER'] },
  { id: 'SC-R05', question: 'Confirm all starting states and SW411 upstream source/bus availability.', status: 'open', evidenceIds: ['SC-INCOMING'] },
  { id: 'SC-R06', question: 'Confirm SW243 in 2467 reference descriptions versus SW423 title; retain the alias, not additional equipment.', status: 'open', evidenceIds: ['SC-SW423-LV-ENDPOINTS'] },
];
reviews.find(review => review.id === 'SC-R01')!.evidenceIds = evidence.map(record => record.id);
for (const id of ['SC-R02', 'SC-R03', 'SC-R05']) reviews.find(review => review.id === id)!.evidenceIds.push('SC-INTERLOCK-GAPS');
reviews.find(review => review.id === 'SC-R03')!.evidenceIds.push('SC-OUTGOING-INTERLOCK-SCOPE');

const hvLayout = structuredClone(layout);
const lvLayout = structuredClone(layout);
const hvView: DiagramView = { id: 'hv', label: 'SW421 HV · 2351 rev5', assetIds: hvIds, layout: hvLayout, bounds: [-100, -20, 2240, 980], boundaries: [] };
const lvView: DiagramView = { id: 'lv', label: 'Final LV buses · four endpoints', assetIds: lvIds, layout: lvLayout, bounds: [300, -20, 1480, 740], boundaries: [] };
for (const crossing of crossings) {
  const transformer = assets.find(asset => asset.id === crossing.transformerId)!;
  const [x] = layout.assets[transformer.id];
  lvLayout.assets[transformer.id] = [x, 165]; lvLayout.terminals[transformer.terminals[0]] = [x, 135];
  transformer.terminals.slice(1).forEach((terminal, index) => { lvLayout.terminals[terminal] = [x + (transformer.terminals.length === 3 ? index === 0 ? -45 : 45 : 0), 195]; });
  const feederTerminal = assets.find(asset => asset.id === crossing.feederId)!.terminals[1];
  lvLayout.terminals[feederTerminal] = [x, 30];
  lvView.boundaries!.push({ connectionId: crossing.feederCable, remoteAssetId: crossing.feederId, targetViewId: 'hv', position: [x, 30] });
  for (const output of crossing.outputCables) {
    const cb = assets.find(asset => asset.id === output.cbId)!; const [cx] = layout.assets[cb.id];
    hvLayout.terminals[cb.terminals[0]] = [cx, 870]; hvLayout.bends![output.id] = [[cx, 810]];
    hvView.boundaries!.push({ connectionId: output.id, remoteAssetId: cb.id, targetViewId: 'lv', position: [cx, 870] });
    lvLayout.bends![output.id] = [[cx, 265]];
  }
}
for (const assetId of lvIds.filter(id => !id.endsWith(':transformer'))) {
  const asset = assets.find(item => item.id === assetId)!; const [x, y] = layout.assets[assetId];
  lvLayout.assets[assetId] = [x, y - 585];
  for (const terminal of asset.terminals) { const [tx, ty] = layout.terminals[terminal]; lvLayout.terminals[terminal] = [tx, ty - 585]; }
}
export const screeningModel: NetworkModel = {
  id: 'site-screening', version: 'construction-2026-10-22.1', name: 'Screening / SW421 · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, earths, boundaries, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => {
    const branch = branches.find(item => asset.id.startsWith(`sw421:${item.board}:`));
    return { assetId: asset.id, status: 'unresolved', note: 'Physical interlocks, complete withdrawal/earthing positions and baseline remain unconfirmed. The source does not confirm this control is permitted.', evidence: [{ ...documents[branch?.source ?? 'hv'], clause: branch ? branch.region : 'Represented HV control region; detailed interlock conditions unconfirmed' }] };
  }), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Screening overview · provisional', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -20, 2240, 1300] }, hvView, lvView] },
};
