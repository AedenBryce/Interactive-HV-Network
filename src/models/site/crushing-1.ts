import type { NetworkModel, Asset } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// All IDs/terminal roles below are construction identifiers, not printed terminal tags.
// Supported means depicted by the cited sheets; installation, baseline and interlocks are unconfirmed.
const sources = {
  hv: { document: '11098-07110-EL-DR-2353.pdf', revision: '5 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  sw435: { document: '11098-07110-EL-DR-2354.pdf', revision: '9 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  sw432: { document: '11098-07110-EL-DR-2455.pdf', revision: '5 (17/08/09)', page: 1 },
  sw437: { document: '11098-07110-EL-DR-2457.pdf', revision: '7 (08/01/26; issued for construction)', page: 1 },
  sw437Continuation: { document: '11098-07110-EL-DR-2458.pdf', revision: '6 (20/08/09)', page: 1 },
  sw442: { document: '11098-07110-EL-DR-2459.pdf', revision: '7 (04/03/16; issued for construction)', page: 1 },
  sw442Continuation: { document: '11098-07110-EL-DR-2470.pdf', revision: '6 (04/02/16; issued for construction)', page: 1 },
  mc431: { document: '11098-07110-EL-DR-2654.pdf', revision: '7 (14/11/25; issued for review)', page: 1 },
  mc431Continuation: { document: '11098-07110-EL-DR-2670.pdf', revision: '7 (14/11/25; issued for construction)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27/10/25)', page: 1 },
  overview435: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27/10/25)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  legacy: { document: '11098-07110-EL-DR-2350.pdf', revision: '16 (31/05/16)', page: 1 },
};
type Evidence = NonNullable<NetworkModel['evidence']>[number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Point = [number, number];
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: Evidence[] = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const overview: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const hvIds: string[] = [];
const lvIds: string[] = [];

function claim(id: string, summary: string, locations: [keyof typeof sources, string][], reviewIds: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([source, region]) => ({ ...sources[source], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], area: 'hv' | 'lv' | 'both') {
  assets.push(asset); overview.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { overview.terminals[terminal] = terminalPoints[index]; });
  if (area !== 'lv') hvIds.push(asset.id);
  if (area !== 'hv') lvIds.push(asset.id);
}
function connect(id: string, from: string, to: string, fact: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...fact });
  if (bends) overview.bends![id] = bends;
}
function switcher(id: string, label: string, kind: 'breaker' | 'earth-switch', point: Point, fact: Claim, aliases: string[] = [], area: 'hv' | 'lv' = 'hv') {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases: [...new Set([label, ...aliases])], kind, terminals, conductivePairs: [], positions: [
    { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] },
  ], ...fact, reviewIds: [...new Set([...(fact.reviewIds ?? []), 'C1-R07'])] }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], area);
  devices[id] = null; overview.rotations![id] = 90; overview.labelOffsets![id] = [0, -55];
  return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, fact: Claim, aliases: string[] = []) {
  const terminals = switcher(id, label, 'earth-switch', point, fact, aliases);
  overview.rotations![id] = 0; overview.terminals[terminals[0]] = [point[0] - 30, point[1]]; overview.terminals[terminals[1]] = [point[0] + 30, point[1]];
  overview.labelOffsets![id] = [0, 65];
  connect(`${id}:branch`, from, terminals[0], fact, [[overview.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminals[1], ...fact, reviewIds: [...new Set([...(fact.reviewIds ?? []), 'C1-R07'])] });
}
function uncertainBoundary(id: string, terminal: string, label: string, fact: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...fact });
}

const busClaim = claim('C1-BUS', 'SW431 single 22 kV phase bar and its continuation to all depicted branches. Drawn arrangement only; installed configuration unconfirmed.', [['hv', 'C / 1-10, SW431 phase bar'], ['overview', 'B-D / 3-6, SS431 panel']], ['C1-R06', 'C1-R07']);
add({ id: 'sw431:bus', label: 'SW431 HV bus', aliases: ['SW431', 'SS431', '22kV bus'], kind: 'bus', terminals: ['sw431:bus:bar'], conductivePairs: [], positions: [], ...busClaim }, [900, 340], [[900, 340]], 'hv');
overview.rotations!['sw431:bus'] = 90; overview.labelOffsets!['sw431:bus'] = [0, -35];

