// Presentation is separate from the electrical model. Coordinates never establish connectivity.
export const singleSupplyLayout = {
  assets: { 'supply-a': [80, 300], 'cb-01': [310, 300], 'tf-01': [520, 300], 'lv-bus': [750, 300] },
  terminals: { 'source-out': [110, 300], 'cb-in': [280, 300], 'cb-out': [340, 300], 'tf-hv': [487, 300], 'tf-lv': [553, 300], lv: [750, 300] },
} satisfies { assets: Record<string, [number, number]>; terminals: Record<string, [number, number]> };

import type { DiagramLayout } from '../session/presentation';
export type { DiagramLayout, DiagramBoundary, DiagramView, DiagramPresentation } from '../session/presentation';

export const alternateLayout: DiagramLayout = {
  assets: { 'supply-a': [70, 140], 'cb-01': [240, 140], 'bus-a': [420, 140], 'tf-01': [590, 140], 'lv-bus': [760, 140], 'supply-b': [70, 440], 'cb-02': [240, 440], 'bus-b': [420, 440], 'tie-01': [420, 290], 'loop-01': [600, 440] },
  terminals: { 'source-out': [100, 140], 'cb-in': [210, 140], 'cb-out': [270, 140], 'hv-a': [420, 140], 'tf-hv': [557, 140], 'tf-lv': [623, 140], lv: [760, 140], 'source-b-out': [100, 440], 'cb-b-in': [210, 440], 'cb-b-out': [270, 440], 'hv-b': [420, 440], 'tie-a': [420, 260], 'tie-b': [420, 320], 'loop-a': [570, 440], 'loop-b': [630, 440] },
  rotations: { 'tie-01': 90 },
  labelOffsets: { 'bus-a': [0, -55], 'tie-01': [82, 5] },
  bends: { 'loop-bus-a': [[700, 440], [700, 250], [480, 250], [480, 140]] },
};

export const earthLayout: DiagramLayout = {
  assets: { 'supply-a': [70, 140], 'cb-01': [240, 140], 'tf-01': [450, 140], 'lv-bus': [720, 140], 'es-01': [420, 300], 'isolated-bus': [720, 440], 'es-02': [420, 440] },
  terminals: { 'source-out': [100, 140], 'cb-in': [210, 140], 'cb-out': [270, 140], 'tf-hv': [417, 140], 'tf-lv': [483, 140], lv: [720, 140], 'es-01-in': [420, 270], 'earth-01': [420, 330], 'isolated-lv': [720, 440], 'es-02-in': [420, 410], 'earth-02': [420, 470] },
  bends: { 'section-earth': [[360, 140], [360, 270]], 'separate-section-earth': [[720, 380], [420, 380]] },
};
