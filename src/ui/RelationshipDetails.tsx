import type { Asset, NetworkModel } from '../session/model';
import { isSupported } from '../session/evidence';
import { describeDeviceState } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import { EvidenceReferences } from './EvidenceReferences';

const claimLabels = { supported: 'Supported by evidence', provisional: 'Unconfirmed — provisional interpretation', unresolved: 'Unconfirmed — unresolved question', 'owner-confirmed': 'Owner-confirmed decision' };
type SourceArc = NonNullable<Asset['sourceArcs']>[number];

function SourceArcDetails({ arc, asset, model }: { arc: SourceArc; asset: Asset; model: NetworkModel }) {
  const reviews = (model.reviews ?? []).filter(review => arc.reviewIds?.includes(review.id));
  const evidenceIds = new Set([...(arc.evidenceIds ?? []), ...reviews.flatMap(review => review.evidenceIds)]);
  const records = (model.evidence ?? []).filter(record => evidenceIds.has(record.id));
  return <article aria-label={`Directed source arc ${arc.id}`}>
    <h4>{arc.from} → {arc.to}</h4>
    <p>Arc {arc.id}: {arc.knowledge ? claimLabels[arc.knowledge] : model.synthetic ? 'Synthetic model data' : 'Unconfirmed — status not recorded'}.</p>
    {!isSupported(model, asset) && <p>Unconfirmed source transfer: the asset claim is unconfirmed.</p>}
    {records.length > 0 && <details><summary>Arc evidence ({records.length} records)</summary>{records.map(record => <article key={record.id}>
      <h4>{record.id} · {claimLabels[record.status]}</h4><p>{record.summary}</p><EvidenceReferences references={record.references} />
      {record.confirmation && <p>Confirmed by {record.confirmation.by}, {record.confirmation.date}: {record.confirmation.decision}</p>}
    </article>)}</details>}
    {reviews.length > 0 && <details><summary>Arc review questions ({reviews.length})</summary>{reviews.map(review => <article key={review.id}>
      <h4>{review.id} · {review.status === 'open' ? 'Unconfirmed: review open' : 'Resolved review'}</h4><p>{review.question}</p>
      {review.resolution && <p>{review.resolution.by}, {review.resolution.date}: {review.resolution.decision}</p>}
    </article>)}</details>}
    {!records.length && !reviews.length && <p>No evidence or review record is linked to this arc.</p>}
  </article>;
}

export function RelationshipDetails({ asset, positionId, model }: { asset: Asset; positionId: DeviceState | undefined; model: NetworkModel }) {
  if (asset.removableBreaker) return <section aria-label="Declared terminal relationships"><h3>Declared main pair</h3><p>{asset.removableBreaker.mainPair.join(' ↔ ')} conducts only with Contact Closed and Rack In. Unknown axes retain only compatible possibilities.</p><p>{describeDeviceState(positionId)}</p><p>Independent fixed earth relationships remain separate: {(asset.earthPairs ?? []).map(pair => pair.join(' ↔ ')).join('; ') || 'None declared'}.</p></section>;
  const arcs = asset.sourceArcs ?? [];
  if (!arcs.length && asset.sourcePairs === undefined && asset.earthPairs === undefined && !asset.positions.some(position => position.sourcePairs !== undefined || position.earthPairs !== undefined)) return null;
  const position = asset.positions.find(position => position.id === positionId);
  const pairs = (items: [string, string][] | undefined) => items?.length ? items.map(([a, b]) => `${a} ↔ ${b}`).join('; ') : 'None declared';
  return <section aria-label="Declared terminal relationships">
    <h3>Declared terminal relationships</h3>
    <p>{arcs.length ? 'Arrows show each declared source-transfer direction. Bidirectional pairs and earth continuity are listed separately.' : 'These relationships are bidirectional in this model. Source transfer and earth continuity are recorded separately.'}</p>
    <dl className="identity-rows"><div><dt>{arcs.length ? 'Bidirectional source pairs' : 'Fixed source transfer'}</dt><dd>{pairs(asset.sourcePairs)}</dd></div><div><dt>Fixed earth continuity</dt><dd>{pairs(asset.earthPairs)}</dd></div></dl>
    {arcs.length > 0 && <section aria-label="Directed source transfers"><h4>Directed source transfers</h4>{arcs.map(arc => <SourceArcDetails key={arc.id} arc={arc} asset={asset} model={model} />)}</section>}
    {asset.positions.length > 0 && (position ? <><h4>{position.label}</h4><dl className="identity-rows"><div><dt>Position source transfer</dt><dd>{pairs(position.sourcePairs)}</dd></div><div><dt>Position earth continuity</dt><dd>{pairs(position.earthPairs)}</dd></div></dl></> : <p>Position unconfirmed; inspect the uncertainty results.</p>)}
  </section>;
}
