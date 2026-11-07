import { describe, expect, it } from 'vitest';
import { earthFixture } from '../models/earth-fixture';
import { currentNetworkModel } from '../models/site/current-network';
import { getAssetProgramMetadata, reviewedEquipmentDataVoltageMetadata } from './asset-program-metadata';

function assetFrom(model: typeof currentNetworkModel, assetId: string) {
  const asset = model.assets.find(candidate => candidate.id === assetId);
  if (!asset) throw new Error(`Missing test asset ${assetId}.`);
  return asset;
}

describe('asset program metadata', () => {
  it('applies single-voltage direct Equipment Data matches to the corresponding tool assets', () => {
    for (const [assetId, assignment] of Object.entries(reviewedEquipmentDataVoltageMetadata)) {
      // The overview drawing shows 400V at MC451; the drawing-specific review intentionally overrides the direct 415V Equipment Data entry.
      if (assetId === 'sw451:mc451:cb') continue;
      const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
      expect(metadata.voltage, assetId).toBe(assignment.voltage);
    }
  });

  it.each([
    'sw411:in-01:cb', 'sw411:in-02:cb', 'sw411:in-03:cb', 'sw411:in-04:cb',
    'sw411:tier-01:cb', 'sw411:tier-02:cb', 'sw411:tier-03:cb', 'sw411:tier-04:cb',
    'sw411:tier-13:cb', 'sw411:tier-14:cb', 'sw411:tier-15:cb', 'sw411:tier-16:cb', 'sw411:bus-tie:cb',
  ])('reads the 22kV SW411 breaker assignment from its drawing for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.voltage).toBe('22kV');
    expect(metadata.drawingReferences).toEqual(['11098-07110-EL-DR-5151']);
    expect(metadata.location).toBe('SW411');
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['sw411:in-01:es', true], ['sw411:in-02:es', true], ['sw411:in-03:es', true], ['sw411:in-04:es', true],
    ['sw411:tier-01:es', true], ['sw411:tier-02:es', true], ['sw411:tier-03:es', true], ['sw411:tier-04:es', true],
    ['sw411:tier-13:es', true], ['sw411:tier-14:es', true], ['sw411:tier-15:es', true], ['sw411:tier-16:es', true],
    ['sw411:bus-a:es', true], ['sw411:bus-b:es', true],
  ])('uses the SW411 drawing for earth switch %s and sets circuit test voltage only when shown', (assetId, hasAssociatedCircuitVoltage) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe(hasAssociatedCircuitVoltage ? '22kV' : undefined);
    expect(metadata.drawingReferences).toEqual(['11098-07110-EL-DR-5151']);
    expect(metadata.location).toBe('SW411');
    expect(metadata.missingFields).toEqual([]);
    if (hasAssociatedCircuitVoltage) expect(metadata.missingFields).not.toContain('associated circuit test voltage');
    else expect(metadata.missingFields).toContain('associated circuit test voltage');
  });

  it.each([
    ['sw421:in:cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:in:es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:bus:es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:tf421:hv-cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:tf421:hv-es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:mc421:cb', 'MC421', '400V', ['11098-07110-EL-DR-2650', '11098-07110-EL-DR-2351']],
    ['sw421:tf422:hv-cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:tf422:hv-es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:mc422:cb', 'MC422', '400V', ['11098-07110-EL-DR-2652', '11098-07110-EL-DR-2351']],
    ['sw421:tf423:hv-cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:tf423:hv-es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:sw423:d:cb', 'SW423', '690V', ['11098-07110-EL-DR-2465', '11098-07110-EL-DR-2351']],
    ['sw421:sw423:y:cb', 'SW423', '690V', ['11098-07110-EL-DR-2465', '11098-07110-EL-DR-2351']],
    ['sw421:spare:tier2:cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:spare:tier2:es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
    ['sw421:spare:tier7:cb', 'SW421', '22kV', ['11098-07110-EL-DR-2351']],
    ['sw421:spare:tier7:es', 'SW421', '0V', ['11098-07110-EL-DR-2351']],
  ])('uses the drawing-backed location and voltage for %s', (assetId, location, voltage, drawingReferences) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.missingFields).toEqual([]);
    if (assetId.endsWith(':es')) expect(metadata.associatedCircuitVoltage).toBe('22kV');
  });

  it.each([
    ['hpgr:mc001:cb', '415V', 'CB112-02006-DR-EL-0005'],
    ['rm406:mc406a:cb', '415V', 'CB19OP001B-04057-DR-EL-0003'],
    ['rm410:mc410a:cb', '415V', '520CBC0003-2140-DR-EL-0002'],
    ['sw505:vs50501:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
    ['sw505:vs50502:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
    ['sw505:vs50503:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
  ] as const)('uses the reviewed voltage and drawing for %s', (assetId, voltage, reference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    const location = assetId.startsWith('rm406:') ? 'RM406' : assetId.startsWith('rm410:') ? 'RM410' : assetId.startsWith('hpgr:') ? 'MC001' : 'SR505';

    expect(metadata.voltage).toBe(voltage);
    expect(metadata.drawingReferences).toEqual([reference]);
    expect(metadata.location).toBe(location);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['hpgr:sw002:a01:q8', 'earth-switch'],
    ['hpgr:sw002:a02:k101', 'disconnector'], ['hpgr:sw002:a02:q8', 'earth-switch'],
    ['hpgr:sw002:a04:k101', 'disconnector'], ['hpgr:sw002:a04:q8', 'earth-switch'],
    ['hpgr:sw002:tf004:k202', 'disconnector'], ['hpgr:sw002:tf004:q8', 'earth-switch'],
  ] as const)('uses SW002 drawing CB112-02006-DR-EL-0005 for %s', (assetId, kind) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.location).toBe('SW002');
    expect(metadata.voltage).toBe(kind === 'earth-switch' ? '0V' : '6.6kV');
    expect(metadata.associatedCircuitVoltage).toBe(kind === 'earth-switch' ? '6.6kV' : undefined);
    expect(metadata.drawingReferences).toEqual(['CB112-02006-DR-EL-0005']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    'line33:pole-1-recloser', 'line33:pole-2-abs', 'line33:tie-in-abs',
    'line33:pole-201-abs', 'line33:hopper-286-fused-abs',
  ])('assigns 33kV to the TF04 secondary route shown on CB21OP055B-10016-DR-EL-0089 for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.voltage).toBe('33kV');
    expect(metadata.location).toBeUndefined();
    expect(metadata.drawingReferences).toEqual(['CB21OP055B-10016-DR-EL-0089']);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each([
    ['wh:h1:mc417:in', ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046']],
    ['wh:h1:mc417:m1:rc', ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046']],
    ['wh:h1:mc417:m1:fc', ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046']],
    ['wh:h1:mc417:m2:rc', ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046']],
    ['wh:h1:mc417:m2:fc', ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046']],
    ['wh:h7:mc418:in', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002']],
    ['wh:h7:mc418:m1:rc', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002']],
    ['wh:h7:mc418:m1:fc', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002']],
    ['wh:h7:mc418:m2:rc', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002']],
    ['wh:h7:mc418:m2:fc', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002']],
  ] as const)('uses owner-confirmed 6.6kV phase-bar voltage for %s', (assetId, drawingReferences) => {
    const asset = assetFrom(currentNetworkModel, assetId);
    const metadata = getAssetProgramMetadata(currentNetworkModel, asset);

    expect(metadata.voltage).toBe(asset.kind === 'earth-switch' ? '0V' : '6.6kV');
    expect(metadata.associatedCircuitVoltage).toBe(asset.kind === 'earth-switch' ? '6.6kV' : undefined);
    expect(metadata.location).toBe(assetId.startsWith('wh:h1:') ? 'MC417' : 'MC418');
    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    'rm420:mc420:in:vcb', 'rm420:mc420:motor-01:rc', 'rm420:mc420:motor-01:fc',
    'rm420:mc420:motor-02:rc', 'rm420:mc420:motor-02:fc',
  ])('uses the owner-confirmed MC420 6.9kV assignment and available location for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe('MC420');
    expect(metadata.voltage).toBe('6.9kV');
    expect(metadata.drawingReferences).toEqual(['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['rm420:es01', 'RM420', '33kV', ['520CBC0007-2130-DR-EL-0003']],
    ['rm420:tf420a:es', 'RM420', '33kV', ['520CBC0007-2130-DR-EL-0003']],
    ['rm420:tf420b:es', 'RM420', '33kV', ['520CBC0007-2130-DR-EL-0003']],
    ['rm420:spare:es', 'RM420', '33kV', ['520CBC0007-2130-DR-EL-0003']],
    ['rm420:mc420:in:es', 'MC420', '6.9kV', ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004']],
    ['rm420:mc420:motor-01:es', 'MC420', '6.9kV', ['520CBC0007-2130-DR-EL-0004']],
    ['rm420:mc420:motor-02:es', 'MC420', '6.9kV', ['520CBC0007-2130-DR-EL-0004']],
  ] as const)('assigns the drawing-backed voltage and location for earth switch %s', (assetId, location, associatedCircuitVoltage, drawingReferences) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['wh:h9:mc419:in', '6.6kV', ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:in-earth', '0V', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m1:rc', '6.6kV', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m1:fc', '6.6kV', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m1:earth', '0V', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m2:rc', '6.6kV', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m2:fc', '6.6kV', ['CB19OP001C-01068-DR-EL-0002']],
    ['wh:h9:mc419:m2:earth', '0V', ['CB19OP001C-01068-DR-EL-0002']],
  ] as const)('uses the direct MC419 drawing assignment for %s', (assetId, voltage, drawingReferences) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe('RM419');
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(voltage === '0V' ? '6.6kV' : undefined);
    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['sw451:mc451:cb', 'SW451', '400V', undefined, '11098-07110-EL-DR-2356'],
    ['sw451:in:cb', 'SW451', '22kV', undefined, '11098-07110-EL-DR-2356'],
    ['sw451:tf451:hv-cb', 'SW451', '22kV', undefined, '11098-07110-EL-DR-2356'],
    ['sw451:spare-6:cb', 'SW451', '22kV', undefined, '11098-07110-EL-DR-2356'],
    ['sw451:spare-6:es', 'SW451', '0V', '22kV', '11098-07110-EL-DR-2356'],
    ['rm714:in01:es', 'RM714', '0V', '22kV', '11098-07110-EL-DR-2255'],
    ['rm714:tf714:es', 'RM714', '0V', '22kV', '11098-07110-EL-DR-2255'],
    ['rm713:in01:es', 'RM713', '0V', '22kV', '11098-07110-EL-DR-2254'],
    ['rm721:in01', 'RM721', '22kV', undefined, '11098-07110-EL-DR-2256'],
    ['rm721:in01:es', 'RM721', '0V', '22kV', '11098-07110-EL-DR-2256'],
    ['rm721:in02', 'RM721', '22kV', undefined, '11098-07110-EL-DR-2256'],
    ['rm721:in02:es', 'RM721', '0V', '22kV', '11098-07110-EL-DR-2256'],
    ['rm721:rm412', 'RM721', '22kV', undefined, '11098-07110-EL-DR-2256'],
    ['rm721:rm412:es', 'RM721', '0V', '22kV', '11098-07110-EL-DR-2256'],
    ['rm721:rm713', 'RM721', '22kV', undefined, '11098-07110-EL-DR-2256'],
    ['rm721:rm713:es', 'RM721', '0V', '22kV', '11098-07110-EL-DR-2256'],
    ['mine:sw441:in:es', 'SW441', '0V', '22kV', '11098-07110-EL-DR-2355'],
    ['mine:sw441:in:cb', 'SW441', '22kV', undefined, '11098-07110-EL-DR-2355'],
    ['mine:tf441:es', 'SW441', '0V', '22kV', '11098-07110-EL-DR-2355'],
    ['rm420:sw01', 'RM420', '33kV', undefined, '520CBC0007-2130-DR-EL-0003'],
    ['rm413:mc413:cb', 'MC413', '400V', undefined, 'CB17OP023A-04057-DR-EL-0004'],
  ] as const)('uses the source-backed metadata for %s', (assetId, location, voltage, associatedCircuitVoltage, drawingReference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each(['rm712:in01:es', 'rm712:in02:es', 'rm712:tf712:es'])('uses the 22kV bus voltage for RM712 earth switch %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.location).toBe('SS712');
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe('22kV');
    expect(metadata.drawingReferences).toEqual(['11098-07110-EL-DR-2253']);
    expect(metadata.missingFields).toEqual([]);
  });

  it('uses the MCC414 415V phase bar while leaving its unavailable location choice blank', () => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, 'rm413:mcc414:cb'));
    expect(metadata.location).toBeUndefined();
    expect(metadata.voltage).toBe('415V');
    expect(metadata.drawingReferences).toEqual(['CB095-02004-DR-EL-0014', 'CB095-02004-DR-EL-0015']);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each([
    ['wh:h1:rm417:sw01', 'RM417', '22kV', undefined, 'CB16OP038A-02006-DR-EL-0044', []],
    ['wh:h1:rm417:cb01', 'RM417', '22kV', undefined, 'CB16OP038A-02006-DR-EL-0044', []],
    ['wh:h7:rm418:sw01', undefined, '22kV', undefined, 'CB17OP023C-01006-DR-EL-0001', ['location']],
    ['wh:h7:rm418:sw01:es', undefined, '0V', '22kV', 'CB17OP023C-01006-DR-EL-0001', ['location']],
    ['wh:h7:rm418:cb03:earth', undefined, '0V', '22kV', 'CB17OP023C-01006-DR-EL-0001', ['location']],
    ['wh:h9:rm419:sw01', 'RM419', '22kV', undefined, 'CB19OP001C-01068-DR-EL-0001', []],
    ['rm713:in01', 'RM713', '22kV', undefined, '11098-07110-EL-DR-2254', []],
    ['rm713:tf713:sw:es', 'RM713', '0V', '22kV', '11098-07110-EL-DR-2254', []],
    ['rm714:tf714:sw', 'RM714', '22kV', undefined, '11098-07110-EL-DR-2255', []],
  ] as const)('uses the overview-linked source assignment for %s', (assetId, location, voltage, associatedCircuitVoltage, drawingReference, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it.each([
    ['station:sb01:f4:cb', '11kV', undefined],
    ['station:sb01:f4:es', '0V', '11kV'],
    ['station:sb02:f1:cb', '11kV', undefined],
    ['station:sb02:f1:es', '0V', '11kV'],
    ['station:sb02:f4:cb', '11kV', undefined],
    ['station:sb02:f4:es', '0V', '11kV'],
  ] as const)('uses the drawing-backed 11kV station value and leaves unavailable locations blank for %s', (assetId, voltage, associatedCircuitVoltage) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual(['500CBC0002-13015-DR-EL-0001']);
    expect(metadata.location).toBeUndefined();
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each(['sw505:vs50501:dc-earth', 'sw505:vs50502:dc-earth', 'sw505:vs50503:dc-earth'])('uses the owner-confirmed 0V for the DC earth and its test circuit for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.location).toBe('SR505');
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe('0V');
    expect(metadata.drawingReferences).toEqual(['500CB-04220-DR-EL-0042']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each(['hpgr:drive-mea:dc-earth', 'hpgr:drive-meb:dc-earth', 'sw426:ss714:es'])('uses the owner-confirmed 0V for earth switch and test circuit %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe('0V');
    expect(metadata.drawingReferences).toHaveLength(1);
    expect(metadata.missingFields).not.toContain('associated circuit test voltage');
  });

  it.each([
    ['cv006:abs:49-1', 'CB19OP001B-04057-DR-EL-0001'],
    ['cv006:recloser:49-39a', 'CB19OP001B-04057-DR-EL-0001'],
    ['cv006:abs:49-40', 'CB19OP001B-04057-DR-EL-0001'],
    ['cv006:fused-abs:57', 'CB19OP001B-04057-DR-EL-0001'],
  ] as const)('assigns the drawn 22kV CV006 route and leaves unavailable locations blank for %s', (assetId, drawingReference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.location).toBeUndefined();
    expect(metadata.voltage).toBe('22kV');
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each(['sw505:tf505a:hv-es', 'sw505:tf505b:hv-es', 'sw505:tf505c:hv-es'])('assigns the SW505 earth circuit test voltage from its 22kV bar for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.location).toBe('SW505');
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe('22kV');
    expect(metadata.drawingReferences).toEqual(['500CB-04220-DR-EL-0055']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['hpgr:drive-mea:outlet', ['CB112-02006-DR-EL-0005']],
    ['wh:h7:mc418a:in', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0003']],
    ['rm413:mcc414:cb', ['CB095-02004-DR-EL-0014', 'CB095-02004-DR-EL-0015']],
    ['drop-tower:abs:p18-8', ['CB-10016-DR-EL-0003']],
  ] as const)('records all directly relevant source sheets for %s', (assetId, drawingReferences) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toContain('location');
  });

  it.each(['hpgr:drive-mea:outlet', 'hpgr:drive-meb:outlet'])('uses the owner-confirmed 6.6kV value for HPGR outlet %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.voltage).toBe('6.6kV');
    expect(metadata.location).toBeUndefined();
    expect(metadata.drawingReferences).toEqual(['CB112-02006-DR-EL-0005']);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it('uses the owner-confirmed 415V value for the MC420A incoming ACB', () => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, 'rm420:mc420a:in:acb'));
    expect(metadata.voltage).toBe('415V');
    expect(metadata.location).toBeUndefined();
    expect(metadata.drawingReferences).toEqual(['520CBC0007-2130-DR-EL-0003']);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each(['drop-tower:abs:p18-1', 'drop-tower:abs:p18-8'])('uses the 22kV Pole 18 circuit for %s', assetId => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));
    expect(metadata.voltage).toBe('22kV');
    expect(metadata.location).toBeUndefined();
    expect(metadata.drawingReferences).toEqual(['CB-10016-DR-EL-0003']);
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each([
    ['wh:h7:mc418a:in', undefined, ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0003'], ['location']],
    ['wh:h9:mc419a:in', 'RM419', ['CB19OP001C-01068-DR-EL-0003', 'CB19OP001C-01068-DR-EL-0004'], []],
  ] as const)('uses the overview transformer secondary voltage for %s', (assetId, location, drawingReferences, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe('415V');
    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it.each([
    ...['rm406:sw01', 'rm406:cb01', 'rm406:sw02', 'rm406:cb02', 'rm406:sw03', 'rm406:cb03', 'rm406:sw04'].map(id => [id, 'RM406', 'CB19OP001B-04057-DR-EL-0002'] as const),
    ...['rm410:sw01', 'rm410:cb01', 'rm410:sw02', 'rm410:cb02', 'rm410:sw03', 'rm410:cb03', 'rm410:sw04'].map(id => [id, 'RM410', 'CB19OP001B-04057-DR-EL-0004'] as const),
  ])('assigns the 22kV bus metadata to %s', (assetId, location, drawingReference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe('22kV');
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['rm406:vs4061:input-a:switch', 'RM406', 'CB19OP001B-04057-DR-EL-0002'],
    ['rm406:vs4061:input-b:switch', 'RM406', 'CB19OP001B-04057-DR-EL-0002'],
    ['rm410:vs4101:input-a:switch', 'RM410', 'CB19OP001B-04057-DR-EL-0004'],
    ['rm410:vs4101:input-b:switch', 'RM410', 'CB19OP001B-04057-DR-EL-0004'],
  ])('assigns the drawing-backed 720V value and source location for %s', (assetId, location, drawingReference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe('720V');
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['rm412:s100', '22kV', undefined], ['rm412:s101', '22kV', undefined],
    ['rm412:q100', '22kV', undefined], ['rm412:feeder-contact', '22kV', undefined],
    ['rm412:e100', '0V', '22kV'], ['rm412:e101', '0V', '22kV'], ['rm412:e102', '0V', '22kV'],
    ['rm412:q200', '690V', undefined], ['rm412:q201', '690V', undefined], ['rm412:q202', '415V', undefined],
  ] as const)('assigns RM412 source voltage for %s', (assetId, voltage, associatedCircuitVoltage) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe('RM412');
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual(['CBC0012-02004-DR-EL-0007']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['rm413:in01', 'RM413', '22kV', undefined], ['rm413:in02', 'RM413', '22kV', undefined],
    ['rm413:in01:es', 'RM413', '0V', '22kV'], ['rm413:in02:es', 'RM413', '0V', '22kV'],
    ['rm413:in02:cable-es', 'RM413', '0V', '22kV'],
    ['rm413:tf413:cb', 'RM413', '22kV', undefined], ['rm413:tf414:cb', 'RM413', '22kV', undefined],
    ['rm413:tf413:sw', 'RM413', '22kV', undefined], ['rm413:tf414:sw', 'RM413', '22kV', undefined],
    ['rm413:tf413:sw:es', 'RM413', '0V', '22kV'], ['rm413:tf414:sw:es', 'RM413', '0V', '22kV'],
    ['rm413a:es-q8:upper', 'RM413A', '0V', '22kV'], ['rm413a:q1', 'RM413A', '22kV', undefined],
    ['rm413a:es-q8:lower', 'RM413A', '22kV', undefined],
    ['rm413a:ac-input-a:switch', 'RM413A', '690V', undefined],
    ['rm413a:ac-input-b:switch', 'RM413A', '690V', undefined],
  ] as const)('uses the overview-linked RM413 bus or secondary value for %s', (assetId, location, voltage, associatedCircuitVoltage) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual(['CB17OP023A-04057-DR-EL-0004']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['wh:h8:mc416:in', 'breaker'],
    ['wh:h8:mc416:in-earth', 'earth-switch'],
    ['wh:h8:mc416:m1:rc', 'contactor'], ['wh:h8:mc416:m1:fc', 'contactor'],
    ['wh:h8:mc416:m1:earth', 'earth-switch'],
    ['wh:h8:mc416:m2:rc', 'contactor'], ['wh:h8:mc416:m2:fc', 'contactor'],
    ['wh:h8:mc416:m2:earth', 'earth-switch'],
  ] as const)('uses the confirmed 6.6kV Hopper 8 MC416 assignment for %s', (assetId, kind) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe('MC416');
    expect(metadata.voltage).toBe(kind === 'earth-switch' ? '0V' : '6.6kV');
    expect(metadata.associatedCircuitVoltage).toBe(kind === 'earth-switch' ? '6.6kV' : undefined);
    expect(metadata.drawingReferences).toEqual(['CB17OP023D-01006-DR-EL-0002']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['wh:h3:mc416:in', 'breaker'],
    ['wh:h3:mc416:in-earth', 'earth-switch'],
    ['wh:h3:mc416:m1:rc', 'contactor'], ['wh:h3:mc416:m1:fc', 'contactor'],
    ['wh:h3:mc416:m1:earth', 'earth-switch'],
    ['wh:h3:mc416:m2:rc', 'contactor'], ['wh:h3:mc416:m2:fc', 'contactor'],
    ['wh:h3:mc416:m2:earth', 'earth-switch'],
  ] as const)('uses the confirmed 6.6kV Hopper 3 MC416 assignment for %s', (assetId, kind) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe('MC416');
    expect(metadata.voltage).toBe(kind === 'earth-switch' ? '0V' : '6.6kV');
    expect(metadata.associatedCircuitVoltage).toBe(kind === 'earth-switch' ? '6.6kV' : undefined);
    expect(metadata.drawingReferences).toEqual(['CB16OP038A-02006-DR-EL-0166']);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['wh:h3:mc416a:in', 'MC416A', '415V', undefined, 'CB16OP038A-02006-DR-EL-0165', []],
    ['wh:h1:mc417a:in', 'SS417', '415V', undefined, 'CB-10016-DR-EL-0003', []],
    ['wh:h8:mc416a:in', 'MC416A', '415V', undefined, 'CB17OP023D-01006-DR-EL-0003', []],
    ['wh:h7:mc418:in-earth', 'MC418', '0V', '6.6kV', 'CB17OP023C-01006-DR-EL-0001', []],
    ['mine:wt1:cb', undefined, '22kV', undefined, '11098-07110-EL-DR-2355', ['location']],
  ] as const)('uses directly matched Equipment Data / overview fields for %s', (assetId, location, voltage, associatedCircuitVoltage, drawingReference, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it('assigns 0V to modeled earth switches and exposes other missing fields', () => {
    const asset = earthFixture.assets.find(candidate => candidate.id === 'es-01');
    if (!asset) throw new Error('Missing synthetic earth switch fixture.');

    const metadata = getAssetProgramMetadata(earthFixture, asset);

    expect(metadata.voltage).toBe('0V');
    expect(metadata.location).toBeUndefined();
    expect(metadata.drawingReferences).toEqual([]);
    expect(metadata.missingFields).toEqual(['location', 'drawing references', 'associated circuit test voltage']);
  });

  it('does not reuse current-site assignments for other models', () => {
    const asset = earthFixture.assets.find(candidate => candidate.id === 'cb-01');
    if (!asset) throw new Error('Missing synthetic breaker fixture.');

    const metadata = getAssetProgramMetadata(earthFixture, asset);

    expect(metadata.voltage).toBeUndefined();
    expect(metadata.drawingReferences).toEqual([]);
    expect(metadata.missingFields).toEqual(['location', 'voltage', 'drawing references']);
  });

  it('does not change electrical model data while resolving program metadata', () => {
    const before = JSON.stringify(currentNetworkModel);

    getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, 'rm413a:ac-input-a:switch'));

    expect(JSON.stringify(currentNetworkModel)).toBe(before);
  });
});
