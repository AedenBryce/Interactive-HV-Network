import type { Asset } from '../session/model';

export function Symbol({ kind, open = false, unknown = false, rotation = 0, windings = 2 }: { kind: Asset['kind']; open?: boolean; unknown?: boolean; rotation?: number; windings?: number }) {
  if (unknown) return <g fill="none" stroke="currentColor" strokeWidth="3"><path d="M-30 0 H-15 M15 0 H30" /><text transform={`rotate(${-rotation})`} textAnchor="middle" y="8" stroke="none" fill="currentColor" fontSize="25">?</text></g>;
  return <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'source' && <><circle r="30" /><path d="M-15 0 Q-7-15 0 0 T15 0" /></>}
    {kind === 'interface' && <><circle r="18" /><path d="M-8 8 L8-8 M-2-8 H8 V2" /></>}
    {(kind === 'breaker' || kind === 'contactor' || kind === 'disconnector') && <><path d="M-30 0 H-12 M12 0 H30" /><circle cx="12" r="2.5" />{kind === 'breaker' && <path d="M-17-5 L-7 5 M-17 5 L-7-5" />}{kind === 'contactor' && <path d="M-12-7 V7" />}<path d={open ? 'M12 0 L-8-20' : 'M12 0 H-12'} /></>}
    {kind === 'transformer' && <><circle cx="-12" r="21" />{Array.from({ length: Math.max(1, windings - 1) }, (_, index) => <circle key={index} cx="12" cy={(index - (Math.max(1, windings - 1) - 1) / 2) * 24} r="21" />)}</>}
    {kind === 'bus' && <path strokeWidth="5" d="M0-30 V30" />}
    {kind === 'earth-switch' && <><path d="M0-30 V-12 M0 12 V20" /><circle cy="12" r="2.5" /><path d={open ? 'M0 12 L-18-8' : 'M0 12 V-12'} /><path d="M-20 20 H20 M-13 27 H13 M-5 34 H5" /></>}
  </g>;
}
