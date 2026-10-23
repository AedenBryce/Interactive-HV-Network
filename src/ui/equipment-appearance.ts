import type { Asset } from '../session/model';
import { getRemovableMechanism } from '../session/mechanisms';

// Diagram roles supplement the frozen model's broader interface kind.
const scrubberMotors = new Set(['sw505:sb214-em01', 'sw505:sb215-em01', 'sw505:sb216-em01']);
export const isMotor = (asset: Asset) => asset.kind === 'interface' && asset.terminals.length === 1 && (/\bmotor\b/i.test(asset.label) || scrubberMotors.has(asset.id)) && !/junction|common/i.test(asset.label);
export const isDrive = (asset: Asset) => asset.kind === 'interface' && !!asset.sourceArcs?.length && asset.id.endsWith(':converter');
export const isFuse = (asset: Asset) => asset.kind === 'interface' && asset.terminals.length === 2 && !asset.positions.length && /Intact in teaching model/i.test(asset.label);
export const isMotorJunction = (asset: Asset) => asset.kind === 'interface' && asset.id.endsWith(':common') && /motor|phase conductor/i.test(asset.label);
export const hasDeviceCard = (asset: Asset) => !!(asset.positions.length || getRemovableMechanism(asset) || isFuse(asset));

export function compactEquipmentLabel(asset: Asset, currentLabel: string) {
  if (isDrive(asset)) return `${currentLabel.split('\n')[0]}\nVSD`;
  if (isMotor(asset)) return currentLabel.split('\n').slice(0, 2).join('\n');
  return currentLabel;
}
