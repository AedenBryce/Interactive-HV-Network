import type { NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// IDs/terminal roles below are construction names. Sources establish depicted paths,
// not installed availability, interlock permission or an accepted starting lineup.
const PS1 = { document: '500CBC0002-13015-DR-EL-0001.pdf', revision: '3 (18/07/2022; UPDATED AS PER REDLINES)', page: 1 };
const PL1 = { document: 'CB21OP055B-10016-DR-EL-0089.pdf', revision: '0 (10/06/2022; ISSUED FOR CONSTRUCTION)', page: 1 };
type Claim = Pick<NetworkModel['assets'][number], 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Zone = 'sb01' | 'sb02' | 'amr' | 'iop';
const assets: NetworkModel['assets'] = [];
const connections: NetworkModel['connections'] = [];
const sources: NetworkModel['sources'] = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const availability: NetworkModel['starting']['sources'] = {};
const zones = new Map<string, Zone>();
const generatorIds = new Map<string, string[]>();
const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };

function claim(id: string, summary: string, region: string, source: typeof PS1 | typeof PL1 = PS1, knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported', reviewIds: string[] = []): Claim {
  evidence.push({ id, summary, status: knowledge, references: [{ ...source, clause: `Drawing region: ${region}` }] });
  return { knowledge, evidenceIds: [id], reviewIds };
}
function put(asset: NetworkModel['assets'][number], zone: Zone, x: number, y: number, offsets?: [number, number]) {
  assets.push(asset); zones.set(asset.id, zone); layout.assets[asset.id] = [x, y];
  if (offsets) layout.labelOffsets![asset.id] = offsets;
  return asset.id;
}
function link(id: string, from: string, to: string, fact: Claim, bends?: [number, number][]) {
  connections.push({ id, from, to, ...fact });
  if (bends) layout.bends![id] = bends;
}
function terminalAsset(id: string, label: string, aliases: string[], zone: Zone, x: number, y: number, fact: Claim, coverage = true) {
  const port = `${id}:port`;
  put({ id, label, aliases, kind: 'interface', terminals: [port], conductivePairs: [], positions: [], ...fact }, zone, x, y);
  layout.terminals[port] = [x, y];
  if (coverage) boundaries.push({ id: `${id}:coverage`, label: `${label} — continuation unconfirmed`, terminal: port, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...fact, knowledge: 'unresolved' });
  return port;
}
function switching(id: string, label: string, aliases: string[], zone: Zone, x: number, y: number, kind: 'breaker' | 'disconnector' | 'earth-switch', vertical: boolean, fact: Claim) {
  const terminals: [string, string] = [`${id}:in`, `${id}:out`];
  put({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...fact, reviewIds: [...new Set([...(fact.reviewIds ?? []), 'R003', 'R005', 'PS-DEVICE-IDS'])] }, zone, x, y, [0, -45]);
  layout.terminals[terminals[0]] = [x - (vertical ? 0 : 30), y - (vertical ? 30 : 0)];
  layout.terminals[terminals[1]] = [x + (vertical ? 0 : 30), y + (vertical ? 30 : 0)];
  if (vertical) layout.rotations![id] = 90;
  devices[id] = null;
  return terminals;
}
function earthSwitch(id: string, label: string, aliases: string[], zone: Zone, x: number, y: number, conductor: string, fact: Claim) {
  const ports = switching(id, label, aliases, zone, x, y, 'earth-switch', false, fact);
  layout.labelOffsets![id] = [0, 65];
  const [cx] = layout.terminals[conductor];
  link(`${id}:branch`, conductor, ports[0], fact, [[cx, y]]);
  earths.push({ id: `${id}:termination`, label: `${label} earth`, terminal: ports[1], ...fact });
}
function bus(zone: 'sb01' | 'sb02', y: number) {
  const id = `station:${zone}:bus`; const port = `${id}:bar`;
  const fact = claim(`PS-${zone.toUpperCase()}-BUS`, `${zone.toUpperCase()} is drawn as one continuous 11 kV bar. Its current installation/lineup is unconfirmed.`, zone === 'sb01' ? 'A-C, SB01 horizontal bus' : 'E-G, SB02 horizontal bus', PS1, 'supported', ['R005']);
  put({ id, label: `${zone.toUpperCase()} 11 kV bus`, aliases: [zone.toUpperCase()], kind: 'bus', terminals: [port], conductivePairs: [], positions: [], ...fact }, zone, 1800, y, [0, -25]);
  layout.terminals[port] = [1800, y]; layout.rotations![id] = 90;
  return port;
}
const sb01 = bus('sb01', 500); const sb02 = bus('sb02', 1700);

