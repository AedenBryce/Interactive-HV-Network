import type { ProgramDocumentRow, ProgramTemplateChoices } from './program-document-rows';
import type { SwitchingProgramType } from './switching-program-coordinator';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function decodeXml(value: string) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function encodeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function normalized(value: string) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function controlAlias(control: string) {
  const properties = control.match(/<w:sdtPr\b[^>]*>[\s\S]*?<\/w:sdtPr>/)?.[0];
  const alias = properties?.match(/<w:alias\b[^>]*w:val="([^"]*)"[^>]*\/?\s*>/)?.[1];
  return alias === undefined ? undefined : normalized(decodeXml(alias));
}

function controlChoiceValues(control: string) {
  const properties = control.match(/<w:sdtPr\b[^>]*>[\s\S]*?<\/w:sdtPr>/)?.[0] ?? '';
  return [...properties.matchAll(/<w:listItem\b[^>]*w:value="([^"]*)"[^>]*\/?\s*>/g)].map(match => decodeXml(match[1]));
}

const tablePattern = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g;
const rowPattern = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
const controlPattern = /<w:sdt\b[^>]*>[\s\S]*?<\/w:sdt>/g;

function tableText(table: string) {
  return decodeXml(table.replace(/<[^>]+>/g, ''));
}

function tableContaining(xml: string, phrase: string) {
  return [...xml.matchAll(tablePattern)].map(match => match[0]).find(table => tableText(table).includes(phrase));
}

function dataRows(table: string) {
  return [...table.matchAll(rowPattern)].map(match => match[0]).filter(row => {
    const aliases = [...row.matchAll(controlPattern)].map(match => controlAlias(match[0]));
    return aliases.includes('ACTION') && aliases.includes('INSTRUCTION');
  });
}

function textNode(value: string) {
  return `<w:t${/^\s|\s$/.test(value) ? ' xml:space="preserve"' : ''}>${encodeXml(value)}</w:t>`;
}

function setControlText(control: string, value: string) {
  let result = control.replace(/<w:showingPlcHdr\b[^>]*\/?\s*>/g, '');
  const content = result.match(/<w:sdtContent\b[^>]*>[\s\S]*?<\/w:sdtContent>/);
  if (!content) throw new Error('The Word template contains a content control without editable content.');
  let first = true;
  const nextContent = content[0].replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, previous => {
    const opening = previous.match(/^<w:t\b[^>]*>/)?.[0] ?? '<w:t>';
    const text = first ? value : '';
    first = false;
    const attrs = (opening.match(/^<w:t\b([^>]*)>/)?.[1] ?? '').replace(/\s+xml:space="[^"]*"/, '');
    const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
    return `<w:t${attrs}${space}>${encodeXml(text)}</w:t>`;
  });
  if (first) throw new Error('The Word template contains an empty content control.');
  return result.replace(content[0], nextContent);
}

function setRowField(row: string, alias: string, value: string) {
  let found = false;
  const expected = normalized(alias);
  const result = row.replace(controlPattern, control => {
    if (controlAlias(control) !== expected) return control;
    if (found) throw new Error(`The Word template repeats the ${alias} field in a sequence row.`);
    found = true;
    return setControlText(control, value);
  });
  if (!found) throw new Error(`The Word template sequence row has no ${alias} field.`);
  return result;
}

function setStepNumber(row: string, value: string) {
  const firstCell = row.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/)?.[0];
  if (!firstCell) throw new Error('The Word template sequence row has no step-number cell.');
  if (!/<w:t\b[^>]*>[\s\S]*?<\/w:t>/.test(firstCell)) throw new Error('The Word template step-number cell has no text slot.');
  const updatedCell = firstCell.replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/, textNode(value));
  return row.replace(firstCell, updatedCell);
}

function fillRow(row: string, number: number | undefined, fields: ProgramDocumentRow) {
  let result = setStepNumber(row, number === undefined ? '' : String(number));
  const values: Record<string, string> = {
    LOCATION: fields.location ?? '',
    VOLTAGE: fields.voltage ?? '',
    TYPE: fields.type ?? '',
    IDENTIFY: fields.identify ?? '',
    ACTION: fields.action ?? '',
    INSTRUCTION: fields.instructions ?? '',
  };
  for (const [alias, value] of Object.entries(values)) result = setRowField(result, alias, value);
  return result;
}

