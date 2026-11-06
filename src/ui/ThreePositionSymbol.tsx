export { threePositionContacts, threePositionGeometry } from './three-position-contacts';

export function ThreePositionSymbol({ state, tapY, breaker = false, extent = 40 }: { state: string | null | undefined; tapY: number; breaker?: boolean; extent?: number }) {
  const known = state === 'service' || state === 'isolated' || state === 'earthed';
  const mainClosed = state === 'service'; const earthClosed = state === 'earthed';
  const hinge = tapY < 0 ? -12 : 12;
  const target = -hinge;
  return <g className="three-position-symbol" data-main-contact={known ? mainClosed ? 'closed' : 'open' : 'unconfirmed'} data-earth-contact={known ? earthClosed ? 'closed' : 'open' : 'unconfirmed'} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <title>Combined three-position switch: Service closes the main contact; Isolated opens both; Earthed closes only the recorded earth contact.</title>
    <path d={`M0 ${-extent} V-12 M0 12 V${extent} M35 ${target} H50 V50`} />
    <circle cy={hinge} r="2.5" /><circle cy={target} r="2.5" />
    <path d={`M35 ${target-5} V${target+5}`} />
    {breaker && <path d={`M-9 ${target-6} L9 ${target+6} M-9 ${target+6} L9 ${target-6}`} />}
    {known ? <path className="selector-blade" d={mainClosed ? `M0 ${hinge} V${target}` : earthClosed ? `M0 ${hinge} L35 ${target}` : `M0 ${hinge} L18 0`} /> : <title>Position unconfirmed; inspect asset details.</title>}
    <path d="M30 50 H70 M37 58 H63 M45 66 H55" />
  </g>;
}
