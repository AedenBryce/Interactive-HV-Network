import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction identities describe the drawings; none establishes installed acceptance.
const documents = {
  hv1: { document: '11098-07110-EL-DR-2352.pdf', revision: '9 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  hv2: { document: '11098-07110-EL-DR-2357.pdf', revision: '6 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0', page: 1 },
  laboratory: { document: '11098-07110-EL-DR-2255.pdf', revision: '1', page: 1 },
  services: { document: '11098-07110-EL-DR-2253.pdf', revision: '3', page: 1 },
  mc426: { document: '11098-07110-EL-DR-2653.pdf', revision: '14', page: 1 },
  mc428: { document: '11098-07110-EL-DR-2676.pdf', revision: '11', page: 1 },
  sw427: { document: '11098-07110-EL-DR-2463.pdf', revision: '11', page: 1 },
  sw429: { document: '11098-07110-EL-DR-2481.pdf', revision: '7', page: 1 },
  sw439: { document: '11098-07110-EL-DR-2483.pdf', revision: '12', page: 1 },
  mc430: { document: '11098-07110-EL-DR-2683.pdf', revision: '8', page: 1 },
  sw440: { document: '500CB-04230-DR-EL-0146.pdf', revision: '4', page: 1 },
  sw443: { document: '500CB-04230-DR-EL-0147.pdf', revision: '5', page: 1 },
};
type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Group = 'hv' | 'lv' | 'laboratory' | 'services';
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const groups: Record<Group, string[]> = { hv: [], lv: [], laboratory: [], services: [] };
const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };
function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([key, region]) => ({ ...documents[key], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set([...reviewIds, 'DES-Q08'])] };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], group: Group) {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminalPoints[index]; }); groups[group].push(asset.id);
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim }); if (bends) layout.bends![id] = bends;
}
function contact(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', point: Point, claim: Claim, group: Group, aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases: [label, ...aliases], kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], group);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55]; return terminals;
}
function earthBranch(id: string, label: string, from: string, point: Point, claim: Claim, group: Group) {
  const terminals = contact(id, label, 'earth-switch', point, claim, group);
  layout.rotations![id] = 0; layout.terminals[terminals[0]] = [point[0] - 30, point[1]]; layout.terminals[terminals[1]] = [point[0] + 30, point[1]]; layout.labelOffsets![id] = [0, 65];
  link(`${id}:branch`, from, terminals[0], claim, [[layout.terminals[from][0], point[1]]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth termination`, terminal: terminals[1], ...claim });
}
function unknown(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}
function port(id: string, label: string, point: Point, claim: Claim, group: Group, aliases: string[] = []) {
  const terminal = `${id}:port`; add({ id, label, aliases, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], group);
  unknown(`${id}:coverage`, terminal, `${label}: source/earth coverage unconfirmed`, claim); return terminal;
}
function bus(id: string, label: string, point: Point, claim: Claim, group: Group, aliases: string[] = []) {
  const terminal = `${id}:bar`; add({ id, label, aliases, kind: 'bus', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], group);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, 55]; return terminal;
}
function transformer(id: string, label: string, point: Point, roles: string[], claim: Claim, group: Group) {
  const terminals = [`${id}:hv`, ...roles.map(role => `${id}:${role}`)];
  add({ id, label, aliases: [label], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(terminal => [terminals[0], terminal]), earthPairs: [], positions: [], ...claim }, point, [[point[0], point[1] - 30], ...roles.map((_role, index) => [point[0] + (roles.length === 2 ? index === 0 ? -55 : 55 : 0), point[1] + 30] as Point)], group);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${label}: source/reverse transfer and earth continuity unconfirmed`, claim); return terminals;
}
const lvEndpoints: { transformerId: string; cbId: string; busId: string; cableId: string; offset: number }[] = [];
const hvClaim = fact('DES-HV-BUS', 'SW426 has one drawn phase bar continued between both HV sheets; no page-boundary bus tie is inferred.', [['hv1', 'central main bar'], ['hv2', 'continuation main bar']]);
const hvBus = bus('sw426:bus', 'SW426 · 22 kV bus', [1500, 320], hvClaim, 'hv', ['SW426', 'Desands', 'Desanding']);
const incomingClaim = fact('DES-IN', 'SW426-P-01 from SW411 enters CB SW426 IN 01; ES SW426 IN 01 is on the incoming cable side. Availability and installed state unconfirmed.', [['hv1', 'left tier1 incoming cable, CB and ES']]);
const incoming = contact('sw426:in:cb', 'CB SW426 IN 01', 'breaker', [100, 200], incomingClaim, 'hv');
const incomingPort = port('sw426:interface:sw411', 'SW411 · SW426-P-01', [100, 50], incomingClaim, 'hv', ['SW426-P-01', 'SW411 tier14']);
link('sw426:incoming:cable', incomingPort, incoming[0], incomingClaim); link('sw426:incoming:bus-link', incoming[1], hvBus, incomingClaim, [[100, 320]]);
earthBranch('sw426:in:es', 'ES SW426 IN 01', incoming[0], [200, 110], incomingClaim, 'hv');
earthBranch('sw426:bus:es', 'ES SW426', hvBus, [170, 385], hvClaim, 'hv');
const feeders: { tf: string; board: string; roles: string[]; sheet: keyof typeof documents; hvSheet: 'hv1' | 'hv2'; tier: number; x: number; reviews?: string[] }[] = [
  { tf: 'tf440', board: 'sw440', roles: ['d', 'y'], sheet: 'sw440', hvSheet: 'hv1', tier: 0, x: 350, reviews: ['DES-Q04', 'DES-Q07'] },
  { tf: 'tf426', board: 'mc426', roles: ['lv'], sheet: 'mc426', hvSheet: 'hv1', tier: 2, x: 700 },
  { tf: 'tf428', board: 'mc428a', roles: ['lv'], sheet: 'mc428', hvSheet: 'hv1', tier: 4, x: 1000, reviews: ['DES-Q05'] },
  { tf: 'tf427', board: 'sw427', roles: ['d', 'y'], sheet: 'sw427', hvSheet: 'hv1', tier: 5, x: 1350 },
  { tf: 'tf429', board: 'sw429', roles: ['d', 'y'], sheet: 'sw429', hvSheet: 'hv2', tier: 6, x: 1700, reviews: ['DES-Q06'] },
  { tf: 'tf439', board: 'sw439', roles: ['d', 'y'], sheet: 'sw439', hvSheet: 'hv2', tier: 7, x: 2050 },
  { tf: 'tf430', board: 'mc430', roles: ['lv'], sheet: 'mc430', hvSheet: 'hv2', tier: 8, x: 2400 },
  { tf: 'tf443', board: 'sw443', roles: ['d', 'y'], sheet: 'sw443', hvSheet: 'hv2', tier: 10, x: 2750, reviews: ['DES-Q04', 'DES-Q07'] },
];
for (const feeder of feeders) {
  const tag = feeder.tf.toUpperCase(); const board = feeder.board.toUpperCase();
  const hv = fact(`DES-${tag}-HV`, `Drawn tier ${feeder.tier} CB ${tag} FD and cable-side earth branch supply ${tag}. Actual installation, position and interlocks unconfirmed.`, [[feeder.hvSheet, `tier ${feeder.tier}, CB/ES ${tag} FD and transformer cable`]], feeder.reviews);
  const cb = contact(`sw426:${feeder.tf}:cb`, `CB ${tag} FD`, 'breaker', [feeder.x, 470], hv, 'hv');
  link(`sw426:${feeder.tf}:bus-link`, hvBus, cb[0], hv, [[feeder.x, 320]]);
  earthBranch(`sw426:${feeder.tf}:es`, `ES ${tag} FD`, cb[1], [feeder.x + 100, 580], hv, 'hv');
  const transfer = fact(`DES-${tag}-TRANSFER`, `Inference: ${tag} source transfer follows the drawn incoming to ${board} ${feeder.roles.length === 2 ? 'separate D/Y secondary phase buses; dashed control links are not phase ties' : 'first LV phase bus'}. Reverse transfer and earth continuity unconfirmed; no MEN phase-earth link is represented.`, [[feeder.hvSheet, `tier ${feeder.tier}, ${tag} winding depiction`], [feeder.sheet, `${tag}, incoming breaker(s) and first LV phase bar(s)`]], feeder.reviews, 'provisional');
  const tfId = `sw426:${feeder.tf}`; const tf = transformer(tfId, tag, [feeder.x, 720], feeder.roles, transfer, 'lv');
  link(`sw426:${feeder.tf}:hv-cable`, cb[1], tf[0], hv);
  const lv = fact(`DES-${tag}-LV`, `${tag} is drawn feeding ${board}'s first ${feeder.roles.length === 2 ? 'D and Y 690 V' : '400 V'} phase buses through their incoming breakers. Outgoing LV circuits, auxiliary boards, neutral/MEN and protective bonding are outside the phase topology.`, [[feeder.sheet, 'upper incoming transformer cable(s), CB incoming and main phase bar(s)']], feeder.reviews);
  feeder.roles.forEach((role, index) => {
    const offset = feeder.roles.length === 2 ? index === 0 ? -75 : 75 : 0;
    const prefix = `sw426:${feeder.board}${role === 'lv' ? '' : `:${role}`}`;
    const suffix = role === 'lv' ? '' : ` ${role.toUpperCase()}`; const label = `CB ${board} IN${suffix}`;
    const incoming = contact(`${prefix}:in:cb`, label, 'breaker', [feeder.x + offset, 920], lv, 'lv');
    const bar = bus(`${prefix}:bus`, `${board}${suffix} · ${role === 'lv' ? '400' : '690'} V bus`, [feeder.x + offset, 1100], lv, 'lv', [board, ...(feeder.board === 'mc428a' ? ['MC428', 'MC428A'] : [])]);
    const cableId = `${prefix}:lv-cable`; link(cableId, tf[index + 1], incoming[0], lv, [[feeder.x + offset, 820]]); link(`${prefix}:bus-link`, incoming[1], bar, lv);
    lvEndpoints.push({ transformerId: tfId, cbId: `${prefix}:in:cb`, busId: `${prefix}:bus`, cableId, offset });
  });
}
const labClaim = fact('DES-LAB', 'Inference: SW426 SS714 feeder / RM714-P-01 continues as SS714-P-01 into SF RM714 IN01 on the laboratory sheet. RM714/SS714 and SW714/MC714 aliases require owner reconciliation.', [['hv2', 'tier9 SS714 feeder and RM714-P-01'], ['laboratory', 'upper-left incoming cable and RM714 bar; TF714 to SW714 incoming bus'], ['overview', 'laboratory RM714 to MC714']], ['DES-Q03'], 'provisional');
const labFeeder = contact('sw426:ss714:cb', 'CB SS714 FD', 'breaker', [2900, 470], labClaim, 'hv', ['CB RM714 FD']);
link('sw426:ss714:bus-link', hvBus, labFeeder[0], labClaim, [[2900, 320]]);
earthBranch('sw426:ss714:es', 'ES SS714 FD', labFeeder[1], [3030, 580], labClaim, 'hv');
const rmIn = contact('rm714:in01', 'SF RM714 IN01', 'disconnector', [3400, 180], labClaim, 'laboratory', ['SW RM714 IN01']);
link('sw426:laboratory:cable', labFeeder[1], rmIn[0], labClaim, [[2900, 30], [3400, 30]]);
const rmBus = bus('rm714:bus', 'RM714 / SS714 · 22 kV bus', [3550, 310], labClaim, 'laboratory', ['RM714', 'SS714']);
link('rm714:in01:bus-link', rmIn[1], rmBus, labClaim, [[3400, 310]]);
const rmIn2 = contact('rm714:in02', 'SF RM714 IN02', 'disconnector', [3750, 180], labClaim, 'laboratory', ['SW RM714 IN02']);
link('rm714:in02:bus-link', rmIn2[1], rmBus, labClaim, [[3750, 310]]);
const rmOpen = port('rm714:interface:ring-in02', 'RM714 IN02 · destination unconfirmed', [3750, 40], labClaim, 'laboratory');
link('rm714:in02:external-stub', rmOpen, rmIn2[0], labClaim);
const labEarth = fact('DES-LAB-EARTH', 'Inference: overview depicts earth branches at both RM714 ring devices and TF714 feeder, while laboratory detail omits those earth symbols. Their existence, contacts and complete position/interlock conditions remain unconfirmed; provisional earth branches are review candidates only.', [['overview', 'laboratory RM714 ring devices and transformer feeder earth symbols'], ['laboratory', 'SF RM714 IN01/IN02 and CB TF714 FD without corresponding earth symbols']], ['DES-Q02'], 'provisional');
earthBranch('rm714:in01:es', 'RM714 IN01 earth · unconfirmed', rmIn[0], [3510, 105], labEarth, 'laboratory');
earthBranch('rm714:in02:es', 'RM714 IN02 earth · unconfirmed', rmIn2[0], [3880, 105], labEarth, 'laboratory');
const labTfClaim = fact('DES-TF714', 'Inference: TF714 22/400 V 1 MVA supplies the SW714 incoming phase bus. Source transfer is provisional; reverse transfer and earth continuity are not confirmed. MEN is not a phase-bus earth path.', [['laboratory', 'TF714 and SW714-P-01 to CB SW714 IN']], ['DES-Q03'], 'provisional');
const rmTf = contact('rm714:tf714:cb', 'CB TF714 FD', 'breaker', [3550, 450], labClaim, 'laboratory');
link('rm714:tf714:bus-link', rmBus, rmTf[0], labClaim);
earthBranch('rm714:tf714:es', 'TF714 feeder earth · unconfirmed', rmTf[1], [3690, 550], labEarth, 'laboratory');
const labTf = transformer('rm714:tf714', 'TF714', [3550, 650], ['lv'], labTfClaim, 'laboratory'); link('rm714:tf714:cable', rmTf[1], labTf[0], labClaim);
const labLv = contact('rm714:sw714:in:cb', 'CB SW714 IN', 'breaker', [3550, 870], labClaim, 'laboratory');
const labBus = bus('rm714:sw714:bus', 'SW714 / MC714 · 400 V bus', [3550, 1040], labClaim, 'laboratory', ['SW714', 'MC714']);
link('rm714:sw714:cable', labTf[1], labLv[0], labClaim); link('rm714:sw714:bus-link', labLv[1], labBus, labClaim);
const servicesClaim = fact('DES-SERVICES', 'Unconfirmed cross-area reconciliation: RM712 IN02 references SW426/2352, but neither SW426 HV sheet identifies an RM712 bay. This is separate from the SS714/RM714 laboratory feeder. Services sheet depicts TF712 secondary cables disconnected and pulled out of the main distribution board, while DG1 (6207) / DG7 (6206) feed the changeover/SW712 context. Present cable condition, source availability and selector positions remain unconfirmed. No TF712-SW712 or SW426-RM712 conductive join is created here; the services area owns downstream assets.', [['services', 'RM712 IN02 upper reference; TF712 secondary cable disconnection note; DG1/DG7/main changeover/SW712'], ['hv1', 'all named outgoing tiers'], ['hv2', 'all named outgoing tiers; SS714 tier9']], ['DES-Q01'], 'unresolved');
port('sw426:interface:rm712', 'RM712 IN02 · SW426 bay unconfirmed', [600, 1420], servicesClaim, 'services', ['RM712 IN02', 'FROM DESAND SWITCHBOARD SW426', '07110-EL-DR-2352', 'TO RM713 via RM712 IN01']);
port('sw426:interface:sw712', 'SW712 services · generator context', [2200, 1420], servicesClaim, 'services', ['SW712', 'TF712 cables disconnected and pulled out', 'DG1 (6207)', 'DG7 (6206)', 'MAIN CHANGEOVER SWITCH MCS']);
const reviews: NonNullable<NetworkModel['reviews']> = [
  { id: 'DES-Q01', question: 'Resolve RM712 IN02 SW426 reference against missing SW426 bay and separately confirm TF712 drawn cable disconnection versus DG1(6207)/DG7(6206) changeover supply. No laboratory/services join is accepted.', status: 'open', evidenceIds: ['DES-SERVICES'] },
  { id: 'DES-Q02', question: 'Confirm RM714 ring/feeder earth device identities, existence and complete interlocks; overview and detailed sheet differ.', status: 'open', evidenceIds: ['DES-LAB-EARTH'] },
  { id: 'DES-Q04', question: 'Resolve TF440/TF443 HV 22/690/690 versus detail 22/0.72/0.72 kV and 690 V bus labels; no rating calculation or accepted precedence.', status: 'open', evidenceIds: ['DES-TF440-TRANSFER', 'DES-TF443-TRANSFER'] },
  { id: 'DES-Q05', question: 'Confirm MC428 versus MC428A identity. MC428B/C are outgoing LV extensions outside the first-bus scope.', status: 'open', evidenceIds: ['DES-TF428-LV'] },
  { id: 'DES-Q06', question: 'Confirm TF429/SW429 commissioning and STAGE 2 status without assuming unavailable or installed.', status: 'open', evidenceIds: ['DES-TF429-HV'] },
  { id: 'DES-Q07', question: 'Resolve missing SW440 sheet2 reference 500CB-02005-DR-EL-0931 and SW443 reference 0148, which is protective bonding rather than the outgoing SLD; no additional source or phase-earth continuity follows.', status: 'open', evidenceIds: ['DES-TF440-LV', 'DES-TF443-LV'] },
  { id: 'DES-Q03', question: 'Confirm SS714/RM714, RM714-P-01/SS714-P-01, CB SS714 FD/CB RM714 FD and SW714/MC714 identities.', status: 'open', evidenceIds: ['DES-LAB'] },
  { id: 'DES-Q08', question: 'Confirm installed topology, all actual states, physical interlocks and transformer source/reverse/earth policies. The source does not confirm switching permission.', status: 'open', evidenceIds: evidence.map(record => record.id) },
];
const lvLayout = structuredClone(layout);
for (const [index, feeder] of feeders.entries()) {
  const tfId = `sw426:${feeder.tf}`; const tf = assets.find(asset => asset.id === tfId)!;
  const x = 250 + (index % 4) * 600; const y = 180 + Math.floor(index / 4) * 680;
  lvLayout.assets[tfId] = [x, y]; lvLayout.terminals[tf.terminals[0]] = [x, y - 30];
  tf.terminals.slice(1).forEach((terminal, output) => { lvLayout.terminals[terminal] = [x + (tf.terminals.length === 3 ? output === 0 ? -55 : 55 : 0), y + 30]; });
  const supply = connections.find(connection => connection.to === tf.terminals[0])!; lvLayout.terminals[supply.from] = [x, y - 150];
  for (const endpoint of lvEndpoints.filter(item => item.transformerId === tfId)) {
    const ex = x + endpoint.offset; const cb = assets.find(asset => asset.id === endpoint.cbId)!;
    lvLayout.assets[cb.id] = [ex, y + 210]; lvLayout.terminals[cb.terminals[0]] = [ex, y + 180]; lvLayout.terminals[cb.terminals[1]] = [ex, y + 240];
    lvLayout.assets[endpoint.busId] = [ex, y + 390]; lvLayout.terminals[`${endpoint.busId}:bar`] = [ex, y + 390]; lvLayout.bends![endpoint.cableId] = [[ex, y + 110]];
  }
}
const viewAssets: Record<string, string[]> = { ...groups };
const definitions: { id: string; label: string; bounds: DiagramView['bounds']; layout: DiagramLayout }[] = [
  { id: 'hv', label: 'SW426 HV · 2352 rev9 / 2357 rev6', bounds: [-100, -70, 3300, 900], layout: structuredClone(layout) },
  { id: 'lv', label: 'Desands final LV buses · 8 transformer branches', bounds: [60, -40, 2350, 1430], layout: lvLayout },
  { id: 'laboratory', label: 'Laboratory RM714 / SW714 · aliases unconfirmed', bounds: [3180, -90, 850, 1280], layout: structuredClone(layout) },
  { id: 'services', label: 'Separate services references · unresolved', bounds: [200, 1250, 2500, 450], layout: structuredClone(layout) },
];
for (let first = 0; first < feeders.length; first += 2) {
  const pair = feeders.slice(first, first + 2); const id = `lv-${pair.map(feeder => feeder.tf).join('-')}`;
  const detailLayout = structuredClone(layout); const visible: string[] = [];
  pair.forEach((feeder, index) => {
    const tfId = `sw426:${feeder.tf}`; const tf = assets.find(asset => asset.id === tfId)!; const x = 250 + index * 550;
    visible.push(tfId); detailLayout.assets[tfId] = [x, 100]; detailLayout.terminals[tf.terminals[0]] = [x, 70];
    tf.terminals.slice(1).forEach((terminal, output) => { detailLayout.terminals[terminal] = [x + (tf.terminals.length === 3 ? output === 0 ? -55 : 55 : 0), 130]; });
    const supply = connections.find(connection => connection.to === tf.terminals[0])!; detailLayout.terminals[supply.from] = [x, -50];
    for (const endpoint of lvEndpoints.filter(item => item.transformerId === tfId)) {
      const ex = x + Math.sign(endpoint.offset) * 100; const cb = assets.find(asset => asset.id === endpoint.cbId)!;
      visible.push(cb.id, endpoint.busId); detailLayout.assets[cb.id] = [ex, 280]; detailLayout.terminals[cb.terminals[0]] = [ex, 250]; detailLayout.terminals[cb.terminals[1]] = [ex, 310];
      detailLayout.assets[endpoint.busId] = [ex, 460]; detailLayout.terminals[`${endpoint.busId}:bar`] = [ex, 460]; detailLayout.bends![endpoint.cableId] = [[ex, 190]];
    }
  });
  viewAssets[id] = visible;
  definitions.push({ id, label: `LV detail · ${pair.map(feeder => feeder.tf.toUpperCase()).join(' / ')}`, bounds: [40, -80, 1020, 650], layout: detailLayout });
}
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const detailViews: DiagramView[] = definitions.map(definition => {
  const visible = new Set(viewAssets[definition.id]); const view: DiagramView = { ...definition, assetIds: [...visible], boundaries: [] };
  for (const connection of connections) {
    const fromVisible = visible.has(owners.get(connection.from)!); const toVisible = visible.has(owners.get(connection.to)!);
    if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!; const [x, y] = view.layout.terminals[local]; const [rx, ry] = view.layout.terminals[remote];
    const point: Point = Math.abs(rx - x) > Math.abs(ry - y) ? [x + Math.sign(rx - x) * 100, y] : [x, y + (Math.sign(ry - y) || -1) * 100];
    view.layout.terminals[remote] = point; view.layout.bends![connection.id] = [];
    const target = definitions.find(candidate => candidate.id.startsWith('lv-tf') && viewAssets[candidate.id].includes(remoteAssetId)) ?? definitions.find(candidate => viewAssets[candidate.id].includes(remoteAssetId));
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target?.id ?? 'overview', position: point });
  }
  return view;
});
export const desandsLaboratoryModel: NetworkModel = {
  id: 'site-desands-laboratory', version: 'construction-2026-10-22.2', name: 'Desands / laboratory · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, boundaries, earths, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Installed physical interlocks, full position sets and starting state unconfirmed. The source does not confirm switching permission.', evidence: evidence.filter(record => asset.evidenceIds?.includes(record.id)).flatMap(record => record.references) })), rules: [] },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Desands / laboratory · provisional', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -100, 4200, 1800] }, ...detailViews] },
};
