import { useState } from 'react';
import type { Asset, NetworkModel } from '../session/model';
import type { AssetConnectivity } from '../session/session';
import { EvidenceReferences } from './EvidenceReferences';
import './evidence.css';
import { currentReviewUpdates } from './review-updates';

const labels = { supported: 'Supported by evidence', provisional: 'Unconfirmed — provisional interpretation', unresolved: 'Unconfirmed — unresolved question', 'owner-confirmed': 'Owner-confirmed decision' };

export function EvidenceDetails({ model, asset, connectivity }: { model: NetworkModel; asset: Asset; connectivity: AssetConnectivity }) {
  const [connectionId, setConnectionId] = useState('');
  const incident = model.connections.filter(connection => asset.terminals.includes(connection.from) || asset.terminals.includes(connection.to));
  const connection = model.connections.find(connection => connection.id === connectionId) ?? incident[0];
  const subjects = [asset, ...(connection ? [connection] : [])];
  const reviewIds = new Set([...connectivity.reviewIds, ...subjects.flatMap(subject => subject.reviewIds ?? [])]);
  const reviews = (model.reviews ?? []).filter(review => reviewIds.has(review.id));
  const evidenceIds = new Set([...connectivity.evidenceIds, ...subjects.flatMap(subject => subject.evidenceIds ?? []), ...reviews.flatMap(review => review.evidenceIds)]);
  const records = (model.evidence ?? []).filter(record => evidenceIds.has(record.id));
  const updates = currentReviewUpdates(model);
  return <section className="evidence-details" aria-label="Model evidence and review">
    <h3>Model evidence and review</h3>
    <p>{asset.knowledge ? labels[asset.knowledge] : model.synthetic ? 'Synthetic model data' : 'Unconfirmed — status not recorded'}</p>
    {model.connections.length > 0 && <details><summary>Connection evidence</summary><label>Inspect connection<select aria-label="Inspect connection" value={connection?.id ?? ''} onChange={event => setConnectionId(event.target.value)}>{model.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.id}</option>)}</select></label>{connection && <div className="connection-evidence"><strong>{connection.id}</strong><p>{connection.from} → {connection.to}</p><p>{connection.knowledge ? labels[connection.knowledge] : model.synthetic ? 'Synthetic model data' : 'Unconfirmed — status not recorded'}</p></div>}</details>}
    {records.length > 0 && <details><summary>Related evidence ({records.length} records)</summary>{records.map(record => <article key={record.id}><h4>{labels[record.status]}</h4><p>{record.summary}</p><EvidenceReferences references={record.references} />{record.confirmation && <p>Confirmed by {record.confirmation.by}, {record.confirmation.date}: {record.confirmation.decision}</p>}</article>)}</details>}
    {reviews.length > 0 && <details><summary>Review topics and history ({reviews.length})</summary><p>Open topics can cover installation, source/earth behavior or acceptance. The current state and local interlock status are shown above.</p>{reviews.map(review => <article key={review.id}><h4>{review.id} — {review.status === 'open' ? 'Open review topic' : 'Resolved review'}</h4>{updates.has(review.id) ? <><p className="review-update">{updates.get(review.id)}</p><details><summary>Original construction wording · superseded for V1 states and local profiles</summary><p>{review.question}</p></details></> : <p>{review.question}</p>}{review.resolution && <p>{review.resolution.by}, {review.resolution.date}: {review.resolution.decision}</p>}</article>)}</details>}
    {!records.length && !reviews.length && <p>No evidence or review record is linked to this selection.</p>}
  </section>;
}
