import {it,expect} from 'vitest';
import {manualLabelLayout} from './manual-label-layout';
import type {Point} from './diagram-geometry';

it('moves only the caption, with its saved relative position following subsequent equipment moves',()=>{
 const geometry={view:{layout:{assets:{cb:[100,200] as Point}}},labels:new Map([['cb',{x:120,y:210,width:80,height:40,lines:['CB']}]]),routes:new Map([['feed',[[100,0],[100,200]]]])};
 const positions={cb:[200,50] as Point};
 const moved=manualLabelLayout(geometry,positions);
 expect(moved.labels.get('cb')).toMatchObject({x:300,y:250});
 expect(moved.view).toBe(geometry.view);expect(moved.routes).toBe(geometry.routes);
 expect(geometry.labels.get('cb')).toMatchObject({x:120,y:210});
 const relocated=manualLabelLayout({...geometry,view:{layout:{assets:{cb:[500,600] as Point}}}},positions);
 expect(relocated.labels.get('cb')).toMatchObject({x:700,y:650});
 expect(manualLabelLayout(geometry,{})).toBe(geometry);
});
