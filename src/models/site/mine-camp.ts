import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Stable construction IDs identify drawing roles, not accepted installed tags.
const docs = {
  camp: { document: 'CB-10016-DR-EL-0002.002.pdf', revision: '3 (08.12.11; CAMP POWERLINE RELOCATION ADDED)', page: 1 },
  emergency: { document: 'CB-10016-DR-EL-0001.pdf', revision: '0 (24.07.09; AS BUILT)', page: 1 },
  study1: { document: 'CB-10016-DR-EL-0003.001.pdf', revision: '9 (21.01.21; ADDITIONAL GENERATION, ALINTA TIER)', page: 1 },
  study2: { document: 'CB-10016-DR-EL-0003.002.pdf', revision: '4 (02.05.18; WESTERN POWERLINE FEEDER ADDITION)', page: 1 },
  study3: { document: 'CB-10016-DR-EL-0003.003.pdf', revision: '3 (24.05.17; REVISED AS BUILT)', page: 1 },
  study4: { document: 'CB-10016-DR-EL-0003.004.pdf', revision: '0 (02.05.18; AS BUILT)', page: 1 },
  overview: { document: '500CB-07100-DR-EL-0022.pdf', revision: '5 (31.05.16; AS BUILT FOR CB16OP003)', page: 1 },
  msb5: { document: 'CB-10016-DR-EL-0005.pdf', revision: '0 (signature 28.9.10; issue date unconfirmed)', page: 1 },
  msb6: { document: 'CB-10016-DR-EL-0004.pdf', revision: '0 (signature 28.9.10; issue date unconfirmed)', page: 1 },
  sw441: { document: '11098-07110-EL-DR-2355.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  mc441: { document: '11098-07110-EL-DR-2657.pdf', revision: '13 (09.01.26; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1 },
  rm711: { document: '11098-07110-EL-DR-2252.pdf', revision: '5 (22.02.12; DB03, DB07 BECOME SPARE)', page: 1 },
  rm718: { document: '11098-07110-EL-DR-2257.pdf', revision: '0 (04.12.09; ISSUED FOR CONSTRUCTION)', page: 1 },
};
type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const reviews: NonNullable<NetworkModel['reviews']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const sources: NetworkModel['sources'] = [];
const devices: NetworkModel['starting']['devices'] = {};
const availability: NetworkModel['starting']['sources'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };
const groups: Record<string, { label: string; offset: Point; assetIds: string[]; bounds: DiagramView['bounds'] }> = {};
function group(id: string, label: string, bounds: DiagramView['bounds'] = [-50, -100, 1100, 760]) {
  const index = Object.keys(groups).length;
  groups[id] = { label, offset: [(index % 4) * 1250, Math.floor(index / 4) * 1000], assetIds: [], bounds };
}
function fact(id: string, summary: string, references: [keyof typeof docs, string][], reviewIds: string[] = [], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: references.map(([document, region]) => ({ ...docs[document], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set([...reviewIds, 'MC-Q11'])] };
}
function add(asset: Asset, point: Point, terminals: Point[], member: string) {
  const [dx, dy] = groups[member].offset; assets.push(asset); groups[member].assetIds.push(asset.id);
  layout.assets[asset.id] = [point[0] + dx, point[1] + dy]; asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = [terminals[index][0] + dx, terminals[index][1] + dy]; });
}
function link(id: string, from: string, to: string, claim: Claim) { connections.push({ id, from, to, ...claim }); }
function contact(id: string, label: string, point: Point, member: string, claim: Claim, kind: 'breaker' | 'disconnector' | 'earth-switch' = 'disconnector', aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases: [label, ...aliases], kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim }, point, [[point[0], point[1] - 25], [point[0], point[1] + 25]], member);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -48]; return terminals;
}
function bus(id: string, label: string, point: Point, member: string, claim: Claim, aliases: string[] = []) {
  const terminal = `${id}:bar`; add({ id, label, aliases, kind: 'bus', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], member);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, 45]; return terminal;
}
function unknown(id: string, terminal: string, label: string, claim: Claim) { boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim }); }
function port(id: string, label: string, point: Point, member: string, claim: Claim, aliases: string[] = []) {
  const terminal = `${id}:port`; add({ id, label, aliases, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], member); unknown(`${id}:coverage`, terminal, `${label}: source/earth coverage unconfirmed`, claim); return terminal;
}
function earth(id: string, label: string, from: string, point: Point, member: string, claim: Claim) {
  const terminals = contact(id, label, point, member, claim, 'earth-switch'); const [dx, dy] = groups[member].offset;
  layout.rotations![id] = 0; layout.terminals[terminals[0]] = [point[0] + dx - 25, point[1] + dy]; layout.terminals[terminals[1]] = [point[0] + dx + 25, point[1] + dy]; layout.labelOffsets![id] = [0, 50];
  link(`${id}:branch`, from, terminals[0], claim); earths.push({ id: `${id}:termination`, label: `${label} termination`, terminal: terminals[1], ...claim });
}
function transformer(id: string, label: string, point: Point, member: string, claim: Claim, aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:hv`, `${id}:lv`];
  add({ id, label, aliases: [label, ...aliases], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: [[...terminals]], earthPairs: [], positions: [], ...claim }, point, [[point[0], point[1] - 25], [point[0], point[1] + 25]], member);
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -48];
  for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${label}: winding transfer, reverse transfer and independent earth continuity unconfirmed`, claim); return terminals;
}
function lvEnd(id: string, label: string, from: string, point: Point, member: string, claim: Claim, kind: 'breaker' | 'disconnector' = 'breaker', aliases: string[] = []) {
  const cb = contact(`${id}:in`, `${label} IN`, point, member, claim, kind, aliases); link(`${id}:incoming-cable`, from, cb[0], claim);
  const bar = bus(`${id}:bus`, `${label} · first LV bus`, [point[0], point[1] + 160], member, claim, aliases); link(`${id}:bus-link`, cb[1], bar, claim); return bar;
}
function junction(id: string, label: string, point: Point, member: string, claim: Claim) {
  const terminal = `${id}:junction`; add({ id, label, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], member); return terminal;
}
function packageEndpoint(id: string, label: string, boardId: string, board: string, input: string, claim: Claim, location: keyof typeof docs, reviewIds: string[], secondLabel = 'Unconnected / spare incoming', secondaryAlias: string[] = [], transformerAliases: string[] = []) {
  const primary = `${id}-primary`; const secondary = `${id}-lv`; group(primary, `${label} · HV contacts`); group(secondary, `${label} · ${board} first LV bus`, [-50, -80, 1000, 650]);
  const bar = bus(`${id}:bus`, `${label} · HV phase bar`, [500, 200], primary, claim);
  const incoming = contact(`${id}:in01:sw`, `${label} · incoming SW`, [180, 75], primary, claim); link(`${id}:incoming:cable`, input, incoming[0], claim); link(`${id}:incoming:bar`, incoming[1], bar, claim); earth(`${id}:in01:es`, `${label} · incoming earth`, incoming[0], [300, -5], primary, claim);
  const other = contact(`${id}:in02:sw`, `${label} · second SW`, [800, 75], primary, claim); link(`${id}:in02:bar`, other[1], bar, claim); earth(`${id}:in02:es`, `${label} · second earth`, other[0], [920, -5], primary, claim);
  const otherPort = port(`${id}:interface:in02`, secondLabel, [800, -110], primary, claim, secondaryAlias); link(`${id}:in02:cable`, otherPort, other[0], claim);
  const cb = contact(`${id}:tf:cb`, `${label} · TF feeder CB`, [430, 320], primary, claim, 'breaker'); const sw = contact(`${id}:tf:sw`, `${label} · TF feeder SW`, [430, 500], primary, claim);
  link(`${id}:tf:bar`, bar, cb[0], claim); link(`${id}:tf:cb-sw`, cb[1], sw[0], claim); earth(`${id}:tf:es`, `${label} · transformer earth`, sw[1], [600, 585], primary, claim);
  const transfer = fact(`${id}:transfer`, `Inference: ${label} transformer feeds ${board}'s first LV phase bus. Source/reverse transfer and independent earth continuity remain unconfirmed. Neutral grounding is not a phase-earth path.`, [[location, 'Transformer and first LV incoming/bus region']], reviewIds, 'provisional');
  const tf = transformer(`${id}:tf`, `${label} transformer`, [450, 120], secondary, transfer, transformerAliases); link(`${id}:tf:cable`, sw[1], tf[0], claim); lvEnd(boardId, board, tf[1], [450, 320], secondary, claim);
  return bar;
}
const ring = fact('MC-CAMP-RING', 'Drawn camp 11 kV ring through RM700, RMUA, RMU1/2/3, RMUB, RMU4/5/6 and the V63 line. Printed normal-open mark and fault-study states are not accepted baseline or physical switching permission.', [['study1', 'H-L / 10-16, camp ring and normally open RMUB-to-RMU4 marker']], ['MC-Q03']);
const rmuBars: Record<string, string> = {};
const ringContacts: Record<string, Record<string, [string, string]>> = {};
for (const rmu of ['rmua', 'rmu1', 'rmu2', 'rmu3', 'rmub', 'rmu4', 'rmu5', 'rmu6']) {
  const member = `camp-${rmu}`; group(member, `${rmu.toUpperCase()} · camp ring contacts`);
  rmuBars[rmu] = bus(`camp:${rmu}:bus`, `${rmu.toUpperCase()} · 11 kV bar`, [500, 200], member, ring);
  ringContacts[rmu] = {};
}
const ringLinks: [string, string][] = [['rmua', 'rmu1'], ['rmu1', 'rmu2'], ['rmu2', 'rmu3'], ['rmu3', 'rmub'], ['rmub', 'rmu4'], ['rmu4', 'rmu5'], ['rmu5', 'rmu6']];
for (const [a, b] of ringLinks) {
  const terminals: [string, string][] = [];
  for (const [local, remote, x] of [[a, b, 800], [b, a, 180]] as const) {
    const id = `camp:${local}:ring-${remote}:sw`; const member = `camp-${local}`;
    const sw = contact(id, `${local.toUpperCase()} · FDR ${remote.toUpperCase()}`, [x, 75], member, ring, 'disconnector', local === 'rmub' && remote === 'rmu4' ? ['NORMALLY OPEN POINT'] : []);
    link(`${id}:bus-link`, sw[1], rmuBars[local], ring); earth(`${id}:es`, `${local.toUpperCase()} · ring earth`, sw[0], [x + 110, -5], member, ring);
    ringContacts[local][remote] = sw; terminals.push(sw);
  }
  link(`camp:ring:${a}-${b}`, terminals[0][0], terminals[1][0], ring);
}
for (const rmu of ['rmua', 'rmu3']) {
  const member = `camp-${rmu}`; const spare = contact(`camp:${rmu}:spare:sw`, `${rmu.toUpperCase()} · SPARE`, [1000, 300], member, ring);
  link(`camp:${rmu}:spare:bus-link`, rmuBars[rmu], spare[0], ring); earth(`camp:${rmu}:spare:es`, `${rmu.toUpperCase()} · spare earth`, spare[1], [900, 380], member, ring);
  let end = spare[1];
  if (rmu === 'rmu3') {
    const pins: [string, string] = ['camp:rmu3:spare:fuse:a', 'camp:rmu3:spare:fuse:b'];
    add({ id: 'camp:rmu3:spare:fuse', label: 'RMU3 · spare80A fuse', kind: 'interface', terminals: pins, conductivePairs: [[...pins]], positions: [], ...ring, knowledge: 'provisional' }, [1000, 470], [[1000, 445], [1000, 495]], member);
    link('camp:rmu3:spare:fuse-link', spare[1], pins[0], ring); earth('camp:rmu3:spare:es-fuse', 'RMU3 · fuse-side earth', pins[1], [900, 555], member, ring); end = pins[1];
  }
  unknown(`camp:${rmu}:spare:coverage`, end, 'Printed NOT CONNECTED / SPARE; present installed termination unconfirmed', ring);
}
for (const [slot, x] of [['01', 350], ['02', 750]] as const) {
  const id = `camp:rmub:spare${slot}`; const cb = contact(`${id}:cb`, `RMUB · SPARE ${slot} CB`, [x, 330], 'camp-rmub', ring, 'breaker'); const sw = contact(`${id}:sw`, `RMUB · SPARE ${slot} SW`, [x, 510], 'camp-rmub', ring);
  link(`${id}:bar-link`, rmuBars.rmub, cb[0], ring); link(`${id}:cb-sw`, cb[1], sw[0], ring); earth(`${id}:es`, `RMUB · SPARE ${slot} earth`, sw[1], [x + 100, 600], 'camp-rmub', ring);
  unknown(`${id}:coverage`, sw[1], 'Printed NOT CONNECTED spare; actual termination/state unconfirmed', ring);
}
const ringEnds = [{ rmu: 'rmu1', tx: 'tx1', board: 'msb1' }, { rmu: 'rmu1', tx: 'tx1a', board: 'msb1a' }, { rmu: 'rmu2', tx: 'tx2', board: 'msb2' }, { rmu: 'rmu3', tx: 'tx3', board: 'msb3' }, { rmu: 'rmu4', tx: 'tx4', board: 'msb4' }, { rmu: 'rmu5', tx: 'tx5', board: 'msb5' }, { rmu: 'rmu6', tx: 'tx6', board: 'msb6' }];
for (const endpoint of ringEnds) {
  const tx = endpoint.tx.toUpperCase(); const board = endpoint.board.toUpperCase(); const primary = `camp-${endpoint.rmu}`; const x = endpoint.tx === 'tx1a' ? 780 : 380;
  const sw = contact(`camp:${endpoint.tx}:fd:sw`, `${tx} feeder SW`, [x, endpoint.tx === 'tx6' ? 500 : 330], primary, ring); link(`camp:${endpoint.tx}:fd:bus-link`, rmuBars[endpoint.rmu], sw[0], ring);
  earth(`camp:${endpoint.tx}:fd:es-line`, `${tx} feeder earth`, sw[1], [x + 110, endpoint.tx === 'tx6' ? 600 : 410], primary, ring);
  const fuseClaim = fact(`MC-${tx}-FEEDER`, `${tx} feeder depicts ${endpoint.tx === 'tx6' ? 'a separate CB/SW/ES assembly' : 'an 80 A fuse with earth contacts on both sides'}. Fuse continuity and complete installed positions/interlocks unconfirmed.`, [['study1', 'H-L / 11-16, individual camp transformer feeder']], ['MC-Q04']);
  let output = sw[1];
  if (endpoint.tx === 'tx6') {
    const cb = contact('camp:tx6:fd:cb', 'TX6 feeder CB', [x, 330], primary, fuseClaim, 'breaker'); link('camp:tx6:fd:cb-link', sw[1], cb[0], fuseClaim); output = cb[1];
  } else {
    const fuseId = `camp:${endpoint.tx}:fuse`; const pins: [string, string] = [`${fuseId}:a`, `${fuseId}:b`];
    add({ id: fuseId, label: `${tx} · 80 A fuse`, kind: 'interface', terminals: pins, conductivePairs: [[...pins]], positions: [], ...fuseClaim, knowledge: 'provisional' }, [x, 500], [[x, 475], [x, 525]], primary);
    link(`${fuseId}:link`, sw[1], pins[0], fuseClaim); earth(`camp:${endpoint.tx}:fd:es-fuse`, `${tx} fuse-side earth`, pins[1], [x + 110, 580], primary, fuseClaim); output = pins[1];
  }
  const lvGroup = `camp-${endpoint.tx}-lv`; group(lvGroup, `${tx} / ${board} · first LV bus`, [-50, -80, 1000, 650]);
  const transfer = fact(`MC-${tx}-TRANSFER`, `Inference: drawn ${tx} 11 kV/440 V transfer to ${board}; source and reverse transfer provisional, independent earth continuity unconfirmed. Neutral grounding is not phase earth.`, [['study1', 'H-L / 11-16, transformer and first LV bus']], ['MC-Q04'], 'provisional');
  const terminals = transformer(`camp:${endpoint.tx}`, tx, [450, 120], lvGroup, transfer); link(`camp:${endpoint.tx}:phase-cable`, output, terminals[0], fuseClaim);
  const endpointClaim = fact(`MC-${board}`, `${board} first LV incoming device/bar depicted; outgoing LV block/DB circuits excluded. ${endpoint.board === 'msb5' || endpoint.board === 'msb6' ? 'Detailed main switch is described separately from the study CB.' : 'Detailed installed incoming tag/position set unconfirmed.'}`, [['study1', 'H-L / 11-16, first LV incoming and endpoint'], ...(endpoint.board === 'msb5' ? [['msb5', 'A-C / 5-8, SUPPLY FROM TX5 and MSB5-IN1600A']] as [keyof typeof docs, string][] : endpoint.board === 'msb6' ? [['msb6', 'A-C / 5-9, SUPPLY FROM TX6 and MSB6-IN1600A']] as [keyof typeof docs, string][] : [])], ['MC-Q04']);
  lvEnd(`camp:${endpoint.board}`, board, terminals[1], [450, 320], lvGroup, endpointClaim, endpoint.board === 'msb5' || endpoint.board === 'msb6' ? 'disconnector' : 'breaker', [`${board}-IN`, `CB ${board} IN`]);
}
// TX6 has a CB before its feeder SW; the other ring branches depict fuses after SW.
const tx6BarLink = connections.find(connection => connection.id === 'camp:tx6:fd:bus-link')!;
tx6BarLink.to = 'camp:tx6:fd:cb:a';
const tx6OrderLink = connections.find(connection => connection.id === 'camp:tx6:fd:cb-link')!;
tx6OrderLink.from = 'camp:tx6:fd:cb:b'; tx6OrderLink.to = 'camp:tx6:fd:sw:a';
connections.find(connection => connection.id === 'camp:tx6:phase-cable')!.from = 'camp:tx6:fd:sw:b';
const generation = fact('MC-GENERATION', "Unconfirmed construction reconciliation: the 2009 camp sheet depicts DG701/702/703 at 415 V, 1250 kVA, each with a CB and incoming isolator. The study uses GN210A/GN206A/GN205A aliases and omits DG701-IN01. TF700 differs: 415 V/11 kV 3.15 MVA; 433 V/11 kV 3.15 MVA; 433 V/11 kV 5000 kVA. No precedence or source availability accepted.", [['emergency', 'A-D / 1-6, generator branches and 07SW701; E-G TF700/RM700'], ['camp', 'F-G / 7-9, TF700 and RM700'], ['study1', 'E-G / 14-15, GN205A/GN206A/GN210A and TF700']], ['MC-Q01', 'MC-Q02'], 'provisional');
group('camp-generation-bar', '07SW701 · generation phase bar');
const generatorBar = bus('camp:07sw701:bus', '07SW701 · 415 V generation bus', [450, 120], 'camp-generation-bar', generation, ['07SW701', 'EMERGENCY GENERATORS SWITCHBOARD']);
for (const [number, studyAlias] of [['703', 'GN205A'], ['702', 'GN206A'], ['701', 'GN210A']]) {
  const id = `camp:dg${number}`; const member = `${id}-generation`; group(member, `DG${number} / ${studyAlias} · unresolved generation`, [-50, -80, 1000, 650]);
  const terminal = `${id}:source:out`; add({ id: `${id}:source`, label: `DG${number} · ${studyAlias}`, aliases: [`07DG${number}`, studyAlias], kind: 'source', terminals: [terminal], conductivePairs: [], positions: [], ...generation }, [450, 30], [[450, 30]], member);
  const cb = contact(`${id}:cb`, `DG${number}-CB01`, [450, 180], member, generation, 'breaker'); const isolator = contact(`${id}:in`, `DG${number}-IN01`, [450, 390], member, generation);
  link(`${id}:source-cable`, terminal, cb[0], generation); link(`${id}:cb-in`, cb[1], isolator[0], generation); link(`${id}:bar-link`, isolator[1], generatorBar, generation);
  sources.push({ id, assetId: `${id}:source`, terminal, label: `DG${number} / ${studyAlias} availability unconfirmed`, ...generation }); availability[id] = null;
}
const genFd = contact('camp:tf700:lv:cb', 'TF700-FDR-01', [450, 350], 'camp-generation-bar', generation, 'breaker'); link('camp:tf700:lv:bar-link', generatorBar, genFd[0], generation);
group('camp-tf700', 'TF700 · disputed rating / independent channels', [-50, -80, 1000, 650]);
const tf700 = transformer('camp:tf700', 'TF700 · rating unconfirmed', [450, 180], 'camp-tf700', generation, ['415V/11kV 3.15MVA', '433V/11kV 3.15MVA', '433V/11kV 5000kVA']); link('camp:tf700:lv:cable', genFd[1], tf700[1], generation);
group('camp-rm700', 'RM700 · source / camp / transformer contacts', [-50, -130, 1100, 880]);
const rm700Bar = bus('camp:rm700:bus', 'RM700 · 11 kV phase bar', [500, 200], 'camp-rm700', generation);
const rm700Line = contact('camp:rm700:sw03', 'RM700 SW03 · station side', [180, 75], 'camp-rm700', generation); link('camp:rm700:line-bar', rm700Line[1], rm700Bar, generation); earth('camp:rm700:es03', 'RM700 ES03', rm700Line[0], [300, -5], 'camp-rm700', generation);
const rm700Ring = contact('camp:rm700:sw02', 'RM700 SW02 · camp', [800, 75], 'camp-rm700', generation); link('camp:rm700:ring-bar', rm700Ring[1], rm700Bar, generation); earth('camp:rm700:es02', 'RM700 ES02', rm700Ring[0], [920, -5], 'camp-rm700', generation);
const rm700CB = contact('camp:rm700:cb01', 'RM700 CB01', [430, 330], 'camp-rm700', generation, 'breaker'); const rm700SW = contact('camp:rm700:sw01', 'RM700 SW01 · key mapping unknown', [430, 520], 'camp-rm700', generation);
link('camp:rm700:transformer:bar', rm700Bar, rm700CB[0], generation); link('camp:rm700:transformer:cb-sw', rm700CB[1], rm700SW[0], generation); link('camp:tf700:hv:cable', rm700SW[1], tf700[0], generation); earth('camp:rm700:es01', 'RM700 ES01', rm700SW[1], [600, 625], 'camp-rm700', generation);
const rmuaIn = contact('camp:rmua:ring-rm700:sw', 'RMUA · FDR RM700', [180, 75], 'camp-rmua', ring); link('camp:rmua:rm700:bar', rmuaIn[1], rmuBars.rmua, ring); earth('camp:rmua:ring-rm700:es', 'RMUA · RM700 earth', rmuaIn[0], [300, -5], 'camp-rmua', ring); link('camp:ring:rm700-rmua', rm700Ring[0], rmuaIn[0], generation);
const village = fact('MC-VILLAGE', "Drawn station village 11 kV route through RM732, VP09, VP12 ABS/LBS, V52 ABS and V59, with separate V60/RM700 and V62-V63/RMU6 legs. Study pole/switch labels differ; exact identity, baseline, normal-open point and key system remain unconfirmed. Surge arrestors are not operable earth paths.", [['camp', 'A-G / 4-10, complete village/camp pole diagram and legend'], ['study1', 'D-L / 6-15, RM732 and camp poles']], ['MC-Q03']);
group('camp-rm732', 'RM732 · station village / camp / RM719');
const villagePort = port('camp:interface:station-village', 'Station · village supply', [500, -140], 'camp-rm732', village, ['CLOUDBREAK VILLAGE O/H LINE', 'CAMP O/H LINE630A', '07110-EL-DR-2349']);
const rm732In = contact('camp:rm732:in', 'RM732 · incoming SW', [500, 40], 'camp-rm732', village); const rm732Bus = bus('camp:rm732:bus', 'RM732 · 11 kV bar', [500, 210], 'camp-rm732', village);
link('camp:rm732:incoming', villagePort, rm732In[0], village); link('camp:rm732:in-bar', rm732In[1], rm732Bus, village); earth('camp:rm732:in:es', 'RM732 · incoming earth', rm732In[0], [650, -35], 'camp-rm732', village);
const rm732Camp = contact('camp:rm732:camp:sw', 'RM732 · CAMP FDR', [200, 360], 'camp-rm732', village); const rm732719 = contact('camp:rm732:rm719:sw', 'RM732 · RM719 FDR', [800, 360], 'camp-rm732', village);
link('camp:rm732:camp:bar', rm732Bus, rm732Camp[0], village); link('camp:rm732:719:bar', rm732Bus, rm732719[0], village); earth('camp:rm732:camp:es', 'RM732 · camp earth', rm732Camp[1], [350, 460], 'camp-rm732', village); earth('camp:rm732:rm719:es', 'RM732 · RM719 earth', rm732719[1], [950, 460], 'camp-rm732', village);
group('camp-vp09', 'Village poles · VP09 / VP12 / workshop spur');
const vp09 = junction('camp:pole:vp09', 'VP09 · cable junction', [500, 20], 'camp-vp09', village); link('camp:pole:rm732-vp09', rm732Camp[1], vp09, village);
const vp12Abs = contact('camp:vp12:abs', 'VP12-ABS', [700, 170], 'camp-vp09', village); const vp12Lbs = contact('camp:vp12:lbs', 'VP12-LBS', [700, 370], 'camp-vp09', village);
link('camp:vp09-vp12', vp09, vp12Abs[0], village); link('camp:vp12:abs-lbs', vp12Abs[1], vp12Lbs[0], village);
const vp09Abs = contact('camp:p09a:abs', 'P09A-ABS', [180, 170], 'camp-vp09', village); const vp09CB = contact('camp:vp09b:cb', 'VP09B-CB · recloser', [180, 370], 'camp-vp09', village, 'breaker');
link('camp:vp09-workshop', vp09, vp09Abs[0], village); link('camp:vp09:abs-cb', vp09Abs[1], vp09CB[0], village);
group('camp-v59', 'Camp line · V52 / V59 / V60 / V62-V63');
const v52 = contact('camp:v52:abs', 'V52-ABS · key conditions unknown', [500, 30], 'camp-v59', village); link('camp:vp12-v52', vp12Lbs[1], v52[0], village);
const v59 = junction('camp:pole:v59', 'V59 · spur junction', [500, 190], 'camp-v59', village); link('camp:v52-v59', v52[1], v59, village);
const v60 = contact('camp:v60:cb', 'V60-CB01 · V61 study alias', [180, 350], 'camp-v59', village, 'breaker'); link('camp:v59-v60', v59, v60[0], village); link('camp:v60-rm700', v60[1], rm700Line[0], village);
const v62 = contact('camp:v62:abs', 'V62-ABS', [800, 350], 'camp-v59', village); const v63 = contact('camp:v63:cb', 'V63-CB · recloser', [800, 550], 'camp-v59', village, 'breaker'); link('camp:v59-v62', v59, v62[0], village); link('camp:v62-v63', v62[1], v63[0], village);
const rmu6Line = contact('camp:rmu6:ring-v63:sw', 'RMU6 · FDR V63-CB', [800, 75], 'camp-rmu6', ring); link('camp:rmu6:v63:bar', rmuBars.rmu6, rmu6Line[1], ring); earth('camp:rmu6:ring-v63:es', 'RMU6 · line earth', rmu6Line[0], [920, -5], 'camp-rmu6', ring); link('camp:v63-rmu6', v63[1], rmu6Line[0], village);
const workshop = fact('MC-CAMP-WORKSHOPS', "SS719/TF719 supplies the 719 switchboard; SS731/TF731 supplies the 731 switchboard. Gulf/Apprentice and AMS/Fabrication workshop descriptions differ. Actual identities, 400/433 V labels and complete interlocks remain unconfirmed.", [['camp', 'D-E / 4-9, SS731/SS719 to first LV bars'], ['study1', 'D-G / 2-8, workshop substations']], ['MC-Q06']);
packageEndpoint('camp:rm719', 'RM719 / SS719 · TF719', 'camp:sw719', 'SW719 · description unresolved', rm732719[1], workshop, 'camp', ['MC-Q06'], 'RM719 SW001 · depicted not connected', ['SW001', 'NOT CONNECTED'], ['TF719']);
assets.find(asset => asset.id === 'camp:rm719:in01:sw')!.aliases!.push('SW002');
packageEndpoint('camp:rm731', 'RM731 / SS731 · TF731', 'camp:sw731', 'SW731 · description unresolved', vp09CB[1], workshop, 'camp', ['MC-Q06'], 'RM731 · depicted not connected', ['NOT CONNECTED'], ['TF731']);
assets.find(asset => asset.id === 'camp:rm731:in01:sw')!.aliases!.push('RM731 IN01');
for (const number of ['715', '716']) {
  const member = `camp-tf${number}`; group(member, `TF${number} / DB${number} · pole spur`, [-50, -80, 1000, 650]);
  const claim = fact(`MC-TF${number}`, `TF${number} is a separately fused camp 11 kV spur to DB${number}'s first LV bus. ${number === '716' ? '100 kVA on the camp sheet versus 200 kVA on the study remains unresolved.' : '100 kVA depicted.'} No surge arrestor phase-earth route is represented.`, [['camp', 'D-E / 5-6, pole-top spurs'], ['study1', 'K / 6-8, TF715/716 and DB endpoints']], ['MC-Q05']);
  const fused = contact(`camp:tf${number}:fuse`, `TF${number} · drop-out fuse`, [450, 20], member, claim); link(`camp:tf${number}:spur`, v59, fused[0], claim);
  const transfer = fact(`MC-TF${number}-TRANSFER`, `Inference: TF${number} source/reverse transfer provisional; neutral/earth arrangement does not establish phase-earth continuity.`, [['study1', 'K / 6-8, poletransformers']], ['MC-Q05'], 'provisional');
  const tf = transformer(`camp:tf${number}`, `TF${number}`, [450, 200], member, transfer); link(`camp:tf${number}:cable`, fused[1], tf[0], claim); lvEnd(`camp:db${number}`, `DB${number}`, tf[1], [450, 380], member, claim);
}
reviews.push({ id: 'MC-Q01', status: 'open', question: "Reconcile DG701/702/703 with GN210A/GN206A/GN205A, source ratings, omitted DG701 isolator and TF700 3.15/5 MVA, 415/433 V. No availability or current lineup accepted.", evidenceIds: ['MC-GENERATION'] }, { id: 'MC-Q02', status: 'open', question: "Confirm RM700 SW01/ES01 roles and V52 key ownership/release conditions, complete positions and physical interlocks.", evidenceIds: ['MC-GENERATION'] }, { id: 'MC-Q05', status: 'open', question: "Resolve TF716 100/200 kVA and DB715/716 incoming/transformer policies. No arrestor phase-earth path.", evidenceIds: ['MC-TF715', 'MC-TF716'] }, { id: 'MC-Q06', status: 'open', question: "Reconcile SS719 Gulf/Apprentice and SS731 AMS/Fabrication workshop identities, mine services and source references.", evidenceIds: ['MC-CAMP-WORKSHOPS'] });
const mine711 = fact('MC-RM711', "Supplied2252 depicts FROM POWER STATION TF03, RM711 ring switches and earth contacts, CB TF711 FD plus separate transformer SW/earth, TF711 22 kV/400 V 1 MVA and CB SW711 IN to the first 400 V, 2000 A bar. Its other ring side says TO SEWAGE TREATMENT TF714/ref2330; laboratory TF714 is not accepted as the same asset. The study adds SS711B and uses 433 V; onward reconciliation remains unconfirmed.", [['rm711', 'A-C / 1-3, station TF03 and sewage TF714 ring paths; C-E TF711/SW711 first bus'], ['study1', 'C-F / 2-5, mine-services/SS711B comparison']], ['MC-Q06', 'MC-Q09']);
group('mine-source-interfaces', 'Mine source interfaces · station ownership retained', [-50, -100, 1100, 760]);
const tf03Port = port('mine:interface:station-tf03', 'Station TF03 · 22 kV interface', [200, 30], 'mine-source-interfaces', mine711, ['TF03', 'FROM POWER STATION TF03', '07110-EL-DR-2349', '07110-EL-DR-2330']);
packageEndpoint('mine:rm711', 'RM711 / SS711 · TF711', 'mine:sw711', 'SW711 · 400 V', tf03Port, mine711, 'rm711', ['MC-Q06', 'MC-Q09'], 'Sewage TF714 / study SS711B · unresolved onward interface', ['TO SEWAGE TREATMENT TF714', '07110-EL-DR-2330', 'Not laboratory TF714'], ['TF711']);
const mine718 = fact('MC-RM718', "2257 depicts a 600 A pole-top circuit-breaker interface, RM718 ring/earth contacts, TF718 feeder CB/SW/earth, TF718 22 kV/400 V 1 MVA and CB SW718 IN to the first 400 V, 2000 A bar. The study depicts 22/433 V. Outgoing RUMS-001 is after the final LV endpoint and excluded. The source is not RM721/RM712.", [['rm718', 'A-E / 1-3, source/ring/TF718 and first SW718 bus'], ['study1', 'D-G / 12-13, railcar-unloading kiosk']], ['MC-Q06']);
const rm718Port = port('mine:interface:rm718-pole', 'RM718 · pole-top source interface', [800, 30], 'mine-source-interfaces', mine718, ['FROM600A POLE TOP CIRCUIT BREAKER', '07110-EL-DR-2349', 'Study OPF1 / RC1 / RC2 route unconfirmed']);
packageEndpoint('mine:rm718', 'RM718 / SS718 · TF718', 'mine:sw718', 'SW718 · 400 V', rm718Port, mine718, 'rm718', ['MC-Q06'], 'RM718 · second ring destination unconfirmed', [], ['TF718']);
const legacyMine = fact('MC-LEGACY-MINE', "Provisional study-only SS711B/TF711B and TF717 sewage-spur construction. Do not join its TF03 candidate to the actual RM711 onward TF714 or laboratory TF714 without owner reconciliation. The study labels TF711B 22/433 V, 1000 kVA and TF717 22/433 V, 100 kVA; current installation remains unconfirmed.", [['study1', 'C-F / 2-5, TF03 mine-services cable, SS711B, TF711B, TF717/DB717'], ['rm711', 'A / 1-3, exact station TF03 and sewage TF714 arrows']], ['MC-Q06', 'MC-Q09'], 'provisional');
const studyTf03 = port('mine:interface:study-tf03', 'TF03 · study candidate coverage', [200, 330], 'mine-source-interfaces', legacyMine, ['SS711B study continuation; not joined to RM711 onward interface']);
packageEndpoint('mine:rm711b', 'RM711B / SS711B · study only', 'mine:sw711b', 'SW711B · study candidate', studyTf03, legacyMine, 'study1', ['MC-Q06', 'MC-Q09'], 'TF717 sewage spur · study candidate', [], ['TF711B']);
group('mine-tf717', 'TF717 / DB717 · sewage spur candidate', [-50, -80, 1000, 650]);
const tf717Fuse = contact('mine:tf717:fuse', 'TF717 · fused spur', [450, 20], 'mine-tf717', legacyMine); link('mine:tf717:spur', 'mine:rm711b:interface:in02:port', tf717Fuse[0], legacyMine);
const tf717 = transformer('mine:tf717', 'TF717 · 22/433 V study', [450, 200], 'mine-tf717', legacyMine); link('mine:tf717:hv-cable', tf717Fuse[1], tf717[0], legacyMine); lvEnd('mine:db717', 'DB717 · main sewage plant', tf717[1], [450, 380], 'mine-tf717', legacyMine);
const water = fact('MC-WATER', "SW441 has one drawn 22 kV bar: incoming CB SW441 IN01 with line-side ES; direct bus ES SW441; outgoing CB TF441 FD with cable-side ES TF441 FD. TF441 detail shows 22/400 V, 2 MVA supplying CB MC441 IN3000A and the first 400 V, 3000 A phase bar. The study says process water, 22/415 V and feeds via WT1; the title says Water Tower. Current source identity and normal states remain unconfirmed. MEN neutral grounding is not phase earth.", [['sw441', 'A-G / 4-8, incoming reference2349, phase bar and CB/ES contacts'], ['mc441', 'A-C / 5-12, TF441/MC441 incoming and first phase bar; distinct neutral/MEN'], ['study1', 'E-G / 10-12, OPF1/WT1/SS441']], ['MC-Q08']);
group('mine-water-source', 'Water tower / process water · source interface', [-50, -80, 1000, 650]);
const waterPort = port('mine:interface:water-opf1', 'Station OPF1 · water source unconfirmed', [450, 30], 'mine-water-source', water, ['07110-EL-DR-2349', 'FROM600A CIRCUIT BREAKER', 'Study OPF1 / WT1 recloser']);
const wt1 = contact('mine:wt1:cb', 'WT1-CB · study recloser', [450, 250], 'mine-water-source', { ...water, knowledge: 'provisional' }, 'breaker'); link('mine:wt1:source', waterPort, wt1[0], { ...water, knowledge: 'provisional' });
group('mine-sw441', 'SW441 · water-tower HV contacts', [-50, -100, 1100, 820]);
const sw441In = contact('mine:sw441:in:cb', 'CB SW441 IN01', [450, 50], 'mine-sw441', water, 'breaker'); link('mine:sw441:incoming:cable', wt1[1], sw441In[0], { ...water, knowledge: 'provisional' }); earth('mine:sw441:in:es', 'ES SW441 IN01', sw441In[0], [650, -30], 'mine-sw441', water);
const sw441Bar = bus('mine:sw441:bus', 'SW441 · 22 kV bus', [450, 230], 'mine-sw441', water, ['SS441', 'Water Tower', 'Process Water']); link('mine:sw441:incoming:bar', sw441In[1], sw441Bar, water); earth('mine:sw441:bus:es', 'ES SW441', sw441Bar, [170, 350], 'mine-sw441', water);
const tf441Fd = contact('mine:tf441:cb', 'CB TF441 FD', [550, 450], 'mine-sw441', water, 'breaker'); link('mine:tf441:bar', sw441Bar, tf441Fd[0], water); earth('mine:tf441:es', 'ES TF441 FD', tf441Fd[1], [750, 570], 'mine-sw441', water);
group('mine-mc441', 'TF441 / MC441 · first LV bus', [-50, -80, 1000, 650]);
const waterTransfer = fact('MC-TF441-TRANSFER', "Inference: TF441 feeds the first MC441 phase bus. Detail 22/400 V versus study 22/415 V labels retained. Source/reverse transfer is provisional; independent winding earth continuity remains unconfirmed. MEN/neutral conductors are excluded from the phase graph.", [['mc441', 'A-C / 5-12, TF441 andMC441 incoming'], ['study1', 'F-G / 10-11, process-water transformer']], ['MC-Q08'], 'provisional');
const tf441 = transformer('mine:tf441', 'TF441 · 22/400 V · study415 V', [450, 120], 'mine-mc441', waterTransfer, ['TF441', '22kV/400V2MVA', '22kV/415Vstudy']); link('mine:tf441:hv-cable', tf441Fd[1], tf441[0], water); lvEnd('mine:mc441', 'MC441 · 400 V', tf441[1], [450, 320], 'mine-mc441', water, 'breaker', ['CB MC441 IN', '3000A', 'Water Tower', 'Process Water']);
const overlap = fact('MC-OVERLAPS', "Unconfirmed shared-area reconciliation: station SR001/002 versus SB01/02; study TF04 SPARE 400/11 kV versus PL1 TF04 11/33 kV; Alinta and backup-generation candidates. SW411, processing, services and western depictions overlap existing area models. TF712 study LV continuity conflicts with the pulled-cable/generator sheet; western OHL/drop-tower/future Sizer8 differs from CV006 sources. No shared physical equipment or accepted source connection is duplicated here. Study configurations and planned work are not baseline.", [['study1', 'A-C / 1-16, station study and notes2-3'], ['study2', 'A-C / 5-12, SW411 and processing continuations'], ['study3', 'A-K, services/processing/western overlap'], ['study4', 'A-G, westernOHL/drop-tower/futureSizer8'], ['overview', 'Entire mine overview, historical TF712 continuity']], ['MC-Q07', 'MC-Q09', 'MC-Q10'], 'unresolved');
group('mine-overlaps', 'Shared-area reconciliation · no invented joins', [-50, -80, 1100, 650]);
for (const [id, label, aliases, point] of [
  ['station', 'Station · study overlaps', ['SR001', 'SR002', 'SB01', 'SB02', 'TF04 SPARE', 'ALINTA INCOMER', 'G26/G27/GSU2', 'TF02/TF202 auxiliary LV'], [250, 30]],
  ['sw411', 'SW411 · processing interface', ['SW411', 'TF11/TF12', 'Study fault configuration; not baseline'], [800, 30]],
  ['services-rm721', 'RM721 / services · discrepancy', ['RM712/TF712/SW712', 'TF712 disconnected cables versus study continuity'], [250, 320]],
  ['western', 'Western OHL · source unresolved', ['CBW OHL FD', 'P18-8 Drop Tower', 'RM418', 'FUTURE Sizer8'], [800, 320]],
] as [string, string, string[], Point][]) port(`mine:interface:${id}`, label, point, 'mine-overlaps', overlap, aliases);
reviews.push({ id: 'MC-Q07', status: 'open', question: "Resolve station Alinta/backup/auxiliary and TF04 SPARE 400/11 versus PL1 11/33 identities without duplicate physical equipment or automatic joins.", evidenceIds: ['MC-OVERLAPS'] }, { id: 'MC-Q08', status: 'open', question: "Confirm SW441/TF441/MC441 Water Tower/Process Water identities, OPF1/WT1 source and 400/415 V labels. Complete physical interlocks and baseline remain unconfirmed.", evidenceIds: ['MC-WATER'] }, { id: 'MC-Q09', status: 'open', question: "Resolve mine/services overlaps: RM711 onward TF714 versus study SS711B/TF717, and TF712 pulled-cable/generator versus study continuity. Laboratory TF714 is not accepted as sewage TF714.", evidenceIds: ['MC-RM711', 'MC-LEGACY-MINE', 'MC-OVERLAPS'] }, { id: 'MC-Q10', status: 'open', question: "Reconcile western OHL/drop-tower/RM418 future Sizer8 versus CV006 western sources. No second parallel feed is accepted.", evidenceIds: ['MC-OVERLAPS'] });
reviews.push({ id: 'MC-Q03', status: 'open', question: "Confirm village/ring topology, pole/device aliases, actual normal-open point and physical interlocks. No study states accepted.", evidenceIds: ['MC-CAMP-RING'] }, { id: 'MC-Q04', status: 'open', question: "Confirm TX1/TX1A/TX2..6 source/reverse/earth channels, fuse continuity, first MSB LV identities, detailed main switch versus study CB and baseline.", evidenceIds: ['MC-CAMP-RING'] }, { id: 'MC-Q11', status: 'open', question: "Confirm installed scope, missing exact reference equivalence, all actual states, source availability and complete interlocks. Study/AS BUILT/IFC states do not grant switching permission.", evidenceIds: ['MC-CAMP-RING'] });
function presentation(): NonNullable<NetworkModel['presentation']> {
  const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const details: DiagramView[] = Object.entries(groups).map(([id, member]) => {
    const localLayout = structuredClone(layout); const visible = new Set(member.assetIds); const portals: NonNullable<DiagramView['boundaries']> = [];
    for (const connection of connections) {
      const from = visible.has(owners.get(connection.from)!); const to = visible.has(owners.get(connection.to)!); if (from === to) continue;
      const local = from ? connection.from : connection.to; const remote = from ? connection.to : connection.from; const remoteAssetId = owners.get(remote)!;
      const [x, y] = localLayout.terminals[local]; const point: Point = [x, y + (local.endsWith(':hv') || local.endsWith(':a') ? -90 : 90)]; localLayout.terminals[remote] = point;
      portals.push({ connectionId: connection.id, remoteAssetId, targetViewId: Object.entries(groups).find(([, candidate]) => candidate.assetIds.includes(remoteAssetId))?.[0] ?? 'overview', position: point });
    }
    return { id, label: member.label, assetIds: member.assetIds, layout: localLayout, bounds: [member.bounds[0] + member.offset[0], member.bounds[1] + member.offset[1], member.bounds[2], member.bounds[3]], boundaries: portals };
  });
  return { overviewId: 'overview', views: [{ id: 'overview', label: 'Mine / camp overview · construction', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -150, 5050, Math.ceil(Object.keys(groups).length / 4) * 1000] }, ...details] };
}
export const mineCampModel: NetworkModel = {
  id: 'site-mine-camp', version: 'construction-2026-10-22.2', name: 'Mine / camp · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, boundaries, earths, sources, starting: { devices, sources: availability },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Full installed key/physical interlocks, supported position sets and starting state unconfirmed. The source does not confirm switching permission.', evidence: evidence.filter(record => asset.evidenceIds?.includes(record.id)).flatMap(record => record.references) })), rules: [] }, presentation: presentation(),
};
