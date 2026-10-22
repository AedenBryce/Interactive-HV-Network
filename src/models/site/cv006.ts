import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction IDs and terminal roles are not printed terminal tags.
// Supported means depicted; installation, starting states and interlocks remain unconfirmed.
const documents = {
  distribution: { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  head: { document: 'CB19OP001B-04057-DR-EL-0002.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  mc406: { document: 'CB19OP001B-04057-DR-EL-0003.pdf', revision: '2 (17.12.20; AS BUILT)', page: 1 },
  tail: { document: 'CB19OP001B-04057-DR-EL-0004.pdf', revision: '6 (28.01.25; AS FOUND 23.10.21; older AS BUILT stamp 11/01/2022)', page: 1 },
  mc410: { document: 'CB19OP001B-04057-DR-EL-0005.pdf', revision: '2A redline / underlying 2 (11.01.22 / underlying 27.08.21; UPDATED TIER NUMBER AND MCCB SIZE; AS BUILT changes-as-marked)', page: 1 },
  line33: { document: 'CB21OP055B-10016-DR-EL-0089.pdf', revision: '0 (10.06.22; ISSUED FOR CONSTRUCTION)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp 27/10/2025)', page: 1 },
  overview2: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27.10.25; ISSUED FOR USE; AS BUILT stamp 27/10/2025)', page: 1 },
  sw411: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  hoppers: { document: 'CB17OP023C-01006-DR-EL-0001.pdf', revision: '6 (28/01/25; AS FOUND 23.10.23)', page: 1 },
};
type Point = [number, number];
type Group = 'overhead' | 'rm406-hv' | 'rm410-hv' | 'head-lv' | 'tail-lv';
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const reviews: NonNullable<NetworkModel['reviews']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const groups: Record<Group, string[]> = { overhead: [], 'rm406-hv': [], 'rm410-hv': [], 'head-lv': [], 'tail-lv': [] };
function fact(id: string, summary: string, locations: [keyof typeof documents, string][], reviewIds: string[], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({ id, status: knowledge, summary, references: locations.map(([document, region]) => ({ ...documents[document], clause: `Drawing region: ${region}` })) });
  return { knowledge, evidenceIds: [id], reviewIds: [...new Set(['CV-R10', ...reviewIds])] };
}
function add(asset: Asset, point: Point, terminalPoints: Point[], views: Group[]) {
  assets.push(asset); layout.assets[asset.id] = point;
  asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminalPoints[index]; });
  views.forEach(view => groups[view].push(asset.id));
}
function link(id: string, from: string, to: string, claim: Claim, bends?: Point[]) {
  connections.push({ id, from, to, ...claim });
  if (bends) layout.bends![id] = bends;
}
function unknown(id: string, terminal: string, label: string, claim: Claim) {
  boundaries.push({ id, terminal, label, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
}
function port(id: string, label: string, aliases: string[], point: Point, claim: Claim, views: Group[], uncertain = false) {
  const terminal = `${id}:port`;
  add({ id, label, aliases, kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim }, point, [point], views);
  if (uncertain) unknown(`${id}:coverage`, terminal, `${label.replaceAll('\n', ' ')}: external source/earth coverage unconfirmed`, claim);
  return terminal;
}
function control(id: string, label: string, kind: 'breaker' | 'disconnector', point: Point, claim: Claim, views: Group[], aliases: string[] = []) {
  const terminals: [string, string] = [`${id}:a`, `${id}:b`];
  add({ id, label, aliases, kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim, reviewIds: [...new Set([...(claim.reviewIds ?? []), 'CV-R09'])] }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30]], views);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  return terminals;
}