for (const [zone, numbers] of [['sb01', [23, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]], ['sb02', [16, 17, 18, 19, 20, 21, 22]]] as const) {
  numbers.forEach((number, index) => {
    const tag = `CB-GEN${String(number).padStart(2, '0')}`; const key = `station:gen-${String(number).padStart(2, '0')}`;
    const x = zone === 'sb01' ? 160 + index * 220 : 700 + index * 260; const busY = zone === 'sb01' ? 500 : 1700;
    const fact = claim(`PS-GEN-${number}`, `PS1 branch ${tag} depicts a distinct 11 kV/2420 kW generator, series breaker and generator-side earth switch on ${zone.toUpperCase()}. Only the shared branch label is printed; role-specific IDs are construction identities. Availability is unconfirmed.`, `${zone === 'sb01' ? 'A-B' : 'E-F'}, ${tag} branch`, PS1, 'supported', ['R001', 'R005', 'PS-DEVICE-IDS']);
    const sourceId = `${key}:source`; const sourceTerminal = `${sourceId}:out`;
    put({ id: sourceId, label: `GEN${String(number).padStart(2, '0')} source`, aliases: [tag], kind: 'source', terminals: [sourceTerminal], conductivePairs: [], positions: [], ...fact }, zone, x, busY - 420);
    layout.terminals[sourceTerminal] = [x, busY - 390];
    sources.push({ id: sourceId, label: `${tag} — availability unconfirmed`, assetId: sourceId, terminal: sourceTerminal, ...fact }); availability[sourceId] = null;
    const cb = switching(`${key}:cb`, `GEN${String(number).padStart(2, '0')} CB`, [tag], zone, x, busY - 200, 'breaker', true, fact);
    link(`${key}:source-link`, sourceTerminal, cb[0], fact);
    link(`${key}:bus-link`, cb[1], zone === 'sb01' ? sb01 : sb02, fact, [[x, busY]]);
    earthSwitch(`${key}:es`, `GEN${String(number).padStart(2, '0')} ES`, [tag], zone, x + 85, busY - 310, cb[0], fact);
    generatorIds.set(key, [sourceId, `${key}:cb`, `${key}:es`]);
  });
}

function stationBay(zone: 'sb01' | 'sb02', key: string, label: string, x: number, fact: Claim) {
  const busY = zone === 'sb01' ? 500 : 1700; const id = `station:${zone}:${key}`;
  const cb = switching(`${id}:cb`, `${label} CB`, [label], zone, x, busY + 190, 'breaker', true, fact);
  link(`${id}:bus-link`, zone === 'sb01' ? sb01 : sb02, cb[0], fact, [[x, busY]]);
  earthSwitch(`${id}:es`, `${label} ES`, [label], zone, x + 85, busY + 290, cb[1], fact);
  return { id, line: cb[1], busY, x, zone };
}

function transformer(id: string, label: string, aliases: string[], zone: Zone, x: number, y: number, input: string, summary: string, region: string, earthing = false, extraReferences: typeof PS1[] = []) {
  const fact = claim(`${id}:transfer-review`, `${summary} Proposed source transfer is an unconfirmed simulation candidate, not a confirmed backfeed rule. Earth continuity is not established.`, region, PS1, 'provisional', ['PS-WINDINGS', 'R005']);
  const record = evidence.at(-1)!; record.references.push(...extraReferences.map(reference => ({ ...reference, clause: 'C, TF04 / station F4 reference' })));
  const hv = `${id}:hv`; const output = `${id}:${earthing ? 'earth-reference' : 'output'}`;
  put({ id, label, aliases, kind: 'transformer', terminals: [hv, output], conductivePairs: [], sourcePairs: earthing ? [] : [[hv, output]], earthPairs: [], positions: [], ...fact }, zone, x, y);
  layout.terminals[hv] = [x - 35, y]; layout.terminals[output] = [x + 35, y];
  const depicted = claim(`${id}:depicted-branch`, `${summary} The input conductor is drawn from its feeder to this transformer; transfer behaviour remains separate and provisional.`, region, PS1, 'supported', ['PS-WINDINGS']);
  link(`${id}:input-link`, input, hv, depicted, [[x - 35, layout.terminals[input][1]]]);
  for (const terminal of [hv, output]) boundaries.push({ id: `${terminal}:winding-coverage`, label: `${label} winding source/earth relationships unconfirmed`, terminal, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...fact, knowledge: 'unresolved' });
  if (earthing) earths.push({ id: `${id}:drawn-ground`, label: `${label} depicted earth reference`, terminal: output, ...depicted });
  return output;
}

