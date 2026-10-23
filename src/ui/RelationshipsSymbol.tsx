import { useId } from 'react';
import type { Asset, NetworkModel } from '../session/model';
import { isMechanismSupported, isPositionSupported, isSourceArcSupported } from '../session/evidence';
import type { DiagramLayout } from './diagram';
import { getRemovableMechanism, isIndependentState, removablePairs } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import { Symbol } from './Symbol';

// A diagram of declared relationships in the selected position, not a connectivity evaluator.
export function RelationshipsSymbol({ asset, positionId, layout, model }: { asset: Asset; positionId: DeviceState | undefined; layout: DiagramLayout; model: NetworkModel }) {
  const arrowId = useId();
  const [cx, cy] = layout.assets[asset.id];
  const position = asset.positions.find(position => position.id === positionId);
  const mechanism = getRemovableMechanism(asset);
  const main = mechanism ? removablePairs(mechanism.mainPair, positionId, false) : [];
  const uncertainMain = mechanism && !main.length ? removablePairs(mechanism.mainPair, positionId, true) : [];
  const common = [...asset.conductivePairs, ...(position?.pairs ?? []), ...main];
  const source = [...common, ...(asset.sourcePairs ?? []), ...(position?.sourcePairs ?? [])];
  const earth = [...common, ...(asset.earthPairs ?? []), ...(position?.earthPairs ?? [])];
  const positionClaim = (a: string, b: string, channel: 'source' | 'earth') => {
    const declared = [...(position?.pairs ?? []), ...(channel === 'source' ? position?.sourcePairs ?? [] : position?.earthPairs ?? [])];
    return position?.supportScope === 'relationship' && declared.some(([x, y]) => x === a && y === b || x === b && y === a) ? position : undefined;
  };
  const contactClaim = (a: string, b: string, channel: 'source' | 'earth') => {
    const selected = positionClaim(a, b, channel);
    if (selected) return { label: 'position', claim: selected, supported: isPositionSupported(model, asset, selected) };
    if (mechanism?.supportScope === 'relationship' && (mechanism.mainPair[0] === a && mechanism.mainPair[1] === b || mechanism.mainPair[0] === b && mechanism.mainPair[1] === a)) return { label: 'main pair', claim: mechanism, supported: isMechanismSupported(model, asset, mechanism) };
    return undefined;
  };
  const point = (terminal: string) => { const [x, y] = layout.terminals[terminal]; return { x: x - cx, y: y - cy }; };
  const arcs = asset.sourceArcs ?? [];
  const arcGroups = new Map<string, typeof arcs>();
  for (const arc of arcs) {
    const key = JSON.stringify([arc.from, arc.to].sort());
    const group = arcGroups.get(key) ?? [];
    group.push(arc); arcGroups.set(key, group);
  }
  return <g className="explicit-relationships">
    {arcs.length > 0 && <defs><marker id={arrowId} viewBox="0 0 12 12" refX="6" refY="6" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 L11 6 L1 11 Z" fill="context-stroke" stroke="none" /></marker></defs>}
    {uncertainMain.map(([a, b]) => <line key="possible-main" x1={point(a).x} y1={point(a).y} x2={point(b).x} y2={point(b).y} stroke="var(--unconfirmed, #b7791f)" strokeDasharray="6 4"><title>Main pair possible only; contact/racking combination unconfirmed.</title></line>)}
    {source.map(([a, b], index) => {
      const claim = contactClaim(a, b, 'source');
      return <line key={`source:${index}`} x1={point(a).x} y1={point(a).y} x2={point(b).x} y2={point(b).y} className="relationship-source" style={claim?.supported === false ? { stroke: 'var(--unconfirmed, #b7791f)', strokeDasharray: '6 4' } : undefined}><title>Declared bidirectional source relationship: {a} ↔ {b}{claim ? `. Scoped ${claim.label} claim ${claim.supported ? 'supported' : 'Unconfirmed'}; evidence: ${claim.claim.evidenceIds?.join(', ')}` : ''}</title></line>;
    })}
    {arcs.map(arc => {
      const from = point(arc.from); const to = point(arc.to);
      const terminals = [arc.from, arc.to].sort();
      const group = arcGroups.get(JSON.stringify(terminals))!;
      const start = point(terminals[0]); const end = point(terminals[1]);
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const offset = (group.indexOf(arc) - (group.length - 1) / 2) * 24;
      const middle = { x: (from.x + to.x) / 2 - (distance ? (end.y - start.y) / distance * offset : 0), y: (from.y + to.y) / 2 + (distance ? (end.x - start.x) / distance * offset : 0) };
      const supported = isSourceArcSupported(model, asset, arc);
      const status = supported ? 'Supported source relationship' : 'Unconfirmed source relationship';
      return <path key={`arc:${arc.id}`} data-source-arc={arc.id} d={`M${from.x} ${from.y} L${middle.x} ${middle.y} L${to.x} ${to.y}`} className="relationship-source" fill="none" markerMid={`url(#${arrowId})`} style={supported ? undefined : { stroke: 'var(--unconfirmed, #b7791f)', strokeDasharray: '6 4' }}><title>{status}: {arc.from} → {arc.to}. Arc {arc.id}; claim: {arc.knowledge ?? (model.synthetic ? 'synthetic model data' : 'unconfirmed — status not recorded')}. Evidence: {arc.evidenceIds?.join(', ') || 'none linked'}. Reviews: {arc.reviewIds?.join(', ') || 'none linked'}.</title></path>;
    })}
    {earth.map(([a, b], index) => {
      const claim = contactClaim(a, b, 'earth');
      return <line key={`earth:${index}`} x1={point(a).x} y1={point(a).y + 5} x2={point(b).x} y2={point(b).y + 5} className="relationship-earth" style={claim?.supported === false ? { stroke: 'var(--unconfirmed, #b7791f)' } : undefined}><title>Declared earth relationship: {a} ↔ {b}{claim ? `. Scoped ${claim.label} claim ${claim.supported ? 'supported' : 'Unconfirmed'}; evidence: ${claim.claim.evidenceIds?.join(', ')}` : ''}</title></line>;
    })}
    {asset.terminals.map(terminal => <circle key={terminal} cx={point(terminal).x} cy={point(terminal).y} r="4" className="relationship-terminal"><title>{terminal}</title></circle>)}
    {mechanism && isIndependentState(positionId) && <g className="removable-mechanism"><Symbol kind={mechanism.kind} open={positionId.contact === 'open'} unknown={positionId.contact === null} /><text x="0" y="-75" textAnchor="middle" className="position-label">Contact: {positionId.contact ?? 'Unconfirmed'}</text><text x="0" y="-55" textAnchor="middle" className="position-label">Rack: {positionId.racking ?? 'Unconfirmed'}</text></g>}
    {asset.positions.length > 0 && <text x="0" y="-62" textAnchor="middle" className="position-label">{positionId === null ? 'Unconfirmed position' : position?.label}</text>}
  </g>;
}
