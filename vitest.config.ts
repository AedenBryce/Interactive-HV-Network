import { defineConfig } from 'vitest/config';

// Deliberate production test roots. Historical layout experiments remain
// available through an explicit --config invocation, outside normal discovery.
export default defineConfig({
  test: {
    include: [
      'src/session/**/*.test.ts',
      'src/program/asset-program-metadata.test.ts',
      'src/ui/object-rotation.test.ts',
      'src/ui/AssetActions.test.tsx',
      'src/ui/connector-clearance.test.ts',
      'src/ui/action-status.test.ts',
      'src/ui/combined-switch-actions.test.ts',
      'src/ui/conductor-paths.test.ts',
      'src/ui/transformer-windings.test.ts',
      'src/ui/bus-tie-symbol.test.ts',
      'src/ui/authored-schematic.test.ts',
      'src/ui/authored-layout-loader.test.ts',
      'src/ui/layout-edit.test.ts',
      'src/ui/layout-review.test.ts',
      'src/ui/manual-label-layout.test.ts',
      'src/ui/compact-supply-tree-layout.test.ts',
      'src/ui/continuous-network.test.ts',
      'src/ui/geometry-validator.test.ts',
      'src/ui/room-overlap-placement.test.ts',
      'src/ui/route-crossing-detours.test.ts',
      'src/ui/route-crossing-gaps.test.ts',
      'src/ui/semantic-zoom.test.ts',
      'src/ui/switchroom-frames.test.ts',
      'src/ui/top-down-room-placement.test.ts',
    ],
  },
});


