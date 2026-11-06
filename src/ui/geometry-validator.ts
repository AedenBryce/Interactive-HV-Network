import type { Point, Box } from './diagram-geometry';

export type GeometryRoute = {
  id: string;
  points: readonly Point[];
  /** Model terminal IDs at the route endpoints, in point order. */
  terminals?: readonly [string, string];
};
export type GeometryRoomFrame = Box & { id: string };
export type SharedTerminalOverlapAllowance = {
  routeIds: readonly [string, string];
  terminalId: string;
};
export type RoomBorderAllowance = { routeId: string; roomFrameId: string; reason: string };

export type GeometryFinding =
  | { type: 'non-orthogonal'; routeId: string; segmentIndex: number; from: Point; to: Point }
  | { type: 'route-crossing'; routeIds: readonly [string, string]; segmentIndices: readonly [number, number]; point: Point }
  | {
      type: 'route-endpoint-on-interior';
      routeIds: readonly [string, string];
      segmentIndices: readonly [number, number];
      endpointRouteId: string;
      endpointPosition: 'start' | 'end' | 'bend';
      hostRouteId: string;
      point: Point;
      orientation: 'perpendicular' | 'collinear';
      commonTerminalIds: readonly string[];
    }
  | {
      type: 'shared-route-length';
      routeIds: readonly [string, string];
      segmentIndices: readonly [number, number];
      length: number;
      /** Exact shared interval, in diagram coordinates. */
      overlap: readonly [Point, Point];
      commonTerminalIds: readonly string[];
      documentedAllowance?: string;
    }
  | {
      type: 'route-room-frame';
      routeId: string;
      roomFrameId: string;
      segmentIndex: number;
      relation: 'crosses-border' | 'touches-border' | 'overlaps-border';
      point?: Point;
      documentedAllowance?: string;
    }
  | { type: 'room-frame-overlap'; roomFrameIds: readonly [string, string]; intersection: Box };

export type GeometryValidationInput = {
  routes: readonly GeometryRoute[];
  roomFrames: readonly GeometryRoomFrame[];
  /** Coordinates for model terminals; used to validate explicit overlap allowances. */
  terminalPoints?: ReadonlyMap<string, Point> | Readonly<Record<string, Point>>;
  /** Explicit, auditable exceptions for a shared path that meets at a model terminal. */
  allowedSharedTerminalOverlaps?: readonly SharedTerminalOverlapAllowance[];
  /** Explicit, auditable exceptions for a route crossing/using a room-frame border. */
  allowedRoomBorderIntersections?: readonly RoomBorderAllowance[];
};

/** Validate supplied geometry without changing routes or applying implicit waivers. */
export function validateDiagramGeometry(input: GeometryValidationInput): GeometryFinding[] {
  const findings: GeometryFinding[] = [];
  const segments = input.routes.flatMap(route => route.points.slice(1).map((to, index) => ({
    route,
    index,
    from: route.points[index],
    to,
  })));

  for (const segment of segments) {
    if (segment.from[0] !== segment.to[0] && segment.from[1] !== segment.to[1]) {
      findings.push({ type: 'non-orthogonal', routeId: segment.route.id, segmentIndex: segment.index, from: segment.from, to: segment.to });
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      if (isProperCrossing(a.from, a.to, b.from, b.to)) {
        findings.push({
          type: 'route-crossing',
          routeIds: orderedPair(a.route.id, b.route.id),
          segmentIndices: orderedSegmentPair(a, b),
          point: crossingPoint(a.from, a.to, b.from, b.to)!,
        });
      }
      for (const contact of endpointOnInteriorContacts(a, b)) {
        const routeAIsEndpoint = contact.endpoint === 'a.from' || contact.endpoint === 'a.to';
        const endpointSegment = routeAIsEndpoint ? a : b;
        const hostSegment = routeAIsEndpoint ? b : a;
        const endpointPosition = routeEndpointPosition(endpointSegment, contact.endpoint.endsWith('from') ? 'from' : 'to');
        const bTerminals: readonly string[] = b.route.terminals ?? [];
        const commonTerminalIds = a.route.id === b.route.id ? [] : (a.route.terminals ?? []).filter(id => bTerminals.includes(id));
        findings.push({
          type: 'route-endpoint-on-interior',
          routeIds: orderedPair(a.route.id, b.route.id),
          segmentIndices: orderedSegmentPair(a, b),
          endpointRouteId: endpointSegment.route.id,
          endpointPosition,
          hostRouteId: hostSegment.route.id,
          point: contact.point,
          orientation: (endpointSegment.from[0] === endpointSegment.to[0]) === (hostSegment.from[0] === hostSegment.to[0]) ? 'collinear' : 'perpendicular',
          commonTerminalIds,
        });
      }
      const overlap = sharedLength(a.from, a.to, b.from, b.to);
      if (overlap <= 0) continue;
      const routeIds = orderedPair(a.route.id, b.route.id);
      const bTerminals: readonly string[] = b.route.terminals ?? [];
      const commonTerminalIds = a.route.id === b.route.id ? [] : (a.route.terminals ?? []).filter(id => bTerminals.includes(id));
      const allowance = input.allowedSharedTerminalOverlaps?.find(item =>
        a.route.id !== b.route.id && samePair(item.routeIds, routeIds) && commonTerminalIds.includes(item.terminalId)
        && overlapTouchesTerminal(a.from, a.to, b.from, b.to, getPoint(input.terminalPoints, item.terminalId)),
      );
      findings.push({
        type: 'shared-route-length',
        routeIds,
        segmentIndices: orderedSegmentPair(a, b),
        length: overlap,
        overlap: sharedInterval(a.from, a.to, b.from, b.to)!,
        commonTerminalIds,
        ...(allowance ? { documentedAllowance: `shared terminal ${allowance.terminalId}` } : {}),
      });
    }
  }

  for (const segment of segments) {
    if (segment.from[0] === segment.to[0] && segment.from[1] === segment.to[1]) continue;
    for (const frame of input.roomFrames) {
      const intersections = segmentFrameBoundaryIntersections(segment.from, segment.to, frame);
      for (const intersection of intersections) {
        const allowance = input.allowedRoomBorderIntersections?.find(item => item.routeId === segment.route.id && item.roomFrameId === frame.id);
        findings.push({
          type: 'route-room-frame',
          routeId: segment.route.id,
          roomFrameId: frame.id,
          segmentIndex: segment.index,
          relation: intersection.relation,
          ...(intersection.point ? { point: intersection.point } : {}),
          ...(allowance ? { documentedAllowance: allowance.reason } : {}),
        });
      }
    }
  }

  for (let i = 0; i < input.roomFrames.length; i++) {
    for (let j = i + 1; j < input.roomFrames.length; j++) {
      const a = input.roomFrames[i];
      const b = input.roomFrames[j];
      const left = Math.max(a.x, b.x);
      const top = Math.max(a.y, b.y);
      const right = Math.min(a.x + a.width, b.x + b.width);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      if (right > left && bottom > top) findings.push({
        type: 'room-frame-overlap',
        roomFrameIds: [a.id, b.id],
        intersection: { x: left, y: top, width: right - left, height: bottom - top },
      });
    }
  }

  return findings;
}

