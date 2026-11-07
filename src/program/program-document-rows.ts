import type { Asset, NetworkModel } from '../session/model';
import type { SessionAction } from '../session/session';
import { independentCommandLabel } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import type { SwitchingProgramSnapshot } from './switching-program-coordinator';
import type { AssetProgramMetadata, ProgramLocation, ProgramVoltage } from './asset-program-metadata';

export type ProgramDocumentRow = {
  location?: ProgramLocation;
  voltage?: ProgramVoltage;
  type?: string;
  identify?: string;
  action?: string;
  instructions?: string;
};

export type ProgramTemplateChoices = {
  locations: readonly string[];
  voltages: readonly string[];
  types: readonly string[];
  identifies: readonly string[];
  actions: readonly string[];
  instructions: readonly string[];
};

export type ProgramMetadataResolver = (model: Pick<NetworkModel, 'id'>, asset: Pick<Asset, 'id' | 'kind'>) => AssetProgramMetadata;

export type ProgramDocumentRowsPlan = {
  rows: ProgramDocumentRow[];
  blockers: string[];
  drawingReferences: string[];
};

function normalized(value: string) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function choice(value: string, options: readonly string[]) {
  const key = normalized(value);
  return options.find(option => normalized(option) === key);
}

function typeForAsset(asset: Asset, choices: ProgramTemplateChoices) {
  const known: Partial<Record<Asset['kind'], string>> = {
    breaker: 'CIRCUIT BREAKER',
    contactor: 'CONTACTOR',
    'earth-switch': 'EARTH SWITCH',
  };
  const direct = known[asset.kind];
  if (direct) return choice(direct, choices.types);

  const labels = [asset.label, ...(asset.aliases ?? [])].map(normalized);
  const candidates = choices.types.filter(type => labels.some(label => label === normalized(type) || label.startsWith(`${normalized(type)} `)));
  return candidates.length === 1 ? candidates[0] : undefined;
}

function identifyForAsset(asset: Asset, choices: ProgramTemplateChoices) {
  const labels = [asset.label, ...(asset.aliases ?? [])].map(value => value.trim().replace(/\s+/g, ' '));
  const prefixes = asset.kind === 'breaker' ? ['CB'] : asset.kind === 'earth-switch' ? ['ES'] : [];
  const candidates = [...labels];
  for (const label of labels) for (const prefix of prefixes) {
    const withoutType = label.replace(new RegExp(`^${prefix}\\s+`, 'i'), '');
    if (withoutType !== label) candidates.push(withoutType);
  }

  const identifierVariants = [...candidates];
  for (const candidate of candidates) {
    const compact = candidate.replace(/\b(IN|FD|FDR)\s+(?=\d)/gi, '$1');
    if (compact !== candidate) identifierVariants.push(compact);
    const feederNumber = compact.replace(/\bFD\s*(\d{1,2})\b/gi, 'FDR$1');
    if (feederNumber !== compact) identifierVariants.push(feederNumber);
    const feederWithoutOne = compact.replace(/\bFD\s*0?1\b/gi, 'FDR');
    if (feederWithoutOne !== compact) identifierVariants.push(feederWithoutOne);
    const feeder = compact.replace(/\bFD\b/gi, 'FDR');
    if (feeder !== compact) identifierVariants.push(feeder);
  }

  const normalizeIdentifier = (value: string) => normalized(value).replace(/\b(IN|FD|FDR)\s+(?=\d)/g, '$1');
  for (const variant of identifierVariants) {
    const matches = choices.identifies.filter(candidate => normalizeIdentifier(candidate) === normalizeIdentifier(variant));
    if (matches.length === 1) return matches[0];
  }
  return undefined;
}

function operationFromLabel(label: string | undefined): string | undefined {
  switch (normalized(label ?? '')) {
    case 'OPEN': return 'OPEN';
    case 'CLOSED': case 'CLOSE': return 'CLOSE';
    case 'RACK IN': case 'RACKED IN': return 'RACK IN';
    case 'RACK OUT': case 'RACKED OUT': return 'RACK OUT';
    default: return undefined;
  }
}