const supply = fact('CV-SW411-INTERFACE', 'SW411 tier3 OHL WEST/CB SPARE/ES SPARE explicitly references CV006 power distribution. Overview instead uses CB OHL FD/ES OHL FD. Canonical tags and availability remain unconfirmed; main-switchroom devices are not duplicated.', [['sw411', 'D-G / 4-5, tier3 and CV006 arrow'], ['overview', 'B-C / 2-7, O/H LINE WEST'], ['distribution', 'A / 10-11, FED FROM SR411 TIER03']], ['CV-R01', 'CV-R02', 'CV-R11']);
const sourcePort = port('cv006:interface:sw411', 'SW411 tier 3 interface\nTags / source unconfirmed', ['SW411 tier 3', 'SR411 TIER 03', 'CB SPARE', 'ES SPARE', 'CB OHL FD', 'ES OHL FD', 'OHL WEST'], [100, 120], supply, ['overhead'], true);
const ohl = fact('CV-OHL-22', 'The distribution depicts a 22kV OHL from pole17/pole49 via ABS49-1, pole49-38/49-39, recloser49-39A and ABS49-40. Pole57 fused-ABS branch supplies the head RM406; the tail supplies RM410. Pole ranges are route aliases, not extra sources.', [['distribution', 'A / 1-10, overhead main route and pole57 branch']], ['CV-R01', 'CV-R03', 'CV-R09', 'CV-R11']);
const poles: Record<string, string> = {};
for (const [name, x, y, aliases] of [
  ['17', 370, 120, ['Pole17', 'Poles48 to16 route label']], ['49', 730, 120, ['Pole49', 'Poles48 to56 branch label']],
  ['49-38', 1430, 120, ['Pole49-38', 'Pole49-37 to49-2 range']], ['49-39', 1720, 120, ['Pole49-39']],
  ['201', 1430, 480, ['Pole201', 'Poles202 to285 route range', 'CV010 tail line label']], ['286', 1820, 480, ['Pole286']], ['287', 1820, 780, ['Pole287']],
] as [string, number, number, string[]][]) poles[name] = port(`cv006:pole:${name}`, `Pole ${name}`, aliases, [x, y], ohl, ['overhead']);
link('cv006:sw411-pole17', sourcePort, poles['17'], supply); link('cv006:pole17-pole49', poles['17'], poles['49'], ohl);
const abs491 = control('cv006:abs:49-1', 'ABS\nPole 49-1', 'disconnector', [1090, 120], ohl, ['overhead'], ['ABS pole49-1']);
link('cv006:pole49-abs49-1', poles['49'], abs491[0], ohl); link('cv006:abs49-1-pole49-38', abs491[1], poles['49-38'], ohl); link('cv006:pole49-38-pole49-39', poles['49-38'], poles['49-39'], ohl);
const recloser = control('cv006:recloser:49-39a', 'Recloser\nPole 49-39A', 'breaker', [2050, 120], ohl, ['overhead'], ['RECLOSER pole49-39A']);
link('cv006:pole49-39-recloser', poles['49-39'], recloser[0], ohl);
const abs4940 = control('cv006:abs:49-40', 'ABS\nPole 49-40', 'disconnector', [2380, 120], ohl, ['overhead'], ['ABS pole49-40']);
link('cv006:recloser-abs49-40', recloser[1], abs4940[0], ohl);
const abs57 = control('cv006:fused-abs:57', 'Fused ABS\nPole 57', 'disconnector', [730, 480], ohl, ['overhead'], ['ABS FUSE pole57']);
link('cv006:pole49-fused-abs57', poles['49'], abs57[0], ohl);
const abs49381 = control('cv006:abs:49-38-1', 'ABS\nPole 49-38-1', 'disconnector', [1430, 300], ohl, ['overhead'], ['ABS pole49-38-1']);
link('cv006:pole49-38-abs-branch', poles['49-38'], abs49381[0], ohl); link('cv006:abs-branch-pole201', abs49381[1], poles['201'], ohl); link('cv006:pole201-pole286', poles['201'], poles['286'], ohl); link('cv006:pole286-to-287', poles['286'], poles['287'], ohl);
const abs286 = control('cv006:fused-abs:286', 'Fused ABS\nPole 286 branch', 'disconnector', [2140, 480], ohl, ['overhead'], ['FUSE ABS pole286']);
link('cv006:pole286-fused-branch', poles['286'], abs286[0], ohl);
const hopper10 = port('cv006:interface:hopper10', 'Hopper 10 interface\n22/33 kV alias unresolved', ['Hopper 10', 'RMU420', '520CBC0007-2130-DR-EL-0003', '22kV POWERLINE TO TAIL OF CV010'], [2480, 480], fact('CV-HOPPER10-INTERFACE', 'The 22kV distribution and separate 33kV sheet reference Hopper10/RMU420 at fused pole286 branch. These remain competing source records, not a confirmed 22/33kV join.', [['distribution', 'A / 1-5, fused branch and CV010 label'], ['line33', 'D-G / 7-11, IOP line and RMU420 branch'], ['overview2', 'C-D / 1-2, Hopper10/RM420 and explicit33kV reference']], ['CV-R01', 'CV-R11']), ['overhead'], true);
link('cv006:fused-abs286-hopper10', abs286[1], hopper10, ohl);
const drop = port('cv006:interface:drop-tower-workshop', 'Drop Tower LV Workshop\nHV continuation/detail unconfirmed', ['DROP TOWER LV WORKSHOP', 'Pole17-1'], [370, 500], fact('CV-DROP-TOWER', 'A branch from pole17 via pole17-1 is labelled Drop Tower LV Workshop; no transformer or final bus detail is established.', [['distribution', 'A-B / 8-10, pole17-1 branch']], ['CV-R11']), ['overhead'], true);
link('cv006:pole17-drop-tower', poles['17'], drop, ohl);
const conflict = fact('CV-22-33-COMPARISON', 'Unconfirmed: the 22kV SW411-fed and 33kV TF04/AMR-fed sources share pole49-38-1/201/286/287 and Hopper10 references. No approved joining or voltage-changing arrangement is established. This comparison has separate unconnected ports; station TF04, reclosers and external Norfolk/Bigge/future-feed equipment are not duplicated.', [['distribution', 'A / 1-5,22kV branch and shared poles'], ['line33', 'C-G / 1-11, station TF04/AMR and IOP tie-in'], ['overview', 'OHL route'], ['overview2', 'Hopper10 explicit33kV reference']], ['CV-R01', 'CV-R11'], 'unresolved');
const comparePorts: [string, string] = ['cv006:interface:line-comparison:22kv', 'cv006:interface:line-comparison:33kv'];
add({ id: 'cv006:interface:line-comparison', label: '22 / 33 kV comparison\nNo accepted connection', aliases: ['TF04 station11/33kV reference', 'AMR/IOP TIE-IN POLE49-38-1', 'Pole201/286/287', 'Norfolk227-2 / Bigge284B-1 /284A-1 external coverage', 'Future feeds4A /214-2 unconfirmed'], kind: 'interface', terminals: comparePorts, conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], ...conflict }, [1430, 830], [[1380, 800], [1480, 800]], ['overhead']);
link('cv006:22kv-comparison-port', poles['201'], comparePorts[0], conflict);
for (const terminal of comparePorts) unknown(`${terminal}:coverage`, terminal, 'Disputed 22/33kV source/earth identity and external line coverage', conflict);

