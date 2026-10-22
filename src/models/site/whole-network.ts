import type { NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';
import { sw411Model } from './sw411';
import { powerStationModel } from './power-station';
import { crushing1Model } from './crushing-1';
import { crushing2HpgrModel } from './crushing-2-hpgr';
import { screeningModel } from './screening';
import { desandsLaboratoryModel } from './desands-laboratory';
import { stockpileWetPlantModel } from './stockpile-wet-plant';
import { trainLoadingModel } from './train-loading';
import { cv006Model } from './cv006';
import { westernHoppersModel } from './western-hoppers';
import { servicesModel } from './services';
import { hopper10Model } from './hopper-10';
import { mineCampModel } from './mine-camp';

const packages = [
  { key: 'sw411', label: 'SW411', model: sw411Model },
  { key: 'station', label: 'Power station / 33 kV', model: powerStationModel },
  { key: 'crushing-1', label: 'Crushing 1', model: crushing1Model },
  { key: 'crushing-2', label: 'Crushing 2 / HPGR', model: crushing2HpgrModel },
  { key: 'screening', label: 'Screening', model: screeningModel },
  { key: 'desands', label: 'Desands / laboratory', model: desandsLaboratoryModel },
  { key: 'stockpile', label: 'Stockpile / wet plant', model: stockpileWetPlantModel },
  { key: 'train-loading', label: 'Train loading', model: trainLoadingModel },
  { key: 'cv006', label: 'CV006', model: cv006Model },
  { key: 'western', label: 'Western hoppers', model: westernHoppersModel },
  { key: 'services', label: 'Services', model: servicesModel },
  { key: 'hopper-10', label: 'Hopper 10', model: hopper10Model },
  { key: 'mine-camp', label: 'Mine / camp', model: mineCampModel },
].map(area => ({ ...area, model: structuredClone(area.model) }));

// Namespace shared review records without dropping either area's wording or evidence.
const reviewCounts = new Map<string, number>();
for (const { model } of packages) for (const review of model.reviews ?? []) reviewCounts.set(review.id, (reviewCounts.get(review.id) ?? 0) + 1);
for (const { key, model } of packages) {
  const scoped = (id: string) => reviewCounts.get(id)! > 1 ? `${key}:${id}` : id;
  for (const claim of [...model.assets, ...model.connections, ...model.sources, ...(model.earths ?? []), ...(model.boundaries ?? [])]) if (claim.reviewIds) claim.reviewIds = claim.reviewIds.map(scoped);
  for (const review of model.reviews ?? []) review.id = scoped(review.id);
}

export const wholeNetworkModel: NetworkModel = {
  id: 'site-whole-network', version: 'construction-2026-10-22.4',
  name: 'Whole network · construction / owner review pending', synthetic: false,
  assets: packages.flatMap(area => area.model.assets),
  connections: packages.flatMap(area => area.model.connections),
  sources: packages.flatMap(area => area.model.sources),
  earths: packages.flatMap(area => area.model.earths ?? []),
  boundaries: packages.flatMap(area => area.model.boundaries ?? []),
  evidence: packages.flatMap(area => [
    ...(area.model.evidence ?? []),
    { id: `WN-AREA-${area.key}`, status: 'supported' as const, summary: `Software provenance: ${area.label}, original package ${area.model.id}, immutable version ${area.model.version}. Construction only; no installed-network acceptance.`, references: [{ document: `Software model package ${area.model.id}`, revision: area.model.version, clause: 'Included construction package; not physical-network evidence' }] },
  ]),
  reviews: packages.flatMap(area => area.model.reviews ?? []),
  interlocks: { reviews: packages.flatMap(area => area.model.interlocks?.reviews ?? []), rules: packages.flatMap(area => area.model.interlocks?.rules ?? []) },
  starting: { devices: Object.assign({}, ...packages.map(area => area.model.starting.devices)), sources: Object.assign({}, ...packages.map(area => area.model.starting.sources)) },
  presentation: {
    overviewId: 'sw411/overview',
    views: packages.flatMap(area => area.model.presentation!.views.map(view => ({ ...view, id: `${area.key}/${view.id}`, label: `${area.label} · ${view.label}`, boundaries: view.boundaries?.map(boundary => ({ ...boundary, targetViewId: `${area.key}/${boundary.targetViewId}` })) }))),
  },
};

type Reference = NonNullable<NetworkModel['evidence']>[number]['references'][number];
const ref = (document: string, revision: string, clause: string): Reference => ({ document, revision, page: 1, clause });
const sld = (number: string, revision: string, clause: string) => ref(`11098-07110-EL-DR-${number}.pdf`, revision, clause);
const main = (clause: string) => sld('5151', '7 (28.01.25; AS FOUND 23.10.23)', clause);
const station = (clause: string) => ref('500CBC0002-13015-DR-EL-0001.pdf', '3 (18.07.22; UPDATED AS PER REDLINES)', clause);
function join(id: string, from: string, to: string, summary: string, references: Reference[], provisional = false) {
  const recordId = `WN-JOIN-${id}`; const knowledge = provisional ? 'provisional' : 'supported';
  wholeNetworkModel.connections.push({ id: `whole:join:${id}`, from, to, knowledge, evidenceIds: [recordId], reviewIds: [recordId] });
  wholeNetworkModel.evidence!.push({ id: recordId, status: knowledge, summary: `${provisional ? 'Inference: candidate construction join. ' : 'Depicted cable-end continuation. '}${summary} Installed identity, actual states, availability and operating permission remain unconfirmed.`, references });
  wholeNetworkModel.reviews!.push({ id: recordId, status: 'open', question: `Owner to confirm interface ${id}: ${summary} Confirm installed identity and treatment against this immutable whole-network version; no baseline or interlock permission is accepted.`, evidenceIds: [recordId] });
}
for (const [id, tier, document, revision, region] of [
  ['sw454', '01', '11098-04400-EL-DR-8001.pdf', '5 (28.01.25; AS FOUND 23.10.23)', 'A-D / 1-2, SW411 incoming SW454-P-01'],
  ['sw451', '02', '11098-07110-EL-DR-2356.pdf', '5 (28.01.25; AS FOUND 23.10.23)', 'A-C / 1-2, SW451-P-01'],
  ['sw435', '04', '11098-07110-EL-DR-2354.pdf', '9 (28.01.25; AS FOUND 23.10.23)', 'A-C / 1-2, tier1 SW435-P-01'],
  ['sw431', '13', '11098-07110-EL-DR-2353.pdf', '5 (28.01.25; AS FOUND 23.10.23)', 'A-C / 1-2, SW431-P-01'],
  ['sw426', '14', '11098-07110-EL-DR-2352.pdf', '9 (28.01.25; AS FOUND 23.10.23)', 'A-C / 1-2, tier1 SW426-P-01'],
  ['sw421', '15', '11098-07110-EL-DR-2351.pdf', '5 (28.01.25; AS FOUND 23.10.23)', 'A-C / 1-2, tier1 SW421-P-01'],
]) join(id, `sw411:tier-${tier}:interface:port`, `${id}:interface:sw411:port`, `SW411 tier${tier} to ${id.toUpperCase()} via ${id.toUpperCase()}-P-01; both endpoint breakers and earth branches retained.`, [main(`D-G, tier${tier} feeder and lower destination`), ref(document, revision, region)]);
join('crushing-tie', 'sw431:interface:sw435:port', 'sw435:interface:sw431:port', 'One SW431-P-02 cable; CB SW435 FD02 at SW431 and CB SW431 FD02 at SW435 remain distinct. C1-R03/C2-R11 identity/reference review stays open.', [sld('2353', '5 (28.01.25; AS FOUND 23.10.23)', 'C-G / 2-3, SW435 feeder'), sld('2354', '9 (28.01.25; AS FOUND 23.10.23)', 'B-G / 2-3, SW431 feeder')], true);
join('hopper1', 'rm413:interface:rm417:port', 'wh:h1:interface:rm413:port', 'RM413 IN02 cable-side double boot to RM417 SW01 via SS417-RM417-P01; existing RM413A branch is retained on that same cable side.', [ref('CB17OP023A-04057-DR-EL-0004.pdf', '5 (28.01.25; AS FOUND 23.10.23)', 'A-B / 2-5, double boot TO RM417 / 0044'), ref('CB16OP038A-02006-DR-EL-0044.pdf', '2 (28.01.25; AS FOUND 23.10.23)', 'A-B / 6-7, FROM RM413 / incoming SW01')]);
join('hopper8', 'rm406:interface:hopper8:port', 'wh:h8:interface:rm406:port', 'RM406 CB03/SW04 to Hopper8 SS416-HV416, not the distinct Hopper3 SS416 identity.', [ref('CB19OP001B-04057-DR-EL-0002.pdf', '4 (28.01.25; AS FOUND 23.10.23)', 'C-E / 10-11, Hopper008 feeder'), ref('CB17OP023C-01006-DR-EL-0001.pdf', '6 (28.01.25; AS FOUND 23.10.23)', 'C-G / 8-11, Hopper8 incoming RM406-CB03')]);
join('hopper9', 'rm410:interface:rm419:incoming', 'wh:h9:interface:rm410:port', 'RM410 CB03/SW04 to actual western RM419 SW01. Remote conducting placeholder is removed; actual RM419 SW02 to RM418 SW01 cable remains in the western package.', [ref('CB19OP001B-04057-DR-EL-0004.pdf', '6 (28.01.25; AS FOUND 23.10.21)', 'C-F / 10-12, RM419-SW01 outgoing'), ref('CB19OP001C-01068-DR-EL-0001.pdf', '4 (28.01.25; AS FOUND 23.10.23)', 'A-B / 6-8, incoming RM410-CB03 and onward RM418')]);
join('cv006', 'sw411:tier-03:interface:port', 'cv006:interface:sw411:port', 'SW411 tier03 OHL WEST to the depicted 22kV CV006 route. SPARE/OHL device aliases remain unresolved; no join to the competing 33kV route or Hopper10 is made.', [main('D-G / 4-5, tier3 CB/ES SPARE and CV006 reference'), ref('CB19OP001B-04057-DR-EL-0001.pdf', '6 (28.01.25; AS FOUND 23.10.23)', 'A / 10-11, FED FROM SR411 TIER03')], true);
join('rm721', 'sw411:tier-16:interface:port', 'services:interface:sw411:port', 'SW411 tier16 destination RM721 and reciprocal RM721 incoming. R002 retains conflicting CB/ES SW454 FD01 and SW454-P-01 versus RM721 labels; this creates no tier16-to-SW454 edge.', [main('D-G / 11-12, tier16 RM721 destination and SW454 aliases'), sld('2256', '3 (28.01.25; AS FOUND 23.10.23)', 'B-D / 6-7, FROM SW411 / RM721-P-01')], true);
join('tf11-in03', 'station:sb01:f4:interface:port', 'sw411:in-03:interface:port', 'Candidate TF11 / OPF O/H line No.2 to IN03, supported by overview transformer placement. Station/SW411 R001 remains unresolved; IN01 FUTURE is not substituted.', [station('B-D, SB01 F4 TF11 and OPF line No.2'), ref('CB-10016-DR-EL-0010.pdf', '0 (27.10.25)', 'Upper-left SW411, TF11 above IN03'), main('Upper station source block and central tier7 IN03')], true);
join('tf12-in04', 'station:sb02:f1:interface:port', 'sw411:in-04:interface:port', 'Candidate TF12 / OPF O/H line No.1 to IN04, supported by overview transformer placement. Overview SB01 text versus station SB02 remains unresolved; IN02 FUTURE is not substituted.', [station('F-G, SB02 F1 TF12 and OPF line No.1'), ref('CB-10016-DR-EL-0011.pdf', '0 (27.10.25)', 'Upper-left SW411, TF12 above IN04 / SB01 source text'), main('Upper station source block and central tier10 IN04')], true);
join('mine-tf03', 'station:sb01:f1:interface:port', 'mine:interface:station-tf03:port', 'Candidate station TF03 mine-services line to RM711 FROM POWER STATION TF03. Exact 2349 reference equivalence and study rating/SS711B continuation remain unresolved; study-tf03 comparison is not joined.', [station('B-D, SB01 F1 TF03 / MINE SERVICES O/H LINE'), sld('2252', '5 (22.02.12; DB03, DB07 BECOME SPARE)', 'A-C / 1-3, FROM POWER STATION TF03')], true);
join('village', 'station:sb01:f3:interface:port', 'camp:interface:station-village:port', 'Candidate station village line to RM732/camp village supply. PS1 ref6160 and camp ref2349 are not established as equivalent; pole/identity differences remain MC-Q03/R004 review items.', [station('B-D, SB01 F3 CLOUDBREAK VILLAGE O/H LINE / ref6160'), ref('CB-10016-DR-EL-0002.002.pdf', '3 (08.12.11; CAMP POWERLINE RELOCATION ADDED)', 'A-G / 4-10, station/camp source, RM732 and village line')], true);

// This owner decision resolves the current feeding route only. It does not
// select transformer primaries, enable a source or establish switch permission.
const hopper10Decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'the 33kV TF04 line feeds Hopper10' };
const hopper10DecisionId = 'WN-H10-TF04-SOURCE';
wholeNetworkModel.evidence!.push({
  id: hopper10DecisionId, status: 'owner-confirmed', confirmation: hopper10Decision,
  summary: 'Owner confirmed exactly: "the 33kV TF04 line feeds Hopper10". This resolves the current TF04 33kV source continuation at pole286 to RM420. The conflicting CV006 22kV drawing representation is retained; its shared-pole topology, TF420A/B primary wiring, generator availability, all starting states and interlocks remain unconfirmed.',
  references: [ref('CB21OP055B-10016-DR-EL-0089.pdf', '0 (10.06.22; ISSUED FOR CONSTRUCTION)', 'F-G / 10-11, pole286 80A fused ABS and SUPPLY TO RMU420; station TF04 route'), ref('520CBC0007-2130-DR-EL-0003.pdf', '3 (28.01.25; MODIFIED AS FOUND 23.10.23)', 'A-B / 8-9, pole286 arrival SR420-RM420-P01; G note3 dual primary')],
});
wholeNetworkModel.reviews!.push({ id: hopper10DecisionId, status: 'resolved', question: 'Which current source feeds Hopper10 at pole286? Resolution is scoped to the TF04 33kV feeding route only.', evidenceIds: [hopper10DecisionId], resolution: hopper10Decision });
wholeNetworkModel.connections.push({ id: 'whole:join:hopper10-tf04', from: 'line33:hopper-10:interface:port', to: 'rm420:interface:pole286:port', knowledge: 'owner-confirmed', evidenceIds: [hopper10DecisionId], reviewIds: [hopper10DecisionId] });
for (const [id, label] of [
  ['rm420:interface:pole286', 'Pole 286 · TF04 33 kV feed · owner confirmed'],
  ['rm420:bus', 'RM420 · 33 kV bus · baseline unconfirmed'],
  ['cv006:interface:hopper10', 'Hopper 10 drawing reference · conflicts with confirmed 33 kV feed'],
  ['rm420:comparison:cv00622', 'CV006 22 kV depiction · conflicting source record'],
]) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.aliases = [...(asset.aliases ?? []), `Prior construction caption: ${asset.label}`];
  asset.label = label; asset.evidenceIds = [...(asset.evidenceIds ?? []), hopper10DecisionId]; asset.reviewIds = [...(asset.reviewIds ?? []), hopper10DecisionId];
}
for (const [id, question] of [
  ['H10-Q01', 'Owner confirmed the current TF04 33kV Hopper10 feed (WN-H10-TF04-SOURCE). Remaining unresolved: reconcile the conflicting CV006/SW41122kV depiction and shared-pole mapping, and confirm TF420A/B selected primary wiring. Only the 33kV source continuation is joined.'],
  ['CV-R01', 'Owner confirmed the current TF04 33kV Hopper10 feed (WN-H10-TF04-SOURCE). Reconcile the remaining CV006/SW41122kV route and shared pole49-38-1/201/286/287 identities; no parallel supply or transformer primary selection is inferred.'],
]) {
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = question; review.evidenceIds.push(hopper10DecisionId);
}
for (const id of ['H10-SOURCE-CONFLICT', 'CV-HOPPER10-INTERFACE']) {
  wholeNetworkModel.evidence!.find(record => record.id === id)!.summary = 'The drawing conflict remains traceable: PL1/0003 depict the TF04 33kV pole286 feed, while CV006 depicts a SW411 tier03 22kV route. Subsequent owner decision WN-H10-TF04-SOURCE states exactly "the 33kV TF04 line feeds Hopper10". Current source continuation is resolved to TF04 33kV; shared-pole CV006 topology and selected transformer primary wiring remain unconfirmed. The 22kV depiction remains conflicting drawing evidence; no additional actual Hopper10 input is represented.';
}
for (const [terminal, label] of [
  ['rm420:interface:pole286:port', 'TF04 33kV feed owner confirmed; upstream availability, earth coverage and remaining pole/primary mapping unconfirmed'],
  ['line33:hopper-10:interface:port', 'RM420 source continuation owner confirmed; availability, earth coverage and baseline unconfirmed'],
  ['cv006:interface:hopper10:port', 'Conflicting 22kV drawing representation; no additional actual Hopper10 input joined; shared-pole mapping unconfirmed'],
]) for (const boundary of wholeNetworkModel.boundaries!.filter(candidate => candidate.terminal === terminal)) {
  boundary.label = label; boundary.evidenceIds = [...(boundary.evidenceIds ?? []), hopper10DecisionId]; boundary.reviewIds = [...(boundary.reviewIds ?? []), hopper10DecisionId];
}

