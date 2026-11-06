import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { isDrive, isMotor, isMotorJunction } from './equipment-appearance';

export function layoutMotorAssemblies(model: NetworkModel, layout: DiagramLayout) {
  const merges = new Map<string, { controls: string[]; x: number; y: number }>();
  for (const reverse of model.assets.filter(asset => asset.kind === 'contactor' && asset.id.endsWith(':rc'))) {
    const base = reverse.id.slice(0, -3);
    const forward = model.assets.find(asset => asset.id === `${base}:fc`);
    const reverseFuse = model.assets.find(asset => asset.id === `${reverse.id}:fuse`);
    const forwardFuse = model.assets.find(asset => asset.id === `${base}:fc:fuse`);
    const motor = model.assets.find(asset => asset.id.startsWith(`${base}:`) && isMotor(asset));
    if (!forward || !reverseFuse || !forwardFuse || !motor) continue;
    const x = (layout.assets[reverseFuse.id][0] + layout.assets[forwardFuse.id][0]) / 2;
    const y = Math.min(layout.assets[reverseFuse.id][1], layout.assets[forwardFuse.id][1]);
    // Device cards are wider than the old 520-unit center spacing. Give the
    // RC and FC branches a 600-unit center spacing so neither their cards nor
    // the neighbouring status labels collide.
    layout.assets[reverseFuse.id] = [x - 300, y]; layout.assets[forwardFuse.id] = [x + 300, y];
    layout.assets[reverse.id] = [x - 300, y + 400]; layout.assets[forward.id] = [x + 300, y + 400];
    const junction = model.assets.find(asset => asset.id.startsWith(`${base}:`) && isMotorJunction(asset));
    if (junction) layout.assets[junction.id] = [x, y + 650];
    layout.assets[motor.id] = [x, y + 1100];
    merges.set(junction?.id ?? motor.id, { controls: [reverse.id, forward.id], x, y: y + 650 });
  }
  return merges;
}

export function layoutDriveAssemblies(model: NetworkModel, layout: DiagramLayout) {
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset] as const)));
  const peers = (terminals: string[]) => model.connections.flatMap(link => terminals.includes(link.from) ? [owners.get(link.to)!] : terminals.includes(link.to) ? [owners.get(link.from)!] : []);
  for (const drive of model.assets.filter(isDrive)) {
    const inputs = peers(drive.terminals.filter(terminal => /:ac-/.test(terminal)));
    const transformer = inputs[0];
    if (!transformer || transformer.kind !== 'transformer' || !inputs.every(asset => asset.id === transformer.id)) continue;
    const output = peers(drive.terminals.filter(terminal => terminal.endsWith(':output')))[0];
    const motor = output && peers(output.terminals).find(isMotor);
    if (!output || !motor) continue;
    const [x, y] = layout.assets[transformer.id];
    layout.assets[drive.id] = [x, y + 440];
    layout.assets[output.id] = [x, y + 900];
    layout.assets[motor.id] = [x, y + 1360];
  }
}
