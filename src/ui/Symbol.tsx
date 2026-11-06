import type { Asset } from '../session/model';

export function Symbol({ kind, open = false, unknown = false, windings = 2, primaryWindings = 1, busSpan = 60, busEndCapSize = 12, removable = false, isolatorDuty }: { kind: Asset['kind']; open?: boolean; unknown?: boolean; rotation?: number; windings?: number; primaryWindings?: number; busSpan?: number; busEndCapSize?: number; removable?: boolean; isolatorDuty?: Asset['isolatorDuty'] }) {
  if (unknown) return <g fill="none" stroke="currentColor" strokeWidth="3"><title>Position unconfirmed; inspect asset details.</title><path d="M-30 0 H-15 M15 0 H30" /></g>;
  return <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {removable && <g className="withdrawable-contacts" data-withdrawable="true"><path d="M-30-6 Q-40-6-40 0 Q-40 6-30 6 M30-6 Q40-6 40 0 Q40 6 30 6" /></g>}
    {kind==='disconnector' && isolatorDuty==='on-load' && <rect className="on-load-contact" x="-16" y="-4" width="8" height="8" />}
    {kind==='disconnector' && isolatorDuty==='off-load' && <path className="off-load-contact" d="M-16-4 H-8" />}
    {kind === 'source' && <><circle r="30" /><path d="M-15 0 Q-7-15 0 0 T15 0" /></>}
    {kind === 'interface' && <><circle r="18" /><path d="M-8 8 L8-8 M-2-8 H8 V2" /></>}
    {(kind === 'breaker' || kind === 'contactor' || kind === 'disconnector') && <><path d="M-30 0 H-12 M12 0 H30" /><circle cx="12" r="2.5" />{kind === 'breaker' && <path d="M-24-12 L0 12 M-24 12 L0-12" />}{kind === 'contactor' && <path d="M-12-7 V7" />}<path d={open ? 'M12 0 L-8-20' : 'M12 0 H-12'} /></>}
    {kind === 'transformer' && <g className="transformer-windings" data-primary-windings={primaryWindings} data-secondary-windings={Math.max(1,windings-primaryWindings)}>{Array.from({length:primaryWindings},(_,index)=><circle key={'primary-'+index} cx="-12" cy={(index-(primaryWindings-1)/2)*24} r="21" />)}{Array.from({ length: Math.max(1, windings - primaryWindings) }, (_, index) => <circle key={'secondary-'+index} cx="12" cy={(index - (Math.max(1, windings - primaryWindings) - 1) / 2) * 24} r="21" />)}</g>}
    {kind === 'bus' && <><path strokeWidth="5" d={`M0${-busSpan / 2} V${busSpan / 2}`} /><path className="bus-end-caps" d={`M${-busEndCapSize} ${-busSpan / 2} H${busEndCapSize} M${-busEndCapSize} ${busSpan / 2} H${busEndCapSize}`} /></>}
    {kind === 'earth-switch' && <><path d="M0 30 V50" /><circle r="2.5" /><path className="earth-blade" d={open ? 'M0 0 L18 20' : 'M0 0 V30'} /><path d="M-20 50 H20 M-13 58 H13 M-5 66 H5" /></>}
  </g>;
}


