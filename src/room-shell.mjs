import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {roomSize,WALL_COLORS,WALLS,wallRotation} from '../functions/room-space.mjs';
import {batchCraft,surfaceTexture} from './model-craft.mjs';
export function roomShell(scene,room){
 const {width,depth}=roomSize(room),walls=[],wood=new T.MeshStandardMaterial({color:room.floor==='walnut'?'#8a654c':room.floor==='tile'?'#ddd6c7':'#c6a578',roughness:.82,bumpMap:surfaceTexture('grain'),bumpScale:.008}),trim=new T.MeshStandardMaterial({color:'#f2e8d5',roughness:.65}),gold=new T.MeshStandardMaterial({color:'#b99b67',metalness:.6,roughness:.38});
 const box=(group,x,y,z,w,h,d,m,r=.01)=>{const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,h/4,d/4,w/4)),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o};
 const floor=new T.Group();box(floor,0,-.035,0,width,.16,depth,wood,.025);
 const step=room.floor==='tile'?.48:.34;for(let x=-width/2+.03;x<width/2-.1;x+=step)for(let z=-depth/2+.03;z<depth/2-.1;z+=room.floor==='tile'?.48:1.05){const w=Math.min(step-.012,width/2-x-.025),d=Math.min((room.floor==='tile'?.48:1.05)-.012,depth/2-z-.025);box(floor,x+w/2,.048,z+d/2,w,.014,d,wood,.003)}scene.add(batchCraft(floor));
 for(const id of WALLS){const group=new T.Group(),length=['back','front'].includes(id)?width:depth,color=room.wallColors?.[id]||room.wall||'mint',paint=new T.MeshStandardMaterial({color:WALL_COLORS[color],roughness:.95,bumpMap:surfaceTexture('plaster'),bumpScale:.006});
  box(group,0,1.5,-.055,length,3,.12,paint,.014);box(group,0,.15,.02,length-.02,.19,.05,trim);box(group,0,2.92,.02,length,.09,.09,trim);box(group,0,.88,.014,length-.04,.025,.03,trim,.004);
  for(let x=-length/2+.2;x<length/2-.1;x+=.62){box(group,x,.5,.018,.025,.59,.025,trim,.003)}
  if(id==='back'&&room.windowStyle!=='none'){
   const w=room.windowStyle==='panorama'?Math.min(2.4,width*.55):1.36,h=1.27,x=-width*.16,y=1.91;
   const sky=new T.MeshStandardMaterial({color:room.lighting==='night'?'#233854':room.lighting==='sunset'?'#d9aa92':'#bddcdd',emissive:room.lighting==='night'?'#122039':'#516768',emissiveIntensity:.18,roughness:.8});box(group,x,y,.028,w,h,.025,sky);
   for(const xx of [x-w/2,x,x+w/2])box(group,xx,y,.07,.055,h+.10,.08,trim);for(const yy of [y-h/2,y+h/2])box(group,x,yy,.07,w+.11,.06,.08,trim);box(group,x,y-.04,.075,w,.032,.065,trim);box(group,x,y-h/2-.04,.16,w+.28,.065,.30,wood);
   for(const side of [-1,1])for(let i=0;i<5;i++){const curtain=new T.Mesh(new T.CylinderGeometry(.048,.06,h+.15,10),new T.MeshStandardMaterial({color:room.style==='observatory'?'#78879e':'#e8d9be',roughness:.98}));curtain.position.set(x+side*(w/2+.08+i*.035),y,.14);curtain.castShadow=true;group.add(curtain)}box(group,x,y+h/2+.1,.14,w+.6,.028,.035,gold);
   if(room.windowStyle==='arched'){const ring=new T.Mesh(new T.TorusGeometry(w/2,.025,8,40,Math.PI),trim);ring.position.set(x,y+.19,.095);group.add(ring)}
  }
  if(id==='back'&&room.style==='observatory'){
   const frame=new T.Mesh(new T.TorusGeometry(.39,.022,8,48),gold);frame.position.set(width*.29,2.05,.09);group.add(frame);
   const chart=new T.Mesh(new T.CircleGeometry(.38,40),new T.MeshStandardMaterial({color:'#33465e',roughness:.9}));chart.position.set(width*.29,2.05,.065);group.add(chart);
   for(let i=0;i<13;i++){const star=new T.Mesh(new T.SphereGeometry(.012,6,4),trim);star.position.set(width*.29+Math.sin(i*2.4)*.28,2.05+Math.cos(i*3.1)*.28,.10);group.add(star)}
  }
  if(id==='back'&&room.style==='garden'){const stem=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({length:16},(_,i)=>new T.Vector3(width*.36+Math.sin(i*.7)*.12,1+i*.105,.09))),32,.008,5,false),new T.MeshStandardMaterial({color:'#78946a',roughness:.9}));group.add(stem);for(let i=0;i<16;i++){const leaf=new T.Mesh(new T.SphereGeometry(.075,8,6),new T.MeshStandardMaterial({color:i%2?'#78946a':'#9caf7c',roughness:.9}));leaf.position.set(width*.36+Math.sin(i*.7)*.12,1+i*.105,.10);leaf.scale.set(1.2,.6,.35);leaf.rotation.z=Math.sin(i)*.6;group.add(leaf)}}
  if(id==='left'){
   const x=-length*.18,shade=new T.Mesh(new T.ConeGeometry(.16,.21,24,1,true),new T.MeshStandardMaterial({color:'#f3dfb7',emissive:'#ffb64d',emissiveIntensity:room.lighting==='night'?.8:.08,side:T.DoubleSide,roughness:.8}));shade.position.set(x,2.08,.2);group.add(shade);box(group,x,1.9,.10,.025,.35,.18,gold);
  }
  if(id==='front'){const x=length*.21;box(group,x,1.02,.025,.88,2.02,.04,wood);for(const xx of [x-.49,x+.49])box(group,xx,1.03,.07,.07,2.14,.08,trim);box(group,x,2.08,.07,1.06,.08,.08,trim);box(group,x,1.2,.057,.66,.98,.022,trim);const handle=new T.Mesh(new T.SphereGeometry(.035,12,8),gold);handle.position.set(x+.29,.97,.11);group.add(handle)}
  const mesh=batchCraft(group);mesh.rotation.y=wallRotation(id);mesh.position.set(id==='left'?-width/2+.06:id==='right'?width/2-.06:0,0,id==='back'?-depth/2+.06:id==='front'?depth/2-.06:0);mesh.userData.wall=id;scene.add(mesh);walls.push(mesh);
 }
 if(room.builtins!==false){const cabinet=new T.Group();box(cabinet,0,.27,-1.4,4.45,.44,.65,trim);box(cabinet,0,.515,-1.4,4.6,.05,.78,wood);for(const x of [-1.65,-.55,.55,1.65]){box(cabinet,x,.29,-1.056,.98,.30,.025,wood);box(cabinet,x+.3,.32,-1.02,.12,.018,.04,gold)}scene.add(batchCraft(cabinet))}
 if(room.rug!=='none'){
  const cloud=new T.Shape();cloud.moveTo(-1.3,-.45);cloud.bezierCurveTo(-1.8,-.1,-1.4,.55,-.85,.55);cloud.bezierCurveTo(-.7,1.05,.05,1.1,.3,.72);cloud.bezierCurveTo(.95,1.05,1.7,.4,1.25,0);cloud.bezierCurveTo(1.7,-.65,.7,-1,.1,-.65);cloud.bezierCurveTo(-.4,-1.05,-1.05,-.9,-1.3,-.45);
  const rug=new T.Mesh(room.rug==='cloud'?new T.ShapeGeometry(cloud,32):new T.CircleGeometry(1.3,64),new T.MeshStandardMaterial({color:room.style==='observatory'?'#8998ac':room.style==='garden'?'#c3c7a3':'#d4b9a0',roughness:1,bumpMap:surfaceTexture('weave'),bumpScale:.012}));rug.rotation.x=-Math.PI/2;rug.position.set(.15,.063,.45);rug.scale.y=.68;rug.receiveShadow=true;scene.add(rug)}
 scene.environmentIntensity=room.lighting==='night'?.32:.8;
 scene.background=new T.Color(room.lighting==='night'?'#303a4d':room.lighting==='sunset'?'#e9d9cb':'#e6e9e1');scene.traverse(o=>{if(o.isDirectionalLight){o.color.set(room.lighting==='sunset'?'#ffc88e':room.lighting==='night'?'#c9d7ff':'#fff4df');o.intensity=room.lighting==='night'?.7:room.lighting==='sunset'?1.7:2.2}if(o.isHemisphereLight)o.intensity=room.lighting==='night'?.8:1.25});
 const glow=new T.PointLight(room.lighting==='night'?'#ffe0a5':'#fff1d2',room.lighting==='night'?8:1,8,2);glow.position.set(0,2.55,0);scene.add(glow);
 return {walls,width,depth};
}
