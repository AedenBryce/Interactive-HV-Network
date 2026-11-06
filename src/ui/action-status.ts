import type { SwitchingStatus } from '../session/interlocks';

export type ActionOption = { allowed?: boolean };
export type ScenarioMode = 'exploration' | 'view-only';

export function localInterlockReviewLabel(status: SwitchingStatus['reviewStatus'] | undefined): string {
  switch (status) {
    case 'confirmed-none': return 'Reviewed · no additional local interlocks';
    case 'confirmed-rules': return 'Reviewed · local interlock conditions recorded';
    case 'unresolved': return 'Unresolved · local interlock review';
    case 'unconfirmed': return 'Unconfirmed · local interlock review';
    default: return 'Unconfirmed · no local interlock review recorded';
  }
}

export function actionReadinessSummary(mode: ScenarioMode, actions: readonly ActionOption[]): string {
  if (mode === 'view-only') return 'Switching is disabled for this view-only scenario.';
  if (actions.length === 0) return 'No switching actions are modelled for this asset.';
  const unevaluated = actions.filter(action => action.allowed === undefined).length;
  if (unevaluated > 0) return `${unevaluated} ${unevaluated === 1 ? 'action has' : 'actions have'} no evaluated availability in the current model.`;
  const enabled = actions.filter(action => action.allowed).length;
  const blocked = actions.length - enabled;
  if (blocked === 0) return `${enabled} of ${actions.length} actions are enabled by the local model rules.`;
  const blockedText = `${blocked} ${blocked === 1 ? 'action is' : 'actions are'} blocked by the recorded local review or scenario conditions`;
  if (enabled === 0) return `No actions are currently enabled; ${blockedText}.`;
  return `${enabled} of ${actions.length} actions are enabled; ${blockedText}.`;
}