const incoming = claim('C1-INCOMING', 'SW431-P-01 from SW411 enters CB SW431 IN 01; ES SW431 IN 01 is on its incoming-cable side. No source availability or starting pose is confirmed.', [['hv', 'A-C / 1-2, incoming bay'], ['sw411', 'D-G / 8-9, tier 13 SW431 feeder'], ['overview', 'SS431 incoming reference']], ['C1-R07']);
const incomingCb = switcher('sw431:in:cb', 'CB SW431 IN 01', 'breaker', [160, 220], incoming, ['CB SW431 IN01']);
add({ id: 'sw431:interface:sw411', label: 'SW411 interface · SW431-P-01', aliases: ['SW431-P-01', 'SW411 tier 13', 'CB SW431 FD 01 at SW411'], kind: 'interface', terminals: ['sw431:interface:sw411:port'], conductivePairs: [], positions: [], ...incoming }, [160, 65], [[160, 65]], 'hv');
connect('sw431:incoming:cable-SW431-P-01', 'sw431:interface:sw411:port', incomingCb[0], incoming);
connect('sw431:incoming:bus-link', incomingCb[1], 'sw431:bus:bar', incoming, [[160, 340]]);
earthBranch('sw431:in:es', 'ES SW431 IN 01', incomingCb[0], [265, 130], incoming, ['ES SW431 IN01']);
uncertainBoundary('sw431:sw411:coverage', 'sw431:interface:sw411:port', 'SW411 source/earth continuation unconfirmed', incoming);

const tieClaim = claim('C1-CROSS-TIE', 'SW431 bar to CB SW435 FD 02 and cable SW431-P-02; cable-side ES SW435 FD 02. Reciprocal SW435 branch is CB SW431 FD 02 / ES SW431 FD 02. Joining the two ends is a provisional construction interpretation; adjacent area retains its own devices.', [['hv', 'C-G / 2-3, SW435 feeder'], ['sw435', 'B-G / 2-3, tier 2 SW431 feeder'], ['overview435', 'SW435 tier 2 and SW431 off-page arrow']], ['C1-R03', 'C1-R07'], 'provisional');
const tieCb = switcher('sw431:sw435:cb', 'CB SW435 FD 02', 'breaker', [1700, 490], tieClaim, ['CB SW435 FD02']);
connect('sw431:sw435:bus-link', 'sw431:bus:bar', tieCb[0], tieClaim, [[1700, 340]]);
earthBranch('sw431:sw435:es', 'ES SW435 FD 02', tieCb[1], [1790, 580], tieClaim, ['ES SW435 FD02']);
add({ id: 'sw431:interface:sw435', label: 'SW435 interface · SW431-P-02', aliases: ['SW431-P-02', 'CB SW431 FD 02 at SW435', 'ES SW431 FD 02 at SW435', '500CBC0002-13015-DR-EL-2353 (disputed reference)'], kind: 'interface', terminals: ['sw431:interface:sw435:port'], conductivePairs: [], positions: [], ...tieClaim }, [1700, 720], [[1700, 720]], 'hv');
connect('sw431:cross-link:cable-SW431-P-02', tieCb[1], 'sw431:interface:sw435:port', tieClaim);
uncertainBoundary('sw431:sw435:coverage', 'sw431:interface:sw435:port', 'SW435 opposite cable end and onward source/earth coverage unconfirmed', tieClaim);
earthBranch('sw431:bus:es', 'ES SW431', 'sw431:bus:bar', [30, 440], claim('C1-BUS-EARTH', 'ES SW431 branches directly from the HV phase bar, distinct from incoming/feeder cable-side earth switches.', [['hv', 'C-E / 5, bus earth'], ['overview', 'SS431 tier 3']], ['C1-R07']));

