import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;

describe('whole-network room-frame placement', () => {
  it('keeps every production switchroom frame separate', () => {
    const frames = continuousNetwork(currentNetworkModel).panels;
    const collisions: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        if (overlaps(frames[i], frames[j])) collisions.push(`${frames[i].id} / ${frames[j].id}`);
      }
    }

    expect(collisions, `overlapping room frames: ${collisions.join(', ')}`).toEqual([]);
  }, 120_000);
});