function earthContactSwitch(id: string, label: string, point: Point, claim: Claim, view: Group, aliases: string[]) {
  const terminals: [string, string, string] = [`${id}:line`, `${id}:cable`, `${id}:earth`];
  const interpretation = fact(`${id}:contact-interpretation`, `Inference: the drawn ${label} contact/earth symbol is represented provisionally as service(line-cable), isolated(no pair), earthed(cable-earth). The complete installed position set, operating sequence and earth-contact arrangement require confirmation. Candidate positions are not operating permissions.`, [[view === 'rm406-hv' ? 'head' : 'tail', 'B-D / 3-11, corresponding RMU switch and earth-contact symbol']], ['CV-R09'], 'provisional');
  add({ id, label, aliases, kind: 'disconnector', terminals, conductivePairs: [], positions: [{ id: 'service', label: 'Service · candidate', pairs: [[terminals[0], terminals[1]]] }, { id: 'isolated', label: 'Isolated · candidate', pairs: [] }, { id: 'earthed', label: 'Earthed · candidate', pairs: [[terminals[1], terminals[2]]] }], ...interpretation, evidenceIds: [...(claim.evidenceIds ?? []), ...(interpretation.evidenceIds ?? [])], reviewIds: [...new Set([...(claim.reviewIds ?? []), 'CV-R09'])] }, point, [[point[0], point[1] - 30], [point[0], point[1] + 30], [point[0] - 70, point[1]]], [view]);
  devices[id] = null; layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -55];
  earths.push({ id: `${id}:earth-termination`, label: `${label} depicted earth contact`, terminal: terminals[2], ...interpretation });
  unknown(`${id}:position-coverage`, terminals[1], `${label} complete physical position/earth coverage unconfirmed`, interpretation);
  return terminals;
}
const rmuDefinitions = [
  { board: 'rm406', name: 'RM406', source: 'head', group: 'rm406-hv', x: 730, branchXs: [450, 900, 1330], incoming: abs57[1], cable: 'RM418-RM406-P1', sourceAlias: 'Supply via pole57', incomingId: 'rm406:incoming-pole57' },
  { board: 'rm410', name: 'RM410', source: 'tail', group: 'rm410-hv', x: 2380, branchXs: [2050, 2500, 2930], incoming: abs4940[1], cable: 'POLE-RM410-P1', sourceAlias: 'Supply via pole49-40', incomingId: 'rm410:incoming-pole49-40' },
] satisfies { board: string; name: string; source: 'head' | 'tail'; group: Group; x: number; branchXs: number[]; incoming: string; cable: string; sourceAlias: string; incomingId: string }[];
const outgoingPorts: Record<string, string> = {};
for (const rmu of rmuDefinitions) {
  const claim = fact(`CV-${rmu.name}-ASSEMBLY`, `${rmu.name} has one 22kV main bar, incoming SW01 and distinct outgoing CB01-A02/SW02, CB02-A03/SW03, CB03-A04/SW04 assemblies. Motor operators/protection/control wiring are not added main-power paths.`, [[rmu.source, 'A-D / 3-11, incoming and three outgoing RMU bays'], ['distribution', rmu.board === 'rm406' ? 'B-C / 9-11, head RMU' : 'B-C / 1-3, tail RMU']], ['CV-R09', ...(rmu.board === 'rm406' ? ['CV-R03', 'CV-R04'] : ['CV-R08'])]);
  const busId = `${rmu.board}:bus`; const busPort = `${busId}:bar`;
  add({ id: busId, label: `${rmu.name}\n22 kV main bar`, aliases: [rmu.name, rmu.board === 'rm406' ? 'CV006 HEAD END RMU / SR406' : 'CV006 TAIL END RMU / SR410 / CV010 switchroom alias'], kind: 'bus', terminals: [busPort], conductivePairs: [], positions: [], ...claim }, [rmu.x, 1160], [[rmu.x, 1160]], [rmu.group]);
  layout.rotations![busId] = 90; layout.labelOffsets![busId] = [0, -40];
  const incoming = earthContactSwitch(`${rmu.board}:sw01`, `${rmu.name}-SW01\nIncoming`, [rmu.x, 1000], claim, rmu.group, [`${rmu.name}-SW01${rmu.board === 'rm410' ? '-A01' : ''}`, rmu.sourceAlias, ...(rmu.board === 'rm406' ? ['RM418-RM406-P1 (retained cable tag; not another live feed)', 'HOPPER007 PREVIOUSLY CONNECTED TO RM418-SW01'] : [rmu.cable])]);
  const incomingClaim = rmu.board === 'rm406' ? fact('CV-RM406-INCOMING', 'Detailed current supply reference says pole57 but retains cable RM418-RM406-P1. Note 1 says HOPPER007 PREVIOUSLY CONNECTED TO RM418-SW01. This record does not create another live RM418 feed; historical/current cable identity remains unconfirmed.', [['head', 'A-B / 4-5, incoming cable and supply note; F / 11-12, note 1'], ['distribution', 'A-B / 8-10, pole57 branch']], ['CV-R03']) : claim;
  link(rmu.incomingId, rmu.incoming, incoming[0], incomingClaim); link(`${rmu.board}:incoming-bar`, incoming[1], busPort, claim);
  for (let index = 0; index < 3; index++) {
    const cbSuffix = `cb0${index + 1}`; const swSuffix = `sw0${index + 2}`; const x = rmu.branchXs[index];
    const cb = control(`${rmu.board}:${cbSuffix}`, `${rmu.name}-CB0${index + 1}\nA0${index + 2}`, 'breaker', [x, 1370], claim, [rmu.group], [`${rmu.name}-CB0${index + 1}`, `${rmu.name}-CB0${index + 1}-A0${index + 2}`, '630A']);
    link(`${rmu.board}:${cbSuffix}:bar`, busPort, cb[0], claim, [[x, 1160]]);
    const sw = earthContactSwitch(`${rmu.board}:${swSuffix}`, `${rmu.name}-SW0${index + 2}`, [x, 1530], claim, rmu.group, [`${rmu.name}-SW0${index + 2}`, `Associated CB0${index + 1}-A0${index + 2}`]);
    link(`${rmu.board}:${cbSuffix}-${swSuffix}`, cb[1], sw[0], claim); outgoingPorts[`${rmu.board}:${swSuffix}`] = sw[1];
  }
}
const hopper8Claim = fact('CV-HOPPER8-INTERFACE', 'RM406-CB03/SW04 supplies Hopper8 SS416-HV416; the supplied hopper sheet shows onward HV TF416/TF416A transformation. This interface stays HV, not an LV endpoint. The neighbouring package owns those physical devices.', [['head', 'C-E / 10-11, CB03/Hopper008 outgoing reference'], ['distribution', 'C-D / 11, Hopper8 arrow'], ['hoppers', 'C-E / 9-10, RM406-CB03 → SS416-HV416']], ['CV-R08', 'CV-R11']);
const hopper8 = port('rm406:interface:hopper8', 'Hopper 8 HV interface\nSS416-HV416', ['Hopper 8', 'HOPPER008', 'SS416-HV416', 'TF416 / TF416A continuation owned by hopper area'], [1330, 1830], hopper8Claim, ['rm406-hv'], true);
link('rm406:sw04-hopper8', outgoingPorts['rm406:sw04'], hopper8, hopper8Claim);
const downstream = fact('CV-RM419-RM418-INTERFACES', 'RM410-CB03/SW04 supplies RM419-SW01; remote RM419-SW02 supplies RM418-SW01. The RM419 through-route is a provisional coverage placeholder for unexpanded remote switching, not a duplicated physical assembly or confirmed conducting bypass. RM419/RM418/SS416 equipment remains in the hopper-area package.', [['tail', 'C-E / 10-12, outgoing RM419-SW01 reference'], ['distribution', 'B-E, RM410→RM419→RM418'], ['hoppers', 'A-B / 6-7, RM418 incoming from SR419-RM419 / RM419-SW02']], ['CV-R08'], 'provisional');
const rm419Ports: [string, string] = ['rm410:interface:rm419:incoming', 'rm410:interface:rm419:through'];
add({ id: 'rm410:interface:rm419', label: 'RM419 HV interface\nRemote states unconfirmed', aliases: ['RM419-SW01', 'RM419-SW02', 'Hopper9 / SR419'], kind: 'interface', terminals: rm419Ports, conductivePairs: [], sourcePairs: [[...rm419Ports]], earthPairs: [[...rm419Ports]], positions: [], ...downstream }, [2930, 1830], [[2885, 1800], [2975, 1860]], ['rm410-hv']);
link('rm410:sw04-rm419', outgoingPorts['rm410:sw04'], rm419Ports[0], downstream);
const rm418 = port('rm410:interface:rm418', 'RM418 / Hopper 7 HV interface\nVia remote RM419-SW02', ['RM418-SW01', 'RM419-SW02', 'SR419-RM419', 'Hopper7'], [3180, 2040], downstream, ['rm410-hv'], true);
link('rm410:rm419-through-rm418', rm419Ports[1], rm418, downstream);
for (const terminal of rm419Ports) unknown(`${terminal}:coverage`, terminal, 'Unexpanded remote RM419 source/earth states and onward coverage', downstream);

