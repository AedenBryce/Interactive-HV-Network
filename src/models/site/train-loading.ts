import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Role/terminal IDs identify construction records, not printed installed terminal tags.
const documents = {
  hv: { document: '11098-07110-EL-DR-2356.pdf', revision: '5 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  sw452: { document: '11098-07110-EL-DR-2460.pdf', revision: '5 (17/08/09; ISSUED FOR AS-BUILT)', page: 1 },
  sw453: { document: '11098-07110-EL-DR-2468.pdf', revision: '5 (12/08/09; ISSUED FOR AS-BUILT)', page: 1 },
  sw453Continuation: { document: '11098-07110-EL-DR-2469.pdf', revision: '6 (18/11/25; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc451: { document: '11098-07110-EL-DR-2658.pdf', revision: '12A (17/02/26; ISSUED FOR REVIEW - CB25OP003A)', page: 1 },
  mc451Sheet2: { document: '11098-07110-EL-DR-2672.pdf', revision: '7 (13/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  mc451Sheet3: { document: '11098-07110-EL-DR-2673.pdf', revision: '6 (13/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27.10.25; ISSUED FOR USE)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
};
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Evidence = NonNullable<NetworkModel['evidence']>[number];
type SourceRegion = [keyof typeof documents, string];
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const evidence: Evidence[] = [];
const devices: NetworkModel['starting']['devices'] = {};

function fact(id: string, summary: string, refs: SourceRegion[], reviewIds: string[], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, summary, status: knowledge, references: refs.map(([source, clause]) => ({ ...documents[source], clause })) });
  return { knowledge, evidenceIds: [id], reviewIds };
}
function port(id: string, label: string, kind: 'bus' | 'interface', claim: Claim, aliases: string[] = []) {
  const terminal = `${id}:port`;
  assets.push({ id, label, aliases, kind, terminals: [terminal], conductivePairs: [], positions: [], ...claim });
  return terminal;
}
function link(id: string, from: string, to: string, claim: Claim) { connections.push({ id, from, to, ...claim }); }
function unknown(id: string, terminal: string, label: string, claim: Claim) { boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim }); }
function control(id: string, label: string, kind: 'breaker' | 'earth-switch', claim: Claim, aliases: string[] = []): [string, string] {
  const terminals: [string, string] = [`${id}:in`, `${id}:out`];
  assets.push({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim });
  devices[id] = null;
  return terminals;
}
function earthBranch(id: string, label: string, from: string, claim: Claim, aliases: string[] = []) {
  const terminals = control(id, label, 'earth-switch', claim, aliases);
  link(`${id}:branch`, from, terminals[0], claim);
  earths.push({ id: `${id}:earth`, label: `${label} termination`, terminal: terminals[1], ...claim });
}

const incoming = fact('TL-INCOMING', '2356 depicts SW451-P-01 from SW411 entering CB SW451 IN 01, with ES SW451 IN 01 branching on the cable side. 5151 depicts the matching tier-2 feeder. The installed lineup and source availability are unconfirmed.', [['hv', 'A-C / 1-2, SW411 incoming power reference and SW451-P-01'], ['sw411', 'D-G / 2-3, tier 2 SW451 feeder']], ['TL-R01', 'TL-R05', 'TL-R07']);
const upstream = port('sw451:interface:sw411', 'SW411 · SW451-P-01', 'interface', incoming, ['SW451-P-01', 'SW411 tier 2', 'CB SW451 FD 01 at remote end']);
unknown('sw451:incoming:coverage', upstream, 'SW411 source and earth continuation unconfirmed', incoming);
const busClaim = fact('TL-HV-BUS', '2356 depicts one SW451 22 kV phase bar. Drawn device poses do not establish an agreed starting configuration.', [['hv', 'C, horizontal SW451 22 kV phase bar']], ['TL-R01', 'TL-R07', 'TL-R08']);
const bus = port('sw451:bus', 'SW451 · 22 kV bus', 'bus', busClaim, ['SW451']);
const incomingCb = control('sw451:in:cb', 'CB SW451 IN 01', 'breaker', incoming, ['CB SW451 IN01']);
link('sw451:incoming:cable-SW451-P-01', upstream, incomingCb[0], incoming);
link('sw451:incoming:bus-link', incomingCb[1], bus, incoming);
earthBranch('sw451:in:es', 'ES SW451 IN 01', incomingCb[0], incoming, ['ES SW451 IN01']);
const busEarth = fact('TL-BUS-EARTH', '2356 tier 3 depicts a separate phase-bar earth branch ES SW451. The overview calls this ES SW454; the canonical installed tag remains unconfirmed.', [['hv', 'C-E / 3-4, tier 3 direct bus earth'], ['overview', 'E-G / 5-8, SW451 panel tier 3 ES SW454']], ['TL-R02', 'TL-R05']);
earthBranch('sw451:bus:es', 'SW451 bus earth · tag unconfirmed', bus, busEarth, ['ES SW451 (2356)', 'ES SW454 (overview SW451 panel)']);

