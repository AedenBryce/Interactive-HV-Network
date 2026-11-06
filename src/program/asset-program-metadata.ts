import type { Asset, NetworkModel } from '../session/model';

export const PROGRAM_VOLTAGE_CHOICES = [
  '0V', '415V', '400V', '3.3kV', '6.6kV', '6.9kV', '22kV', '33kV', '1.9kV', '690V',
] as const;
export type ProgramVoltage = typeof PROGRAM_VOLTAGE_CHOICES[number];

export const PROGRAM_LOCATION_CHOICES = [
  'MC001', 'MC412', 'MC413', 'MC414', 'MC415', 'MC416', 'MC416A', 'MC417', 'MC417A', 'MC418',
  'MC420', 'MC421', 'MC422', 'MC426', 'MC428A', 'MC428B', 'MC430', 'MC431', 'MC434A', 'MC435',
  'MC441', 'MC451', 'MC454', 'MC507', 'MC508', 'PN01', 'RECLOSER', 'RM406', 'RM410', 'RM412',
  'RM413', 'RM413A', 'RM417', 'RM419', 'RM420', 'RM713', 'RM714', 'RM721', 'SR505', 'SS417',
  'SS712', 'SS714', 'SW002', 'SW411', 'SW421', 'SW423', 'SW426', 'SW427', 'SW429', 'SW431',
  'SW432', 'SW433', 'SW435', 'SW437', 'SW439', 'SW440', 'SW441', 'SW442', 'SW443', 'SW451',
  'SW452', 'SW453', 'SW454', 'SW455', 'SW505', 'SW506', 'SW712', 'SW713', 'SW714', 'N/A',
] as const;
export type ProgramLocation = typeof PROGRAM_LOCATION_CHOICES[number];

export type AssetProgramMetadataEntry = {
  location?: ProgramLocation;
  voltage?: ProgramVoltage;
  associatedCircuitVoltage?: ProgramVoltage;
  drawingReferences?: readonly string[];
};

export type AssetProgramMetadata = {
  location?: ProgramLocation;
  voltage?: ProgramVoltage;
  associatedCircuitVoltage?: ProgramVoltage;
  drawingReferences: readonly string[];
  missingFields: ('location' | 'voltage' | 'drawing references')[];
};

// This sidecar is keyed by model identity and asset identity. It deliberately
// remains outside NetworkModel so document metadata cannot alter electrical state.
const reviewedProgramMetadata: Readonly<Record<string, Readonly<Record<string, AssetProgramMetadataEntry>>>> = {
  'site-whole-network': {
    'hpgr:mc001:cb': { voltage: '415V', drawingReferences: ['CB112-02006-DR-EL-0005'] },
    'rm406:mc406a:cb': { voltage: '415V', drawingReferences: ['CB19OP001B-04057-DR-EL-0003'] },
    'rm410:mc410a:cb': { voltage: '415V', drawingReferences: ['520CBC0003-2140-DR-EL-0002'] },
    'rm413a:ac-input-a:switch': { voltage: '690V', drawingReferences: ['CB17OP023A-04057-DR-EL-0004'] },
    'rm413a:ac-input-b:switch': { voltage: '690V', drawingReferences: ['CB17OP023A-04057-DR-EL-0004'] },
    'sw505:vs50501:output-switch': { voltage: '1.9kV', drawingReferences: ['500CB-04220-DR-EL-0042'] },
    'sw505:vs50502:output-switch': { voltage: '1.9kV', drawingReferences: ['500CB-04220-DR-EL-0042'] },
    'sw505:vs50503:output-switch': { voltage: '1.9kV', drawingReferences: ['500CB-04220-DR-EL-0042'] },
    'wh:h1:mc417:in': { voltage: '6.9kV', drawingReferences: ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'] },
    'wh:h1:mc417:m1:rc': { voltage: '6.9kV', drawingReferences: ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'] },
    'wh:h1:mc417:m1:fc': { voltage: '6.9kV', drawingReferences: ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'] },
    'wh:h1:mc417:m2:rc': { voltage: '6.9kV', drawingReferences: ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'] },
    'wh:h1:mc417:m2:fc': { voltage: '6.9kV', drawingReferences: ['CB16OP038A-02006-DR-EL-0044', 'CB16OP038A-02006-DR-EL-0046'] },
    'wh:h7:mc418:in': { voltage: '6.9kV', drawingReferences: ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'] },
    'wh:h7:mc418:m1:rc': { voltage: '6.9kV', drawingReferences: ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'] },
    'wh:h7:mc418:m1:fc': { voltage: '6.9kV', drawingReferences: ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'] },
    'wh:h7:mc418:m2:rc': { voltage: '6.9kV', drawingReferences: ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'] },
    'wh:h7:mc418:m2:fc': { voltage: '6.9kV', drawingReferences: ['CB17OP023C-01006-DR-EL-0001', 'CB17OP023C-01006-DR-EL-0002'] },
    'wh:h9:mc419:in': { voltage: '6.9kV', drawingReferences: ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'] },
    'wh:h9:mc419:m1:rc': { voltage: '6.9kV', drawingReferences: ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'] },
    'wh:h9:mc419:m1:fc': { voltage: '6.9kV', drawingReferences: ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'] },
    'wh:h9:mc419:m2:rc': { voltage: '6.9kV', drawingReferences: ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'] },
    'wh:h9:mc419:m2:fc': { voltage: '6.9kV', drawingReferences: ['CB19OP001C-01068-DR-EL-0001', 'CB19OP001C-01068-DR-EL-0002'] },
    'rm420:mc420:in:vcb': { voltage: '6.9kV', drawingReferences: ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'] },
    'rm420:mc420:motor-01:rc': { voltage: '6.9kV', drawingReferences: ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'] },
    'rm420:mc420:motor-01:fc': { voltage: '6.9kV', drawingReferences: ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'] },
    'rm420:mc420:motor-02:rc': { voltage: '6.9kV', drawingReferences: ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'] },
    'rm420:mc420:motor-02:fc': { voltage: '6.9kV', drawingReferences: ['520CBC0007-2130-DR-EL-0003', '520CBC0007-2130-DR-EL-0004'] },
  },
};

export function getAssetProgramMetadata(model: Pick<NetworkModel, 'id'>, asset: Pick<Asset, 'id' | 'kind'>): AssetProgramMetadata {
  const entry = reviewedProgramMetadata[model.id]?.[asset.id];
  const voltage = asset.kind === 'earth-switch' ? '0V' : entry?.voltage;
  const drawingReferences = [...(entry?.drawingReferences ?? [])];
  const missingFields: AssetProgramMetadata['missingFields'] = [];
  if (!entry?.location) missingFields.push('location');
  if (!voltage) missingFields.push('voltage');
  if (!drawingReferences.length) missingFields.push('drawing references');
  return { location: entry?.location, voltage, associatedCircuitVoltage: entry?.associatedCircuitVoltage, drawingReferences, missingFields };
}