const lvLayouts: { transformerId: string; group: 'head-lv' | 'tail-lv'; order: number; controls: string[]; endpoints: string[]; interfaceId?: string }[] = [];
for (const [board, tfA, tfB, drive, source, group, ax, bx] of [
  ['rm406', 'TF406A', 'TF406B', 'VS4061', 'head', 'head-lv', 450, 900],
  ['rm410', 'TF410A', 'TF410B', 'VS4101', 'tail', 'tail-lv', 2050, 2500],
] as const) {
  const hvGroup: Group = board === 'rm406' ? 'rm406-hv' : 'rm410-hv';
  for (const [tf, x, dual] of [[tfA, ax, true], [tfB, bx, false]] as const) {
    const prefix = `${board}:${tf.toLowerCase()}`; const transformerId = `${prefix}:transformer`;
    const terminals = [`${prefix}:hv`, ...(dual ? [`${prefix}:lv-a`, `${prefix}:lv-b`] : [`${prefix}:lv`])];
    const transfer = fact(`CV-${tf}-TRANSFER`, `Inference: provisional bidirectional source pairs link ${tf}'s depicted HV and ${dual ? 'two distinct 720V LV outputs' : 'LV output'}. Complete backfeed and independent earth relationships are unconfirmed; empty earthPairs retains explicit unknown winding coverage. No neutral/MEN/screen-earth symbol creates a phase-earth connection.`, [[source, `C-F, ${tf} winding/output region`], ['distribution', board === 'rm406' ? 'C-F / 9-11, TF406A/B' : 'C-G / 1-5, TF410A/B']], [dual ? 'CV-R07' : board === 'rm406' ? 'CV-R04' : 'CV-R06', ...(board === 'rm406' && !dual ? ['CV-R05'] : [])], 'provisional');
    add({ id: transformerId, label: `${tf}\n${dual ? '22 kV / 720 V / 720 V · 5 MVA' : board === 'rm406' ? '22 kV / 433 or 415 V · 500 kVA' : '22 kV / 433 V · 500 kVA'}\nTransfer unconfirmed`, aliases: [tf, ...(dual ? [board === 'rm410' ? '12 PULSE/NO REGEN (AFE) · source wording, not executable rule' : 'Distinct 720V LV windings'] : board === 'rm406' ? ['RM406 CB02/SW03 in RMU sheets', 'RM406-SW02 in MC406A sheet', '433V /415V unresolved'] : ['22/0.433kV', '22kV/433V'])], kind: 'transformer', terminals, conductivePairs: [], sourcePairs: terminals.slice(1).map(output => [terminals[0], output]), earthPairs: [], positions: [], ...transfer }, [x, 1760], [[x, 1730], ...(dual ? [[x - 45, 1790], [x + 45, 1790]] as Point[] : [[x, 1790]] as Point[])], [hvGroup, group]);
    layout.rotations![transformerId] = 90; layout.labelOffsets![transformerId] = [0, -55];
    const feeder = fact(`CV-${tf}-FEEDER`, board === 'rm406' && !dual ? 'Provisional construction follows TF406B-P1 on RM406 CB02/SW03 in RMU/distribution sheets. MC406A sheet instead names RM406-SW02. Neither source is accepted as governing; this candidate is flagged rather than adding both as parallel feeds.' : `${tf}-P1 follows the separate CB0${dual ? '1' : '2'}/SW0${dual ? '2' : '3'} assembly to ${tf}.`, [[source, `C-E, ${tf} power cable`], ...(board === 'rm406' && !dual ? [['mc406', 'A-B / 5-6, FROM RM406-SW02'] as [keyof typeof documents, string]] : [])], board === 'rm406' && !dual ? ['CV-R04', 'CV-R05'] : ['CV-R07'], board === 'rm406' && !dual ? 'provisional' : 'supported');
    link(`${prefix}:cable-${tf}-P1`, outgoingPorts[`${board}:${dual ? 'sw02' : 'sw03'}`], terminals[0], feeder);
    for (const terminal of terminals) unknown(`${terminal}:coverage`, terminal, `${tf} winding transfer/backfeed/earth policy unconfirmed`, transfer);
    const entry = { transformerId, group, order: dual ? 0 : 1, controls: [] as string[], endpoints: [] as string[], interfaceId: undefined as string | undefined };
    if (dual) {
      const driveClaim = fact(`CV-${drive}-AC-BOUNDARIES`, `Inference: two separate AC supply boundaries ahead of ${drive}'s converter inputs are provisional LV endpoints. Distribution shows independent 2500A input switches and rectifiers; no common AC bar is drawn between windings. Converter/DC/inverter/motor expansion is not defined by this bus-boundary candidate and requires owner scope confirmation; no generic transfer through the DC bus is represented.`, [['distribution', board === 'rm406' ? 'D-F / 9-11, VS4061 two input switches/rectifiers and DC bus' : 'D-F / 1-3, VS4101 two input switches/rectifiers and DC bus'], [source, 'E-F, two winding outputs and VSD reference']], ['CV-R07', 'CV-R11'], 'provisional');
      for (const [index, suffix] of ['a', 'b'].entries()) {
        const px = x + (index === 0 ? -100 : 100); const id = `${board}:${drive.toLowerCase()}:input-${suffix}`;
        const input = control(`${id}:switch`, `${drive}\nInput ${suffix.toUpperCase()} · 2500 A`, 'disconnector', [px, 2040], driveClaim, [group], ['2500A input switch', `${drive} separate AC input ${suffix.toUpperCase()}`]);
        link(`${id}:winding-cable`, terminals[index + 1], input[0], driveClaim, [[px, 1860]]);
        const boundaryId = `${id}:boundary`;
        const boundary = port(boundaryId, `${drive} input ${suffix.toUpperCase()}\n720 V AC boundary candidate\nEndpoint scope unconfirmed`, [drive, `CV006-${drive}`, 'Separate AC winding boundary; not a shared AC bus'], [px, 2220], driveClaim, [group], true);
        link(`${id}:switch-boundary`, input[1], boundary, driveClaim);
        entry.controls.push(`${id}:switch`); entry.endpoints.push(boundaryId);
      }
    } else if (board === 'rm406') {
      const endpoint = fact('CV-MC406A-ENDPOINT', 'MC406A sheet labels TF406B 22kV/415V 500kVA, upstream RM406-SW02 and MC406A CB TBC A. NOTE1, then a 415V/TBC A phase bar. Note 1 requires switchgear-supplier rating confirmation; note 2 says design pending vendor information. Ratings and upstream identity remain unresolved against433V and CB02/SW03 on RMU sheets.', [['mc406', 'A-D / 5-9, transformer/incomer/phase bar; A-B / 11-12, notes 1-2'], ['head', 'C-F / 8-9, TF406B22/0.433kV and CB02/SW03']], ['CV-R04', 'CV-R05', 'CV-R09']);
      const cbId = 'rm406:mc406a:cb'; const cb = control(cbId, 'MC406A CB\nTBC A · note 1', 'breaker', [x, 2040], endpoint, [group], ['MC406A CB TBC A. NOTE 1', 'Ratings to be confirmed by switchgear supplier']);
      link('rm406:mc406a:winding-incomer', terminals[1], cb[0], endpoint);
      const busId = 'rm406:mc406a:bus'; const busPort = `${busId}:bar`;
      add({ id: busId, label: 'MC406A\n415 V final LV bus\nTBC A rating', aliases: ['MC406A', 'CV006-MC406A', '415V / TBC A', 'Design pending vendor information'], kind: 'bus', terminals: [busPort], conductivePairs: [], positions: [], ...endpoint }, [x, 2220], [[x, 2220]], [group]);
      layout.rotations![busId] = 90; layout.labelOffsets![busId] = [0, 65]; link('rm406:mc406a:incomer-bus', cb[1], busPort, endpoint);
      entry.controls.push(cbId); entry.endpoints.push(busId);
    } else {
      const missing = fact('CV-MC410A-MISSING', 'Inference: provisional TF410B→MC410A→MC410B continuity is a coverage placeholder for the depicted downstream chain, not an accepted bypass of missing MC410A incoming/feeder devices. Referenced 520CBC0003-2140-DR-EL-0002/-0003/-0079 and alternative 520CBC0002 prefix are absent. Exact MC410A bus/incomer arrangement and final endpoint remain unconfirmed.', [['distribution', 'C-G / 2-5, TF410B→MC410A→MC410B'], ['tail', 'C-G / 8-9, MC410A output and source references'], ['mc410', 'A / 5-7, FROM MC410A / reference 0079']], ['CV-R06', 'CV-R11'], 'provisional');
      const interfaceId = 'rm410:interface:mc410a'; const pair: [string, string] = [`${interfaceId}:input`, `${interfaceId}:to-mc410b`];
      add({ id: interfaceId, label: 'MC410A\nLV detail / devices unconfirmed', aliases: ['MC410A', '520CBC0003-2140-DR-EL-0002 /0003 /0079 absent', '520CBC0002-2140-DR-EL-0003 disputed prefix'], kind: 'interface', terminals: pair, conductivePairs: [], sourcePairs: [[...pair]], earthPairs: [[...pair]], positions: [], ...missing }, [x, 1960], [[x, 1920], [x, 2000]], [group]);
      link('rm410:tf410b-mc410a', terminals[1], pair[0], missing);
      for (const terminal of pair) unknown(`${terminal}:coverage`, terminal, 'MC410A missing LV main bus/incomer/feeder detail', missing);
      const endpoint = fact('CV-MC410B-ENDPOINT', 'MC410B supplied sheet shows FROM MC410A, a 630A incoming breaker tier00F-16 and 415V 1000A phase bar; protection note mentions a new 250A feeder from MC410A. MC410B downstream endpoint retention versus stopping at MC410A remains unconfirmed; it is not a separate HV transformer feed. Outgoing LV circuits are excluded.', [['mc410', 'A-D / 5-10, incoming cables,630A breaker/415V bar and feeder protection note']], ['CV-R06', 'CV-R09'], 'provisional');
      const cbId = 'rm410:mc410b:cb'; const cb = control(cbId, 'MC410B incomer\n630 A · tier 00F-16', 'breaker', [x, 2160], endpoint, [group], ['MC410B 630A incomer', 'Tier00F-16', '250A upstream-feeder protection note; not breaker rating']);
      link('rm410:mc410a-to-mc410b', pair[1], cb[0], missing);
      const busId = 'rm410:mc410b:bus'; const busPort = `${busId}:bar`;
      add({ id: busId, label: 'MC410B\n415 V / 1000 A bus\nEndpoint scope unconfirmed', aliases: ['MC410B', 'CV006 TAIL END OUTDOOR MCC', 'Downstream of MC410A; not independent HV feed'], kind: 'bus', terminals: [busPort], conductivePairs: [], positions: [], ...endpoint }, [x, 2370], [[x, 2370]], [group]);
      layout.rotations![busId] = 90; layout.labelOffsets![busId] = [0, 65]; link('rm410:mc410b:incomer-bus', cb[1], busPort, endpoint);
      entry.interfaceId = interfaceId; entry.controls.push(cbId); entry.endpoints.push(busId);
    }
    lvLayouts.push(entry);
  }
}
evidence.push({ id: 'CV-MC410B-MEN-REDLINE', status: 'supported', summary: 'The redline explicitly says MEN LINK REMOVED LOCATED IN MC410A and references 0159. The older black local MEN symbol remains visible. Neither rendition establishes a phase-bus earth path; no confirmed local MC410B MEN bond is modelled.', references: [{ ...documents.mc410, clause: 'C / 6-8, red MEN-removal annotation and underlying black symbol; reference CB19OP001B-04057-DR-EL-0159' }] });
evidence.push({ id: 'CV-NEUTRAL-EARTH-BOUNDARY', status: 'supported', summary: 'MC406A neutral/MEN/earth bars are separate from its 415V phase bus. Transformer screens, neutral grounds and 33kV arrestors do not establish always-closed phase-earth edges or universal winding continuity.', references: [{ ...documents.mc406, clause: 'C / 6-8, neutral and MEN route separate from phase incomer' }, { ...documents.line33, clause: 'C-D / 1-7, TF04 ground/arrestor symbols' }] });
evidence.push({ id: 'CV-INTERLOCK-GAPS', status: 'unresolved', summary: 'Complete physical interlocks, keys, candidate position sets, operating sequences and baseline remain unconfirmed for RMUs, OHL, VSD-input and LV incomer devices. No source is enabled from a future label or drawing pose. Overview notes defer to SLDs, HV switching programs and key procedures.', references: [{ ...documents.head, clause: 'B-D, RMU switch/motor/earth-contact assemblies' }, { ...documents.tail, clause: 'B-D, RMU switch/motor/earth-contact assemblies' }, { ...documents.distribution, clause: 'A, OHL devices; D-F, VSD input switches' }, { ...documents.overview, clause: 'Lower-left notes 1-2' }, { ...documents.overview2, clause: 'Lower-left notes 1-2' }] });