function operationForAction(action: Exclude<SessionAction, { kind: 'source' }>, asset: Asset): string | undefined {
  if (action.kind !== 'device') return choice(independentCommandLabel(action.command), ['Open', 'Close', 'Rack in', 'Rack out'])?.toUpperCase();
  const position = asset.positions.find(candidate => candidate.id === action.to);
  return operationFromLabel(position?.label);
}

function verifiedInstruction(action: Exclude<SessionAction, { kind: 'source' }>, state: DeviceState | undefined, asset: Asset): string | undefined {
  let stateLabel: string | undefined;
  if (action.kind === 'device') {
    stateLabel = asset.positions.find(position => position.id === state)?.label;
  } else if (typeof state === 'object' && state !== null) {
    stateLabel = action.command.kind === 'contact'
      ? state.contact === 'open' ? 'Open' : state.contact === 'closed' ? 'Closed' : undefined
      : state.racking === 'in' ? 'Rack in' : state.racking === 'out' ? 'Rack out' : undefined;
  }
  const operation = operationFromLabel(stateLabel);
  if (operation === 'OPEN') return 'VERIFY OPEN';
  if (operation === 'CLOSE') return 'VERIFY CLOSED';
  if (operation === 'RACK IN') return 'VERIFY RACKED IN';
  if (operation === 'RACK OUT') return 'VERIFY RACKED OUT';
  return undefined;
}

function addBlocker(blockers: Set<string>, label: string, field: string) {
  blockers.add(`${label}: ${field}.`);
}

