import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchCraft,surfaceTexture} from './model-craft.mjs';
const material=(color,roughness=.45,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
export function craftedCollectible(kind){
 const root=new T.Group();root.name=kind+'-crafted-v1';root.userData.artRevision=1;
 const mesh=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);return o};
 const ball=(x,y,z,a,b,c,m)=>{const o=mesh(new T.SphereGeometry(1,20,12),m,x,y,z);o.scale.set(a,b,c);return o};
 const box=(x,y,z,w,h,d,m,r=.02)=>mesh(new RoundedBoxGeometry(w,h,d,1,r),m,x,y,z);
 const cyl=(x,y,z,r,h,m,n=20)=>mesh(new T.CylinderGeometry(r,r,h,n),m,x,y,z);
 const line=(pts,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),16,r,5,false),m);
 if(kind==='robot'){
  const enamel=material('#7fabb3',.34,.45),edge=material('#c0d0cf',.28,.78),dark=material('#263943',.56,.4),brass=material('#c7a466',.32,.75),rubber=material('#263139',.9),ivory=material('#edf0db',.52);
  enamel.bumpMap=surfaceTexture('grain');enamel.bumpScale=.0015;
  const glass=new T.MeshPhysicalMaterial({color:'#132b36',roughness:.18,metalness:.28,clearcoat:1,clearcoatRoughness:.12});
  const light=material('#bde9df',.27);light.emissive.set('#69a99f');light.emissiveIntensity=.6;
  box(0,.52,0,.5,.43,.32,enamel,.055);box(0,.53,.164,.40,.32,.018,dark);box(0,.54,.180,.36,.28,.021,enamel);
  cyl(0,.79,0,.095,.13,dark);cyl(0,.82,0,.113,.025,brass);
  box(0,1.015,0,.61,.37,.36,enamel,.055);box(0,1.015,.176,.53,.29,.03,edge,.025);box(0,1.02,.196,.47,.235,.025,dark);box(0,1.025,.213,.435,.205,.018,glass);
  for(const s of [-1,1]){
   box(s*.115,1.04,.229,.066,.046,.008,light,.012);box(s*.12,.975,.231,.031,.009,.004,brass,.003);
   const hinge=cyl(s*.326,1.0,0,.088,.04,brass);hinge.rotation.z=Math.PI/2;
   const screw=cyl(s*.351,1,0,.029,.012,dark);screw.rotation.z=Math.PI/2;
   ball(s*.3,.64,0,.086,.087,.087,dark);box(s*.37,.54,0,.115,.23,.17,brass,.035);ball(s*.38,.39,0,.064,.064,.064,edge);box(s*.38,.3,.025,.135,.12,.15,enamel,.026);
   box(s*.38,.28,.105,.024,.045,.012,dark,.005);
   cyl(s*.15,.285,0,.06,.13,edge);box(s*.15,.135,.052,.205,.18,.31,enamel,.035);box(s*.15,.04,.057,.215,.045,.32,rubber,.013);box(s*.15,.16,.212,.147,.06,.015,brass,.006);
   for(let i=0;i<4;i++)box(s*.15,.055,-.045+i*.064,.224,.012,.018,dark,.004);
  }
  const dial=cyl(0,.55,.205,.077,.028,brass,32);dial.rotation.x=Math.PI/2;
  const core=cyl(0,.55,.224,.052,.012,glass,32);core.rotation.x=Math.PI/2;box(0,.559,.233,.008,.06,.007,light,.003);
  for(const x of [-.14,.14])for(const y of [.44,.65]){const screw=cyl(x,y,.202,.012,.008,edge,12);screw.rotation.x=Math.PI/2;box(x,y,.208,.013,.003,.003,dark,.001)}
  for(let i=0;i<4;i++)box(-.09+i*.06,.405,.19,.034,.014,.012,dark,.004);
  // Back service hatch, vents and an engraved serial plate remain visible when rotated.
  box(0,.53,-.171,.34,.29,.016,dark);box(0,.54,-.183,.30,.24,.014,edge);for(let i=0;i<5;i++)box(0,.48+i*.03,-.195,.20,.013,.012,dark,.004);
  box(0,1.04,-.185,.32,.13,.012,dark);for(let i=0;i<6;i++)box(-.12+i*.048,1.04,-.194,.022,.08,.009,enamel,.004);
  cyl(-.18,1.265,0,.013,.18,edge);cyl(-.18,1.205,0,.03,.035,brass);ball(-.18,1.36,0,.039,.039,.039,light);
 }else if(kind==='whale'){
  const skin=material('#365d77',.55,.04),belly=material('#d9e4db',.68),ink=material('#223d4b',.6),eye=material('#102531',.16),highlight=material('#f5f5e7',.26);
  skin.bumpMap=surfaceTexture('grain');skin.bumpScale=.0015;
  // Continuous ring surface, with a tapered tail stock and broad rounded rostrum.
  const stations=[[-.79,.50,.015,.017],[-.62,.49,.06,.055],[-.43,.46,.14,.14],[-.18,.45,.24,.24],[.12,.46,.285,.285],[.40,.47,.24,.26],[.58,.47,.13,.17],[.63,.47,.008,.015]];
  const profile=new T.CatmullRomCurve3(stations.map(p=>new T.Vector3(p[0],p[2],p[3]))),positions=[],uv=[],indices=[];
  for(let i=0;i<=48;i++){const v=profile.getPoint(i/48);for(let j=0;j<=32;j++){const a=j/32*Math.PI*2;positions.push(v.x,.47+v.y*Math.cos(a),v.z*Math.sin(a));uv.push(i/48,j/32)}}
  for(let i=0;i<48;i++)for(let j=0;j<32;j++){const a=i*33+j,b=a+33;indices.push(a,a+1,b,b,a+1,b+1)}
  const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(positions,3));body.setAttribute('uv',new T.Float32BufferAttribute(uv,2));body.setIndex(indices);body.computeVertexNormals();mesh(body,skin);
  // A curved ventral panel, not a second intersecting oval body.
  const p=[],u=[],ix=[];
  for(let i=0;i<=24;i++){const t=.28+i/24*.68,v=profile.getPoint(t);for(let j=0;j<=16;j++){const a=Math.PI-.91+j/16*1.82;p.push(v.x,.47+(v.y+.002)*Math.cos(a),(v.z+.002)*Math.sin(a));u.push(i/24,j/16)}}
  for(let i=0;i<24;i++)for(let j=0;j<16;j++){const a=i*17+j,b=a+17;ix.push(a,a+1,b,b,a+1,b+1)}
  const panel=new T.BufferGeometry();panel.setAttribute('position',new T.Float32BufferAttribute(p,3));panel.setAttribute('uv',new T.Float32BufferAttribute(u,2));panel.setIndex(ix);panel.computeVertexNormals();mesh(panel,belly);
  for(let k=-4;k<=4;k++){const a=Math.PI+k*.17,pts=[];for(let i=0;i<=14;i++){const v=profile.getPoint(.43+i/14*.49);pts.push([v.x,.47+(v.y+.004)*Math.cos(a),(v.z+.004)*Math.sin(a)])}line(pts,.0028,skin)}
  const surfaceAtX=(x,a,offset=0)=>{let lo=0,hi=1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(profile.getPoint(t).x<x)lo=t;else hi=t}const v=profile.getPoint((lo+hi)/2);return [v.x,.47+(v.y+offset)*Math.cos(a),(v.z+offset)*Math.sin(a)]};
  for(const s of [-1,1]){
   // Long tapered pectoral flippers, swept back; a pair of gently lifted tail flukes.
   const fin=ball(-.16,.31,s*.36,.115,.038,.32,skin);fin.rotation.y=s*.40;fin.rotation.x=s*.16;
   for(let i=0;i<4;i++)ball(-.11-i*.028,.30,s*(.29+i*.08),.013,.012,.023,skin);
   const tail=ball(-.76,.51,s*.19,.14,.027,.235,skin);tail.rotation.y=s*-.48;tail.rotation.x=s*-.13;
   const e=surfaceAtX(.40,s*(Math.PI/2+.03),.006);ball(...e,.027,.024,.008,ink);ball(e[0]+.002,e[1]+.002,e[2]+s*.008,.014,.015,.006,eye);ball(e[0]+.006,e[1]+.008,e[2]+s*.014,.004,.005,.002,highlight);
   line([.59,.52,.43,.32,.23].map(x=>surfaceAtX(x,s*(Math.PI/2+.25),.004)),.0035,ink);
   for(let i=0;i<4;i++)ball(.29+i*.064,.58-i*.012,s*(.18-i*.015),.012,.008,.009,skin);
  }
  const finShape=new T.Shape();finShape.moveTo(-.46,.61);finShape.bezierCurveTo(-.38,.69,-.44,.75,-.33,.73);finShape.bezierCurveTo(-.29,.74,-.23,.66,-.13,.67);finShape.lineTo(-.46,.61);
  mesh(new T.ExtrudeGeometry(finShape,{depth:.025,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,steps:1,curveSegments:10}),skin,0,0,-.0125);
  for(const s of [-1,1]){const blow=ball(.28,.727,s*.018,.029,.004,.009,ink);blow.rotation.y=s*.25}
 }else throw new Error('Unknown crafted collectible');
 return batchCraft(root);
}
