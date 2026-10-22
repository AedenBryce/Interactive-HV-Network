import type { Asset } from '../session/model';

export function Symbol({ kind, open = false, unknown = false, rotation = 0 }: { kind: Asset['kind']; open?: boolean; unknown?: boolean; rotation?: number }) {
  if (unknown) return <g fill="none" stroke="currentColor" strokeWidth="3"><path d="M-30 0 H-15 M15 0 H30" /><text transform={`rotate(${-rotation})`} textAnchor="middle" y="8" stroke="none" fill="currentColor" fontSize="25">?</text></g>;
  return <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'source' && <><circle r="30" /><path d="M-15 0 Q-7-15 0 0 T15 0" /></>}
    {kind === 'interface' && <><circle r="18" /><path d="M-8 8 L8-8 M-2-8 H8 V2" /></>}
    {(kind === 'breaker' || kind === 'contactor' || kind === 'disconnector') && <><path d="M-30 0 H-12 M12 0 H30" />{open ? <path d="M-12 0 L10-19 M12-9 V9" /> : <path d="M-12-15 V15 M12-15 V15 M-12 0 H12" />}</>}
    {kind === 'transformer' && <><circle cx="-11" r="22" /><circle cx="11" r="22" /></>}
    {kind === 'bus' && <path strokeWidth="5" d="M0-30 V30" />}
    {kind === 'earth-switch' && <><path d={open ? 'M0-30 V-16 L13-3 M0 3 V10' : 'M0-30 V10'} /><path d="M-20 10 H20 M-13 18 H13 M-5 26 H5" /></>}
  </g>;
}