let cloneId = 2_000_000_000;
function uniqueClone(row: string) {
  let result = row.replace(/(<w:sdtPr\b[^>]*>[\s\S]*?<w:id\b[^>]*w:val=")[^"]*("[^>]*\/?\s*>[\s\S]*?<\/w:sdtPr>)/g, (_match, before: string, after: string) => `${before}${cloneId++}${after}`);
  result = result.replace(/\b(w:paraId|w:textId)="[0-9A-Fa-f]+"/g, match => `${match.slice(0, match.indexOf('="') + 2)}${(cloneId++).toString(16).padStart(8, '0')}"`);
  return result;
}

function updateSequenceTable(xml: string, type: SwitchingProgramType, rows: readonly ProgramDocumentRow[]) {
  const phrase = type === 'isolation' ? 'Start of Isolation' : 'Start of Restoration';
  const table = tableContaining(xml, phrase);
  if (!table) throw new Error(`The Word template has no ${type} sequence table.`);
  const data = dataRows(table);
  if (!data.length) throw new Error(`The Word template ${type} sequence table has no reusable rows.`);
  let inserted = false;
  const sequenceRows = rows.map((programRow, index) =>
    fillRow(index === 0 ? data[0] : uniqueClone(data[0]), index + 1, programRow));
  const updated = table.replace(rowPattern, row => {
    if (!data.includes(row)) return row;
    if (inserted) return '';
    inserted = true;
    return sequenceRows.join('');
  });
  return xml.replace(table, updated);
}

function replaceFormTextField(cell: string, value: string) {
  const separator = /<w:fldChar\b[^>]*w:fldCharType="separate"[^>]*\/?\s*>/.exec(cell);
  const end = /<w:fldChar\b[^>]*w:fldCharType="end"[^>]*\/?\s*>/.exec(cell);
  if (!separator || !end || end.index <= separator.index) throw new Error('The template Drawing Numbers field could not be located.');
  const startAt = separator.index + separator[0].length;
  const textRegion = cell.slice(startAt, end.index);
  let first = true;
  const updatedRegion = textRegion.replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, () => {
    const current = first ? value : '';
    first = false;
    return textNode(current);
  });
  if (first) throw new Error('The template Drawing Numbers field has no text slot.');
  return `${cell.slice(0, startAt)}${updatedRegion}${cell.slice(end.index)}`;
}

function updateDrawingNumbers(xml: string, references: readonly string[]) {
  if (!references.length) return xml;
  const row = [...xml.matchAll(rowPattern)].map(match => match[0]).find(candidate => candidate.includes('Drawing Numbers:'));
  if (!row) throw new Error('The Word template has no Drawing Numbers field.');
  const labelCell = [...row.matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)].map(match => match[0]).findIndex(cell => cell.includes('Drawing Numbers:'));
  const cells = [...row.matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)].map(match => match[0]);
  if (labelCell < 0 || !cells[labelCell + 1]) throw new Error('The Drawing Numbers field is not adjacent to its label.');
  const value = references.join(', ');
  const updatedCell = replaceFormTextField(cells[labelCell + 1], value);
  const updatedRow = row.replace(cells[labelCell + 1], updatedCell);
  return xml.replace(row, updatedRow);
}

export function readProgramTemplateChoices(documentXml: string): ProgramTemplateChoices {
  const table = tableContaining(documentXml, 'Start of Isolation');
  const row = table && dataRows(table)[0];
  if (!row) throw new Error('The master Word template has no Isolation sequence row to read.');
  const choices = new Map<string, string[]>();
  for (const match of row.matchAll(controlPattern)) {
    const alias = controlAlias(match[0]);
    if (alias) choices.set(alias, controlChoiceValues(match[0]));
  }
  const read = (alias: string) => {
    const values = choices.get(alias);
    if (!values) throw new Error(`The master Word template has no ${alias} dropdown.`);
    return values.filter(value => normalized(value) !== 'CHOOSE AN ITEM.');
  };
  return {
    locations: read('LOCATION'),
    voltages: read('VOLTAGE'),
    types: read('TYPE'),
    identifies: read('IDENTIFY'),
    actions: read('ACTION'),
    instructions: read('INSTRUCTION'),
  };
}

export function renderProgramDocumentXml(
  documentXml: string,
  type: SwitchingProgramType,
  rows: readonly ProgramDocumentRow[],
  drawingReferences: readonly string[],
) {
  const tableUpdated = updateSequenceTable(documentXml, type, rows);
  return updateDrawingNumbers(tableUpdated, drawingReferences);
}

