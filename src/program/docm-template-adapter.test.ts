import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readProgramTemplateChoices, readDocmPackage, writeDocmPackage, renderProgramDocumentXml } from './docm-template-adapter';
import type { DocmEntry } from './docm-template-adapter';
import type { ProgramDocumentRow } from './program-document-rows';

function control(alias: string, options: string[] = []) {
  const list = options.map(value => `<w:listItem w:displayText="${value}" w:value="${value}"/>`).join('');
  return `<w:sdt><w:sdtPr><w:alias w:val="${alias}"/><w:comboBox>${list}</w:comboBox></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Choose an item.</w:t></w:r></w:p></w:sdtContent></w:sdt>`;
}

function sequenceRow(number = '1') {
  return `<w:tr><w:tc><w:p><w:r><w:t>${number}</w:t></w:r></w:p></w:tc>${control('LOCATION', ['MC001'])}${control('VOLTAGE', ['415V'])}${control('TYPE', ['CIRCUIT BREAKER'])}${control('IDENTIFY', ['CB-01'])}${control('ACTION', ['INFORM', 'CLOSE', 'VERIFY'])}${control('Instruction ', ['INFORM CCR ISOLATIONS IS COMPLETE', 'CLOSE CIRCUIT BREAKER', 'VERIFY OPEN'])}</w:tr>`;
}

const fixtureXml = `<w:document><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Drawing Numbers:</w:t></w:r></w:p></w:tc><w:tc><w:fldChar w:fldCharType="separate"/><w:r><w:t> </w:t></w:r><w:fldChar w:fldCharType="end"/></w:tc></w:tr></w:tbl><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Start of Isolation</w:t></w:r></w:p></w:tc></w:tr>${sequenceRow()}</w:tbl><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Start of Restoration</w:t></w:r></w:p></w:tc></w:tr>${sequenceRow()}</w:tbl></w:body></w:document>`;

describe('macro-enabled template adapter', () => {
  it('reads only the values present in the template dropdowns', () => {
    const choices = readProgramTemplateChoices(fixtureXml);
    expect(choices.actions).toEqual(['INFORM', 'CLOSE', 'VERIFY']);
    expect(choices.identifies).toEqual(['CB-01']);
    expect(choices.instructions).toContain('INFORM CCR ISOLATIONS IS COMPLETE');
  });

  it('fills fields, blanks unused row fields, extends the table, and writes relevant drawing numbers', () => {
    const rows: ProgramDocumentRow[] = [
      { action: 'INFORM', instructions: 'INFORM CCR ISOLATIONS IS COMPLETE' },
      { location: 'MC001', voltage: '415V', type: 'CIRCUIT BREAKER', identify: 'CB-01', action: 'CLOSE', instructions: 'CLOSE CIRCUIT BREAKER' },
    ];
    const result = renderProgramDocumentXml(fixtureXml, 'isolation', rows, ['DRAWING-A', 'DRAWING-B']);
    const isolation = [...result.matchAll(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g)].map(match => match[0]).find(table => table.includes('Start of Isolation'));

    expect(isolation).toContain('<w:t>1</w:t>');
    expect(isolation).toContain('<w:t>2</w:t>');
    expect(isolation).toContain('INFORM CCR ISOLATIONS IS COMPLETE');
    expect(isolation).toContain('CLOSE CIRCUIT BREAKER');
    expect(isolation).not.toContain('<w:t>Choose an item.</w:t>');
    expect(result).toContain('DRAWING-A, DRAWING-B');
    expect(isolation?.match(/<w:tr\b/g)).toHaveLength(3);
  });

  it('round-trips ZIP package parts without changing macro bytes', async () => {
    const entries: DocmEntry[] = [
      { name: 'word/document.xml', data: new TextEncoder().encode('<document/>'), time: 0, date: 0, externalAttributes: 0, internalAttributes: 0 },
      { name: 'word/vbaProject.bin', data: new Uint8Array([0, 1, 2, 127, 255]), time: 0, date: 0, externalAttributes: 0, internalAttributes: 0 },
    ];
    const bytes = await writeDocmPackage(entries);
    const restored = await readDocmPackage(bytes);

    expect(restored.map(entry => [entry.name, [...entry.data]])).toEqual(entries.map(entry => [entry.name, [...entry.data]]));
  });

  it('uses the real macro-enabled template and retains its VBA project while adding the isolation communications', async () => {
    const path = fileURLToPath(new URL('../../100-TE-DC-0022_0 High Voltage Switching Program.docm', import.meta.url));
    const original = await readDocmPackage(new Uint8Array(readFileSync(path)));
    const document = original.find(entry => entry.name === 'word/document.xml');
    const macro = original.find(entry => entry.name === 'word/vbaProject.bin');
    if (!document || !macro) throw new Error('The master template is incomplete.');
    const choices = readProgramTemplateChoices(new TextDecoder().decode(document.data));
    const rows: ProgramDocumentRow[] = [{ action: 'INFORM', instructions: 'INFORM CCR ISOLATIONS IS COMPLETE' }];
    const rendered = renderProgramDocumentXml(new TextDecoder().decode(document.data), 'isolation', rows, []);
    const output = await writeDocmPackage(original.map(entry => entry.name === 'word/document.xml'
      ? { ...entry, data: new TextEncoder().encode(rendered) }
      : entry));
    const result = await readDocmPackage(output);
    const resultDocument = result.find(entry => entry.name === 'word/document.xml');
    const resultMacro = result.find(entry => entry.name === 'word/vbaProject.bin');
    const resultHeaders = result.filter(entry => /^word\/header\d+\.xml$/.test(entry.name));

    expect(choices.instructions).toContain('INFORM CCR ISOLATIONS IS COMPLETE');
    expect(choices.instructions).toContain('TEST METER');
    expect(choices.voltages).toContain('720V');
    expect(choices.voltages).toContain('11kV');
    expect(new TextDecoder().decode(resultDocument?.data)).toContain('INFORM CCR ISOLATIONS IS COMPLETE');
    expect(resultHeaders.every(header => !new TextDecoder().decode(header.data).toUpperCase().includes('DRAFT'))).toBe(true);
    for (const originalHeader of original.filter(entry => /^word\/header\d+\.xml$/.test(entry.name))) {
      expect(result.find(entry => entry.name === originalHeader.name)?.data).toEqual(originalHeader.data);
    }
    expect([...resultMacro?.data ?? []]).toEqual([...macro.data]);
  });
});
