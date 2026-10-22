import { z } from 'zod';
import { modelSchema } from './model';
import type { NetworkModel } from './model';

const id = z.string().min(1);
export const scenarioSchema = z.strictObject({
  formatVersion: z.literal(1),
  modelVersion: id,
  model: modelSchema,
  devices: z.record(id, id.nullable()),
  sources: z.record(id, z.boolean().nullable()),
}).superRefine((scenario, context) => {
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
