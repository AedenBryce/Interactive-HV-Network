import type { NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction identifiers and terminal roles are software names, not printed terminal tags.
// "Supported" below means depicted by the cited drawings; installation and baseline are unconfirmed.
const references = {
  W1: { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/2025; AS FOUND 23.10.23)', page: 1 },
  W2: { document: 'CB-10016-DR-EL-0010.pdf', revision: '0 (27/10/2025)', page: 1 },
  W3: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27/10/2025)', page: 1 },
  W4: { document: '11098-07110-EL-DR-2350.pdf', revision: '16 (31/05/2016)', page: 1 },
};

type EvidenceRecord = NonNullable<NetworkModel['evidence']>[number];
type Connection = NetworkModel['connections'][number];
const assets: NetworkModel['assets'] = [];
const connections: Connection[] = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const evidence: EvidenceRecord[] = [];
const devices: NetworkModel['starting']['devices'] = {};
const membership: Record<string, 'a' | 'b' | 'tie'> = {};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };

function supported(id: string, summary: string, locations: [keyof typeof references, string][]) {
  evidence.push({ id, status: 'supported', summary, references: locations.map(([source, region]) => ({ ...references[source], clause: `Drawing region: ${region}` })) });
  return { knowledge: 'supported' as const, evidenceIds: [id] };
}

const busAClaim = supported('SW411-BUS-A', 'W2 labels BUS A; W1 and W4 depict its connections on the left of the tie. Present installation is unconfirmed.', [['W1', 'central left bus'], ['W2', 'upper-left BUS A'], ['W4', 'top SW411 diagram left of tie']]);
const busBClaim = supported('SW411-BUS-B', 'W3 labels BUS B; W1 and W4 depict its connections on the right of the tie. Present installation is unconfirmed.', [['W1', 'central right bus'], ['W3', 'upper-left BUS B'], ['W4', 'top SW411 diagram right of tie']]);
for (const [bus, x, claim] of [['a', 500, busAClaim], ['b', 1540, busBClaim]] as const) {
  const id = `sw411:bus-${bus}`;
  assets.push({ id, label: `SW411 Bus ${bus.toUpperCase()}`, aliases: [`BUS ${bus.toUpperCase()}`], kind: 'bus', terminals: [`${id}:bar`], conductivePairs: [], positions: [], ...claim, reviewIds: ['R005'] });
  membership[id] = bus;
  layout.assets[id] = [x, 400]; layout.terminals[`${id}:bar`] = [x, 400];
  layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -25];
}

function connect(id: string, from: string, to: string, claim: Pick<Connection, 'knowledge' | 'evidenceIds'>, reviewIds: string[], bends?: [number, number][]) {
  connections.push({ id, from, to, ...claim, reviewIds });
  if (bends) layout.bends![id] = bends;
}

function switchAsset(id: string, label: string, aliases: string[], kind: 'breaker' | 'earth-switch', terminalNames: [string, string], bus: 'a' | 'b' | 'tie', location: [number, number], claim: Pick<Connection, 'knowledge' | 'evidenceIds'>, reviewIds: string[]) {
  const terminals: [string, string] = [`${id}:${terminalNames[0]}`, `${id}:${terminalNames[1]}`];
  assets.push({ id, label, aliases: [...new Set(aliases)], kind, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[...terminals]] }], ...claim, reviewIds: [...new Set([...reviewIds, 'R003', 'R005'])] });
  devices[id] = null; membership[id] = bus; layout.assets[id] = location;
  return terminals;
}

