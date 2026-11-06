import { describe, expect, it } from 'vitest';
import { earthFixture } from '../models/earth-fixture';
import { singleSupply } from '../models/synthetic';
import { SimulationSession } from '../session/session';
import { SwitchingProgramCoordinator } from './switching-program-coordinator';
import { getAssetProgramMetadata } from './asset-program-metadata';
import { buildSwitchingProgramDocumentRows } from './program-document-rows';
import type { ProgramTemplateChoices } from './program-document-rows';

const choices: ProgramTemplateChoices = {
  locations: ['MC001', 'SW411'],
  voltages: ['0V', '415V', '6.6kV'],
  types: ['CIRCUIT BREAKER', 'EARTH SWITCH', 'PHASE VOLTAGE INDICATOR'],
  identifies: ['CB-01', 'ES-01'],
  actions: ['CLOSE', 'INFORM', 'TEST', 'VERIFY'],
  instructions: [
    'INFORM CCR OF INTENT TO ISOLATE EQUIPMENT', 'INFORM CCR ISOLATIONS IS COMPLETE', 'ISSUE ACCESS CERTIFICATE',
    'VERIFY OPEN', 'VERIFY CLOSED', 'CLOSE CIRCUIT BREAKER', 'CLOSE EARTH SWITCH', 'TEST METER', 'TEST FOR DEAD',
  ],
};

describe('switching program document rows', () => {
  it('maps an accepted apparatus change between fixed communications and leaves other INFORM fields blank', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('cb-01', 'closed');
    const program = capture.snapshot();
    const plan = buildSwitchingProgramDocumentRows(program, singleSupply, choices, () => ({
      location: 'MC001', voltage: '415V', drawingReferences: ['DRAWING-A'], missingFields: [],
    }));

    expect(plan.blockers).toEqual([]);
    expect(plan.rows).toEqual([
      { action: 'INFORM', instructions: 'INFORM CCR OF INTENT TO ISOLATE EQUIPMENT' },
      { location: 'MC001', voltage: '415V', type: 'CIRCUIT BREAKER', identify: 'CB-01', action: 'VERIFY', instructions: 'VERIFY OPEN' },
      { location: 'MC001', voltage: '415V', type: 'CIRCUIT BREAKER', identify: 'CB-01', action: 'CLOSE', instructions: 'CLOSE CIRCUIT BREAKER' },
      { location: 'MC001', voltage: '415V', type: 'CIRCUIT BREAKER', identify: 'CB-01', action: 'VERIFY', instructions: 'VERIFY CLOSED' },
      { action: 'INFORM', instructions: 'INFORM CCR ISOLATIONS IS COMPLETE' },
      { action: 'INFORM', instructions: 'ISSUE ACCESS CERTIFICATE' },
    ]);
    expect(plan.drawingReferences).toEqual(['DRAWING-A']);
  });

  it('blocks output when an operated asset has unassigned reviewed metadata', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('cb-01', 'closed');

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), singleSupply, choices, (model, asset) => getAssetProgramMetadata(model, asset));

    expect(plan.rows).toEqual([]);
    expect(plan.blockers).toContain('CB-01: location is not assigned.');
    expect(plan.blockers).toContain('CB-01: voltage is not assigned.');
    expect(plan.blockers).toContain('CB-01: drawing references are not assigned.');
  });

  it('expands an earth close into the agreed checks and requires an assigned circuit test voltage', () => {
    const session = new SimulationSession(earthFixture);
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('es-01', 'closed');
    const metadata = (model: typeof earthFixture, asset: typeof earthFixture.assets[number]) => ({
      location: 'SW411' as const,
      voltage: asset.kind === 'earth-switch' ? '0V' as const : '415V' as const,
      associatedCircuitVoltage: asset.kind === 'earth-switch' ? '6.6kV' as const : undefined,
      drawingReferences: ['DRAWING-EARTH'],
      missingFields: [] as const,
    });

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), earthFixture, choices, metadata);
    const steps = plan.rows.filter(row => row.action !== 'INFORM');

    expect(plan.blockers).toEqual([]);
    expect(steps.map(({ type, voltage, identify, action, instructions }) => ({ type, voltage, identify, action, instructions }))).toEqual([
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'VERIFY', instructions: 'VERIFY OPEN' },
      { type: undefined, voltage: '6.6kV', identify: 'ES-01', action: 'TEST', instructions: 'TEST METER' },
      { type: 'PHASE VOLTAGE INDICATOR', voltage: '6.6kV', identify: 'ES-01', action: 'TEST', instructions: 'TEST FOR DEAD' },
      { type: undefined, voltage: '6.6kV', identify: 'ES-01', action: 'TEST', instructions: 'TEST METER' },
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'CLOSE', instructions: 'CLOSE EARTH SWITCH' },
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'VERIFY', instructions: 'VERIFY CLOSED' },
    ]);
  });
});
