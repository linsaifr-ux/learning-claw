// Builds convex hull colliders from the same prize meshes the machine renders (scale 0.54 x machinePrizeScale, y -0.29); used by scripts/build-crafted-colliders.mjs.
import * as T from 'three';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {toy} from '../../src/World.jsx';
import {machinePrizeScale} from '../../functions/machine.mjs';
// Few hull vertices keep resting contacts calm and fills fast; round bases that rock forever get a flat-ended frustum.
const LIMIT=40,PRISMS=['accessory-crown','volcano'];
const sample=(points,limit)=>{if(points.length<=limit)return points;const pick=[0],d=points.map(()=>Infinity);while(pick.length<limit){const last=points[pick[pick.length-1]];let best=0;for(let i=0;i<points.length;i++){d[i]=Math.min(d[i],points[i].distanceTo(last));if(d[i]>d[best])best=i}pick.push(best)}return pick.map(i=>points[i])};
window.buildHulls=async kinds=>{const out={};for(const kind of kinds){const prize=await toy(kind);prize.updateMatrixWorld(true);const points=[];prize.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).multiplyScalar(.54*machinePrizeScale(kind));v.y-=.29;points.push(v)}});
 const box=new T.Box3().setFromPoints(points),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());let verts;
 if(PRISMS.includes(kind)){const radius=pts=>Math.max(...pts.map(v=>Math.hypot(v.x-center.x,v.z-center.z)));const band=size.y*.15,bottom=radius(points.filter(v=>v.y<box.min.y+band)),top=radius(points.filter(v=>v.y>box.max.y-band));
  verts=[[box.min.y,bottom],[box.max.y,top]].flatMap(([y,r])=>Array.from({length:16},(_,i)=>new T.Vector3(center.x+Math.cos(i*Math.PI/8)*r,y,center.z+Math.sin(i*Math.PI/8)*r)))}
 else{const hull=new ConvexHull().setFromPoints(points),all=new Set();for(const f of hull.faces){let e=f.edge;do{all.add(e.head().point);e=e.next}while(e!==f.edge)}verts=sample([...all],LIMIT)}
 out[kind]={hull:[verts.flatMap(v=>v.toArray().map(x=>+x.toFixed(4)))],size:size.toArray().map(x=>+x.toFixed(3))}}return out};
window.hullsReady=true;
