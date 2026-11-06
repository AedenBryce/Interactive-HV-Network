import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import audit from '../../../drawing-review/supplemental/transformer-direction-audit.json';

const policyId = 'WN-TRANSFORMER-FORWARD-POLICY';
const inputsId = 'WN-ABSTRACT-INPUT-MODEL-SELECTION';
const answer25 = 'For this model, transformers should be assumed to have connectivity between primary and secondary windings in the sense that if the primary winding is energisd, the secondary will also be energised.';
const answer28 = 'Transformer should only be supplied from the Primary, but if there is a ring supply that energises the secondary of the transformer and that is energisd then it should show that so its clear that the isolations are not safe for the transformer.';
const answer27 = 'all three supplies available, IN03 and IN04 closed, Bus tie Open.';
const cutAnswer = 'At its SB01/SB02 feeder breaker, retaining that feeder and transformer but excluding station buses, generators and other feeders';
const inputs = [
  { id: 'boundary:tf11', from: 'boundary:tf11:port', to: 'station:sb01:f4:cb:in' },
  { id: 'boundary:tf12', from: 'boundary:tf12:port', to: 'station:sb02:f1:cb:in' },
  { id: 'boundary:tf04', from: 'boundary:tf04:port', to: 'station:sb02:f4:cb:in' },
] as const;
const hopperPrimaries = [
  { assetId: 'rm420:tf420a', selected: 'rm420:tf420a:primary33', unselected: 'rm420:tf420a:primary22', output: 'rm420:tf420a:secondary', joinId: 'whole:primary33:tf420a', input: 'rm420:tf420a:primary-connection:port' },
  { assetId: 'rm420:tf420b', selected: 'rm420:tf420b:primary33', unselected: 'rm420:tf420b:primary22', output: 'rm420:tf420b:secondary', joinId: 'whole:primary33:tf420b', input: 'rm420:tf420b:primary-connection:port' },
] as const;
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/** Apply the selected source-transfer policy only; preserve physical and earth claims. */
export function withOwnerTransformerTransfers(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === policyId || record.id === inputsId)) throw new Error('Transformer transfer policy already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  const transformers = model.assets.filter(asset => asset.kind === 'transformer');
  if (audit.records.length !== 60 || audit.summary.storedSourcePairCount !== 87 || transformers.length !== 60
    || new Set(audit.records.map(record => record.assetId)).size !== 60
    || transformers.some(asset => !audit.records.some(record => record.assetId === asset.id))) throw new Error('Review required: audited transformer identity inventory changed.');
  for (const selected of hopperPrimaries) {
    const confirmation = model.evidence?.find(record => record.id === 'WN-H10-PRIMARY33-CONFIGURATION');
    const join = model.connections.find(connection => connection.id === selected.joinId);
    const role = audit.records.find(record => record.assetId === selected.assetId);
    if (confirmation?.status !== 'owner-confirmed' || !confirmation.confirmation || join?.knowledge !== 'owner-confirmed'
      || !join.evidenceIds?.includes(confirmation.id) || join.from !== selected.input || join.to !== selected.selected
      || !same(role?.primaryTerminals, [selected.selected, selected.unselected]) || !same(role?.secondaryTerminals, [selected.output])) throw new Error(`Review required: owner-selected Hopper 10 primary mapping changed for ${selected.assetId}.`);
  }
  const policyReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answers25/28: exact quotes retained in confirmation.decision. Select primary-to-secondary source connectivity for this model and show externally supplied secondaries. Reverse onto primary, inter-secondary/inter-primary transfer, installed winding identities and independent earth relationships are not confirmed. Connectivity is not an operational safe/unsafe declaration.' };
  const auditReference = { document: 'drawing-review/supplemental/transformer-direction-audit.json', revision: audit.auditVersion, clause: 'Exact 60 transformer identities, 87 original source pairs, explicit primary/secondary construction roles and per-asset drawing/revision/page/regions; no role inferred from tuple ordering.' };
  const policyConfirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: `${answer25}\n${answer28}` };
  (model.evidence ??= []).push({ id: policyId, status: 'owner-confirmed', confirmation: policyConfirmation, references: [policyReference, auditReference], summary: 'Owner-selected forward source-connectivity policy only, applied to source-referenced construction roles. An externally supplied secondary remains visible. Reverse transfer onto primary is Unconfirmed. This does not verify installed winding/earthing behavior, establish direct secondary/primary cross-links, approve physical interlocks, report live state or declare an isolation safe/unsafe.' });
  (model.reviews ??= []).push({ id: policyId, status: 'resolved', question: 'Selected V1 forward source-connectivity policy only. Reverse and installed winding/earth behavior remain separate open reviews.', evidenceIds: [policyId], resolution: policyConfirmation });
  let known = 0; let unresolved = 0; let originalPairs = 0;
  for (const record of audit.records) {
    const asset = transformers.find(asset => asset.id === record.assetId)!;
    const roleTerminals = [...record.primaryTerminals, ...record.secondaryTerminals];
    if (!same(asset.terminals, record.terminals) || !same(asset.sourcePairs, record.sourcePairs) || asset.sourceArcs !== undefined
      || !same(asset.earthPairs, record.earthPairs) || !same(asset.conductivePairs, record.conductivePairs)
      || asset.knowledge !== record.assetKnowledge || asset.positions.length || asset.removableBreaker || record.openRoleQuestion !== null
      || new Set(roleTerminals).size !== roleTerminals.length || roleTerminals.length !== asset.terminals.length
      || roleTerminals.some(terminal => !asset.terminals.includes(terminal))
      || record.originalEvidenceIds.some(id => !asset.evidenceIds?.includes(id) || !model.evidence?.some(evidence => evidence.id === id))
      || record.originalReviewIds.some(id => !asset.reviewIds?.includes(id))
      || record.sourceReferences.length === 0 || record.sourceReferences.some(reference => !record.originalEvidenceIds.some(id => model.evidence?.find(evidence => evidence.id === id)?.references.some(actual => same(actual, reference))))
      || record.sourcePairs.length !== record.forwardPolicyCandidates.length
      || record.sourcePairs.some(pair => record.forwardPolicyCandidates.filter(candidate => pair.includes(candidate.from) && pair.includes(candidate.to)).length !== 1)
      || record.forwardPolicyCandidates.some(candidate => !record.primaryTerminals.includes(candidate.from) || !record.secondaryTerminals.includes(candidate.to))) throw new Error(`Review required: exact transformer role/pair mapping changed for ${asset.id}.`);
    originalPairs += record.sourcePairs.length;
    const rolesId = `${policyId}:roles:${asset.id}`; const unknownId = `${policyId}:unconfirmed:${asset.id}`;
    const references = uniqueReferences([auditReference, ...record.sourceReferences]);
    model.evidence.push(
      { id: rolesId, status: 'provisional', references, summary: `${record.roleMappingStatus} ${record.builder.binding} Primary inputs: ${record.primaryTerminals.join(', ')}. Secondary outputs: ${record.secondaryTerminals.join(', ')}. This maps construction terminals to existing drawing roles; it does not accept installed/nameplate identities, complete source/backfeed behavior or independent earth relationships.` },
      { id: unknownId, status: 'unresolved', references, summary: 'Existing bidirectional source-pair candidates are preserved as explicit unresolved reverse arcs. Reverse onto a primary and any induced inter-secondary/inter-primary transfer remain Unconfirmed. Hopper 10 alternate 22 kV forward transfer also remains Unconfirmed. There is no newly declared direct secondary-secondary or primary-primary relationship.' },
    );
    model.reviews.push({ id: unknownId, status: 'open', question: `For ${asset.id}, reverse transfer onto a primary, any inter-secondary/inter-primary relationship, installed winding binding and independent earth behavior remain Unconfirmed. Existing source-specific reviews are retained.`, evidenceIds: [policyId, rolesId, unknownId, ...record.originalEvidenceIds] });
    asset.sourceArcs = record.forwardPolicyCandidates.flatMap((candidate, index) => {
      const alternate = hopperPrimaries.some(primary => primary.assetId === asset.id && primary.unselected === candidate.from && primary.output === candidate.to);
      if (alternate) unresolved++; else known++;
      unresolved++;
      const evidenceIds = [policyId, rolesId, ...record.originalEvidenceIds];
      const reviewIds = [policyId, ...record.originalReviewIds];
      return [
        { id: `${asset.id}:owner-transfer:forward-${index + 1}`, from: candidate.from, to: candidate.to, supportScope: 'relationship' as const, knowledge: alternate ? 'unresolved' as const : 'owner-confirmed' as const, evidenceIds: alternate ? [...evidenceIds, unknownId] : evidenceIds, reviewIds: alternate ? [...reviewIds, unknownId] : reviewIds },
        { id: `${asset.id}:owner-transfer:reverse-${index + 1}`, from: candidate.to, to: candidate.from, supportScope: 'relationship' as const, knowledge: 'unresolved' as const, evidenceIds: [...evidenceIds, unknownId], reviewIds: [...reviewIds, unknownId] },
      ];
    });
    // Remove the legacy bidirectional representation only after the exact role
    // and pair guard above; historical inputs remain detached and unchanged.
    asset.sourcePairs = [];
  }
  if (originalPairs !== 87 || known !== 85 || unresolved !== 89) throw new Error('Review required: selected transformer forward/reverse inventory changed.');
  const scope = model.evidence.find(record => record.id === 'BATTERY-STATION-SCOPE');
  const baseline = model.evidence.find(record => record.id === 'WN-OWNER-STARTING-CONFIGURATION');
  if (scope?.status !== 'owner-confirmed' || baseline?.status !== 'owner-confirmed' || model.sources.length !== 3
    || model.sources.some(source => !inputs.some(input => input.id === source.id))) throw new Error('Review required: owner-selected abstract supply inventory or scope evidence changed.');
  const inputReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer27 selects all three abstract supplies available for this model, not live supply or independent physical generation; exact answer retained in confirmation.decision. Separate 22 October battery-limit answer: ${cutAnswer}. That earlier scope record fixes the modeled attachment ports. External coupling/backfeed and source/earth coverage remain Unconfirmed.` };
  const inputConfirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer27 };
  model.evidence.push({ id: inputsId, status: 'owner-confirmed', confirmation: inputConfirmation, references: uniqueReferences([inputReference, ...(scope.references ?? []), ...(baseline.references ?? [])]), summary: 'Owner-selected MODELED inputs only: boundary:tf11 / tf12 / tf04 attach to their existing retained feeder-breaker input terminals. This establishes those three source claims and software input links for the selected available teaching supplies. Source assets stay provisional; no physical generator, outside coupling, independence, source/earth coverage or actual availability is established.' });
  model.reviews.push({ id: inputsId, status: 'resolved', question: 'Selected abstract teaching-supply claims and exact software feeder-input links only. External topology/coupling, actual availability and independent earth coverage remain open.', evidenceIds: [inputsId, scope.id, baseline.id], resolution: inputConfirmation });
  for (const input of inputs) {
    const source = model.sources.find(source => source.id === input.id)!;
    const sourceAsset = model.assets.find(asset => asset.id === input.id);
    const connection = model.connections.find(connection => connection.id === `${input.id}:feeder-input`);
    if (source.assetId !== input.id || source.terminal !== input.from || source.knowledge !== 'provisional'
      || sourceAsset?.kind !== 'source' || sourceAsset.knowledge !== 'provisional' || !same(sourceAsset.terminals, [input.from])
      || connection?.from !== input.from || connection.to !== input.to || connection.knowledge !== 'provisional'
      || !source.evidenceIds?.includes('BATTERY-STATION-REPRESENTATION') || !connection.evidenceIds?.includes('BATTERY-STATION-REPRESENTATION')
      || !model.assets.some(asset => asset.id === input.to.slice(0, -3) && asset.terminals.includes(input.to))
      || model.starting.sources[input.id] !== true) throw new Error(`Review required: exact modeled supply/input mapping or selected availability changed for ${input.id}.`);
    for (const claim of [source, connection]) {
      claim.knowledge = 'owner-confirmed';
      claim.evidenceIds = [...(claim.evidenceIds ?? []), inputsId];
      claim.reviewIds = [...(claim.reviewIds ?? []), inputsId];
    }
  }
  return model;
}