const outgoing = [
  { zone: 'sb01', feeder: 1, x: 700, tx: 'TF-03', ratio: '11/22 kV; 20/27 MVA', endpoint: 'Mine services O/H line', aliases: ['MINE SERVICES O/H LINE'], question: 'R004' },
  { zone: 'sb01', feeder: 3, x: 1300, endpoint: 'Village O/H interface', aliases: ['CLOUDBREAK VILLAGE O/H LINE', '07110-EL-DR-6160'], question: 'R004' },
  { zone: 'sb01', feeder: 4, x: 1600, tx: 'TF-11', ratio: '11/22 kV; 20/27 MVA', endpoint: 'SW411 OPF line No.2', aliases: ['MINE OPF O/H LINE No.2', '07110-EL-DR-2350', '07110-EL-DR-5151'], question: 'R001' },
  { zone: 'sb01', feeder: 5, x: 1900, tx: 'TF-02', ratio: '11 kV/400 V; 1 MVA', endpoint: 'DB-01 LV continuation', aliases: ['DB-01', 'DB01-SL-001'], question: 'PS-LV-COMPLETENESS' },
  { zone: 'sb01', feeder: 6, x: 2200, tx: 'TF-01', ratio: 'EARTHING TX', earthing: true, aliases: ['TF-01'], question: 'PS-WINDINGS' },
  { zone: 'sb02', feeder: 1, x: 1000, tx: 'TF-12', ratio: '11/22 kV; 20/27 MVA', endpoint: 'SW411 OPF line No.1', aliases: ['MINE OPF O/H LINE No.1', '07110-EL-DR-2350', '07110-EL-DR-5151'], question: 'R001' },
  { zone: 'sb02', feeder: 2, x: 1300, tx: 'TF-201', ratio: 'EARTHING TX', earthing: true, aliases: ['TF-201'], question: 'PS-WINDINGS' },
  { zone: 'sb02', feeder: 3, x: 1600, tx: 'TF-202', ratio: '11 kV/400 V; 0.5 MVA', endpoint: 'DB-01B LV continuation', aliases: ['DB-01B'], question: 'PS-LV-COMPLETENESS' },
  { zone: 'sb02', feeder: 4, x: 1900, tx: 'TF-04', ratio: '11/33 kV; 15/20 MVA', aliases: ['TF-04', 'TF04', 'SR-002 PANEL F4 (unconfirmed alias)'], question: 'PS-SB02-SR002' },
  { zone: 'sb02', feeder: 5, x: 2200, endpoint: 'SB02 F5 spare interface', aliases: ['SPARE'], question: 'R004' },
  { zone: 'sb02', feeder: 6, x: 2500, endpoint: 'Alinta interface', aliases: ['TO ALINTA', 'CBSS-ES-SLD-70-80-0001'], question: 'R004' },
] satisfies { zone: 'sb01' | 'sb02'; feeder: number; x: number; tx?: string; ratio?: string; earthing?: boolean; endpoint?: string; aliases: string[]; question: string }[];
let westOutput = '';
for (const branch of outgoing) {
  const label = `SB-${branch.zone === 'sb01' ? '01' : '02'} F${branch.feeder}`;
  const fact = claim(`PS-${branch.zone.toUpperCase()}-F${branch.feeder}`, `${label} depicts a series breaker and outgoing-side earth switch. ${branch.tx ?? ''} ${branch.ratio ?? ''}; ${branch.endpoint ?? 'transformer continuation'}. CT/protection wiring is not another power route.`, `${branch.zone === 'sb01' ? 'B-D' : 'F-G'}, ${label}`, PS1, 'supported', [branch.question, 'R005', 'PS-DEVICE-IDS']);
  const bay = stationBay(branch.zone, `f${branch.feeder}`, label, branch.x, fact);
  let output = bay.line;
  if (branch.tx) output = transformer(`${bay.id}:transformer`, `${branch.tx} (${branch.zone.toUpperCase()} F${branch.feeder})`, [branch.tx, ...branch.aliases], branch.zone, branch.x, bay.busY + 430, bay.line, `${label} depicts ${branch.tx}, ${branch.ratio}.`, `${branch.zone === 'sb01' ? 'C-D' : 'G'}, ${label}`, branch.earthing, branch.zone === 'sb02' && branch.feeder === 4 ? [PL1] : []);
  if (branch.zone === 'sb02' && branch.feeder === 4) westOutput = output;
  if (branch.endpoint) {
    const port = terminalAsset(`${bay.id}:interface`, branch.endpoint, branch.aliases, branch.zone, branch.x, bay.busY + 620, { ...fact, knowledge: 'unresolved' });
    link(`${bay.id}:continuation`, output, port, fact, [[branch.x, layout.terminals[output][1]]]);
  }
}

