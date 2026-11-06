import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

// Construction role IDs are distinct from printed equipment/terminal tags.
const documents = {
  rmu: { document: '520CBC0007-2130-DR-EL-0003.pdf', revision: '3 (28.01.25; MODIFIED AS FOUND 23.10.23)', page: 1 },
  mv: { document: '520CBC0007-2130-DR-EL-0004.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1 },
  line: { document: 'CB21OP055B-10016-DR-EL-0089.pdf', revision: '0 (10.06.22; ISSUED FOR CONSTRUCTION)', page: 1 },
  overview: { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27.10.25; ISSUED FOR USE; FOR INFORMATION ONLY)', page: 1 },
  cv006: { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1 },
};
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
type Region = [keyof typeof documents, string];
const assets: Asset[] = [];
const connections: NetworkModel['connections'] = [];
const evidence: NonNullable<NetworkModel['evidence']> = [];
const earths: NonNullable<NetworkModel['earths']> = [];
const boundaries: NonNullable<NetworkModel['boundaries']> = [];
const devices: NetworkModel['starting']['devices'] = {};
function fact(id: string, summary: string, refs: Region[], reviewIds: string[], knowledge: 'supported' | 'provisional' | 'unresolved' = 'supported'): Claim {
  evidence.push({id,summary,status:knowledge,references:refs.map(([source,clause])=>({...documents[source],clause}))});
  return {knowledge,evidenceIds:[id],reviewIds:[...new Set([...reviewIds,'H10-Q07'])]};
}
function port(id: string, label: string, kind: 'bus' | 'interface', claim: Claim, aliases: string[] = []) {
  const terminal = `${id}:port`;
  assets.push({id,label,kind,aliases,terminals:[terminal],conductivePairs:[],positions:[],...claim});
  return terminal;
}
function link(id: string, from: string, to: string, claim: Claim) { connections.push({id,from,to,...claim}); }
function unknown(id: string, terminal: string, label: string, claim: Claim) { boundaries.push({id,terminal,label,sourceCoverage:'unconfirmed',earthCoverage:'unconfirmed',...claim}); }
function control(id: string, label: string, kind: 'breaker' | 'disconnector' | 'earth-switch', claim: Claim, aliases: string[] = []): [string,string] {
  const terminals: [string,string] = [`${id}:in`,`${id}:out`];
  assets.push({id,label,kind,aliases,terminals,conductivePairs:[],positions:[{id:'open',label:'Open',pairs:[]},{id:'closed',label:'Closed',pairs:[[...terminals]]}],...claim});
  devices[id] = null;
  return terminals;
}
function earthBranch(id: string, label: string, from: string, claim: Claim, aliases: string[] = []) {
  const terminals = control(id,label,'earth-switch',claim,aliases);
  link(`${id}:branch`,from,terminals[0],claim);
  earths.push({id:`${id}:earth`,label:`${label} termination`,terminal:terminals[1],...claim});
}

const supply = fact('H10-SOURCE-CONFLICT','The RM420 incoming cable is SR420-RM420-P01 from pole286 and cites PL1. PL1 depicts station/TF04 33kV supply; the CV006 sheet instead depicts the pole286 branch on a SW411 tier03 22kV route. The installed source/primary choice is unconfirmed. The two comparison interfaces are intentionally unjoined.',[['rmu','A-B / 8-9, pole286 and incoming cable'],['line','F-G / 10-11, 80A fused ABS branch to RMU420; A / 11-12 surge-arrestor legend'],['cv006','A / 1-12, SW411 tier03 and pole286 route']],['H10-Q01']);
const incoming = port('rm420:interface:pole286','Pole 286 · source identity unconfirmed','interface',supply,['SR420-RM420-P01','PL1 station 33kV / CV006 SW411 22kV discrepancy']);
unknown('rm420:pole286:coverage',incoming,'Pole286 source/earth coverage and 22/33kV identity unconfirmed',supply);
for (const [key,label,alias] of [['station33','PL1 station · 33 kV comparison','line33:hopper-10:interface'],['cv00622','CV006 / SW411 · 22 kV comparison','cv006:interface:hopper10']] as const) {
  const terminal = port(`rm420:comparison:${key}`,label,'interface',supply,[alias,'Source comparison only; no conductive join']);
  unknown(`rm420:${key}:coverage`,terminal,'External candidate identity must be reconciled before joining',supply);
}
const rmuBus = port('rm420:bus','RM420 · 33 kV label · source unconfirmed','bus',fact('H10-RMU-BUS','0003 depicts a single phase bar labelled33000V630A20kA1sec. No internal bus tie is depicted; this label does not settle the external22/33kV discrepancy.',[['rmu','B, main phase bar']],['H10-Q01']),['33000V630A20kA FOR1SEC']);
const inSwitch = control('rm420:sw01','RM420 SW01','disconnector',supply,['RM420-SW01 630A']);
link('rm420:incoming:cable',incoming,inSwitch[0],supply); link('rm420:incoming:bus-link',inSwitch[1],rmuBus,supply);
earthBranch('rm420:es01','RM420 ES01',inSwitch[0],fact('H10-INCOMING-EARTH','0003 depicts ES01 on the cable side of SW01. Note1 specifies administrative controls; this does not by itself establish a physical interlock truth table.',[['rmu','A-B / 8-9, ES01; G / 8-10, note1']],['H10-Q06']),['RM420 ES01']);

const transformerOutputs: Record<string,string> = {};
for (const [suffix,number,outputLabel,cable] of [['a','01','6.9 kV MV winding','SR420-MC420-P01'],['b','02','415 V LV winding','SR420-MC420A-P01']] as const) {
  const tf = `TF420${suffix.toUpperCase()}`; const prefix = `rm420:${tf.toLowerCase()}`;
  const feeder = fact(`H10-${tf}-FEEDER`,`${tf} branch is CB${number}, SW0${Number(number)+1}, cable-side ES0${Number(number)+1}, then SS420-${tf}-P01. Ronis/key symbols are not power conductors.`,[['rmu',`B-F / ${suffix==='a'?'3-4':'5-6'}, ${tf} branch`]],['H10-Q04','H10-Q06']);
  const cb = control(`${prefix}:cb`,`RM420 CB${number}`,'breaker',feeder);
  const swNumber = Number(number)+1;
  const sw = control(`${prefix}:sw`,`RM420 SW0${swNumber}`,'disconnector',feeder);
  link(`${prefix}:bus-cb`,rmuBus,cb[0],feeder); link(`${prefix}:cb-sw`,cb[1],sw[0],feeder);
  earthBranch(`${prefix}:es`,`RM420 ES0${swNumber}`,sw[1],feeder);
  const primary = fact(`H10-${tf}-PRIMARY`,`${tf} has explicit dual33kV/22kV primary windings (note3). The external cable's selected primary connection is not established. This construction interface has no selector position matrix or conductive link to either primary.`,[['rmu',`E-F / ${suffix==='a'?'3-4':'5-6'}, ${tf} three winding symbols; G note3`]],['H10-Q04'],'unresolved');
  const input = port(`${prefix}:primary-connection`,`${tf} · primary connection unresolved`,'interface',primary);
  link(`${prefix}:cable-SS420-${tf}-P01`,sw[1],input,feeder);
  unknown(`${prefix}:input-coverage`,input,`${tf} selected primary wiring unconfirmed`,primary);
  const transfer = fact(`H10-${tf}-TRANSFER`,`Inference: candidate source transfer between each distinct33/22kV primary and the depicted ${outputLabel} secondary. Primary selection, reverse transfer and independent earth continuity are unconfirmed. NER/neutral/tank earth is not a phase-earth shortcut.`,[['rmu',`E-F / ${suffix==='a'?'3-4':'5-6'}, ${tf} windings and note3`]],['H10-Q04'],'provisional');
  const terminals = [`${prefix}:primary33`,`${prefix}:primary22`,`${prefix}:secondary`];
  assets.push({id:prefix,label:`${tf} · ${outputLabel}`,kind:'transformer',aliases:[`SS420-${tf}`,suffix==='a'?'2500kVA33/22/6.9kV DYN11; NER01':'1500kVA33/22/0.415kV DYN11','Dual primary winding selection unconfirmed'],terminals,conductivePairs:[],sourcePairs:[[terminals[0],terminals[2]],[terminals[1],terminals[2]]],earthPairs:[],positions:[],...transfer});
  terminals.forEach(terminal=>unknown(`${terminal}:coverage`,terminal,`${tf} primary selection/source/backfeed/earth policy unconfirmed`,transfer));
  transformerOutputs[suffix] = terminals[2];
  if (suffix==='b') {
    const endpoint = fact('H10-MC420A-GAP','0003 continuationB labels SR420-MC420A-P01; the overview names MC420A. Inference: intended same LV destination. No detailed phase bar/incomer is supplied; auxiliary DB420B/DB4201 references are not substituted as that bus.',[['rmu','E-F / 5-6, continuationB'],['overview','D / 1-3, MC420A']],['H10-Q03'],'provisional');
    const lv = port('rm420:mc420a:interface','MC420A · first LV bus detail unconfirmed','interface',endpoint,['MC420A',cable,'No invented LV incomer']);
    link('rm420:tf420b:lv-continuation',terminals[2],lv,endpoint);
    unknown('rm420:mc420a:coverage',lv,'MC420A final LV incomer, bus and remaining coverage unconfirmed',endpoint);
  }
}
const spare = fact('H10-SPARE','0003 third feeder has CB03, SW04, ES04 and SPARE stub. The overview repeats SW03/ES03 on that branch. Preserve these distinct role IDs and aliases; installed continuation/state is unconfirmed.',[['rmu','B-E / 7-8, spare branch'],['overview','C-D / 1-3, third RM420 feeder']],['H10-Q02']);
const spareCb = control('rm420:spare:cb','RM420 CB03 · spare','breaker',spare,['RM420 CB03']);
const spareSw = control('rm420:spare:sw','RM420 SW04 · spare','disconnector',spare,['RM420 SW04 (detail)','RM420 SW03 (overview third feeder)']);
link('rm420:spare:bus-cb',rmuBus,spareCb[0],spare); link('rm420:spare:cb-sw',spareCb[1],spareSw[0],spare);
earthBranch('rm420:spare:es','RM420 ES04 · spare',spareSw[1],spare,['RM420 ES04 (detail)','RM420 ES03 (overview third feeder)']);
const sparePort = port('rm420:spare:interface','RM420 spare · continuation unconfirmed','interface',spare);
link('rm420:spare:stub',spareSw[1],sparePort,spare); unknown('rm420:spare:coverage',sparePort,'Spare installed continuation/source/earth coverage unconfirmed',spare);

const mv = fact('H10-MV-INCOMING','0004 continuationA matches SS420-TF420A and SR420-MC420-P01 through tier5 drawout VCB200A into MC420 phase bar, labelled6.6kV200A25kA3sec. Its earth branch is on the incoming cable side. TF420A6.9kV versus bar6.6kV remains unresolved.',[['mv','A-D / 4-5, incoming tier5 and main bar'],['rmu','E-F / 3-4, secondary continuationA']],['H10-Q04','H10-Q05','H10-Q06']);
const mvBus = port('rm420:mc420:bus','MC420 · 6.6 kV MV bus','bus',mv,['SR420-MC420','Transformer output labelled6.9kV']);
const mvCb = control('rm420:mc420:in:vcb','MC420 tier5 · VCB200A','breaker',mv,['Tier5 VCB200A; unique tag unconfirmed']);
link('rm420:mc420:incoming-cable',transformerOutputs.a,mvCb[0],mv); link('rm420:mc420:incomer-bus',mvCb[1],mvBus,mv);
earthBranch('rm420:mc420:in:es','MC420 incoming earth · tag unconfirmed',mvCb[0],mv);
for (const [motor,tiers] of [['01',[1,2]],['02',[3,4]]] as const) {
  const prefix = `rm420:mc420:motor-${motor}`;
  const branch = fact(`H10-MOTOR-${motor}`,`0004 tiers${tiers.join('/')} are two parallel phase branches, each with a200A fuse then400A RC/FC contactor, joining the SZ010-EM${motor} motor-side conductor. Note5 earthing is on that common motor side. Device IDs/withdrawal positions and complete interlock states are unconfirmed; heater/control circuits are excluded.`,[['mv',`A-F / ${motor==='01'?'7-8':'9-11'}, paired contactors, join and motor; G notes5/8`]],['H10-Q05','H10-Q06']);
  const output = port(`${prefix}:output`,`SZ010-EM${motor} · MV motor interface`,'interface',branch,[`SZ010-EM${motor}`,'450kW','SIZER MAIN DRIVE NO.1 (repeated description)']);
  unknown(`${prefix}:coverage`,output,'MV motor endpoint scope and remaining coverage unconfirmed',branch);
  for (const [index,mode] of ['rc','fc'].entries()) {
    const fuseClaim = fact(`H10-MOTOR-${motor}-${mode}-FUSE`,`Inference: candidate intact200A phase-fuse continuity in tier${tiers[index]}. Fuse condition and withdrawal configuration remain unconfirmed.`,[['mv',`B-C / ${motor==='01'?'7-8':'9-11'}, tier${tiers[index]} FUS200A`]],['H10-Q05'],'provisional');
    const fuseId = `${prefix}:${mode}:fuse`; const terminals = [`${fuseId}:in`,`${fuseId}:out`];
    assets.push({id:fuseId,label:`Tier${tiers[index]} · fuse200A`,kind:'interface',aliases:['FUS200A'],terminals,conductivePairs:[[terminals[0],terminals[1]]],positions:[],...fuseClaim});
    const contact = control(`${prefix}:${mode}`,`Tier${tiers[index]} · ${mode.toUpperCase()}400A`,'disconnector',branch,[`${mode.toUpperCase()}400A`,'Contactor/withdrawal construction role; unique tag unconfirmed']);
    link(`${prefix}:${mode}:bus-fuse`,mvBus,terminals[0],branch); link(`${prefix}:${mode}:fuse-contact`,terminals[1],contact[0],branch); link(`${prefix}:${mode}:contact-motor`,contact[1],output,branch);
  }
  earthBranch(`${prefix}:es`,`SZ010-EM${motor} · maintenance earth`,output,branch,['Note5 Ronis key captive when earth switch ON']);
}
const notes = fact('H10-INTERLOCK-NOTES','0003 note1 explicitly requires administrative controls/upstream earthing; note4 says Ronis key free with DS open and ES open, unique per feeder. 0004 note5 says maintenance key captive when earth switch ON; note6 upstream-earth mapping references another project; note8 padlock only OFF. Complete physical interlock/key/withdrawal truth tables remain unconfirmed. No administrative instruction is promoted into an inferred physical block rule.',[['rmu','G / 8-10, notes1/3/4'],['mv','G / 1-6, notes5/6/8; mechanical/electrical/key legend']],['H10-Q06'],'unresolved');
const questions: [string,string][] = [
  ['H10-Q01','Resolve station/PL1 33kV versus CV006/SW41122kV pole286 supply and selected transformer primary; comparison interfaces remain unjoined.'],
  ['H10-Q02','Resolve third feeder SW04/ES04 versus repeated overview SW03/ES03 without merging branch roles.'],
  ['H10-Q03','Confirm MC420A first LV incomer/bus and auxiliary DB420B/DB4201 coverage; no endpoint controls have been fabricated.'],
  ['H10-Q04','Confirm dual-primary wiring/selection, source/backfeed/earth policies and6.9/6.6kV labels; neutral/NER is not phase earth.'],
  ['H10-Q05','Confirm unique contactor/earth/withdrawal identities, fuse condition, MV endpoint scope and repeated motor description.'],
  ['H10-Q06','Confirm complete physical/key conditions, note6 reference equivalence and upstream-earth identity; distinguish administrative requirements.'],
  ['H10-Q07','Confirm installed configuration, spare status, every starting position and external availability; drawn poses/stamps are not baseline acceptance.'],
];
type Point = [number,number];
const layout: DiagramLayout = {assets:{},terminals:{},bends:{},rotations:{},labelOffsets:{}};
const owners = new Map(assets.flatMap(asset=>asset.terminals.map(terminal=>[terminal,asset.id] as const)));
function place(target: DiagramLayout, id: string, x: number, y: number) {
  const asset = assets.find(asset=>asset.id===id)!;
  target.assets[id]=[x,y]; target.labelOffsets![id]=[0,65];
  if (asset.positions.length) {
    const earth = asset.kind==='earth-switch'; target.rotations![id]=earth?0:90; target.labelOffsets![id]=earth?[80,0]:[0,-50];
    target.terminals[asset.terminals[0]]=earth?[x-30,y]:[x,y-30]; target.terminals[asset.terminals[1]]=earth?[x+30,y]:[x,y+30];
  } else if (asset.kind==='transformer') {
    target.terminals[asset.terminals[0]]=[x-50,y-30]; target.terminals[asset.terminals[1]]=[x+50,y-30]; target.terminals[asset.terminals[2]]=[x,y+40];
    target.labelOffsets![id]=[0,-80];
  } else if (asset.terminals.length===2) {
    target.terminals[asset.terminals[0]]=[x,y-25]; target.terminals[asset.terminals[1]]=[x,y+25]; target.labelOffsets![id]=[105,0];
  } else {
    target.terminals[asset.terminals[0]]=[x,y];
    if (asset.kind==='bus') {target.rotations![id]=90; target.labelOffsets![id]=[0,-45];}
  }
}
function route(target: DiagramLayout) {
  for (const connection of connections) {
    const [x,y]=target.terminals[connection.from]; const [tx,ty]=target.terminals[connection.to];
    const from=assets.find(asset=>asset.id===owners.get(connection.from))!; const to=assets.find(asset=>asset.id===owners.get(connection.to))!;
    target.bends![connection.id]=from.kind==='bus'?[[tx,y]]:to.kind==='bus'?[[x,ty]]:connection.id.endsWith(':branch')?[[x,ty]]:x!==tx&&y!==ty?[[tx,y+70]]:[];
  }
}
place(layout,'rm420:interface:pole286',120,50); place(layout,'rm420:sw01',120,230); place(layout,'rm420:es01',250,140);
place(layout,'rm420:comparison:station33',1750,80); place(layout,'rm420:comparison:cv00622',2100,80); place(layout,'rm420:bus',950,350);
for (const [suffix,x] of [['a',600],['b',1100]] as const) {
  const prefix=`rm420:tf420${suffix}`;
  place(layout,`${prefix}:cb`,x,520); place(layout,`${prefix}:sw`,x,680); place(layout,`${prefix}:es`,x+120,780);
  place(layout,`${prefix}:primary-connection`,x,920); place(layout,prefix,x,1160);
}
place(layout,'rm420:mc420a:interface',1100,1380);
place(layout,'rm420:spare:cb',1600,520); place(layout,'rm420:spare:sw',1600,680); place(layout,'rm420:spare:es',1720,780); place(layout,'rm420:spare:interface',1600,930);
place(layout,'rm420:mc420:in:vcb',600,1500); place(layout,'rm420:mc420:in:es',750,1400); place(layout,'rm420:mc420:bus',900,1680);
for (const [motor,x] of [['01',550],['02',1250]] as const) {
  const prefix=`rm420:mc420:motor-${motor}`;
  for (const [mode,offset] of [['rc',-110],['fc',110]] as const) {place(layout,`${prefix}:${mode}:fuse`,x+offset,1850);place(layout,`${prefix}:${mode}`,x+offset,2020);}
  place(layout,`${prefix}:output`,x,2260); place(layout,`${prefix}:es`,x+220,2140);
}
route(layout);
const transformers=['rm420:tf420a','rm420:tf420b'];
const transformerIds=assets.filter(asset=>transformers.includes(asset.id)||asset.id.endsWith(':primary-connection')||asset.id==='rm420:mc420a:interface').map(asset=>asset.id);
const rmuIds=assets.filter(asset=>!asset.id.startsWith('rm420:mc420:')&&!transformerIds.includes(asset.id)).map(asset=>asset.id);
const mvIds=assets.filter(asset=>asset.id.startsWith('rm420:mc420:')).map(asset=>asset.id);
const transformerLayout=structuredClone(layout); const mvLayout=structuredClone(layout);
for (const [suffix,x] of [['a',400],['b',1000]] as const) {
  place(transformerLayout,`rm420:tf420${suffix}:primary-connection`,x,60);place(transformerLayout,`rm420:tf420${suffix}`,x,330);
}
place(transformerLayout,'rm420:mc420a:interface',1000,600);
for (const id of mvIds) {const [x,y]=layout.assets[id];place(mvLayout,id,x,y-1350);}
const definitions: {id:string;label:string;assetIds:string[];layout:DiagramLayout;bounds:DiagramView['bounds']}[]=[
  {id:'rmu',label:'RM420 switchgear · source unconfirmed',assetIds:rmuIds,layout:structuredClone(layout),bounds:[-40,-40,2370,1120]},
  {id:'transformers',label:'Dual primaries / MC420A gap',assetIds:transformerIds,layout:transformerLayout,bounds:[100,-100,1230,900]},
  {id:'mv',label:'MC420 MV overview · 6.6/6.9 kV unresolved',assetIds:mvIds,layout:mvLayout,bounds:[260,-40,1450,1140]},
];
for (const motor of ['01','02']) {
  const prefix=`rm420:mc420:motor-${motor}`; const target=structuredClone(layout);
  place(target,'rm420:mc420:bus',400,80);
  for (const [mode,x] of [['rc',290],['fc',510]] as const) {place(target,`${prefix}:${mode}:fuse`,x,210);place(target,`${prefix}:${mode}`,x,350);}
  place(target,`${prefix}:output`,400,570);place(target,`${prefix}:es`,660,470);target.labelOffsets![`${prefix}:es`]=[0,65];
  definitions.push({id:`motor-${motor}`,label:`SZ010-EM${motor} · MV assembly`,assetIds:['rm420:mc420:bus',...assets.filter(asset=>asset.id.startsWith(`${prefix}:`)).map(asset=>asset.id)],layout:target,bounds:[120,-60,850,820]});
}
const detailViews: DiagramView[]=definitions.map(definition=>{
  const view: DiagramView={...definition,boundaries:[]}; const visible=new Set(view.assetIds); const portals=new Map<string,Point>();
  for (const connection of connections) {
    const fromVisible=visible.has(owners.get(connection.from)!);const toVisible=visible.has(owners.get(connection.to)!);
    if (fromVisible===toVisible) continue;
    const local=fromVisible?connection.from:connection.to;const remote=fromVisible?connection.to:connection.from;
    const remoteAssetId=owners.get(remote)!;const [x,y]=view.layout.terminals[local];const [rx,ry]=view.layout.terminals[remote];
    let point:Point=portals.get(remote)??(Math.abs(rx-x)>Math.abs(ry-y)?[x+Math.sign(rx-x)*120,y]:[x,y+(Math.sign(ry-y)||-1)*120]);
    if (definition.id==='transformers') point=[x,y+(local.endsWith(':secondary')?150:-120)];
    if (definition.id==='mv'&&remoteAssetId==='rm420:tf420a') point=[x,y-120];
    if (definition.id.startsWith('motor-')&&remoteAssetId==='rm420:mc420:in:vcb') point=[400,-30];
    if (definition.id.startsWith('motor-')&&remoteAssetId.includes(':motor-')&&remoteAssetId.endsWith(':fuse')) point=[160,remoteAssetId.includes(':rc:')?80:150];
    portals.set(remote,point);view.layout.terminals[remote]=point;
    const target=definitions.find(candidate=>candidate.id!==definition.id&&candidate.assetIds.includes(remoteAssetId));
    view.boundaries!.push({connectionId:connection.id,remoteAssetId,targetViewId:target?.id??'overview',position:point});
  }
  route(view.layout);return view;
});
export const hopper10Model: NetworkModel = {
  id:'site-hopper-10',version:'construction-2026-10-22.2',name:'Hopper10 / RM420 · unconfirmed construction',synthetic:false,
  assets,connections,evidence,earths,boundaries,sources:[],starting:{devices,sources:{}},
  reviews:questions.map(([id,question])=>({id,question,status:'open',evidenceIds:evidence.filter(record=>assets.some(asset=>asset.reviewIds?.includes(id)&&asset.evidenceIds?.includes(record.id))||id==='H10-Q06'&&record.id===notes.evidenceIds![0]).map(record=>record.id)})),
  interlocks:{reviews:assets.filter(asset=>asset.positions.length).map(asset=>({assetId:asset.id,status:'unresolved',note:'Complete physical interlock, key, supported/withdrawal positions and baseline remain unconfirmed. Switching is not confirmed as permitted.',evidence:[{...(asset.id.startsWith('rm420:mc420:')?documents.mv:documents.rmu),clause:asset.id.startsWith('rm420:mc420:')?'C-D, incoming/paired-contactor/earth assemblies; G notes5/6/8':'B-C, switch and earth contacts; G notes1/4'}]})),rules:[]},
  presentation:{overviewId:'overview',views:[{id:'overview',label:'Hopper10 overview · provisional',assetIds:assets.map(asset=>asset.id),layout,bounds:[-40,-50,2370,2550]},...detailViews]},
};
