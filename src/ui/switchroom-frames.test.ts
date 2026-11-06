import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { switchroomMemberships } from './switchroom-frames';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';

const wholeNetwork = continuousNetwork(currentNetworkModel);

describe('whole-network switchroom frames', () => {
  const rooms = new Map(switchroomMemberships(currentNetworkModel).map(room => [room.label, room]));

  it('reports the measured SW411 group that constrains whole-network routing', () => {
    const membership = rooms.get('SW411')!;
    const frame = wholeNetwork.panels.find(panel => panel.id === 'sw411/overview')!;
    console.info('SW411 frame audit', JSON.stringify({
      coreAssetCount: membership.assetIds.length,
      coreAssets: membership.assetIds,
      memberAssetCount: membership.memberAssetIds.length,
      frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      blockers: [[2692.640625, 25200], [6522.078125, 25370], [14417.5, 36570]].map(([x, y]) => ({
        point: [x, y], inside: x > frame.x && x < frame.x + frame.width && y > frame.y && y < frame.y + frame.height,
      })),
    }));
    expect(membership.assetIds).toContain('sw411:bus-a');
  });

  it('bounds SW435 and SW426 around their switchgear, not their downstream trees', () => {
    const sw435 = rooms.get('SW435');
    const sw426 = rooms.get('SW426');
    expect(sw435).toBeDefined();
    expect(sw426).toBeDefined();

    expect(sw435!.assetIds).toContain('sw435:bus');
    expect(sw435!.assetIds).toContain('sw435:in:cb');
    expect(sw435!.assetIds).toContain('sw435:in:es');
    expect(sw435!.assetIds).not.toContain('sw435:tf435:transformer');
    expect(sw435!.assetIds).not.toContain('sw435:mc435:bus');
    expect(sw435!.memberAssetIds).toContain('sw435:tf435:transformer');

    expect(sw426!.assetIds).toContain('sw426:bus');
    expect(sw426!.assetIds).toContain('sw426:in:cb');
    expect(sw426!.assetIds).not.toContain('sw426:tf440');
    expect(sw426!.assetIds).not.toContain('sw426:mc440:bus');
  });

  it('retains both SW411 bus sections and their incomer gear in the room frame', () => {
    const sw411 = rooms.get('SW411');
    expect(sw411).toBeDefined();
    expect(sw411!.assetIds).toContain('sw411:bus-a');
    expect(sw411!.assetIds).toContain('sw411:bus-b');
    expect(sw411!.assetIds).toContain('sw411:in-03:cb');
    expect(sw411!.assetIds).toContain('sw411:in-04:cb');
  });

  it('keeps rendered device cards inside measured room frames at every zoom level', () => {
    for (const frame of wholeNetwork.panels) {
      for (const id of frame.assetIds) {
        const asset = currentNetworkModel.assets.find(item => item.id === id)!;
        const label = wholeNetwork.labels.get(id);
        if (!hasDeviceCard(asset) || !label) continue;
        const position = wholeNetwork.view.layout.assets[id];
        const card = deviceCard(asset, position, label);
        const left = position[0] + card.x;
        const top = position[1] + card.y;
        expect(left, `${id} card left of ${frame.title}`).toBeGreaterThanOrEqual(frame.x);
        expect(top, `${id} card above ${frame.title}`).toBeGreaterThanOrEqual(frame.y);
        expect(left + card.width, `${id} card right of ${frame.title}`).toBeLessThanOrEqual(frame.x + frame.width);
        expect(top + card.height, `${id} card below ${frame.title}`).toBeLessThanOrEqual(frame.y + frame.height);
      }
    }
  }, 120_000);

  it('keeps switchroom frames from overlapping after global placement', () => {
    const frames = wholeNetwork.panels;
    for (let index = 0; index < frames.length; index++) for (const other of frames.slice(index + 1)) {
      const frame = frames[index];
      expect(frame.x < other.x + other.width && frame.x + frame.width > other.x
        && frame.y < other.y + other.height && frame.y + frame.height > other.y,
      `${frame.title} overlaps ${other.title}`).toBe(false);
    }
  }, 120_000);

});