for (const [key, x, tx] of [['spare-tf04', 2600, true], ['spare-bay', 2900, false]] as const) {
  const fact = claim(`PS-SB01-${key}`, `PS1 between CB-GEN23 and CB-GEN15 depicts a separate ${tx ? 'spare TF-04, 11 kV/0.4 kV, 11 MVA' : 'SPARE switchgear branch'}, with its own series breaker and line-side earth switch. Canonical identities/status remain unconfirmed.`, 'A-B, two branches between CB-GEN23 and CB-GEN15', PS1, 'supported', ['PS-DUPLICATE-TF04', 'PS-LV-COMPLETENESS', 'R005']);
  const bay = stationBay('sb01', key, tx ? 'SB01 spare TF04' : 'SB01 spare bay', x, fact);
  const output = tx ? transformer(`${bay.id}:transformer`, 'TF-04 (SB01 spare)', ['TF-04', 'SPARE'], 'sb01', x, 930, bay.line, 'SB01 spare TF-04 is labelled 11 kV/0.4 kV, 11 MVA; its identity differs from the west-feeder TF-04.', 'A, spare TF-04 above SB01') : bay.line;
  const port = terminalAsset(`${bay.id}:interface`, tx ? 'Spare TF04 LV gap' : 'SB01 spare continuation', ['SPARE'], 'sb01', x, 1120, { ...fact, knowledge: 'unresolved' });
  link(`${bay.id}:continuation`, output, port, fact, [[x, layout.terminals[output][1]]]);
}

const tieFact = claim('PS-TIE', 'PS1 solid-line tie runs SB01 F2 breaker -> fault-current limiting fuse 4/6kA -> independent unnumbered SB02 BUS COUPLER breaker -> SB02. Earth switches branch from each interconnecting-conductor side. Dashed linkage conditions are unconfirmed.', 'C-E, SB01 F2 / limiting fuse / SB02 incoming coupler', PS1, 'supported', ['R003', 'R005', 'PS-DEVICE-IDS']);
const tieA = stationBay('sb01', 'f2', 'SB-01 F2 tie', 1000, tieFact);
const tieB = switching('station:sb02:coupler:cb', 'SB02 coupler CB', ['BUS COUPLER'], 'sb02', 500, 1500, 'breaker', true, tieFact);
link('station:sb02:coupler:bus-link', tieB[1], sb02, tieFact, [[500, 1700]]);
earthSwitch('station:sb02:coupler:es', 'SB02 coupler ES', ['BUS COUPLER'], 'sb02', 585, 1380, tieB[0], tieFact);
const fuse = 'station:tie:limiting-fuse'; const fuseTerminals: [string, string] = [`${fuse}:a`, `${fuse}:b`];
put({ id: fuse, label: 'Tie limiting fuse', aliases: ['FAULT CURRENT LIMITING FUSE', '4/6kA'], kind: 'interface', terminals: fuseTerminals, conductivePairs: [[...fuseTerminals]], positions: [], ...tieFact }, 'sb01', 400, 1150);
layout.terminals[fuseTerminals[0]] = [430, 1150]; layout.terminals[fuseTerminals[1]] = [370, 1150];
link('station:tie:sb01-to-fuse', tieA.line, fuseTerminals[0], tieFact, [[1000, 1150]]);
link('station:tie:fuse-to-sb02', fuseTerminals[1], tieB[0], tieFact, [[500, 1150]]);