function endpointOnInteriorContacts(
  a: { route: GeometryRoute; index: number; from: Point; to: Point },
  b: { route: GeometryRoute; index: number; from: Point; to: Point },
): { endpoint: 'a.from' | 'a.to' | 'b.from' | 'b.to'; point: Point }[] {
  const contacts: { endpoint: 'a.from' | 'a.to' | 'b.from' | 'b.to'; point: Point }[] = [];
  if (pointOnSegmentInterior(a.from, b.from, b.to)) contacts.push({ endpoint: 'a.from', point: a.from });
  if (pointOnSegmentInterior(a.to, b.from, b.to)) contacts.push({ endpoint: 'a.to', point: a.to });
  if (pointOnSegmentInterior(b.from, a.from, a.to)) contacts.push({ endpoint: 'b.from', point: b.from });
  if (pointOnSegmentInterior(b.to, a.from, a.to)) contacts.push({ endpoint: 'b.to', point: b.to });
  return contacts;
}

function routeEndpointPosition(segment: { route: GeometryRoute; index: number }, endpoint: 'from' | 'to'): 'start' | 'end' | 'bend' {
  if (endpoint === 'from' && segment.index === 0) return 'start';
  if (endpoint === 'to' && segment.index === segment.route.points.length - 2) return 'end';
  return 'bend';
}

function pointOnSegmentInterior(point: Point, a: Point, b: Point): boolean {
  if (a[0] === b[0]) return point[0] === a[0] && point[1] > Math.min(a[1], b[1]) && point[1] < Math.max(a[1], b[1]);
  if (a[1] === b[1]) return point[1] === a[1] && point[0] > Math.min(a[0], b[0]) && point[0] < Math.max(a[0], b[0]);
  return false;
}

function isProperCrossing(a: Point, b: Point, c: Point, d: Point): boolean {
  const aVertical = a[0] === b[0];
  const cVertical = c[0] === d[0];
  if (aVertical === cVertical) return false;
  const v1 = aVertical ? a : c;
  const v2 = aVertical ? b : d;
  const h1 = aVertical ? c : a;
  const h2 = aVertical ? d : b;
  return v1[0] > Math.min(h1[0], h2[0]) && v1[0] < Math.max(h1[0], h2[0])
    && h1[1] > Math.min(v1[1], v2[1]) && h1[1] < Math.max(v1[1], v2[1]);
}

function crossingPoint(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  if (!isProperCrossing(a, b, c, d)) return undefined;
  return a[0] === b[0] ? [a[0], c[1]] : [c[0], a[1]];
}

