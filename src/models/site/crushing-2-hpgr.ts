import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction IDs and terminal roles are software names. Supported means drawn,
// not accepted as installed. Actual source availability, states and interlocks are unknown.
const documents = {
  hv: { document: '11098-07110-EL-DR-2354.pdf', revision: '9 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  main: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  cross: { document: '11098-07110-EL-DR-2353.pdf', revision: '5 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  mc435: { document: '11098-07110-EL-DR-2660.pdf', revision: '7 (18/07/25; issued for construction)', page: 1 },
  mc435Continuation: { document: '11098-07110-EL-DR-2682.pdf', revision: '3 (18/07/25; issued for construction)', page: 1 },
  sw433: { document: '11098-07110-EL-DR-2456.pdf', revision: '5 (17/08/09)', page: 1 },
  sw453: { document: '11098-07110-EL-DR-2468.pdf', revision: '5 (12/08/09)', page: 1 },
  sw453Continuation: { document: '11098-07110-EL-DR-2469.pdf', revision: '6 (18/11/25; issued for construction)', page: 1 },
  hpgr: { document: 'CB112-02006-DR-EL-0005.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27/10/25)', page: 1 },
  legacy: { document: '11098-07110-EL-DR-2350.pdf', revision: '16 (31/05/16)', page: 1 },
};
type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Group = 'sw435-hv' | 'final-lv' | 'hpgr-hv' | 'hpgr-drives';
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const groups: Record<Group, string[]> = { 'sw435-hv': [], 'final-lv': [], 'hpgr-hv': [], 'hpgr-drives': [] };
const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };

