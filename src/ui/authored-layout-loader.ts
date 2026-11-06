import type { NetworkModel } from '../session/model';
import { composeAuthoredSchematic, type AuthoredSchematic } from './authored-schematic';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
  return value;
}

export async function modelFingerprint(model: NetworkModel): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(model)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Validate the saved drawing, then compose rigid transforms without any search. */
export async function loadAuthoredLayout(model: NetworkModel, schematic: AuthoredSchematic) {
  if (schematic.status !== 'complete') throw new Error('The authored network drawing is incomplete.');
  if (!schematic.modelFingerprint || await modelFingerprint(model) !== schematic.modelFingerprint) {
    throw new Error('The authored network drawing belongs to a different model snapshot.');
  }
  return composeAuthoredSchematic(model, schematic);
}
