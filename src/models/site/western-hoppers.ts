import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Supported means depicted. Role IDs and provisional position/transfer candidates
// establish neither installed device identities nor actual switching permission.
const documents = {
  h1rmu: { document: 'CB16OP038A-02006-DR-EL-0044.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h1lv: { document: 'CB16OP038A-02006-DR-EL-0045.pdf', revision: '1 (AS BUILT; handwritten date unconfirmed)', page: 1 },
  h1hv: { document: 'CB16OP038A-02006-DR-EL-0046.pdf', revision: '3 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h7rmu: { document: 'CB17OP023C-01006-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h7hv: { document: 'CB17OP023C-01006-DR-EL-0002.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h7lv: { document: 'CB17OP023C-01006-DR-EL-0003.pdf', revision: '1 (14.06.18; AS BUILT)', page: 1 },
  h7earth: { document: 'CB17OP023C-01006-DR-EL-0004.pdf', revision: '3 (03.09.20; ISSUED FOR CONSTRUCTION)', page: 1 },
  h7control: { document: 'CB17OP023C-01006-DR-EL-0041.pdf', revision: '4 (06.10.20; AS BUILT)', page: 1 },
  h9rmu: { document: 'CB19OP001C-01068-DR-EL-0001.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h9hv: { document: 'CB19OP001C-01068-DR-EL-0002.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  h9lv: { document: 'CB19OP001C-01068-DR-EL-0003.pdf', revision: '1 (15.06.20; AS BUILT)', page: 1 },
  h9lv2: { document: 'CB19OP001C-01068-DR-EL-0004.pdf', revision: '2 (22.07.20; RE-ISSUED FOR AS BUILT)', page: 1 },
  h9earth: { document: 'CB19OP001C-01068-DR-EL-0005.pdf', revision: '2 (28.07.20; RE-ISSUED FOR AS BUILT)', page: 1 },
  h9motor: { document: 'CB19OP001C-01068-DR-EL-0153.pdf', revision: '1 (05.11.20; AS BUILT)', page: 1 },
  cv: { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  rm406: { document: 'CB19OP001B-04057-DR-EL-0002.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  rm410: { document: 'CB19OP001B-04057-DR-EL-0004.pdf', revision: '6 (28.01.25; AS FOUND 23.10.21)', page: 1 },
  rm413: { document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  overview1: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp)', page: 1 },
  overview2: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp)', page: 1 },
};
type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Location = [keyof typeof documents, string];
type Group = 'h1-rmu' | 'h1-hv' | 'h1-lv' | 'h3' | 'h7-rmu' | 'h7-hv' | 'h7-lv' | 'h8' | 'h9-rmu' | 'h9-hv' | 'h9-lv';
const origins: Record<Group, Point> = { 'h1-rmu': [0, 0], 'h1-hv': [1500, 0], 'h1-lv': [3000, 0], h3: [0, 1450], 'h7-rmu': [0, 2900], 'h7-hv': [1500, 2900], 'h7-lv': [3000, 2900], h8: [1500, 1450], 'h9-rmu': [0, 4350], 'h9-hv': [1500, 4350], 'h9-lv': [3000, 4350] };
const assets: Asset[] = []; const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = []; const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const earths: NonNullable<NetworkModel['earths']> = []; const devices: NetworkModel['starting']['devices'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const members = new Map<string, Group>();
function fact(id: string, summary: string, locations: Location[], reviews: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, summary, status: knowledge, references: locations.map(([source, region]) => ({ ...documents[source], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set([...reviews, 'WH-Q12'])] };
}
function add(asset: Asset, group: Group, point: Point, terminalOffsets: Point[]) {
  const [ox, oy] = origins[group]; const [x, y] = point;
  assets.push(asset); members.set(asset.id, group); layout.assets[asset.id] = [x + ox, y + oy];
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = [x + ox + terminalOffsets[index][0], y + oy + terminalOffsets[index][1]]; });
  layout.labelOffsets![asset.id] = [0, -50];
}
function link(id: string, from: string, to: string, claim: Claim) {
  connections.push({ id, from, to, ...claim });
  const [x, y] = layout.terminals[from]; const [tx, ty] = layout.terminals[to];
  layout.bends![id] = x !== tx && y !== ty ? [[x, y + 55], [tx, y + 55]] : [];
}
function unknown(id: string, terminal: string, label: string, claim: Claim) { boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim }); }
function endpoint(id: string, label: string, aliases: string[], group: Group, point: Point, claim: Claim) {
  const port = `${id}:port`; add({ id, label, aliases, kind: 'interface', terminals: [port], conductivePairs: [], positions: [], ...claim }, group, point, [[0, 0]]);
  unknown(`${id}:coverage`, port, `${label}: continuation/source/earth coverage unconfirmed`, claim); return port;
}
function bar(id: string, label: string, aliases: string[], group: Group, point: Point, claim: Claim) {
  const terminal = `${id}:bar`; add({ id, label, aliases, kind: 'bus', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, group, point, [[0, 0]]);
  layout.rotations![id] = 90; return terminal;
}
function binary(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', group: Group, point: Point, claim: Claim, aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, group, point, [[0, -30], [0, 30]]);
  layout.rotations![id] = 90; devices[id] = null; return terminals;
}
function earthBranch(id: string, label: string, from: string, group: Group, point: Point, claim: Claim) {
  const terminals = binary(id, label, 'earth-switch', group, point, claim, [label]);
  const [x, y] = layout.assets[id]; layout.terminals[terminals[0]] = [x - 30, y]; layout.terminals[terminals[1]] = [x + 30, y]; layout.rotations![id] = 0; layout.labelOffsets![id] = [95, 0];
  link(`${id}:branch`, from, terminals[0], claim); earths.push({ id: `${id}:earth`, label: `${label} termination`, terminal: terminals[1], ...claim });
}
function changeover(id: string, label: string, group: Group, point: Point, claim: Claim, aliases: string[] = []) {
  const terminals = [`${id}:line`, `${id}:common`, `${id}:earth`];
  const positionEvidence = `${id}:position-evidence`;
  evidence.push({ id: positionEvidence, status: 'provisional', summary: `Inference: ${label} main/earth contact depiction is represented by Service/Isolated/Earthed candidates with a distinct common terminal. Complete installed positions, mechanism and interlocks are unconfirmed.`, references: (claim.evidenceIds ?? []).flatMap(eid => evidence.find(record => record.id === eid)!.references) });
  const positionClaim: Claim = { knowledge: 'provisional', evidenceIds: [...(claim.evidenceIds ?? []), positionEvidence], reviewIds: [...new Set([...(claim.reviewIds ?? []), 'WH-POSITIONS'])] };
  add({ id, label, aliases, kind: 'disconnector', terminals, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [{ id: 'service', label: 'Service (candidate)', pairs: [[terminals[0], terminals[1]]] }, { id: 'isolated', label: 'Isolated (candidate)', pairs: [] }, { id: 'earthed', label: 'Earthed (candidate)', pairs: [[terminals[1], terminals[2]]] }], ...positionClaim }, group, point, [[0, -40], [0, 40], [75, 0]]);
  layout.labelOffsets![id] = [0, 85];
  earths.push({ id: `${id}:earth-termination`, label: `${label} depicted earth contact`, terminal: terminals[2], ...claim }); devices[id] = null;
  return terminals;
}
function transformer(id: string, label: string, aliases: string[], group: Group, point: Point, input: string, locations: Location[]) {
  const identityReviews = group === 'h3' || group === 'h8' ? ['WH-Q01', 'WH-Q07'] : group === 'h7-rmu' ? ['WH-Q02'] : [];
  const claim = fact(`${id}:transfer`, `Inference: ${label} has a provisional bidirectional HV/output source-pair candidate. Source/backfeed and independent phase-earth winding policy remain unconfirmed; neutral/NER and MEN are not phase-bus earth paths.`, locations, ['WH-WINDINGS', 'WH-Q06', ...identityReviews], 'provisional');
  const terminals = [`${id}:hv`, `${id}:secondary`];
  add({ id, label: `${label}\nTransfer unconfirmed`, aliases, kind: 'transformer', terminals, conductivePairs: [], sourcePairs: [[terminals[0], terminals[1]]], earthPairs: [], positions: [], ...claim }, group, point, [[0, -40], [0, 40]]);
  link(`${id}:input`, input, terminals[0], fact(`${id}:wire`, `${label} primary conductor is drawn from its feeder; transfer semantics remain separate.`, locations));
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${label} source/earth winding coverage unconfirmed`, claim);
  return terminals[1];
}
function lvBus(id: string, label: string, group: Group, input: string, locations: Location[], incomingLabel: string) {
  const claim = fact(`${id}:endpoint`, `${label} phase supply passes its incoming main device to one final 415V phase bar. Instrumentation/CT, neutral/MEN and outgoing LV circuits are separate; only this first bar is represented.`, locations);
  const incoming = binary(`${id}:in`, incomingLabel, 'breaker', group, [550, 300], claim, [incomingLabel]);
  link(`${id}:supply`, input, incoming[0], claim); const bus = bar(`${id}:bus`, `${label}\n415 V final LV bus`, [label], group, [550, 650], claim);
  link(`${id}:incomer-bus`, incoming[1], bus, claim);
}
function hvMcc(hopper: 'h1' | 'h7' | 'h9', board: string, input: string, source: 'h1hv' | 'h7hv' | 'h9hv', motorPrefix: string) {
  const group = `${hopper}-hv` as Group; const id = `wh:${hopper}:${board.toLowerCase()}`;
  const note = fact(`WH-${hopper}-KEY-NOTES`, `Source transcription, not installed permission: note5 “SIZER MAINTENANCE KEY INTERLOCK (RONIS KEY SYSTEM). KEY CAPTIVE WHEN EARTH SWITCH ‘OFF’.” Note6 “6.9kV HV ${hopper === 'h9' ? 'INTERLOCK' : 'KEY INTERLOCK'}. EARTH SWITCH CAN BE CLOSED AFTER EARTH SWITCH UPSTREAM IS CLOSED.”${hopper === 'h9' ? ' This sheet omits the captive-when-ON sentence; its upstream reference points to the same0002 sheet. RM419 administrative provision is separate.' : ' “KEY CAPTIVE WHEN EARTH SWITCH “ON”.”'} Exact keys, upstream-device mapping and full conditions remain unconfirmed.`, [[source, 'F-G / 1-7, notes5-6 and legend']], ['WH-Q08', 'WH-POSITIONS']);
  const depicted = fact(`${id}:topology`, `${board} has one 6.6kV phase bar, a 200A incoming VCB with transformer-side earth and two paired fused FC/RC motor contactor routes meeting at each motor conductor. Each motor has a separate maintenance earth. Electrical/mechanical/key interlock glyphs are depicted, but no complete installed truth table is established. Auxiliary 24/48V, VT, CT and trip wiring are not phase supplies.`, [[source, `A-F / 4-11, incoming tier${hopper === 'h9' ? '5' : '1'} and two motor groups`]], ['WH-Q06', 'WH-Q08', 'WH-POSITIONS']);
  const claim: Claim = { ...depicted, evidenceIds: [...depicted.evidenceIds!, ...note.evidenceIds!] };
  const incoming = binary(`${id}:in`, `${board} incoming VCB`, 'breaker', group, [180, 220], claim, ['VCB 200A', `Tier ${hopper === 'h9' ? '5' : '1'}`]);
  link(`${id}:supply`, input, incoming[0], claim);
  earthBranch(`${id}:in-earth`, `${board} incoming earth`, incoming[0], group, [300, 100], claim);
  const bus = bar(`${id}:bus`, `${board}\n6.6 kV HV bus`, [board, '6.6kV bar; transformer labelled6.9kV'], group, [650, 380], claim);
  link(`${id}:incoming-bus`, incoming[1], bus, claim);
  for (const [motor, center] of [[1, 550], [2, 1100]] as const) {
    const prefix = `${id}:m${motor}`; const common = `${prefix}:common:port`;
    add({ id: `${prefix}:common`, label: `${board} motor${motor} junction`, aliases: ['Common motor-side conductor'], kind: 'interface', terminals: [common], conductivePairs: [], positions: [], ...claim }, group, [center, 850], [[0, 0]]);
    for (const [role, offset] of [['rc', -100], ['fc', 100]] as const) {
      const fuseId = `${prefix}:${role}:fuse`; const ports: [string, string] = [`${fuseId}:a`, `${fuseId}:b`];
      const intact = fact(`${fuseId}:continuity`, `${board} motor${motor} ${role.toUpperCase()} branch has a depicted series fuse. Inference: intact continuity is a provisional candidate; actual fuse condition/removal remains unconfirmed.${hopper === 'h7' ? ' Note11 says100A fuses are to be replaced by200A in future; current upgrade is not established.' : ''}`, [[source, 'C-D / 7-11, fused FC/RC paths']], ['WH-Q12'], 'provisional');
      add({ id: fuseId, label: 'Phase fuse\nContinuity unconfirmed', aliases: [hopper === 'h9' ? '200A fuse depiction' : '100A fuse depiction', ...(hopper === 'h7' ? ['Note11:200A future replacement'] : [])], kind: 'interface', terminals: ports, conductivePairs: [[...ports]], positions: [], ...intact }, group, [center + offset, 490], [[0, -20], [0, 20]]);
      link(`${fuseId}:bus-link`, bus, ports[0], claim);
      const contact = binary(`${prefix}:${role}`, `${board} M${motor} ${role.toUpperCase()}`, 'disconnector', group, [center + offset, 650], claim, [role.toUpperCase(), `Motor${motor}`, 'Paired contactor; exact installed tag unconfirmed']);
      link(`${prefix}:${role}:fuse-contact`, ports[1], contact[0], claim); link(`${prefix}:${role}:common-link`, contact[1], common, claim);
    }
    earthBranch(`${prefix}:earth`, `${board} M${motor} maintenance earth`, common, group, [center + 130, 950], claim);
    const motorTag = `${motorPrefix}-EM0${motor}`;
    link(`${prefix}:motor-cable`, common, endpoint(`${prefix}:motor`, `${motorTag}\nHV sizer motor`, [motorTag, 'HV motor; no downstream LV bus established'], group, [center, 1120], claim), claim);
  }
}

const h1 = fact('WH-H1-RMU', 'Hopper1 SS417/RM417 has one 22kV phase bar; SW01/SW02 commons are bar-side; CB01→SW03 common feeds TF417 and TF417A; CB02→SW04 common continues to Hopper3. Control buses/motor operators are not phase supply connections.', [['h1rmu', 'A-F / 3-10, RM417 main/earth contacts and transformer primary forks'], ['overview2', 'E-G / 11-12, common TF417/TF417A fork; truncated CB02']], ['WH-Q01', 'WH-Q09']);
const h1Bus = bar('wh:h1:rm417:bus', 'RM417\n22 kV HV bus', ['RM417', 'SS417', 'Hopper1'], 'h1-rmu', [650, 350], h1);
const h1Incoming = changeover('wh:h1:rm417:sw01', 'RM417 SW01', 'h1-rmu', [250, 180], h1, ['RM417-SW01']);
link('wh:h1:rm417:sw01-bus', h1Incoming[1], h1Bus, h1);
const h1Source = endpoint('wh:h1:interface:rm413', 'RM413 IN02 interface', ['FROM RM413 (RMU)', 'CB17OP023A-04057-DR-EL-0004', 'SS417-RM417-P01'], 'h1-rmu', [250, 50], fact('WH-H1-RM413', 'RM413 IN02 explicitly continues to RM417 SW01; upstream RM413 equipment belongs to its area. No local source/availability is invented.', [['h1rmu', 'A / 6-7, FROM RM413'], ['rm413', 'A-B / 2-5, RM413 IN02 double-boot branch to RM417']], ['WH-Q12']));
link('wh:h1:rm413-cable', h1Source, h1Incoming[0], h1);
const h1Ring = changeover('wh:h1:rm417:sw02', 'RM417 SW02', 'h1-rmu', [550, 180], h1, ['RM417-SW02']);
link('wh:h1:rm417:sw02-bus', h1Ring[1], h1Bus, h1); link('wh:h1:rm417:sw02-stub', endpoint('wh:h1:rm417:sw02:interface', 'SW02 destination unconfirmed', ['RM417-SW02'], 'h1-rmu', [550, 50], h1), h1Ring[0], h1);
const h1Cb = binary('wh:h1:rm417:cb01', 'RM417 CB01', 'breaker', 'h1-rmu', [800, 520], h1, ['RM417-CB01']);
link('wh:h1:cb01-bus', h1Bus, h1Cb[0], h1);
const h1Out = changeover('wh:h1:rm417:sw03', 'RM417 SW03', 'h1-rmu', [800, 730], h1, ['RM417-SW03']); link('wh:h1:cb01-sw03', h1Cb[1], h1Out[0], h1);
const h1HvOutput = transformer('wh:h1:tf417', 'TF417 · 22/6.9 kV', ['SS417-TF417', '2500kVA', 'DYN11'], 'h1-rmu', [750, 1020], h1Out[1], [['h1rmu', 'D-F / 3-4, TF417 primary and A secondary']]);
const h1LvOutput = transformer('wh:h1:tf417a', 'TF417A · 22/0.415 kV', ['SS417-TF417A', '500kVA', 'DYN11'], 'h1-rmu', [1100, 1020], h1Out[1], [['h1rmu', 'D-F / 4-5, TF417A primary and B secondary']]);
lvBus('wh:h1:mc417a', 'SS417-MC417A', 'h1-lv', h1LvOutput, [['h1lv', 'A-C / 8-10, 630A MCCB and 415V phase bar'], ['h1rmu', 'F / 4-5, B phase output separate from Ba instrumentation']], 'MC417A MCCB · 630 A');
hvMcc('h1', 'MC417', h1HvOutput, 'h1hv', 'SZ001');
const h3Cb = binary('wh:h1:rm417:cb02', 'RM417 CB02', 'breaker', 'h1-rmu', [1150, 520], h1, ['RM417-CB02']); link('wh:h1:cb02-bus', h1Bus, h3Cb[0], h1);
const h3Out = changeover('wh:h1:rm417:sw04', 'RM417 SW04', 'h1-rmu', [1150, 730], h1, ['RM417-SW04']); link('wh:h1:cb02-sw04', h3Cb[1], h3Out[0], h1);
const h3 = fact('WH-H3-CANDIDATE', 'Hopper3 SS416-HV416 from RM417 CB02/SW04 splits to TF416 and TF416A. It shares printed tags with Hopper8 under a different project/feed; these source-scoped construction identities are not silently merged.', [['h1rmu', 'D-G / 8-11, HOPPER3 SS416 KIOSK and SS416-HV416 fork']], ['WH-Q01', 'WH-Q07']);
const h3Junction = 'wh:h3:hv416:port'; add({ id: 'wh:h3:hv416', label: 'Hopper3 · SS416-HV416', aliases: ['SS416-HV416', 'HOPPER3', 'CB16OP038A'], kind: 'interface', terminals: [h3Junction], conductivePairs: [], positions: [], ...h3 }, 'h3', [650, 100], [[0, 0]]);
link('wh:h1:hopper3-cable', h3Out[1], h3Junction, h3);
for (const [key, label, voltage, x, file] of [['tf416', 'TF416', '22/6.9 kV', 350, '0166'], ['tf416a', 'TF416A', '22/0.415 kV', 950, '0165']] as const) {
  const output = transformer(`wh:h3:${key}`, `Hopper3 ${label} · ${voltage}`, [`SS416-${label}`, 'HOPPER3', 'CB16OP038A'], 'h3', [x, 400], h3Junction, [['h1rmu', `D-G / 8-11, Hopper3 ${label}`]]);
  const id = key === 'tf416' ? 'wh:h3:mc416:interface' : 'wh:h3:mc416a:interface'; const destination = key === 'tf416' ? 'MC416 HV detail missing' : 'MC416A LV detail missing';
  link(`${id}:supply`, output, endpoint(id, `Hopper3 ${destination}`, [destination, `CB16OP038A-02006-DR-EL-${file}`, 'HOPPER3'], 'h3', [x, 800], h3), h3);
}

const h7 = fact('WH-H7-RMU', 'Hopper7 RM418 rev6 has separate SW01/SW02 main contacts, CB03 with following disconnect and earth contacts feeding the common TF418/TF418A primary fork, and CB04 with following disconnect/earth contacts ending SPARE. Current CB03/04 differ from older CV006 CB01/02 and control aliases.', [['h7rmu', 'A-F / 3-9, revision6 contact clouds and transformer fork'], ['cv', 'E-F / 6-8, older RM418 CB01/CB02 and TF418A/TF418B labels'], ['overview1', 'E-G / 10-12, RM418 current CB03/04']], ['WH-Q02', 'WH-Q03', 'WH-Q05']);
const h7Bus = bar('wh:h7:rm418:bus', 'RM418\n22 kV HV bus', ['RM418', 'SS418', 'HOPPER7'], 'h7-rmu', [650, 350], h7);
const h7In = binary('wh:h7:rm418:sw01', 'RM418 SW01', 'disconnector', 'h7-rmu', [250, 180], h7, ['RM418-SW01']); link('wh:h7:sw01-bus', h7In[1], h7Bus, h7);
const h7InEarth = fact('WH-H7-IN01-EARTH', 'Inference: overview labels RM418 ES01 at the incoming cable side, but current detailed0001 rev6 omits its earth glyph. This earth branch is a provisional review candidate, not confirmed installed hardware.', [['overview1', 'E-G / 10-12, RM418 ES01'], ['h7rmu', 'A-B / 6, incomingSW01 contact without earth glyph']], ['WH-POSITIONS', 'WH-Q02'], 'provisional');
earthBranch('wh:h7:rm418:sw01:es', 'RM418 ES01 · unconfirmed', h7In[0], 'h7-rmu', [370, 90], h7InEarth);
const h7Ring = binary('wh:h7:rm418:sw02', 'RM418 SW02 · spare', 'disconnector', 'h7-rmu', [600, 180], h7, ['RM418-SW02', 'SPARE']); link('wh:h7:sw02-bus', h7Ring[1], h7Bus, h7);
earthBranch('wh:h7:rm418:sw02:es', 'RM418 SW02 cable earth', h7Ring[0], 'h7-rmu', [720, 90], h7);
link('wh:h7:sw02-stub', endpoint('wh:h7:rm418:sw02:interface', 'RM418 SW02 spare interface', ['SPARE'], 'h7-rmu', [600, 40], h7), h7Ring[0], h7);
let h7Primary = '';
for (const [cbNumber, older, x, spare] of [['03', '01', 850, false], ['04', '02', 1200, true]] as const) {
  const prefix = `wh:h7:rm418:cb${cbNumber}`;
  const cb = binary(prefix, `RM418 CB${cbNumber}${spare ? ' · spare' : ''}`, 'breaker', 'h7-rmu', [x, 510], h7, [`RM418-CB${cbNumber} (0001 rev6)`, `RM418-CB${older}-A0${spare ? '4' : '3'} (CV006)`, ...(spare ? ['SPARE'] : ['RM418-CB01 (0041 control)'])]);
  link(`${prefix}:bus-link`, h7Bus, cb[0], h7);
  const isolator = binary(`${prefix}:disconnect`, `CB${cbNumber} disconnect\nTag unconfirmed`, 'disconnector', 'h7-rmu', [x, 700], h7, [`Untagged contact below CB${cbNumber}`, `RM418-SW0${spare ? '4' : '3'} (CV006/overview)`]);
  link(`${prefix}:disconnect-link`, cb[1], isolator[0], h7); earthBranch(`${prefix}:earth`, `CB${cbNumber} outgoing earth`, isolator[1], 'h7-rmu', [x + 110, 790], h7);
  if (spare) link(`${prefix}:spare-link`, isolator[1], endpoint(`${prefix}:spare`, 'CB04 spare continuation', ['SPARE'], 'h7-rmu', [x, 1010], h7), h7); else h7Primary = isolator[1];
}
const h7Hv = transformer('wh:h7:tf418', 'TF418 · 22/6.9 kV', ['SS418-TF418', 'SS418-TF418A (CV006 6.9kV label)', '2500kVA', 'DYN11'], 'h7-rmu', [700, 1050], h7Primary, [['h7rmu', 'D-F / 3-4, TF418 and A secondary'], ['cv', 'E-F / 6-8, TF418A 6.9kV alias']]);
const h7Lv = transformer('wh:h7:tf418a', 'TF418A · 22/0.415 kV', ['SS418-TF418A', 'SS418-TF418B (CV006 415V label)', '500kVA', 'DYN11'], 'h7-rmu', [1050, 1050], h7Primary, [['h7rmu', 'D-F / 4-5, TF418A and B secondary'], ['cv', 'E-F / 6-8, TF418B 415V alias']]);
hvMcc('h7', 'MC418', h7Hv, 'h7hv', 'SZ007');
lvBus('wh:h7:mc418a', 'SS418-MC418A', 'h7-lv', h7Lv, [['h7lv', 'A-C / 8-10, 630A MCCB and 415V phase bar'], ['h7rmu', 'F / 4-5, separate B phase/Ba instrumentation']], 'MC418A MCCB · 630 A');

const h8 = fact('WH-H8-CANDIDATE', 'Hopper8 SS416-HV416 is explicitly supplied by RM406-CB03, separate from RM418. The supplied Hopper7/8 sheet uses SS416/TF416/TF416A names also used under Hopper3 with a different feeder/project. Distinct scoped records are retained; installed identity is unconfirmed.', [['h7rmu', 'C-G / 8-11, HOPPER8 SS416 KIOSK and RM406 supply'], ['rm406', 'C-E / 10-11, CB03/SW04 outgoing Hopper008 reference'], ['overview1', 'C-D / 5-6, RM406 to Hopper8']], ['WH-Q01', 'WH-Q04', 'WH-Q07']);
const h8Source = endpoint('wh:h8:interface:rm406', 'RM406 CB03 interface', ['RM406-CB03', 'RM406-SW04', 'CB19OP001B-04057-DR-EL-0002', 'CB17OP023C-04057-DR-EL-0001 (conflicting reference)'], 'h8', [650, 60], h8);
const h8Junction = 'wh:h8:hv416:port'; add({ id: 'wh:h8:hv416', label: 'Hopper8 · SS416-HV416', aliases: ['SS416-HV416', 'HOPPER8', 'CB17OP023D'], kind: 'interface', terminals: [h8Junction], conductivePairs: [], positions: [], ...h8 }, 'h8', [650, 250], [[0, 0]]); link('wh:h8:rm406-cable', h8Source, h8Junction, h8);
for (const [key, label, voltage, x, file] of [['tf416', 'TF416', '22/6.9 kV', 350, '0002'], ['tf416a', 'TF416A', '22/0.415 kV', 950, '0003']] as const) {
  const output = transformer(`wh:h8:${key}`, `Hopper8 ${label} · ${voltage}`, [`SS416-${label}`, 'HOPPER8', 'CB17OP023D'], 'h8', [x, 500], h8Junction, [['h7rmu', `D-G / 8-11, Hopper8 ${label}`]]);
  const id = key === 'tf416' ? 'wh:h8:mc416:interface' : 'wh:h8:mc416a:interface';
  link(`${id}:supply`, output, endpoint(id, `Hopper8 ${key === 'tf416' ? 'MC416 HV' : 'MC416A LV'}\nDetail unconfirmed`, [`CB17OP023D-01006-DR-EL-${file}`, 'HOPPER8'], 'h8', [x, 900], h8), h8);
}

const h9 = fact('WH-H9-RMU', 'Hopper9 SR419/SS419 RM419 has one22kV bar, incoming SW01 from RM410-CB03 and through SW02 to RM418-SW01. Ring main/earth common contacts are bar-side. Separate CB01/SW03 and CB02/SW04 assemblies feed TF419A and TF419B respectively.', [['h9rmu', 'A-F / 3-8, main/earth contact geometry and transformer branches'], ['rm410', 'C-F / 10-12, RM410-CB03-A04/SW04 to RM419-SW01'], ['cv', 'B-E / 3-8, RM410→RM419→RM418']], ['WH-Q08']);
const h9Bus = bar('wh:h9:rm419:bus', 'RM419\n22 kV HV bus', ['RM419', 'SR419', 'SS419', 'HOPPER9'], 'h9-rmu', [650, 350], h9);
const h9In = changeover('wh:h9:rm419:sw01', 'RM419 SW01', 'h9-rmu', [250, 180], h9, ['RM419-SW01']); link('wh:h9:sw01-bus', h9In[1], h9Bus, h9);
link('wh:h9:rm410-cable', endpoint('wh:h9:interface:rm410', 'RM410 CB03 interface', ['RM410-CB03', 'RM410-CB03-A04', 'RM410-SW04', 'SR419-RM419-P01'], 'h9-rmu', [250, 50], h9), h9In[0], h9);
const h9Through = changeover('wh:h9:rm419:sw02', 'RM419 SW02 · to Hopper7', 'h9-rmu', [600, 180], h9, ['RM419-SW02', 'RM418-SW01']); link('wh:h9:sw02-bus', h9Through[1], h9Bus, h9);
const h9To7 = fact('WH-H9-H7-CABLE', 'RM419-SW02 explicitly supplies RM418-SW01; receiving0001 reciprocally names RM419-SW02. This single cable retains both source references and both end controls. RM410 remains an external area interface, not a second local source.', [['h9rmu', 'A-B / 7-8, SUPPLY TO HP007 RMU RM418-SW01'], ['h7rmu', 'A-B / 6-7, SUPPLY FROM SR419-RM419 RM419-SW02']], ['WH-Q05']);
link('wh:h9-to-h7:cable', h9Through[0], h7In[0], h9To7);
const admin = fact('WH-H9-ADMINISTRATIVE-NOTE', 'Exact source wording, not an inferred physical interlock: note1 “RM419 EARTH SWITCH TO HAVE ADMINISTRATIVE CONTROLS IN PLACE. TO BE CLOSED PRIOR TO DOWNSTREAM EARTH SWITCH BEING CLOSED. REF CB19OP001C-01068-DR-EL-0002”. The note1 callout is by SW04; complete affected set and installed physical prevention are unconfirmed.', [['h9rmu', 'C / 4-5, note1 callout by SW04; F-G / 1-4, note1']], ['WH-Q08']);
let h9Hv = ''; let h9Lv = '';
for (const [number, sw, tag, x, voltage, rating] of [['01', '03', 'TF419A', 800, '22/6.9 kV', '2500kVA'], ['02', '04', 'TF419B', 1150, '22/0.415 kV', '1500kVA']] as const) {
  const cb = binary(`wh:h9:rm419:cb${number}`, `RM419 CB${number}`, 'breaker', 'h9-rmu', [x, 520], h9, [`RM419-CB${number}`]); link(`wh:h9:cb${number}-bus`, h9Bus, cb[0], h9);
  const contactClaim: Claim = sw === '04' ? { ...h9, evidenceIds: [...h9.evidenceIds!, ...admin.evidenceIds!] } : h9;
  const out = changeover(`wh:h9:rm419:sw${sw}`, `RM419 SW${sw}`, 'h9-rmu', [x, 730], contactClaim, [`RM419-SW${sw}`]); link(`wh:h9:cb${number}-sw${sw}`, cb[1], out[0], h9);
  const output = transformer(`wh:h9:${tag.toLowerCase()}`, `${tag} · ${voltage}`, [`SS419-${tag}`, `SR419-${tag}`, rating, 'DYN11'], 'h9-rmu', [x, 1040], out[1], [['h9rmu', `D-F / 3-5, ${tag} winding and secondary route`]]);
  if (number === '01') h9Hv = output; else h9Lv = output;
}
hvMcc('h9', 'MC419', h9Hv, 'h9hv', 'SZ009');
lvBus('wh:h9:mc419a', 'SR419-MC419A', 'h9-lv', h9Lv, [['h9lv', 'A-C / 8-10, ACB01 2000A and 415V/2600A bar'], ['h9lv2', 'B-C / 1-11, continued same phase bar from0003']], 'MC419A ACB01 · 2000 A');
fact('WH-EARTH-AND-SCOPE', 'Hopper7 and Hopper9 earthing sheets separately show equipment earth bars, transformer NER/neutral and LV MEN links; these do not establish permanent phase-bus earth or all-winding continuity. Hopper9 note14 names a running earth from RM410-SW04, not another phase feed. LV outgoing circuits, including SN009 motor/control0153, are beyond the final LV bus and excluded.', [['h7earth', 'B-D / 4-8, TF418/TF418A neutral/NER/MEN; G notes9-11'], ['h9earth', 'B-C / 3-10, MEN and NER; E-F notes9-14'], ['h9motor', 'B-F / 3-8, SN009 outgoing LV motor/control circuit']], ['WH-Q11', 'WH-WINDINGS']);
fact('WH-H7-CONTROL-ALIASES', '0041 records remote commands, indications, transformer trips and VCB truck-in/out signals, not a complete primary actuator/permissive circuit. It retains CB01/SW03 while rev6 RMU uses CB03; its24V reference prints CB16OP038A-02006-DR-EL-0081. These aliases/references remain unconfirmed; control wiring adds no phase path or permission.', [['h7control', 'A-E / 1-5, supply and CB01/SW03 command/status; A / 7-9, truck signals']], ['WH-Q03', 'WH-POSITIONS']);
fact('WH-HISTORICAL-REFERENCES', 'RM406 detail still uses cable RM418-RM406-P1 but its source is pole57; note1 says HOPPER007 PREVIOUSLY CONNECTED TO RM418-SW01. Hopper008 reference prints CB17OP023C-04057-DR-EL-0001 while supplied hopper filename uses01006. This does not establish a second current RM418/RM406 phase feed or resolve document precedence.', [['rm406', 'A-B / 4-5, source/cable; E-F / 10-12, Hopper008 and note1'], ['h7rmu', 'C-D / 9-10, reciprocal RM406-CB03 supply']], ['WH-Q04', 'WH-Q05']);
fact('WH-REVISION-AND-OVERVIEW', 'Overview notes1-2 explicitly describe high-level reference use and defer isolation work to detailed SLDs, HV switching programs and key-interlocking procedures. Hopper7 earth sheet has construction revision3 after older AS BUILT revision1. None establishes governing installed-current precedence or an accepted starting state.', [['overview1', 'G / 1-3, notes1-2'], ['overview2', 'G / 1-3, notes1-2'], ['h7earth', 'H, revision history3 versus1']], ['WH-Q10']);
for (const assetId of ['wh:h7:rm418:cb03', 'wh:h7:rm418:cb03:disconnect', 'wh:h7:rm418:cb03:earth']) assets.find(asset => asset.id === assetId)!.evidenceIds!.push('WH-H7-CONTROL-ALIASES');

const questions: [string, string][] = [
  ['WH-Q01', 'Resolve Hopper3/8 reused SS416/TF416/TF416A identities versus different RM417/RM406 feeder and project references; do not merge into an accepted two-source arrangement.'],
  ['WH-Q02', 'Resolve RM418 CB01/02 versus CB03/04 and TF418A/B versus TF418/TF418A aliases; preserve current and legacy source-scoped roles.'],
  ['WH-Q03', 'Resolve0041 CB01/SW03 control mapping and its inconsistent CB16OP038A control-supply reference before deriving current rules.'],
  ['WH-Q04', 'Resolve RM406 Hopper008 reference04057 versus supplied01006 document identity; retain reciprocal RM406-CB03 interface without replacing source files.'],
  ['WH-Q05', 'Confirm historical RM418/RM406 cable wording versus drawn RM410→RM419→RM418 source route; no second feed inferred from the retained cable name.'],
  ['WH-Q06', 'Resolve 6.9kV transformer versus 6.6kV HV-MCC bar labels without voltage calculations or precedence.'],
  ['WH-Q07', 'Obtain/confirm Hopper3 -0165/-0166 and Hopper8 CB17OP023D -0002/-0003 HV/LV endpoint and interlock detail.'],
  ['WH-Q08', 'Confirm Ronis keys, upstream earth mappings, paired-contact dependencies and complete installed interlocks. RM419 administrative controls are not inferred physical blocks.'],
  ['WH-Q09', 'Overview truncates RM417 CB02 while detailed0044 continues to Hopper3; omission does not establish disconnected coverage.'],
  ['WH-Q10', 'Confirm governing installed revisions; overview notes defer to detailed SLDs, HV programs and key procedures. Dates/stamps do not establish precedence.'],
  ['WH-Q11', 'Confirm NER/MEN and earth-system relationships independently of phase continuity; physical earth groups must not bridge independent phase circuits.'],
  ['WH-Q12', 'Confirm installed arrangement, source availability and complete actual starting configuration. All construction states remain null.'],
  ['WH-POSITIONS', 'Confirm supported position sets, mechanisms, common/earth terminal mapping, racking and all physical interlocks. Service/Isolated/Earthed candidates are not accepted installed permissions.'],
  ['WH-WINDINGS', 'Confirm separate transformer source/backfeed and earth policies; empty earthPairs plus unknown coverage is not confirmed absence of transfer.'],
];
const contextEvidence: Record<string, string[]> = { 'WH-Q03': ['WH-H7-CONTROL-ALIASES'], 'WH-Q04': ['WH-HISTORICAL-REFERENCES'], 'WH-Q05': ['WH-HISTORICAL-REFERENCES', 'WH-H9-H7-CABLE'], 'WH-Q08': ['WH-H9-ADMINISTRATIVE-NOTE', 'WH-h1-KEY-NOTES', 'WH-h7-KEY-NOTES', 'WH-h9-KEY-NOTES'], 'WH-Q10': ['WH-REVISION-AND-OVERVIEW'], 'WH-Q11': ['WH-EARTH-AND-SCOPE'] };
const reviews: NonNullable<NetworkModel['reviews']> = questions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: [...new Set([...evidence.filter(record => assets.some(asset => asset.reviewIds?.includes(id) && asset.evidenceIds?.includes(record.id))).map(record => record.id), ...(contextEvidence[id] ?? [])])] }));
const viewLabels: Record<Group, string> = { 'h1-rmu': 'Hopper1 · RM417 primary', 'h1-hv': 'Hopper1 · MC417 HV motors', 'h1-lv': 'Hopper1 · MC417A final LV', h3: 'Hopper3 · SS416 candidate (CB16OP038A)', 'h7-rmu': 'Hopper7 · RM418 primary', 'h7-hv': 'Hopper7 · MC418 HV motors', 'h7-lv': 'Hopper7 · MC418A final LV', h8: 'Hopper8 · SS416 candidate (CB17OP023D)', 'h9-rmu': 'Hopper9 · RM419 primary', 'h9-hv': 'Hopper9 · MC419 HV motors', 'h9-lv': 'Hopper9 · MC419A final LV' };
const views: DiagramView[] = [...new Set(members.values())].map(group => { const [x, y] = origins[group]; return { id: group, label: viewLabels[group], assetIds: assets.filter(asset => members.get(asset.id) === group).map(asset => asset.id), layout: structuredClone(layout), bounds: group.endsWith('-lv') ? [x + 180, y + 100, 740, 720] : [x - 80, y - 30, 1500, 1300], boundaries: [] }; });
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
for (const view of views) for (const connection of connections) {
  const from = owners.get(connection.from)!; const to = owners.get(connection.to)!; const fromLocal = view.assetIds.includes(from); const toLocal = view.assetIds.includes(to);
  if (fromLocal === toLocal) continue;
  const local = fromLocal ? connection.from : connection.to; const remote = fromLocal ? connection.to : connection.from; const remoteAssetId = fromLocal ? to : from;
  const [x, y] = view.layout.terminals[local]; const localAssetId = fromLocal ? from : to; const [, assetY] = view.layout.assets[localAssetId];
  const direction = y < assetY ? -1 : y > assetY ? 1 : fromLocal ? 1 : -1;
  const position: Point = [x, y + direction * 100];
  view.layout.terminals[remote] = position; view.layout.bends![connection.id] = [];
  view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: members.get(remoteAssetId)!, position });
}
export const westernHoppersModel: NetworkModel = {
  id: 'site-western-hoppers', version: 'construction-2026-10-22.2', name: 'Western hoppers · unconfirmed construction', synthetic: false,
  assets, connections, sources: [], earths, boundaries, evidence, reviews, starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Unconfirmed complete physical interlock/position conditions. No permission follows from missing conditions; all actual states remain null.', evidence: evidence.filter(record => asset.evidenceIds?.includes(record.id)).flatMap(record => record.references) })), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Western hoppers · provisional overview', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -100, 4600, 5800] }, ...views] },
};
