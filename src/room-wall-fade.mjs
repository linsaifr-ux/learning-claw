// Continuous angular cutaway plus a time-based fade; every wall owns its materials.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export function wallOpacityTarget(id,mode,wallView,camera){
 if(mode==='top')return 0;
 if(mode==='wall')return id===wallView?1:0;
 const length=Math.hypot(camera.x,camera.z)||1;
 const facing=({back:camera.z,front:-camera.z,left:camera.x,right:-camera.x}[id]||0)/length;
 return smooth((facing+.18)/.36);
}
export function fadeOpacity(current,target,seconds){const next=target+(current-target)*Math.exp(-Math.max(0,seconds)/.085);return Math.abs(next-target)<.001?target:next}
export function createWallFader(root){
 const copies=new Map(),entries=[];
 root.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(!copies.has(m)){const c=m.clone();c.transparent=true;copies.set(m,{material:c,opacity:m.opacity,depthWrite:m.depthWrite})}return copies.get(m).material};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.castShadow=false;entries.push(o)});
 return opacity=>{root.userData.wallOpacity=opacity;root.visible=opacity>.001;for(const {material,opacity:base,depthWrite} of copies.values()){material.opacity=base*opacity;material.depthWrite=opacity>=.999&&depthWrite} };
}
