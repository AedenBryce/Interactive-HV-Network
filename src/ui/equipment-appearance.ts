import type { Asset } from '../session/model';

import { getRemovableMechanism } from '../session/mechanisms';


// Diagram roles supplement the frozen model's broader interface kind.

const scrubberMotors = new Set(['sw505:sb214-em01', 'sw505:sb215-em01', 'sw505:sb216-em01']);

export const isMotor = (asset: Asset) => asset.kind === 'interface' && asset.terminals.length === 1 && (/\bmotor\b/i.test(asset.label) || scrubberMotors.has(asset.id)) && !/junction|common/i.test(asset.label);

export const isDrive = (asset: Asset) => asset.kind === 'interface' && !!asset.sourceArcs?.length && asset.id.endsWith(':converter');

export const isFuse = (asset: Asset) => asset.kind === 'interface' && asset.terminals.length === 2 && !asset.positions.length && /Intact in teaching model/i.test(asset.label);

export const healthyFuseState = 'Healthy (Closed)';

export const isSpareContinuation = (asset: Asset) => asset.kind === 'interface' && /spare[\s\S]*continuation|continuation[\s\S]*spare/i.test(asset.label);

export function healthyFuseLabel(asset: Asset) {

  const name = asset.label.replace(/actual condition unconfirmed|continuity unconfirmed|condition unconfirmed|Intact in teaching model/gi, '').split('\n').map(line => line.trim()).filter(Boolean).join('\n');

  return `${name}\n${healthyFuseState}`;

}

export const isMotorJunction = (asset: Asset) => asset.kind === 'interface' && asset.id.endsWith(':common') && /motor|phase conductor/i.test(asset.label);

export const hasDeviceCard = (asset: Asset) => !!(asset.positions.length || getRemovableMechanism(asset) || isFuse(asset));


export function compactEquipmentLabel(asset: Asset, currentLabel: string) {

  const withoutInterface = currentLabel.split('\n').map(line => line.replace(/\binterface\b/gi, '').replace(/\s+/g, ' ').replace(/^[\s·:/-]+|[\s·:/-]+$/g, '')).filter(Boolean).join('\n');

  const consistentTag = withoutInterface.replace(/\bDelta\b/gi, 'D').replace(/\bStar\b/gi, 'Y').replace(/Δ/g, 'D');
  if (asset.earthAssembly) return consistentTag.split('\n')[0];

  if (asset.kind === 'transformer') return consistentTag.match(/\bTF[- ]?\d+[A-Z]?\b/i)?.[0].replace(/[- ]/g, '').toUpperCase() ?? consistentTag.split('\n')[0];

  if (asset.kind === 'earth-switch') {
    if (/\nDC earth\b/i.test(consistentTag)) return `${consistentTag.split('\n')[0]} DC earth`;
    if (/·\s*DC earth/i.test(consistentTag)) return consistentTag.split('\n')[0].replace(/\s*·\s*/, ' ').replace(/\s*\/.*$/, '').trim();
    return consistentTag.split('\n')[0].replace(/\s*[·—(].*$/, '').trim();
  }

  if (asset.id === 'sw451:mc451b:section') return 'MC451B BUS';
  if (asset.kind === 'bus') {

    const tag = consistentTag.match(/\b(?:MCC|MC|SW|RM)\s*\d+[A-Z]?\b/i)?.[0].replace(/\s/g, '').toUpperCase();

    const voltage = consistentTag.match(/\b(\d+(?:\.\d+)?)\s*(kV|V)(?:AC|DC)?\b/i);

    const winding = consistentTag.match(/\b(?:MCC|MC|SW)\s*\d+[A-Z]?\s+([DY])\b/i)?.[1];

    if (tag && voltage) return `${tag}${winding ? ` ${winding.toUpperCase()}` : ''} ${voltage[1]}${voltage[2].toLowerCase() === 'kv' ? 'kV' : 'V'} BUS`;

  }

  if (isDrive(asset)) return `${consistentTag.split('\n')[0]}\nVSD`;

  if (isMotor(asset)) return asset.id.startsWith('rm420:mc420:motor-') ? consistentTag.split(/\n|\s*·\s*/)[0] : consistentTag.split('\n').slice(0, 2).join('\n');
  if (isFuse(asset)) return consistentTag.split('\n')[0].replace(/\s*Healthy\s*\(Closed\)\s*/i,'').trim();
  if (['breaker','contactor','disconnector'].includes(asset.kind)) {
    if (/\nOutput contact\b/i.test(consistentTag)) return `${consistentTag.split('\n')[0]} Output contact`;
    const firstLine = consistentTag.split('\n')[0].replace(/^Hopper\s*\d+\s*·\s*/i, '');
    return /^(?:T|Tier)\s*\d+\s*·/i.test(firstLine)
      ? firstLine.replace(/\s*·\s*/g, ' ').trim()
      : firstLine.split(/\s*·\s*/)[0].trim();
  }

  return consistentTag;

}


export const capitalState = (value: string) => value.replace(/\b(?:open|closed|close|service|isolated|earthed|in|out)\b/gi, word => word[0].toUpperCase() + word.slice(1).toLowerCase());