function sharedLength(a: Point, b: Point, c: Point, d: Point): number {
  if (a[0] === b[0] && c[0] === d[0] && a[0] === c[0]) {
    return Math.max(0, Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) - Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])));
  }
  if (a[1] === b[1] && c[1] === d[1] && a[1] === c[1]) {
    return Math.max(0, Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) - Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])));
  }
  return 0;
}

function sharedInterval(a: Point, b: Point, c: Point, d: Point): readonly [Point, Point] | undefined {
  const length = sharedLength(a, b, c, d);
  if (length <= 0) return undefined;
  if (a[0] === b[0]) {
    const x = a[0];
    const start = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
    const end = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
    return [[x, start], [x, end]];
  }
  const y = a[1];
  const start = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
  const end = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
  return [[start, y], [end, y]];
}

function overlapTouchesTerminal(a: Point, b: Point, c: Point, d: Point, terminal: Point | undefined): boolean {
  if (!terminal || !pointOnSegment(terminal, a, b) || !pointOnSegment(terminal, c, d)) return false;
  const horizontal = a[1] === b[1];
  const aFar = horizontal ? (Math.abs(a[0] - terminal[0]) > Math.abs(b[0] - terminal[0]) ? a[0] : b[0])
    : (Math.abs(a[1] - terminal[1]) > Math.abs(b[1] - terminal[1]) ? a[1] : b[1]);
  const cFar = horizontal ? (Math.abs(c[0] - terminal[0]) > Math.abs(d[0] - terminal[0]) ? c[0] : d[0])
    : (Math.abs(c[1] - terminal[1]) > Math.abs(d[1] - terminal[1]) ? c[1] : d[1]);
  return (horizontal ? Math.sign(aFar - terminal[0]) : Math.sign(aFar - terminal[1]))
    === (horizontal ? Math.sign(cFar - terminal[0]) : Math.sign(cFar - terminal[1]));
}

function pointOnSegment(point: Point, a: Point, b: Point): boolean {
  if (a[0] === b[0]) return point[0] === a[0] && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]);
  if (a[1] === b[1]) return point[1] === a[1] && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]);
  return false;
}

function segmentFrameBoundaryIntersections(a: Point, b: Point, frame: GeometryRoomFrame): { relation: 'crosses-border' | 'touches-border' | 'overlaps-border'; point?: Point }[] {
  const result: { relation: 'crosses-border' | 'touches-border' | 'overlaps-border'; point?: Point }[] = [];
  const edges: [Point, Point][] = [
    [[frame.x, frame.y], [frame.x + frame.width, frame.y]],
    [[frame.x + frame.width, frame.y], [frame.x + frame.width, frame.y + frame.height]],
    [[frame.x, frame.y + frame.height], [frame.x + frame.width, frame.y + frame.height]],
    [[frame.x, frame.y], [frame.x, frame.y + frame.height]],
  ];
  for (const [c, d] of edges) {
    const overlap = sharedLength(a, b, c, d);
    if (overlap > 0) { result.push({ relation: 'overlaps-border' }); continue; }
    const point = intersectionPoint(a, b, c, d);
    if (!point) continue;
    const endpointTouch = samePoint(point, a) || samePoint(point, b) || samePoint(point, c) || samePoint(point, d);
    result.push({ relation: endpointTouch ? 'touches-border' : 'crosses-border', point });
  }
  return result;
}

function intersectionPoint(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const av = a[0] === b[0]; const cv = c[0] === d[0];
  if (av === cv) {
    if (av && a[0] === c[0]) {
      const y = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      return y <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) ? [a[0], y] : undefined;
    }
    if (!av && a[1] === c[1]) {
      const x = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      return x <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) ? [x, a[1]] : undefined;
    }
    return undefined;
  }
  const v1 = av ? a : c; const v2 = av ? b : d; const h1 = av ? c : a; const h2 = av ? d : b;
  const point: Point = [v1[0], h1[1]];
  return point[0] >= Math.min(h1[0], h2[0]) && point[0] <= Math.max(h1[0], h2[0])
    && point[1] >= Math.min(v1[1], v2[1]) && point[1] <= Math.max(v1[1], v2[1]) ? point : undefined;
}

function orderedPair(a: string, b: string): [string, string] { return a <= b ? [a, b] : [b, a]; }
function orderedSegmentPair(a: { route: GeometryRoute; index: number }, b: { route: GeometryRoute; index: number }): [number, number] {
  return a.route.id <= b.route.id ? [a.index, b.index] : [b.index, a.index];
}
function samePair(a: readonly [string, string], b: readonly [string, string]): boolean { return orderedPair(a[0], a[1]).join('\0') === b.join('\0'); }
function samePoint(a: Point, b: Point): boolean { return a[0] === b[0] && a[1] === b[1]; }
function getPoint(points: GeometryValidationInput['terminalPoints'], id: string): Point | undefined {
  if (!points) return undefined;
  if ('get' in points && typeof points.get === 'function') return points.get(id);
  return (points as Readonly<Record<string, Point>>)[id];
}