const primary33DecisionId = 'WN-H10-PRIMARY33-CONFIGURATION';
const primary33Decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'They are connected with 33kV from the Primary to the 33kV Bus, back through RM420-SW01 onto the 33kV line fed from TF04 supply' };
wholeNetworkModel.evidence!.push({
  id: primary33DecisionId, status: 'owner-confirmed', confirmation: primary33Decision,
  summary: 'Owner confirmed both TF420A/B selected 33kV primary connections to the RM420 33kV bus and TF04-fed line through RM420-SW01. Existing feeder CB/SW/earth devices remain in their drawn series/branch positions. This confirms input configuration and bus identity only; winding source transfer, reverse transfer, 22kV winding coupling and independent earth continuity remain unconfirmed. No selector, availability, baseline or permission is inferred.',
  references: [ref('520CBC0007-2130-DR-EL-0003.pdf', '3 (28.01.25; MODIFIED AS FOUND 23.10.23)', 'A-F / 3-9, RM420 bus/SW01 and both transformer CB/SW/earth branches; G note3 dual primaries'), ref('CB21OP055B-10016-DR-EL-0089.pdf', '0 (10.06.22; ISSUED FOR CONSTRUCTION)', 'F-G / 10-11, pole286 TF04 line to RMU420')],
});
wholeNetworkModel.reviews!.push({ id: primary33DecisionId, status: 'resolved', question: 'Which primary inputs are presently connected for TF420A/B, and to which RM420 bus/source route? Scope excludes winding transfer, backfeed, earth, baseline and interlock policy.', evidenceIds: [primary33DecisionId], resolution: primary33Decision });
const rm420Bus = wholeNetworkModel.assets.find(asset => asset.id === 'rm420:bus')!;
rm420Bus.knowledge = 'owner-confirmed'; rm420Bus.label = 'RM420 · 33 kV bus · owner confirmed';
rm420Bus.evidenceIds!.push(primary33DecisionId); rm420Bus.reviewIds!.push(primary33DecisionId);
for (const suffix of ['a', 'b']) {
  const prefix = `rm420:tf420${suffix}`; const name = `TF420${suffix.toUpperCase()}`;
  wholeNetworkModel.connections.push({ id: `whole:primary33:tf420${suffix}`, from: `${prefix}:primary-connection:port`, to: `${prefix}:primary33`, knowledge: 'owner-confirmed', evidenceIds: [primary33DecisionId], reviewIds: [primary33DecisionId] });
  const input = wholeNetworkModel.assets.find(asset => asset.id === `${prefix}:primary-connection`)!;
  input.knowledge = 'owner-confirmed'; input.label = `${name} · selected 33 kV primary connection`;
  input.evidenceIds!.push(primary33DecisionId); input.reviewIds!.push(primary33DecisionId);
  const transformer = wholeNetworkModel.assets.find(asset => asset.id === prefix)!;
  transformer.evidenceIds!.push(primary33DecisionId); transformer.reviewIds!.push(primary33DecisionId);
  // Selection wires the existing 33kV input only. Candidate winding arrays stay
  // provisional; an unconnected 22kV terminal is not asserted electrically dead.
  for (const boundary of wholeNetworkModel.boundaries!.filter(candidate => candidate.terminal.startsWith(`${prefix}:`))) {
    boundary.label = boundary.terminal.endsWith(':primary22') ? `${name} unconnected 22kV configuration terminal: winding coupling, source/backfeed and earth policy unconfirmed` : `${name} selected 33kV input confirmed; availability, winding source/backfeed and earth policy unconfirmed`;
    boundary.evidenceIds!.push(primary33DecisionId); boundary.reviewIds!.push(primary33DecisionId);
  }
  wholeNetworkModel.evidence!.find(record => record.id === `H10-${name}-PRIMARY`)!.summary = `The drawing depicts dual 33kV/22kV primary ratings. Owner decision ${primary33DecisionId} confirms the current ${name} input is connected to its 33kV primary. No selector device or 22kV input cable is represented.`;
  wholeNetworkModel.evidence!.find(record => record.id === `H10-${name}-TRANSFER`)!.summary = `Inference: depicted ${name} primary/secondary source-transfer pairs remain provisional candidates. The owner confirmed only the selected 33kV input configuration. Reverse/source transfer, possible 22kV winding coupling, independent earth continuity and NER/neutral/tank relationships remain unconfirmed; the 22kV terminal is not asserted dead.`;
}
for (const id of ['H10-Q01', 'CV-R01']) {
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = `Owner confirmed the current TF04 33kV feed and both TF420A/B selected 33kV inputs. Remaining unresolved: reconcile the conflicting CV006/SW41122kV depiction and shared-pole identities. This review does not establish a parallel supply or complete pole/hardware equivalence.`;
  review.evidenceIds.push(primary33DecisionId);
}
const windingReview = wholeNetworkModel.reviews!.find(review => review.id === 'H10-Q04')!;
windingReview.question = 'Both selected 33kV inputs are owner-confirmed. Confirm remaining winding source/reverse/22kV-coupling and independent earth policies, NER/neutral/tank relationships and 6.9/6.6kV label difference; input selection does not resolve those questions.';
windingReview.evidenceIds.push(primary33DecisionId);
wholeNetworkModel.evidence!.find(record => record.id === hopper10DecisionId)!.summary = 'Owner confirmed exactly: "the 33kV TF04 line feeds Hopper10". This resolves the current TF04 33kV source continuation at pole286 to RM420. Selected 33kV primary inputs are addressed separately by WN-H10-PRIMARY33-CONFIGURATION; CV006 shared-pole topology, source availability, all starting states, interlocks and winding transfer policies remain unconfirmed.';
for (const id of ['H10-SOURCE-CONFLICT', 'CV-HOPPER10-INTERFACE']) wholeNetworkModel.evidence!.find(record => record.id === id)!.summary = 'Drawing comparison: PL1/0003 depict the TF04 33kV pole286 feed; CV006 depicts a SW411 tier03 22kV route. Owner records WN-H10-TF04-SOURCE and WN-H10-PRIMARY33-CONFIGURATION confirm the current TF04 33kV feed and selected 33kV inputs. Remaining CV006 shared-pole identity and winding transfer/coupling policies are unconfirmed; no additional actual 22kV input is represented.';