for (const tier of [2, 6, 7]) {
  const claim = fact(`TL-SPARE-${tier}`, `2356 tier ${tier} is labelled spare with repeated CB SPARE FD and ES SPARE FD tags and an unnamed outgoing arrow. Tier-qualified IDs are construction identities. No active downstream asset or accepted state is established.`, [['hv', `C-G / ${tier === 2 ? '2-3' : '7-10'}, spare tier ${tier}`]], ['TL-R01', 'TL-R05', 'TL-R07']);
  const cb = control(`sw451:spare-${tier}:cb`, `T${tier} · CB SPARE FD`, 'breaker', claim, ['CB SPARE FD', `Tier ${tier}`]);
  link(`sw451:spare-${tier}:bus-link`, bus, cb[0], claim);
  earthBranch(`sw451:spare-${tier}:es`, `T${tier} · ES SPARE FD`, cb[1], claim, ['ES SPARE FD', `Tier ${tier}`]);
  const end = port(`sw451:spare-${tier}:interface`, `T${tier} · spare continuation`, 'interface', claim);
  link(`sw451:spare-${tier}:continuation`, cb[1], end, claim);
  unknown(`sw451:spare-${tier}:coverage`, end, `Tier ${tier} spare continuation and installed status unconfirmed`, claim);
}

