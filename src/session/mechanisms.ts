import { z } from 'zod';

export const breakerStateSchema = z.strictObject({ contact: z.enum(['open', 'closed']).nullable(), racking: z.enum(['in', 'out']).nullable() });
export const deviceStateSchema = z.union([z.string().min(1).nullable(), breakerStateSchema]);
export const breakerCommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('contact'), value: z.enum(['open', 'closed']) }),
  z.strictObject({ kind: z.literal('racking'), value: z.enum(['in', 'out']) }),
]);
export type BreakerState = z.infer<typeof breakerStateSchema>;
export type DeviceState = z.infer<typeof deviceStateSchema>;
export type BreakerCommand = z.infer<typeof breakerCommandSchema>;
export const isBreakerState = (state: DeviceState | undefined): state is BreakerState => typeof state === 'object' && state !== null;

export function removablePairs(mainPair: [string, string], state: DeviceState | undefined, possible: boolean): [string, string][] {
  if (!isBreakerState(state)) return [];
  return (state.contact === 'closed' || possible && state.contact === null) && (state.racking === 'in' || possible && state.racking === null) ? [mainPair] : [];
}

export function breakerActions(state: BreakerState) {
  const commands: { command: BreakerCommand; label: string }[] = [
    { command: { kind: 'contact', value: 'open' }, label: 'Open' }, { command: { kind: 'contact', value: 'closed' }, label: 'Close' },
    { command: { kind: 'racking', value: 'in' }, label: 'Rack in' }, { command: { kind: 'racking', value: 'out' }, label: 'Rack out' },
  ];
  return commands.map(action => {
    const reason = action.command.kind === 'contact'
      ? state.racking !== 'in' ? 'Contact operations require racking known In; Out or unconfirmed racking blocks this action.' : undefined
      : state.contact !== 'open' ? 'Racking requires the breaker contact known Open; Closed or unconfirmed contact blocks this action.' : undefined;
    return { ...action, allowed: reason === undefined, ...(reason ? { reason } : {}) };
  });
}

export function describeDeviceState(state: DeviceState | undefined): string {
  if (isBreakerState(state)) return `Contact: ${state.contact ?? 'Unconfirmed'} · Racking: ${state.racking ?? 'Unconfirmed'}`;
  return state ?? 'Unconfirmed';
}

export const contactPosition = (state: DeviceState | undefined) => isBreakerState(state) ? state.contact : state;
