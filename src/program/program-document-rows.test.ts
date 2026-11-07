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
  types: ['CIRCUIT BREAKER', 'DISCONNECTOR', 'EARTH SWITCH', 'PHASE VOLTAGE INDICATOR'],
  identifies: ['CB-01', 'ES-01'],
  actions: ['CLOSE', 'INFORM', 'SELECT', 'TEST', 'VERIFY'],
  instructions: [
    'INFORM CCR OF INTENT TO ISOLATE EQUIPMENT', 'INFORM CCR ISOLATIONS IS COMPLETE', 'ISSUE ACCESS CERTIFICATE',
    'VERIFY OPEN', 'VERIFY CLOSED', 'CLOSE CIRCUIT BREAKER', 'OPEN DISCONNECTOR', 'CLOSE DISCONNECTOR', 'CLOSE EARTH SWITCH', 'TEST METER', 'TEST FOR DEAD',
    'SELECT SERVICE', 'VERIFY SERVICE', 'SELECT ISOLATED', 'VERIFY ISOLATED', 'SELECT EARTHED', 'VERIFY EARTHED',
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

  it('maps a disconnector operation to the added template type and instruction choices', () => {
    const model = structuredClone(singleSupply);
    const asset = model.assets.find(candidate => candidate.id === 'cb-01');
    if (!asset) throw new Error('Missing synthetic switching device fixture.');
    asset.kind = 'disconnector';
    asset.label = 'SW-01';
    asset.aliases = ['SW-01'];
    const session = new SimulationSession(model);
    session.changeDevice('cb-01', 'open');
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('cb-01', 'closed');

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), model, {
      ...choices,
      identifies: ['SW-01'],
    }, () => ({ location: 'MC001', voltage: '415V', drawingReferences: ['DRAWING-SWITCH'], missingFields: [] }));

    expect(plan.blockers).toEqual([]);
    expect(plan.rows.filter(row => row.action !== 'INFORM').map(({ type, identify, action, instructions }) => ({ type, identify, action, instructions }))).toEqual([
      { type: 'DISCONNECTOR', identify: 'SW-01', action: 'VERIFY', instructions: 'VERIFY OPEN' },
      { type: 'DISCONNECTOR', identify: 'SW-01', action: 'CLOSE', instructions: 'CLOSE DISCONNECTOR' },
      { type: 'DISCONNECTOR', identify: 'SW-01', action: 'VERIFY', instructions: 'VERIFY CLOSED' },
    ]);
  });

  it.each([
    ['service', 'isolated', [
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY SERVICE'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'SELECT', 'SELECT ISOLATED'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY ISOLATED'],
    ]],
    ['isolated', 'service', [
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY ISOLATED'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'SELECT', 'SELECT SERVICE'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY SERVICE'],
    ]],
    ['isolated', 'earthed', [
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY ISOLATED'],
      [undefined, '415V', 'SW-3P', 'TEST', 'TEST METER'],
      ['PHASE VOLTAGE INDICATOR', '415V', 'SW-3P', 'TEST', 'TEST FOR DEAD'],
      [undefined, '415V', 'SW-3P', 'TEST', 'TEST METER'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'SELECT', 'SELECT EARTHED'],
      ['DISCONNECTOR', '415V', 'SW-3P', 'VERIFY', 'VERIFY EARTHED'],
    ]],
  ])('records three-position disconnector %s → %s with selection and verification rows', (start, target, expected) => {
    const model = structuredClone(singleSupply);
    const asset = model.assets.find(candidate => candidate.id === 'cb-01');
    if (!asset) throw new Error('Missing synthetic switching device fixture.');
    asset.kind = 'disconnector';
    asset.label = 'SW-3P';
    asset.aliases = ['SW-3P'];
    asset.positions = [
      { id: 'service', label: 'Service', pairs: [] },
      { id: 'isolated', label: 'Isolated', pairs: [] },
      { id: 'earthed', label: 'Earthed', pairs: [] },
    ];
    model.starting.devices['cb-01'] = start;
    const session = new SimulationSession(model);
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('cb-01', target);

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), model, {
      ...choices,
      identifies: ['SW-3P'],
    }, () => ({ location: 'MC001', voltage: '415V', drawingReferences: ['DRAWING-3P'], missingFields: [] }));

    expect(plan.blockers).toEqual([]);
    expect(plan.rows.filter(row => row.action !== 'INFORM').map(({ type, voltage, identify, action, instructions }) => [type, voltage, identify, action, instructions])).toEqual(expected);
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

  it.each([
    ['ES SW454 FD01', 'SW454 FDR'], ['ES TF431 FD', 'TF431 FDR'],
    ['ES TF714 feeder earth · presence owner-confirmed; path review pending', 'TF714 FDR'],
  ])(
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

  it.each(['6.6kV', '0V'] as const)('expands an earth close using associated circuit test voltage %s', testVoltage => {
    const session = new SimulationSession(earthFixture);
    const capture = new SwitchingProgramCoordinator(session);
    capture.start('isolation');
    session.changeDevice('es-01', 'closed');
    const metadata = (model: typeof earthFixture, asset: typeof earthFixture.assets[number]) => ({
      location: 'SW411' as const,
      voltage: asset.kind === 'earth-switch' ? '0V' as const : '415V' as const,
      associatedCircuitVoltage: asset.kind === 'earth-switch' ? testVoltage : undefined,
      drawingReferences: ['DRAWING-EARTH'],
      missingFields: [] as const,
    });

    const plan = buildSwitchingProgramDocumentRows(capture.snapshot(), earthFixture, choices, metadata);
    const steps = plan.rows.filter(row => row.action !== 'INFORM');

    expect(plan.blockers).toEqual([]);
    expect(steps.map(({ type, voltage, identify, action, instructions }) => ({ type, voltage, identify, action, instructions }))).toEqual([
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'VERIFY', instructions: 'VERIFY OPEN' },
      { type: undefined, voltage: testVoltage, identify: 'ES-01', action: 'TEST', instructions: 'TEST METER' },
      { type: 'PHASE VOLTAGE INDICATOR', voltage: testVoltage, identify: 'ES-01', action: 'TEST', instructions: 'TEST FOR DEAD' },
      { type: undefined, voltage: testVoltage, identify: 'ES-01', action: 'TEST', instructions: 'TEST METER' },
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'CLOSE', instructions: 'CLOSE EARTH SWITCH' },
      { type: 'EARTH SWITCH', voltage: '0V', identify: 'ES-01', action: 'VERIFY', instructions: 'VERIFY CLOSED' },
    ]);
  });
});
