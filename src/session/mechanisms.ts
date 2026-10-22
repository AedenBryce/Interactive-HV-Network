import { z } from 'zod';

export const independentStateSchema = z.strictObject({ contact: z.enum(['open', 'closed']).nullable(), racking: z.enum(['in', 'out']).nullable() });
export const breakerStateSchema = independentStateSchema;
export const deviceStateSchema = z.union([z.string().min(1).nullable(), independentStateSchema]);
export const independentCommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('contact'), value: z.enum(['open', 'closed']) }),
  z.strictObject({ kind: z.literal('racking'), value: z.enum(['in', 'out']) }),
]);
export const breakerCommandSchema = independentCommandSchema;
export type IndependentState = z.infer<typeof independentStateSchema>;
export type IndependentCommand = z.infer<typeof independentCommandSchema>;
export type BreakerState = IndependentState;
export type DeviceState = z.infer<typeof deviceStateSchema>;
export type BreakerCommand = IndependentCommand;
export const isIndependentState = (state: DeviceState | undefined): state is IndependentState => typeof state === 'object' && state !== null;
export const isBreakerState = isIndependentState;

type MechanismDeclaration = { mainPair: [string, string] };
export type RemovableMechanismFields = { removableBreaker?: MechanismDeclaration; removableContactor?: MechanismDeclaration };
export type RemovableMechanism = MechanismDeclaration & { kind: 'breaker' | 'contactor' };

export function getRemovableMechanism(asset: RemovableMechanismFields | undefined): RemovableMechanism | undefined {
  if (asset?.removableBreaker) return { kind: 'breaker', ...asset.removableBreaker };
  if (asset?.removableContactor) return { kind: 'contactor', ...asset.removableContactor };
  return undefined;
}

export function removablePairs(mainPair: [string, string], state: DeviceState | undefined, possible: boolean): [string, string][] {
  if (!isIndependentState(state)) return [];
  return (state.contact === 'closed' || possible && state.contact === null) && (state.racking === 'in' || possible && state.racking === null) ? [mainPair] : [];
}

export function independentCommandLabel(command: IndependentCommand): string {
  return command.kind === 'contact' ? command.value === 'open' ? 'Open' : 'Close' : command.value === 'in' ? 'Rack in' : 'Rack out';
}

export const breakerCommandLabel = independentCommandLabel;

export function independentActions(state: IndependentState, kind: RemovableMechanism['kind'] = 'breaker') {
  const commands: IndependentCommand[] = [
    { kind: 'contact', value: 'open' }, { kind: 'contact', value: 'closed' }, { kind: 'racking', value: 'in' }, { kind: 'racking', value: 'out' },
  ];
  return commands.map(command => {
    const reason = command.kind === 'contact'
      ? state.racking !== 'in' ? 'Contact operations require racking known In; Out or unconfirmed racking blocks this action.' : undefined
      : state.contact !== 'open' ? `Racking requires the ${kind} contact known Open; Closed or unconfirmed contact blocks this action.` : undefined;
    return { command, label: independentCommandLabel(command), allowed: reason === undefined, ...(reason ? { reason } : {}) };
  });
}

export const breakerActions = independentActions;

export function describeDeviceState(state: DeviceState | undefined): string {
  if (isIndependentState(state)) return `Contact: ${state.contact ?? 'Unconfirmed'} · Racking: ${state.racking ?? 'Unconfirmed'}`;
  return state ?? 'Unconfirmed';
}

export const contactPosition = (state: DeviceState | undefined) => isIndependentState(state) ? state.contact : state;
