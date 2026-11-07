import { describe, expect, it } from 'vitest';
import { earthFixture } from '../models/earth-fixture';
import { currentNetworkModel } from '../models/site/current-network';
import { getAssetProgramMetadata } from './asset-program-metadata';

function assetFrom(model: typeof currentNetworkModel, assetId: string) {
  const asset = model.assets.find(candidate => candidate.id === assetId);
  if (!asset) throw new Error(`Missing test asset ${assetId}.`);
  return asset;
}

describe('asset program metadata', () => {
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
    ['rm413a:ac-input-a:switch', '690V', 'CB17OP023A-04057-DR-EL-0004'],
    ['rm413a:ac-input-b:switch', '690V', 'CB17OP023A-04057-DR-EL-0004'],
    ['sw505:vs50501:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
    ['sw505:vs50502:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
    ['sw505:vs50503:output-switch', '1.9kV', '500CB-04220-DR-EL-0042'],
  ] as const)('uses the reviewed voltage and drawing for %s', (assetId, voltage, reference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.voltage).toBe(voltage);
    expect(metadata.drawingReferences).toEqual([reference]);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each([
    ['wh:h1:mc417:in', 'CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'],
    ['wh:h1:mc417:m1:rc', 'CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'],
    ['wh:h1:mc417:m1:fc', 'CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'],
    ['wh:h1:mc417:m2:rc', 'CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'],
    ['wh:h1:mc417:m2:fc', 'CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'],
    ['wh:h7:mc418:in', 'CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'],
    ['wh:h7:mc418:m1:rc', 'CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'],
    ['wh:h7:mc418:m1:fc', 'CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'],
    ['wh:h7:mc418:m2:rc', 'CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'],
    ['wh:h7:mc418:m2:fc', 'CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'],
    ['wh:h9:mc419:in', 'CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'],
    ['wh:h9:mc419:m1:rc', 'CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'],
    ['wh:h9:mc419:m1:fc', 'CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'],
    ['wh:h9:mc419:m2:rc', 'CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'],
    ['wh:h9:mc419:m2:fc', 'CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'],
    ['rm420:mc420:in:vcb', '520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'],
    ['rm420:mc420:motor-01:rc', '520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'],
    ['rm420:mc420:motor-01:fc', '520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'],
    ['rm420:mc420:motor-02:rc', '520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'],
    ['rm420:mc420:motor-02:fc', '520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'],
  ] as const)('uses the owner-confirmed 6.9kV assignment for %s', (assetId, transformerDrawing, switchgearDrawing) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.voltage).toBe('6.9kV');
    expect(metadata.drawingReferences).toEqual([transformerDrawing, switchgearDrawing]);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toEqual(['location']);
  });

  it.each([
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
    ['rm420:sw01', 'RM420', '33kV', undefined, '520CBC0007-2130-DR-EL-0003'],
    ['rm413:mc413:cb', 'MC413', '415V', undefined, 'CB17OP023A-04057-DR-EL-0004'],
  ] as const)('uses the source-backed metadata for %s', (assetId, location, voltage, associatedCircuitVoltage, drawingReference) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual([]);
  });

  it.each([
    ['station:sb01:f4:cb', '500CBC0002-13015-DR-EL-0001', ['location', 'voltage']],
    ['line33:pole-1-recloser', 'CB21OP055B-10016-DR-EL-0089', ['location', 'voltage']],
    ['hpgr:sw002:a01:q8', 'CB112-02006-DR-EL-0005', ['location', 'associated circuit test voltage']],
    ['sw505:vs50501:dc-earth', '500CB-04220-DR-EL-0042', ['location', 'associated circuit test voltage']],
    ['rm406:vs4061:input-a:switch', 'CB19OP001B-04057-DR-EL-0002', ['location', 'voltage']],
  ] as const)('records a relevant source reference but keeps unresolved values blank for %s', (assetId, drawingReference, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it.each([
    ['cv006:abs:49-1', 'CB19OP001B-04057-DR-EL-0001', ['location', 'voltage']],
    ['cv006:recloser:49-39a', 'CB19OP001B-04057-DR-EL-0001', ['location', 'voltage']],
    ['cv006:abs:49-40', 'CB19OP001B-04057-DR-EL-0001', ['location', 'voltage']],
    ['cv006:fused-abs:57', 'CB19OP001B-04057-DR-EL-0001', ['location', 'voltage']],
    ['rm412:e100', 'CBC0012-02004-DR-EL-0007', ['location', 'associated circuit test voltage']],
    ['rm412:q200', 'CBC0012-02004-DR-EL-0007', ['location', 'voltage']],
    ['rm413:in02:cable-es', 'CB17OP023A-04057-DR-EL-0004', ['location', 'associated circuit test voltage']],
    ['rm420:es01', '520CBC0007-2130-DR-EL-0003', ['location', 'associated circuit test voltage']],
  ] as const)('uses a relevant drawing reference but keeps unsupported values blank for %s', (assetId, drawingReference, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it.each([
    ['hpgr:drive-mea:outlet', ['CB112-02006-DR-EL-0005']],
    ['wh:h7:mc418a:in', ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0003']],
    ['wh:h9:mc419a:in', ['CB19OP001C-01068-DR-EL-0003', 'CB19OP001C-01068-DR-EL-0004']],
    ['rm413:mcc414:cb', ['CB095-02004-DR-EL-0014', 'CB095-02004-DR-EL-0015']],
    ['rm420:mc420:in:es', ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004']],
    ['drop-tower:abs:p18-8', ['CB-10016-DR-EL-0003']],
  ] as const)('records all directly relevant source sheets for %s', (assetId, drawingReferences) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.drawingReferences).toEqual(drawingReferences);
    expect(metadata.location).toBeUndefined();
    expect(metadata.missingFields).toContain('location');
  });

  it.each([
    ['wh:h1:mc417a:in', 'SS417', '415V', undefined, 'CB-10016-DR-EL-0003', []],
    ['wh:h8:mc416a:in', undefined, '415V', undefined, 'CB-10016-DR-EL-0003', ['location']],
    ['wh:h7:mc418:in-earth', undefined, '0V', '6.9kV', 'CB17OP023C-01006-DR-EL-0001', ['location']],
    ['mine:wt1:cb', undefined, '22kV', undefined, '11098-07110-EL-DR-2355', ['location']],
  ] as const)('uses directly matched Equipment Data / overview fields for %s', (assetId, location, voltage, associatedCircuitVoltage, drawingReference, missingFields) => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, assetId));

    expect(metadata.location).toBe(location);
    expect(metadata.voltage).toBe(voltage);
    expect(metadata.associatedCircuitVoltage).toBe(associatedCircuitVoltage);
    expect(metadata.drawingReferences).toEqual([drawingReference]);
    expect(metadata.missingFields).toEqual(missingFields);
  });

  it('keeps the MC419 incoming-earth reference unresolved when the overview and Equipment Data disagree', () => {
    const metadata = getAssetProgramMetadata(currentNetworkModel, assetFrom(currentNetworkModel, 'wh:h9:mc419:in-earth'));

    expect(metadata.location).toBe('RM419');
    expect(metadata.voltage).toBe('0V');
    expect(metadata.associatedCircuitVoltage).toBe('6.9kV');
    expect(metadata.drawingReferences).toEqual([]);
    expect(metadata.missingFields).toEqual(['drawing references']);
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
