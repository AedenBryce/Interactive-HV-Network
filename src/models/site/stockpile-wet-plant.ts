import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction IDs/terminal roles are not printed terminal tags. Supported means drawn,
// not accepted installation, source availability, interlock conditions or starting state.
const documents = {
  stockpile: { document: '11098-04400-EL-DR-8001.pdf', revision: '5 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  sw456: { document: '11098-04400-EL-DR-8021.pdf', revision: '7 (14/11/25; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  wet: { document: '500CB-04220-DR-EL-0054.pdf', revision: '3 (28.01.25; AS FOUND 23.10.24)', page: 1 },
  wetS2: { document: '500CB-04220-DR-EL-0055.pdf', revision: '3 (25.01.25; AS FOUND 23.10.23)', page: 1 },
  drives: { document: '500CB-04220-DR-EL-0042.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp 27/10/2025)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  mc507: { document: '500CB-04220-DR-EL-0037.pdf', revision: '5 (08.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc507s1: { document: '500CB-04220-DR-EL-0036.pdf', revision: '3 (11/3/13 handwritten; AS BUILT)', page: 1 },
  mc507s3: { document: '500CB-04220-DR-EL-0038.pdf', revision: '6 (08.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc507s4: { document: '500CB-04220-DR-EL-0039.pdf', revision: '4 (08.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc507s5: { document: '500CB-04220-DR-EL-0041.pdf', revision: '5 (08.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc507s6: { document: '500CB-04220-DR-EL-0040.pdf', revision: '8 (08.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc508: { document: '500CB-04220-DR-EL-0045.pdf', revision: '9 (14.10.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc508s1: { document: '500CB-04220-DR-EL-0044.pdf', revision: '5 (21.06.19; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc508s3: { document: '500CB-04220-DR-EL-0046.pdf', revision: '5 (11.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  mc508s4: { document: '500CB-04220-DR-EL-0047.pdf', revision: '8 (11.11.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  sr507earth: { document: '500CB-04220-DR-EL-0052.pdf', revision: '2 (11/3/13 handwritten; AS BUILT)', page: 1 },
  sr508earth: { document: '500CB-04220-DR-EL-0053.pdf', revision: '3 (11/3/13 handwritten; AS BUILT)', page: 1 },
  sw506: { document: '500CB-04220-DR-EL-0060.pdf', revision: '2 (11/3/13 handwritten; AS BUILT)', page: 1 },
  sw506s2: { document: '500CB-04220-DR-EL-0061.pdf', revision: '5 (11.10.25; CV214-EM01 & CV214-EM02 MOTOR UPGRADE TO 110 kW)', page: 1 },
  sw506s3: { document: '500CB-04220-DR-EL-0062.pdf', revision: '3 (revision row 14.10.20; AS BUILT stamp 14/10/2024; discrepancy)', page: 1 },
  sw506s4: { document: '500CB-04220-DR-EL-0063.pdf', revision: 'title 3A / red row 4 (09.05.26; prior row 3 30.08.24; redline CV215 motor upgrade; prior IFC)', page: 1 },
  sw506s5: { document: '500CB-04220-DR-EL-0064.pdf', revision: '6 (30.08.24; ISSUED FOR CONSTRUCTION)', page: 1 },
  cooling: { document: '500CB-04220-DR-EL-0204.pdf', revision: '0 (21.06.19; ISSUED FOR CONSTRUCTION)', page: 1 },
};
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Point = [number, number];
type Group = 'stockpile-hv' | 'wet-hv' | 'final-lv' | 'mv-drives';
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const groups: Record<Group, string[]> = { 'stockpile-hv': [], 'wet-hv': [], 'final-lv': [], 'mv-drives': [] };
function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([document, region]) => ({ ...documents[document], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set(['SW-R01', ...reviewIds])] };
}
function add(asset: Asset, point: Point, terminals: Point[], views: Group[]) {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminals[index]; });
  views.forEach(view => groups[view].push(asset.id));
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim });
  if (bends) layout.bends![id] = bends;
}
function control(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim, reviewIds: [...new Set([...(claim.reviewIds ?? []), 'SW-R07', 'SW-R09'])] }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], views);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminals = control(id, label, 'earth-switch', point, claim, views, aliases);
  layout.rotations![id] = 0; layout.labelOffsets![id] = [0, 65];
  layout.terminals[terminals[0]] = [point[0] - 30, point[1]]; layout.terminals[terminals[1]] = [point[0] + 30, point[1]];
  link(`${id}:branch`, from, terminals[0], claim, [[layout.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminals[1], ...claim });
}
function unknown(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}
const stockpileBus = fact('SW-SW454-BUS', 'SW454 is the single depicted 22kV phase bar; SR454 / lump-stockpile is retained as area alias, not a duplicate board.', [['stockpile', 'C-D, main phase bar'], ['overview', 'C-E / 1-4, SW454 panel']], ['SW-R09']);
const wetBus = fact('SW-SW505-BUS', 'SW505 is one 22kV phase bar continued from 0054 to 0055, not two boards. SR505 / SS505 / wet plant are area aliases.', [['wet', 'C, phase bar and right continuation'], ['wetS2', 'C, continued bar and right end'], ['overview', 'E-G / 1-4, SW505 panel']], ['SW-R09']);
for (const [id, x, claim, group, aliases] of [
  ['sw454:bus', 1000, stockpileBus, 'stockpile-hv', ['SW454', 'SR454', 'Lump stockpile']],
  ['sw505:bus', 3400, wetBus, 'wet-hv', ['SW505', 'SR505', 'SS505', 'Wet plant']],
] as const) {
  add({ id, label: `${id.startsWith('sw454') ? 'SW454' : 'SW505'}\n22 kV HV bus`, aliases: [...aliases], kind: 'bus', terminals: [`${id}:bar`], conductivePairs: [], positions: [], ...claim }, [x, 340], [[x, 340]], [group]);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -45];
}
const incoming = fact('SW-INCOMING', 'SW454-P-01 enters CB SW454 IN 01 from SW411 tier1; ES SW454 IN 01 is on the incoming cable side. SW411 upstream breaker/earth switch remain in the main-switchroom package. No source availability or accepted starting pose is established.', [['stockpile', 'A-D / 1-2, incomer'], ['sw411', 'D-G / 1-2, tier1 CB/ES SW454 FD 01'], ['overview', 'B / 1 and route to SW454']], ['SW-R07', 'SW-R09']);
add({ id: 'sw454:interface:sw411', label: 'SW411 interface\nSW454-P-01', aliases: ['SW454-P-01', 'SW411 tier 1', 'CB SW454 FD 01 at SW411', 'CB SW454 FD01', 'ES SW454 FD 01 at SW411', 'ES SW454 FD01'], kind: 'interface', terminals: ['sw454:interface:sw411:port'], conductivePairs: [], positions: [], ...incoming }, [160, 60], [[160, 60]], ['stockpile-hv']);
const incomingCb = control('sw454:in:cb', 'CB SW454 IN 01', 'breaker', [160, 220], incoming, ['stockpile-hv'], ['CB SW454 IN01', 'CB SW454 IN']);
link('sw454:incoming:cable-SW454-P-01', 'sw454:interface:sw411:port', incomingCb[0], incoming);
link('sw454:incoming:bus-link', incomingCb[1], 'sw454:bus:bar', incoming, [[160, 340]]);
earthBranch('sw454:in:es', 'ES SW454 IN 01', incomingCb[0], [265, 130], incoming, ['stockpile-hv'], ['ES SW454 IN01']);
unknown('sw454:sw411:coverage', 'sw454:interface:sw411:port', 'Unconfirmed SW411 source/earth continuation and availability', incoming);
earthBranch('sw454:bus:es', 'ES SW454\nBus earth · tier 3', 'sw454:bus:bar', [60, 450], fact('SW-SW454-BUS-EARTH', 'ES SW454 branches directly from the SW454 phase bar, distinct from cable-side switches.', [['stockpile', 'C-E / 4, tier3'], ['overview', 'SW454 tier3']], ['SW-R07']), ['stockpile-hv'], ['ES SW454', 'Tier 3']);

const cross = fact('SW-SW505-CABLE', 'SW454 CB SW505 FD and outgoing-side ES SW505 FD feed the same SW505-P-01 named at the SW505 incoming CB SW505 IN 01; ES SW505 IN 01 is on its incoming side. One cable connection carries both source references, without duplicate off-page equipment.', [['stockpile', 'C-G / 9-10, tier6 SW505 feeder'], ['wet', 'A-C / 1-2, SW454 reference and SW505 incomer']], ['SW-R07', 'SW-R09']);
const crossCb = control('sw454:sw505:cb', 'CB SW505 FD\nSW454 tier 6', 'breaker', [1800, 490], cross, ['stockpile-hv'], ['CB SW505 FD']);
link('sw454:sw505:bus-link', 'sw454:bus:bar', crossCb[0], cross, [[1800, 340]]);
earthBranch('sw454:sw505:es', 'ES SW505 FD', crossCb[1], [1895, 585], cross, ['stockpile-hv'], ['ES SW505 FD']);
const wetCb = control('sw505:in:cb', 'CB SW505 IN 01', 'breaker', [2100, 220], cross, ['wet-hv'], ['CB SW505 IN01']);
link('sw454:sw505:cable-SW505-P-01', crossCb[1], wetCb[0], cross, [[1800, 60], [2100, 60]]);
link('sw505:incoming:bus-link', wetCb[1], 'sw505:bus:bar', cross, [[2100, 340]]);
earthBranch('sw505:in:es', 'ES SW505 IN 01', wetCb[0], [2205, 130], cross, ['wet-hv'], ['ES SW505 IN01']);
const wetEarth = fact('SW-SW505-BUS-EARTH', 'The detailed direct bus-earth tag is ES SWXXX; overview uses ES SW505 for the corresponding tier2 branch. Identity is provisional; no accepted tag precedence.', [['wet', 'C-E / 3-4, tier2 bus-earth column'], ['overview', 'SW505 tier2 ES SW505']], ['SW-R02', 'SW-R07'], 'provisional');
earthBranch('sw505:bus:es', 'ES SWXXX / ES SW505\nBus earth · tag unconfirmed', 'sw505:bus:bar', [2010, 450], wetEarth, ['wet-hv'], ['ES SWXXX', 'ES SW505', 'Tier 2']);

function feeder(board: 'sw454' | 'sw505', tf: string, x: number, claim: Claim) {
  const group: Group = board === 'sw454' ? 'stockpile-hv' : 'wet-hv'; const prefix = `${board}:${tf.toLowerCase()}`;
  const cb = control(`${prefix}:hv-cb`, `CB ${tf} FD`, 'breaker', [x, 490], claim, [group], [`CB ${tf} FD`]);
  link(`${prefix}:bus-link`, `${board}:bus:bar`, cb[0], claim, [[x, 340]]);
  earthBranch(`${prefix}:hv-es`, `ES ${tf} FD`, cb[1], [x + 90, 585], claim, [group], [`ES ${tf} FD`]);
  return cb;
}
function transformer(board: 'sw454' | 'sw505', tf: string, x: number, label: string, outputs: string[], feederTerminal: string, claim: Claim, transferLocations: [keyof typeof documents, string][], reviewIds: string[], views: Group[], aliases: string[] = []) {
  const prefix = `${board}:${tf.toLowerCase()}`; const terminals = [`${prefix}:hv`, ...outputs.map(output => `${prefix}:${output}`)];
  const transfer = fact(`SW-${tf}-TRANSFER`, `Inference: provisional bidirectional source pairs follow the depicted ${tf} HV-to-output supply arrangement. Backfeed, secondary-to-secondary transfer and complete installed winding policy remain unconfirmed. Earth pairs are empty with explicit unknown winding coverage, not confirmation of no transfer. Neutral/MEN and screen earth do not create a phase-earth connection.`, transferLocations, [...reviewIds, 'SW-R08'], 'provisional');
  add({ id: `${prefix}:transformer`, label: `${tf}\n${label}\nTransfer unconfirmed`, aliases: [tf, ...aliases], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(output => [terminals[0], output]), earthPairs: [], positions: [], ...transfer }, [x, 735], [[x, 705], ...outputs.map((_, index): Point => [x + (outputs.length === 2 ? index === 0 ? -45 : 45 : 0), 765])], views);
  layout.rotations![`${prefix}:transformer`] = 90; layout.labelOffsets![`${prefix}:transformer`] = [0, -55];
  link(`${prefix}:cable-${tf}-P-01`, feederTerminal, terminals[0], claim);
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${tf} winding source/backfeed and earth coverage unconfirmed`, transfer);
  return terminals;
}
const lvEndpoints: { transformerId: string; cbId: string; busId: string; cableId: string; offset: number; fuseId?: string }[] = [];
const lvTransformerIds: string[] = [];
const branchDefinitions = [
  { board: 'sw454', tf: 'TF454', endpoint: 'MC454 / MC455', x: 450, detail: 'stockpile', tier: 2, dual: false, missing: true, rating: '22 kV / 400 V · LV detail missing', region: 'C-G / 2-3, TF454 → MC454 reference 8010', reviews: ['SW-R04'] },
  { board: 'sw454', tf: 'TF455', endpoint: 'SW455', x: 900, detail: 'stockpile', tier: 4, dual: true, missing: true, rating: '22 kV / 690 V / 690 V · detail missing', region: 'C-G / 5-6, TF455 → SW455 reference 8020', reviews: ['SW-R05'] },
  { board: 'sw454', tf: 'TF456', endpoint: 'SW456', x: 1350, detail: 'sw456', tier: 5, dual: true, missing: false, rating: '22 kV / 690 V / 690 V · 5 MVA', region: 'A-D, transformer A / 5-6; D/Y incomers A-C / 1-10; two phase bars C-D', reviews: [] },
  { board: 'sw505', tf: 'TF506', endpoint: 'SW506', x: 2500, detail: 'sw506', tier: 8, dual: true, missing: false, rating: '690/720 V labels disputed · 5/2.5/2.5 MVA', region: 'A-C / 1-10, transformer A / 5-7; D/Y incomers and two 690V bars', reviews: ['SW-R03', 'SW-R10'] },
  { board: 'sw505', tf: 'TF507', endpoint: 'MC507', x: 2900, detail: 'mc507', tier: 7, dual: false, missing: false, rating: '22 kV / 400 V · 2.0 MVA', region: 'A-D / 5-8, TF507, phase fuse/incomer and 400V main bar', reviews: [] },
  { board: 'sw505', tf: 'TF508', endpoint: 'MC508', x: 3300, detail: 'mc508', tier: 6, dual: false, missing: false, rating: '22 kV / 400 V · 2.0 MVA', region: 'A-D / 5-8, TF508, phase fuse/incomer and 400V main bar', reviews: [] },
] satisfies { board: 'sw454' | 'sw505'; tf: string; endpoint: string; x: number; detail: keyof typeof documents; tier: number; dual: boolean; missing: boolean; rating: string; region: string; reviews: string[] }[];
for (const branch of branchDefinitions) {
  const group: Group = branch.board === 'sw454' ? 'stockpile-hv' : 'wet-hv';
  const mainSheet = branch.board === 'sw454' ? 'stockpile' : 'wet';
  const feederClaim = fact(`SW-${branch.tf}-FEEDER`, `${branch.tf}-P-01 follows CB ${branch.tf} FD and its cable-side ES ${branch.tf} FD. ${branch.endpoint} output reference is retained. Control/CT references are not power paths.`, [[mainSheet, `C-G, tier${branch.tier} ${branch.tf} feeder`], [branch.detail, branch.region]], [...branch.reviews, 'SW-R07', 'SW-R09']);
  const cb = feeder(branch.board, branch.tf, branch.x, feederClaim);
  const tfId = `${branch.board}:${branch.tf.toLowerCase()}:transformer`;
  const terminals = transformer(branch.board, branch.tf, branch.x, branch.rating, branch.dual ? ['lv-d', 'lv-y'] : ['lv'], cb[1], feederClaim, [[mainSheet, `G, ${branch.tf} output reference`], [branch.detail, branch.region]], branch.reviews, branch.missing ? [group] : [group, 'final-lv'], branch.tf === 'TF506' ? ['22kV/690V/690V on 0054', '22kV/720V/720V on 0060'] : []);
  if (branch.missing) {
    const mc = branch.tf === 'TF454'; const interfaceId = mc ? 'sw454:interface:mc454-mc455' : 'sw454:interface:sw455';
    const ports = mc ? [`${interfaceId}:port`] : [`${interfaceId}:d`, `${interfaceId}:y`];
    const gap = fact(`SW-${branch.tf}-MISSING-LV`, mc ? '8001 names TF454 → MC454 and absent 8010; overview names MC454 and MC455. Unconfirmed whether MC455 is another bus, alias or downstream board; this is one coverage interface without an invented bus/incomer.' : '8001 and overview name TF455 → SW455. Missing 8020 prevents confirming LV incomer identities and exact bus arrangement. Two winding continuations are retained as unconnected interface ports, not manufactured buses.', [['stockpile', branch.region], ['overview', `C-E / 1-4, ${branch.tf} and ${branch.endpoint}`]], branch.reviews, 'provisional');
    add({ id: interfaceId, label: `${branch.endpoint}\nLV detail unconfirmed`, aliases: mc ? ['MC454', 'MC455', 'Missing 04400-EL-DR-8010 / 8011'] : ['SW455', 'Missing 04400-EL-DR-8020'], kind: 'interface', terminals: ports, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...gap }, [branch.x, 1100], ports.map((_, index): Point => [branch.x + (ports.length === 2 ? index === 0 ? -45 : 45 : 0), 1060]), [group]);
    ports.forEach((port, index) => { link(`${interfaceId}:winding-${index + 1}`, terminals[index + 1], port, gap); unknown(`${port}:coverage`, port, `${branch.endpoint} LV arrangement/coverage unconfirmed`, gap); });
    continue;
  }
  lvTransformerIds.push(tfId);
  const locations: [keyof typeof documents, string][] = [[branch.detail, branch.region]];
  if (branch.tf === 'TF506') locations.push(['sw506s2', 'B-C, separate D/Y bar continuations; SH213 caution'], ['sw506s3', 'B-C, D/Y continuations; revision-row/stamp dates differ'], ['sw506s4', 'B-C, D/Y continuations; title 3A/red row 4 discrepancy'], ['sw506s5', 'B-C, two bars end at right']);
  if (branch.tf === 'TF507') locations.push(['mc507s1', 'C-D, same 400V bar'], ['mc507s3', 'C-D, continued bar'], ['mc507s4', 'C-D, continued bar'], ['mc507s5', 'C-D, continued bar'], ['mc507s6', 'C-D, bar ends at right']);
  if (branch.tf === 'TF508') locations.push(['mc508s1', 'C-D, same 400V bar'], ['mc508s3', 'C-D, continued bar'], ['mc508s4', 'C-D, bar ends at right']);
  const endpoint = fact(`SW-${branch.endpoint}-LV-ENDPOINTS`, `${branch.endpoint} ${branch.dual ? 'has two separately marked D/Y 690V phase bars after independent named incomers' : 'has one 400V phase bar after its named incomer'}. Page continuations do not create extra buses. No outgoing LV circuits are expanded. Installation and interlocks remain unconfirmed.`, locations, [...branch.reviews, 'SW-R07', 'SW-R09']);
  for (const [index, suffix] of (branch.dual ? ['d', 'y'] : ['single']).entries()) {
    const prefix = `${branch.board}:${branch.endpoint.toLowerCase()}${branch.dual ? `:${suffix}` : ''}`;
    const offset = branch.dual ? index === 0 ? -100 : 100 : 0; const x = branch.x + offset;
    let from = terminals[index + 1]; let fuseId: string | undefined;
    if (!branch.dual) {
      fuseId = `${prefix}:phase-fuse`; const pair: [string, string] = [`${fuseId}:in`, `${fuseId}:out`];
      const fuse = fact(`SW-${branch.endpoint}-PHASE-FUSE`, `The drawn 3000A phase fuse arrangement is retained before CB ${branch.endpoint} IN. Candidate intact continuity is provisional; fuse condition/removal states remain unconfirmed.`, [[branch.detail, 'C-D / 5-8, phase fuse arrangement above incoming breaker']], ['SW-R09'], 'provisional');
      add({ id: fuseId, label: '3000 A phase fuse\nContinuity unconfirmed', aliases: ['3000A fuse arrangement'], kind: 'interface', terminals: pair, conductivePairs: [[...pair]], positions: [], ...fuse }, [x, 870], [[x, 850], [x, 890]], ['final-lv']);
      link(`${prefix}:winding-fuse`, from, pair[0], endpoint); from = pair[1];
    }
    const cbId = `${prefix}:cb`; const incomer = control(cbId, `CB ${branch.endpoint} IN${branch.dual ? ` ${suffix.toUpperCase()}` : ''}`, 'breaker', [x, 980], endpoint, ['final-lv'], [`CB ${branch.endpoint} IN${branch.dual ? ` ${suffix.toUpperCase()}` : ''}`]);
    const cableId = `${prefix}:winding-cable`;
    link(cableId, from, incomer[0], endpoint, [[x, 820]]);
    const busId = `${prefix}:bus`; const port = `${busId}:bar`;
    add({ id: busId, label: `${branch.endpoint}${branch.dual ? ` ${suffix === 'd' ? 'Δ' : 'Y'}` : ''}\n${branch.dual ? '690' : '400'} V final LV bus`, aliases: [branch.endpoint, ...(branch.dual ? [`${branch.endpoint}-P-0${index + 1}-1...-${branch.tf === 'TF456' ? '5' : '4'}`] : [])], kind: 'bus', terminals: [port], conductivePairs: [], positions: [], ...endpoint }, [x, 1150], [[x, 1150]], ['final-lv']);
    layout.rotations![busId] = 90; layout.labelOffsets![busId] = [0, 65];
    link(`${prefix}:incomer-bus`, incomer[1], port, endpoint);
    lvEndpoints.push({ transformerId: tfId, cbId, busId, cableId, offset, fuseId });
  }
}

evidence.push({ id: 'SW-INCHING-INTERLOCK', status: 'supported', summary: '0055 explicitly marks INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR for each TF505A/B/C feeder assembly. It is inching, not incoming. Complete conditions, key identities, operating sequence and affected controls are unconfirmed; this is not an executable permissive rule.', references: [{ ...documents.wetS2, clause: 'D-F / 3-8, dotted interlock arrows associated with TF505A/B/C feeders' }] });
for (const [letter, driveNumber, x, motorTag, columns] of [
  ['A', '01', 3700, 'SB214-EM01', '2-4'], ['B', '02', 4120, 'SB215-EM01', '5-7'], ['C', '03', 4540, 'SB216-EM01', '8-10'],
] as const) {
  const tf = `TF505${letter}`; const drive = `VS505${driveNumber}`; const prefix = `sw505:${drive.toLowerCase()}`;
  const depicted = fact(`SW-${tf}-DRIVE-FEEDER`, `${tf}-P-01 follows CB ${tf} FD and cable-side ES ${tf} FD to ${tf}. The feeder's inching-drive local-isolator interlock reference is explicit, while its complete conditions remain unconfirmed.`, [['wetS2', `C-G / ${columns}, ${tf} feeder and inching interlock`], ['drives', `A-C / ${columns}, ${tf} power input`]], ['SW-R06', 'SW-R07', 'SW-R09']);
  const feederClaim = { ...depicted, evidenceIds: [...(depicted.evidenceIds ?? []), 'SW-INCHING-INTERLOCK'] };
  const cb = feeder('sw505', tf, x, feederClaim);
  const winding = transformer('sw505', tf, x, '22 kV / 1.9 kV / 1.9 kV · 1.75 MVA', ['mv-d', 'mv-y'], cb[1], feederClaim, [['drives', `A-C / ${columns}, three windings and screen earth`]], ['SW-R06'], ['wet-hv', 'mv-drives'], ['1.9kV/1.9kV MV winding outputs; not final LV buses']);
  const converter = fact(`SW-${drive}-CONVERTER`, `${drive} ACS1013-A3-R / ERS505${driveNumber} has two AC rectifier inputs, DC section and inverter output. No metallic AC/DC/output shortcut or reverse/earth relationship is established. Vendor reference 3BHS355813E01 is absent. Endpoint scope, stored-energy and converter policy remain unconfirmed.`, [['drives', `C-F / ${columns}, ${drive} rectifier/DC/inverter enclosure and vendor reference`]], ['SW-R06', 'SW-R08'], 'unresolved');
  const ports = [`${prefix}:ac-d`, `${prefix}:ac-y`, `${prefix}:dc`, `${prefix}:output`];
  add({ id: `${prefix}:converter`, label: `${drive}\nAC / DC / output\nRelationships unconfirmed`, aliases: [drive, `ERS505${driveNumber}`, 'ACS1013-A3-R', 'ABB 3BHS355813E01 missing'], kind: 'interface', terminals: ports, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...converter }, [x, 1060], [[x - 50, 1015], [x + 50, 1015], [x + 75, 1060], [x, 1110]], ['mv-drives']);
  layout.labelOffsets![`${prefix}:converter`] = [-150, 0];
  const ac = fact(`SW-${drive}-AC-CABLES`, `The two distinct ${tf} 1.9kV winding outputs feed ${drive}'s separate AC rectifier inputs via ${drive}-P-01 and ${drive}-P-02. Auxiliary 400VAC/230VAC, control and PROFIBUS lines are not main-power edges.`, [['drives', `C-E / ${columns}, ${drive}-P-01/-02 and rectifier inputs`]], ['SW-R06']);
  link(`${prefix}:ac-d-cable`, winding[1], ports[0], ac); link(`${prefix}:ac-y-cable`, winding[2], ports[1], ac);
  for (const port of ports) unknown(`${port}:coverage`, port, `${drive} converter source/earth relationship and boundary unconfirmed`, converter);
  const contacts = fact(`SW-${drive}-CONTACTS`, `${drive} shows a labelled DC BUS EARTHING SWITCH and an untagged series output-switch symbol before ${motorTag}. IDs are construction identifiers; exact tags, full position sets, converter/DC earthing conditions and physical interlocks are unconfirmed.`, [['drives', `E-F / ${columns}, DC BUS EARTHING SWITCH and output switch below inverter`]], ['SW-R06', 'SW-R07', 'SW-R09']);
  earthBranch(`${prefix}:dc-earth`, `${drive}\nDC earth`, ports[2], [x + 100, 1170], contacts, ['mv-drives'], ['DC BUS EARTHING SWITCH', `${drive} internal DC earth; no printed unique tag`]);
  layout.labelOffsets![`${prefix}:dc-earth`] = [100, 0];
  const output = control(`${prefix}:output-switch`, `${drive}\nOutput contact`, 'disconnector', [x, 1300], contacts, ['mv-drives'], ['Untagged output switch below inverter', `Before ${motorTag}`]);
  layout.labelOffsets![`${prefix}:output-switch`] = [0, 65];
  link(`${prefix}:inverter-output-contact`, ports[3], output[0], contacts);
  const motor = fact(`SW-${drive}-MOTOR`, `${motorTag} Scrubber No.${Number(driveNumber)} motor is labelled 1600kW below the drive output switch. Motor voltage and final scope boundary are unconfirmed; this is an explicit MV-drive interface, not an LV bus endpoint.`, [['drives', `F-G / ${columns}, ${motorTag} motor and 1600kW label`]], ['SW-R06']);
  const motorId = `sw505:${motorTag.toLowerCase()}`; const port = `${motorId}:port`;
  add({ id: motorId, label: `${motorTag}\nScrubber ${Number(driveNumber)} · 1600 kW\nScope unconfirmed`, aliases: [motorTag, `${drive} motor`], kind: 'interface', terminals: [port], conductivePairs: [], positions: [], ...motor }, [x, 1490], [[x, 1490]], ['mv-drives']);
  link(`${prefix}:motor-power-cable`, output[1], port, motor);
  unknown(`${motorId}:coverage`, port, `${motorTag} MV-drive endpoint and remaining coverage unconfirmed`, motor);
}

evidence.push({ id: 'SW-PHASE-EARTH-BOUNDARY', status: 'supported', summary: 'MC507/MC508 neutral bars, MEN links, MCC earth bars and equipment bonds are separate from their phase main bars. Screens and earthing SLDs do not establish phase-earth or universal winding continuity. No phase-earth connection is manufactured from these annotations.', references: [{ ...documents.mc507, clause: 'C-D / 6-8, neutral/MEN branch separate from phase incomer route' }, { ...documents.mc508, clause: 'C-D / 6-8, neutral/MEN branch' }, { ...documents.sr507earth, clause: 'SR507 bonds and MC507 earth bar' }, { ...documents.sr508earth, clause: 'SR508 bonds and MC508 earth bar' }, { ...documents.drives, clause: 'B-C, transformer screen-earth symbols' }] });
evidence.push({ id: 'SW-OUTGOING-SCOPE', status: 'supported', summary: '0064 note 1 describes the outgoing SH213-ISOL01 shuttle key-A isolation interlock; it is beyond the final LV bus, not an upstream incomer rule. CL201-MP01 cooling-water panel and outgoing 400/690V motor/auxiliary/control circuits are beyond the agreed endpoint boundary.', references: [{ ...documents.sw506s5, clause: 'A / 11-12, note 1; SH213-ISOL01 outgoing branch' }, { ...documents.cooling, clause: 'CL201-MP01 supplied downstream of MC508 400V bar' }] });
evidence.push({ id: 'SW-INTERLOCK-GAPS', status: 'unresolved', summary: 'Complete installed interlocks, withdrawal/contact positions and baseline remain unconfirmed. Overview notes 1-2 direct isolation work to detailed SLDs, HV programs and key-interlocking procedures. Missing rules or drawn poses do not establish permission or source availability.', references: [{ ...documents.stockpile, clause: 'HV device assemblies' }, { ...documents.wet, clause: 'HV device assemblies' }, { ...documents.wetS2, clause: 'TF505 feeder assemblies; inching-drive interlock reference' }, { ...documents.overview, clause: 'Lower-left notes 1-2' }] });

const reviewQuestions: [string, string][] = [
  ['SW-R01', 'Confirm which supplied revisions describe the installation; preserve AS FOUND, AS BUILT, construction, redline and project-caution statuses without silent precedence.'],
  ['SW-R02', 'Confirm SW505 bus-earth canonical tag: ES SWXXX on 0054 versus ES SW505 in overview.'],
  ['SW-R03', 'Resolve TF506 690/690V on 0054 versus 720/720V on 0060 while final bars are labelled 690V.'],
  ['SW-R04', 'Confirm MC454/MC455 identity, LV incomers/buses and arrangement; 8010/8011 details are absent.'],
  ['SW-R05', 'Confirm SW455 exact incomer and LV bus arrangement; detailed 8020 sheet is absent.'],
  ['SW-R06', 'Confirm boundary and representation for TF505A/B/C 1.9kV drives VS50501/502/503, converter transfers, DC earths and output contacts; missing ABB vendor drawing 3BHS355813E01.'],
  ['SW-R07', 'Confirm inching-drive local-isolator interlock conditions, keys, prerequisite positions and affected set; also confirm physical interlocks/positions for every other represented control.'],
  ['SW-R08', 'Confirm transformer source/backfeed and independent earth relationships for all represented windings; no universal phase-earth transfer is established.'],
  ['SW-R09', 'Confirm all starting positions and source availability through SW411 → SW454 → SW505; no starting configuration is accepted.'],
  ['SW-R10', 'Resolve 0062 revision-row date 14.10.20 versus AS BUILT stamp 14/10/2024, and 0063 title 3A versus red revision-row 4 dated 09.05.26.'],
];
const reviews: NonNullable<NetworkModel['reviews']> = reviewQuestions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: evidence.map(record => record.id) }));

const lvLayout = structuredClone(layout);
for (const [index, transformerId] of lvTransformerIds.entries()) {
  const tf = assets.find(asset => asset.id === transformerId)!; const x = 300 + index * 600;
  lvLayout.assets[tf.id] = [x, 180]; lvLayout.terminals[tf.terminals[0]] = [x, 150];
  tf.terminals.slice(1).forEach((terminal, output) => { lvLayout.terminals[terminal] = [x + (tf.terminals.length === 3 ? output === 0 ? -45 : 45 : 0), 210]; });
  const incomingCable = connections.find(connection => connection.to === tf.terminals[0])!;
  lvLayout.terminals[incomingCable.from] = [x, 30];
  for (const endpoint of lvEndpoints.filter(item => item.transformerId === tf.id)) {
    const ex = x + endpoint.offset; const cb = assets.find(asset => asset.id === endpoint.cbId)!;
    lvLayout.assets[cb.id] = [ex, 440]; lvLayout.terminals[cb.terminals[0]] = [ex, 410]; lvLayout.terminals[cb.terminals[1]] = [ex, 470];
    lvLayout.assets[endpoint.busId] = [ex, 610]; lvLayout.terminals[`${endpoint.busId}:bar`] = [ex, 610];
    lvLayout.bends![endpoint.cableId] = [[ex, 320]];
    if (endpoint.fuseId) {
      const fuse = assets.find(asset => asset.id === endpoint.fuseId)!;
      lvLayout.assets[fuse.id] = [ex, 305]; lvLayout.terminals[fuse.terminals[0]] = [ex, 285]; lvLayout.terminals[fuse.terminals[1]] = [ex, 325];
      lvLayout.labelOffsets![fuse.id] = [150, 0];
      lvLayout.bends![endpoint.cableId] = [];
    }
  }
}
const viewDefinitions: { id: Group; label: string; bounds: DiagramView['bounds']; layout: DiagramLayout }[] = [
  { id: 'stockpile-hv', label: 'SW454 stockpile · 8001 rev5', bounds: [-100, -20, 2240, 1320], layout: structuredClone(layout) },
  { id: 'wet-hv', label: 'SW505 wet plant · 0054/0055 rev3', bounds: [1900, -20, 2900, 1000], layout: structuredClone(layout) },
  { id: 'final-lv', label: 'Final LV buses · six evidenced endpoints', bounds: [50, -40, 2300, 850], layout: lvLayout },
  { id: 'mv-drives', label: '1.9 kV scrubber drives · unresolved scope', bounds: [3500, 540, 1300, 1140], layout: structuredClone(layout) },
];
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const detailViews: DiagramView[] = viewDefinitions.map(definition => {
  const visible = new Set(groups[definition.id]); const view: DiagramView = { ...definition, assetIds: [...visible], boundaries: [] }; const portals = new Map<string, Point>();
  for (const connection of connections) {
    const fromVisible = visible.has(owners.get(connection.from)!); const toVisible = visible.has(owners.get(connection.to)!);
    if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!; const [x, y] = view.layout.terminals[local]; const [rx, ry] = view.layout.terminals[remote];
    let point: Point = portals.get(remote) ?? (Math.abs(rx - x) > Math.abs(ry - y) ? [x + Math.sign(rx - x) * 100, y] : [x, y + (Math.sign(ry - y) || -1) * 100]);
    if (connection.id === 'sw454:sw505:cable-SW505-P-01') point = definition.id === 'stockpile-hv' ? [1800, 870] : [2100, 30];
    portals.set(remote, point); view.layout.terminals[remote] = point; view.layout.bends![connection.id] = [];
    const targetViewId = viewDefinitions.find(candidate => candidate.id !== definition.id && groups[candidate.id].includes(remoteAssetId))?.id ?? 'overview';
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId, position: point });
  }
  return view;
});
const allLvView = detailViews.find(view => view.id === 'final-lv')!;
for (const [id, label, first, bounds] of [
  ['lv-dual-windings', 'LV detail · SW456 / SW506', 0, [50, -40, 1250, 850]],
  ['lv-mccs', 'LV detail · MC507 / MC508', 2, [1250, -40, 1250, 850]],
] as const) {
  const transformerIds = lvTransformerIds.slice(first, first + 2);
  const ids = [...transformerIds, ...lvEndpoints.filter(endpoint => transformerIds.includes(endpoint.transformerId)).flatMap(endpoint => [endpoint.cbId, endpoint.busId, ...(endpoint.fuseId ? [endpoint.fuseId] : [])])];
  const visible = new Set(ids);
  detailViews.push({ id, label, assetIds: ids, bounds: [...bounds], layout: lvLayout, boundaries: allLvView.boundaries!.filter(boundary => {
    const connection = connections.find(item => item.id === boundary.connectionId)!;
    return visible.has(owners.get(connection.from)!) || visible.has(owners.get(connection.to)!);
  }) });
}
export const stockpileWetPlantModel: NetworkModel = {
  id: 'site-stockpile-wet-plant', version: 'construction-2026-10-22.3', name: 'Stockpile / wet plant · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, earths, boundaries, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => {
    const lv = branchDefinitions.find(branch => asset.id.startsWith(`${branch.board}:${branch.endpoint.toLowerCase()}:`));
    const driveFeeder = /^sw505:tf505[abc]:/.test(asset.id); const driveContact = /^sw505:vs5050[123]:/.test(asset.id);
    const document = lv ? documents[lv.detail] : driveFeeder ? documents.wetS2 : driveContact ? documents.drives : asset.id.startsWith('sw454:') ? documents.stockpile : documents.wet;
    return { assetId: asset.id, status: 'unresolved', note: driveFeeder ? 'Explicit INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR; conditions, keys, full affected set and permitted transitions unconfirmed. Baseline remains null.' : 'Physical interlocks, full positions and baseline are unconfirmed. The source does not confirm this control is permitted.', evidence: [{ ...document, clause: lv ? lv.region : driveFeeder ? 'D-F / 3-8, inching-drive local-isolator interlock reference' : driveContact ? 'E-F, DC-earth and untagged output-switch symbols; complete conditions unconfirmed' : 'Represented device bay; complete physical-interlock conditions unconfirmed' }] };
  }), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Stockpile / wet plant overview · provisional', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -20, 4950, 1740] }, ...detailViews] },
};
