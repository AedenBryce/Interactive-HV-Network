import { describe, expect, it } from 'vitest';
import { validateDiagramGeometry } from './geometry-validator';

describe('validateDiagramGeometry', () => {
  it('reports diagonal route segments', () => {
    const findings = validateDiagramGeometry({
      routes: [{ id: 'diagonal', points: [[0, 0], [10, 10]] }],
      roomFrames: [],
    });
    expect(findings).toEqual([expect.objectContaining({ type: 'non-orthogonal', routeId: 'diagonal', segmentIndex: 0 })]);
  });

  it('reports proper route crossings and shared-length overlaps', () => {
    const findings = validateDiagramGeometry({
      routes: [
        { id: 'horizontal', points: [[0, 5], [10, 5]] },
        { id: 'vertical', points: [[5, 0], [5, 10]] },
        { id: 'overlap-a', points: [[0, 20], [10, 20]] },
        { id: 'overlap-b', points: [[5, 20], [15, 20]] },
      ],
      roomFrames: [],
    });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'route-crossing', routeIds: ['horizontal', 'vertical'], point: [5, 5] }));
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'shared-route-length', routeIds: ['overlap-a', 'overlap-b'], length: 5, overlap: [[5, 20], [10, 20]],
    }));
  });

  it('reports a connector endpoint landing on another route interior as a T-junction', () => {
    const findings = validateDiagramGeometry({
      routes: [
        { id: 'main', points: [[0, 10], [20, 10]], terminals: ['left', 'right'] },
        { id: 'branch', points: [[10, 0], [10, 10]], terminals: ['source', 'branch-end'] },
      ],
      roomFrames: [],
    });
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'route-endpoint-on-interior',
      routeIds: ['branch', 'main'],
      endpointRouteId: 'branch',
      endpointPosition: 'end',
      hostRouteId: 'main',
      point: [10, 10],
      orientation: 'perpendicular',
    }));
  });

  it('reports endpoint-on-interior on the same route and positive-length self-overlap', () => {
    const findings = validateDiagramGeometry({
      routes: [{ id: 'backtracking', points: [[0, 0], [10, 0], [5, 0], [5, 10]] }],
      roomFrames: [],
    });
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'shared-route-length', routeIds: ['backtracking', 'backtracking'], length: 5,
    }));
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'route-endpoint-on-interior',
      routeIds: ['backtracking', 'backtracking'],
      endpointPosition: 'bend',
      hostRouteId: 'backtracking',
      point: [5, 0],
      orientation: 'collinear',
    }));
  });

  it('reports a self-crossing between non-adjacent segments of one route', () => {
    const findings = validateDiagramGeometry({
      routes: [{ id: 'self-crossing', points: [[0, 0], [10, 0], [10, 10], [5, 10], [5, -5]] }],
      roomFrames: [],
    });
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'route-crossing', routeIds: ['self-crossing', 'self-crossing'], point: [5, 0],
    }));
  });

  it('records a shared-terminal allowance explicitly while retaining the finding', () => {
    const findings = validateDiagramGeometry({
      routes: [
        { id: 'branch-a', points: [[5, 0], [10, 0]], terminals: ['shared', 'a'] },
        { id: 'branch-b', points: [[5, 0], [15, 0]], terminals: ['shared', 'b'] },
      ],
      roomFrames: [],
      terminalPoints: new Map([['shared', [5, 0] as [number, number]]]),
      allowedSharedTerminalOverlaps: [{ routeIds: ['branch-a', 'branch-b'], terminalId: 'shared' }],
    });
    expect(findings).toContainEqual(expect.objectContaining({
      type: 'shared-route-length', length: 5, commonTerminalIds: ['shared'], documentedAllowance: 'shared terminal shared',
    }));
  });

  it('reports room-border crossings and identifies explicit documented exceptions', () => {
    const findings = validateDiagramGeometry({
      routes: [{ id: 'through-room', points: [[-5, 5], [15, 5]] }],
      roomFrames: [{ id: 'room-a', x: 0, y: 0, width: 10, height: 10 }],
      allowedRoomBorderIntersections: [{ routeId: 'through-room', roomFrameId: 'room-a', reason: 'documented doorway route' }],
    });
    const borderFindings = findings.filter(finding => finding.type === 'route-room-frame');
    expect(borderFindings).toHaveLength(2);
    expect(borderFindings.every(finding => finding.type === 'route-room-frame' && finding.documentedAllowance === 'documented doorway route')).toBe(true);
  });

  it('reports positive-area room-frame overlap but allows touching borders', () => {
    const findings = validateDiagramGeometry({
      routes: [],
      roomFrames: [
        { id: 'a', x: 0, y: 0, width: 10, height: 10 },
        { id: 'b', x: 8, y: 4, width: 10, height: 10 },
        { id: 'c', x: 18, y: 0, width: 3, height: 10 },
      ],
    });
    expect(findings).toEqual([expect.objectContaining({
      type: 'room-frame-overlap', roomFrameIds: ['a', 'b'], intersection: { x: 8, y: 4, width: 2, height: 6 },
    })]);
  });
});
