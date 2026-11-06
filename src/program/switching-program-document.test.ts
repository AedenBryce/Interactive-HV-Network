import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { singleSupply } from '../models/synthetic';
import { SimulationSession } from '../session/session';
import { SwitchingProgramCoordinator } from './switching-program-coordinator';
import { getAssetProgramMetadata } from './asset-program-metadata';
import { createSwitchingProgramDocument } from './switching-program-document';
import { readDocmPackage } from './docm-template-adapter';

describe('switching program Word document', () => {
  it('develops an isolation DOCM with the selected section and preserves the VBA project', async () => {
    const path = fileURLToPath(new URL('../../100-TE-DC-0022_0 High Voltage Switching Program.docm', import.meta.url));
    const templateBytes = new Uint8Array(readFileSync(path));
    const originalEntries = await readDocmPackage(templateBytes);
    const originalMacro = originalEntries.find(entry => entry.name === 'word/vbaProject.bin');
    if (!originalMacro) throw new Error('The template VBA project is missing.');
    const capture = new SwitchingProgramCoordinator(new SimulationSession(singleSupply));
    capture.start('isolation');

    const result = await createSwitchingProgramDocument(templateBytes, capture.snapshot(), singleSupply, getAssetProgramMetadata);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const generatedEntries = await readDocmPackage(result.bytes);
    const generatedDocument = generatedEntries.find(entry => entry.name === 'word/document.xml');
    const generatedMacro = generatedEntries.find(entry => entry.name === 'word/vbaProject.bin');
    const generatedXml = new TextDecoder().decode(generatedDocument?.data);
    expect(generatedXml).toContain('<w:t>INFORM CCR OF INTENT TO ISOLATE EQUIPMENT</w:t>');
    expect(generatedXml).not.toContain('<w:t>CANCEL ACCESS CERTIFICATE</w:t>');
    expect([...generatedMacro?.data ?? []]).toEqual([...originalMacro.data]);
  });
});
