import * as T from 'three';
export function decorationModel(kind){
 const g=new T.Group(),mat=c=>new T.MeshStandardMaterial({color:c,roughness:.65}),gold=mat('#e3b963'),red=mat('#b65040'),green=mat('#3b7254'),wood=mat('#976a46');
 const mesh=(geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
 const ball=(x,y,z,r,m)=>mesh(new T.SphereGeometry(r,20,14),m,x,y,z);
 const box=(x,y,z,w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(x,y,z,r,h,m)=>mesh(new T.CylinderGeometry(r,r,h,20),m,x,y,z);
 if(kind==='moon'){const s=new T.Shape();s.absarc(0,0,.35,Math.PI*.25,Math.PI*1.75,false);s.quadraticCurveTo(-.13,0,.35*Math.cos(Math.PI*.25),.35*Math.sin(Math.PI*.25));mesh(new T.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1}),gold)}
 else if(kind==='star'){const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.046:.10;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}s.closePath();mesh(new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:false}),gold)}
 else if(kind==='pumpkin'){const orange=mat('#d68843');for(let i=0;i<8;i++){const a=i*Math.PI/4;const o=ball(Math.cos(a)*.11,.23,Math.sin(a)*.11,.18,orange);o.scale.set(.9,1.2,.9)}cyl(0,.47,0,.035,.14,wood)}
 else if(kind==='tree'){cyl(0,.25,0,.075,.5,wood);for(let i=0;i<3;i++)mesh(new T.ConeGeometry(.4-i*.08,.6,24),green,0,.62+i*.3);ball(0,1.37,0,.08,gold);for(let i=0;i<7;i++){const a=i*2.4;ball(Math.sin(a)*(.25-i*.02),.62+i*.08,Math.cos(a)*(.25-i*.02),.035,i%2?gold:red)}}
 else if(kind==='gift'){box(0,.18,0,.46,.36,.40,red);box(0,.365,0,.49,.05,.43,red);box(0,.19,.206,.065,.38,.012,gold);box(0,.396,0,.065,.012,.44,gold);box(0,.396,0,.50,.012,.065,gold);for(const s of [-1,1]){const o=mesh(new T.TorusGeometry(.066,.014,8,18),gold,s*.059,.425,0);o.rotation.x=Math.PI/2}}
 else if(kind==='lantern'){const l=ball(0,0,0,.2,red);l.scale.y=1.1;cyl(0,-.30,0,.015,.28,gold);for(const y of [-.18,.18])cyl(0,y,0,.12,.035,gold)}
 else if(kind==='fortune'){const paper=box(0,0,0,.42,.42,.025,red);paper.rotation.z=Math.PI/4;
 // Original geometric seal, not a font/network dependency.
 for(const [x,y,w,h]of [[-.11,.10,.08,.025],[-.1,.015,.025,.17],[-.16,.035,.12,.025],[.07,.13,.19,.025],[.07,.06,.15,.06],[.07,-.07,.18,.13]])box(x,y,.022,w,h,.012,gold);for(const [x,y,w,h]of [[.07,.06,.10,.018],[.07,-.07,.13,.012],[.07,-.07,.012,.09]])box(x,y,.03,w,h,.006,red)}
 else if(kind==='bat'){const s=new T.Shape();s.moveTo(0,.08);s.lineTo(-.12,.2);s.lineTo(-.36,.14);s.lineTo(-.48,.3);s.lineTo(-.38,-.05);s.quadraticCurveTo(-.25,.03,-.2,-.10);s.quadraticCurveTo(-.1,-.02,0,-.15);s.quadraticCurveTo(.1,-.02,.2,-.10);s.quadraticCurveTo(.25,.03,.38,-.05);s.lineTo(.48,.3);s.lineTo(.36,.14);s.lineTo(.12,.2);s.closePath();mesh(new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:false}),mat('#594664'));for(const x of [-.045,.045])ball(x,.10,.035,.014,gold)}
 return g;
}
