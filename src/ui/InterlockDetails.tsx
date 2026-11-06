import type { SwitchingStatus } from '../session/interlocks';
import './interlocks.css';

const reviewLabels: Record<SwitchingStatus['reviewStatus'], string> = {
  'confirmed-none': 'Reviewed: no additional local interlocks',
  'confirmed-rules': 'Reviewed interlock conditions',
  unresolved: 'Unresolved interlock',
  unconfirmed: 'Interlock review unconfirmed',
};

export function InterlockDetails({ status }: { status: SwitchingStatus }) {
  const unresolved = status.reviewStatus === 'unresolved' || status.reviewStatus === 'unconfirmed';
  return <section className={`interlock-details${unresolved ? ' unresolved' : ''}`} aria-label="Physical interlocks">
    <h3>{reviewLabels[status.reviewStatus]}</h3>
    <p>{status.note}</p>
    {status.actions?.some(action => !action.allowed) && <ul>{status.actions.filter(action => !action.allowed).map(action => <li key={`${action.command.kind}:${action.command.value}`}><strong>{action.label}:</strong> {action.reason}</li>)}</ul>}
    {unresolved && <p>Switching controls are disabled pending confirmation.</p>}
    {status.positions.some(position => !position.allowed) && <ul>{status.positions.filter(position => !position.allowed).map(position => <li key={position.id}>
      <strong>{position.id}:</strong> {position.reason}
    </li>)}</ul>}
    {status.evidence.length > 0 && <ul aria-label="Interlock evidence">{status.evidence.map((evidence, index) => <li key={index}>
      {evidence.document}{evidence.revision ? `, revision ${evidence.revision}` : ''}{evidence.clause ? `, clause ${evidence.clause}` : ''}{evidence.page ? `, page ${evidence.page}` : ''}
    </li>)}</ul>}
    {status.conditions.length > 0 && <div aria-label="Represented interlock conditions">{status.conditions.map(condition => <div key={condition.id}>
      <p><strong>{condition.id}</strong>{'command' in condition ? ` · ${condition.targetLabel}` : ` · Position ${condition.position}`}: {condition.explanation}</p>
      {condition.evidence.length > 0 && <ul>{condition.evidence.map((evidence, index) => <li key={index}>
        {evidence.document}{evidence.revision ? `, revision ${evidence.revision}` : ''}{evidence.clause ? `, clause ${evidence.clause}` : ''}{evidence.page ? `, page ${evidence.page}` : ''}
      </li>)}</ul>}
    </div>)}</div>}
  </section>;
}
