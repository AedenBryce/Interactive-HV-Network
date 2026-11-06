import type { Box } from './diagram-geometry';
/** RM714 east border to SW421 west border in the owner's 5 November review. */
export const MIN_ROOM_CLEARANCE = 371;
export const paddedRoom = (room:Box, gap=MIN_ROOM_CLEARANCE):Box => ({x:room.x-gap,y:room.y-gap,width:room.width+gap*2,height:room.height+gap*2});
export function roomGap(a:Box,b:Box){return Math.hypot(Math.max(0,a.x-b.x-b.width,b.x-a.x-a.width),Math.max(0,a.y-b.y-b.height,b.y-a.y-a.height));}