// PL1 depicts these series switch locations; location IDs are not claimed installed tags.
const lineSwitches = [
  ['pole-1-recloser', 'Pole 1 recloser', 'amr', 350, 2500, 'breaker', 'C, POLE 1 RECLOSER'],
  ['pole-2-abs', 'Pole 2 ABS', 'amr', 600, 2500, 'disconnector', 'C, air-break switch immediately before POLE 2'],
  ['tie-in-abs', '49-38-1 tie ABS', 'amr', 1900, 2500, 'disconnector', 'D, AMR/IOP TIE-IN POLE 49-38-1'],
  ['pole-201-abs', 'Pole 201 exit ABS', 'iop', 350, 3100, 'disconnector', 'E-F, air-break switch departing POLE 201'],
  ['end-287-abs', 'Before 287 ABS', 'iop', 2700, 3100, 'disconnector', 'F, air-break switch before POLE 287'],
  ['future-4a-fused-abs', 'Pole 4A fused ABS', 'amr', 900, 2300, 'disconnector', 'C, POLE 4A fused air-break FUTURE FEED branch'],
  ['future-214-abs', 'Pole 214 branch ABS', 'iop', 750, 2870, 'disconnector', 'E-F, branch from POLE 214 to 214-1/214-2 FUTURE FEED'],
  ['norfolk-227-abs', 'Pole 227 branch ABS', 'iop', 1150, 3330, 'disconnector', 'F-G, branch from POLE 227 to 227-1/NORFOLK'],
  ['pole-272-abs', 'Pole 272 branch ABS', 'iop', 1550, 2870, 'disconnector', 'E-F, branch from POLE 272 to POLE 272-1'],
  ['hopper-286-fused-abs', 'Hopper10 fused ABS', 'iop', 2350, 3330, 'disconnector', 'F-G, 80A fused air-break switch at POLE 286 toward RMU420'],
] as const;
const linePorts: Record<string, [string, string]> = {};
for (const [key, label, zone, x, y, kind, region] of lineSwitches) {
  const fact = claim(`PL-${key}`, `${label} is depicted by the PL1 legend's ${kind === 'breaker' ? 'recloser' : label.includes('fused') ? 'fused air-break switch' : 'air-break switch'} symbol. Physical tag, full position set and interlock conditions are unconfirmed.`, region, PL1, 'supported', ['PL-IDS-INTERLOCKS', 'R005']);
  linePorts[key] = switching(`line33:${key}`, label, [region], zone, x, y, kind, false, fact);
}
const junctions: Record<string, string> = {};
for (const [pole, zone, x, y] of [['4', 'amr', 900, 2500], ['214', 'iop', 750, 3100], ['227', 'iop', 1150, 3100], ['272', 'iop', 1550, 3100], ['284', 'iop', 1950, 3100], ['286', 'iop', 2350, 3100]] as const) {
  const fact = claim(`PL-JUNCTION-${pole}`, `PL1 depicts a connected branch junction at pole ${pole}; crossing lines elsewhere do not create junctions.`, `${zone === 'amr' ? 'C' : 'E-G'}, POLE ${pole}`, PL1, 'supported', ['R005']);
  junctions[pole] = terminalAsset(`line33:pole-${pole}`, `Pole ${pole} junction`, [`POLE ${pole}`], zone, x, y, fact, false);
}
function lineLink(key: string, from: string, to: string, summary: string, zone: 'amr' | 'iop', bends?: [number, number][]) {
  const fact = claim(`PL-LINK-${key}`, summary, `${zone === 'amr' ? 'C-D, AMR LINE' : 'E-G, IOP LINE'}`, PL1, 'supported', ['R005']);
  link(`line33:${key}`, from, to, fact, bends);
}
const westJoin = claim('PL-STATION-ALIAS', 'Reciprocal references and 11/33kV 15/20MVA duty support a provisional join between PS1 SB-02 F4 TF-04 and PL1 SR-002 PANEL F4 TF04; the SB02/SR-002 alias is unconfirmed.', 'C, station origin SR-002 PANEL F4 / TF04', PL1, 'provisional', ['PS-SB02-SR002', 'PS-DUPLICATE-TF04']);
link('line33:station-to-recloser', westOutput, linePorts['pole-1-recloser'][0], westJoin, [[300, layout.terminals[westOutput][1]], [300, 2500]]);
lineLink('pole-1-to-2', linePorts['pole-1-recloser'][1], linePorts['pole-2-abs'][0], 'Drawn series line from pole-1 recloser to the switch before pole 2.', 'amr');
lineLink('pole-2-to-4', linePorts['pole-2-abs'][1], junctions['4'], 'Drawn route passes pole 3 and an underground segment (note 3) to the pole-4 junction.', 'amr');
lineLink('amr-trunk', junctions['4'], linePorts['tie-in-abs'][0], 'Unbranched AMR route passes poles 8, 9, 36, 37, 49, 50 and 70, including note-3 underground sections, then reaches the 49-38-1 tie-in air-break switch.', 'amr');
lineLink('tie-to-201', linePorts['tie-in-abs'][1], linePorts['pole-201-abs'][0], 'Solid line from the AMR/IOP tie-in through pole 201 to its departing air-break switch; region envelopes are not buses.', 'iop', [[2100, 2500], [2100, 2700], [200, 2700], [200, 3100]]);
lineLink('201-to-214', linePorts['pole-201-abs'][1], junctions['214'], 'Route passes pole 202 and note-3 underground cable to pole 214.', 'iop');
lineLink('214-to-227', junctions['214'], junctions['227'], 'Continuous route through pole 215 and underground segment to pole 227.', 'iop');
lineLink('227-to-272', junctions['227'], junctions['272'], 'Continuous trunk from pole 227 to pole 272.', 'iop');
lineLink('272-to-284', junctions['272'], junctions['284'], 'Continuous trunk from pole 272 to pole 284.', 'iop');
lineLink('284-to-286', junctions['284'], junctions['286'], 'Continuous trunk from pole 284 to pole 286.', 'iop');
lineLink('286-to-end-switch', junctions['286'], linePorts['end-287-abs'][0], 'Trunk reaches an air-break switch before pole 287.', 'iop');

