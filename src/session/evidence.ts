import { z } from 'zod';

export const evidenceRefSchema = z.strictObject({
  document: z.string().min(1),
  revision: z.string().min(1).optional(),
  page: z.number().int().positive().optional(),
  clause: z.string().min(1).optional(),
});

export type EvidenceReference = z.infer<typeof evidenceRefSchema>;

export const knowledgeSchema = z.enum(['supported', 'provisional', 'unresolved', 'owner-confirmed']);
const id = z.string().min(1);
const resolution = z.strictObject({ by: id, date: id, decision: id });
export const evidenceRecordSchema = z.strictObject({ id, status: knowledgeSchema, summary: id, references: z.array(evidenceRefSchema), confirmation: resolution.optional() }).superRefine((record, context) => {
  if (record.status === 'owner-confirmed' && !record.confirmation) context.addIssue({ code: 'custom', message: 'Owner-confirmed evidence requires an explicit confirmation record.' });
});
export const reviewRecordSchema = z.strictObject({ id, question: id, status: z.enum(['open', 'resolved']), evidenceIds: z.array(id), resolution: resolution.optional() }).superRefine((record, context) => {
  if (record.status === 'resolved' && !record.resolution) context.addIssue({ code: 'custom', message: 'A resolved review requires a recorded decision.' });
  if (record.status === 'open' && record.resolution) context.addIssue({ code: 'custom', message: 'An open review cannot also contain a resolution.' });
});
export const claimFields = { knowledge: knowledgeSchema.optional(), evidenceIds: z.array(id).optional(), reviewIds: z.array(id).optional() };

export function isSupported(model: { synthetic: boolean }, claim: { knowledge?: z.infer<typeof knowledgeSchema> }) {
  return claim.knowledge === 'supported' || claim.knowledge === 'owner-confirmed' || (model.synthetic && claim.knowledge === undefined);
}
