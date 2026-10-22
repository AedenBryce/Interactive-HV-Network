import { z } from 'zod';
import { evidenceRefSchema } from './evidence';
import type { InterlockCondition, InterlockDefinition } from './interlocks';
import { breakerCommandSchema } from './mechanisms';

const id = z.string().min(1);
const conditionSchema: z.ZodType<InterlockCondition> = z.lazy(() => z.union([
  z.strictObject({ kind: z.literal('device'), assetId: id, position: id }),
  z.strictObject({ kind: z.literal('device'), assetId: id, axis: z.literal('contact'), value: z.enum(['open', 'closed']) }),
  z.strictObject({ kind: z.literal('device'), assetId: id, axis: z.literal('racking'), value: z.enum(['in', 'out']) }),
  z.strictObject({ kind: z.literal('source'), sourceId: id, enabled: z.boolean() }),
  z.strictObject({ kind: z.enum(['all', 'any']), conditions: z.array(conditionSchema).min(1) }),
]));

const ruleFields = { require: conditionSchema, explanation: id, evidence: z.array(evidenceRefSchema) };
export const interlockSchema = z.strictObject({
  reviews: z.array(z.strictObject({ assetId: id, status: z.enum(['confirmed-none', 'confirmed-rules', 'unresolved']), note: id, evidence: z.array(evidenceRefSchema) })),
  rules: z.array(z.union([z.strictObject({ id, assetId: id, position: id, ...ruleFields }), z.strictObject({ id, assetId: id, command: breakerCommandSchema, ...ruleFields })])),
});

type ModelForInterlockValidation = {
  synthetic: boolean;
  assets: { id: string; positions: { id: string }[]; removableBreaker?: { mainPair: [string, string] } }[];
  sources: { id: string }[];
  interlocks?: InterlockDefinition;
};

export function validateInterlocks(model: ModelForInterlockValidation, error: (message: string) => void) {
  if (!model.interlocks) return;
  const { reviews, rules } = model.interlocks;
  if (new Set(reviews.map(review => review.assetId)).size !== reviews.length) error('Duplicate interlock review for an asset.');
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) error('Duplicate interlock rule identity.');
  const isPosition = (assetId: string, position: string) => model.assets.some(asset => asset.id === assetId && asset.positions.some(candidate => candidate.id === position));
  const checkCondition = (condition: InterlockCondition, ruleId: string) => {
    if (condition.kind === 'device') {
      if ('position' in condition) {
        if (!isPosition(condition.assetId, condition.position)) error(`Interlock ${ruleId} references an unknown device or position: ${condition.assetId}/${condition.position}.`);
      } else if (!model.assets.some(asset => asset.id === condition.assetId && asset.removableBreaker)) error(`Interlock ${ruleId} axis predicate requires a removable breaker: ${condition.assetId}/${condition.axis}.`);
    } else if (condition.kind === 'source') {
      if (!model.sources.some(source => source.id === condition.sourceId)) error(`Interlock ${ruleId} references unknown source ${condition.sourceId}.`);
    } else condition.conditions.forEach(child => checkCondition(child, ruleId));
  };
  for (const review of reviews) {
    if (!model.assets.some(asset => asset.id === review.assetId && (asset.positions.length > 0 || asset.removableBreaker))) error(`Interlock review references unknown switchable asset ${review.assetId}.`);
    const hasRules = rules.some(rule => rule.assetId === review.assetId);
    if (review.status === 'confirmed-none' && hasRules) error(`Interlock review for ${review.assetId} confirms no rules but rules are present.`);
    if (review.status === 'confirmed-rules' && !hasRules) error(`Interlock review for ${review.assetId} confirms rules but none are present.`);
    if (!model.synthetic && review.status !== 'unresolved' && review.evidence.length === 0) error(`Confirmed interlock review for ${review.assetId} requires evidence.`);
  }
  for (const rule of rules) {
    if ('position' in rule) {
      if (!isPosition(rule.assetId, rule.position)) error(`Interlock ${rule.id} references an unknown target device or position.`);
    } else if (!model.assets.some(asset => asset.id === rule.assetId && asset.removableBreaker)) error(`Interlock ${rule.id} command target requires a removable breaker.`);
    if (!reviews.some(review => review.assetId === rule.assetId)) error(`Interlock ${rule.id} has no review record.`);
    if (!model.synthetic && rule.evidence.length === 0) error(`Interlock ${rule.id} requires evidence.`);
    checkCondition(rule.require, rule.id);
  }
}
