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
