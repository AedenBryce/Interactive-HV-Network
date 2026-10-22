import type { NetworkModel } from './model';
import type { EvidenceReference } from './evidence';
import { breakerActions, isBreakerState } from './mechanisms';
import type { DeviceState } from './mechanisms';

export type InterlockCondition =
  | { kind: 'device'; assetId: string; position: string }
  | { kind: 'source'; sourceId: string; enabled: boolean }
  | { kind: 'all' | 'any'; conditions: InterlockCondition[] };

export type InterlockEvidence = EvidenceReference;
export type InterlockDefinition = {
  reviews: { assetId: string; status: 'confirmed-none' | 'confirmed-rules' | 'unresolved'; note: string; evidence: InterlockEvidence[] }[];
  rules: { id: string; assetId: string; position: string; require: InterlockCondition; explanation: string; evidence: InterlockEvidence[] }[];
};

export type SwitchingStatus = {
  reviewStatus: 'confirmed-none' | 'confirmed-rules' | 'unresolved' | 'unconfirmed';
  note: string;
  evidence: InterlockEvidence[];
  conditions: { id: string; position: string; explanation: string; evidence: InterlockEvidence[] }[];
  positions: { id: string; allowed: boolean; reason?: string }[];
  actions?: ReturnType<typeof breakerActions>;
};

function conditionSatisfied(condition: InterlockCondition, devices: Record<string, DeviceState>, sources: Record<string, boolean | null>): boolean | null {
  if (condition.kind === 'device' && devices[condition.assetId] == null) return null;
  if (condition.kind === 'device') return devices[condition.assetId] === condition.position;
  if (condition.kind === 'source') return sources[condition.sourceId] == null ? null : sources[condition.sourceId] === condition.enabled;
  const children = condition.conditions.map(child => conditionSatisfied(child, devices, sources));
  if (condition.kind === 'all') return children.includes(false) ? false : children.includes(null) ? null : true;
  return children.includes(true) ? true : children.includes(null) ? null : false;
}

export function evaluateInterlocks(model: NetworkModel, devices: Record<string, DeviceState>, sources: Record<string, boolean | null>): Record<string, SwitchingStatus> {
  return Object.fromEntries(model.assets.filter(asset => asset.positions.length > 0 || asset.removableBreaker).map(asset => {
    const review = model.interlocks?.reviews.find(review => review.assetId === asset.id);
    const status: SwitchingStatus = {
      reviewStatus: review?.status ?? 'unconfirmed',
      note: review?.note ?? 'Interlock review is unconfirmed. The source does not confirm this control is permitted.',
      evidence: review?.evidence ?? [],
      conditions: (model.interlocks?.rules ?? []).filter(rule => rule.assetId === asset.id).map(rule => ({ id: rule.id, position: rule.position, explanation: rule.explanation, evidence: rule.evidence })),
      positions: asset.positions.map(position => {
        if (!review) return { id: position.id, allowed: false, reason: 'Interlock review is unconfirmed. Switching is disabled.' };
        if (review.status === 'unresolved') return { id: position.id, allowed: false, reason: `Unresolved interlock: ${review.note}` };
        const blocked = (model.interlocks?.rules ?? []).filter(rule => rule.assetId === asset.id && rule.position === position.id).map(rule => ({ rule, satisfied: conditionSatisfied(rule.require, devices, sources) })).filter(result => result.satisfied !== true);
        return blocked.length ? { id: position.id, allowed: false, reason: blocked.map(({ rule, satisfied }) => `${satisfied === null ? 'Unconfirmed interlock condition. ' : ''}${rule.explanation}`).join(' ') } : { id: position.id, allowed: true };
      }),
    };
    const state = devices[asset.id];
    if (asset.removableBreaker && isBreakerState(state)) {
      status.actions = breakerActions(state).map(action => {
        if (!review || review.status === 'unresolved') return { ...action, allowed: false, reason: !review ? 'Interlock review is unconfirmed. Switching is disabled.' : `Unresolved interlock: ${review.note}` };
        return action;
      });
    }
    return [asset.id, status];
  }));
}

