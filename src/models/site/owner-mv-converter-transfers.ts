import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import { mvDriveBindings } from './owner-mv-drive-scope';

const policyId = 'WN-MV-CONVERTER-FORWARD-POLICY';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/** Owner80 forward source transfer only; all AC/DC/output earth groups stay separate. */
export function withOwnerMvConverterTransfers(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Converter transfer changes require a new immutable version.');
  if (base.evidence?.some(record => record.id === policyId)) throw new Error('Converter source policy already applied.');
  const scope = base.evidence?.find(record => record.id === 'WN-MV-DRIVE-SCOPE');
  if (scope?.status !== 'owner-confirmed' || scope.confirmation?.decision !== 'Include converter-to-motor connectivity'
    || !base.reviews?.some(review => review.id === scope.id && review.status === 'resolved')) throw new Error('Review required: exact owner79 MV-drive scope selection missing.');
  const model = { ...structuredClone(base), version };
  const ownerRef = { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer80 exact: confirmed. Complete question: either energized AC input supplies DC, which supplies output; downstream contacts retain interruption. Forward source transfer only, without metallic/earth continuity between AC/DC/output; reverse Unconfirmed. No run controls/calculations/stored energy/discharge. Supplied closed DC earth reports conflict, never silently removes supply. This selects a teaching rule, not verified converter behavior. Exact record: drawing-review/supplemental/owner-electrical-policy-review.md.' };
  const refs: EvidenceReference[] = [ownerRef, ...scope.references];
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(link => link.id === id);
    const references = (link?.evidenceIds ?? []).flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
    if (link?.from !== from || link.to !== to || !references.length) throw new Error(`Review required: exact converter branch ${id} changed.`);
    refs.push(...references);
  };
  for (const [index, drive] of mvDriveBindings.entries()) {
    const asset = model.assets.find(asset => asset.id === drive.converter);
    if (!asset || asset.kind !== 'interface' || !asset.evidenceIds?.includes(scope.id) || !same(asset.terminals, [...drive.inputs, drive.dc, drive.output])
      || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined || asset.positions.length
      || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector) throw new Error(`Review required: exact uncoupled converter ${drive.converter} changed.`);
    const hpgr = index < 2; const prefix = drive.converter.slice(0, -10);
    const transformer = hpgr ? index === 0 ? 'hpgr:tf003' : 'hpgr:tf002' : `sw505:tf505${['a', 'b', 'c'][index - 2]}`;
    drive.inputs.forEach((terminal, input) => branch(hpgr ? `${transformer}:${input === 0 ? 'star' : 'delta'}-to-converter` : `${prefix}:ac-${input === 0 ? 'd' : 'y'}-cable`, `${transformer}:${hpgr ? input === 0 ? 'ac-star' : 'ac-delta' : input === 0 ? 'mv-d' : 'mv-y'}`, terminal));
    branch(`${prefix}:dc-earth:branch`, drive.dc, `${prefix}:dc-earth:a`);
    if (hpgr) {
      branch(`${prefix}:inverter-to-outlet`, drive.output, `${prefix}:outlet:vsd`);
      branch(`hpgr:cable-CR005${index === 0 ? 'MEB' : 'MEA'}-P-01`, `${prefix}:outlet:motor`, `${drive.motor}:port`);
    } else {
      branch(`${prefix}:inverter-output-contact`, drive.output, `${prefix}:output-switch:a`);
      branch(`${prefix}:motor-power-cable`, `${prefix}:output-switch:b`, `${drive.motor}:port`);
    }
    const originalEvidence = [...asset.evidenceIds];
    const pairs = [...drive.inputs.map(input => ({ from: input, to: drive.dc })), { from: drive.dc, to: drive.output }];
    asset.sourceArcs = pairs.map((pair, number) => ({ id: `${policyId}:${asset.id}:${number + 1}`, ...pair, supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: [policyId, scope.id, ...originalEvidence], reviewIds: [policyId, ...(asset.reviewIds ?? [])] }));
    asset.aliases = [...new Set([...(asset.aliases ?? []), asset.label])];
    asset.label = `${hpgr ? index === 0 ? 'VS-CR005MEB' : 'VS-CR005MEA' : `VS505${['01', '02', '03'][index - 2]}`}\nForward source rule selected\nReverse / earth transfer unconfirmed`;
    asset.evidenceIds = [...originalEvidence, policyId]; asset.reviewIds = [...(asset.reviewIds ?? []), policyId];
    const motor = model.assets.find(candidate => candidate.id === drive.motor)!;
    if (motor.label.includes('transfer under review')) {
      motor.aliases = [...new Set([...(motor.aliases ?? []), motor.label])];
      motor.label = motor.label.replace('transfer under review', 'forward source rule selected');
    }
  }
  for (const [id, label] of [
    ['crushing-2/hpgr-drives', 'Crushing 2 / HPGR · MV converters and motors · selected forward source model'],
    ['stockpile/mv-drives', 'Stockpile / wet plant · MV scrubber drives and motors · selected forward source model'],
  ]) {
    const view = model.presentation?.views.find(view => view.id === id);
    if (!view) throw new Error(`Review required: selected converter view ${id} missing.`);
    view.label = label;
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'confirmed' };
  (model.evidence ??= []).push({ id: policyId, status: 'owner-confirmed', confirmation, references: [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()], summary: 'Owner80 selects15 exact forward source-transfer claims across five converters: each of two AC inputs to DC, then DC to output. Either supplied input suffices in this teaching model. Existing output contacts/outlets retain control of the motor route. No metallic or earth-continuity links, reverse transfer, automatic run state, stored energy/discharge or calculations are introduced. Closed supplied DC earths remain conflicts, not supply-removal commands. Parent metadata and unknown coverage remain separate; whole-model acceptance is open.' });
  (model.reviews ??= []).push({ id: policyId, status: 'resolved', question: 'Selected simplified forward converter source transfer only. Reverse/earth behavior, stored energy/discharge and actual behavior remain Unconfirmed.', evidenceIds: [policyId, scope.id], resolution: confirmation });
  return model;
}