const cv006DecisionId = 'WN-CV006-FEED-AND-REMOVED-H10';
const cv006Decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'Rm406 and Rm410 do get their 22kV from SW411 tier 03. The line coming off pole 49-38-1 to Hopper 10 does not exist anymore. It used to be 22kV to hopper 10 but now that is a 33kV line.' };
wholeNetworkModel.evidence!.push({
  id: cv006DecisionId, status: 'owner-confirmed', confirmation: cv006Decision,
  summary: 'Owner confirms the current RM406/RM410 22kV supply from SW411 tier03 and that the former 22kV branch off pole49-38-1 toward Hopper10 no longer exists. Former drawing-route continuity is removed from this model; old pole/switch references are retained separately for comparison. This does not establish old/new physical pole equivalence, which switch hardware remains, any actual device position, availability or interlock permission.',
  references: [main('D-G / 4-5, tier3 CV006 reference and SPARE aliases'), ref('CB19OP001B-04057-DR-EL-0001.pdf', '6 (28.01.25; AS FOUND 23.10.23)', 'A / 1-12, former22kV branch and current drawn RM406/RM410 routes'), ref('CB21OP055B-10016-DR-EL-0089.pdf', '0 (10.06.22; ISSUED FOR CONSTRUCTION)', 'C-G / 7-11, 33kV IOP route and pole286 Hopper10 branch')],
});
wholeNetworkModel.reviews!.push({ id: cv006DecisionId, status: 'resolved', question: 'Do RM406/RM410 receive 22kV from SW411 tier03, and is the former22kV branch off49-38-1 to Hopper10 still present? Scope excludes pole/hardware equivalence, positions and permissions.', evidenceIds: [cv006DecisionId], resolution: cv006Decision });
const cv006Join = wholeNetworkModel.connections.find(connection => connection.id === 'whole:join:cv006')!;
cv006Join.knowledge = 'owner-confirmed'; cv006Join.evidenceIds!.push(cv006DecisionId); cv006Join.reviewIds!.push(cv006DecisionId);
const cv006JoinReview = wholeNetworkModel.reviews!.find(review => review.id === 'WN-JOIN-cv006')!;
cv006JoinReview.question = 'SW411 tier03 to RM406/RM410 22kV supply is owner-confirmed. Remaining interface review: canonical CB/ES SPARE versus OHL aliases, installed switch hardware, positions and complete physical interlocks.';
cv006JoinReview.evidenceIds.push(cv006DecisionId);
for (const id of ['cv006:interface:sw411', 'rm406:bus', 'rm410:bus']) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.evidenceIds!.push(cv006DecisionId); asset.reviewIds!.push(cv006DecisionId);
}
const removedCv006Connections = new Set(['cv006:abs-branch-pole201', 'cv006:pole201-pole286', 'cv006:pole286-to-287', 'cv006:pole286-fused-branch', 'cv006:fused-abs286-hopper10', 'cv006:22kv-comparison-port']);
wholeNetworkModel.connections = wholeNetworkModel.connections.filter(connection => !removedCv006Connections.has(connection.id));
const formerCv006Ids = ['cv006:pole:201', 'cv006:pole:286', 'cv006:pole:287', 'cv006:fused-abs:286', 'cv006:interface:hopper10', 'cv006:interface:line-comparison'];
for (const [index, id] of formerCv006Ids.entries()) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.aliases = [...(asset.aliases ?? []), `Prior drawing caption: ${asset.label}`];
  asset.label = index < 3 ? `Former 22 kV · drawing pole ${['201', '286', '287'][index]}` : id.includes('fused-abs') ? 'Former 22 kV · fused ABS286 reference · hardware unconfirmed' : id.includes('line-comparison') ? 'Former 22 kV / 33 kV · comparison references · pole equivalence unconfirmed' : 'Former 22 kV · Hopper10 drawing endpoint';
  asset.knowledge = 'unresolved'; asset.evidenceIds!.push(cv006DecisionId); asset.reviewIds!.push(cv006DecisionId);
}
const branchAbs = wholeNetworkModel.assets.find(asset => asset.id === 'cv006:abs:49-38-1')!;
branchAbs.label = 'ABS49-38-1 drawing · downstream22kV line removed · hardware unconfirmed';
branchAbs.evidenceIds!.push(cv006DecisionId); branchAbs.reviewIds!.push(cv006DecisionId);
const removedCv006Boundaries = new Set(['cv006:interface:hopper10:coverage', 'cv006:interface:line-comparison:22kv:coverage', 'cv006:interface:line-comparison:33kv:coverage']);
wholeNetworkModel.boundaries = wholeNetworkModel.boundaries!.filter(boundary => !removedCv006Boundaries.has(boundary.id));
const h10FormerComparison = wholeNetworkModel.assets.find(asset => asset.id === 'rm420:comparison:cv00622')!;
h10FormerComparison.label = 'Former 22 kV · CV006 drawing comparison only';
h10FormerComparison.evidenceIds!.push(cv006DecisionId); h10FormerComparison.reviewIds!.push(cv006DecisionId);
const h10FormerCoverage = wholeNetworkModel.boundaries!.find(boundary => boundary.id === 'rm420:cv00622:coverage')!;
h10FormerCoverage.sourceCoverage = 'complete'; h10FormerCoverage.earthCoverage = 'unconfirmed'; h10FormerCoverage.knowledge = 'owner-confirmed';
h10FormerCoverage.label = 'Former22kV line is removed; comparison marker has no current incoming source; physical hardware/earth mapping remains unconfirmed';
h10FormerCoverage.evidenceIds!.push(cv006DecisionId); h10FormerCoverage.reviewIds!.push(cv006DecisionId);
for (const view of wholeNetworkModel.presentation!.views) {
  view.boundaries = view.boundaries?.filter(boundary => !removedCv006Connections.has(boundary.connectionId));
  for (const id of removedCv006Connections) if (view.layout.bends) delete view.layout.bends[id];
  if (view.id === 'cv006/overview' || view.id === 'cv006/overhead') view.assetIds = view.assetIds.filter(id => !formerCv006Ids.includes(id));
  if (view.id === 'cv006/overhead') view.label = 'CV006 · current22kV RMU routes / former branch stub';
}
const formerLayout: DiagramLayout = { assets: {}, terminals: {}, labelOffsets: {}, bends: {}, rotations: {} };
for (const [index, id] of formerCv006Ids.entries()) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  const point: [number, number] = [350 + (index % 2) * 850, 180 + Math.floor(index / 2) * 400];
  formerLayout.assets[id] = point; formerLayout.labelOffsets![id] = [0, 70];
  asset.terminals.forEach((terminal, terminalIndex) => { formerLayout.terminals[terminal] = [point[0] + terminalIndex * 40, point[1]]; });
}
wholeNetworkModel.presentation!.views.push({ id: 'cv006/former-hopper10-22', label: 'CV006 · Former 22 kV Hopper10 drawing references · no current line', assetIds: formerCv006Ids, bounds: [-60, -50, 1800, 1400], layout: formerLayout, boundaries: [] });
for (const id of ['CV-R01', 'H10-Q01']) {
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = 'Current TF04 33kV Hopper10 feed, both selected33kV primaries, SW411tier03 RM406/RM41022kV supply and removal of the former22kV H10 line are owner-confirmed. Remaining unresolved: old/new physical pole equivalence and extent/status of drawn switch hardware; do not infer those from shared names.';
  review.evidenceIds.push(cv006DecisionId);
}
for (const id of ['H10-SOURCE-CONFLICT', 'CV-HOPPER10-INTERFACE', 'CV-22-33-COMPARISON']) wholeNetworkModel.evidence!.find(record => record.id === id)!.summary = 'The former CV00622kV Hopper10 depiction is retained as superseded drawing evidence. Owner records confirm that line no longer exists, RM406/RM410 remain fed at22kV from SW411tier03, and current Hopper10 uses the TF04 33kV feed with selected33kV primary inputs. No physical identity merge of the old CV006 pole references with line33 poles is established; remaining hardware and winding policies stay unconfirmed.';

