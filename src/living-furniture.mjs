import {surfaceTexture} from './model-craft.mjs';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const IDS=['sofa','armchair','coffee','bookcase','writing','ottoman','books','vase','daybed','glasscase','modular','console','piano','record','clock','cushion'];
export function livingFurniture(kind,variant='classic'){
 const key=kind.replace('furniture-','');if(!IDS.includes(key))return null;
 const g=new T.Group(),cache=new Map(),palette=variant==='frost'?['#a5bec7','#466779','#bdc7c1']:variant==='berry'?['#c49bab','#6c617a','#e6c5ae']:['#d1bb97','#385760','#c48e66'];
 const mat=(color,roughness=.7,metalness=0)=>{const id=color+roughness+metalness;if(!cache.has(id))cache.set(id,new T.MeshStandardMaterial({color,roughness,metalness}));return cache.get(id)};
 const wood=mat('#a47b56'),light=mat('#e6d4b6'),fabric=mat(palette[0],.96),ink=mat(palette[1]),accent=mat(palette[2]),brass=mat('#bba16a',.32,.65),paper=mat('#f1e9d5'),dark=mat('#28353b');
 fabric.bumpMap=surfaceTexture('weave');fabric.bumpScale=.007;wood.bumpMap=surfaceTexture('grain');wood.bumpScale=.008;
 const mesh=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
 const box=(x,y,z,w,h,d,m,r=.025)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),m,x,y,z);
 const cyl=(x,y,z,r,h,m)=>mesh(new T.CylinderGeometry(r,r,h,24),m,x,y,z);
 const ball=(x,y,z,r,m)=>mesh(new T.SphereGeometry(r,20,12),m,x,y,z);
 const legs=(w,d,h)=>{for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(x,h/2,z,.055,h,.055,wood,.015)};
 const seam=(x,y,z,w)=>box(x,y,z,w,.008,.009,paper,.002);
 const books=(x,y,z,n)=>{for(let i=0;i<n;i++){const h=.19+(i%3)*.03;box(x+i*.058,y+h/2,z,.048,h,.14,[ink,accent,fabric][i%3],.004);seam(x+i*.058,y+.04,z+.073,.033);seam(x+i*.058,y+.12,z+.073,.033)}};
 if(key==='sofa'||key==='armchair'||key==='daybed'){
  const w=key==='armchair'?.76:key==='daybed'?1.75:1.65,d=key==='daybed'?.86:.8;legs(w-.18,d-.18,.18);box(0,.26,0,w,.2,d,ink,.065);const seats=key==='armchair'?1:2;for(let i=0;i<seats;i++){const x=(i-(seats-1)/2)*(w-.2)/seats;box(x,.39,.04,(w-.23)/seats,.12,d-.2,fabric,.052);seam(x,.408,d/2-.09,(w-.28)/seats)}box(0,.65,-d/2+.08,w-.12,key==='daybed'?.26:.48,.17,fabric,.06);for(const x of [-w/2+.07,w/2-.07])box(x,.5,0,.14,.43,d,ink,.05);if(key!=='armchair'){const pillow=box(-w*.24,.59,-.17,.32,.3,.13,accent,.045);pillow.rotation.z=.14;box(w*.22,.54,.11,.34,.04,.32,paper,.015)}
 }else if(key==='coffee'){legs(.72,.35,.38);const top=cyl(0,.4,0,.5,.06,wood);top.scale.z=.6;const rim=cyl(0,.431,0,.48,.008,light);rim.scale.z=.6;}
 else if(key==='writing'){legs(1.12,.44,.75);box(0,.77,0,1.3,.06,.62,wood);box(.33,.62,0,.48,.22,.53,light);for(const y of [.565,.67]){box(.33,y,.275,.43,.009,.012,wood,.002);box(.33,y+.035,.283,.13,.015,.025,brass,.006)}}
 else if(key==='ottoman'){cyl(0,.11,0,.2,.2,wood);cyl(0,.265,0,.25,.19,fabric);const ring=mesh(new T.TorusGeometry(.246,.006,5,40),paper,0,.32,0);ring.rotation.x=Math.PI/2;}
 else if(['bookcase','glasscase','modular'].includes(key)){
  const w=key==='modular'?1.3:key==='glasscase'?1:.95,h=key==='bookcase'?1.65:key==='glasscase'?1.5:1.2,d=key==='glasscase'?.42:.35;box(0,h/2,-d/2+.025,w,h,.05,key==='bookcase'?light:ink);for(const x of [-w/2+.03,w/2-.03])box(x,h/2,0,.06,h,d,wood);for(let i=0;i<4;i++)box(0,.06+i*(h-.08)/3,0,w,.04,d,wood);if(key==='modular')for(const x of [-.22,.22])box(x,h/2,0,.035,h,d,ink);if(key==='bookcase'){books(-.34,.085,0,6);books(-.25,.61,0,4);for(let i=0;i<9;i++)box(-.37+i*.09,1.31,.185,.018,.38,.012,light,.004)}if(key==='glasscase'){const glass=new T.MeshPhysicalMaterial({color:'#d5ede7',transparent:true,opacity:.10,roughness:.08,depthWrite:false});box(0,.75,.21,.86,1.35,.014,glass,.002);for(const x of [-.46,.46])box(x,.75,.22,.015,1.38,.018,brass,.004);box(.35,.78,.235,.018,.12,.028,brass,.008)}}
 else if(key==='console'){legs(1.2,.26,.12);box(0,.38,0,1.4,.5,.42,ink);box(0,.63,0,1.44,.04,.45,wood);for(const x of [-.46,0,.46]){box(x,.39,.224,.42,.39,.025,wood,.01);for(let i=0;i<6;i++)box(x-.16+i*.064,.39,.242,.013,.33,.012,light,.003);cyl(x,.42,.26,.018,.025,brass).rotation.x=Math.PI/2}}
 else if(key==='books'){books(-.13,0,0,5);for(const x of [-.19,.19])box(x,.13,0,.025,.26,.18,brass,.004)}
 else if(key==='vase'){const vase=ball(0,.14,0,.13,paper);vase.scale.y=1.2;cyl(0,.3,0,.052,.13,paper);for(let i=0;i<4;i++){const x=(i-1.5)*.04;box(x,.38,0,.008,.2,.008,wood,.002);const leaf=ball(x+.035,.44-i*.03,0,.055,ink);leaf.scale.set(1,.45,.3);leaf.rotation.z=i*.6}}
 else if(key==='piano'){box(0,.08,0,.85,.16,.3,dark);for(let i=0;i<14;i++){box(-.37+i*.057,.165,.055,.052,.022,.18,paper,.003);if(i%7!==2&&i%7!==6)box(-.342+i*.057,.185,.008,.027,.02,.11,dark,.002)}for(const x of [-.32,-.26])cyl(x,.17,-.09,.025,.012,brass)}
 else if(key==='record'){box(0,.075,0,.42,.15,.32,wood);box(0,.151,0,.39,.008,.29,ink);cyl(-.045,.16,0,.12,.008,dark);for(const r of [.045,.08,.10]){const ring=mesh(new T.TorusGeometry(r,.002,4,32),brass,-.045,.166,0);ring.rotation.x=Math.PI/2}cyl(-.045,.171,0,.028,.004,accent);const arm=box(.125,.18,.015,.012,.016,.18,brass,.005);arm.rotation.y=-.4;}
 else if(key==='clock'){const o=cyl(0,0,0,.22,.05,wood);o.rotation.x=Math.PI/2;const face=cyl(0,0,.03,.2,.012,paper);face.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;box(Math.sin(a)*.175,Math.cos(a)*.175,.042,.014,.025,.008,brass,.003)}const hand=box(.03,.035,.054,.018,.15,.01,ink,.004);hand.rotation.z=-.5;box(-.035,0,.064,.10,.012,.01,ink,.003)}
 else if(key==='cushion'){box(0,.13,0,.35,.25,.16,fabric,.075);for(const x of [-.12,.12])box(x,.13,.078,.006,.14,.006,paper,.002);const badge=ball(0,.13,.085,.04,brass);badge.scale.z=.1;}
 return g;
}