const endpointSpecs = [
  ['future-4a', 'Future feed (4A)', ['FUTURE FEED', 'POLE 4A'], 'amr', 900, 2110],
  ['future-214', 'Future feed (214-2)', ['FUTURE FEED', 'POLE 214-1', 'POLE 214-2'], 'iop', 750, 2700],
  ['norfolk', 'Norfolk 227-2 interface', ['TO POLE 227-2 NORFOLK LINE', 'CB22OP050B-10018-DR-EL-0032'], 'iop', 1150, 3550],
  ['pole-272-1', 'Pole 272-1 endpoint', ['POLE 272-1'], 'iop', 1550, 2700],
  ['bigge-sp1', 'Bigge SP1 interface', ['TO POLE 284B-1 BIGGE SP1 LINE', 'CB22OP050B-10018-DR-EL-0032'], 'iop', 1950, 2700],
  ['bigge-sp1-sp2', 'Bigge SP1/SP2 interface', ['TO POLE 284A-1 BIGGE SP1 AND SP2 LINE', 'CB22OP050B-10018-DR-EL-0032'], 'iop', 1950, 3550],
  ['hopper-10', 'Hopper10 RMU420 interface', ['SUPPLY TO RMU420 (HOPPER 10)', '520CBC0007-2130-DR-EL-0003', '3C 70 sqmm Cu XLPE'], 'iop', 2350, 3550],
  ['end-287', 'Pole 287 end of line', ['POLE 287', 'END OF LINE'], 'iop', 2950, 3100],
] as const;
const endpointPorts: Record<string, string> = {};
for (const [key, label, aliases, zone, x, y] of endpointSpecs) {
  const fact = claim(`PL-END-${key}`, `${label} is the depicted terminus. ${aliases.join('; ')}. No enabled external source or final LV bus is established.`, `${zone === 'amr' ? 'C' : 'E-G'}, ${label}`, PL1, 'supported', ['R004', 'PL-FUTURE-EXTERNAL']);
  endpointPorts[key] = terminalAsset(`line33:${key}:interface`, label, [...aliases], zone, x, y, { ...fact, knowledge: key === 'end-287' ? 'supported' : 'unresolved' }, key !== 'end-287');
}
for (const [junction, switchKey, endpointKey] of [['4', 'future-4a-fused-abs', 'future-4a'], ['214', 'future-214-abs', 'future-214'], ['227', 'norfolk-227-abs', 'norfolk'], ['272', 'pole-272-abs', 'pole-272-1'], ['286', 'hopper-286-fused-abs', 'hopper-10']] as const) {
  const zone = junction === '4' ? 'amr' : 'iop';
  lineLink(`${switchKey}-input`, junctions[junction], linePorts[switchKey][0], `Explicit branch from pole ${junction} to ${switchKey}; it is not an inferred crossing.`, zone);
  lineLink(`${switchKey}-output`, linePorts[switchKey][1], endpointPorts[endpointKey], `Depicted continuation from ${switchKey} to ${endpointKey}; external completeness remains unconfirmed.`, zone);
}
lineLink('284-bigge-sp1', junctions['284'], endpointPorts['bigge-sp1'], 'Pole-284 junction directly branches to the upper Bigge SP1 arrow; no series switch is drawn.', 'iop');
lineLink('284-bigge-sp1-sp2', junctions['284'], endpointPorts['bigge-sp1-sp2'], 'The same pole-284 junction directly branches to the lower Bigge SP1/SP2 arrow.', 'iop');
lineLink('end-switch-to-287', linePorts['end-287-abs'][1], endpointPorts['end-287'], 'Switch output continues through pole 287 to END OF LINE.', 'iop');

