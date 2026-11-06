import type { Asset } from '../session/model';
import type { SessionSnapshot } from '../session/session';
import type { IndependentCommand } from '../session/mechanisms';
import { isIndependentState } from '../session/mechanisms';
import { threePositionContacts } from './three-position-contacts';
import { selectorEarthTag, switchDisplayTag } from './switch-display-tags';

export type SwitchAction = {assetId:string;command:string|IndependentCommand;label:string;allowed?:boolean;reason?:string;selected:boolean};

/** Action intent is explicit even when the source gives both functions the same tag. */
function actionTarget(asset: Asset, selectorEarth = false) {
  const earth = selectorEarth || asset.kind === 'earth-switch';
  const role = earth ? 'Earth switch' : asset.kind === 'breaker' ? 'CB' : asset.kind === 'contactor' ? 'Contactor' : 'Main switch';
  const tag = selectorEarth ? selectorEarthTag(asset) : switchDisplayTag(asset);
  return `${role} · ${(earth || asset.kind === 'breaker' ? tag.replace(/^(?:CB|ES)\s+/i, '') : tag)}`;
}

/** Independent user intents retain the existing shared selector state machine. */
export function switchActions(snapshot:SessionSnapshot,selected:Asset):SwitchAction[] {
  const parent=snapshot.model.assets.find(a=>a.earthAssembly?.earthAssetId===selected.id);
  const asset=parent??selected, state=snapshot.devices[asset.id];
  const status=snapshot.switching[asset.id];
  if(threePositionContacts(asset)) {
    return [
      {label:`Open ${actionTarget(asset)}`,command:'isolated',selected:state==='isolated'||state==='earthed'},
      {label:`Close ${actionTarget(asset)}`,command:'service',selected:state==='service'},
      {label:`Open ${actionTarget(asset,true)}`,command:'isolated',selected:state==='isolated'||state==='service'},
      {label:`Close ${actionTarget(asset,true)}`,command:'earthed',selected:state==='earthed'},
    ].map(a=>({...status?.positions.find(p=>p.id===a.command),...a,assetId:asset.id}));
  }
  const controls=asset.earthAssembly?[asset,snapshot.model.assets.find(a=>a.id===asset.earthAssembly!.earthAssetId)!]:[asset];
  return controls.flatMap(control=>{
    const current=snapshot.devices[control.id],review=snapshot.switching[control.id];
    const options=review?.actions??control.positions.map(p=>({command:p.id,label:p.id==='closed'?'Close':p.label,...review?.positions.find(o=>o.id===p.id)}));
    return options.map(a=>({...a,assetId:control.id,label:`${a.label} ${actionTarget(control)}`,selected:typeof a.command==='string'?a.command===current:isIndependentState(current)&&current[a.command.kind]===a.command.value}));
  });
}
