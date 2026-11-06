import type { Asset, NetworkModel } from '../session/model';

// Disconnected construction references superseded by the owner's network/scope
// decisions. Keep their immutable evidence, but omit them from the live tool.
const obsoleteIds = new Set([
  'sw435:interface:mc436', 'rm714:interface:ring-in02',
  'sw426:interface:rm712', 'sw426:interface:sw712',
  'cv006:pole:201', 'cv006:pole:286', 'cv006:pole:287',
  'cv006:abs:49-38-1', 'cv006:fused-abs:286',
  'cv006:interface:hopper10', 'cv006:interface:line-comparison',
  'rm410:interface:rm418', 'wh:h1:rm417:sw02:interface',
  'rm721:interface:rm712', 'services:interface:rm714-shared',
  'rm712:interface:sw426', 'rm712:interface:former-rm713',
  'rm713:interface:in02', 'rm420:comparison:station33', 'rm420:comparison:cv00622',
  'mine:interface:station', 'mine:interface:sw411',
  'mine:interface:services-rm721', 'mine:interface:western',
]);

export function isObsoleteReference(model: NetworkModel, asset: Asset): boolean {
  return model.id === 'site-whole-network' && obsoleteIds.has(asset.id)
    && asset.kind === 'interface' && !asset.positions.length
    && !asset.conductivePairs.length && !asset.sourcePairs?.length && !asset.sourceArcs?.length && !asset.earthPairs?.length
    && !model.connections.some(link => asset.terminals.includes(link.from) || asset.terminals.includes(link.to))
    && !model.sources.some(source => source.assetId === asset.id)
    && !model.earths?.some(earth => asset.terminals.includes(earth.terminal));
}
