import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// IDs and terminal roles are construction names, not printed terminal tags.
// Supported means drawn. Installed arrangement, baseline and operating permission remain unconfirmed.
const documents = {
  rm721: { document: '11098-07110-EL-DR-2256.pdf', revision: '3 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  rm712: { document: '11098-07110-EL-DR-2253.pdf', revision: '3 (22.02.08; RE-ISSUED FOR CONSTRUCTION)', page: 1 },
  rm713: { document: '11098-07110-EL-DR-2254.pdf', revision: '1 (21.02.08; RM713 WAS SUPPLIED FROM RM712)', page: 1 },
  rm714: { document: '11098-07110-EL-DR-2255.pdf', revision: '1 (25.09.09; ISSUED FOR AS BUILT)', page: 1 },
  rm412: { document: 'CBC0012-02004-DR-EL-0007.pdf', revision: '9 (23.10.23; AS FOUND)', page: 1 },
  rm413: { document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  mcc414: { document: 'CB095-02004-DR-EL-0014.pdf', revision: '4 (23.03.12; AS BUILT - CB145)', page: 1 },
  mcc414s2: { document: 'CB095-02004-DR-EL-0015.pdf', revision: '5 (05.09.24; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp 27/10/2025)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  sw426: { document: '11098-07110-EL-DR-2352.pdf', revision: '9 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  sw426s2: { document: '11098-07110-EL-DR-2357.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  rm711: { document: '11098-07110-EL-DR-2252.pdf', revision: '5 (22.02.12; DB03, DB07 BECOME SPARE)', page: 1 },
  fuel: { document: '11098-07110-EL-DR-2257.pdf', revision: '0 (04.12.09; ISSUED FOR CONSTRUCTION)', page: 1 },
  legacy: { document: '11098-07110-EL-DR-2350.pdf', revision: '16 (31.05.16; AS BUILT FOR CB16OP003)', page: 1 },
};
type Point = [number, number];
type Group = 'rm721' | 'mine-services' | 'workshop' | 'dump-pocket-hv' | 'dump-pocket-lv' | 'conveyor-hv' | 'conveyor-lv' | 'drive-inputs';
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const reviews: NonNullable<NetworkModel['reviews']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const sources: NetworkModel['sources'] = [];
const devices: NetworkModel['starting']['devices'] = {};
const availability: NetworkModel['starting']['sources'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const groups: Record<Group, string[]> = { rm721: [], 'mine-services': [], workshop: [], 'dump-pocket-hv': [], 'dump-pocket-lv': [], 'conveyor-hv': [], 'conveyor-lv': [], 'drive-inputs': [] };
function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([document, region]) => ({ ...documents[document], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set([...reviewIds, 'SV-Q12'])] };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], views: Group[]) {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminalPoints[index]; });
  views.forEach(view => groups[view].push(asset.id));
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim }); if (bends) layout.bends![id] = bends;
}
function unknown(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}
function port(id: string, label: string, aliases: string[], point: Point, claim: Claim, views: Group[], uncertain = true) {
  const terminal = `${id}:port`;
  add({ id, label, aliases, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], views);
  if (uncertain) unknown(`${id}:coverage`, terminal, `${label.replaceAll('\n', ' ')}: source/earth coverage unconfirmed`, claim);
  return terminal;
}
function control(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], views);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55]; return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminals = control(id, label, 'earth-switch', point, claim, views, aliases);
  layout.rotations![id] = 0; layout.labelOffsets![id] = [0, 65];
  layout.terminals[terminals[0]] = [point[0] - 30, point[1]]; layout.terminals[terminals[1]] = [point[0] + 30, point[1]];
  link(`${id}:branch`, from, terminals[0], claim, [[layout.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminals[1], ...claim });
}
function bus(id: string, label: string, point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminal = `${id}:bar`;
  add({ id, label, aliases, kind: 'bus', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], views);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, 60]; return terminal;
}

const incoming = fact('SV-R002', 'R002 remains open: SW411 tier16 is headed RM721 FEEDER/ref 2256, but CB/ES and cable print SW454 FD01/SW454-P-01. RM721 reciprocally names SW411/ref 5151 and RM721-P-01. No SW454 join is created from repeated text.', [['sw411', 'D-G / 11-12, tier16'], ['rm721', 'B-D / 6-7, incoming'], ['overview', 'A-B / 7-12, RM721 feeder names'], ['legacy', 'A-B / 10-11, RM721 feeder']], ['SV-Q01'], 'provisional');
const sw411Port = port('services:interface:sw411', 'SW411 tier16 / R002\nRM721 feeder aliases unresolved', ['R002', 'SW411 tier 16', 'CB SW454 FD01', 'ES SW454 FD01', 'RM721-P-01', 'SW454-P-01 (disputed tier16 label; not SW454 join)', 'CB RM721 FD01 / ES RM721 FD01 in overview'], [160, 60], incoming, ['rm721']);
const rm721Claim = fact('SV-RM721-BAR', 'RM721 has one 22kV / 630A phase bar, SW411-facing ISOL RM721 IN01, RM712-facing CB RM721 IN02, CB RM412 and ISOL RM713. Four distinct cable-side earth branches are drawn. Rev 1 states RM751 RENAMED TO RM721; overview symbols/names differ and do not settle full mechanisms.', [['rm721', 'C-F / 4-7; rev 1 rename 03.06.09 in H'], ['overview', 'RM721 SF/CB naming']], ['SV-Q06', 'SV-Q07']);
const rm721Bus = bus('rm721:bus', 'RM721 / former RM751\n22 kV / 630 A bar', [730, 340], rm721Claim, ['rm721'], ['RM721', 'RM751 (historical rename)']);
const in01 = control('rm721:in01', 'ISOL RM721 IN01', 'disconnector', [160, 220], rm721Claim, ['rm721'], ['SF RM721 IN01 in overview']);
link('rm721:cable-RM721-P-01', sw411Port, in01[0], incoming); link('rm721:in01-bar', in01[1], rm721Bus, rm721Claim, [[160, 340]]);
earthBranch('rm721:in01:es', 'RM721 IN01\nCable-side earth', in01[0], [265, 130], rm721Claim, ['rm721'], ['Unlabelled earth contact above ISOL RM721 IN01']);
const rm721Outgoing: Record<string, string> = {};
for (const [suffix, label, kind, x] of [['in02', 'CB RM721 IN02', 'breaker', 400], ['rm412', 'CB RM412', 'breaker', 800], ['rm713', 'ISOL RM713', 'disconnector', 1200]] as const) {
  const device = control(`rm721:${suffix}`, label, kind, [x, 490], rm721Claim, ['rm721'], suffix === 'in02' ? ['SF RM721 IN02 in overview'] : suffix === 'rm713' ? ['CB RM713 FDR in overview'] : []);
  link(`rm721:${suffix}:bar`, rm721Bus, device[0], rm721Claim, [[x, 340]]);
  earthBranch(`rm721:${suffix}:es`, `${label}\nCable-side earth`, device[1], [x + 100, 590], rm721Claim, ['rm721'], ['Separate drawn earth contact; exact tag unconfirmed']);
  rm721Outgoing[suffix] = device[1];
}
const remoteRm712 = fact('SV-RM721-RM712-UNRESOLVED', 'RM721 IN02 points TO SS712/RM712 with ref 2252. Supplied 2252 is SS711/RM711/SW711, while RM712 detail is 2253 and names no RM721-facing terminal. The named interface has no accepted join to a particular RM712 ring contact.', [['rm721', 'B-D / 4-5, IN02 upper arrow/ref 2252'], ['rm711', 'Full page, SS711/RM711/SW711 identity'], ['rm712', 'A-C / 1-3, different incoming names']], ['SV-Q02'], 'unresolved');
const rm712Port = port('rm721:interface:rm712', 'TO RM712 / SS712\nRemote terminal unconfirmed', ['TO SS712 / RING MAIN UNIT RM712', '07110-EL-DR-2252 (wrong-document reference)', '2252 actually belongs to RM711'], [400, 800], remoteRm712, ['rm721']);
link('rm721:in02-remote-rm712', rm721Outgoing.in02, rm712Port, remoteRm712);
const laboratory = fact('SV-RM714-SHARED', 'RM714/TF714/SW714 actual equipment belongs to the Desands/laboratory package.2255 and SW426 tier9/ref2357 support that laboratory route, not an RM712 source bay. This named shared reference creates no second laboratory model or proximity-based service connection.', [['rm714', 'A-E / 2-9, laboratory arrangement'], ['sw426s2', 'B-G / 7-8, SS714 tier9 laboratory arrow'], ['overview', 'F-G / 5-6, laboratory aliases']], ['SV-Q03', 'SV-Q06'], 'provisional');
port('services:interface:rm714-shared', 'Laboratory / RM714\nShared Desands package reference', ['RM714', 'TF714', 'SW714 / MC714', 'DES-Q02 / DES-Q03', 'Shared canonical rm714:bus / rm714:in01 in Desands package'], [1540, 300], laboratory, ['rm721']);

