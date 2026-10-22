import type { Asset } from '../session/model';
import { describeDeviceState } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';

export function RelationshipDetails({ asset, positionId }: { asset: Asset; positionId: DeviceState | undefined }) {
  if (asset.removableBreaker) return <section aria-label="Declared terminal relationships"><h3>Declared main pair</h3><p>{asset.removableBreaker.mainPair.join(' ↔ ')} conducts only with Contact Closed and Rack In. Unknown axes retain only compatible possibilities.</p><p>{describeDeviceState(positionId)}</p><p>Independent fixed earth relationships remain separate: {(asset.earthPairs ?? []).map(pair => pair.join(' ↔ ')).join('; ') || 'None declared'}.</p></section>;
  if (asset.sourcePairs === undefined && asset.earthPairs === undefined && !asset.positions.some(position => position.sourcePairs !== undefined || position.earthPairs !== undefined)) return null;
  const position = asset.positions.find(position => position.id === positionId);
  const pairs = (items: [string, string][] | undefined) => items?.length ? items.map(([a, b]) => `${a} ↔ ${b}`).join('; ') : 'None declared';
  return <section aria-label="Declared terminal relationships">
    <h3>Declared terminal relationships</h3>
    <p>These relationships are bidirectional in this model. Source transfer and earth continuity are recorded separately.</p>
    <dl className="identity-rows"><div><dt>Fixed source transfer</dt><dd>{pairs(asset.sourcePairs)}</dd></div><div><dt>Fixed earth continuity</dt><dd>{pairs(asset.earthPairs)}</dd></div></dl>
    {asset.positions.length > 0 && (position ? <><h4>{position.label}</h4><dl className="identity-rows"><div><dt>Position source transfer</dt><dd>{pairs(position.sourcePairs)}</dd></div><div><dt>Position earth continuity</dt><dd>{pairs(position.earthPairs)}</dd></div></dl></> : <p>Position unconfirmed; inspect the uncertainty results.</p>)}
  </section>;
}
