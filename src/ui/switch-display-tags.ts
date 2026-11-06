import type { Asset } from '../session/model';

/** Display tags selected by the owner; preserve full source wording in details. */
export function switchDisplayTag(asset: Asset) {
  const rmu=asset.id.match(/(rm406|rm410|rm417|rm419):sw(0[1-4])$/i);
  return rmu ? `${rmu[1].toUpperCase()} SW${rmu[2]}` : asset.label.split('\n')[0].trim();
}

export function selectorEarthTag(asset: Asset) {
  const rmu=asset.id.match(/(rm406|rm410|rm417|rm419):sw(0[1-4])$/i);
  const outlet=asset.id.match(/^hpgr:drive-(meb|mea):outlet$/);
  if(outlet)return `${outlet[1].toUpperCase()} outlet earth`;
  return rmu ? `ES ${switchDisplayTag(asset)}` : `${switchDisplayTag(asset)} Earth`;
}
