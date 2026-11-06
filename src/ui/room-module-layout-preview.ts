import roomModuleArtifact from '../models/site/room-module-layout.json';
import type { NetworkModel } from '../session/model';
import type { continuousNetwork } from './continuous-network';
import type { AssetLabel, Point } from './diagram-geometry';

type BaseGeometry = ReturnType<typeof continuousNetwork>;
type LayoutArtifact = {
  modelId: string;
  modelVersion: string;
  assetCount: number;
  connectionCount: number;
  positions: Record<string, Point>;
  terminalPositions: Record<string, Point>;
  labels: Record<string, AssetLabel>;
  routes: Record<string, Point[]>;
  frames: BaseGeometry['panels'];
  unresolvedConnectionIds: string[];
};

const artifact = roomModuleArtifact as unknown as LayoutArtifact;

/** Preview adapter for the selected rigid room-module top-down layout. */
export function withRoomModuleLayout(model: NetworkModel, base: BaseGeometry): BaseGeometry {
  if (model.id !== artifact.modelId || model.version !== artifact.modelVersion
    || model.assets.length !== artifact.assetCount || model.connections.length !== artifact.connectionCount
    || Object.keys(artifact.positions).length !== model.assets.length
    || Object.keys(artifact.routes).length !== model.connections.length
    || artifact.unresolvedConnectionIds.length > 0) return base;

  const labels = new Map(Object.entries(artifact.labels));
  const referenceItems = (base.referenceIds ?? []).flatMap(id => {
    const point = artifact.positions[id];
    const label = labels.get(id);
    return point && label ? [{ point, label }] : [];
  });
  const referenceBounds = referenceItems.length ? (() => {
    const left = Math.min(...referenceItems.map(({ point, label }) => Math.min(point[0] - 120, label.x - 20)));
    const right = Math.max(...referenceItems.map(({ point, label }) => Math.max(point[0] + 140, label.x + label.width + 20)));
    const top = Math.min(...referenceItems.map(({ point, label }) => Math.min(point[1] - 135, label.y - 20)));
    const bottom = Math.max(...referenceItems.map(({ point, label }) => Math.max(point[1] + 150, label.y + label.height + 24)));
    return { x: left, y: top, width: right - left, height: bottom - top };
  })() : undefined;

  return {
    ...base,
    view: {
      ...base.view,
      layout: {
        ...base.view.layout,
        assets: artifact.positions,
        terminals: artifact.terminalPositions,
      },
    },
    labels,
    routes: new Map(Object.entries(artifact.routes)),
    panels: artifact.frames,
    referenceBounds,
  };
}

export function isRoomModuleLayoutPreview(): boolean {
  return new URLSearchParams(window.location.search).get('layout') === 'room-modules';
}
