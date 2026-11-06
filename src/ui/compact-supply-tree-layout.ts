export type TreePoint = readonly [x: number, y: number];
export type TreeFootprint = { left: number; right: number };
export type CompactSupplyTreeOptions = {
  /** Distance between independently drawn labels/cards on a shared row. */
  horizontalGap?: number;
  /** Minimum vertical distance between successive device rows. */
  verticalGap?: number;
  /** Maximum width reserved for one group of sibling branches. */
  maxWidth?: number;
  /** Horizontal gap between disconnected source trees. */
  rootGap?: number;
};
export type CompactSupplyTreeResult = {
  positions: Readonly<Record<string, TreePoint>>;
  bounds: { x: number; y: number; width: number; height: number };
  /** Number of device rows on the longest route, before applying verticalGap. */
  rowCount: number;
};

type Extent = { left: number; right: number };
type Subtree = { points: Map<string, TreePoint>; rows: Map<number, Extent>; maxRow: number };

/**
 * Lay out a directed forest with a bounded-width, top-down tree strategy.
 *
 * Each sibling group is first packed side-by-side using the complete occupied
 * row contours of its subtrees. If adding a branch would exceed maxWidth, the
 * branch is placed below the prior group and reuses its horizontal space.
 * This intentionally trades some height for a narrower, easier-to-follow map.
 * It does not alter or infer any network relationships.
 */
export function compactSupplyTreeLayout(
  roots: readonly string[],
  children: ReadonlyMap<string, readonly string[]>,
  footprints: ReadonlyMap<string, TreeFootprint>,
  options: CompactSupplyTreeOptions = {},
): CompactSupplyTreeResult {
  const horizontalGap = positive(options.horizontalGap ?? 240, 'horizontalGap');
  const verticalGap = positive(options.verticalGap ?? 720, 'verticalGap');
  const maxWidth = positive(options.maxWidth ?? 18_000, 'maxWidth');
  const rootGap = positive(options.rootGap ?? 900, 'rootGap');
  const rootSet = new Set(roots);
  if (rootSet.size !== roots.length) throw new Error('Duplicate tree root');

  const parentOf = new Map<string, string>();
  for (const [parent, descendants] of children) {
    if (!footprints.has(parent)) throw new Error(`Missing footprint for ${parent}`);
    const unique = new Set(descendants);
    if (unique.size !== descendants.length) throw new Error(`Duplicate child under ${parent}`);
    for (const child of descendants) {
      if (!footprints.has(child)) throw new Error(`Missing footprint for ${child}`);
      const previousParent = parentOf.get(child);
      if (previousParent) throw new Error(`${child} has multiple parents: ${previousParent}, ${parent}`);
      parentOf.set(child, parent);
    }
  }
  for (const id of footprints.keys()) {
    if (!children.has(id)) throw new Error(`Missing child list for ${id}`);
    if (!rootSet.has(id) && !parentOf.has(id)) throw new Error(`${id} is not reachable from a root`);
    const extent = footprints.get(id)!;
    if (!Number.isFinite(extent.left) || !Number.isFinite(extent.right) || extent.left >= extent.right) {
      throw new Error(`Invalid footprint for ${id}`);
    }
  }
  for (const root of roots) if (!footprints.has(root)) throw new Error(`Missing footprint for root ${root}`);

  const built = new Map<string, Subtree>();
  const visiting = new Set<string>();
  function build(id: string): Subtree {
    const cached = built.get(id);
    if (cached) return cached;
    if (visiting.has(id)) throw new Error(`Cycle in supply tree at ${id}`);
    visiting.add(id);

    const points = new Map<string, TreePoint>();
    const rows = new Map<number, Extent>();
    const childCenters: number[] = [];
    let maxRow = 0;
    const add = (row: number, left: number, right: number) => {
      const prior = rows.get(row);
      rows.set(row, { left: Math.min(prior?.left ?? left, left), right: Math.max(prior?.right ?? right, right) });
    };

    for (const childId of children.get(id)!) {
      const child = build(childId);
      let xShift = 0;
      for (const [row, extent] of child.rows) {
        const prior = rows.get(row + 1);
        if (prior) xShift = Math.max(xShift, prior.right + horizontalGap - extent.left);
      }
      const currentLeft = Math.min(...[...rows.values()].map(extent => extent.left), 0);
      const currentRight = Math.max(...[...rows.values()].map(extent => extent.right), 0);
      const shiftedLeft = Math.min(...[...child.rows.values()].map(extent => extent.left + xShift));
      const shiftedRight = Math.max(...[...child.rows.values()].map(extent => extent.right + xShift));
      const mergedWidth = Math.max(currentRight, shiftedRight) - Math.min(currentLeft, shiftedLeft);
      let rowShift = 1;

      // Wrap, rather than extending the common row indefinitely. By putting
      // the new branch below the previous sibling group, its x-lane can be
      // reused without overlapping any earlier branch footprint.
      if (mergedWidth > maxWidth && childCenters.length > 0) {
        rowShift = maxRow + 1;
        xShift = 0;
      }

      for (const [key, [x, row]] of child.points) points.set(key, [x + xShift, row + rowShift]);
      for (const [row, extent] of child.rows) add(row + rowShift, extent.left + xShift, extent.right + xShift);
      childCenters.push(xShift + child.points.get(childId)![0]);
      maxRow = Math.max(maxRow, child.maxRow + rowShift);
    }

    const center = childCenters.length ? (childCenters[0] + childCenters.at(-1)!) / 2 : 0;
    points.set(id, [center, 0]);
    const own = footprints.get(id)!;
    add(0, center + own.left, center + own.right);
    visiting.delete(id);

    const normalized = {
      points: new Map([...points].map(([key, [x, row]]) => [key, [x - center, row] as TreePoint])),
      rows: new Map([...rows].map(([row, extent]) => [row, { left: extent.left - center, right: extent.right - center }])),
      maxRow,
    };
    built.set(id, normalized);
    return normalized;
  }

  const rootTrees = roots.map(root => build(root));
  const reachable = new Set(built.keys());
  // Also traverse detached components so cycles are reported as cycles rather
  // than being silently mistaken for a harmless missing root.
  for (const id of footprints.keys()) if (!built.has(id)) build(id);
  const unreachable = [...footprints.keys()].filter(id => !reachable.has(id));
  if (unreachable.length) throw new Error(`Nodes are not reachable from the supplied roots: ${unreachable.join(', ')}`);
  for (const root of roots) if (parentOf.has(root)) throw new Error(`Tree root ${root} also has parent ${parentOf.get(root)}`);

  const positions: Record<string, TreePoint> = {};
  let cursor = 0;
  let maxRow = 0;
  for (const [index] of roots.entries()) {
    const tree = rootTrees[index];
    const left = Math.min(...[...tree.rows.values()].map(extent => extent.left));
    const right = Math.max(...[...tree.rows.values()].map(extent => extent.right));
    for (const [id, [x, row]] of tree.points) positions[id] = [x + cursor - left, row * verticalGap];
    cursor += right - left + rootGap;
    maxRow = Math.max(maxRow, tree.maxRow);
  }

  const x = Math.min(...Object.entries(positions).map(([id, [px]]) => px + footprints.get(id)!.left));
  const right = Math.max(...Object.entries(positions).map(([id, [px]]) => px + footprints.get(id)!.right));
  const y = Math.min(...Object.values(positions).map(([, py]) => py));
  const bottom = Math.max(...Object.values(positions).map(([, py]) => py));
  return { positions, bounds: { x, y, width: right - x, height: bottom - y }, rowCount: maxRow + 1 };
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number`);
  return value;
}
