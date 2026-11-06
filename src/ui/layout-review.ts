import { validateLayoutEdits } from './layout-edit';

import type { LayoutEdits } from './layout-edit';

import reviewedLayout from '../models/site/reviewed-layout.json';

import { validateLineRoutes } from './line-routing';

import type { LineRoutes } from './line-routing';

import { validateDiagramAppearance } from './diagram-appearance';

import type { DiagramAppearance } from './diagram-appearance';

import { validateBusTakeoffs } from './bus-earth-layout';

import type { BusTakeoffs } from './bus-earth-layout';


export type LayoutReviewIdentity = {

  modelId: string;

  modelVersion: string;

  layoutRevision: string;

};


export type LayoutReviewDocument = LayoutReviewIdentity & {

  schemaVersion: 1;

  edits: LayoutEdits;

  markedForDeletion: string[];

  lineRoutes?: LineRoutes;
  manualLineRoutes?: string[];
  independentAssetPositions?: string[];
  rotations?: Record<string,number>;

  appearance?: DiagramAppearance;

  busTakeoffs?: BusTakeoffs;

  compactFrames?: boolean;
  framePaddingScale?: number;
  /** Top-left label positions relative to equipment anchors; #earth identifies an embedded earth tag. */
  labelPositions?: Record<string, [number, number]>;
  hiddenLabels?: string[];

  names?: Record<string, string>;

};


/** Reviewed room positions are also the initial layout in a fresh browser. */

export function initialLayoutReview(identity: LayoutReviewIdentity, assetIds: Iterable<string>, roomIds: Iterable<string>): LayoutReviewDocument {

  if (identity.modelId === reviewedLayout.modelId && identity.modelVersion === reviewedLayout.modelVersion && identity.layoutRevision === reviewedLayout.layoutRevision) {

    return parseLayoutReviewDocument(JSON.stringify(reviewedLayout), identity, assetIds, roomIds);

  }

  return createLayoutReviewDocument(identity, { assets: {}, rooms: {} }, []);

}


function validIdentity(identity: LayoutReviewIdentity) {

  if (![identity.modelId, identity.modelVersion, identity.layoutRevision].every(value => typeof value === 'string' && value.trim().length > 0)) {

    throw new Error('Layout review requires a model ID, model version and layout revision.');

  }

}


function sortedOffsets(offsets: LayoutEdits['assets']): LayoutEdits['assets'] {

  return Object.fromEntries(Object.entries(offsets).sort(([a], [b]) => a.localeCompare(b)).map(([id, point]) => [id, [...point]]));

}


/** Isolate browser saves for every model and authored layout revision. */

export function layoutReviewStorageKey(identity: LayoutReviewIdentity): string {

  validIdentity(identity);

  return `hv-layout-review:v1:${[identity.modelId, identity.modelVersion, identity.layoutRevision].map(encodeURIComponent).join(':')}`;

}


/** A review document records presentation edits and proposals, never deletions. */

export function createLayoutReviewDocument(

  identity: LayoutReviewIdentity,

  edits: LayoutEdits,

  markedForDeletion: Iterable<string>,

  lineRoutes?: LineRoutes,

): LayoutReviewDocument {

  validIdentity(identity);

  const validated = validateLayoutEdits(edits, Object.keys(edits.assets), Object.keys(edits.rooms));

  const marks = [...markedForDeletion];

  if (!marks.every(id => typeof id === 'string' && id.length > 0)) throw new Error('Deletion marks must be asset IDs.');

  return {

    schemaVersion: 1,

    modelId: identity.modelId,

    modelVersion: identity.modelVersion,

    layoutRevision: identity.layoutRevision,

    edits: { assets: sortedOffsets(validated.assets), rooms: sortedOffsets(validated.rooms) },

    markedForDeletion: [...new Set(marks)].sort(),

    ...(lineRoutes && Object.keys(lineRoutes).length ? { lineRoutes: validateLineRoutes(lineRoutes) } : {}),

  };

}


function isRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null && !Array.isArray(value);

}


/** Validate a saved/imported review against the exact drawing currently open. */