const reviewQuestions = [
  ['R001', 'Confirm generator availability, station-to-SW411 mapping, TF-11/line No.2 and TF-12/line No.1 remote incomers.'],
  ['R003', 'Confirm station dashed-linkage meanings, tie earth-switch associations and complete physical interlock conditions. No permission follows from absent written conditions.'],
  ['R004', 'Resolve mine/village/Alinta/Norfolk/Bigge/Hopper10 continuation coverage and exact referenced drawings.'],
  ['R005', 'Owner acceptance of actual starting device positions and source availability remains pending; every baseline is null.'],
  ['PS-DEVICE-IDS', 'Confirm role-specific generator/breaker/earth-switch IDs, unnumbered coupler and other unnamed device identities. Construction IDs are not printed tags.'],
  ['PS-DUPLICATE-TF04', 'Resolve duplicate TF-04: SB01 11kV/0.4kV spare versus SB02 F4 11/33kV west-feeder transformer.'],
  ['PS-SB02-SR002', 'Confirm the provisional PS1 SB-02 F4 / PL1 SR-002 PANEL F4 interface alias.'],
  ['PS-WINDINGS', 'Confirm transformer source transfer/backfeed and earth continuity, especially TF-01/TF-201 earthing transformers and grounded TF04. Candidate source pairs are provisional; no universal galvanic earth pair is represented.'],
  ['PS-LV-COMPLETENESS', 'Obtain or confirm final LV buses/incoming arrangements for DB-01, DB-01B and spare TF04. Interfaces do not assert completed LV buses.'],
  ['PL-IDS-INTERLOCKS', 'Confirm physical line switch IDs, supported positions and interlocks; PL1 notes/legend do not give switching permission.'],
  ['PL-FUTURE-EXTERNAL', 'Confirm future-feed commissioning, pole-272-1 destination and missing Norfolk/Bigge coverage. No external source is enabled by an arrow.'],
] as const;
const reviews: NonNullable<NetworkModel['reviews']> = reviewQuestions.map(([id, question]) => ({ id, question, status: 'open', evidenceIds: evidence.filter(record => assets.some(asset => asset.reviewIds?.includes(id) && asset.evidenceIds?.includes(record.id)) || connections.some(connection => connection.reviewIds?.includes(id) && connection.evidenceIds?.includes(record.id))).map(record => record.id) }));