const incomingDecisionId = 'WN-SW411-INCOMING-ASSIGNMENT';
const incomingDecision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'TF11->IN03, TF12-> IN04. IN01 and IN02 are spares and not in use, they are currently not supplied from anywhere' };
wholeNetworkModel.evidence!.push({
  id: incomingDecisionId, status: 'owner-confirmed', confirmation: incomingDecision,
  summary: 'Owner confirms TF11 feeds SW411 IN03, TF12 feeds IN04, and IN01/IN02 are current spares with no incoming external supply. Original FUTURE TFX4 depictions are drawing references only. This confirms assignments and absence of incoming external sources at the two spare interfaces; it does not confirm breaker/earth positions, running generator availability, earth continuity or interlock permission. Internal backfeed possibilities are not removed by this source-boundary decision.',
  references: [station('B-D / SB01 F4 TF11 line2; F-G / SB02 F1 TF12 line1'), main('Upper source block and tiers6/7/10/11 incomers, FUTURE TFX4 aliases'), sld('2350', '16 (31.05.16)', 'Top SW411 IN01/IN02 FUTURE references'), ref('CB-10016-DR-EL-0010.pdf', '0 (27.10.25)', 'Upper-left TF11 above IN03'), ref('CB-10016-DR-EL-0011.pdf', '0 (27.10.25)', 'Upper-left TF12 above IN04')],
});
wholeNetworkModel.reviews!.push({ id: incomingDecisionId, status: 'resolved', question: 'Which station transformers feed IN03/IN04, and what current external supply/role applies at IN01/IN02? Scope excludes actual control states, generator availability, earth and interlocks.', evidenceIds: [incomingDecisionId], resolution: incomingDecision });
for (const [id, label] of [['tf11-in03', 'TF11 / OPF line2 to SW411 IN03'], ['tf12-in04', 'TF12 / OPF line1 to SW411 IN04']]) {
  const connection = wholeNetworkModel.connections.find(candidate => candidate.id === `whole:join:${id}`)!;
  connection.knowledge = 'owner-confirmed'; connection.evidenceIds!.push(incomingDecisionId); connection.reviewIds!.push(incomingDecisionId);
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === `WN-JOIN-${id}`)!;
  review.question = `Confirm ${label} assignment. This record is scoped to the connection identity, not availability, states or permission.`;
  review.status = 'resolved'; review.resolution = incomingDecision; review.evidenceIds.push(incomingDecisionId);
  wholeNetworkModel.evidence!.find(record => record.id === `WN-JOIN-${id}`)!.summary = `Drawing references for ${label}; current assignment is owner-confirmed by WN-SW411-INCOMING-ASSIGNMENT. Source availability, starting states and physical interlocks remain unconfirmed.`;
}
for (const id of ['in-01', 'in-02']) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === `sw411:${id}:interface`)!;
  asset.label = `${id.toUpperCase().replace('-', '')} · Spare · no incoming external supply`;
  asset.aliases = [...(asset.aliases ?? []), 'Drawing-only FUTURE TFX4 220kV/22kV reference; not a current connected source'];
  asset.knowledge = 'owner-confirmed'; asset.evidenceIds!.push(incomingDecisionId); asset.reviewIds!.push(incomingDecisionId);
  const boundary = wholeNetworkModel.boundaries!.find(candidate => candidate.id === `sw411:${id}:coverage`)!;
  boundary.sourceCoverage = 'complete'; boundary.earthCoverage = 'unconfirmed'; boundary.knowledge = 'owner-confirmed';
  boundary.label = `${id.toUpperCase().replace('-', '')} spare: owner confirms no incoming external supply; earth coverage and CB/ES states unconfirmed`;
  boundary.evidenceIds!.push(incomingDecisionId); boundary.reviewIds!.push(incomingDecisionId);
}
for (const [id, transformer] of [['in-03', 'TF11'], ['in-04', 'TF12']]) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === `sw411:${id}:interface`)!;
  asset.label = `${id.toUpperCase().replace('-', '')} · ${transformer} incoming interface`;
  asset.evidenceIds!.push(incomingDecisionId); asset.reviewIds!.push(incomingDecisionId);
}
for (const id of ['sw411:R001', 'station:R001']) {
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = 'Station-to-SW411 assignments and spare IN01/IN02 external-source absence are owner-confirmed. Remaining unresolved: generator/running-source availability and availability of the TF11/TF12 supplies. Starting device states and complete physical interlocks remain separate open reviews.';
  review.evidenceIds.push(incomingDecisionId);
}
const futureReview = wholeNetworkModel.reviews!.find(review => review.id === 'SW411-Q02')!;
futureReview.question = 'Current IN01/IN02 are confirmed spare and externally unsupplied. FUTURE TFX4 depictions remain drawing-only aliases, with no current transformer/source instantiated. Confirm any remaining historical-project reference/identity scope without treating it as a connected supply.';
futureReview.evidenceIds.push(incomingDecisionId);

