import {expect,it} from 'vitest';
import {clearConnectorCaptions} from './connector-clearance';
import {moveLineSegment} from './line-routing';
import type {Point} from './diagram-geometry';

it('retains a user-moved route when automatic clearance runs after release',()=>{
 const id='sw505:tf505a:cable-TF505A-P-01';
 const dragged=moveLineSegment([[0,0],[0,100]],0,[50,0]);
 const geometry={assets:[],connections:[{id,from:'cb',to:'tf'}],owners:new Map([['cb','breaker'],['tf','transformer']]),
  routes:new Map([[id,dragged]]),labels:new Map([['caption',{x:40,y:40,width:20,height:20,lines:['caption']}]]),
  view:{id:'test',label:'test',assetIds:[],bounds:[0,0,200,200] as [number,number,number,number],layout:{assets:{},terminals:{}}},panels:[]};
 expect(clearConnectorCaptions(geometry,1).routes.get(id)).not.toEqual(dragged);
 expect(clearConnectorCaptions(geometry,1,new Set([id])).routes.get(id)).toEqual(dragged);
 expect(clearConnectorCaptions(geometry,1,new Set([id])).routes.get(id)?.[0]).toEqual([0,0] satisfies Point);
});