const stationAssetIds = (zone: 'sb01' | 'sb02') => assets.filter(asset => zones.get(asset.id) === zone && !asset.id.startsWith('station:gen-')).map(asset => asset.id);
const views: DiagramView[] = [
  { id: 'overview', label: 'Station + line overview', assetIds: assets.map(asset => asset.id), layout, bounds: [-100, -30, 4100, 3800] },
  { id: 'sb01', label: 'SB01 feeders and tie', assetIds: stationAssetIds('sb01'), layout, bounds: [200, 400, 3000, 950] },
  { id: 'sb02', label: 'SB02 feeders and tie', assetIds: stationAssetIds('sb02'), layout, bounds: [300, 1300, 2450, 1200] },
  { id: 'amr', label: 'AMR 33 kV line', assetIds: assets.filter(asset => zones.get(asset.id) === 'amr').map(asset => asset.id), layout, bounds: [200, 1950, 2100, 800] },
  { id: 'iop', label: 'IOP 33 kV line', assetIds: assets.filter(asset => zones.get(asset.id) === 'iop').map(asset => asset.id), layout, bounds: [100, 2600, 3100, 1200] },
];
// These ports organise the same cited connection across views; they add no path.
function detailBoundary(viewId: string, connectionId: string, remoteAssetId: string, targetViewId: string, position: [number, number], bends: [number, number][]) {
  const view = views.find(view => view.id === viewId)!;
  if (view.layout === layout) view.layout = { ...layout, terminals: { ...layout.terminals }, bends: { ...layout.bends } };
  const connection = connections.find(connection => connection.id === connectionId)!;
  const remote = assets.find(asset => asset.id === remoteAssetId)!;
  const terminal = [connection.from, connection.to].find(terminal => remote.terminals.includes(terminal))!;
  view.layout.terminals[terminal] = position;
  view.layout.bends![connectionId] = bends;
  (view.boundaries ??= []).push({ connectionId, remoteAssetId, targetViewId, position });
}
detailBoundary('sb01', 'station:tie:fuse-to-sb02', 'station:sb02:coupler:cb', 'sb02', [400, 1250], [[400, 1150]]);
detailBoundary('sb02', 'station:tie:fuse-to-sb02', fuse, 'sb01', [400, 1350], [[400, 1450], [500, 1450]]);
detailBoundary('sb02', 'line33:station-to-recloser', 'line33:pole-1-recloser', 'amr', [1900, 2420], [[1900, 2370]]);
detailBoundary('amr', 'line33:station-to-recloser', 'station:sb02:f4:transformer', 'sb02', [350, 2050], [[350, 2400], [320, 2400]]);
detailBoundary('amr', 'line33:tie-to-201', 'line33:pole-201-abs', 'iop', [2100, 2650], [[2100, 2500]]);
detailBoundary('iop', 'line33:tie-to-201', 'line33:tie-in-abs', 'amr', [350, 2650], [[350, 2900], [200, 2900], [200, 3100]]);
for (const zone of ['sb01', 'sb02'] as const) {
  const groups = [...generatorIds.entries()].filter(([, ids]) => zones.get(ids[0]) === zone);
  for (let start = 0; start < groups.length; start += 4) {
    const group = groups.slice(start, start + 4); const busId = `station:${zone}:bus`; const busPort = `${busId}:bar`;
    const branchLayout: DiagramLayout = { assets: { ...layout.assets, [busId]: [550, 500] }, terminals: { ...layout.terminals, [busPort]: [550, 500] }, bends: { ...layout.bends }, rotations: { ...layout.rotations }, labelOffsets: { ...layout.labelOffsets } };
    group.forEach(([key, ids], index) => {
      const x = 130 + index * 260; const [source, cb, es] = ids;
      branchLayout.assets[source] = [x, 80]; branchLayout.assets[cb] = [x, 300]; branchLayout.assets[es] = [x + 85, 190];
      branchLayout.labelOffsets![es] = [95, 0];
      branchLayout.terminals[`${source}:out`] = [x, 110]; branchLayout.terminals[`${cb}:in`] = [x, 270]; branchLayout.terminals[`${cb}:out`] = [x, 330]; branchLayout.terminals[`${es}:in`] = [x + 55, 190]; branchLayout.terminals[`${es}:out`] = [x + 115, 190];
      branchLayout.bends![`${key}:bus-link`] = [[x, 500]]; branchLayout.bends![`${es}:branch`] = [[x, 190]];
    });
    views.push({ id: `${zone}-generators-${start / 4 + 1}`, label: `${zone.toUpperCase()} generators ${group.map(([key]) => key.split('-').at(-1)).join('/')}`, assetIds: [busId, ...group.flatMap(([, ids]) => ids)], layout: branchLayout, bounds: [20, 10, 1160, 610] });
  }
}

export const powerStationModel: NetworkModel = {
  id: 'site-power-station-line', version: 'construction-2026-10-22.2', name: 'Station and 33 kV line — provisional', synthetic: false,
  assets, connections, sources, earths, boundaries, evidence, reviews,
  starting: { devices, sources: availability },
  interlocks: { reviews: assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'unresolved', note: asset.id.startsWith('line33:') ? 'Unconfirmed line interlock/position conditions. PL1 legend and notes 1-5 do not establish switching permission.' : 'Unconfirmed physical interlock conditions. PS1 dashed device/tie associations have no complete written key or operating condition.', evidence: [{ ...(asset.id.startsWith('line33:') ? PL1 : PS1), clause: asset.id.startsWith('line33:') ? 'Legend and general notes 1-5, right of page' : 'A-G, dashed device linkages; C-E, tie earth-switch association' }] })), rules: [] },
  presentation: { overviewId: 'overview', views },
};