for (const [tf, board, dual, source, region] of [
  ['tf451', 'mc451', false, 'mc451', 'A-D / 5-8, TF451 phase route and CB MC451 IN'],
  ['tf452', 'sw452', true, 'sw452', 'A-D / 1-10, TF452 and distinct delta/star incoming phase routes'],
] as const) {
  const tag = tf.toUpperCase(); const boardTag = board.toUpperCase();
  const feeder = fact(`TL-${tag}-FEEDER`, `${tag}-P-01 connects CB ${tag} FD to ${tag}, with cable-side ES ${tag} FD. Control/CT routes are separate from the phase power connection.`, [['hv', `C-G / ${dual ? '5-6' : '4-5'}, ${tag} feeder`], [source, region]], ['TL-R01', 'TL-R05', 'TL-R07']);
  const cb = control(`sw451:${tf}:hv-cb`, `CB ${tag} FD`, 'breaker', feeder);
  link(`sw451:${tf}:bus-link`, bus, cb[0], feeder);
  earthBranch(`sw451:${tf}:hv-es`, `ES ${tag} FD`, cb[1], feeder);
  const transfer = fact(`TL-${tag}-TRANSFER`, `Inference: candidate source transfer follows the depicted ${tag} incoming/output arrangement. ${dual ? 'The delta and star outputs are separate windings.' : 'The LV output feeds MC451.'} Reverse transfer, winding-to-winding behavior and earth transfer are unconfirmed. Neutral/MEN or screen-earth annotations do not establish phase-bus earth continuity.`, [[source, region]], ['TL-R06'], 'provisional');
  const terminals = [`sw451:${tf}:hv`, ...(dual ? [`sw451:${tf}:lv-d`, `sw451:${tf}:lv-y`] : [`sw451:${tf}:lv`])];
  assets.push({ id: `sw451:${tf}`, label: `${tag} · ${dual ? 'D/Y LV windings' : '400 V LV winding'}`, aliases: [tag, dual ? '22kV/690V/690V; 5MVA' : '22kV/400V; 2.0MVA'], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...transfer });
  link(`sw451:${tf}:cable-${tag}-P-01`, cb[1], terminals[0], feeder);
  terminals.forEach(terminal => unknown(`${terminal}:coverage`, terminal, `${tag} winding source/backfeed and earth policy unconfirmed`, transfer));
  const endpoint = fact(`TL-${boardTag}-BUSES`, dual ? '2460 depicts separate 690 V delta and Y phase bars, each after its own named incomer. The SW441/2355 reference belongs to CT/control routes; no alternate SW441 phase feed is established.' : '2658 depicts CB MC451 IN and a 400 V/3000 A phase bar. 2672 continues that bar with a 500 A label, and 2673 bridges it into the MC451B enclosure without a switch symbol. Ratings, source precedence and section identity remain unconfirmed.', [[source, region], ...(dual ? [] : [['mc451Sheet2', 'D / 2-4, 400 V/500 A phase bar and continuation arrows'], ['mc451Sheet3', 'B-C / 4-5, MC451-to-MC451B phase-bar bridge']] as SourceRegion[])], dual ? ['TL-R01', 'TL-R03', 'TL-R05'] : ['TL-R01', 'TL-R04', 'TL-R05']);
  for (const [index, winding] of (dual ? ['d', 'y'] : ['single']).entries()) {
    const prefix = `sw451:${board}${dual ? `:${winding}` : ''}`;
    const lvCb = control(`${prefix}:cb`, `CB ${boardTag} IN${dual ? ` ${winding.toUpperCase()}` : ''}`, 'breaker', endpoint);
    link(`${prefix}:winding-cable`, terminals[index + 1], lvCb[0], endpoint);
    const lvBus = port(`${prefix}:bus`, `${boardTag}${dual ? ` ${winding.toUpperCase()}` : ''} · ${dual ? '690' : '400'} V bus`, 'bus', endpoint, [boardTag, ...(dual ? [winding === 'd' ? 'Delta phase bar' : 'Star phase bar'] : ['3000 A (2658)', '500 A continuation (2672)'])]);
    link(`${prefix}:incomer-bus`, lvCb[1], lvBus, endpoint);
  }
}

const sectionClaim = fact('TL-MC451B-BRIDGE', '2673 depicts the MC451 phase bar continuing into the MC451B enclosure without an intervening switch symbol. It is retained as a connected section interface; whether it needs a separately named final bus endpoint remains unconfirmed. No independent source is established.', [['mc451Sheet3', 'B-C / 4-5, MC451 to MC451B phase-bar bridge'], ['mc451Sheet2', 'D, continuing MC451 phase bar']], ['TL-R04']);
const section = port('sw451:mc451b:section', 'MC451B · section identity unconfirmed', 'interface', sectionClaim, ['MC451B', 'Continuous phase-bar section depicted on 2673']);
link('sw451:mc451:section-bridge', 'sw451:mc451:bus:port', section, sectionClaim);
fact('TL-CROSS-AREA-CLASSIFICATION', '2468 identifies SW453/TF453 main power from SW435/2354 despite train-loading body text and a SW451 CT/control reference. 2469 continues the two SW453 phase bars. These sheets are linked to the Crushing No.2 model and do not create a SW451 power branch. Area/control aliases remain unconfirmed.', [['sw453', 'A / 1 and 4-6, control reference versus TF453 primary power reference; title block'], ['sw453Continuation', 'C, two continued SW453 phase bars; title block'], ['overview', 'A-C / 7-12, SW435 to TF453/SW453']], ['TL-R08'], 'unresolved');