function transformer(id: string, label: string, aliases: string[], point: Point, outputRoles: string[], input: string, claim: Claim, locations: [keyof typeof documents, string][], reviewIds: string[], views: Group[]) {
  const terminals = [`${id}:hv`, ...outputRoles.map(role => `${id}:${role}`)];
  const transfer = fact(`${id}:transfer`, `Inference: provisional bidirectional source-pair candidates follow ${label.replaceAll('\n', ' ')}'s depicted primary-to-secondary routes. Backfeed and full winding policy remain unconfirmed. Earth pairs are empty with unknown winding coverage, not confirmation of no transfer. Neutral/MEN/screen symbols create no phase-earth pair.`, locations, reviewIds, 'provisional');
  add({ id, label: `${label}\nTransfer unconfirmed`, aliases, kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...transfer }, point, [[point[0], point[1] - 30], ...outputRoles.map((_, index): Point => [point[0] + (index - (outputRoles.length - 1) / 2) * 70, point[1] + 30])], views);
  const captionLines = `${label}\nTransfer unconfirmed`.split(/ · |\n/).length;
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -65 - (captionLines - 1) * 20];
  link(`${id}:incoming-cable`, input, terminals[0], claim);
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${label.split('\n')[0]} winding source/backfeed and earth policy unconfirmed`, transfer);
  return terminals;
}
function sfContact(id: string, label: string, point: Point, source: 'rm712' | 'rm713', group: Group) {
  const claim = fact(`${id}:mechanism`, `${label} is shown as an SF incoming assembly. Complete contact/fuse/earth mechanism and position set are unconfirmed; overview earth symbols and alternative SW labels do not establish a separate accepted local earth device/state matrix. Binary contact representation is provisional; earth coverage remains unknown.`, [[source, 'A-C / 1-4, SF incoming symbols'], ['overview', `${source.toUpperCase()} SF/earth symbol substitutions`]], ['SV-Q06'], 'provisional');
  const terminals = control(id, label, 'disconnector', point, claim, [group]);
  for (const terminal of terminals) unknown(`${terminal}:mechanism-coverage`, terminal, `${label} full phase/earth mechanism unconfirmed`, claim);
  return terminals;
}

const rm712Claim = fact('SV-RM712-BAR', 'RM712 has one 22kV / 630A bar reached by SF IN02 from the SW426 reference and SF IN01 toward the former RM713 route; CB TF712 FD supplies TF712. No precise RM721 terminal join is established.', [['rm712', 'A-C / 1-3, incoming SF devices, bar and TF712 feeder']], ['SV-Q02', 'SV-Q03', 'SV-Q04']);
const rm712Bus = bus('rm712:bus', 'RM712 / SS712\n22 kV / 630 A bar', [1900, 340], rm712Claim, ['mine-services'], ['RM712', 'SS712']);
const rm712In02 = sfContact('rm712:in02', 'SF RM712 IN02', [1750, 210], 'rm712', 'mine-services');
const rm712In01 = sfContact('rm712:in01', 'SF RM712 IN01', [2150, 210], 'rm712', 'mine-services');
link('rm712:in02-bar', rm712In02[1], rm712Bus, rm712Claim, [[1750, 340]]); link('rm712:in01-bar', rm712In01[1], rm712Bus, rm712Claim, [[2150, 340]]);
const sw426Gap = fact('SV-RM712-SW426-GAP', 'RM712 IN02 says FROM DESAND SWITCHBOARD SW426/ref2352 via RM712-P-01; neither SW426 power sheet names an RM712 bay. DES-Q01 remains unresolved. This interface is not the laboratory SS714 feeder and no SW426 bay is manufactured.', [['rm712', 'A-C / 1-2, IN02 source arrow'], ['sw426', 'B-G, all first-sheet feeder destinations'], ['sw426s2', 'B-G, continuation destinations including separate SS714 tier9']], ['SV-Q03'], 'unresolved');
const sw426 = port('rm712:interface:sw426', 'SW426 / DES-Q01\nSource bay unconfirmed', ['RM712-P-01', 'Shared sw426:interface:rm712 reference in Desands package', 'Not SS714/RM714 feeder'], [1750, 40], sw426Gap, ['mine-services']);
link('rm712:sw426-reference-cable', sw426, rm712In02[0], sw426Gap);
const former = fact('SV-FORMER-RM712-RM713', '2253 still names TO RM713/ref2254 via RM713-P-01 from RM712 IN01. 2254 arrives from RM721 and revision 1 says RM713 WAS SUPPLIED FROM RM712. The old route is retained as an unresolved named endpoint, not joined to a current RM713 terminal as a confirmed parallel supply.', [['rm712', 'A-C / 2-3, IN01 outgoing RM713 arrow'], ['rm713', 'A / 3-4, current arrival; H, revision 1 replacement description'], ['rm721', 'D-F / 5-6, independent RM713 outgoing']], ['SV-Q04'], 'unresolved');
const formerPort = port('rm712:interface:former-rm713', 'Former RM713 route\nCurrent connection unconfirmed', ['RM713-P-01 on 2253', 'RM713 WAS SUPPLIED FROM RM712'], [2150, 40], former, ['mine-services']);
link('rm712:former-rm713-cable', rm712In01[0], formerPort, former);
const tf712Cb = control('rm712:tf712:cb', 'CB TF712 FD', 'breaker', [1900, 520], rm712Claim, ['mine-services']);
link('rm712:tf712:bar', rm712Bus, tf712Cb[0], rm712Claim);
const tf712 = transformer('rm712:tf712', 'TF712\n22 kV / 415 V NO LOAD · 1 MVA', ['TF712', '415V NO LOAD; SW712 400V FULL LOAD'], [1900, 760], ['lv'], tf712Cb[1], rm712Claim, [['rm712', 'B-C / 2-3, TF712 winding/rating']], ['SV-Q05', 'SV-Q11'], ['mine-services']);
const removed = fact('SV-TF712-REMOVED-CABLE', 'TF712 cable SW712-P-01 explicitly ends with CABLES DISCONNECTED AND PULLED OUT OF MAIN DISTRIBUTION BOARD. This is a depicted physical gap, not an open switch pose. Present installed condition remains unconfirmed against the overview TF712→MC712 simplification. No edge crosses the gap to SW712 or MCS.', [['rm712', 'C-D / 2, SW712-P-01 and removal note'], ['overview', 'A-B / 7-12, simplified TF712→MC712']], ['SV-Q05']);
const removedPort = port('rm712:tf712:removed-lv-cable-end', 'SW712-P-01\nDrawn cable removed / disconnected', ['SW712-P-01', 'CABLES DISCONNECTED AND PULLED OUT OF MAIN DISTRIBUTION BOARD'], [1900, 1020], removed, ['mine-services']);
link('rm712:tf712:removed-cable-segment', tf712[1], removedPort, removed);
const generators = fact('SV-DG-MCS', 'DG1(6207) and DG7(6206) are distinct depicted generator inputs to MAIN CHANGEOVER SWITCH MCS. Source availability is null. The source does not define the internal matrix, transfer positions, overlap, neutral switching or complete interlocks; no simultaneous fixed source connection is represented.', [['rm712', 'A-D / 4-8, distinct DGs/MCS/output']], ['SV-Q05']);
for (const [suffix, label, alias, x] of [['dg1', 'DG1', '6207', 2450], ['dg7', 'DG7', '6206', 2900]] as const) {
  const id = `rm712:${suffix}`; const terminal = `${id}:port`;
  add({ id, label: `${label} (${alias})\nAvailability unconfirmed`, aliases: [label, alias], kind: 'source', terminals: [terminal], conductivePairs: [], positions: [], ...generators }, [x, 70], [[x, 70]], ['mine-services']);
  sources.push({ id: `${id}:supply`, label: `${label} (${alias})`, assetId: id, terminal, ...generators }); availability[`${id}:supply`] = null;
}
const mcs = fact('SV-MCS-MATRIX-UNCONFIRMED', 'MCS physical state/contact matrix is unconfirmed. No supported position options or fixed conducting pairs are defined; all three ports have unknown coverage. This preserves the depicted generator inputs/output without inventing a transfer truth table or an operating permission.', [['rm712', 'A-D / 4-8, MAIN CHANGEOVER SWITCH MCS enclosure and leads']], ['SV-Q05'], 'unresolved');
const mcsPorts = ['rm712:mcs:dg1', 'rm712:mcs:dg7', 'rm712:mcs:output'];
add({ id: 'rm712:mcs', label: 'MCS main changeover\nPhysical state / matrix unconfirmed', aliases: ['MAIN CHANGEOVER SWITCH', 'No documented position/contact matrix'], kind: 'interface', terminals: mcsPorts, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...mcs }, [2675, 320], [[2600, 290], [2750, 290], [2675, 360]], ['mine-services']);
for (const terminal of mcsPorts) unknown(`${terminal}:coverage`, terminal, 'MCS source/earth contacts and physical state unconfirmed', mcs);
link('rm712:dg1-mcs', 'rm712:dg1:port', mcsPorts[0], generators); link('rm712:dg7-mcs', 'rm712:dg7:port', mcsPorts[1], generators);
const sw712Cb = control('rm712:sw712:cb', 'CB SW712 IN\n1600 A', 'breaker', [2675, 540], generators, ['mine-services']);
link('rm712:mcs-output-incomer', mcsPorts[2], sw712Cb[0], generators);
const sw712 = bus('rm712:sw712:bus', 'SW712 / MC712 alias\n400 V FULL LOAD / 2000 A bus', [2675, 760], generators, ['mine-services'], ['SW712', 'MC712 in overview', '400V FULL LOAD']); link('rm712:sw712:incomer-bar', sw712Cb[1], sw712, generators);

const rm713Claim = fact('SV-RM713', '2254 arrives from RM721/RM713-P-01 through SF RM713 IN01. A separate IN02 has no named destination. One 22kV / 630A bar feeds CB TF713 FD and TF713 22kV/400V 1MVA, then CB SW713 IN 1600A and SW713 400V / 2000A phase bar. Outgoing LV circuits are excluded.', [['rm713', 'A-E / 2-9, incoming/bar/TF713/LV incomer and bar']], ['SV-Q04', 'SV-Q06']);
const rm713Bus = bus('rm713:bus', 'RM713 / SS713\n22 kV / 630 A bar', [1300, 1100], rm713Claim, ['workshop'], ['RM713', 'SS713']);
const rm713In01 = sfContact('rm713:in01', 'SF RM713 IN01', [1100, 950], 'rm713', 'workshop'); const rm713In02 = sfContact('rm713:in02', 'SF RM713 IN02', [1500, 950], 'rm713', 'workshop');
link('rm721:current-rm713-cable', rm721Outgoing.rm713, rm713In01[0], rm713Claim, [[1200, 760], [1100, 760]]);
link('rm713:in01-bar', rm713In01[1], rm713Bus, rm713Claim, [[1100, 1100]]); link('rm713:in02-bar', rm713In02[1], rm713Bus, rm713Claim, [[1500, 1100]]);
const spare713 = port('rm713:interface:in02', 'RM713 IN02\nDestination unconfirmed', ['Undestinated incoming position'], [1500, 780], rm713Claim, ['workshop']); link('rm713:in02-undestinated', spare713, rm713In02[0], rm713Claim);
const tf713Cb = control('rm713:tf713:cb', 'CB TF713 FD', 'breaker', [1300, 1290], rm713Claim, ['workshop']); link('rm713:tf713:bar', rm713Bus, tf713Cb[0], rm713Claim);
const tf713 = transformer('rm713:tf713', 'TF713\n22 kV / 400 V · 1 MVA', ['TF713'], [1300, 1510], ['lv'], tf713Cb[1], rm713Claim, [['rm713', 'C / 3-4, TF713 winding/rating']], ['SV-Q10', 'SV-Q11'], ['workshop']);
const sw713Cb = control('rm713:sw713:cb', 'CB SW713 IN\n1600 A', 'breaker', [1300, 1740], rm713Claim, ['workshop']); link('rm713:cable-SW713-P-01', tf713[1], sw713Cb[0], rm713Claim);
const sw713 = bus('rm713:sw713:bus', 'SW713\n400 V / 2000 A final bus', [1300, 1950], rm713Claim, ['workshop'], ['SW713']); link('rm713:sw713:incomer-bar', sw713Cb[1], sw713, rm713Claim);

const rm412Claim = fact('SV-RM412-HV', 'S100 from RM721 and S101 toward RM413 share the RM412 phase bar. E100/E101 are separate common/bar-side earth branches. Q100 200A precedes an untagged disconnecting contact, with E102 on the transformer-side conductor below both. CT/SEPAM/Bender/ELM/control lines are not phase supply routes.', [['rm412', 'F-G / 1-3, upper-left RMU; inverted letter-grid orientation']], ['SV-Q10']);
const rm412Bus = bus('rm412:bus', 'RM412\n22 kV common bar', [750, 2380], rm412Claim, ['dump-pocket-hv'], ['RM412', '0701-19026-E100']);
const s100 = control('rm412:s100', 'S100\nRM721-facing', 'disconnector', [500, 2220], rm412Claim, ['dump-pocket-hv'], ['S100 630A']);
const s101 = control('rm412:s101', 'S101\nRM413-facing', 'disconnector', [1000, 2220], rm412Claim, ['dump-pocket-hv'], ['S101 630A']);
link('rm721:rm412:cable', rm721Outgoing.rm412, s100[0], rm412Claim, [[800, 2080], [500, 2080]]);
link('rm412:s100-bar', s100[1], rm412Bus, rm412Claim, [[500, 2380]]); link('rm412:s101-bar', s101[1], rm412Bus, rm412Claim, [[1000, 2380]]);
earthBranch('rm412:e100', 'E100\nS100 common-side earth', rm412Bus, [480, 2450], rm412Claim, ['dump-pocket-hv'], ['E100']);
earthBranch('rm412:e101', 'E101\nS101 common-side earth', rm412Bus, [1120, 2450], rm412Claim, ['dump-pocket-hv'], ['E101']);
const q100 = control('rm412:q100', 'Q100\n200 A', 'breaker', [750, 2590], rm412Claim, ['dump-pocket-hv'], ['Q100 200A']);
link('rm412:q100-bar', rm412Bus, q100[0], rm412Claim);
const contactClaim = fact('SV-RM412-CONTACT', 'An untagged disconnecting-contact symbol follows Q100 before the E102 transformer-side branch. Its exact tag, position set, mechanical relationship and operating conditions remain unconfirmed; binary phase-contact representation is provisional.', [['rm412', 'F / 1-3, contact below Q100 and dashed linkage to E102']], ['SV-Q12'], 'provisional');
const contact = control('rm412:feeder-contact', 'Disconnecting contact\nBelow Q100 · tag unconfirmed', 'disconnector', [750, 2770], contactClaim, ['dump-pocket-hv'], ['Untagged disconnecting contact following Q100']);
link('rm412:q100-contact', q100[1], contact[0], rm412Claim);
earthBranch('rm412:e102', 'E102\nTransformer-side earth', contact[1], [890, 2860], rm412Claim, ['dump-pocket-hv'], ['E102']);
evidence.push({ id: 'SV-RM412-LINKAGE', status: 'unresolved', summary: 'Inference: dashed linkage/triangle between the feeder disconnecting contact and E102 is candidate mechanical-interlock evidence. No complete truth table, key identity, installed permitted sequence or absence of other restrictions is established.', references: [{ ...documents.rm412, clause: 'F-G / 1-3, Q100/contact/E102 dashed linkage' }] });
const tf412 = transformer('rm412:tf412', 'TF412\n22 kV / 690 V / 690 V / 415 V\n2.5 / 1.0 / 1.0 / 0.5 MVA', ['TF412', 'Three independent LV windings', 'SW5001 grouping in overview; endpoint names unconfirmed'], [750, 3090], ['lv-690-star', 'lv-690-delta', 'lv-415-star'], contact[1], rm412Claim, [['rm412', 'E / 1-3, primary and three secondary windings']], ['SV-Q10'], ['dump-pocket-hv', 'dump-pocket-lv']);
for (const [index, role, voltage, winding, q, rating, fuse, x] of [
  [0, 'lv-690-star', '690 V', 'Star', 'Q200', '800 A', 'F1', 400], [1, 'lv-690-delta', '690 V', 'Delta', 'Q201', '800 A', 'F2', 750], [2, 'lv-415-star', '415 V', 'Star', 'Q202', '80 A', '', 1100],
] as const) {
  const endpoint = fact(`SV-RM412-${q}-ENDPOINT`, `TF412 ${voltage}${winding} winding has its own ${fuse ? `${fuse}/` : ''}${q} phase route to a separate conductor. The endpoint name is a construction label; overview SW5001 groups destinations without establishing a common phase bar. Outgoing LV drive/selector/UPS/control circuits are excluded.`, [['rm412', `D-E / 1-7, ${fuse}/${q} and separate phase conductor`], ['overview', 'RM412 / SW5001 grouped destination']], ['SV-Q10']);
  let from = tf412[index + 1];
  if (fuse) {
    const id = `rm412:${fuse.toLowerCase()}`; const pair: [string, string] = [`${id}:in`, `${id}:out`];
    const fuseClaim = fact(`SV-RM412-${fuse}`, `${fuse} 800A fuse is drawn ahead of ${q}. Intact phase continuity is provisional; present fuse condition and removal states are unconfirmed.`, [['rm412', `D-E / 1-3, ${fuse} 800A fuse`]], ['SV-Q10'], 'provisional');
    add({ id, label: `${fuse}\n800 A fuse · condition unconfirmed`, aliases: [fuse], kind: 'interface', terminals: pair, conductivePairs: [[...pair]], positions: [], ...fuseClaim }, [x, 3280], [[x, 3260], [x, 3300]], ['dump-pocket-lv']);
    link(`${id}:winding-cable`, from, pair[0], endpoint); from = pair[1];
  }
  const qId = `rm412:${q.toLowerCase()}`; const device = control(qId, `${q}\n${voltage} ${winding} · ${rating}`, 'breaker', [x, 3440], endpoint, ['dump-pocket-lv'], [q, rating]);
  link(`${qId}:supply`, from, device[0], endpoint, [[x, 3220]]);
  const busId = `rm412:${role}:bus`; const final = bus(busId, `${voltage} ${winding}\nSeparate final LV conductor\nName unconfirmed`, [x, 3660], endpoint, ['dump-pocket-lv'], [`After ${q}`, 'SW5001 grouped overview alias; not common bar']);
  link(`${qId}:final-conductor`, device[1], final, endpoint);
}

const rm413Claim = fact('SV-RM413-HV', 'RM413 IN01 receives RM412; IN02 goes toward RM417. The explicit DOUBLE BOOT CONNECTION is on IN02 cable-facing side and also feeds RM413A; it does not bypass IN02 to the RM413 bar. Separate TF413 FD and TF414 FD feed their own transformers. ABB REJ603/protection lines are not extra phase routes.', [['rm413', 'A-C / 1-6, IN01/IN02 double-boot, bar and TF feeders'], ['rm412', 'G / 2-3, S101 TO RM413 reciprocal reference']], ['SV-Q08', 'SV-Q09']);
const rm413Bus = bus('rm413:bus', 'RM413 / SS413\n22 kV main bar', [2650, 2380], rm413Claim, ['conveyor-hv'], ['RM413', 'SS413 / Oversize reduction substation']);
const rm413In01 = control('rm413:in01', 'RM413 IN01\nRM412-facing', 'disconnector', [2350, 2220], rm413Claim, ['conveyor-hv'], ['RM413 IN01', 'Incoming mechanism/complete positions unconfirmed']);
const rm413In02 = control('rm413:in02', 'RM413 IN02\nRM417-facing double boot', 'disconnector', [2950, 2220], rm413Claim, ['conveyor-hv'], ['RM413 IN02', 'DOUBLE BOOT CONNECTION on cable-facing side']);
link('rm412:s101-rm413-in01', s101[0], rm413In01[0], rm413Claim, [[1000, 2080], [2350, 2080]]);
link('rm413:in01-bar', rm413In01[1], rm413Bus, rm413Claim, [[2350, 2380]]); link('rm413:in02-bar', rm413In02[1], rm413Bus, rm413Claim, [[2950, 2380]]);
const rm417 = port('rm413:interface:rm417', 'RM417 HV continuation\nRemote states unconfirmed', ['TO RM417', 'CB16OP038A-02006-DR-EL-0044'], [2950, 2000], rm413Claim, ['conveyor-hv']);
link('rm413:in02-rm417', rm413In02[0], rm417, rm413Claim);
const conveyorLv: { tfId: string; x: number; cbId: string; busId: string; cableId: string }[] = [];
for (const [tf, board, x, rating, detail] of [['TF413', 'MC413', 2350, '400 V', 'rm413'], ['TF414', 'MCC414', 2750, '415 V phase bar /400 V transformer', 'mcc414']] as const) {
  const prefix = `rm413:${tf.toLowerCase()}`;
  const feeder = control(`${prefix}:cb`, `${tf} FD\nABB REJ603 protection label`, 'breaker', [x, 2590], rm413Claim, ['conveyor-hv'], [`${tf} FD`]);
  link(`${prefix}:bar`, rm413Bus, feeder[0], rm413Claim, [[x, 2380]]);
  const winding = transformer(prefix, `${tf}\n22 kV / 400 V · 2 MVA`, [tf, ...(tf === 'TF414' ? ['MCC414415V phase bar; no extra conversion device'] : [])], [x, 2880], ['lv'], feeder[1], rm413Claim, [[detail, tf === 'TF413' ? 'C-E / 2-3, TF413 winding and MC413 route' : 'A-B / 4-6, TF414 winding/neutral/output']], ['SV-Q08', 'SV-Q11'], ['conveyor-hv', 'conveyor-lv']);
  const endpoint = fact(`SV-${board}-ENDPOINT`, tf === 'TF413' ? 'Schematic shows TF413 400V output through an untagged incoming main contact to MC413 phase bar. Exact detailed CB-02006-DR-EL-1001 is absent; incoming-device identity/mechanism and completeness remain unconfirmed. MC413A is an outgoing extension after this first bar and is excluded.' : 'TF414 400V output enters MCC414 2500A incomer and one phase bar labelled 3P/415V/3200A/65kA/1sec. 0015 continues the same bar, not another supply or endpoint. Neutral/MEN/earth paths are separate from the phase bar; outgoing LV circuits are excluded.', [[detail, tf === 'TF413' ? 'C-E / 2-3, MC413 incoming/bar and missing 1001 reference' : 'A-C / 4-10, TF414, incomer, neutral/MEN and labelled phase bar'], ...(tf === 'TF414' ? [['mcc414s2', 'C / 1-11, same phase-bar continuation'] as [keyof typeof documents, string]] : [])], ['SV-Q08', 'SV-Q11'], tf === 'TF413' ? 'provisional' : 'supported');
  const cbId = `rm413:${board.toLowerCase()}:cb`; const incomingCb = control(cbId, tf === 'TF413' ? 'MC413 incoming main\nTag / detailed mechanism unconfirmed' : 'MCC414 incomer\n2500 A', 'breaker', [x, 3170], endpoint, ['conveyor-lv'], [tf === 'TF413' ? 'Untagged schematic incoming main contact' : 'MCC414 2500A incomer']);
  const cableId = `rm413:${board.toLowerCase()}:winding-incomer`; link(cableId, winding[1], incomingCb[0], endpoint);
  const busId = `rm413:${board.toLowerCase()}:bus`; const terminal = bus(busId, `${board}\n${tf === 'TF413' ? 'Schematic final LV phase bar\nDetailed source absent' : `${rating}\n3200 A phase bar`}`, [x, 3380], endpoint, ['conveyor-lv'], [board]);
  link(`rm413:${board.toLowerCase()}:incomer-bar`, incomingCb[1], terminal, endpoint);
  if (tf === 'TF413') unknown('rm413:mc413:detail-coverage', terminal, 'MC413 missing detailed incomer/bar coverage; outgoing MC413A excluded', endpoint);
  conveyorLv.push({ tfId: prefix, x, cbId, busId, cableId });
}

const driveClaim = fact('SV-RM413A', 'RM413A branches from the RM417-facing cable side of RM413 IN02. Its incoming conductor/bar has upper ES-Q8, TF413A Q1 CB, and a separate lower switching/earth arrangement also printed ES-Q8. Overview ES-08 IN01 / SW TF413A SW-01 aliases do not settle mechanisms or interlocks.', [['rm413', 'A-C / 4-6, double-boot branch and two ES-Q8 locations'], ['overview', 'C-D / 10-12, RM413A alternate aliases']], ['SV-Q09']);
const rm413aBus = bus('rm413a:bus', 'RM413A\n22 kV incoming bar', [3550, 2380], driveClaim, ['drive-inputs'], ['RM413A']);
link('rm413:double-boot-rm413a', rm413In02[0], rm413aBus, driveClaim, [[2950, 2110], [3550, 2110]]);
earthBranch('rm413a:es-q8:upper', 'ES-Q8 · upper\nIncoming/bar earth', rm413aBus, [3700, 2450], driveClaim, ['drive-inputs'], ['ES-Q8', 'Upper ES-Q8', 'ES-08 IN01 in overview']);
const q1 = control('rm413a:q1', 'TF413A Q1 CB', 'breaker', [3550, 2600], driveClaim, ['drive-inputs'], ['TF413A Q1 CB']); link('rm413a:q1-bar', rm413aBus, q1[0], driveClaim);
const lowerClaim = fact('SV-RM413A-LOWER-INTERPRETATION', 'Inference: lower ES-Q8 contact/earth assembly is provisionally represented as Service(line-cable), Isolated(no pair), Earthed(cable-earth). It is distinct from upper ES-Q8. Complete physical positions, exact tag/overview correspondence, operating sequence and interlocks remain unconfirmed.', [['rm413', 'B-C / 4-6, lower switching/earth symbol below Q1 and above TF413A'], ['overview', 'RM413A SW TF413A SW-01/ES aliases']], ['SV-Q09'], 'provisional');
const lowerPorts: [string, string, string] = ['rm413a:es-q8:lower:line', 'rm413a:es-q8:lower:cable', 'rm413a:es-q8:lower:earth'];
add({ id: 'rm413a:es-q8:lower', label: 'ES-Q8 · lower\nContact mechanism unconfirmed', aliases: ['ES-Q8', 'Lower ES-Q8', 'SW TF413A SW-01 in overview'], kind: 'disconnector', terminals: lowerPorts, conductivePairs: [], positions: [{ id: 'service', label: 'Service · candidate', pairs: [[lowerPorts[0], lowerPorts[1]]] }, { id: 'isolated', label: 'Isolated · candidate', pairs: [] }, { id: 'earthed', label: 'Earthed · candidate', pairs: [[lowerPorts[1], lowerPorts[2]]] }], ...lowerClaim }, [3550, 2780], [[3550, 2750], [3550, 2810], [3480, 2780]], ['drive-inputs']);
devices['rm413a:es-q8:lower'] = null; layout.rotations!['rm413a:es-q8:lower'] = 90; layout.labelOffsets!['rm413a:es-q8:lower'] = [0, -55];
earths.push({ id: 'rm413a:es-q8:lower:termination', label: 'Lower ES-Q8 depicted earth contact', terminal: lowerPorts[2], ...lowerClaim }); link('rm413a:q1-lower-contact', q1[1], lowerPorts[0], driveClaim);
unknown('rm413a:lower-position-coverage', lowerPorts[1], 'Lower ES-Q8 complete source/earth positions unconfirmed', lowerClaim);
const tf413a = transformer('rm413a:tf413a', 'TF413A\n22 kV / 720 V / 720 V · 5 MVA', ['TF413A', '12 PULSE/NO REGEN (AFE) · source wording, no derived reverse-transfer rule'], [3550, 3070], ['lv-a', 'lv-b'], lowerPorts[1], driveClaim, [['rm413', 'C-D / 4-7, separate TF413A winding routes']], ['SV-Q09', 'SV-Q10'], ['drive-inputs']);
const acBoundary = fact('SV-TF413A-AC-BOUNDARIES', 'Inference: the two 720V winding routes through separate 2500A switches into rectifiers are retained as distinct AC endpoint candidates ahead of conversion. No named common AC phase bus is drawn. Their shared DC bus is not a metallic AC/AC or AC/DC shortcut. Endpoint identity/scope and converter/backfeed/earth policies remain unconfirmed; inverter/motor expansion is excluded at these candidate LV boundaries.', [['rm413', 'D-E / 4-8, two 2500A inputs/rectifiers and separate AC routes meeting only on DC side']], ['SV-Q10'], 'provisional');
for (const [index, suffix, x] of [[0, 'a', 3400], [1, 'b', 3700]] as const) {
  const id = `rm413a:ac-input-${suffix}`;
  const input = control(`${id}:switch`, `TF413A AC input ${suffix.toUpperCase()}\n2500 A`, 'disconnector', [x, 3360], acBoundary, ['drive-inputs'], ['Separate 2500A rectifier input switch']);
  link(`${id}:winding-cable`, tf413a[index + 1], input[0], acBoundary, [[x, 3170]]);
  const endpoint = port(`${id}:boundary`, `TF413A input ${suffix.toUpperCase()}\n720 V AC boundary candidate\nScope unconfirmed`, ['Separate rectifier AC input; not common AC bus'], [x, 3580], acBoundary, ['drive-inputs']); link(`${id}:switch-boundary`, input[1], endpoint, acBoundary);
}
evidence.push({ id: 'SV-SCOPE-DISPOSITIONS', status: 'supported', summary: 'MC413A is shown downstream of an outgoing MC413 feeder and is excluded beyond the first phase bar; its referenced 0033 is absent.2252 is RM711, not RM712.2257 is SS718/RM718/SW718 fuel unloading, not a Services join. MCC414 0015 outgoing upgrades do not establish a new upstream supply. No neutral/MEN/earth-bar symbol is converted into phase earth.', references: [{ ...documents.rm413, clause: 'D-F / 2-3, MC413→MC413A outgoing extension; MC413 1001 / MC413A 0033 missing refs' }, { ...documents.rm711, clause: 'Full-page identity disposition' }, { ...documents.fuel, clause: 'Full-page fuel-unloading identity disposition' }, { ...documents.mcc414s2, clause: 'C, same phase-bar continuation; outgoing upgrades' }, { ...documents.mcc414, clause: 'B-C / 5-6, neutral/MEN/earth separate from phase bar' }] });
evidence.push({ id: 'SV-INTERLOCK-GAPS', status: 'unresolved', summary: 'No complete installed physical-interlock/position set or baseline is established. RM412 linkage, RM413A duplicate earth tags and generator MCS contact matrix require confirmation. SW411 note 3 says mechanical earthing interlock is to be provided to switchyard/power station; it does not define an installed RM721 key sequence. Overview reference notes are not local switching permissions.', references: [{ ...documents.rm412, clause: 'F-G / 1-3, Q100/contact/E102 linkage' }, { ...documents.rm413, clause: 'B-C / 4-6, Q1/two ES-Q8 locations' }, { ...documents.rm712, clause: 'A-D / 4-8, MCS' }, { ...documents.sw411, clause: 'A / 11-12, note 3' }, { ...documents.overview, clause: 'G / 1-3, notes 1-2' }] });

const reviewQuestions: [string, string][] = [
  ['SV-Q01', 'Retain existing R002: reconcile RM721/SW454 SW411 tier16 tags and cable names without joining SW454.'],
  ['SV-Q02', 'Confirm RM721→RM712 exact remote terminal and wrong 2252 reference; 2252 is RM711, not RM712.'],
  ['SV-Q03', 'Retain DES-Q01: resolve RM712→SW426 source reference; no RM712 bay is named on the supplied SW426 sheets.'],
  ['SV-Q04', 'Resolve former RM712→RM713 route versus RM721→RM713 arrival and replacement revision; no confirmed parallel feed.'],
  ['SV-Q05', 'Confirm TF712 removed cable/current condition, SW712/MC712 naming and distinct DG1(6207)/DG7(6206) availability/MCS behavior; no simultaneous fixed supplies.'],
  ['SV-Q06', 'Resolve CB/ISOL/SF labels, earth mechanism/position differences and overview substitutions before enabling controls.'],
  ['SV-Q07', 'Retain RM751 historical rename to RM721 without automatically resolving R002 or other numbering identities.'],
  ['SV-Q08', 'Resolve RM413/TF413/MC413 versus TF414/MCC414 and missing MC413/MC413A detail/prefix variation; exclude outgoing MC413A extension.'],
  ['SV-Q09', 'Confirm two distinct ES-Q8 locations, Q1 and lower switch mechanism/aliases/earth sides/interlocks at RM413A.'],
  ['SV-Q10', 'Confirm TF412 three separate endpoint identities/SW5001 alias and TF413A separate AC boundaries, transformer/backfeed/earth and converter policies.'],
  ['SV-Q11', 'Retain 415V NO LOAD/400V FULL LOAD and 400/415V labels without calculations or invented conversion devices.'],
  ['SV-Q12', 'Confirm complete physical positions/interlocks, installed source set and all baseline states/availability; drawing poses and missing rules are not permission.'],
];
reviews.push(...reviewQuestions.map(([id, question]) => ({ id, question, status: 'open' as const, evidenceIds: evidence.map(record => record.id) })));

function place(target: DiagramLayout, id: string, point: Point, terminalPoints: Point[]) {
  const asset = assets.find(item => item.id === id)!; target.assets[id] = point;
  asset.terminals.forEach((terminal, index) => { target.terminals[terminal] = terminalPoints[index]; });
}
const dumpLvLayout = structuredClone(layout);
place(dumpLvLayout, 'rm412:tf412', [750, 180], [[750, 150], [680, 210], [750, 210], [820, 210]]);
dumpLvLayout.terminals['rm412:feeder-contact:b'] = [400, 30];
for (const [q, role, x, fuse] of [['q200', 'lv-690-star', 400, 'f1'], ['q201', 'lv-690-delta', 750, 'f2'], ['q202', 'lv-415-star', 1100, '']] as const) {
  if (fuse) place(dumpLvLayout, `rm412:${fuse}`, [x, 350], [[x, 330], [x, 370]]);
  place(dumpLvLayout, `rm412:${q}`, [x, 550], [[x, 520], [x, 580]]);
  place(dumpLvLayout, `rm412:${role}:bus`, [x, 770], [[x, 770]]);
  dumpLvLayout.bends![`rm412:${q}:supply`] = [[x, 300]];
}
const conveyorLvLayout = structuredClone(layout);
for (const [index, entry] of conveyorLv.entries()) {
  const x = 350 + index * 600; const tf = assets.find(asset => asset.id === entry.tfId)!;
  place(conveyorLvLayout, tf.id, [x, 180], [[x, 150], [x, 210]]);
  const incoming = connections.find(connection => connection.to === tf.terminals[0])!; conveyorLvLayout.terminals[incoming.from] = [x - 350, 30];
  place(conveyorLvLayout, entry.cbId, [x, 440], [[x, 410], [x, 470]]); place(conveyorLvLayout, entry.busId, [x, 670], [[x, 670]]);
  conveyorLvLayout.bends![entry.cableId] = [];
}
const driveHvLayout = structuredClone(layout); const driveLvLayout = structuredClone(layout);
place(driveHvLayout, 'rm413a:bus', [500, 120], [[500, 120]]); driveHvLayout.terminals['rm413:in02:a'] = [500, 20];
place(driveHvLayout, 'rm413a:es-q8:upper', [720, 190], [[690, 190], [750, 190]]); driveHvLayout.bends!['rm413a:es-q8:upper:branch'] = [[500, 190]];
place(driveHvLayout, 'rm413a:q1', [500, 300], [[500, 270], [500, 330]]);
place(driveHvLayout, 'rm413a:es-q8:lower', [500, 450], [[500, 420], [500, 480], [430, 450]]);
place(driveHvLayout, 'rm413a:tf413a', [500, 650], [[500, 620], [465, 680], [535, 680]]);
place(driveLvLayout, 'rm413a:tf413a', [500, 160], [[500, 130], [465, 190], [535, 190]]); driveLvLayout.terminals['rm413a:es-q8:lower:cable'] = [150, 30];
for (const [suffix, x] of [['a', 350], ['b', 650]] as const) {
  place(driveLvLayout, `rm413a:ac-input-${suffix}:switch`, [x, 420], [[x, 390], [x, 450]]);
  place(driveLvLayout, `rm413a:ac-input-${suffix}:boundary`, [x, 640], [[x, 640]]); driveLvLayout.bends![`rm413a:ac-input-${suffix}:winding-cable`] = [[x, 280]];
}
const overviewIds = [...groups.rm721, ...groups['mine-services'], 'rm713:bus', 'rm713:in01', 'rm412:bus', 'rm412:s100', 'rm412:s101', 'rm413:bus', 'rm413:in01', 'rm413:in02', 'rm413:interface:rm417', 'rm413a:bus'];
const overviewLayout = structuredClone(layout);
for (const id of Object.keys(overviewLayout.bends!)) overviewLayout.bends![id] = [];
for (const [id, x, y] of [['rm713:bus', 1250, 1000], ['rm412:bus', 750, 1500], ['rm413:bus', 2350, 1500], ['rm413a:bus', 3250, 1500]] as const) place(overviewLayout, id, [x, y], [[x, y]]);
for (const [id, x, y] of [['rm713:in01', 1100, 840], ['rm412:s100', 550, 1340], ['rm412:s101', 950, 1340], ['rm413:in01', 2050, 1340], ['rm413:in02', 2650, 1340]] as const) place(overviewLayout, id, [x, y], [[x, y - 30], [x, y + 30]]);
place(overviewLayout, 'rm413:interface:rm417', [2650, 1110], [[2650, 1110]]);
const viewDefinitions: { id: string; label: string; assetIds: string[]; bounds: DiagramView['bounds']; layout: DiagramLayout }[] = [
  { id: 'overview', label: 'Services overview · disputed routes retained', assetIds: overviewIds, bounds: [-100, -50, 3850, 1950], layout: overviewLayout },
  { id: 'rm721', label: 'RM721 · source and service feeders', assetIds: groups.rm721, bounds: [-100, -40, 1900, 1100], layout: structuredClone(layout) },
  { id: 'mine-services', label: 'RM712 · cable gap and DG/MCS', assetIds: groups['mine-services'], bounds: [1500, -70, 1700, 1350], layout: structuredClone(layout) },
  { id: 'workshop', label: 'RM713 / SW713 · workshop', assetIds: groups.workshop, bounds: [850, 700, 1050, 1500], layout: structuredClone(layout) },
  { id: 'dump-pocket-hv', label: 'RM412 HV · common-side earths', assetIds: groups['dump-pocket-hv'], bounds: [180, 2020, 1300, 1390], layout: structuredClone(layout) },
  { id: 'dump-pocket-lv', label: 'TF412 · three separate LV endpoints', assetIds: groups['dump-pocket-lv'], bounds: [150, -40, 1250, 1070], layout: dumpLvLayout },
  { id: 'conveyor-hv', label: 'RM413 HV · double-boot side', assetIds: groups['conveyor-hv'], bounds: [1980, 1820, 1300, 1420], layout: structuredClone(layout) },
  { id: 'conveyor-lv', label: 'TF413 / TF414 · distinct first buses', assetIds: groups['conveyor-lv'], bounds: [50, -40, 1250, 960], layout: conveyorLvLayout },
  { id: 'rm413a-hv', label: 'RM413A HV · two ES-Q8 locations', assetIds: groups['drive-inputs'].filter(id => !id.includes(':ac-input-')), bounds: [150, -30, 850, 910], layout: driveHvLayout },
  { id: 'drive-inputs', label: 'TF413A · separate rectifier AC boundaries', assetIds: groups['drive-inputs'].filter(id => id === 'rm413a:tf413a' || id.includes(':ac-input-')), bounds: [100, -40, 900, 890], layout: driveLvLayout },
];
const dumpHvView = viewDefinitions.find(view => view.id === 'dump-pocket-hv')!;
dumpHvView.layout.labelOffsets!['rm412:tf412'] = [-250, layout.labelOffsets!['rm412:tf412'][1]];
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const views: DiagramView[] = viewDefinitions.map(definition => {
  const visible = new Set(definition.assetIds); const view: DiagramView = { ...definition, boundaries: [] }; const portals = new Map<string, Point>();
  for (const connection of connections) {
    const fromVisible = visible.has(owners.get(connection.from)!); const toVisible = visible.has(owners.get(connection.to)!); if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from; const remoteAssetId = owners.get(remote)!;
    const [x, y] = view.layout.terminals[local]; const [rx, ry] = view.layout.terminals[remote];
    const point: Point = portals.get(remote) ?? (Math.abs(rx - x) > Math.abs(ry - y) ? [x + Math.sign(rx - x) * 100, y] : [x, y + (Math.sign(ry - y) || -1) * 100]);
    portals.set(remote, point); view.layout.terminals[remote] = point; view.layout.bends![connection.id] = [];
    const targetViewId = viewDefinitions.find(candidate => candidate.id !== definition.id && candidate.id !== 'overview' && candidate.assetIds.includes(remoteAssetId))?.id ?? 'overview';
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId, position: point });
  }
  return view;
});
export const servicesModel: NetworkModel = {
  id: 'site-services', version: 'construction-2026-10-22.2', name: 'Services / workshops / conveyors · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, earths, boundaries, sources, starting: { devices, sources: availability },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => {
    const document = asset.id.startsWith('rm712:') ? documents.rm712 : asset.id.startsWith('rm713:') ? documents.rm713 : asset.id.startsWith('rm412:') ? documents.rm412 : asset.id.startsWith('rm413:mcc414:') ? documents.mcc414 : asset.id.startsWith('rm413') ? documents.rm413 : documents.rm721;
    return { assetId: asset.id, status: 'unresolved', note: asset.id.startsWith('rm412:') ? 'RM412 linkage/common-side earth positions and complete physical interlocks remain unconfirmed; no accepted truth table or baseline.' : 'Physical interlocks, complete positions and baseline remain unconfirmed. The source does not confirm this control is permitted.', evidence: [{ ...document, clause: 'Represented switching region; full installed interlock/position conditions unconfirmed' }] };
  }), rules: [] },
  presentation: { overviewId: 'overview', views },
};