type TransformerBranch = { tf: string; board: string; x: number; source: 'mc431' | 'sw432' | 'sw437' | 'sw442'; location: string; dual: boolean; tierAliases: string[]; reviews: string[] };
const transformerBranches: TransformerBranch[] = [
  { tf: 'tf431', board: 'mc431', x: 400, source: 'mc431', location: 'A-D / 4-6 transformer and LV incomer; D main bar', dual: false, tierAliases: ['Tier 4'], reviews: ['C1-R01', 'C1-R05', 'C1-R06'] },
  { tf: 'tf432', board: 'sw432', x: 760, source: 'sw432', location: 'A-C / 1-10 transformer, D/Y incomers and separate bars', dual: true, tierAliases: ['Tier 3 in detailed HV sheet', 'Tier 5 in overview'], reviews: ['C1-R02', 'C1-R05'] },
  { tf: 'tf437', board: 'sw437', x: 1120, source: 'sw437', location: 'A-C / 1-10 transformer, D/Y incomers and separate bars', dual: true, tierAliases: ['Tier 6'], reviews: ['C1-R04', 'C1-R05', 'C1-R06'] },
  { tf: 'tf442', board: 'sw442', x: 1480, source: 'sw442', location: 'A-C / 1-10 transformer, D/Y incomers and separate bars', dual: true, tierAliases: ['Tier 7'], reviews: ['C1-R05', 'C1-R06'] },
];
const lvBoundarySpecs: { connectionId: string; remoteAssetId: string; transformerId: string; x: number }[] = [];
const hvBoundarySpecs: { connectionId: string; remoteAssetId: string; terminal: string; x: number }[] = [];

for (const branch of transformerBranches) {
  const tf = branch.tf.toUpperCase(); const board = branch.board.toUpperCase(); const prefix = `sw431:${branch.tf}`;
  const feeder = claim(`C1-${tf}-FEEDER`, `${tf}-P-01 from CB ${tf} FD to ${tf}; cable-side ES ${tf} FD. Terminal roles are construction names; racking states and installed baseline remain unconfirmed.`, [['hv', `C-G, ${tf} feeder and lower power cable`], [branch.source, branch.location]], [...branch.reviews, 'C1-R07']);
  const cb = switcher(`${prefix}:hv-cb`, `CB ${tf} FD`, 'breaker', [branch.x, 490], feeder, branch.tierAliases);
  connect(`${prefix}:bus-link`, 'sw431:bus:bar', cb[0], feeder, [[branch.x, 340]]);
  earthBranch(`${prefix}:hv-es`, `ES ${tf} FD`, cb[1], [branch.x + 85, 580], feeder, branch.tf === 'tf442' ? ['ES TF 442 FD'] : []);
  const transformerId = `${prefix}:transformer`;
  const terminals = [`${prefix}:hv`, ...(branch.dual ? [`${prefix}:lv-d`, `${prefix}:lv-y`] : [`${prefix}:lv`])];
  const winding = claim(`C1-${tf}-TRANSFER`, `Inference: candidate source connectivity from ${tf} HV winding to its ${branch.dual ? 'distinct LV delta/star windings' : 'LV winding'} follows the depicted incoming-to-output supply arrangement. Reverse energisation and source-transfer completeness are unconfirmed. No phase-earth transfer is established; earthPairs is empty with explicit unconfirmed winding coverage.`, [[branch.source, branch.location], ['hv', `G, ${tf}/${board} power references`]], [...branch.reviews, 'C1-R08'], 'provisional');
  const terminalPoints: Point[] = [[branch.x, 690], ...(branch.dual ? [[branch.x - 45, 750], [branch.x + 45, 750]] as Point[] : [[branch.x, 750]] as Point[])];
  add({ id: transformerId, label: `${tf} · ${branch.dual ? 'D/Y LV windings' : '400 V LV winding'}`, aliases: [tf, branch.dual ? '22kV/690V/690V; legacy 720V labels unconfirmed' : '22kV/400V; legacy 415V label unconfirmed'], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...winding }, [branch.x, 720], terminalPoints, 'both');
  overview.rotations![transformerId] = 90; overview.labelOffsets![transformerId] = [0, -55];
  connect(`${prefix}:cable-${tf}-P-01`, cb[1], terminals[0], feeder);
  lvBoundarySpecs.push({ connectionId: `${prefix}:cable-${tf}-P-01`, remoteAssetId: `${prefix}:hv-cb`, transformerId, x: branch.x });
  for (const terminal of terminals) uncertainBoundary(`${terminal}:coverage`, terminal, `${tf} winding source/backfeed and earth-transfer policy unconfirmed`, winding);
  const busEvidence = claim(`C1-${board}-LV-ENDPOINTS`, `${board} ${branch.dual ? 'separate delta/star 690 V phase bars, each after its own named incomer; not a common LV bus' : '400 V phase bar after CB MC431 IN; continuation is the same bus'}. Outgoing LV circuits excluded. Current installation and normal positions unconfirmed.`, [[branch.source, branch.location], ...(branch.board === 'mc431' ? [['mc431Continuation', 'D, same 400 V phase-bar continuation'] as [keyof typeof sources, string]] : branch.board === 'sw437' ? [['sw437Continuation', 'B-C, both phase-bar continuations'] as [keyof typeof sources, string]] : branch.board === 'sw442' ? [['sw442Continuation', 'C, both phase-bar continuations'] as [keyof typeof sources, string]] : [])], branch.reviews);
  for (const [index, suffix] of (branch.dual ? ['d', 'y'] : ['single']).entries()) {
    const lvPrefix = branch.dual ? `sw431:${branch.board}:${suffix}` : `sw431:${branch.board}`;
    const x = branch.x + (branch.dual ? index === 0 ? -80 : 80 : 0);
    const label = `CB ${board} IN${branch.dual ? ` ${suffix.toUpperCase()}` : ''}`;
    const incomer = switcher(`${lvPrefix}:cb`, label, 'breaker', [x, 960], busEvidence, [], 'lv');
    const cableId = `${lvPrefix}:winding-cable`;
    connect(cableId, terminals[index + 1], incomer[0], busEvidence, [[x, 810]]);
    hvBoundarySpecs.push({ connectionId: cableId, remoteAssetId: `${lvPrefix}:cb`, terminal: incomer[0], x });
    const busId = `${lvPrefix}:bus`; const busTerminal = `${busId}:bar`;
    add({ id: busId, label: `${board}${branch.dual ? ` ${suffix === 'd' ? 'Δ' : 'Y'}` : ''} · ${branch.dual ? '690' : '400'} V bus`, aliases: [board, ...(branch.board === 'mc431' ? ['MC431 phase bar; MC431A coverage unresolved'] : [])], kind: 'bus', terminals: [busTerminal], conductivePairs: [], positions: [], ...busEvidence }, [x, 1110], [[x, 1110]], 'lv');
    overview.rotations![busId] = 90; overview.labelOffsets![busId] = [0, 55];
    connect(`${lvPrefix}:incomer-bus`, incomer[1], busTerminal, busEvidence);
  }
}

