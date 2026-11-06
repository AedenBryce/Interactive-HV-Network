import type { Point } from './diagram-geometry';

type Extent = { left: number; right: number };
type Tree = { points: Map<string, Point>; rows: Map<number, Extent> };

// Pack the actual occupied rows, rather than reserving every leaf's width all
// the way to its source. Coordinates are presentation only.
export function supplyTreeLayout(roots: string[], children: Map<string, string[]>, inline: Set<string>, buses: Set<string>, earthOwners: Set<string>, footprints: Map<string, Extent>) {
  const add = (rows: Map<number, Extent>, row: number, left: number, right: number) => {
    const previous = rows.get(row);
    rows.set(row, { left: Math.min(previous?.left ?? left, left), right: Math.max(previous?.right ?? right, right) });
  };
  function branch(id: string): Tree {
    const kids = children.get(id)!;
    const points = new Map<string, Point>(); const rows = new Map<number, Extent>();
    const centers: number[] = [];
    for (const [index, child] of kids.entries()) {
      const subtree = branch(child);
      let shift = 0;
      // Stagger sibling branches down the page. Different feeder depths can
      // then share horizontal space without reversing any source-to-load path.
      const step = inline.has(id) ? 1 : earthOwners.has(id) && earthOwners.has(child) ? 5 : 4 + index % 3;
      for (const [row, extent] of subtree.rows) {
        const occupied = rows.get(row + step);
        if (occupied) shift = Math.max(shift, occupied.right + 60 - extent.left);
      }
      centers.push(shift);
      for (const [key, [x, y]] of subtree.points) points.set(key, [x + shift, y + step * 280]);
      for (const [row, extent] of subtree.rows) add(rows, row + step, extent.left + shift, extent.right + shift);
    }
    const center = centers.length ? (centers[0] + centers.at(-1)!) / 2 : 0;
    points.set(id, [center, 0]);
    const extent = footprints.get(id)!;
    for (const row of inline.has(id) ? [0] : [-1, 0, 1]) add(rows, row, center + extent.left, center + extent.right);
    if (centers.length > 1) add(rows, buses.has(id) || inline.has(id) ? 0 : 1, centers[0] - 30, centers.at(-1)! + 30);
    return { points: new Map([...points].map(([key, [x, y]]) => [key, [x - center, y]])), rows: new Map([...rows].map(([row, extent]) => [row, { left: extent.left - center, right: extent.right - center }])) };
  }
  const assets: Record<string, Point> = {};
  let cursor = 120;
  for (const root of roots) {
    const tree = branch(root);
    const left = Math.min(...[...tree.rows.values()].map(row => row.left));
    const right = Math.max(...[...tree.rows.values()].map(row => row.right));
    for (const [id, [x, y]] of tree.points) assets[id] = [x + cursor - left, y + 280];
    cursor += right - left + 180;
  }
  // Keep the adjacent Crushing 1/2 switchrooms legible as separate rooms.
  // Their confirmed tie makes them natural neighbours; stagger down the page
  // instead of pushing either room sideways and creating a long link lane.
  return assets;
}
