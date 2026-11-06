import { describeDeviceState, independentCommandLabel } from './mechanisms';
import type { NetworkModel } from './model';
import type { SessionAction } from './session';
import type { SwitchingProgramStep } from '../program/switching-program-coordinator';
import { isIndependentState } from './mechanisms';

function assetLabel(model: NetworkModel, assetId: string) {
  return model.assets.find(asset => asset.id === assetId)?.label ?? assetId;
}

function apparatusStateLabel(action: Exclude<SessionAction, { kind: 'source' }>, state: string | null | { contact: 'open' | 'closed' | null; racking: 'in' | 'out' | null }, model: NetworkModel) {
  if (typeof state === 'object' && state !== null) return describeDeviceState(state);
  if (state === null) return 'Unconfirmed';
  const asset = model.assets.find(candidate => candidate.id === action.assetId);
  return asset?.positions.find(position => position.id === state)?.label ?? state;
}

export function describeApparatusAction(action: Exclude<SessionAction, { kind: 'source' }>, model: NetworkModel) {
  const verb = action.kind === 'device'
    ? apparatusStateLabel(action, action.to, model)
    : independentCommandLabel(action.command);
  return `${verb} ${assetLabel(model, action.assetId)}`;
}

export function describeSessionAction(action: SessionAction, model: NetworkModel) {
  if (action.kind === 'source') {
    const source = model.sources.find(candidate => candidate.id === action.sourceId)?.label ?? action.sourceId;
    const from = action.from === null ? 'Unconfirmed' : action.from ? 'Enabled' : 'Disabled';
    return `${source}: ${from} → ${action.to ? 'Enabled' : 'Disabled'}`;
  }
  const from = apparatusStateLabel(action, action.from, model);
  const to = apparatusStateLabel(action, action.to, model);
  return `${assetLabel(model, action.assetId)}: ${from} → ${to}`;
}

export function describeSwitchingProgramStep(step: SwitchingProgramStep, model: NetworkModel) {
  if (step.source === 'program') return `${step.action} · ${step.instructions}`;
  const action = step.action;
  if (step.role === 'action') return `Action: ${describeApparatusAction(action, model)}`;
  const asset = model.assets.find(candidate => candidate.id === action.assetId);
  let stateLabel: string;
  if (action.kind === 'device') {
    stateLabel = apparatusStateLabel(action, step.state ?? null, model);
  } else if (isIndependentState(step.state)) {
    const value = action.command.kind === 'contact' ? step.state.contact : step.state.racking;
    stateLabel = value === null ? 'Unconfirmed' : action.command.kind === 'contact' ? value === 'closed' ? 'Closed' : 'Open' : value === 'in' ? 'Rack In' : 'Rack Out';
  } else {
    stateLabel = 'Unconfirmed';
  }
  return `Verify ${stateLabel} ${asset?.label ?? action.assetId}`;
}
