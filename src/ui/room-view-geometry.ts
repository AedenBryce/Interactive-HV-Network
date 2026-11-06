import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { SwitchroomFrame } from './switchroom-frames';
import type { Point } from './diagram-geometry';

export type RoomViewGeometry = {
  /** Coordinates copied from the best matching source presentation view or fallback layout. */
  assets: Record<string, Point>;
  terminals: Record<string, Point>;
  bends: Record<string, Point[]>;
  /** Source view identity for each copied item; absent entries used the generated fallback. */
  sourceViewByAsset: Record<string, string>;
  sourceViewByTerminal: Record<string, string>;
  sourceViewByConnection: Record<string, string>;
};

const copyPoint = (point: Point): Point => [point[0], point[1]];
const copyPoints = (points: Point[]): Point[] => points.map(copyPoint);

function sharedPathDepth(left: string, right: string) {
  const leftParts = left.split('/');
  const rightParts = right.split('/');
  let depth = 0;
  while (depth < leftParts.length && depth < rightParts.length && leftParts[depth] === rightParts[depth]) depth++;
  return depth;
}

function uniqueBestView<T>(views: T[], frameViewId: string, viewId: (view: T) => string): T | undefined {
  const scored = views.map(view => ({ view, score: sharedPathDepth(frameViewId, viewId(view)) }));
  const bestScore = Math.max(0, ...scored.map(item => item.score));
  if (!bestScore) return undefined;
  const best = scored.filter(item => item.score === bestScore);
  return best.length === 1 ? best[0].view : undefined;
}

/**
 * Extracts source geometry for the actual framed equipment without changing
 * the model, its presentation, or the generated global layout. Coordinates
 * remain in the selected source view's coordinate system; a caller that uses
 * them for placement must translate the room and its terminals together.
 *
 * A frame's id identifies its primary detail view. For multi-view frames,
 * other room views are selected only when their IDs share the most specific
 * path with that primary view and uniquely contain the asset/connection.
 * Ambiguous or missing source geometry falls back item-by-item to the current
 * generated layout.
 */
export function roomViewGeometry(model: NetworkModel, frame: SwitchroomFrame, fallback: DiagramLayout): RoomViewGeometry {
  const views = model.presentation?.views ?? [];
  const assetsById = new Map(model.assets.map(asset => [asset.id, asset]));
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const framedAssetIds = new Set(frame.assetIds);
  const assetView = new Map<string, (typeof views)[number] | undefined>();
  const result: RoomViewGeometry = {
    assets: {}, terminals: {}, bends: {},
    sourceViewByAsset: {}, sourceViewByTerminal: {}, sourceViewByConnection: {},
  };

  for (const assetId of frame.assetIds) {
    const source = uniqueBestView(
      views.filter(view => view.assetIds.includes(assetId) && view.layout.assets[assetId]),
      frame.id,
      view => view.id,
    );
    assetView.set(assetId, source);
    const sourcePosition = source?.layout.assets[assetId];
    const fallbackPosition = fallback.assets[assetId];
    if (sourcePosition) {
      result.assets[assetId] = copyPoint(sourcePosition);
      result.sourceViewByAsset[assetId] = source.id;
    } else if (fallbackPosition) {
      result.assets[assetId] = copyPoint(fallbackPosition);
    }

    const asset = assetsById.get(assetId);
    for (const terminal of asset?.terminals ?? []) {
      const sourceTerminal = source?.layout.terminals[terminal];
      const fallbackTerminal = fallback.terminals[terminal];
      if (sourceTerminal) {
        result.terminals[terminal] = copyPoint(sourceTerminal);
        result.sourceViewByTerminal[terminal] = source.id;
      } else if (fallbackTerminal) {
        result.terminals[terminal] = copyPoint(fallbackTerminal);
      }
    }
  }

  // Copy bends only when both endpoint assets are in this room. This excludes
  // diagram-only boundary stubs and avoids mistaking their remote endpoints
  // for equipment geometry.
  for (const connection of model.connections) {
    const fromOwner = terminalOwner.get(connection.from);
    const toOwner = terminalOwner.get(connection.to);
    if (!fromOwner || !toOwner || !framedAssetIds.has(fromOwner) || !framedAssetIds.has(toOwner)) continue;
    const candidates = views.filter(view => view.assetIds.includes(fromOwner)
      && view.assetIds.includes(toOwner)
      && Object.hasOwn(view.layout.bends ?? {}, connection.id));
    const source = uniqueBestView(candidates, frame.id, view => view.id);
    const sourceBends = source?.layout.bends?.[connection.id];
    const fallbackBends = fallback.bends?.[connection.id];
    if (sourceBends) {
      result.bends[connection.id] = copyPoints(sourceBends);
      result.sourceViewByConnection[connection.id] = source.id;
    } else if (fallbackBends) {
      result.bends[connection.id] = copyPoints(fallbackBends);
    }
  }

  return result;
}
