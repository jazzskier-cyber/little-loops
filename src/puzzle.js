export const TAU=Math.PI*2,RADIUS=70,SPACING=119,GAP=2.12;
export const COLORS=['#ef9268','#61bdb3','#ad99dc','#f0c552','#75a7d6','#de8bac','#86ba87','#c18d6e'];
export const CHAPTERS=['A gentle beginning','Finding your flow','A lovely little knot','Beautifully tangled'];
export const NAMES=['Hello, little loop','One at a time','A little chain','Turn the corner','Softly does it','Finding the ends','A branching thought','Room to breathe','A different angle','Peel it back','The quiet center','Loose ends','Follow the thread','A happy tangle','Twist of fate','Take the long way','Coming together','Let it unwind','A clever little knot','The winding path','A moment of clarity','Around the bend','Almost untangled','Everything in its place'];
export function wrap(a){return ((a+Math.PI)%TAU+TAU)%TAU-Math.PI;}
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
export function generateLevel(index,seedOverride){
 const seed=seedOverride??1979+index*7919,random=rng(seed),count=index===0?2:Math.min(12,3+Math.floor(index/2));
 let cells=[[0,0]];
 if(index===0)cells=[[0,0],[1,0]];
 else if(index===1)cells=[[-1,0],[0,0],[1,0]];
 else for(let i=1;i<count;i++){
  const candidates=[];
  for(const [x,y]of cells)for(const [dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(Math.abs(nx)>2||Math.abs(ny)>2||cells.some(([a,b])=>a===nx&&b===ny))continue;
   if(cells.filter(([a,b])=>Math.abs(a-nx)+Math.abs(b-ny)===1).length===1&&!candidates.some(([a,b])=>a===nx&&b===ny))candidates.push([nx,ny]);
  }
  if(!candidates.length)break;
  cells.push(candidates[Math.floor(random()*candidates.length)]);
 }
 const minX=Math.min(...cells.map(p=>p[0])),maxX=Math.max(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1])),maxY=Math.max(...cells.map(p=>p[1]));
 const rings=cells.map(([x,y],i)=>({id:i,x:(x-(minX+maxX)/2)*SPACING,y:(y-(minY+maxY)/2)*SPACING,angle:wrap(random()*TAU),color:null,active:true}));
 // Rings that sit close together (linked or diagonal) never share a color.
 for(const r of rings){const near=rings.filter(o=>o.color&&Math.hypot(o.x-r.x,o.y-r.y)<SPACING*1.5).map(o=>o.color);
  for(let k=0;k<COLORS.length;k++){const c=COLORS[(r.id+Math.floor(index/6)+k)%COLORS.length];if(!near.includes(c)){r.color=c;break;}}}
 const edges=[];for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)if(Math.abs(cells[i][0]-cells[j][0])+Math.abs(cells[i][1]-cells[j][1])===1)edges.push([i,j]);
 // Every initial leaf starts closed toward its neighbor, so release is deliberate.
 for(const r of rings){const links=edges.filter(e=>e.includes(r.id));if(links.length===1){const other=rings[links[0].find(n=>n!==r.id)],target=Math.atan2(other.y-r.y,other.x-r.x);r.angle=wrap(target+(random()>.5?1:-1)*(1.15+random()*1.8));}}
 return {index,seed,name:seedOverride===undefined?NAMES[index]:'A fresh little tangle',chapter:CHAPTERS[Math.min(3,Math.floor(index/6))],rings,edges,moves:0,hints:0,history:[],complete:false};
}
export function neighbors(puzzle,id){return puzzle.edges.filter(e=>e.includes(id)).map(e=>puzzle.rings[e.find(n=>n!==id)]).filter(r=>r.active);}
export function releaseStatus(puzzle,id,angle=puzzle.rings[id]?.angle){
 const ring=puzzle.rings[id];if(!ring?.active)return {ready:false,links:[],reason:'gone'};
 const links=neighbors(puzzle,id);const crossing=Math.acos(SPACING/(2*RADIUS)),tolerance=GAP/2-crossing-.07;
 const ready=links.every(other=>Math.abs(wrap(Math.atan2(other.y-ring.y,other.x-ring.x)-angle))<tolerance);
 return {ready,links,reason:ready?'ready':links.length>1?'linked':'align',tolerance};
}
export function snapshot(puzzle){return {rings:puzzle.rings.map(r=>({angle:r.angle,active:r.active}))};}
export function commitRotation(puzzle,id,angle){
 const ring=puzzle.rings[id];if(!ring?.active||puzzle.complete)return {removed:false,changed:false};
 const changed=Math.abs(wrap(angle-ring.angle))>.025;const before=snapshot(puzzle);ring.angle=wrap(angle);
 const ready=releaseStatus(puzzle,id).ready;
 if(changed||ready){puzzle.history.push(before);puzzle.moves++;}
 if(ready){ring.active=false;puzzle.complete=puzzle.rings.every(r=>!r.active);}
 return {removed:ready,changed,complete:puzzle.complete};
}
export function undo(puzzle){const before=puzzle.history.pop();if(!before)return false;before.rings.forEach((r,i)=>Object.assign(puzzle.rings[i],r));puzzle.moves++;puzzle.complete=false;return true;}
export function hint(puzzle){
 const available=puzzle.rings.filter(r=>r.active&&neighbors(puzzle,r.id).length<=1);const ring=available[0];if(!ring)return null;
 const other=neighbors(puzzle,ring.id)[0];return {id:ring.id,angle:other?Math.atan2(other.y-ring.y,other.x-ring.x):ring.angle};
}
export function stars(puzzle){return puzzle.hints===0&&puzzle.moves<=puzzle.rings.length+2?3:puzzle.hints<=1&&puzzle.moves<=puzzle.rings.length*2+3?2:1;}
export function daySeed(date=new Date()){const key=date.toISOString().slice(0,10);return {key,seed:Number(key.replaceAll('-',''))};}
