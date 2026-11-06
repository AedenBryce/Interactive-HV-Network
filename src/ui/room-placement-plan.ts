/**
 * Owner-confirmed room-level topology used by the whole-network layout planner.
 *
 * Frame IDs are the view IDs in switchroom-frames.ts. `order` is a deterministic
 * layout traversal order among branches from the same parent; it does not assert
 * a physical left/right location. Missing parent branches are deliberately
 * marked unconfirmed rather than inferred from a drawing or an asset label.
 */
export type RoomFrameId =
  | 'sw411/overview'
  | 'crushing-1/hv'
  | 'crushing-2/sw435-hv'
  | 'crushing-2/hpgr-hv'
  | 'screening/hv'
  | 'desands/hv'
  | 'desands/laboratory'
  | 'stockpile/stockpile-hv'
  | 'stockpile/wet-hv'
  | 'train-loading/hv'
  | 'cv006/rm406-hv'
  | 'cv006/rm410-hv'
  | 'western/h1-rmu'
  | 'western/h1-hv'
  | 'western/h7-rmu'
  | 'western/h7-hv'
  | 'western/h9-rmu'
  | 'western/h9-hv'
  | 'services/rm721'
  | 'services/mine-services'
  | 'services/workshop'
  | 'services/dump-pocket-hv'
  | 'services/conveyor-hv'
  | 'services/rm413a-hv'
  | 'hopper-10/rmu'
  | 'hopper-10/mv'
  | 'mine-camp/mine-sw441'
  | 'western-supplemental/h3/mv'
  | 'western-supplemental/h8/mv';

export type SupplyAnchorId = 'source:TF11' | 'source:TF12' | 'source:TF04';

export type RoomPlacementParent =
  | {
      kind: 'room';
      id: RoomFrameId;
      /** Stable layout ordering for branches from this parent, not geography. */
      order: number;
      /** User-confirmed feeder/takeoff description for this placement edge. */
      route: string;
      /** Real model connection used to color a compact overview route live. */
      connectionId?: string;
      /** Full modeled path when a room is reached through several connections. */
      connectionIds?: readonly string[];
    }
  | {
      kind: 'supply-anchor';
      id: SupplyAnchorId;
      /** Stable layout ordering for branches from this source, not geography. */
      order: number;
      /** User-confirmed supply path description. */
      route: string;
      /** Real model connection used to color a compact overview route live. */
      connectionId?: string;
      /** Full modeled path when a room is reached through several connections. */
      connectionIds?: readonly string[];
    };

export type RoomPlacementNode = {
  /** Only owner-confirmed parents are listed here. */
  parents: readonly RoomPlacementParent[];
  /** `unconfirmed` means no parent edge is asserted for this room. */
  topology: 'owner-confirmed' | 'unconfirmed';
};

/**
 * Explicit, room-ID keyed hierarchy for the topology the owner confirmed in
 * this conversation. Frames without a confirmed room-level parent stay roots
 * with `topology: 'unconfirmed'` until the owner supplies that relationship.
 */