const questions: [string, string][] = [
  ['TL-R01', 'Confirm the governing source set and installed arrangement across as-found, as-built, review and construction issues; dates do not establish precedence.'],
  ['TL-R02', 'Resolve SW451 bus-earth ES SW451 on 2356 versus ES SW454 on the overview.'],
  ['TL-R03', 'Confirm SW441/2355 CT/control reference on 2460 against SW451/2356 primary power reference; no alternate SW441 power feed is represented.'],
  ['TL-R04', 'Resolve MC451 3000 A versus 500 A, MC451B section identity, and missing 2659 reference versus supplied 2672/2673 continuations.'],
  ['TL-R05', 'Confirm supported positions, racking/withdrawal and complete physical interlocks for HV and LV incomers; all current controls remain unresolved and blocked.'],
  ['TL-R06', 'Confirm TF451/TF452 source/backfeed and independent earth policies; phase buses are not earthed by neutral/MEN or screen symbols.'],
  ['TL-R07', 'Confirm every starting position and upstream SW411 source availability. All construction device positions remain null; no local source is invented.'],
  ['TL-R08', 'SW453/TF453 power belongs to the SW435 interface; reconcile train-loading/control aliases with the Crushing No.2 model rather than duplicate the board.'],
];

// Coordinates arrange declared identities only; they do not create electrical connections.
type Point = [number, number];
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
function place(id: string, point: Point) {
  const asset = assets.find(asset => asset.id === id)!;
  const [x, y] = point;
  layout.assets[id] = point;
  if (asset.positions.length) {
    const isEarth = asset.kind === 'earth-switch';
    layout.terminals[asset.terminals[0]] = isEarth ? [x - 30, y] : [x, y - 30];
    layout.terminals[asset.terminals[1]] = isEarth ? [x + 30, y] : [x, y + 30];
    layout.rotations![id] = isEarth ? 0 : 90;
    layout.labelOffsets![id] = isEarth ? [90, 0] : [0, -50];
  } else if (asset.kind === 'transformer') {
    layout.terminals[asset.terminals[0]] = [x, y - 30];
    asset.terminals.slice(1).forEach((terminal, index) => { layout.terminals[terminal] = [x + (asset.terminals.length === 3 ? index === 0 ? -45 : 45 : 0), y + 30]; });
    layout.labelOffsets![id] = [0, -65];
  } else {
    layout.terminals[asset.terminals[0]] = point;
    layout.labelOffsets![id] = [0, 55];
    if (asset.kind === 'bus') layout.rotations![id] = 90;
  }
}
place('sw451:interface:sw411', [70, 70]); place('sw451:in:cb', [70, 230]);
place('sw451:in:es', [190, 150]); place('sw451:bus', [850, 390]); place('sw451:bus:es', [-20, 490]);
for (const [tier, x] of [[2, 310], [6, 1300], [7, 1650]]) {
  place(`sw451:spare-${tier}:cb`, [x, 550]); place(`sw451:spare-${tier}:es`, [x + 100, 670]); place(`sw451:spare-${tier}:interface`, [x, 830]);
}
for (const [tf, x] of [['tf451', 600], ['tf452', 950]] as const) {
  place(`sw451:${tf}:hv-cb`, [x, 550]); place(`sw451:${tf}:hv-es`, [x + 100, 670]); place(`sw451:${tf}`, [x, 810]);
}
for (const [prefix, x] of [['sw451:mc451', 600], ['sw451:sw452:d', 870], ['sw451:sw452:y', 1030]] as const) {
  place(`${prefix}:cb`, [x, 1040]); place(`${prefix}:bus`, [x, 1200]);
}
place('sw451:mc451b:section', [310, 1200]);
for (const connection of connections) {
  const [x, y] = layout.terminals[connection.from]; const [tx, ty] = layout.terminals[connection.to];
  layout.bends![connection.id] = connection.from === bus ? [[tx, y]] : connection.id.endsWith(':branch') ? [[x, ty]] : x !== tx && y !== ty ? [[tx, y + 70]] : [];
}
const transformerIds = ['sw451:tf451', 'sw451:tf452'];
const lvIds = assets.filter(asset => transformerIds.includes(asset.id) || asset.id.startsWith('sw451:mc451') || asset.id.startsWith('sw451:sw452:')).map(asset => asset.id);
const hvIds = assets.filter(asset => !lvIds.includes(asset.id) || transformerIds.includes(asset.id)).map(asset => asset.id);
const hvLayout = structuredClone(layout); const lvLayout = structuredClone(layout);
for (const id of lvIds) {
  const [x, y] = layout.assets[id]; lvLayout.assets[id] = [x, y - 610];
  assets.find(asset => asset.id === id)!.terminals.forEach(terminal => { const [tx, ty] = layout.terminals[terminal]; lvLayout.terminals[terminal] = [tx, ty - 610]; });
}
for (const connection of connections) if (lvIds.some(id => assets.find(asset => asset.id === id)!.terminals.includes(connection.from))) {
  lvLayout.bends![connection.id] = layout.bends![connection.id]?.map(([x, y]) => [x, y - 610]);
}
const hvView: DiagramView = { id: 'hv', label: 'SW451 HV · 2356 rev5', assetIds: hvIds, layout: hvLayout, bounds: [-160, -30, 2100, 1060], boundaries: [] };
const lvView: DiagramView = { id: 'lv', label: 'MC451 and SW452 · final LV buses', assetIds: lvIds, layout: lvLayout, bounds: [180, -30, 1050, 850], boundaries: [] };
for (const connection of connections) {
  const from = assets.find(asset => asset.terminals.includes(connection.from))!;
  const to = assets.find(asset => asset.terminals.includes(connection.to))!;
  if (transformerIds.includes(from.id) && to.positions.length) {
    const [x] = layout.terminals[connection.to]; hvLayout.terminals[connection.to] = [x, 960]; hvLayout.bends![connection.id] = [[x, 910]];
    hvView.boundaries!.push({ connectionId: connection.id, remoteAssetId: to.id, targetViewId: 'lv', position: [x, 960] });
  }
  if (!lvIds.includes(from.id) && transformerIds.includes(to.id)) {
    const [x] = layout.terminals[connection.from]; lvLayout.terminals[connection.from] = [x, 45]; lvLayout.bends![connection.id] = [];
    lvView.boundaries!.push({ connectionId: connection.id, remoteAssetId: from.id, targetViewId: 'hv', position: [x, 45] });
  }
}

export const trainLoadingModel: NetworkModel = {
  id: 'site-train-loading', version: 'construction-2026-10-22.1', name: 'Train loading · unconfirmed construction', synthetic: false,
  assets, connections, sources: [], earths, boundaries, evidence,
  reviews: questions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: evidence.filter(record => assets.some(asset => asset.reviewIds?.includes(id) && asset.evidenceIds?.includes(record.id)) || id === 'TL-R08' && record.id === 'TL-CROSS-AREA-CLASSIFICATION').map(record => record.id) })),
  starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Unconfirmed installed physical interlocks, supported/racking positions and normal configuration. The inspected sheets do not confirm permission.', evidence: [{ ...(asset.id.startsWith('sw451:mc451:') ? documents.mc451 : asset.id.startsWith('sw451:sw452:') ? documents.sw452 : documents.hv), clause: 'Depicted breaker/earth-switch/incomer region; complete interlock conditions unconfirmed' }] })), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Train-loading overview · provisional', assetIds: assets.map(asset => asset.id), layout, bounds: [-160, -30, 2100, 1440] }, hvView, lvView] },
};
