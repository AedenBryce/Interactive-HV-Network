import { z } from 'zod';
import { modelSchema } from './model';
import type { NetworkModel } from './model';
import { deviceStateSchema, getRemovableMechanism, isIndependentState } from './mechanisms';

const id = z.string().min(1);
export const scenarioSchema = z.strictObject({
  formatVersion: z.union([z.literal(1), z.literal(2)]),
  modelVersion: id,
  model: modelSchema,
  devices: z.record(id, deviceStateSchema),
  sources: z.record(id, z.boolean().nullable()),
}).superRefine((scenario, context) => {
  const independent = scenario.model.assets.some(asset => getRemovableMechanism(asset));
  if (scenario.formatVersion === 1 && (independent || Object.values(scenario.devices).some(isIndependentState))) context.addIssue({ code: 'custom', message: 'Format1 supports discrete position states only; independent contact/racking models require format2.' });
  if (scenario.formatVersion === 2 && !independent) context.addIssue({ code: 'custom', message: 'Legacy-only models retain format1; format2 requires an independent contact/racking mechanism.' });
  if (scenario.modelVersion !== scenario.model.version) context.addIssue({ code: 'custom', path: ['modelVersion'], message: 'Scenario modelVersion does not match its original model snapshot.' });
  const states = modelSchema.safeParse({ ...scenario.model, starting: { devices: scenario.devices, sources: scenario.sources } });
  if (!states.success) for (const issue of states.error.issues) context.addIssue({ code: 'custom', message: `Scenario states: ${issue.message}` });
});

export type ScenarioFile = z.infer<typeof scenarioSchema>;

function orderedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, orderedKeys(item)]));
}

export function canonicalModelPackage(model: NetworkModel): string {
  return JSON.stringify(orderedKeys(model));
}
