import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

export type AddedOverviewControl = { id: string; anchorId: string; role: 'series' | 'earth'; linkId: string };
export const addedOverviewControls: AddedOverviewControl[] = [];
const evidenceId = 'OVERVIEW-DEVICE-REVIEW-2026-11-06';
const reference: EvidenceReference = { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27.10.2025)', page: 1, clause: 'RM712 A–B/9–11; RM713 C–D/9–10; RM413 E–F/9–10; RM714 F–G/4–5. Depicted controls and conductor relationships; complete installed interlock conditions are not confirmed.' };

/** Add the depicted controls without replacing stable main/earth identities or prior decisions. */
export function withOverviewDeviceCorrections(base: NetworkModel): NetworkModel {
  addedOverviewControls.length = 0;
  const model = structuredClone(base);
  model.version = 'construction-2026-11-06.12';
  const refs = [reference];
  const claim = { knowledge: 'supported' as const, evidenceIds: [evidenceId] };
  const asset = (id: string) => { const result = model.assets.find(a => a.id === id); if (!result) throw new Error(`Missing reviewed asset ${id}`); return result; };
  model.evidence!.push({ id: evidenceId, status: 'supported', references: refs, summary: 'Drawing-depicted controls restored at owner request “rectify then”, 6 November 2026. New interlock permissions remain unresolved. New mains Closed and earths Open follow the previously selected default teaching baseline; these are not live positions. Grouped glyphs follow overview symbol convention; they do not assert field-verified mechanical linkage.' });
  const addControl = (id: string, label: string, kind: 'disconnector' | 'earth-switch', anchorId: string, role: 'series' | 'earth', linkId: string) => {
    const terminals: [string,string] = [`${id}:a`,`${id}:b`];
    const added: Asset = { id,label,kind,terminals,conductivePairs:[],positions:[{id:'open',label:'Open',pairs:[],...claim},{id:'closed',label:'Closed',pairs:[terminals],...claim}],...claim,reviewIds:[evidenceId] };
    model.assets.push(added); model.starting.devices[id] = kind === 'earth-switch' ? 'open' : 'closed';
    model.interlocks!.reviews.push({assetId:id,status:'unresolved',note:'Added from the overview drawing. The source does not confirm the complete local/key interlock profile. Actions remain disabled pending confirmation.',evidence:refs});
    addedOverviewControls.push({id,anchorId,role,linkId});
    // Give detailed views a local anchor as well as updating the authored whole-network drawing.
    for (const view of model.presentation!.views.filter(v=>v.assetIds.includes(anchorId))) {
      const p=view.layout.assets[anchorId]; const q: [number,number]=role==='earth'?[p[0]+160,p[1]+70]:[p[0],p[1]+120];
      view.assetIds.push(id);view.layout.assets[id]=q;
      view.layout.terminals[terminals[0]]=[q[0],q[1]-30];view.layout.terminals[terminals[1]]=[q[0],q[1]+30];
    }
    return added;
  };
  const addEarth = (mainId:string,id:string,label:string,from:string) => {
    const earth=addControl(id,label,'earth-switch',mainId,'earth',`${id}:branch`);
    model.connections.push({id:`${id}:branch`,from,to:earth.terminals[0],...claim});
    model.earths!.push({id:`${id}:ground`,terminal:earth.terminals[1],label:`${label} modeled ground`,...claim});
    return earth;
  };
  const addSeries = (cbId:string,id:string,label:string) => {
    const cb=asset(cbId), terminal=cb.terminals[1];
    // Locate the non-earth outgoing conductor by terminal ownership, rather than tag inference.
    const outgoing=model.connections.filter(c=>c.from===terminal || c.to===terminal).filter(c=>!model.assets.find(a=>a.kind==='earth-switch'&&a.terminals.includes(c.from===terminal?c.to:c.from)));
    if(outgoing.length!==1) throw new Error(`Expected one outgoing conductor for ${cbId}`);
    const existing=outgoing[0], ds=addControl(id,label,'disconnector',cbId,'series',existing.id);
    if(existing.from===terminal) existing.from=ds.terminals[1]; else existing.to=ds.terminals[1];
    for(const view of model.presentation!.views) {
      for(const boundary of view.boundaries??[]) if(boundary.connectionId===existing.id) {
        if(boundary.remoteAssetId===cbId)boundary.remoteAssetId=ds.id;
        view.layout.terminals[ds.terminals[1]]??=[...(view.layout.terminals[terminal]??view.layout.assets[cbId]??boundary.position)];
      }
    }
    model.connections.push({id:`${id}:incoming`,from:terminal,to:ds.terminals[0],...claim});
    return ds;
  };
  const group = (mainId:string,earthId:string,common:string) => { asset(mainId).earthAssembly={earthAssetId:earthId,commonTerminal:common}; };
  const pair = (mainId:string,label:string,side:0|1) => { const main=asset(mainId);const earth=addEarth(mainId,`${mainId}:es`,label,main.terminals[side]);group(mainId,earth.id,main.terminals[side]); };
  // RM712 has separate incoming earths, and a separate feeder isolator and earth.
  for(const input of ['in01','in02']) addEarth(`rm712:${input}`,`rm712:${input}:es`,`ES RM712 ${input.toUpperCase()}`,asset(`rm712:${input}`).terminals[0]);
  const ds712=addSeries('rm712:tf712:cb','rm712:tf712:sw','SW TF712 FD');
  addEarth(ds712.id,'rm712:tf712:es','ES TF712 FD',ds712.terminals[1]);
  for(const input of ['in01','in02'])model.interlocks!.rules.push({id:`${evidenceId}:rm712:${input}:earth-open`,assetId:`rm712:${input}`,position:'closed',require:{kind:'device',assetId:`rm712:${input}:es`,position:'open'},explanation:'Main Close requires its separate incoming earth Open.',evidence:refs});
  for(const input of ['in01','in02']){const review=model.interlocks!.reviews.find(r=>r.assetId===`rm712:${input}`)!;review.status='confirmed-rules';review.note+=' Restored earth Open is required for Close.';}
  for(const input of ['in01','in02']) pair(`rm713:${input}`,`ES RM713 ${input.toUpperCase()}`,0);
  const ds713=addSeries('rm713:tf713:cb','rm713:tf713:sw','SW TF713 FD');
  pair(ds713.id,'ES TF713 FD',1);
  for(const input of ['in01','in02']) pair(`rm413:${input}`,`ES RM413 ${input.toUpperCase()} selector`,0);
  addEarth('rm413:in02','rm413:in02:cable-es','ES RM413 IN02 cable',asset('rm413:in02').terminals[0]);
  for(const tf of ['tf413','tf414']) {const ds=addSeries(`rm413:${tf}:cb`,`rm413:${tf}:sw`,`SW ${tf.toUpperCase()} FD`);pair(ds.id,`ES ${tf.toUpperCase()} FD`,1);}
  const ds714=addSeries('rm714:tf714:cb','rm714:tf714:sw','SW TF714 FD');
  const branch=model.connections.find(c=>c.id==='rm714:tf714:es:branch')!;
  branch.from=ds714.terminals[1];
  group(ds714.id,'rm714:tf714:es',ds714.terminals[1]);
  for(const mainId of ['rm714:in01','rm714:in02','rm721:in01','rm721:in02','rm721:rm412','rm721:rm713']) {
    const main=asset(mainId),earth=asset(`${mainId}:es`);
    const earthBranch=model.connections.find(c=>c.to===earth.terminals[0])!;
    const direct=main.terminals.find(t=>t===earthBranch.from);
    const common=direct??main.terminals.find(t=>model.connections.some(c=>(c.from===t&&c.to===earthBranch.from)||(c.to===t&&c.from===earthBranch.from)));
    if(!common) throw new Error(`Unconfirmed assembly side for ${mainId}`);
    group(mainId,earth.id,common);
  }
  for(const [main,earth,side] of [['rm412:s100','rm412:e100',1],['rm412:s101','rm412:e101',1],['rm412:feeder-contact','rm412:e102',1]] as const)group(main,earth,asset(main).terminals[side]);
  // New earth functions restrict existing main Close; this adds no permission.
  for(const main of model.assets.filter(a=>a.earthAssembly)) {
    const review=model.interlocks!.reviews.find(r=>r.assetId===main.id)!;
    if(review.status==='confirmed-none') {review.status='confirmed-rules';review.note+=' Overview correction adds the main/earth exclusion guard; prior main action permissions otherwise remain selected.';}
    model.interlocks!.rules.push({id:`${evidenceId}:${main.id}:earth-open`,assetId:main.id,position:'closed',require:{kind:'device',assetId:main.earthAssembly!.earthAssetId,position:'open'},explanation:'Main Close requires the earth function Open.',evidence:refs});
  }
  for(const id of ['rm714:tf714:es']) model.interlocks!.rules.push({id:`${evidenceId}:${id}:isolator-open`,assetId:id,position:'closed',require:{kind:'device',assetId:ds714.id,position:'open'},explanation:'Earth Close also requires the depicted isolator Open; its new action profile remains unconfirmed.',evidence:refs});
  for(const [cb,ds,es] of [['rm712:tf712:cb',ds712.id,'rm712:tf712:es'],['rm713:tf713:cb',ds713.id,'rm713:tf713:sw:es'],['rm413:tf413:cb','rm413:tf413:sw','rm413:tf413:sw:es'],['rm413:tf414:cb','rm413:tf414:sw','rm413:tf414:sw:es'],['rm714:tf714:cb',ds714.id,'rm714:tf714:es']]) {
    const review=model.interlocks!.reviews.find(r=>r.assetId===cb)!;if(review.status==='confirmed-none')review.status='confirmed-rules';
    model.interlocks!.rules.push({id:`${evidenceId}:${cb}:selector`,assetId:cb,position:'closed',require:{kind:'all',conditions:[{kind:'device',assetId:ds,position:'closed'},{kind:'device',assetId:es,position:'open'}]},explanation:'CB Close requires the restored downstream isolator Closed and earth Open. New control action profiles remain unconfirmed.',evidence:refs});
  }
  model.reviews!.push({id:evidenceId,status:'open',question:'Confirm the complete local/key action profiles for the 16 restored controls; installed mechanical linkage and any unestablished terminal-side interpretation remain unconfirmed.',evidenceIds:[evidenceId]});
  // Added views must include coordinates for all endpoints they now depict.
  for(const view of model.presentation!.views) for(const a of model.assets) if(view.assetIds.includes(a.id)) for(const t of a.terminals) view.layout.terminals[t]??=[...view.layout.assets[a.id]];
  return model;
}