const tier16DecisionId = 'WN-SW411-TIER16-TAGS';
const tier16Decision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'Good pickup, the Tier 16 should be CB RM721 FD01 and ES RM721 FD 01' };
wholeNetworkModel.evidence!.push({
  id: tier16DecisionId, status: 'owner-confirmed', confirmation: tier16Decision,
  summary: 'Owner-directed canonical model-tag correction only: SW411 tier16 is labelled CB RM721 FD01 and ES RM721 FD 01. Original SW454 labels are retained as drawn aliases/evidence. This is not a physical-nameplate inspection record and does not confirm the cable tag, complete installed route, positions, interlocks or source availability.',
  references: [main('D-G / 11-12, tier16 RM721 destination with printed SW454 CB/ES/cable labels'), ref('CB-10016-DR-EL-0011.pdf', '0 (27.10.25)', 'Upper-left SW411 tier16 CB/ES RM721 labels'), sld('2256', '3 (28.01.25; AS FOUND 23.10.23)', 'B-D / 6-7, reciprocal RM721 incoming and RM721-P-01 cable tag')],
});
wholeNetworkModel.reviews!.push({ id: tier16DecisionId, status: 'resolved', question: 'Which canonical model labels should be used for the SW411 tier16 breaker and earth switch? This correction does not resolve physical nameplates, cable or whole-route scope.', evidenceIds: [tier16DecisionId], resolution: tier16Decision });
for (const [id, label] of [['sw411:tier-16:cb', 'CB RM721 FD01'], ['sw411:tier-16:es', 'ES RM721 FD 01']]) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.label = label; asset.aliases = [...new Set([...(asset.aliases ?? []), label])];
  asset.evidenceIds!.push(tier16DecisionId); asset.reviewIds!.push(tier16DecisionId);
}
for (const id of ['sw411:tier-16:interface', 'services:interface:sw411']) {
  const asset = wholeNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.evidenceIds!.push(tier16DecisionId); asset.reviewIds!.push(tier16DecisionId);
  if (id.startsWith('services:')) asset.label = 'SW411 tier16 / RM721 · cable / route unconfirmed';
}
for (const id of ['R002', 'SV-Q01', 'WN-JOIN-rm721']) {
  const review = wholeNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = 'Tier16 canonical model labels are owner-corrected to CB RM721 FD01 and ES RM721 FD 01. Remaining unresolved: accepted cable tag (SW454-P-01 versus RM721-P-01), physical identity verification and current-route acceptance beyond the reciprocal drawing references. No physical-nameplate inspection, baseline or interlock permission is recorded by the tag correction.';
  review.evidenceIds.push(tier16DecisionId);
}
wholeNetworkModel.evidence!.find(record => record.id === 'WN-JOIN-rm721')!.summary = 'Reciprocal SW411 tier16/RM721 drawing route remains provisional. Owner decision WN-SW411-TIER16-TAGS corrects only the canonical CB/ES model tags; cable identity, complete current-route acceptance, actual states and physical interlocks remain unconfirmed. Original SW454 and RM721 cable/tag depictions are retained.';