const reviewQuestions: [string, string][] = [
  ['CV-R01', 'Reconcile 22kV SW411-fed CV006 and 33kV TF04/AMR/IOP topology at shared poles and Hopper10; no confirmed parallel source or voltage-changing edge.'],
  ['CV-R02', 'Confirm SW411 tier3 CB/ES SPARE versus CB/ES OHL FD identity, status and source availability.'],
  ['CV-R03', 'Confirm current pole57 supply versus RM418-RM406-P1 historical cable tag and previous Hopper007 note.'],
  ['CV-R04', 'Resolve TF406B feeder CB02/SW03 versus MC406A sheet upstream SW02 without silently selecting precedence.'],
  ['CV-R05', 'Resolve TF406B 433/415V and MC406A TBC incomer/bar ratings and pending vendor information.'],
  ['CV-R06', 'Confirm missing MC410A incomer/bar detail and downstream MC410B endpoint scope; retain MEN relocation/removal evidence.'],
  ['CV-R07', 'Confirm LV endpoint identities ahead of VS4061/VS4101 and explicit source/backfeed/earth relationships; no common AC bus through DC.'],
  ['CV-R08', 'Confirm RM406/RM410/RM419/RM418/SS416 interface identities, retaining Hopper8 HV continuation and no duplicate equipment.'],
  ['CV-R09', 'Confirm complete RMU/OHL/VSD-input/LV-incomer positions and physical interlocks; all unresolved controls remain blocked.'],
  ['CV-R10', 'Confirm governing source set and baseline; retain tail AS FOUND 23.10.21 versus 23.10.23 elsewhere, redlines and older stamps.'],
  ['CV-R11', 'Resolve CV006/CV010 aliases, Drop Tower, Hopper10, Norfolk/Bigge and missing vendor/MC410A/earthing references; absence does not establish disconnection.'],
];
reviews.push(...reviewQuestions.map(([id, question]) => ({ id, question, status: 'open' as const, evidenceIds: evidence.map(record => record.id) })));

