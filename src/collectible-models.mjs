import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function collectibleModel(kind){
 const g=new T.Group();const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.48,metalness:.12});
 const steel=mat('#91afb8'),dark=mat('#263e50'),white=mat('#eff1dd'),gold=mat('#d7b25c'),blue=mat('#456eac');
 const mesh=(geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o};
 const ball=(x,y,z,a,b,c,m)=>{const o=mesh(new T.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(a,b,c);return o};
 const box=(x,y,z,w,h,d,m)=>mesh(new RoundedBoxGeometry(w,h,d,2,.025),m,x,y,z);
 const cyl=(x,y,z,rt,rb,h,m,n=24)=>mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);
 const tube=(points,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),m);
 if(kind==='robot'){
  box(0,.48,0,.5,.48,.30,steel);box(0,.92,0,.61,.38,.34,steel);box(0,.93,.183,.48,.22,.025,dark);
  for(const s of [-1,1]){ball(s*.14,.95,.208,.045,.055,.018,white);box(s*.35,.47,0,.12,.36,.15,gold);box(s*.15,.14,.05,.19,.20,.29,dark)}
  cyl(0,1.2,0,.016,.016,.2,dark);ball(0,1.31,0,.055,.055,.055,gold);box(0,.52,.162,.28,.18,.03,dark);for(let i=0;i<3;i++)ball(-.085+i*.085,.52,.185,.021,.021,.012,gold);
 }else if(kind==='rocket'){
  const red=mat('#c7654d');cyl(0,.60,0,.18,.18,.72,white);mesh(new T.ConeGeometry(.18,.35,32),red,0,1.13,0);cyl(0,.24,0,.15,.20,.14,dark);
  const win=cyl(0,.78,.18,.085,.085,.03,blue);win.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,fin=mesh(new T.ConeGeometry(.15,.40,3),red,Math.cos(a)*.2,.35,Math.sin(a)*.2);fin.rotation.y=-a}
  cyl(0,.61,0,.184,.184,.08,red);
 }else if(kind==='satellite'){
  box(0,.62,0,.30,.36,.28,gold);for(const s of [-1,1]){box(s*.47,.62,0,.55,.34,.045,dark);for(let x=0;x<4;x++)for(let y=0;y<2;y++)box(s*(.25+x*.14),.53+y*.18,.032,.12,.14,.014,blue)}
  cyl(0,.9,0,.018,.018,.24,steel);const dish=ball(0,1.06,0,.23,.065,.23,white);dish.rotation.x=.35;ball(0,1.13,.02,.03,.06,.03,gold);
 }else if(kind==='whale'){
  const skin=mat('#648aa5');ball(0,.45,0,.56,.29,.29,skin);ball(.0,.32,.13,.44,.13,.19,white);
  for(const s of [-1,1]){const fin=ball(-.04,.30,s*.34,.24,.055,.13,skin);fin.rotation.y=s*.4;ball(.36,.48,s*.253,.027,.03,.025,dark)}
  ball(-.55,.51,0,.20,.13,.12,skin);for(const s of [-1,1]){const tail=ball(-.72,.57,s*.12,.10,.055,.20,skin);tail.rotation.z=-.25}
  tube([[.39,.35,.23],[.48,.38,.18],[.52,.4,0],[.48,.38,-.18]],.012,dark);
 }else if(kind==='octopus'){
  const coral=mat('#c58a9a');ball(0,.65,0,.32,.37,.29,coral);for(let i=0;i<8;i++){const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);tube([[c*.17,.39,s*.17],[c*.36,.16,s*.36],[c*.52,.16,s*.52],[c*.57,.25,s*.57]],.065,coral);ball(c*.42,.11,s*.42,.045,.024,.045,white)}
  for(const s of [-1,1]){ball(s*.12,.67,.27,.045,.06,.018,white);ball(s*.12,.67,.291,.025,.035,.012,dark)}
 }else if(kind==='turtle'){
  const green=mat('#78a287'),shell=mat('#456f60');ball(0,.35,0,.4,.24,.35,shell);ball(0,.26,0,.42,.07,.36,gold);ball(0,.34,.43,.15,.12,.18,green);
  for(const x of [-1,1])for(const z of [-1,1]){const fin=ball(x*.35,.21,z*.25,.22,.055,.11,green);fin.rotation.y=x*z*.6}
  for(const x of [-1,1])ball(x*.10,.39,.55,.022,.025,.018,dark);
  for(const x of [-.16,0,.16]){const ring=mesh(new T.TorusGeometry(.11,.012,6,6),gold,x,.56-Math.abs(x)*.3,0);ring.rotation.x=Math.PI/2}
 }else if(kind==='crystal'){
  cyl(0,.08,0,.46,.49,.15,dark,8);for(let i=0;i<7;i++){const a=i*2.4,x=i?Math.cos(a)*.27:0,z=i?Math.sin(a)*.27:0,h=i?.32+(i%3)*.13:.85,m=mat(i%2?'#b7a9d8':'#8676b9');cyl(x,.15+h/2,z,.105,.13,h,m,6);mesh(new T.ConeGeometry(.105,.2,6),m,x,.15+h+.1,z)}
 }else if(kind==='ammonite'){
  const stone=mat('#c3a37d');box(0,.07,0,.85,.14,.38,dark);cyl(-.16,.20,0,.02,.02,.2,gold);cyl(.17,.20,0,.02,.02,.2,gold);const points=[];for(let i=0;i<=150;i++){const a=i/150*Math.PI*5,r=.025+i/150*.40;points.push([Math.cos(a)*r,.57+Math.sin(a)*r,0])}tube(points,.065,stone);for(let i=20;i<=150;i+=5){const p=points[i];ball(p[0],p[1],.045,.047,.04,.033,gold)}
 }else if(kind==='volcano'){
  const rock=mat('#806c62'),lava=mat('#df7752');cyl(0,.04,0,.54,.56,.08,mat('#81907b'));cyl(0,.39,0,.16,.5,.68,rock,12);cyl(0,.735,0,.155,.155,.025,dark);cyl(0,.75,0,.09,.09,.01,lava);
  tube([[.11,.73,.10],[.18,.59,.18],[.27,.39,.25],[.36,.22,.30],[.46,.11,.29]],.025,lava);for(let i=0;i<6;i++)ball(Math.cos(i)*.42,.1,Math.sin(i)*.42,.09,.055,.08,rock);
 }else throw new Error('Unknown collectible model');
 return g;
}
