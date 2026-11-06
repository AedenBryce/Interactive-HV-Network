import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SwitchingProgramSnapshot } from '../program/switching-program-coordinator';
import { SwitchingProgramControls } from './SwitchingProgramControls';

describe('switching program controls during document development', () => {
  it('prevents a new capture from starting until the in-flight document is finished', () => {
    const program: SwitchingProgramSnapshot = { active: false, type: 'isolation', actions: [], steps: [] };
    const markup = renderToStaticMarkup(createElement(SwitchingProgramControls, {
      program,
      stepLabel: () => '',
      onStart: () => undefined,
      onUndo: () => undefined,
      onDevelop: () => undefined,
      developing: true,
      blockers: [],
      onCancel: () => undefined,
    }));

    expect(markup).toMatch(/<button disabled="">Start Isolation Program<\/button>/);
    expect(markup).toMatch(/<button disabled="">Start Restoration Program<\/button>/);
  });
});