const headLayout = structuredClone(layout); const tailLayout = structuredClone(layout);
for (const entry of lvLayouts) {
  const target = entry.group === 'head-lv' ? headLayout : tailLayout;
  const tf = assets.find(asset => asset.id === entry.transformerId)!; const x = entry.order === 0 ? 350 : 930;
  const originalX = layout.assets[tf.id][0];
  target.assets[tf.id] = [x, 180]; target.terminals[tf.terminals[0]] = [x, 150];
  target.labelOffsets![tf.id] = [0, -115];
  tf.terminals.slice(1).forEach((terminal, index) => { target.terminals[terminal] = [x + (tf.terminals.length === 3 ? index === 0 ? -45 : 45 : 0), 210]; });
  const incoming = connections.find(connection => connection.to === tf.terminals[0])!; target.terminals[incoming.from] = [x, 30];
  for (const cbId of entry.controls) {
    const cb = assets.find(asset => asset.id === cbId)!; const cx = x + (layout.assets[cbId][0] - originalX) * (entry.order === 0 ? 2 : 1); const cy = entry.interfaceId ? 550 : 440;
    target.assets[cbId] = [cx, cy]; target.terminals[cb.terminals[0]] = [cx, cy - 30]; target.terminals[cb.terminals[1]] = [cx, cy + 30];
    const cable = connections.find(connection => connection.to === cb.terminals[0])!; target.bends![cable.id] = [[cx, 310]];
  }
  for (const endpointId of entry.endpoints) {
    const endpoint = assets.find(asset => asset.id === endpointId)!; const ex = x + (layout.assets[endpointId][0] - originalX) * (entry.order === 0 ? 2 : 1); const ey = entry.interfaceId ? 750 : 630;
    target.assets[endpointId] = [ex, ey]; endpoint.terminals.forEach(terminal => { target.terminals[terminal] = [ex, ey]; });
  }
  if (entry.interfaceId) {
    const placeholder = assets.find(asset => asset.id === entry.interfaceId)!;
    target.assets[placeholder.id] = [x, 355]; target.terminals[placeholder.terminals[0]] = [x, 315]; target.terminals[placeholder.terminals[1]] = [x, 395];
    target.bends!['rm410:mc410a-to-mc410b'] = [];
  }
}
const overviewIds = [...groups.overhead, 'rm406:bus', 'rm406:sw01', 'rm410:bus', 'rm410:sw01', 'rm406:interface:hopper8', 'rm410:interface:rm419', 'rm410:interface:rm418'];
const viewDefinitions: { id: 'overview' | Group; label: string; assetIds: string[]; bounds: DiagramView['bounds']; layout: DiagramLayout }[] = [
  { id: 'overview', label: 'CV006 overview · OHL and RMU interfaces', assetIds: overviewIds, bounds: [-100, -50, 3460, 2300], layout: structuredClone(layout) },
  { id: 'overhead', label: 'Overhead line · disputed 22/33kV comparison', assetIds: groups.overhead, bounds: [-100, -50, 2850, 1150], layout: structuredClone(layout) },
  { id: 'rm406-hv', label: 'Head RM406 · two transformer branches / Hopper8', assetIds: groups['rm406-hv'], bounds: [170, 850, 1430, 1230], layout: structuredClone(layout) },
  { id: 'rm410-hv', label: 'Tail RM410 · two transformer branches / RM419', assetIds: groups['rm410-hv'], bounds: [1750, 850, 1680, 1450], layout: structuredClone(layout) },
  { id: 'head-lv', label: 'Head LV · VS4061 inputs and MC406A', assetIds: groups['head-lv'], bounds: [70, -40, 1170, 920], layout: headLayout },
  { id: 'tail-lv', label: 'Tail LV · VS4101 inputs / MC410A→MC410B', assetIds: groups['tail-lv'], bounds: [70, -40, 1170, 1020], layout: tailLayout },
];
const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const views: DiagramView[] = viewDefinitions.map(definition => {
  const visible = new Set(definition.assetIds); const view: DiagramView = { ...definition, boundaries: [] }; const portals = new Map<string, Point>();
  for (const connection of connections) {
    const fromVisible = visible.has(owners.get(connection.from)!); const toVisible = visible.has(owners.get(connection.to)!);
    if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!; const [x, y] = view.layout.terminals[local]; const [rx, ry] = view.layout.terminals[remote];
    let point: Point = portals.get(remote) ?? (Math.abs(rx - x) > Math.abs(ry - y) ? [x + Math.sign(rx - x) * 100, y] : [x, y + (Math.sign(ry - y) || -1) * 100]);
    if (definition.id === 'overview' && /:cb0[123]$/.test(remoteAssetId)) point = [layout.assets[remoteAssetId][0], 1340];
    portals.set(remote, point); view.layout.terminals[remote] = point; view.layout.bends![connection.id] = [];
    const targetViewId = viewDefinitions.find(candidate => candidate.id !== definition.id && candidate.id !== 'overview' && candidate.assetIds.includes(remoteAssetId))?.id ?? 'overview';
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId, position: point });
  }
  return view;
});
export const cv006Model: NetworkModel = {
  id: 'site-cv006', version: 'construction-2026-10-22.2', name: 'CV006 / RM406 / RM410 · unconfirmed construction', synthetic: false,
  assets, connections, evidence, reviews, earths, boundaries, sources: [], starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length > 0).map(asset => {
    const document = asset.id === 'rm406:mc406a:cb' ? documents.mc406 : asset.id === 'rm410:mc410b:cb' ? documents.mc410 : asset.id.startsWith('rm406:') && !asset.id.includes('vs4061') ? documents.head : asset.id.startsWith('rm410:') && !asset.id.includes('vs4101') ? documents.tail : documents.distribution;
    return { assetId: asset.id, status: 'unresolved', note: 'Complete physical positions, interlocks, keys, transitions and baseline unconfirmed. RMU position interpretation is provisional. The source does not confirm this control is permitted.', evidence: [{ ...document, clause: 'Represented switching region; complete physical-interlock and supported-position conditions unconfirmed' }] };
  }), rules: [] },
  presentation: { overviewId: 'overview', views },
};