type Bay = { key: string; bus: 'a' | 'b'; x: number; tier: number; incoming?: boolean; destination: string; breakerAliases: string[]; earthAliases: string[]; reviews: string[]; description: string };
const bays: Bay[] = [
  { key: 'in-01', bus: 'a', x: 360, tier: 6, incoming: true, destination: 'IN01 source', breakerAliases: ['CB SW411 IN01', 'CB SW411 IN 01'], earthAliases: ['ES SW411 IN01', 'ES SW411 IN 01'], reviews: ['R001', 'SW411-Q02'], description: 'W1/W4 mark the IN01 overhead arrival and TFX4 transformer FUTURE; W2 groups this arrival under SB01. Source identity/commissioning remains unconfirmed.' },
  { key: 'in-03', bus: 'a', x: 720, tier: 7, incoming: true, destination: 'IN03 source', breakerAliases: ['CB SW411 IN03', 'CB SW411 IN 03'], earthAliases: ['ES SW411 IN03', 'ES SW411 IN 03'], reviews: ['R001'], description: 'W1 draws a power-station arrival; W2 places TF-11 above IN03. The source mapping remains unconfirmed.' },
  { key: 'in-04', bus: 'b', x: 1400, tier: 10, incoming: true, destination: 'IN04 source', breakerAliases: ['CB SW411 IN04', 'CB SW411 IN 04'], earthAliases: ['ES SW411 IN04', 'ES SW411 IN 04'], reviews: ['R001'], description: 'W1 draws a power-station arrival; W3 places TF12 above IN04. The source mapping remains unconfirmed.' },
  { key: 'in-02', bus: 'b', x: 1760, tier: 11, incoming: true, destination: 'IN02 source', breakerAliases: ['CB SW411 IN02', 'CB SW411 IN 02'], earthAliases: ['ES SW411 IN02', 'ES SW411 IN 02'], reviews: ['R001', 'SW411-Q02'], description: 'W1/W4 mark the IN02 overhead arrival and repeated TFX4 text FUTURE; W3 groups this arrival under SB01. Source identity/commissioning remains unconfirmed.' },
  { key: 'tier-01', bus: 'a', x: 140, tier: 1, destination: 'SW454', breakerAliases: ['CB SW454 FD01', 'CB SW454 FD 01'], earthAliases: ['ES SW454 FD01', 'ES SW454 FD 01'], reviews: [], description: 'W1 depicts SW454-P-01 to SS454/SW454, reference 04400-EL-DR-8001; W2 depicts the SW454 continuation.' },
  { key: 'tier-02', bus: 'a', x: 360, tier: 2, destination: 'SW451', breakerAliases: ['CB SW451 FD01', 'CB SW451 FD 01'], earthAliases: ['ES SW451 FD01', 'ES SW451 FD 01'], reviews: [], description: 'W1 depicts SW451-P-01 to SS451/SW451, reference 07110-EL-DR-2356; W2 depicts the SW451 continuation.' },
  { key: 'tier-03', bus: 'a', x: 580, tier: 3, destination: 'OHL WEST / CV006', breakerAliases: ['CBW OHL FD', 'CB SPARE'], earthAliases: ['ES OHL FD', 'ES SPARE'], reviews: ['SW411-Q01'], description: 'W1 OHL WEST bay prints CB SPARE/ES SPARE and CV006 destination CB19OP001B-04057-DR-EL-0001. W2 prints CBW OHL FD/ES OHL FD and the west overhead-line route. Canonical labels/continuation remain unconfirmed.' },
  { key: 'tier-04', bus: 'a', x: 800, tier: 4, destination: 'SW435', breakerAliases: ['CB SW435 FD01', 'CB SW435 FD 01'], earthAliases: ['ES SW435 FD01', 'ES SW435 FD 01'], reviews: [], description: 'W1 depicts SW435-P-01 to SS435/SW435, reference 07110-EL-DR-2354; W2 depicts the SW435 continuation.' },
  { key: 'tier-13', bus: 'b', x: 1220, tier: 13, destination: 'SW431', breakerAliases: ['CB SW431 FD01', 'CB SW431 FD 01'], earthAliases: ['ES SW431 FD01', 'ES SW431 FD 01'], reviews: [], description: 'W1 depicts SW431-P-01 to SS431/SW431, reference 07110-EL-DR-2353; W3 depicts the SW431 continuation.' },
  { key: 'tier-14', bus: 'b', x: 1440, tier: 14, destination: 'SW426', breakerAliases: ['CB SW426 FD01', 'CB SW426 FD 01'], earthAliases: ['ES SW426 FD01', 'ES SW426 FD 01'], reviews: [], description: 'W1 depicts SW426-P-01 to SS426/SW426, reference 07110-EL-DR-2352; W3 depicts the desand continuation.' },
  { key: 'tier-15', bus: 'b', x: 1660, tier: 15, destination: 'SW421', breakerAliases: ['CB SW421 FD01', 'CB SW421 FD 01'], earthAliases: ['ES SW421 FD01', 'ES SW421 FD 01'], reviews: [], description: 'W1 depicts SW421-P-01 to SS421/SW421, reference 07110-EL-DR-2351; W3 depicts the screening continuation.' },
  { key: 'tier-16', bus: 'b', x: 1880, tier: 16, destination: 'RM721', breakerAliases: ['CB RM721 FD01', 'CB SW454 FD 01'], earthAliases: ['ES RM721 FD01', 'ES SW454 FD 01'], reviews: ['R002'], description: 'W1 tier 16 prints CB/ES SW454 FD 01 and cable SW454-P-01 but destination RM721/07110-EL-DR-2256. W3 prints CB/ES RM721 FD01. Device/cable identities remain unconfirmed.' },
];

