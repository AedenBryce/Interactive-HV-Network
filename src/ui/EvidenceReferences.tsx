import type { EvidenceReference } from '../session/evidence';

export function EvidenceReferences({ references }: { references: EvidenceReference[] }) {
  return <ul className="evidence-references">{references.map((reference, index) => <li key={index}>{reference.document}{reference.revision ? `, revision ${reference.revision}` : ''}{reference.clause ? `, clause ${reference.clause}` : ''}{reference.page ? `, page ${reference.page}` : ''}</li>)}</ul>;
}