evidence.push({ id: 'C1-INCOMPLETE-INTERLOCKS', status: 'unresolved', summary: 'Reviewed HV/LV sheets show devices and control/protection references, without complete installed physical-interlock conditions, accepted racking positions or starting configuration. Drawing poses are not owner acceptance. SW437 outgoing CV105/SH105 isolator note does not establish an HV or LV-incomer rule.', references: [{ ...sources.hv, clause: 'Breaker/earth-switch bays and note 1' }, { ...sources.sw437, clause: 'Notes 1-2 at A-B / 11-12; outgoing LV isolators beyond endpoint' }] });
const reviewQuestions: [string, string][] = [
  ['C1-R01', 'MC431A is labelled only in the reviewed overview: confirm its identity, existence and supply route without inventing another directly supplied LV endpoint.'],
  ['C1-R02', 'Resolve TF432 tier 3 in detailed HV sheet versus tier 5 in overview; retain both aliases.'],
  ['C1-R03', 'Resolve the SW435 overview reference 500CBC0002-13015-DR-EL-2353 and confirm reciprocal SW431-P-02 interface identity.'],
  ['C1-R04', 'Resolve SW437 Crushing No.2 body/Crushing No.1 title and SW435 control/CT references versus SW431 power reference; do not create a power route from control lines.'],
  ['C1-R05', 'Resolve 400/415 V and 690/720 V label differences against the accepted source set; no electrical calculation is inferred.'],
  ['C1-R06', 'Owner to confirm the governing source set, installation and baseline; source revision dates/statuses are not acceptance.'],
  ['C1-R07', 'Confirm complete physical interlocks, racking/withdrawal positions and normal starting states; all represented controls remain blocked and positions null.'],
  ['C1-R08', 'Confirm transformer source transfer/backfeed and earth-transfer policies between distinct windings; candidate source pairs remain provisional.'],
];
const reviews: NonNullable<NetworkModel['reviews']> = reviewQuestions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: evidence.filter(record => assets.some(asset => asset.evidenceIds?.includes(record.id) && asset.reviewIds?.includes(id))).map(record => record.id) }));
reviews.find(review => review.id === 'C1-R07')!.evidenceIds.push('C1-INCOMPLETE-INTERLOCKS');
evidence.push({ id: 'C1-DISCREPANCY-SOURCES', status: 'unresolved', summary: 'Overview MC431A, TF432 tier differences, SW437 area/control aliases and legacy voltage labels remain unresolved. These labels are not additional confirmed supply paths.', references: [{ ...sources.overview, clause: 'SS431 panel and TF431 MC431/MC431A labels; TF432 tier 5' }, { ...sources.hv, clause: 'TF432 feeder tier 3 and bus-earth tier 3' }, { ...sources.overview435, clause: 'SW431 off-page reference above SW435 tier 2' }, { ...sources.sw437, clause: 'Body/title and incoming-control references' }, { ...sources.legacy, clause: 'SS431 transformer voltage labels' }] });
for (const review of reviews) review.evidenceIds.push('C1-DISCREPANCY-SOURCES');

