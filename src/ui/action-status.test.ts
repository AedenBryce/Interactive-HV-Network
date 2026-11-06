import { describe, expect, it } from 'vitest';
import { actionReadinessSummary, localInterlockReviewLabel } from './action-status';

describe('asset action review summary', () => {
  it('keeps local interlock review distinct from action readiness', () => {
    expect(localInterlockReviewLabel('confirmed-rules')).toBe('Reviewed · local interlock conditions recorded');
    expect(actionReadinessSummary('exploration', [{ allowed: true }, { allowed: false }])).toBe('1 of 2 actions are enabled; 1 action is blocked by the recorded local review or scenario conditions.');
  });

  it('does not imply that actions are enabled while local review is unresolved', () => {
    expect(localInterlockReviewLabel('unresolved')).toBe('Unresolved · local interlock review');
    expect(actionReadinessSummary('exploration', [{ allowed: false }, { allowed: false }])).toBe('No actions are currently enabled; 2 actions are blocked by the recorded local review or scenario conditions.');
  });

  it('explains view-only mode and assets without modeled actions', () => {
    expect(actionReadinessSummary('view-only', [{ allowed: true }])).toBe('Switching is disabled for this view-only scenario.');
    expect(actionReadinessSummary('exploration', [])).toBe('No switching actions are modelled for this asset.');
    expect(actionReadinessSummary('exploration', [{}])).toBe('1 action has no evaluated availability in the current model.');
  });
});