export const roomPlacementPlan = {
  'sw411/overview': {
    topology: 'owner-confirmed',
    parents: [
      { kind: 'supply-anchor', id: 'source:TF11', order: 1, route: 'SB01 F4 → TF11 → SW411 IN03' },
      { kind: 'supply-anchor', id: 'source:TF12', order: 2, route: 'SB02 F1 → TF12 → SW411 IN04' },
    ],
  },
  'crushing-1/hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 5, route: 'SW411 tier 13 → SW431 via SW431-P-01' }],
  },
  'crushing-2/sw435-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 4, route: 'SW411 tier 04 → SW435 via SW435-P-01' }],
  },
  'crushing-2/hpgr-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'crushing-2/sw435-hv', order: 1, route: 'SW435 HPGR feeder' }],
  },
  'screening/hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 7, route: 'SW411 tier 15 → SW421 via SW421-P-01' }],
  },
  'desands/hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 6, route: 'SW411 tier 14 → SW426 via SW426-P-01' }],
  },
  'desands/laboratory': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'desands/hv', order: 1, route: 'SW426 SS714 feeder → RM714' }],
  },
  'stockpile/stockpile-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 1, route: 'SW411 tier 01 → SW454 via SW454-P-01' }],
  },
  'stockpile/wet-hv': { topology: 'unconfirmed', parents: [] },
  'train-loading/hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 2, route: 'SW411 tier 02 → SW451 via SW451-P-01' }],
  },
  'cv006/rm406-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 3, route: 'SW411 tier 03 → RM406 from SW411 tier 03' }],
  },
  'cv006/rm410-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 3, route: 'SW411 tier 03 → RM410 from SW411 tier 03' }],
  },
  'western/h1-rmu': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'services/conveyor-hv', order: 1, route: 'RM413 IN02 cable-side double boot → RM417 SW01' }],
  },
  'western/h1-hv': { topology: 'unconfirmed', parents: [] },
  'western/h7-rmu': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'western/h9-rmu', order: 1, route: 'RM419 SW02 → RM418 SW01' }],
  },
  'western/h7-hv': { topology: 'unconfirmed', parents: [] },
  'western/h9-rmu': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'cv006/rm410-hv', order: 1, route: 'RM410 CB03 / SW04 → RM419 SW01' }],
  },
  'western/h9-hv': { topology: 'unconfirmed', parents: [] },
  'services/rm721': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'sw411/overview', order: 8, route: 'SW411 tier 16 → RM721 via RM721-P-01' }],
  },
  'services/mine-services': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'services/rm721', order: 1, route: 'RM721 → SF RM712 IN02' }],
  },
  'services/workshop': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'services/rm721', order: 2, route: 'RM721 → SF RM713 IN01' }],
  },
  'services/dump-pocket-hv': { topology: 'unconfirmed', parents: [] },
  'services/conveyor-hv': { topology: 'unconfirmed', parents: [] },
  'services/rm413a-hv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'services/conveyor-hv', order: 2, route: 'RM413 IN02 cable-side double boot → RM413A' }],
  },
  'hopper-10/rmu': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'supply-anchor', id: 'source:TF04', order: 1, route: 'TF04 33 kV line → Pole 286 → RM420' }],
  },
  'hopper-10/mv': { topology: 'unconfirmed', parents: [] },
  'mine-camp/mine-sw441': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'supply-anchor', id: 'source:TF12', order: 1, route: 'TF12 line → OPF1-7 pole spur → WT1-CB recloser → SW441 IN01', connectionIds: ['owner:tf12:opf1-7-water', 'mine:wt1:source', 'mine:sw441:incoming:cable'] }],
  },
  'western-supplemental/h3/mv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'western/h1-rmu', order: 1, route: 'RM417 CB02 / SW04 → Hopper3 SS416 kiosk' }],
  },
  'western-supplemental/h8/mv': {
    topology: 'owner-confirmed',
    parents: [{ kind: 'room', id: 'cv006/rm406-hv', order: 1, route: 'RM406 CB03 / SW04 → Hopper8 SS416-HV416' }],
  },
} as const satisfies Record<RoomFrameId, RoomPlacementNode>;

/** The owner-confirmed closed ring; keep the rooms adjacent on the same row. */
export const roomPlacementAdjacencies = [
  {
    from: 'crushing-1/hv',
    to: 'crushing-2/sw435-hv',
    kind: 'confirmed-ring',
    relationship: 'same-row-facing-sides',
    route: 'SW431-P-02 tie: CB SW435 FD02 at SW431 end; CB SW431 FD02 at SW435 end',
  },
] as const satisfies readonly {
  from: RoomFrameId;
  to: RoomFrameId;
  kind: 'confirmed-ring';
  relationship: 'same-row-facing-sides';
  route: string;
}[];
