import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { earthFixture } from '../models/earth-fixture';
import { singleSupply } from '../models/synthetic';
import { SimulationSession } from '../session/session';
import { SwitchingProgramCoordinator } from './switching-program-coordinator';
import { getAssetProgramMetadata } from './asset-program-metadata';
import { createSwitchingProgramDocument } from './switching-program-document';
import { readDocmPackage } from './docm-template-adapter';

function tableContaining(xml: string, marker: string) {
  return [...xml.matchAll(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g)].map(match => match[0])
    .find(table => table.replace(/<[^>]+>/g, '').includes(marker));
}

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

  it('develops the Restoration section with its fixed communications', async () => {
    const path = fileURLToPath(new URL('../../100-TE-DC-0022_0 High Voltage Switching Program.docm', import.meta.url));
    const templateBytes = new Uint8Array(readFileSync(path));
    const capture = new SwitchingProgramCoordinator(new SimulationSession(singleSupply));
    capture.start('restoration');

    const result = await createSwitchingProgramDocument(templateBytes, capture.snapshot(), singleSupply, getAssetProgramMetadata);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = await readDocmPackage(result.bytes);
    const document = entries.find(entry => entry.name === 'word/document.xml');
    const xml = new TextDecoder().decode(document?.data);
    const restoration = tableContaining(xml, 'Start of Restoration');
    expect(restoration).toBeDefined();
    if (!restoration) return;
    expect(restoration).toContain('CANCEL ACCESS CERTIFICATE');
    expect(restoration).toContain('INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT');
    expect(restoration).toContain('INFORM CCR THAT EQUIPMENT IS DE-ISOLATED');
    expect(xml).toContain('INFORM CCR OF INTENT TO ISOLATE EQUIPMENT');
    expect(restoration?.indexOf('CANCEL ACCESS CERTIFICATE')).toBeLessThan(restoration?.indexOf('INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT'));
    expect(restoration?.indexOf('INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT')).toBeLessThan(restoration?.indexOf('INFORM CCR THAT EQUIPMENT IS DE-ISOLATED'));
  });

  it('develops the earth-close check group in the real template using only supplied metadata', async () => {
    const path = fileURLToPath(new URL('../../100-TE-DC-0022_0 High Voltage Switching Program.docm', import.meta.url));
    const templateBytes = new Uint8Array(readFileSync(path));
    const model = structuredClone(earthFixture);
    const earthSwitch = model.assets.find(asset => asset.id === 'es-01');
    if (!earthSwitch) throw new Error('The synthetic earth switch is missing.');
    earthSwitch.label = 'RM420 ES01';
    const session = new SimulationSession(model);
    const program = new SwitchingProgramCoordinator(session);
    program.start('isolation');
    session.changeDevice('es-01', 'closed');
    const resolver = (_model: typeof model, asset: typeof model.assets[number]) => ({
      location: 'RM420' as const,
      voltage: asset.kind === 'earth-switch' ? '0V' as const : undefined,
      associatedCircuitVoltage: asset.kind === 'earth-switch' ? '6.6kV' as const : undefined,
      drawingReferences: ['SYNTHETIC-EARTH-DRAWING'],
      missingFields: [] as const,
    });

    const result = await createSwitchingProgramDocument(templateBytes, program.snapshot(), model, resolver);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = await readDocmPackage(result.bytes);
    const document = entries.find(entry => entry.name === 'word/document.xml');
    const xml = new TextDecoder().decode(document?.data);
    const isolation = tableContaining(xml, 'Start of Isolation');
    expect(isolation).toBeDefined();
    if (!isolation) return;
    const orderedChecks = ['VERIFY OPEN', 'TEST METER', 'TEST FOR DEAD', 'TEST METER', 'CLOSE EARTH SWITCH', 'VERIFY CLOSED'];
    const plainText = isolation.replace(/<[^>]+>/g, '');
    let cursor = 0;
    const instructionIndexes = orderedChecks.map(value => {
      const index = plainText.indexOf(value, cursor);
      cursor = index < 0 ? cursor : index + value.length;
      return index;
    });
    expect(instructionIndexes.every(index => index >= 0)).toBe(true);
    expect(instructionIndexes).toEqual([...instructionIndexes].sort((a, b) => a - b));
    expect(isolation).toContain('PHASE VOLTAGE INDICATOR');
    expect(isolation).toContain('6.6kV');
    expect(isolation).toContain('0V');
    expect(isolation?.match(/<w:t>TEST FOR DEAD<\/w:t>/g)).toHaveLength(1);
  });
});
