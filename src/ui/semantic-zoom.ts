export type SemanticZoomLevel = 'overview' | 'context' | 'detail';

export type ContextLabelBox = { x: number; y: number; width: number; height: number };

type IndexedBox = ContextLabelBox;

/** Small uniform-grid index used while placing dozens of context tags per frame. */
export class ContextLabelCollisionIndex {
  private readonly cells = new Map<string, IndexedBox[]>();

  constructor(private readonly cellSize = 128) {}

  add(box: IndexedBox) {
    for (const key of cellKeys(box, this.cellSize)) {
      const items = this.cells.get(key) ?? [];
      items.push(box);
      this.cells.set(key, items);
    }
  }

  overlaps(box: IndexedBox) {
    const seen = new Set<IndexedBox>();
    for (const key of cellKeys(box, this.cellSize)) for (const other of this.cells.get(key) ?? []) {
      if (seen.has(other)) continue;
      seen.add(other);
      if (box.x < other.x + other.width && box.x + box.width > other.x
        && box.y < other.y + other.height && box.y + box.height > other.y) return true;
    }
    return false;
  }
}

type IndexedWire = { left: number; right: number; top: number; bottom: number; horizontal: boolean };

/** Spatially indexes orthogonal wire segments in screen coordinates. */
export class ContextWireCollisionIndex {
  private readonly cells = new Map<string, IndexedWire[]>();

  constructor(private readonly cellSize = 128) {}

  add(from: readonly [number, number], to: readonly [number, number]) {
    if (from[0] !== to[0] && from[1] !== to[1]) return;
    const segment: IndexedWire = {
      left: Math.min(from[0], to[0]), right: Math.max(from[0], to[0]),
      top: Math.min(from[1], to[1]), bottom: Math.max(from[1], to[1]),
      horizontal: from[1] === to[1],
    };
    for (const key of cellKeys({ x: segment.left, y: segment.top, width: segment.right - segment.left, height: segment.bottom - segment.top }, this.cellSize)) {
      const items = this.cells.get(key) ?? [];
      items.push(segment);
      this.cells.set(key, items);
    }
  }

  intersects(box: ContextLabelBox) {
    const seen = new Set<IndexedWire>();
    for (const key of cellKeys(box, this.cellSize)) for (const segment of this.cells.get(key) ?? []) {
      if (seen.has(segment)) continue;
      seen.add(segment);
      if (segment.horizontal) {
        if (segment.top > box.y && segment.top < box.y + box.height
          && segment.right > box.x && segment.left < box.x + box.width) return true;
      } else if (segment.left > box.x && segment.left < box.x + box.width
        && segment.bottom > box.y && segment.top < box.y + box.height) return true;
    }
    return false;
  }
}

function cellKeys(box: ContextLabelBox, cellSize: number) {
  const keys: string[] = [];
  for (let x = Math.floor(box.x / cellSize); x <= Math.floor((box.x + box.width) / cellSize); x++) {
    for (let y = Math.floor(box.y / cellSize); y <= Math.floor((box.y + box.height) / cellSize); y++) keys.push(`${x}:${y}`);
  }
  return keys;
}

/** Candidate positions stay screen-sized while the diagram itself is scaled. */
export function contextLabelPositions(centerX: number, centerY: number, width: number, height: number, gap = 13): ContextLabelBox[] {
  return [
    { x: centerX + gap, y: centerY - height / 2, width, height },
    { x: centerX - width - gap, y: centerY - height / 2, width, height },
    { x: centerX - width / 2, y: centerY - height - gap, width, height },
    { x: centerX - width / 2, y: centerY + gap, width, height },
  ];
}

/** Place a context tag on any clear side of its asset; omit it only if all sides conflict. */
export function chooseContextLabelPosition(
  candidates: readonly ContextLabelBox[],
  viewport: { width: number; height: number },
  placed: readonly ContextLabelBox[],
  crossesWire: (box: ContextLabelBox) => boolean,
): ContextLabelBox | undefined {
  return candidates.find(box => {
    const inViewport = box.x >= 0 && box.y >= 0
      && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
    if (!inViewport || crossesWire(box)) return false;
    return !placed.some(other => box.x < other.x + other.width && box.x + box.width > other.x
      && box.y < other.y + other.height && box.y + box.height > other.y);
  });
}

export function chooseContextLabelPositionIndexed(
  candidates: readonly ContextLabelBox[],
  viewport: { width: number; height: number },
  placed: ContextLabelCollisionIndex,
  crossesWire: (box: ContextLabelBox) => boolean,
): ContextLabelBox | undefined {
  return candidates.find(box => box.x >= 0 && box.y >= 0
    && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height
    && !crossesWire(box) && !placed.overlaps(box));
}

/**
 * Keep the same readable context visible while zooming from the overview into
 * an asset. Context labels bridge the overview and full detail thresholds, so
 * there is no intermediate zoom band where labels fade away.
 */
export function semanticZoomLevel(scale: number, continuous: boolean): SemanticZoomLevel {
  if (!continuous || scale >= 0.1) return 'detail';
  // Keep the fitted network compact: all assets remain selectable as map
  // markers while only inter-room links and room titles are shown. Equipment
  // symbols and priority labels appear once an individual area is large enough
  // to read, then complete wiring appears at detail scale.
  if (scale >= 0.02) return 'context';
  return 'overview';
}