export type DocmEntry = { name: string; data: Uint8Array; time: number; date: number; externalAttributes: number; internalAttributes: number };

function findEndRecord(view: DataView) {
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error('The selected file is not a supported Word ZIP package.');
}

async function inflateRaw(data: Uint8Array) {
  const stream = new Blob([copyArrayBuffer(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflateRaw(data: Uint8Array) {
  const stream = new Blob([copyArrayBuffer(data)]).stream().pipeThrough(new CompressionStream('deflate-raw' as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function copyArrayBuffer(data: Uint8Array) {
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return copy.buffer as ArrayBuffer;
}

export async function readDocmPackage(packageBytes: Uint8Array): Promise<DocmEntry[]> {
  const view = new DataView(packageBytes.buffer, packageBytes.byteOffset, packageBytes.byteLength);
  const eocd = findEndRecord(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries: DocmEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('The Word ZIP package central directory is malformed.');
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const time = view.getUint16(offset + 12, true);
    const date = view.getUint16(offset + 14, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const internalAttributes = view.getUint16(offset + 36, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('ZIP64 Word packages are not supported.');
    const name = decoder.decode(packageBytes.subarray(offset + 46, offset + 46 + nameLength));
    const localView = new DataView(packageBytes.buffer, packageBytes.byteOffset + localOffset, packageBytes.byteLength - localOffset);
    if (localView.getUint32(0, true) !== 0x04034b50) throw new Error(`The Word package entry ${name} has a malformed local header.`);
    const localNameLength = localView.getUint16(26, true);
    const localExtraLength = localView.getUint16(28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressedData = packageBytes.subarray(dataOffset, dataOffset + compressedSize);
    const data = method === 0 ? compressedData.slice() : method === 8 ? await inflateRaw(compressedData) : undefined;
    if (!data) throw new Error(`The Word package entry ${name} uses unsupported compression method ${method}.`);
    if (data.length !== uncompressedSize) throw new Error(`The Word package entry ${name} has an invalid uncompressed size.`);
    entries.push({ name, data, time, date, externalAttributes, internalAttributes });
    offset += 46 + nameLength + extraLength + commentLength;
    if ((flags & 0x1) !== 0) throw new Error('Encrypted Word ZIP packages are not supported.');
  }
  return entries;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeLocalHeader(entry: DocmEntry, method: number, compressed: Uint8Array, crc: number, flags: number) {
  const name = encoder.encode(entry.name);
  const header = new Uint8Array(30 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, flags, true);
  view.setUint16(8, method, true);
  view.setUint16(10, entry.time, true);
  view.setUint16(12, entry.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, compressed.length, true);
  view.setUint32(22, entry.data.length, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  header.set(name, 30);
  return header;
}

function writeCentralHeader(entry: DocmEntry, method: number, compressed: Uint8Array, crc: number, flags: number, localOffset: number) {
  const name = encoder.encode(entry.name);
  const header = new Uint8Array(46 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, flags, true);
  view.setUint16(10, method, true);
  view.setUint16(12, entry.time, true);
  view.setUint16(14, entry.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, compressed.length, true);
  view.setUint32(24, entry.data.length, true);
  view.setUint16(28, name.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, entry.internalAttributes, true);
  view.setUint32(38, entry.externalAttributes, true);
  view.setUint32(42, localOffset, true);
  header.set(name, 46);
  return header;
}

function concat(chunks: readonly Uint8Array[]) {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function writeDocmPackage(entries: readonly DocmEntry[]) {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const compressed = entry.data.length ? await deflateRaw(entry.data) : entry.data;
    const method = entry.data.length ? 8 : 0;
    const flags = /[^\x00-\x7F]/.test(entry.name) ? 0x800 : 0;
    const crc = crc32(entry.data);
    const local = writeLocalHeader(entry, method, compressed, crc, flags);
    const central = writeCentralHeader(entry, method, compressed, crc, flags, localOffset);
    localChunks.push(local, compressed);
    centralChunks.push(central);
    localOffset += local.length + compressed.length;
  }
  const centralDirectory = concat(centralChunks);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, centralDirectory.length, true);
  view.setUint32(16, localOffset, true);
  view.setUint16(20, 0, true);
  return concat([...localChunks, centralDirectory, end]);
}

export function docmBlob(bytes: Uint8Array) {
  return new Blob([copyArrayBuffer(bytes)], { type: 'application/vnd.ms-word.document.macroEnabled.12' });
}
