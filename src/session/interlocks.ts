import type { NetworkModel } from './model';
import type { EvidenceReference } from './evidence';
import { breakerActions, breakerCommandLabel, isBreakerState } from './mechanisms';
import type { BreakerCommand, DeviceState } from './mechanisms';

export type InterlockCondition =
  | { kind: 'device'; assetId: string; position: string }
  | { kind: 'device'; assetId: string; axis: 'contact'; value: 'open' | 'closed' }
  | { kind: 'device'; assetId: string; axis: 'racking'; value: 'in' | 'out' }
  | { kind: 'source'; sourceId: string; enabled: boolean }
  | { kind: 'all' | 'any'; conditions: InterlockCondition[] };

export type InterlockEvidence = EvidenceReference;
export type InterlockRule = { id: string; assetId: string; require: InterlockCondition; explanation: string; evidence: InterlockEvidence[] } & ({ position: string } | { command: BreakerCommand });
export type InterlockDefinition = {
  reviews: { assetId: string; status: 'confirmed-none' | 'confirmed-rules' | 'unresolved'; note: string; evidence: InterlockEvidence[] }[];
  rules: InterlockRule[];
};

export type SwitchingStatus = {
  reviewStatus: 'confirmed-none' | 'confirmed-rules' | 'unresolved' | 'unconfirmed';
  note: string;
  evidence: InterlockEvidence[];
  conditions: ({ id: string; explanation: string; evidence: InterlockEvidence[] } & ({ position: string } | { command: BreakerCommand; targetLabel: string }))[];
  positions: { id: string; allowed: boolean; reason?: string }[];
  actions?: ReturnType<typeof breakerActions>;
};

function conditionSatisfied(condition: InterlockCondition, devices: Record<string, DeviceState>, sources: Record<string, boolean | null>): boolean | null {
  if (condition.kind === 'device') {
    const state = devices[condition.assetId];
    if ('position' in condition) return state == null || isBreakerState(state) ? null : state === condition.position;
    if (!isBreakerState(state) || state[condition.axis] === null) return null;
    return state[condition.axis] === condition.value;
  }
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
      conditions: (model.interlocks?.rules ?? []).filter(rule => rule.assetId === asset.id).map(rule => ({ id: rule.id, ...('position' in rule ? { position: rule.position } : { command: rule.command, targetLabel: breakerCommandLabel(rule.command) }), explanation: rule.explanation, evidence: rule.evidence })),
      positions: asset.positions.map(position => {
        if (!review) return { id: position.id, allowed: false, reason: 'Interlock review is unconfirmed. Switching is disabled.' };
        if (review.status === 'unresolved') return { id: position.id, allowed: false, reason: `Unresolved interlock: ${review.note}` };
        const blocked = (model.interlocks?.rules ?? []).filter(rule => rule.assetId === asset.id && 'position' in rule && rule.position === position.id).map(rule => ({ rule, satisfied: conditionSatisfied(rule.require, devices, sources) })).filter(result => result.satisfied !== true);
        return blocked.length ? { id: position.id, allowed: false, reason: blocked.map(({ rule, satisfied }) => `${satisfied === null ? 'Unconfirmed interlock condition. ' : ''}${rule.explanation}`).join(' ') } : { id: position.id, allowed: true };
      }),
    };
    const state = devices[asset.id];
    if (asset.removableBreaker && isBreakerState(state)) {
      status.actions = breakerActions(state).map(action => {
        if (!review || review.status === 'unresolved') return { ...action, allowed: false, reason: !review ? 'Interlock review is unconfirmed. Switching is disabled.' : `Unresolved interlock: ${review.note}` };
        const blocked = (model.interlocks?.rules ?? []).filter(rule => rule.assetId === asset.id && 'command' in rule && rule.command.kind === action.command.kind && rule.command.value === action.command.value).map(rule => ({ rule, satisfied: conditionSatisfied(rule.require, devices, sources) })).filter(result => result.satisfied !== true);
        if (blocked.length) return { ...action, allowed: false, reason: [action.reason, ...blocked.map(({ rule, satisfied }) => `${satisfied === null ? 'Unconfirmed interlock condition. ' : ''}${rule.explanation}`)].filter(Boolean).join(' ') };
        return action;
      });
    }
    return [asset.id, status];
  }));
}

