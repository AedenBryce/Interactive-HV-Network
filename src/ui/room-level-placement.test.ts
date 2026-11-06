import { describe, expect, it } from 'vitest';
import { placeRoomsByConfirmedParents } from './room-level-placement';

const dimensions = [
  { id: 'sw411/overview', width: 1200, height: 900 },
  { id: 'crushing-1/hv', width: 800, height: 500 },
  { id: 'crushing-2/sw435-hv', width: 1000, height: 600 },
  { id: 'crushing-2/hpgr-hv', width: 500, height: 350 },
  { id: 'stockpile/wet-hv', width: 700, height: 400 },
];

describe('room-level placement', () => {
  it('places confirmed children below their parents in deterministic layers', () => {
    const first = placeRoomsByConfirmedParents(dimensions);
    const second = placeRoomsByConfirmedParents(dimensions);

    expect(first.positions).toEqual(second.positions);
    expect(first.positions['sw411/overview'].layer).toBe(0);
    expect(first.positions['crushing-1/hv'].layer).toBe(1);
    expect(first.positions['crushing-2/sw435-hv'].layer).toBe(1);
    expect(first.positions['crushing-2/hpgr-hv'].layer).toBe(2);
    expect(first.positions['crushing-1/hv'].y).toBe(first.positions['crushing-2/sw435-hv'].y);
    expect(first.positions['crushing-2/hpgr-hv'].y).toBeGreaterThan(first.positions['crushing-2/sw435-hv'].y);
  });

  it('keeps the confirmed SW431/SW435 tie pair adjacent on the same tier', () => {
    const { positions } = placeRoomsByConfirmedParents(dimensions);
    const sw431 = positions['crushing-1/hv'];
    const sw435 = positions['crushing-2/sw435-hv'];

    expect(sw431.layer).toBe(sw435.layer);
    expect(sw431.y).toBe(sw435.y);
    expect(Math.abs(sw431.x - sw435.x)).toBeLessThanOrEqual(1000 + 240);
    expect(sw431.x + 800 + 240 === sw435.x || sw435.x + 1000 + 240 === sw431.x).toBe(true);
  });

  it('reports unconfirmed rooms without assigning a guessed position', () => {
    const { positions, unplaced } = placeRoomsByConfirmedParents(dimensions);

    expect(positions['stockpile/wet-hv']).toBeUndefined();
    expect(unplaced).toContainEqual({ id: 'stockpile/wet-hv', reason: 'unconfirmed-parent', parentIds: [] });
  });

  it('reports confirmed rooms whose declared parent is unavailable', () => {
    const { positions, unplaced } = placeRoomsByConfirmedParents([
      { id: 'desands/laboratory', width: 400, height: 300 },
    ]);

    expect(positions['desands/laboratory']).toBeUndefined();
    expect(unplaced).toContainEqual({ id: 'desands/laboratory', reason: 'missing-parent', parentIds: ['desands/hv'] });
  });

  it('keeps room rectangles separated horizontally within a layer', () => {
    const result = placeRoomsByConfirmedParents(dimensions);
    const sameLayer = Object.entries(result.positions).filter(([, position]) => position.layer === 1);
    const widths = new Map(dimensions.map(room => [room.id, room.width]));

    for (let index = 1; index < sameLayer.length; index++) {
      const [previousId, previous] = sameLayer[index - 1];
      const [currentId, current] = sameLayer[index];
      expect(current.x).toBeGreaterThanOrEqual(previous.x + widths.get(previousId)! + 240);
      expect(currentId).not.toBe(previousId);
    }
  });
});
