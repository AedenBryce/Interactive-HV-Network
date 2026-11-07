import type { NetworkModel } from '../session/model';
import type { SwitchingProgramSnapshot } from './switching-program-coordinator';
import type { ProgramMetadataResolver } from './program-document-rows';
import { buildSwitchingProgramDocumentRows } from './program-document-rows';
import { readProgramTemplateChoices, readDocmPackage, renderProgramDocumentXml, writeDocmPackage } from './docm-template-adapter';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export type SwitchingProgramDocumentResult =
  | { ok: true; bytes: Uint8Array; drawingReferences: string[] }
  | { ok: false; blockers: string[] };

export async function createSwitchingProgramDocument(
  templateBytes: Uint8Array,
  program: SwitchingProgramSnapshot,
  model: NetworkModel,
  resolveMetadata: ProgramMetadataResolver,
): Promise<SwitchingProgramDocumentResult> {
  const entries = await readDocmPackage(templateBytes);
  const document = entries.find(entry => entry.name === 'word/document.xml');
  const macro = entries.find(entry => entry.name === 'word/vbaProject.bin');
  if (!document || !macro) throw new Error('The master template is missing its document or VBA project.');

  const sourceXml = decoder.decode(document.data);
  const choices = readProgramTemplateChoices(sourceXml);
  const plan = buildSwitchingProgramDocumentRows(program, model, choices, resolveMetadata);
  if (plan.blockers.length) return { ok: false, blockers: plan.blockers };

  if (!program.type) throw new Error('Choose Isolation or Restoration before developing a program.');
  document.data = encoder.encode(renderProgramDocumentXml(sourceXml, program.type, plan.rows, plan.drawingReferences));
  return { ok: true, bytes: await writeDocmPackage(entries), drawingReferences: plan.drawingReferences };
}
