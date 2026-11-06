import type { DiagramLayout } from '../session/presentation';

/**
 * Spread the eight outgoing SW411 feeder trees into distinct columns before
 * bus taps and switchroom frames are derived. Compact tree wrapping can reuse
 * a column for branches at different depths; that makes unrelated feeders
 * appear to share the same conductor lane in the whole-network overview.
 *
 * The caller owns subtree traversal so the same movement rule can be applied
 * before any downstream geometry is calculated. This changes presentation
 * coordinates only; it does not change assets, connections, or states.
 */
export function separateSw411FeederLanes(
  layout: Pick<DiagramLayout, 'assets'>,
  moveBranch: (rootAssetId: string, deltaX: number, deltaY: number) => void,
  laneSpacing = 900,
): void {
  if (!Number.isFinite(laneSpacing) || laneSpacing <= 0) {
    throw new Error('laneSpacing must be a positive finite number');
  }

  for (const tiers of [
    ['01', '02', '03', '04'],
    ['13', '14', '15', '16'],
  ]) {
    const roots = tiers
      .map(tier => `sw411:tier-${tier}:cb`)
      .filter(id => layout.assets[id]);
    if (roots.length < 2) continue;

    const centerX = roots.reduce((sum, id) => sum + layout.assets[id][0], 0) / roots.length;
    const centerIndex = (roots.length - 1) / 2;
    roots.forEach((id, index) => {
      const targetX = centerX + (index - centerIndex) * laneSpacing;
      moveBranch(id, targetX - layout.assets[id][0], 0);
    });
  }
}