function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([key, region]) => ({ ...documents[key], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set([...reviewIds, 'C2-R11'])] };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], memberOf: Group[]) {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminalPoints[index]; });
  for (const group of memberOf) groups[group].push(asset.id);
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim });
  if (bends) layout.bends![id] = bends;
}
function contact(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', point: Point, claim: Claim, memberOf: Group[], aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases: [label, ...aliases], kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], memberOf);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, claim: Claim, memberOf: Group[], aliases: string[] = []) {
  const terminal = contact(id, label, 'earth-switch', point, claim, memberOf, aliases);
  layout.rotations![id] = 0; layout.terminals[terminal[0]] = [point[0] - 30, point[1]]; layout.terminals[terminal[1]] = [point[0] + 30, point[1]]; layout.labelOffsets![id] = [0, 65];
  link(`${id}:branch`, from, terminal[0], claim, [[layout.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminal[1], ...claim });
}
function unknown(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}
function port(id: string, label: string, point: Point, claim: Claim, memberOf: Group[], aliases: string[] = []) {
  const terminal = `${id}:port`;
  add({ id, label, aliases, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], memberOf);
  unknown(`${id}:coverage`, terminal, `${label}: onward source/earth coverage unconfirmed`, claim);
  return terminal;
}
function bus(id: string, label: string, point: Point, claim: Claim, memberOf: Group[], aliases: string[] = []) {
  const terminal = `${id}:bar`;
  add({ id, label, aliases, kind: 'bus', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], memberOf);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, 55];
  return terminal;
}
function transformer(id: string, label: string, aliases: string[], point: Point, lvRoles: string[], claim: Claim, memberOf: Group[]) {
  const terminals = [`${id}:hv`, ...lvRoles.map(role => `${id}:${role}`)];
  const points: Point[] = [[point[0], point[1] - 30], ...lvRoles.map((_role, index) => [point[0] + (lvRoles.length === 2 ? index === 0 ? -45 : 45 : 0), point[1] + 30] as Point)];
  add({ id, label, aliases, kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...claim }, point, points, memberOf);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${label}: reverse/source-transfer and earth-transfer policy unconfirmed`, claim);
  return terminals;
}

const hvClaim = fact('C2-SW435-BUS', 'Single drawn SW435 22 kV phase bar; current installation, normal configuration and interlocks unconfirmed.', [['hv', 'C / 1-11, main bar'], ['overview', 'upper-right SW435 panel']]);
const hvBus = bus('sw435:bus', 'SW435 · 22 kV bus', [900, 320], hvClaim, ['sw435-hv'], ['SW435', 'SR435', 'SS435']);
layout.labelOffsets!['sw435:bus'] = [0, -35];
const incomingClaim = fact('C2-SW435-IN', 'SW435-P-01 from SW411 enters CB SW435 IN 01, with ES SW435 IN 01 on the incoming cable side. No available source is asserted.', [['hv', 'A-C / 1-2, tier 1 incomer'], ['main', 'D-G / 3-4, tier 4 SW435 feeder']]);
const incoming = contact('sw435:in:cb', 'CB SW435 IN 01', 'breaker', [100, 200], incomingClaim, ['sw435-hv'], ['CB SW435 IN01']);
const sw411Port = port('sw435:interface:sw411', 'SW411 · SW435-P-01', [100, 55], incomingClaim, ['sw435-hv'], ['SW435-P-01', 'SW411 tier 4']);
link('sw435:incoming:cable-SW435-P-01', sw411Port, incoming[0], incomingClaim);
link('sw435:incoming:bus-link', incoming[1], hvBus, incomingClaim, [[100, 320]]);
earthBranch('sw435:in:es', 'ES SW435 IN 01', incoming[0], [205, 115], incomingClaim, ['sw435-hv']);
earthBranch('sw435:bus:es', 'ES SW435', hvBus, [10, 420], hvClaim, ['sw435-hv']);

const crossClaim = fact('C2-SW431-LINK', 'SW435 tier 2 CB SW431 FD 02 and cable-side ES SW431 FD 02 continue via SW431-P-02 toward the opposite CB SW435 FD 02 / ES SW435 FD 02 at SW431. Interface reconciliation remains provisional.', [['hv', 'C-G / 2-3, tier 2 SW431 link'], ['cross', 'C-G / 2-3, opposite SW435 feeder']], ['C2-R11']);
const cross = contact('sw435:sw431:cb', 'CB SW431 FD 02', 'breaker', [50, 620], crossClaim, ['sw435-hv'], ['CB SW431 FD02']);
link('sw435:sw431:bus-link', hvBus, cross[0], crossClaim, [[50, 320]]);
earthBranch('sw435:sw431:es', 'ES SW431 FD 02', cross[1], [150, 735], crossClaim, ['sw435-hv']);
const crossPort = port('sw435:interface:sw431', 'SW431 · SW431-P-02', [50, 900], crossClaim, ['sw435-hv'], ['SW431-P-02', 'CB SW435 FD 02 at SW431']);
link('sw435:cross-link:cable-SW431-P-02', cross[1], crossPort, { ...crossClaim, knowledge: 'provisional' });

type LvEndpoint = { transformerId: string; terminal: string; cbId: string; busId: string; cableId: string; offset: number };
const lvEndpoints: LvEndpoint[] = [];
const lvTransformers: string[] = [];
function finalLv(transformerId: string, windingTerminal: string, cbId: string, cbLabel: string, busId: string, busLabel: string, point: Point, claim: Claim, aliases: string[], offset = 0) {
  const cb = contact(cbId, cbLabel, 'breaker', point, claim, ['final-lv'], aliases);
  const cableId = `${cbId}:winding-cable`; link(cableId, windingTerminal, cb[0], claim, [[point[0], point[1] - 130]]);
  const lvBus = bus(busId, busLabel, [point[0], point[1] + 170], claim, ['final-lv'], aliases);
  link(`${cbId}:bus-link`, cb[1], lvBus, claim);
  lvEndpoints.push({ transformerId, terminal: windingTerminal, cbId, busId, cableId, offset });
}
for (const branch of [
  { tf: 'tf435', board: 'mc435', x: 420, source: 'mc435' as const, dual: false, reviews: ['C2-R03'] },
  { tf: 'tf433', board: 'sw433', x: 850, source: 'sw433' as const, dual: true, reviews: ['C2-R03', 'C2-R07'] },
  { tf: 'tf453', board: 'sw453', x: 1280, source: 'sw453' as const, dual: true, reviews: ['C2-R02', 'C2-R03', 'C2-R08'] },
]) {
  const tf = branch.tf.toUpperCase(); const board = branch.board.toUpperCase(); const future = branch.tf === 'tf453';
  const feeder = fact(`C2-${tf}-FEEDER`, `${tf}-P-01 from CB ${tf} FD, cable-side ES ${tf} FD, to the depicted transformer. ${future ? 'HV sheet says SW453 FUTURE; current commissioning unconfirmed.' : 'Installed state remains unconfirmed.'}`, [['hv', `C-G, ${tf} feeder/destination`], [branch.source, 'A-C transformer/incomer power routes']], branch.reviews, future ? 'provisional' : 'supported');
  const cb = contact(`sw435:${branch.tf}:hv-cb`, `CB ${tf} FD`, 'breaker', [branch.x, 500], feeder, ['sw435-hv']);
  link(`sw435:${branch.tf}:bus-link`, hvBus, cb[0], feeder, [[branch.x, 320]]);
  earthBranch(`sw435:${branch.tf}:hv-es`, `ES ${tf} FD`, cb[1], [branch.x + 100, 600], feeder, ['sw435-hv']);
  const transfer = fact(`C2-${tf}-TRANSFER`, `Inference: candidate HV-to-${branch.dual ? 'separate LV delta/star winding' : 'LV winding'} source pairs follow the drawn supply. Backfeed and earth transfer are unconfirmed; no MEN-to-phase edge is established. ${future ? 'SW453 future/as-built contradiction remains unresolved.' : ''}`, [[branch.source, 'A-C transformer/incomers and separate phase bars'], ['hv', `G, ${tf} reference`]], [...branch.reviews, 'C2-R09'], 'provisional');
  const tfId = `sw435:${branch.tf}:transformer`; const windings = transformer(tfId, `${tf} · ${branch.dual ? 'D/Y windings' : '400 V winding'}`, [tf, future ? 'SW453 (FUTURE) on HV sheet' : `${tf} installation unconfirmed`], [branch.x, 760], branch.dual ? ['lv-d', 'lv-y'] : ['lv'], transfer, ['sw435-hv', 'final-lv']);
  lvTransformers.push(tfId); link(`sw435:${branch.tf}:cable-${tf}-P-01`, cb[1], windings[0], feeder);
  const endpoint = fact(`C2-${board}-LV`, `${board}: ${branch.dual ? 'two separate 690 V delta/star phase buses after named D/Y incoming breakers' : '400 V phase bar after CB MC435 IN'}. Neutral/MEN is separate from the phase bus. Outgoing LV circuits excluded.`, [[branch.source, 'A-D transformer, incoming breaker(s), phase bar(s)'], ...(branch.tf === 'tf435' ? [['mc435Continuation', 'C-D continuation of same phase bar'] as [keyof typeof documents, string]] : branch.tf === 'tf453' ? [['sw453Continuation', 'C, continuation of same D/Y phase bars'] as [keyof typeof documents, string]] : [])], branch.reviews, future ? 'provisional' : 'supported');
  for (const [index, suffix] of (branch.dual ? ['d', 'y'] : ['single']).entries()) {
    const prefix = branch.dual ? `sw435:${branch.board}:${suffix}` : `sw435:${branch.board}`; const offset = branch.dual ? index === 0 ? -80 : 80 : 0;
    const areaAliases = branch.board === 'sw433' ? ['Crushing No.1 variable speed drive switchboard 2 (body)', 'SW433 - Crushing No.2 (title)'] : branch.board === 'sw453' ? ['SW453 (FUTURE) on HV sheet', 'Train loading (body)', 'Stock piling apron feeders (title)'] : ['TF435 400V / overview 415V label unresolved'];
    finalLv(tfId, windings[index + 1], `${prefix}:cb`, `CB ${board} IN${branch.dual ? ` ${suffix.toUpperCase()}` : ''}`, `${prefix}:bus`, `${board}${branch.dual ? ` ${suffix.toUpperCase()}` : ''} · ${branch.dual ? '690' : '400'} V bus`, [branch.x + offset, 1030], endpoint, [board, ...areaAliases], offset);
  }
}

const futureClaim = fact('C2-TF436-FUTURE', 'Detailed tier 5 names CB/ES TF436 FD and a dashed FUTURE TF436/MC436 continuation; overview says SPARE FD. Endpoint and commissioning unconfirmed; no transformer, LV incomer or open circuit is invented.', [['hv', 'C-G / 6, tier 5 and FUTURE destination'], ['overview', 'SW435 tier 5 SPARE FD'], ['legacy', 'SW435 future MC436 branch']], ['C2-R01'], 'provisional');
const futureCb = contact('sw435:tf436:hv-cb', 'Tier 5 · CB TF436 FD / spare unconfirmed', 'breaker', [1550, 500], futureClaim, ['sw435-hv'], ['CB TF436 FD', 'CB SPARE FD']);
link('sw435:tf436:bus-link', hvBus, futureCb[0], futureClaim, [[1550, 320]]);
earthBranch('sw435:tf436:hv-es', 'ES TF436 FD / spare unconfirmed', futureCb[1], [1650, 610], futureClaim, ['sw435-hv'], ['ES TF436 FD', 'ES SPARE FD']);
const futurePort = port('sw435:interface:mc436', 'TF436 / MC436 · future coverage gap', [1550, 900], futureClaim, ['sw435-hv'], ['TF436', 'MC436', 'FUTURE', 'SPARE FD']);
link('sw435:tf436:future-continuation', futureCb[1], futurePort, futureClaim);

const hpgrFeeder = fact('C2-HPGR-FEEDER', 'CB HPGR FD and cable-side ES HPGR FD supply SW438-P-01 toward JB001. HV off-page text CB112-02066-DR-EL-00005 differs from supplied CB112-02006-DR-EL-0005.pdf.', [['hv', 'C-G / 8-9, tier 7 HPGR feeder'], ['hpgr', 'A-C / 2-3, JB001 arrival']], ['C2-R04']);
const hpgrCb = contact('sw435:hpgr:cb', 'CB HPGR FD', 'breaker', [1840, 500], hpgrFeeder, ['sw435-hv']);
link('sw435:hpgr:bus-link', hvBus, hpgrCb[0], hpgrFeeder, [[1840, 320]]);
earthBranch('sw435:hpgr:es', 'ES HPGR FD', hpgrCb[1], [1940, 620], hpgrFeeder, ['sw435-hv']);
const cabinet = fact('C2-JB001', 'JB001 ABB 22 kV HDC-A cable connection cabinet joins SW438-P-01 to TF001-P-01. No independent switch contact is drawn inside it.', [['hpgr', 'A-C / 2-3, junction cabinet']], ['C2-R04']);
add({ id: 'hpgr:jb001', label: 'JB001 · cable cabinet', aliases: ['JB001', 'ABB 22kV HDC-A'], kind: 'interface', terminals: ['hpgr:jb001:in', 'hpgr:jb001:out'], conductivePairs: [['hpgr:jb001:in', 'hpgr:jb001:out']], positions: [], ...cabinet }, [2150, 155], [[2150, 125], [2150, 185]], ['hpgr-hv']);
link('hpgr:cable-SW438-P-01', hpgrCb[1], 'hpgr:jb001:in', hpgrFeeder, [[2050, 530], [2050, 125]]);
const tf001Claim = fact('C2-TF001-TRANSFER', 'TF001 is drawn 22/6.6 kV delta/star, 4500 kVA. Candidate source transfer is provisional; reverse energisation and earth transfer are unconfirmed. SW002-P-02 is a 2 x 3-core cable group, not two sources.', [['hpgr', 'B-C / 2-4, TF001 and SW002 incomer'], ['overview', 'JB001/TF001/SW002 HPGR panel']], ['C2-R09'], 'provisional');
const tf001 = transformer('hpgr:tf001', 'TF001 · 22 / 6.6 kV', ['TF001', '4500kVA'], [2150, 310], ['mv'], tf001Claim, ['hpgr-hv']);
link('hpgr:cable-TF001-P-01', 'hpgr:jb001:out', tf001[0], cabinet);
const sw002Claim = fact('C2-SW002-BUS', 'SW002 common 6.6 kV bar. A01 incomer has Q8 earth branch but no drawn inline breaker/isolator. Do not invent one.', [['hpgr', 'A-C / 4, A01 incomer and common bar']], ['C2-R09']);
const sw002Bus = bus('hpgr:sw002:bus', 'SW002 · 6.6 kV bus', [2870, 450], sw002Claim, ['hpgr-hv'], ['SW002', '6.6kV ring main unit', 'ABB UniGear PE ZS1/ZVC']);
layout.labelOffsets!['hpgr:sw002:bus'] = [0, -40];
link('hpgr:cable-SW002-P-02-group', tf001[1], sw002Bus, sw002Claim, [[2150, 450]]);
earthBranch('hpgr:sw002:a01:q8', 'SW002 A01 · Q8', tf001[1], [2250, 385], sw002Claim, ['hpgr-hv'], ['A01 incomer Q8']);

function fuse(id: string, label: string, point: Point, claim: Claim) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases: [label], kind: 'interface', terminals, conductivePairs: [[...terminals]], positions: [], ...claim }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], ['hpgr-hv']);
  layout.labelOffsets![id] = [0, -45];
  return terminals;
}
for (const drive of [{ suffix: 'meb', tf: 'tf003', bay: 'a02', x: 2500 }, { suffix: 'mea', tf: 'tf002', bay: 'a04', x: 3500 }]) {
  const tf = drive.tf.toUpperCase(); const prefix = `hpgr:sw002:${drive.bay}`; const bayLabel = drive.bay.toUpperCase();
  const feeder = fact(`C2-${tf}-FEEDER`, `${bayLabel}: F1 225 A, K101 main contact, cable-side Q8 and ${tf}-P-01 to ${tf}. Contact positions and installed Fortress/interlock conditions unconfirmed.`, [['hpgr', `A-C / ${drive.bay === 'a02' ? '6' : '9'}, ${tf} feeder`]], ['C2-R09']);
  const fuseClaim = fact(`C2-${tf}-FUSE`, `Inference: candidate intact continuity of ${bayLabel} F1 (225 A) follows the drawn series fuse; present continuity/condition unconfirmed. No replace/remove state set is invented.`, [['hpgr', `A-C / ${drive.bay === 'a02' ? '6' : '9'}, F1`]], ['C2-R09'], 'provisional');
  const f1 = fuse(`${prefix}:f1`, `${bayLabel} F1 · 225 A continuity unconfirmed`, [drive.x, 600], fuseClaim);
  link(`${prefix}:bus-fuse`, sw002Bus, f1[0], feeder, [[drive.x, 450]]);
  const k101 = contact(`${prefix}:k101`, `${bayLabel} · K101`, 'disconnector', [drive.x, 745], feeder, ['hpgr-hv'], ['K101']);
  link(`${prefix}:fuse-contact`, f1[1], k101[0], feeder);
  earthBranch(`${prefix}:q8`, `${bayLabel} · Q8`, k101[1], [drive.x + 100, 835], feeder, ['hpgr-hv'], ['Q8']);
  const windingClaim = fact(`C2-${tf}-TRANSFER`, `${tf} depicts 6.6kV/2305V/2305V, 1440kVA, 720kVA per separate star/delta winding. Candidate source transfer is provisional; neither 2305V output is an LV bus. Reverse and earth transfer unconfirmed.`, [['hpgr', `C-E / ${drive.bay === 'a02' ? '5-6' : '9'}, transformer and VSD inputs`]], ['C2-R09', 'C2-R10'], 'provisional');
  const windings = transformer(`hpgr:${drive.tf}`, `${tf} · two 2305 V windings`, [tf, '1440kVA; 720kVA per winding', '2305V star/delta outputs; not LV endpoints'], [drive.x, 970], ['ac-star', 'ac-delta'], windingClaim, ['hpgr-hv', 'hpgr-drives']);
  link(`${prefix}:cable-${tf}-P-01`, k101[1], windings[0], feeder);
  const converterId = `hpgr:drive-${drive.suffix}:converter`;
  const converterClaim = fact(`C2-${tf}-CONVERTER`, `Unconfirmed converter transfer: VS-CR005${drive.suffix.toUpperCase()} ABB ACS-1000 has two rectifier AC inputs, a DC section and inverter output. No ordinary AC/DC/output conductive pair or complete operating-state table is established.`, [['hpgr', `D-G / ${drive.bay === 'a02' ? '5-6' : '9'}, ABB ACS-1000 and Fortress/DC/outlet drawings`]], ['C2-R09', 'C2-R10'], 'unresolved');
  const terminals = [`${converterId}:ac-star`, `${converterId}:ac-delta`, `${converterId}:dc`, `${converterId}:output`];
  add({ id: converterId, label: `VS-CR005${drive.suffix.toUpperCase()} · converter unresolved`, aliases: [`VS-CR005${drive.suffix.toUpperCase()}`, 'ABB ACS-1000', 'Rectifier / DC section / inverter; distinct groups'], kind: 'interface', terminals, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...converterClaim }, [drive.x, 1190], [[drive.x - 45, 1110], [drive.x + 45, 1110], [drive.x, 1190], [drive.x, 1260]], ['hpgr-drives']);
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, 'Converter AC/DC/output conductivity and scope unconfirmed', converterClaim);
  link(`hpgr:${drive.tf}:star-to-converter`, windings[1], terminals[0], feeder);
  link(`hpgr:${drive.tf}:delta-to-converter`, windings[2], terminals[1], feeder);
  const dcEarth = fact(`C2-${tf}-DC-EARTH`, `Physical DC-bus earthing switch is drawn with VSD internal Fortress key. Complete key/position conditions are unconfirmed; it connects only its represented DC group, not AC phase inputs.`, [['hpgr', `D-E / ${drive.bay === 'a02' ? '5-6' : '9'}, internal DC earthing switch/Fortress key`]], ['C2-R09']);
  earthBranch(`hpgr:drive-${drive.suffix}:dc-earth`, `${drive.suffix.toUpperCase()} · DC earth / Fortress`, terminals[2], [drive.x + 145, 1220], dcEarth, ['hpgr-drives'], ['VSD INTERNAL FORTRESS KEY', 'DC BUS EARTHING SWITCH']);
  const outletId = `hpgr:drive-${drive.suffix}:outlet`; const outletTerminals = [`${outletId}:vsd`, `${outletId}:motor`, `${outletId}:earth`];
  add({ id: outletId, label: `${drive.suffix.toUpperCase()} switched outlet · positions unconfirmed`, aliases: ['Motor-operated switched outlet isolator with earth contact', 'Common motor-side pole; permitted state set unconfirmed'], kind: 'interface', terminals: outletTerminals, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...converterClaim }, [drive.x, 1440], [[drive.x, 1390], [drive.x, 1490], [drive.x + 80, 1440]], ['hpgr-drives']);
  for (const terminal of outletTerminals) unknown(`${terminal}:coverage`, terminal, 'Outlet VSD/motor/earth contact relationships and positions unconfirmed', converterClaim);
  earths.push({ id: `${outletId}:earth-termination`, label: `${drive.suffix.toUpperCase()} outlet earth contact termination`, terminal: outletTerminals[2], ...dcEarth });
  link(`hpgr:drive-${drive.suffix}:inverter-to-outlet`, terminals[3], outletTerminals[0], feeder);
  const motor = port(`hpgr:motor-${drive.suffix}`, `CR005${drive.suffix.toUpperCase()} motor · 4000 V, 1150 kW`, [drive.x, 1640], converterClaim, ['hpgr-drives'], [`CR005${drive.suffix.toUpperCase()}`, '4000V motor; MV load scope unresolved']);
  link(`hpgr:cable-CR005${drive.suffix.toUpperCase()}-P-01`, outletTerminals[1], motor, feeder);
}

const tf004Claim = fact('C2-TF004-FEEDER', 'Middle SW002 feeder prints A01 TE004 FEEDER (duplicate A01), while overview says A03. Drawn order K202 then F101 40 A then cable-side Q8 and TF004-P-01. Canonical bay identity unconfirmed.', [['hpgr', 'A-C / 7-8, middle feeder'], ['overview', 'SW002 A03 / TF004 branch']], ['C2-R05', 'C2-R06']);
const k202 = contact('hpgr:sw002:tf004:k202', 'TF004 feeder · K202', 'disconnector', [3000, 600], tf004Claim, ['hpgr-hv'], ['A01 TE004 FEEDER', 'A03', 'K202']);
link('hpgr:tf004:bus-k202', sw002Bus, k202[0], tf004Claim, [[3000, 450]]);
const f101Claim = fact('C2-TF004-F101', 'Inference: candidate intact F101 40 A series-fuse continuity; actual condition unconfirmed.', [['hpgr', 'A-C / 7-8, F101']], ['C2-R05', 'C2-R09'], 'provisional');
const f101 = fuse('hpgr:sw002:tf004:f101', 'TF004 feeder · F101 40 A continuity unconfirmed', [3000, 745], f101Claim);
link('hpgr:tf004:k202-f101', k202[1], f101[0], tf004Claim);
earthBranch('hpgr:sw002:tf004:q8', 'TF004 feeder · Q8', f101[1], [3100, 835], tf004Claim, ['hpgr-hv'], ['Q8', 'A01 TE004 FEEDER / A03']);
const tf004Transfer = fact('C2-TF004-TRANSFER', 'TF004 is depicted delta/star 6.6kV/440V, 500kVA. Candidate source transfer is provisional; reverse/earth transfer unknown. Neutral MEN annotation is not a phase-earth path.', [['hpgr', 'C-E / 7-8, TF004 neutral and phase output']], ['C2-R06', 'C2-R09'], 'provisional');
const tf004 = transformer('hpgr:tf004', 'TF004 · 6.6 kV / 440 V', ['TF004', 'TE004 (disputed feeder text)', '500kVA'], [3000, 970], ['lv'], tf004Transfer, ['hpgr-hv', 'final-lv']);
lvTransformers.push('hpgr:tf004'); link('hpgr:cable-TF004-P-01', f101[1], tf004[0], tf004Claim);
const mcc = fact('C2-HPGR-MCC', 'TF004 phase cable MC001-P-01-XX enters an incoming MCCB described Terasaki XS1250SE O/C E/F and MC001 415 VAC 3-phase 50Hz 1200A phase bar. Overview says MC438; unique incoming tag, endpoint identity and 440/415V labels remain unresolved. Referenced CB112-02006-DR-EL-0001/0002 are absent.', [['hpgr', 'C-E / 7-8, TF004/MCCB/MC001 bar'], ['overview', 'SW002 TF004 output to MC438']], ['C2-R06'], 'provisional');
finalLv('hpgr:tf004', tf004[1], 'hpgr:mc001:cb', 'HPGR MCC incoming MCCB · tag unconfirmed', 'hpgr:mc001:bus', 'HPGR MCC · MC001 / MC438 · 415 V label unconfirmed', [3000, 1150], mcc, ['MC001', 'MC438', 'Terasaki XS1250SE; description not unique tag', '415VAC / TF004 440V']);

const questions: [string, string][] = [
  ['C2-R01', 'Resolve TF436/MC436 FUTURE versus SPARE tier 5 and missing endpoint coverage; do not infer open/disconnected status.'],
  ['C2-R02', 'Resolve SW453 FUTURE on HV sheet versus later as-built/overview endpoint; commissioning remains unknown.'],
  ['C2-R03', 'Resolve TF435 400/415V and TF433/TF453 690/720V labels without rating calculations or accepted drawing precedence.'],
  ['C2-R04', 'Resolve HPGR off-page CB112-02066-DR-EL-00005 versus supplied CB112-02006-DR-EL-0005.pdf.'],
  ['C2-R05', 'Resolve duplicate A01 / TE004 middle feeder versus overview A03 / TF004; preserve all aliases.'],
  ['C2-R06', 'Resolve MC001/MC438, TF004 440V/MCC415V labels, unknown MCCB tag and absent MCC endpoint reference sheets.'],
  ['C2-R07', 'SW433 body says Crushing No.1 switchboard2 but title says Crushing No.2; preserve SW435 power reference.'],
  ['C2-R08', 'SW453 body/train-loading/control reference SW451 differs from SW435 power reference and stockpiling title; control lines are not another supply.'],
  ['C2-R09', 'Confirm transformer transfer/earth policies, converter AC/DC/output conductivity, Fortress keys, outlet state sets and complete physical interlocks. No converter metallic shortcut is defined.'],
  ['C2-R10', 'Confirm scope/termination for the two 2305V-winding/4000V motor branches; keep visible as MV converter interfaces, not LV endpoints.'],
  ['C2-R11', 'Owner to confirm installed configuration, normal states, fuse continuity, withdrawal/racking states and physical interlocks. All represented control baselines remain null and blocked.'],
];
evidence.push({ id: 'C2-DISCREPANCIES', status: 'unresolved', summary: 'Future/spare status, source-specific display/control aliases, voltages, repeated bay labels and missing MCC/trip reference sheets remain unresolved. No accepted precedence or baseline exists.', references: [{ ...documents.hv, clause: 'TF436/MC436 FUTURE; SW453 FUTURE; HPGR off-page reference' }, { ...documents.sw433, clause: 'Body/title and incoming power reference' }, { ...documents.sw453, clause: 'Body/title and left CT/control reference to SW451' }, { ...documents.legacy, clause: 'SW435 transformer ratings / future MC436' }, { ...documents.hpgr, clause: 'A01 TE004 FEEDER; MC001; Fortress keys; JB002 trip/control reference CB112-02006-DR-EL-0008; notes1-2' }, { ...documents.overview, clause: 'SW435 SPARE tier5; SW002 A03/MC438 and notes1-2' }] });
const reviews: NonNullable<NetworkModel['reviews']> = questions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: ['C2-DISCREPANCIES', ...evidence.filter(record => assets.some(asset => asset.evidenceIds?.includes(record.id) && asset.reviewIds?.includes(id))).map(record => record.id)] }));

const lvLayout = structuredClone(layout);
for (const [index, tfId] of lvTransformers.entries()) {
  const tf = assets.find(asset => asset.id === tfId)!; const x = 220 + index * 420;
  lvLayout.assets[tfId] = [x, 160]; lvLayout.terminals[tf.terminals[0]] = [x, 130];
  tf.terminals.slice(1).forEach((terminal, output) => { lvLayout.terminals[terminal] = [x + (tf.terminals.length === 3 ? output === 0 ? -45 : 45 : 0), 190]; });
  const supply = connections.find(connection => connection.to === tf.terminals[0])!;
  lvLayout.terminals[supply.from] = [x, 0];
  for (const endpoint of lvEndpoints.filter(item => item.transformerId === tfId)) {
    const ex = x + endpoint.offset; const cb = assets.find(asset => asset.id === endpoint.cbId)!;
    lvLayout.assets[cb.id] = [ex, 380]; lvLayout.terminals[cb.terminals[0]] = [ex, 350]; lvLayout.terminals[cb.terminals[1]] = [ex, 410];
    lvLayout.assets[endpoint.busId] = [ex, 550]; lvLayout.terminals[`${endpoint.busId}:bar`] = [ex, 550]; lvLayout.bends![endpoint.cableId] = [[ex, 260]];
  }
}
const viewDefinitions: { id: Group; label: string; bounds: DiagramView['bounds']; layout: DiagramLayout }[] = [
  { id: 'sw435-hv', label: 'SW435 HV · 2354 rev9', bounds: [-170, -10, 2250, 1000], layout: structuredClone(layout) },
  { id: 'final-lv', label: 'Final LV buses · source references in inspection', bounds: [80, -30, 1630, 740], layout: lvLayout },
  { id: 'hpgr-hv', label: 'HPGR 22/6.6 kV · 0005 rev7', bounds: [1950, 0, 1830, 1150], layout: structuredClone(layout) },
  { id: 'hpgr-drives', label: 'HPGR MV converters · unresolved scope', bounds: [2250, 820, 1530, 940], layout: structuredClone(layout) },
];
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const detailViews: DiagramView[] = viewDefinitions.map(definition => {
  const visible = new Set(groups[definition.id]); const view: DiagramView = { ...definition, assetIds: [...visible], boundaries: [] }; const portals = new Map<string, Point>();
  for (const connection of connections) {
    const fromVisible = visible.has(owners.get(connection.from)!); const toVisible = visible.has(owners.get(connection.to)!);
    if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!; const [x, y] = view.layout.terminals[local]; const [rx, ry] = view.layout.terminals[remote];
    const point: Point = portals.get(remote) ?? (Math.abs(rx - x) > Math.abs(ry - y) ? [x + Math.sign(rx - x) * 100, y] : [x, y + (Math.sign(ry - y) || -1) * 100]);
    portals.set(remote, point); view.layout.terminals[remote] = point; view.layout.bends![connection.id] = [];
    const target = viewDefinitions.find(candidate => candidate.id !== definition.id && groups[candidate.id].includes(remoteAssetId))?.id ?? 'overview';
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target, position: point });
  }
  return view;
});

export const crushing2HpgrModel: NetworkModel = {
  id: 'site-crushing-2-hpgr', version: 'construction-2026-10-22.1', name: 'Crushing No. 2 / HPGR · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, boundaries, earths, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Unconfirmed installed physical interlocks, Fortress/key conditions, racking/withdrawal and baseline. The source does not confirm this control is permitted.', evidence: [{ ...(asset.id.startsWith('hpgr:') ? documents.hpgr : asset.id.includes(':mc435:') ? documents.mc435 : asset.id.includes(':sw433:') ? documents.sw433 : asset.id.includes(':sw453:') ? documents.sw453 : documents.hv), clause: 'Represented device/control region; complete operating-state/interlock conditions unconfirmed' }] })), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Crushing No.2 / HPGR overview · provisional', assetIds: assets.map(asset => asset.id), layout, bounds: [-170, -20, 3950, 1800] }, ...detailViews] },
};
