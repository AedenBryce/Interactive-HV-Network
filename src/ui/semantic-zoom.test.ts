import { describe, expect, it } from 'vitest';
import { placeRoomIdentifier, placeRoomIdentifiers } from './room-identifier-layout';
import { ContextLabelCollisionIndex as TitleBoxes, ContextWireCollisionIndex as TitleWires } from './semantic-zoom';

describe('switchroom identifier placement', () => {
  it('uses a clear title margin without overlapping a neighbouring room or moving equipment', () => {
    const obstacles = { boxes: new TitleBoxes(), wires: new TitleWires() };
    obstacles.boxes.add({ x: 0, y: 0, width: 1000, height: 600 });
    const rooms = [{ id: 'room', caption: 'SW426', x: 0, y: 0, width: 1000, height: 600 }, { id: 'neighbour', caption: 'RM714', x: 1400, y: 0, width: 1000, height: 600 }];
    const result = placeRoomIdentifiers(rooms, .1, obstacles).get('room')!;
    expect(result.placement).toBeDefined();
    expect(obstacles.boxes.overlaps(result.placement!)).toBe(false);
    expect(result.bounds.x + result.bounds.width).toBeLessThanOrEqual(1400);
    expect(rooms[0].width).toBe(1000);
  });
  it('moves a title away from an incoming conductor while remaining inside its room', () => {
    const obstacles = { boxes: new TitleBoxes(), wires: new TitleWires() };
    obstacles.wires.add([80, 0], [80, 600]);
    const placement = placeRoomIdentifier({ x: 0, y: 0, width: 1000, height: 600 }, 'SW426', .1, obstacles)!;
    expect(placement).toBeDefined();
    expect(placement.x).toBeGreaterThan(80);
    expect(placement.x + placement.width).toBeLessThanOrEqual(1000);
    expect(placement.y + placement.height).toBeLessThanOrEqual(600);
    expect(obstacles.wires.intersects(placement)).toBe(false);
  });
  it('uses a smaller clear caption when the full-size header would cross the central incomer', () => {
    const obstacles = { boxes: new TitleBoxes(), wires: new TitleWires() };
    obstacles.wires.add([500, 0], [500, 600]);
    const placement = placeRoomIdentifier({ x: 0, y: 0, width: 1000, height: 600 }, 'SW426', .1, obstacles)!;
    expect(placement).toBeDefined();
    expect(placement.font * .1).toBeLessThan(16);
    expect(obstacles.wires.intersects(placement)).toBe(false);
  });
});
import {
  chooseContextLabelPosition,
  chooseContextLabelPositionIndexed,
  ContextLabelCollisionIndex,
  ContextWireCollisionIndex,
  contextLabelPositions,
  semanticZoomLevel,
} from './semantic-zoom';

describe('whole-network semantic zoom', () => {
  it('keeps the fitted map compact and reveals context labels before full detail', () => {
    for (const scale of [0.02, 0.021, 0.04, 0.08, 0.099, 0.0999]) {
      expect(semanticZoomLevel(scale, true), `at ${scale * 100}%`).toBe('context');
    }
  });

  it('switches from room-level map markers to context, then to full detail', () => {
    expect(semanticZoomLevel(0.0137, true)).toBe('overview');
    expect(semanticZoomLevel(0.0199, true)).toBe('overview');
    expect(semanticZoomLevel(0.02, true)).toBe('context');
    expect(semanticZoomLevel(0.026, true)).toBe('context');
    expect(semanticZoomLevel(0.0999, true)).toBe('context');
    expect(semanticZoomLevel(0.1, true)).toBe('detail');
  });

  it('keeps detailed asset labels enabled for non-overview diagrams at any scale', () => {
    for (const scale of [0, 0.01, 0.04, 0.1, 1]) {
      expect(semanticZoomLevel(scale, false)).toBe('detail');
    }
  });

  it('moves a context label to another side when its preferred side is occupied', () => {
    const candidates = contextLabelPositions(100, 100, 50, 24);
    const occupiedRight = [candidates[0]];
    expect(chooseContextLabelPosition(candidates, { width: 300, height: 300 }, occupiedRight, () => false))
      .toEqual(candidates[1]);
  });

  it('keeps context labels clear of wires and other labels', () => {
    const candidates = contextLabelPositions(100, 100, 50, 24);
    const selected = chooseContextLabelPosition(
      candidates,
      { width: 300, height: 300 },
      [],
      box => box.x > 100,
    );
    expect(selected).toEqual(candidates[1]);
    expect(chooseContextLabelPosition(candidates, { width: 300, height: 300 }, [], () => true)).toBeUndefined();
  });

  it('matches the linear placement result using spatial indexes', () => {
    const candidates = contextLabelPositions(100, 100, 50, 24);
    const occupied = [candidates[0], { x: 180, y: 180, width: 32, height: 24 }];
    const indexed = new ContextLabelCollisionIndex();
    occupied.forEach(box => indexed.add(box));
    const expected = chooseContextLabelPosition(candidates, { width: 300, height: 300 }, occupied, box => box.x > 100);
    expect(chooseContextLabelPositionIndexed(candidates, { width: 300, height: 300 }, indexed, box => box.x > 100)).toEqual(expected);
  });

  it('indexes orthogonal wire segments without changing label clearance rules', () => {
    const wires = new ContextWireCollisionIndex(64);
    wires.add([0, 20], [300, 20]);
    wires.add([180, 0], [180, 300]);
    expect(wires.intersects({ x: 80, y: 10, width: 30, height: 24 })).toBe(true);
    expect(wires.intersects({ x: 150, y: 80, width: 40, height: 24 })).toBe(true);
    expect(wires.intersects({ x: 20, y: 20, width: 30, height: 20 })).toBe(false);
    expect(wires.intersects({ x: 10, y: 40, width: 30, height: 20 })).toBe(false);
  });
});

it('keeps identifiers horizontal in the top-right corner',()=>{
 const obstacles={boxes:new TitleBoxes(),wires:new TitleWires()};
 const panel={x:100,y:200,width:1000,height:600};
 const p=placeRoomIdentifier(panel,'SW439',.1,obstacles)!;
 expect(p.vertical).toBe(false);
 expect(p.x+p.width).toBeCloseTo(panel.x+panel.width-40);
 expect(p.y).toBe(panel.y+40);
});