const hvLayout = structuredClone(overview);
const lvLayout = structuredClone(overview);
const hvView: DiagramView = { id: 'hv', label: 'SW431 HV · 2353 rev 5', assetIds: hvIds, layout: hvLayout, bounds: [-100, -10, 2000, 940], boundaries: [] };
const lvView: DiagramView = { id: 'lv', label: 'Final LV buses · drawing references in inspection', assetIds: lvIds, layout: lvLayout, bounds: [230, -10, 1420, 700], boundaries: [] };
for (const item of hvBoundarySpecs) {
  hvLayout.terminals[item.terminal] = [item.x, 850];
  hvView.boundaries!.push({ connectionId: item.connectionId, remoteAssetId: item.remoteAssetId, targetViewId: 'lv', position: [item.x, 850] });
}
for (const item of lvBoundarySpecs) {
  const tf = assets.find(asset => asset.id === item.transformerId)!;
  lvLayout.assets[tf.id] = [item.x, 160];
  lvLayout.terminals[tf.terminals[0]] = [item.x, 130];
  tf.terminals.slice(1).forEach((terminal, index) => { lvLayout.terminals[terminal] = [item.x + (tf.terminals.length === 3 ? index === 0 ? -45 : 45 : 0), 190]; });
  const remoteTerminal = assets.find(asset => asset.id === item.remoteAssetId)!.terminals[1];
  lvLayout.terminals[remoteTerminal] = [item.x, 45];
  lvView.boundaries!.push({ connectionId: item.connectionId, remoteAssetId: item.remoteAssetId, targetViewId: 'hv', position: [item.x, 45] });
}
for (const assetId of lvIds.filter(id => !id.endsWith(':transformer'))) {
  const asset = assets.find(asset => asset.id === assetId)!; const [x, oldY] = overview.assets[assetId]; const y = oldY - 580;
  lvLayout.assets[assetId] = [x, y];
  asset.terminals.forEach(terminal => { const [tx, ty] = overview.terminals[terminal]; lvLayout.terminals[terminal] = [tx, ty - 580]; });
}
for (const item of hvBoundarySpecs) lvLayout.bends![item.connectionId] = [[item.x, 250]];

export const crushing1Model: NetworkModel = {
  id: 'site-crushing-1', version: 'construction-2026-10-22.1', name: 'Crushing No. 1 · unconfirmed construction', synthetic: false,
  assets, connections, earths, boundaries, evidence, reviews, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => {
    const lvBranch = transformerBranches.find(branch => asset.id.startsWith(`sw431:${branch.board}:`));
    return { assetId: asset.id, status: 'unresolved', note: 'Unconfirmed installed interlock, racking and normal-state details. The reviewed source does not confirm this control is permitted.', evidence: [{ ...sources[lvBranch?.source ?? 'hv'], clause: lvBranch ? `${lvBranch.location}; complete LV incomer interlock conditions unconfirmed` : 'HV device bays; complete physical interlock conditions unconfirmed' }] };
  }), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Crushing No. 1 overview · provisional', assetIds: assets.map(asset => asset.id), layout: overview, bounds: [-100, -10, 2000, 1280] }, hvView, lvView] },
};
