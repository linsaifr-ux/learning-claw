import {FURNITURE} from './furniture.mjs';
export const ROOM_LAYOUTS=[{id:'classic',name:'經典小屋',width:5,depth:4.2},{id:'wide',name:'寬景工作室',width:6,depth:4.2},{id:'long',name:'長形生活室',width:5,depth:5.6}];
export const WALLS=['back','left','right','front'];
export const WALL_NAMES={back:'後牆',left:'左牆',right:'右牆',front:'前牆'};
export const WALL_COLORS={mint:'#afc9ad',blue:'#9bb7cd',pink:'#d2aebc',cream:'#e2d6b3'};
export const roomSize=room=>ROOM_LAYOUTS.find(x=>x.id===room?.layout)||ROOM_LAYOUTS[0];
export function architecture(room){return {layout:room.layout||'classic',lighting:room.lighting||'day',windowStyle:room.windowStyle||'arched',builtins:room.builtins!==false,wallColors:room.wallColors||{}}}
export function validateArchitecture(room){const a=architecture(room);if(['layout','lighting','windowStyle'].some(k=>room[k]!==undefined&&typeof room[k]!=='string')||(room.wallColors!==undefined&&(!room.wallColors||typeof room.wallColors!=='object'))||!ROOM_LAYOUTS.some(x=>x.id===a.layout)||!['day','sunset','night'].includes(a.lighting)||!['arched','panorama','none'].includes(a.windowStyle)||(room.builtins!==undefined&&typeof room.builtins!=='boolean')||!a.wallColors||typeof a.wallColors!=='object'||Array.isArray(a.wallColors)||Object.entries(a.wallColors).some(([k,v])=>!WALLS.includes(k)||!Object.hasOwn(WALL_COLORS,v)))throw Error('房型、光線或牆面設定無效');return a}
export function wallPlacement(room,wall,u,y){const {width,depth}=roomSize(room),w=width/2-.16,d=depth/2-.16;return {wall,x:wall==='left'?-w:wall==='right'?w:u,z:wall==='back'?-d:wall==='front'?d:u,y}}
export function wallRotation(wall){return {back:0,left:Math.PI/2,right:-Math.PI/2,front:Math.PI}[wall||'back']}
export function furnitureSize(item){const f=FURNITURE.find(f=>f.id===item.kind);const [w,h,d]=f?.size||[.5,.5,.5],s=item.scale||1,a=item.rotation||0;return {w:(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)*s,h:h*s,d:(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)*s}}
export function placementProblem(room,item,{wall=false,toy=false,exclude=item.id}={}){
 const {width,depth}=roomSize(room),b=toy?{w:.48,h:.55,d:.48}:furnitureSize(item);
 if(![item.x,item.y??.07,item.z].every(Number.isFinite))return '位置無效';
 if(wall){const side=item.wall||'back',u=['back','front'].includes(side)?item.x:item.z,limit=(['back','front'].includes(side)?width:depth)/2;if(Math.abs(u)+.25*(item.scale||1)>limit-.05||item.y<.25||item.y>2.6)return '壁飾超出牆面';return ''}
 if(Math.abs(item.x)+b.w/2>width/2-.08||Math.abs(item.z)+b.d/2>depth/2-.08)return '物件太靠近牆面';
 if((item.y??.07)+b.h>3)return '物件高度超出房間';
 if(!toy&&room.builtins!==false&&FURNITURE.find(f=>f.id===item.kind)?.solid&&Math.abs(item.x)<2.2+b.w/2&&Math.abs(item.z+1.4)<.45+b.d/2&&(item.y??.07)<.54)return '與原有收藏櫃台重疊';
 if(!toy&&FURNITURE.find(f=>f.id===item.kind)?.solid){for(const other of room.decorations||[]){if(other.id===exclude||!FURNITURE.find(f=>f.id===other.kind)?.solid)continue;const c=furnitureSize(other);if(Math.abs(item.x-other.x)<(b.w+c.w)/2-.03&&Math.abs(item.z-other.z)<(b.d+c.d)/2-.03&&Math.abs((item.y??.07)-(other.y??.07))<Math.max(b.h,c.h))return '與其他家具重疊，請換個位置'}}return '';
}
export function surfaceAt(room,x,z,exclude){const found=[];for(const d of room.decorations||[]){if(d.id===exclude||d.wall)continue;const f=FURNITURE.find(f=>f.id===d.kind);if(!f?.supports)continue;const s=d.scale||1,a=(d.rotation||0),dx=(x-d.x)*Math.cos(a)-(z-d.z)*Math.sin(a),dz=(x-d.x)*Math.sin(a)+(z-d.z)*Math.cos(a);if(Math.abs(dx)<f.size[0]*s/2-.05&&Math.abs(dz)<f.size[2]*s/2-.05)for(const level of f.supports)found.push({id:d.id,y:d.y+level*s})}if(room.builtins!==false&&Math.abs(x)<2.15&&z<-.99&&z>-1.79)found.push({id:'builtin',y:.54});return found.sort((a,b)=>b.y-a.y)[0]||{id:null,y:.07}}
export function moveFurniture(room,id,change){const old=room.decorations.find(d=>d.id===id),next={...old,...change},a=(next.rotation||0)-(old.rotation||0),ratio=(next.scale||1)/(old.scale||1);const move=p=>p.supportId===id?{...p,x:next.x+((p.x-old.x)*Math.cos(a)+(p.z-old.z)*Math.sin(a))*ratio,z:next.z+(-(p.x-old.x)*Math.sin(a)+(p.z-old.z)*Math.cos(a))*ratio,y:next.y+((p.y??.07)-old.y)*ratio,rotation:(p.rotation||0)+a}:p;return {decorations:room.decorations.map(d=>d.id===id?next:move(d)),placements:room.placements.map(move)}}
export function detachSupport(room,id){return {decorations:room.decorations.filter(d=>d.id!==id).map(d=>d.supportId===id?{...d,y:.07,supportId:null}:d),placements:room.placements.map(p=>p.supportId===id?{...p,y:.07,supportId:null}:p)}}
export function roomPreset(id){
 const entries=id==='sun'?[
 ['sofa',-.9,-1.15,0],['armchair',-2.1,.6,Math.PI/2],['coffee',-.9,.15,0],['bookcase',2.22,-1.58,0],['writing',1.28,.9,0],['ottoman',1.25,1.58,0],['books',-.95,.15,0,'coffee'],['vase',1.55,.9,0,'writing']
 ]:[['daybed',-.85,-1.22,0],['glasscase',2.12,-1.55,0],['modular',1.8,.1,0],['console',-.9,1.25,0],['piano',-.65,1.25,0,'console'],['record',-1.4,1.25,0,'console'],['cushion',-.85,-1.15,0,'daybed'],['clock',1.1,-1.94,0]];
 const decorations=entries.map(([key,x,z,rotation,support])=>{const def=FURNITURE.find(f=>f.id==='furniture-'+key);return {id:'preset-'+key,kind:def.id,x,z,y:def.surface==='wall'?2.15:.07,rotation,scale:1,variant:'classic',...(def.surface==='wall'?{wall:'back'}:{}),...(support?{supportId:'preset-'+support}:{})}});
 const result={layout:'wide',lighting:id==='sun'?'day':'night',windowStyle:'panorama',builtins:false,wall:id==='sun'?'cream':'blue',wallColors:id==='sun'?{left:'mint',back:'cream'}:{left:'blue',back:'blue'},style:id==='sun'?'garden':'observatory',floor:id==='sun'?'oak':'walnut',rug:'round',theme:'none',decorationVersion:1,decorations,placements:[],outfits:[]};
 for(const d of decorations)if(d.supportId){const parent=decorations.find(x=>x.id===d.supportId),f=FURNITURE.find(f=>f.id===parent.kind);d.y=parent.y+f.supports.at(-1)}return result;
}

export function freeFloorPlacement(room,item){const {width,depth}=roomSize(room),zs=[];for(let z=-depth/2+.3;z<depth/2-.2;z+=.25)zs.push(z);zs.sort((a,b)=>Math.abs(a-.65)-Math.abs(b-.65));for(const z of zs)for(let x=-width/2+.3;x<width/2-.2;x+=.25){const p={...item,x,z,y:.07,supportId:null};if(!placementProblem(room,p))return p}return null}
