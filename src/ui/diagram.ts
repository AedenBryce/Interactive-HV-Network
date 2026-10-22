// Presentation is separate from the electrical model. Coordinates never establish connectivity.
export const singleSupplyLayout = {
  assets: { 'supply-a': [80, 300], 'cb-01': [310, 300], 'tf-01': [520, 300], 'lv-bus': [750, 300] },
  terminals: { 'source-out': [110, 300], 'cb-in': [280, 300], 'cb-out': [340, 300], 'tf-hv': [487, 300], 'tf-lv': [553, 300], lv: [750, 300] },
} satisfies { assets: Record<string, [number, number]>; terminals: Record<string, [number, number]> };