for (const bay of bays) {
  const key = `sw411:${bay.key}`;
  const overview = bay.bus === 'a' ? 'W2' : 'W3';
  const claim = supported(`SW411-${bay.key.toUpperCase()}`, `Depicted tier ${bay.tier}: ${bay.description} W1 aliases: ${bay.breakerAliases.at(-1)} / ${bay.earthAliases.at(-1)}; ${overview} aliases: ${bay.breakerAliases[0]} / ${bay.earthAliases[0]}. Earth branch is on the ${bay.incoming ? 'incoming-line' : 'outgoing-cable'} side. Terminal names are construction roles.`, [['W1', `central ${bay.incoming ? 'incomer' : 'feeder'} bay tier ${bay.tier} and its ${bay.incoming ? 'upper arrival' : 'lower destination'}`], [overview, 'upper-left SW411 diagram'], ...(bay.incoming ? [['W4', 'top SW411 incomer arrangement'] as [keyof typeof references, string]] : [])]);
  const cbY = bay.incoming ? 280 : 550;
  const cb = switchAsset(`${key}:cb`, bay.reviews.includes('R002') || bay.reviews.includes('SW411-Q01') ? `T${bay.tier} CB — unconfirmed` : bay.breakerAliases[0], bay.breakerAliases, 'breaker', ['bus', 'line'], bay.bus, [bay.x, cbY], claim, bay.reviews);
  layout.terminals[cb[0]] = [bay.x, cbY + (bay.incoming ? 30 : -30)]; layout.terminals[cb[1]] = [bay.x, cbY + (bay.incoming ? -30 : 30)]; layout.rotations![`${key}:cb`] = 90; layout.labelOffsets![`${key}:cb`] = [0, bay.incoming ? -55 : -45];
  const earthY = bay.incoming ? 180 : 660;
  const es = switchAsset(`${key}:es`, bay.reviews.includes('R002') || bay.reviews.includes('SW411-Q01') ? `T${bay.tier} ES — unconfirmed` : bay.earthAliases[0], bay.earthAliases, 'earth-switch', ['line', 'earth'], bay.bus, [bay.x + 85, earthY], claim, bay.reviews);
  layout.terminals[es[0]] = [bay.x + 55, earthY]; layout.terminals[es[1]] = [bay.x + 115, earthY]; layout.labelOffsets![`${key}:es`] = [0, 65];
  const interfaceId = `${key}:interface`; const port = `${interfaceId}:port`; const interfaceY = bay.incoming ? 70 : 820;
  assets.push({ id: interfaceId, label: `${bay.destination} interface`, aliases: [bay.destination], kind: 'interface', terminals: [port], conductivePairs: [], positions: [], knowledge: 'unresolved', evidenceIds: claim.evidenceIds, reviewIds: [...bay.reviews, bay.incoming ? 'R001' : 'SW411-COVERAGE'] });
  membership[interfaceId] = bay.bus; layout.assets[interfaceId] = [bay.x, interfaceY]; layout.terminals[port] = [bay.x, interfaceY]; layout.labelOffsets![interfaceId] = [0, bay.incoming ? -30 : 65];
  boundaries.push({ id: `${key}:coverage`, label: `${bay.destination}: source/earth continuation unconfirmed`, terminal: port, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', knowledge: 'unresolved', evidenceIds: claim.evidenceIds, reviewIds: [...bay.reviews, bay.incoming ? 'R001' : 'SW411-COVERAGE'] });
  earths.push({ id: `${key}:earth-termination`, label: `${bay.earthAliases[0]} earth termination`, terminal: es[1], ...claim, reviewIds: ['R003', 'R005', ...bay.reviews] });
  connect(`${key}:bus-link`, `sw411:bus-${bay.bus}:bar`, cb[0], claim, bay.reviews, [[bay.x, 400]]);
  connect(`${key}:interface-link`, cb[1], port, claim, bay.reviews);
  connect(`${key}:earth-branch`, cb[1], es[0], claim, ['R003', ...bay.reviews], [[bay.x, earthY]]);
}

for (const [bus, x, source] of [['a', 35, 'W2'], ['b', 2080, 'W3']] as const) {
  const claim = supported(`SW411-BUS-${bus.toUpperCase()}-EARTH`, `${source} labels ES BUS ${bus.toUpperCase()} SW411. W1 depicts the corresponding BUS ${bus.toUpperCase()} EARTH bay; the terminal branch joins that bus directly.`, [['W1', `BUS ${bus.toUpperCase()} EARTH bay`], [source, `upper-left bus-earth tier ${bus === 'a' ? 5 : 12}`]]);
  const id = `sw411:bus-${bus}:es`;
  const es = switchAsset(id, `ES BUS ${bus.toUpperCase()} SW411`, [`ES BUS ${bus.toUpperCase()} SW411`, `BUS ${bus.toUpperCase()} EARTH`], 'earth-switch', ['line', 'earth'], bus, [x, 490], claim, []);
  layout.terminals[es[0]] = [x - 30, 490]; layout.terminals[es[1]] = [x + 30, 490];
  earths.push({ id: `sw411:bus-${bus}:earth-termination`, label: `SW411 Bus ${bus.toUpperCase()} earth`, terminal: es[1], ...claim, reviewIds: ['R003', 'R005'] });
  connect(`sw411:bus-${bus}:earth-branch`, `sw411:bus-${bus}:bar`, es[0], claim, ['R003'], [[x - 30, 400]]);
}

const tieClaim = supported('SW411-BUS-TIE', 'W1 depicts CB SW 411 BT, tier 8, between the bus sections. W3 prints CB SW411 BT. W1 rating 1600A differs from W4 2000A; no rating-based rule is inferred.', [['W1', 'central bus-tie bay tier 8'], ['W3', 'upper-left page continuation at tier 8'], ['W4', 'top SW411 bus tie']]);
const tie = switchAsset('sw411:bus-tie:cb', 'CB SW411 BT', ['CB SW411 BT', 'CB SW 411 BT'], 'breaker', ['bus-a', 'bus-b'], 'tie', [1060, 400], tieClaim, ['SW411-Q03']);
layout.terminals[tie[0]] = [1030, 400]; layout.terminals[tie[1]] = [1090, 400];
connect('sw411:tie-to-bus-a', tie[0], 'sw411:bus-a:bar', tieClaim, ['SW411-Q03']);
connect('sw411:tie-to-bus-b', tie[1], 'sw411:bus-b:bar', tieClaim, ['SW411-Q03']);

evidence.push({ id: 'SW411-INTERLOCK-NOTE3', status: 'unresolved', summary: 'W1 note 3 says mechanical interlock of earthing is to be provided to switchyard and power station. Installed conditions, keys and complete affected control set are unconfirmed; no switching permission follows.', references: [{ ...references.W1, clause: 'Note 3, upper-right notes' }] });
const reviews: NonNullable<NetworkModel['reviews']> = [
  { id: 'R001', question: 'Confirm source routes, assignments and commissioning for IN01/IN03/IN04/IN02; interfaces do not assert enabled electrical sources.', status: 'open', evidenceIds: ['SW411-IN-01', 'SW411-IN-03', 'SW411-IN-04', 'SW411-IN-02'] },
  { id: 'R002', question: 'Resolve tier 16 RM721/SW454 breaker, earth switch and cable identities.', status: 'open', evidenceIds: ['SW411-TIER-16'] },
  { id: 'R003', question: 'Confirm installed physical interlock conditions and affected controls; W1 note 3 is incomplete.', status: 'open', evidenceIds: ['SW411-INTERLOCK-NOTE3'] },
  { id: 'R005', question: 'Owner to accept the complete starting configuration and source availability after construction. All SW411 baseline positions remain unconfirmed.', status: 'open', evidenceIds: ['SW411-BUS-A', 'SW411-BUS-B', 'SW411-BUS-TIE'] },
  { id: 'SW411-Q01', question: 'Resolve tier 3 OHL WEST / SPARE identities and continuation coverage.', status: 'open', evidenceIds: ['SW411-TIER-03'] },
  { id: 'SW411-Q02', question: 'Resolve repeated TFX4 source labels, future commissioning and separate winding/transfer identities; no transformer is invented at these interfaces.', status: 'open', evidenceIds: ['SW411-IN-01', 'SW411-IN-02'] },
  { id: 'SW411-Q03', question: 'Resolve bus-tie 1600A versus 2000A label difference; no rating-based switching rule is inferred.', status: 'open', evidenceIds: ['SW411-BUS-TIE'] },
  { id: 'SW411-COVERAGE', question: 'Reconcile downstream interfaces against the remaining area SLDs. Source/earth coverage at these construction boundaries is unconfirmed.', status: 'open', evidenceIds: bays.filter(bay => !bay.incoming).map(bay => `SW411-${bay.key.toUpperCase()}`) },
];

const overview: DiagramView = { id: 'overview', label: 'SW411 overview', assetIds: assets.map(asset => asset.id), bounds: [-80, -30, 2320, 990], layout };
const details: DiagramView[] = (['a', 'b'] as const).map(bus => ({
  id: `bus-${bus}`, label: `Bus ${bus.toUpperCase()} detail`, assetIds: assets.filter(asset => membership[asset.id] === bus || membership[asset.id] === 'tie').map(asset => asset.id),
  bounds: bus === 'a' ? [-80, -30, 1210, 990] : [970, -30, 1270, 990],
  layout: { ...layout, terminals: { ...layout.terminals, [`sw411:bus-${bus === 'a' ? 'b' : 'a'}:bar`]: [bus === 'a' ? 1120 : 980, 400] } },
  boundaries: [{ connectionId: `sw411:tie-to-bus-${bus === 'a' ? 'b' : 'a'}`, remoteAssetId: `sw411:bus-${bus === 'a' ? 'b' : 'a'}`, targetViewId: `bus-${bus === 'a' ? 'b' : 'a'}`, position: [bus === 'a' ? 1120 : 980, 400] }],
}));

export const sw411Model: NetworkModel = {
  id: 'site-sw411', version: 'construction-2026-10-22.2', name: 'SW411 — provisional drawing model', synthetic: false,
  assets, connections, sources: [], earths, boundaries, evidence, reviews,
  starting: { devices, sources: {} },
  interlocks: { reviews: assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'unresolved', note: 'Unconfirmed physical interlock conditions for this control. W1 note 3 does not define installed conditions or the complete affected set. R003 remains open.', evidence: [{ ...references.W1, clause: 'Note 3, upper-right notes' }] })), rules: [] },
  presentation: { overviewId: 'overview', views: [overview, ...details] },
};