export function buildSwitchingProgramDocumentRows(
  program: SwitchingProgramSnapshot,
  model: NetworkModel,
  choices: ProgramTemplateChoices,
  resolveMetadata: ProgramMetadataResolver,
): ProgramDocumentRowsPlan {
  const rows: ProgramDocumentRow[] = [];
  const blockers = new Set<string>();
  const references = new Set<string>();
  const handledActions = new Set<number>();
  const assets = new Map(model.assets.map(asset => [asset.id, asset]));

  function selected(value: string | undefined, field: keyof ProgramTemplateChoices, label: string) {
    if (!value) {
      addBlocker(blockers, label, `${field} mapping is not confirmed`);
      return undefined;
    }
    const match = choice(value, choices[field]);
    if (!match) addBlocker(blockers, label, `${field} value “${value}” is not in the master template`);
    return match;
  }

  function assetFields(asset: Asset) {
    const label = asset.label;
    const metadata = resolveMetadata(model, asset);
    if (!metadata.location) addBlocker(blockers, label, 'location is not assigned');
    if (!metadata.voltage) addBlocker(blockers, label, 'voltage is not assigned');
    if (!metadata.drawingReferences.length) addBlocker(blockers, label, 'drawing references are not assigned');
    metadata.drawingReferences.forEach(reference => references.add(reference));

    const type = selected(typeForAsset(asset, choices), 'types', label);
    const identify = selected(identifyForAsset(asset, choices), 'identifies', label);
    const location = metadata.location ? selected(metadata.location, 'locations', label) as ProgramLocation | undefined : undefined;
    const voltage = metadata.voltage ? selected(metadata.voltage, 'voltages', label) as ProgramVoltage | undefined : undefined;
    return { label, metadata, type, identify, location, voltage };
  }

  function verifiedRow(fields: ReturnType<typeof assetFields>, action: Exclude<SessionAction, { kind: 'source' }>, state: DeviceState | undefined) {
    const instruction = verifiedInstruction(action, state, assets.get(action.assetId)!);
    const instructions = selected(instruction, 'instructions', fields.label);
    const verify = selected('VERIFY', 'actions', fields.label);
    if (fields.location && fields.voltage && fields.type && fields.identify && verify && instructions) {
      rows.push({ location: fields.location, voltage: fields.voltage, type: fields.type, identify: fields.identify, action: verify, instructions });
    }
  }

  for (let index = 0; index < program.steps.length; index += 1) {
    const step = program.steps[index];
    if (step.source === 'program') {
      const action = selected(step.action, 'actions', 'Program communication');
      const instructions = selected(step.instructions, 'instructions', 'Program communication');
      if (action && instructions) rows.push({ action, instructions });
      continue;
    }
    if (step.role !== 'verify-before' || handledActions.has(step.actionId)) continue;

    const action = program.steps.find(candidate => candidate.source === 'apparatus' && candidate.actionId === step.actionId && candidate.role === 'action');
    const after = program.steps.find(candidate => candidate.source === 'apparatus' && candidate.actionId === step.actionId && candidate.role === 'verify-after');
    if (!action || action.source !== 'apparatus' || !after || after.source !== 'apparatus') {
      addBlocker(blockers, step.action.assetId, 'verification group is incomplete');
      continue;
    }
    handledActions.add(step.actionId);
    const asset = assets.get(action.action.assetId);
    if (!asset) {
      addBlocker(blockers, action.action.assetId, 'asset is missing from the selected model');
      continue;
    }
    const fields = assetFields(asset);
    const operation = operationForAction(action.action, asset);
    const actionValue = selected(operation, 'actions', fields.label);

    if (asset.kind === 'earth-switch' && operation === 'CLOSE') {
      const testVoltage = fields.metadata.associatedCircuitVoltage
        ? selected(fields.metadata.associatedCircuitVoltage, 'voltages', fields.label) as ProgramVoltage | undefined
        : undefined;
      if (!fields.metadata.associatedCircuitVoltage) addBlocker(blockers, fields.label, 'associated circuit test voltage is not assigned');
      const verify = selected('VERIFY', 'actions', fields.label);
      const test = selected('TEST', 'actions', fields.label);
      const closeInstruction = selected('CLOSE EARTH SWITCH', 'instructions', fields.label);
      const openInstruction = selected('VERIFY OPEN', 'instructions', fields.label);
      const closedInstruction = selected('VERIFY CLOSED', 'instructions', fields.label);
      const meterInstruction = selected('TEST METER', 'instructions', fields.label);
      const deadInstruction = selected('TEST FOR DEAD', 'instructions', fields.label);
      const earthVoltage = fields.voltage;
      if (fields.location && fields.type && fields.identify && earthVoltage && verify && test && actionValue && closeInstruction && openInstruction && closedInstruction && meterInstruction && deadInstruction && testVoltage) {
        const base = { location: fields.location, identify: fields.identify };
        rows.push(
          { ...base, type: 'EARTH SWITCH', voltage: '0V', action: verify, instructions: openInstruction },
          { ...base, voltage: testVoltage, action: test, instructions: meterInstruction },
          { ...base, voltage: testVoltage, type: 'PHASE VOLTAGE INDICATOR', action: test, instructions: deadInstruction },
          { ...base, voltage: testVoltage, action: test, instructions: meterInstruction },
          { ...base, type: fields.type, voltage: '0V', action: actionValue, instructions: closeInstruction },
          { ...base, type: fields.type, voltage: '0V', action: verify, instructions: closedInstruction },
        );
      }
      continue;
    }

    const instruction = operation && fields.type ? `${operation} ${fields.type}` : undefined;
    const actionInstructions = selected(instruction, 'instructions', fields.label);
    if (actionValue && actionInstructions && fields.location && fields.voltage && fields.type && fields.identify) {
      verifiedRow(fields, step.action, step.state);
      rows.push({ location: fields.location, voltage: fields.voltage, type: fields.type, identify: fields.identify, action: actionValue, instructions: actionInstructions });
      verifiedRow(fields, action.action, after.state);
    }
  }

  return {
    rows: blockers.size ? [] : rows,
    blockers: [...blockers],
    drawingReferences: [...references],
  };
}