const proxy = wholeNetworkModel.assets.find(asset => asset.id === 'rm410:interface:rm419')!;
proxy.conductivePairs = []; proxy.sourcePairs = []; proxy.earthPairs = [];
proxy.evidenceIds = [...(proxy.evidenceIds ?? []), 'WN-JOIN-hopper9'];
proxy.reviewIds = [...(proxy.reviewIds ?? []), 'WN-JOIN-hopper9'];
wholeNetworkModel.connections = wholeNetworkModel.connections.filter(connection => connection.id !== 'rm410:rm419-through-rm418');
for (const view of wholeNetworkModel.presentation!.views) if (view.layout.bends) delete view.layout.bends['rm410:rm419-through-rm418'];

const owners = new Map(wholeNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
const areaOf = new Map(packages.flatMap(area => area.model.assets.map(asset => [asset.id, area.key] as const)));
const crossArea = wholeNetworkModel.connections.filter(connection => connection.id.startsWith('whole:join:'));
const detailViews = wholeNetworkModel.presentation!.views;
wholeNetworkModel.reviews!.push({
  id: 'WN-OWNER-ACCEPTANCE', status: 'open',
  question: 'Owner acceptance remains pending: reconcile all interfaces and acceptance-blocking discrepancies or expressly decide their model boundaries; account for every supplied PDF and final LV gap; review every source, device position and physical interlock; explicitly accept the starting configuration and this immutable whole-network version. Software construction and tests are not installed-network acceptance.',
  evidenceIds: packages.map(area => `WN-AREA-${area.key}`),
});
function destination(assetId: string) {
  const area = areaOf.get(assetId)!;
  return detailViews.find(view => view.id.startsWith(`${area}/`) && view.assetIds.includes(assetId))!.id;
}
// A navigation stub is drawing geometry only; the cross-area connection above is
// the sole electrical relationship. Existing area coordinates/targets are kept.
for (const view of detailViews) for (const connection of crossArea) {
  const from = owners.get(connection.from)!; const to = owners.get(connection.to)!;
  if (view.assetIds.includes(from) === view.assetIds.includes(to)) continue;
  const local = view.assetIds.includes(from) ? connection.from : connection.to;
  const remote = local === connection.from ? connection.to : connection.from;
  const remoteAssetId = owners.get(remote)!;
  const [x, y] = view.layout.terminals[local]; const [left, top, width, height] = view.bounds;
  const position: [number, number] = [Math.max(left + 30, Math.min(left + width - 30, x + 120)), Math.max(top + 30, Math.min(top + height - 30, y - 70))];
  view.layout.terminals[remote] = position;
  (view.boundaries ??= []).push({ connectionId: connection.id, remoteAssetId, targetViewId: destination(remoteAssetId), position });
}

const representatives: Record<string, string> = {
  sw411: 'sw411:bus-a', station: 'station:sb01:bus', 'crushing-1': 'sw431:bus', 'crushing-2': 'sw435:bus',
  screening: 'sw421:bus', desands: 'sw426:bus', stockpile: 'sw454:bus', 'train-loading': 'sw451:bus',
  cv006: 'rm406:bus', western: 'wh:h1:rm417:bus', services: 'rm721:bus', 'hopper-10': 'rm420:bus', 'mine-camp': 'camp:rm700:bus',
};
const cells: Record<string, [number, number]> = {
  station: [0, 0], 'mine-camp': [1, 0], 'hopper-10': [3, 0], sw411: [0, 1], stockpile: [1, 1], 'train-loading': [2, 1],
  cv006: [0, 2], western: [1, 2], services: [2, 2], 'crushing-1': [0, 3], 'crushing-2': [1, 3], desands: [2, 3], screening: [3, 3],
};
const regionLabels: Record<string, string> = {
  sw411: 'SW411\nMain switchroom', station: 'Power station\n33 kV line', 'crushing-1': 'Crushing 1', 'crushing-2': 'Crushing 2\nHPGR',
  screening: 'Screening', desands: 'Desands\nLaboratory', stockpile: 'Stockpile\nWet plant', 'train-loading': 'Train loading',
  cv006: 'CV006\nHead / tail', western: 'Western hoppers\n1 / 3 / 7 / 8 / 9', services: 'Services\nWorkshop / conveyor',
  'hopper-10': 'Hopper 10\nTF04 33 kV', 'mine-camp': 'Mine / camp',
};
const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {}, rotations: {}, labelOffsets: {} };
const overviewIds: string[] = [];
for (const area of packages) {
  const [column, row] = cells[area.key]; const x = column * 1100; const y = row * 1000;
  const endpoints = [...new Set(crossArea.flatMap(connection => [owners.get(connection.from)!, owners.get(connection.to)!]).filter(id => areaOf.get(id) === area.key))];
  const ids = [representatives[area.key], ...endpoints.filter(id => id !== representatives[area.key])];
  for (const [index, id] of ids.entries()) {
    const point: [number, number] = index === 0 ? [x + 500, y + 350] : [x + 230 + ((index - 1) % 2) * 550, y + 500 + Math.floor((index - 1) / 2) * 90];
    overviewIds.push(id); layout.assets[id] = point; layout.labelOffsets![id] = [0, -40];
    const asset = wholeNetworkModel.assets.find(asset => asset.id === id)!;
    asset.terminals.forEach((terminal, terminalIndex) => { layout.terminals[terminal] = [point[0] + terminalIndex * 30, point[1]]; });
    if (asset.kind === 'bus') layout.rotations![id] = 90;
  }
}
const overview: DiagramView = {
  id: 'whole/overview', label: 'Whole network orientation · unresolved construction', assetIds: overviewIds, layout, bounds: [-80, -80, 4540, 4110], boundaries: [],
  regions: packages.map(area => ({ id: area.key, label: regionLabels[area.key], bounds: [cells[area.key][0] * 1100 + 20, cells[area.key][1] * 1000, 1060, 950], targetViewId: `${area.key}/${area.model.presentation!.overviewId}` })),
};
for (const connection of crossArea) {
  const from = layout.terminals[connection.from]; const to = layout.terminals[connection.to];
  layout.bends![connection.id] = [[from[0], (from[1] + to[1]) / 2], [to[0], (from[1] + to[1]) / 2]];
  const remoteAssetId = owners.get(connection.to)!;
  overview.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: destination(remoteAssetId), position: [to[0] + 45, to[1] + 30] });
}
wholeNetworkModel.presentation = { overviewId: overview.id, views: [overview, ...detailViews] };
