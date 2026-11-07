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

  it.each([
    ['CB SW435 FD01', 'SW435 FDR01'], ['CB SW435 FD02', 'SW435 FDR02'],
    ['CB SW421 FD01', 'SW421 FDR'], ['CB SW426 FD01', 'SW426 FDR'],
    ['CB SW431 FD01', 'SW431 FDR'], ['CB SW441 FD01', 'SW441 FDR'],
    ['CB SW451 FD01', 'SW451 FDR'], ['CB SW454 FD01', 'SW454 FDR'],
    ['CB TF004 FD', 'TF004 FDR'], ['CB TF714 FD', 'TF714 FDR'],
    ['CB SW421 IN01', 'SW421 IN'], ['CB SW426 IN01', 'SW426 IN'],
    ['CB SW431 IN01', 'SW431 IN'], ['CB SW441 IN01', 'SW441 IN'],
    ['CB SW451 IN01', 'SW451 IN'], ['CB SW454 IN01', 'SW454 IN'], ['CB SW505 IN01', 'SW505 IN'],
    ['CB BUS A SW411', 'SW411 BUS A'], ['CB BUS B SW411', 'SW411 BUS B'], ['CB SW411 BT', 'SW411 BUS TIE'],
    ['CB MC406A CB', 'MC406A IN'], ['CB MC417 INCOMING VCB', 'MC417 IN'],
    ['CB MC418 INCOMING VCB', 'MC418 IN'], ['CB MC419 INCOMING VCB', 'MC419 IN'],
    ['CB MC417A MCCB', 'MC417A IN'], ['CB MC418A MCCB', 'MC418A IN'], ['CB TF004 FEEDER', 'TF004 FDR'],
  ])('maps the approved tool label %s to template Identify %s', (label, expectedIdentify) => {
    const model = structuredClone(singleSupply);
    const breaker = model.assets.find(asset => asset.id === 'cb-01');
    if (!breaker) throw new Error('Missing synthetic breaker fixture.');
    breaker.label = label;
    const session = new SimulationSession(model);
    session.changeDevice('cb-01', 'open');
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('cb-01', 'closed');

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), model, {
      ...choices, identifies: [expectedIdentify],
    }, () => ({ location: 'SW411', voltage: '6.6kV', drawingReferences: ['DRAWING-A'], missingFields: [] }));

    expect(plan.blockers).toEqual([]);
    expect(plan.rows.filter(row => row.action === 'CLOSE').map(row => row.identify)).toEqual([expectedIdentify]);
  });

  it.each([['ES SW454 FD01', 'SW454 FDR'], ['ES TF431 FD', 'TF431 FDR']])(
    'removes the earth-switch type prefix before applying the approved mapping for %s', (label, expectedIdentify) => {
    const model = structuredClone(earthFixture);
    const earthSwitch = model.assets.find(asset => asset.id === 'es-01');
    if (!earthSwitch) throw new Error('Missing synthetic earth switch fixture.');
    earthSwitch.label = label;
    const session = new SimulationSession(model);
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('es-01', 'closed');

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), model, {
      ...choices, identifies: [expectedIdentify],
    }, (_model, asset) => ({
      location: 'SW411',
      voltage: asset.kind === 'earth-switch' ? '0V' : '415V',
      associatedCircuitVoltage: asset.kind === 'earth-switch' ? '6.6kV' : undefined,
      drawingReferences: ['DRAWING-EARTH'],
      missingFields: [],
    }));

    expect(plan.blockers).toEqual([]);
    expect(plan.rows.filter(row => row.action !== 'INFORM').map(row => row.identify)).toEqual(Array(6).fill(expectedIdentify));
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