export function parseLayoutReviewDocument(

  raw: string,

  identity: LayoutReviewIdentity,

  assetIds: Iterable<string>,

  roomIds: Iterable<string>,

): LayoutReviewDocument {

  validIdentity(identity);

  const value: unknown = JSON.parse(raw);

  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error('Unsupported layout review format.');

  if (value.modelId !== identity.modelId || value.modelVersion !== identity.modelVersion || value.layoutRevision !== identity.layoutRevision) {

    throw new Error('This layout review belongs to a different model or layout revision.');

  }

  const allowedAssets = new Set(assetIds);
  const allowedLabelIds=new Set([...allowedAssets,...[...allowedAssets].map(id=>id+'#earth')]);
  if(value.hiddenLabels!==undefined&&(!Array.isArray(value.hiddenLabels)||!value.hiddenLabels.every(id=>typeof id==='string'&&allowedLabelIds.has(id))))throw new Error('Hidden labels must identify known equipment labels.');
  const hiddenLabels=value.hiddenLabels as string[]|undefined;
  let labelPositions: LayoutReviewDocument['labelPositions'];
  if(value.labelPositions!==undefined){
    const allowedLabels=[...allowedAssets,...[...allowedAssets].map(id=>id+'#earth')];
    labelPositions=validateLayoutEdits({assets:value.labelPositions,rooms:{}},allowedLabels,[]).assets;
  }
  if(value.rotations!==undefined&&(!isRecord(value.rotations)||Object.entries(value.rotations).some(([id,a])=>!allowedAssets.has(id)||typeof a!=='number'||![0,90,180,270].includes(a))))throw new Error('Invalid object rotations.');
  if(value.independentAssetPositions!==undefined&&(!Array.isArray(value.independentAssetPositions)||!value.independentAssetPositions.every(id=>typeof id==='string'&&allowedAssets.has(id))))throw new Error('Invalid independent asset positions.');
  if(value.manualLineRoutes!==undefined&&(!Array.isArray(value.manualLineRoutes)||!value.manualLineRoutes.every(id=>typeof id==='string'&&isRecord(value.lineRoutes)&&Object.hasOwn(value.lineRoutes,id))))throw new Error('Invalid manual line route IDs.');

  if (value.compactFrames !== undefined && typeof value.compactFrames !== 'boolean') throw new Error('Invalid compact layout setting.');
  if(value.framePaddingScale!==undefined&&(typeof value.framePaddingScale!=='number'||!Number.isFinite(value.framePaddingScale)||value.framePaddingScale<.5||value.framePaddingScale>1))throw new Error('Invalid frame padding scale.');

  if (value.names !== undefined && (!isRecord(value.names) || Object.entries(value.names).some(([id, name]) => !allowedAssets.has(id) || typeof name !== 'string' || !name.trim() || name.length > 160))) throw new Error('Invalid custom asset name.');

  const edits = validateLayoutEdits(value.edits, allowedAssets, roomIds);

  if (!Array.isArray(value.markedForDeletion) || !value.markedForDeletion.every((id: unknown) => typeof id === 'string' && allowedAssets.has(id))) {

    throw new Error('Deletion marks contain an unknown asset ID.');

  }

  return { ...createLayoutReviewDocument(identity, edits, value.markedForDeletion, validateLineRoutes(value.lineRoutes)),
    ...(labelPositions===undefined?{}:{labelPositions}),
    ...(hiddenLabels===undefined?{}:{hiddenLabels:[...new Set(hiddenLabels)]}),
    ...(value.rotations===undefined?{}:{rotations:value.rotations as Record<string,number>}),
    ...(value.independentAssetPositions===undefined?{}:{independentAssetPositions:[...new Set(value.independentAssetPositions as string[])]}),
    ...(value.manualLineRoutes===undefined?{}:{manualLineRoutes:[...new Set(value.manualLineRoutes as string[])]}),

    ...(value.names === undefined ? {} : { names: value.names as Record<string, string> }),

    ...(value.compactFrames === undefined ? {} : { compactFrames: value.compactFrames }),
    ...(value.framePaddingScale === undefined ? {} : { framePaddingScale: value.framePaddingScale }),

    ...(value.busTakeoffs === undefined ? {} : { busTakeoffs: validateBusTakeoffs(value.busTakeoffs) }),

    ...(value.appearance === undefined ? {} : { appearance: validateDiagramAppearance(value.appearance) }) };

}




