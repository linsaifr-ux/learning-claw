import {batchCraft} from './model-craft.mjs';
import * as T from 'three';
export function decorationModel(kind,variant='classic'){
 const g=new T.Group(),cache=new Map(),palettes={frost:{'#b65040':'#739cb9','#3b7254':'#497f83','#e3b963':'#c3d5df','#d68843':'#92b3c6'},berry:{'#b65040':'#bf7e9c','#3b7254':'#82749d','#e3b963':'#ebccad','#d68843':'#dca7aa'}},mat=c=>{const color=palettes[variant]?.[c]||c;if(!cache.has(color))cache.set(color,new T.MeshStandardMaterial({color,roughness:color===palettes[variant]?.['#e3b963']||c==='#e3b963'?.35:.65,metalness:c==='#e3b963'?.4:0}));return cache.get(color)},gold=mat('#e3b963'),red=mat('#b65040'),green=mat('#3b7254'),wood=mat('#976a46');
 const mesh=(geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
 const ball=(x,y,z,r,m)=>mesh(new T.SphereGeometry(r,16,10),m,x,y,z);
 const box=(x,y,z,w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(x,y,z,r,h,m)=>mesh(new T.CylinderGeometry(r,r,h,20),m,x,y,z);
 const cream=mat('#f2ead4'),dark=mat('#29333d');
 const ring=(r,t,m,x=0,y=0,z=0)=>mesh(new T.TorusGeometry(r,t,6,24),m,x,y,z);
 const ringHorizontal=(r,t,m,x,y,z)=>{const o=ring(r,t,m,x,y,z);o.rotation.x=Math.PI/2;return o};
 const tube=(points,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,5,false),m);
 const shape=(s,m,depth=.025)=>mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:12}),m);
 const star=(x,y,z,r,m)=>{const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;i?s.lineTo(Math.cos(a)*d,Math.sin(a)*d):s.moveTo(Math.cos(a)*d,Math.sin(a)*d)}s.closePath();const o=shape(s,m,.014);o.position.set(x,y,z);return o};
 const ribbon=(x,y,z,scale)=>{for(const side of [-1,1]){const wing=ball(x+side*.10*scale,y+.025*scale,z,.10,red);wing.scale.set(scale,scale*.62,scale*.32);wing.rotation.z=side*.25;const tail=box(x+side*.06*scale,y-.13*scale,z,.062*scale,.23*scale,.018,red);tail.rotation.z=side*.23}ball(x,y,z+.025,.034*scale,gold)};
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
 else if(kind==='bells'){
  for(const side of [-1,1]){const o=mesh(new T.LatheGeometry([new T.Vector2(.17,0),new T.Vector2(.18,.025),new T.Vector2(.135,.06),new T.Vector2(.11,.18),new T.Vector2(.045,.26),new T.Vector2(.01,.27)],24),gold,side*.14,-.17,0);o.rotation.z=side*.24;ball(side*.16,-.17,0,.035,wood);const r=ring(.175,.01,gold,side*.16,-.16,0);r.rotation.x=Math.PI/2}ribbon(0,.14,.05,.6);
 }
 else if(kind==='wreath'){
  ring(.30,.07,green);for(let i=0;i<18;i++){const a=i*Math.PI/9,o=ball(Math.cos(a)*.30,Math.sin(a)*.30,.035,.08,green);o.scale.set(.55,1.35,.35);o.rotation.z=a-.5;if(i%3===0)ball(Math.cos(a)*.27,Math.sin(a)*.27,.09,.027,red)}ribbon(0,-.26,.13,.65);
 }
 else if(kind==='ribbon')ribbon(0,0,0,1.5);
 else if(kind==='stocking'){
  const s=new T.Shape();s.moveTo(-.12,.34);s.lineTo(.12,.34);s.lineTo(.12,-.04);s.bezierCurveTo(.43,-.06,.39,-.26,.17,-.27);s.lineTo(-.10,-.27);s.quadraticCurveTo(-.16,-.23,-.14,-.12);s.closePath();shape(s,red,.05);box(0,.32,.035,.30,.13,.075,cream);for(let i=0;i<7;i++)ball(-.12+i*.04,.31,.08,.026,cream);star(0,.01,.067,.074,gold);
 }
 else if(kind==='snowflake'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,point=(r,t=a)=>[Math.sin(t)*r,Math.cos(t)*r,.015];tube([[0,0,.015],point(.34)],.012,cream);for(const side of [-1,1]){const p=point(.21);tube([p,[p[0]+Math.sin(a+side*.9)*.10,p[1]+Math.cos(a+side*.9)*.10,.015]],.009,cream)}}ball(0,0,.02,.033,gold);
 }
 else if(kind==='candy-cane'){
  const pts=[[0,.04,0],[0,.45,0],[0,.73,0],[.04,.84,0],[.15,.88,0],[.25,.82,0],[.26,.73,0]];tube(pts,.047,cream);for(let i=0;i<7;i++){const r=ring(.048,.011,red,0,.10+i*.085,0);r.rotation.x=Math.PI/2}const hook=ring(.048,.011,red,.23,.79,0);hook.rotation.y=.6;box(.06,.02,0,.32,.04,.18,gold);
 }
 else if(kind==='rabbit-lamp'){
  const glow=mat('#f3e8c5');const body=ball(0,.25,0,.20,glow);body.scale.set(1,1.1,.85);ball(0,.52,.025,.18,cream);for(const s of [-1,1]){const ear=ball(s*.085,.76,0,.073,cream);ear.scale.set(.75,2.2,.65);const inner=ball(s*.085,.78,.045,.041,red);inner.scale.set(.6,2.4,.4);ball(s*.066,.55,.18,.017,dark);ball(s*.11,.09,.05,.075,cream)}ball(0,.51,.204,.017,red);cyl(0,.035,0,.23,.07,gold);
 }
 else if(kind==='mooncake'){
  cyl(0,.025,0,.34,.05,cream);ringHorizontal(.30,.012,gold,0,.057,0);const pastry=mat('#c99650');cyl(0,.13,0,.23,.15,pastry);for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(Math.cos(a)*.20,.15,Math.sin(a)*.20,.05,pastry)}ringHorizontal(.14,.009,gold,0,.212,0);for(let i=0;i<6;i++){const a=i*Math.PI/3,petal=ball(Math.cos(a)*.065,.21,Math.sin(a)*.065,.042,gold);petal.scale.y=.16}ball(0,.215,0,.026,gold);
 }
 else if(kind==='round-lantern'){
  cyl(0,.055,0,.21,.11,wood);ball(0,.33,0,.24,cream);for(let i=0;i<8;i++){const r=ring(.24,.004,gold,0,.33,0);r.rotation.y=i*Math.PI/8}const loop=ring(.10,.012,wood,0,.60,0);box(0,.34,.245,.12,.12,.008,gold);const ear=ball(-.025,.44,.239,.02,gold);ear.scale.y=2.2;
 }
 else if(kind==='osmanthus'||kind==='blossom'){
  const isPlum=kind==='blossom',pot=mat(isPlum?'#a34e49':'#91aaa1');mesh(new T.CylinderGeometry(.16,.12,.22,20),pot,0,.11);cyl(0,.225,0,.145,.012,wood);tube([[0,.22,0],[.03,.46,0],[-.02,.71,.02],[.09,.90,0]],.015,wood);
  for(let i=0;i<6;i++){const a=i*2.4,y=.43+i*.075,x=Math.sin(a)*.20,z=Math.cos(a)*.12;tube([[0,y-.08,0],[x,y,z]],.008,wood);const petal=mat(isPlum?'#e4afbb':'#edce73');for(let j=0;j<5;j++){const t=j*Math.PI*2/5,o=ball(x+Math.cos(t)*.034,y+Math.sin(t)*.034,z,.032,petal);o.scale.z=.5}ball(x,y,z+.019,.014,gold);const leaf=ball(x*.7,y-.05,z,.045,green);leaf.scale.set(1.5,.4,.6)}
 }
 else if(kind==='cloud'){
  for(const [x,y,r]of [[-.25,0,.13],[-.10,.065,.19],[.10,.035,.15],[.25,-.005,.10]]){const p=ball(x,y,0,r,cream);p.scale.z=.20}tube([[-.31,-.07,.04],[-.12,-.07,.06],[.05,-.07,.06],[.3,-.07,.025]],.011,gold);
 }
 else if(kind==='tea-set'){
  box(0,.025,0,.67,.05,.43,wood);const clay=mat('#7d9b91');const teapot=ball(-.10,.18,0,.135,clay);teapot.scale.y=.8;cyl(-.10,.29,0,.09,.035,clay);ball(-.10,.32,0,.02,gold);tube([[-.01,.18,0],[.10,.20,0],[.14,.28,0]],.032,clay);ring(.09,.018,clay,-.24,.19,0);for(const z of [-.105,.105]){mesh(new T.CylinderGeometry(.055,.04,.075,16),clay,.23,.09,z);cyl(.23,.132,z,.047,.007,wood)}
 }
 else if(kind==='ghost'){
  const body=mesh(new T.LatheGeometry([new T.Vector2(.23,.04),new T.Vector2(.20,.10),new T.Vector2(.16,.25),new T.Vector2(.14,.44),new T.Vector2(.08,.53),new T.Vector2(0,.55)],24),cream);for(const s of [-1,1]){ball(s*.06,.38,.137,.025,dark);const arm=ball(s*.19,.28,0,.065,cream);arm.scale.set(1.3,.7,.8)}ball(0,.30,.16,.025,red);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ball(Math.cos(a)*.17,.055,Math.sin(a)*.17,.063,cream)}
 }
 else if(kind==='witch-hat'){
  const purple=mat('#655175');cyl(0,.035,0,.34,.07,purple);mesh(new T.ConeGeometry(.22,.65,24),purple,0,.39);cyl(0,.15,0,.19,.065,red);box(0,.15,.195,.09,.065,.015,gold);star(.035,.32,.14,.055,gold);
 }
 else if(kind==='cauldron'){
  const iron=mat('#414956'),brew=mat('#9abb8a');const pot=ball(0,.26,0,.25,iron);pot.scale.y=.85;ringHorizontal(.22,.03,iron,0,.40,0);cyl(0,.403,0,.195,.012,brew);for(const s of [-1,1])ring(.07,.018,gold,s*.27,.29,0);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;cyl(Math.sin(a)*.14,.075,Math.cos(a)*.14,.032,.15,iron);ball(-.09+i*.085,.48+i*.09,0,.038-i*.006,brew)}
 }
 else if(kind==='web'){
  const silk=mat('#c6cedb');for(let i=0;i<8;i++){const a=i*Math.PI/4;tube([[0,0,0],[Math.cos(a)*.38,Math.sin(a)*.38,0]],.005,silk)}for(let r=.12;r<.39;r+=.12){const points=[];for(let i=0;i<=8;i++){const a=i*Math.PI/4;points.push([Math.cos(a)*r,Math.sin(a)*r,.005])}tube(points,.005,silk)}star(0,0,.02,.055,gold);
 }
 else if(kind==='potion'){
  const glass=mat('#829bab'),liquid=mat('#9e87b5');ball(0,.21,0,.19,glass);ball(0,.16,.015,.165,liquid);cyl(0,.40,0,.073,.20,glass);cyl(0,.515,0,.07,.07,wood);box(0,.22,.184,.15,.13,.012,cream);star(0,.22,.2,.043,gold);for(let i=0;i<3;i++)ball(-.07+i*.05,.17+i*.04,.17,.014,cream);
 }
 else if(kind==='fence'){
  for(let i=0;i<5;i++){const x=-.32+i*.16;box(x,.23,0,.085,.42,.07,wood);mesh(new T.ConeGeometry(.061,.11,4),wood,x,.49).rotation.y=Math.PI/4}for(const y of [.13,.33])box(0,y,-.055,.78,.055,.06,red);
 }
 else if(kind==='knot'){
  const frame=ring(.18,.025,red);frame.scale.set(1,1.3,.4);frame.rotation.z=Math.PI/4;const frame2=ring(.18,.025,red);frame2.scale.set(1,1.3,.4);frame2.rotation.z=-Math.PI/4;box(0,0,.035,.11,.11,.03,gold);tube([[0,-.17,0],[0,-.32,0]],.016,red);for(let i=0;i<5;i++)tube([[(i-2)*.018,-.28,0],[(i-2)*.022,-.43,0]],.007,red);ring(.065,.012,gold,0,.28,0);
 }
 else if(kind==='ingot'){
  const base=ball(0,.16,0,.25,gold);base.scale.set(1.3,.45,.8);const dome=ball(0,.23,0,.14,gold);dome.scale.y=.7;for(const s of [-1,1]){const end=ball(s*.26,.22,0,.10,gold);end.scale.set(.5,1,.95);end.rotation.z=s*-.4}box(0,.035,0,.55,.05,.34,red);
 }
 else if(kind==='fan'){
  const paper=new T.Shape();paper.moveTo(0,-.2);for(let i=0;i<=24;i++){const a=Math.PI*.1+i/24*Math.PI*.8;paper.lineTo(Math.cos(a)*.43,-.2+Math.sin(a)*.43)}paper.closePath();shape(paper,red,.025);for(let i=0;i<=8;i++){const a=Math.PI*.1+i/8*Math.PI*.8;tube([[0,-.20,.03],[Math.cos(a)*.43,-.2+Math.sin(a)*.43,.03]],.006,gold)}ball(0,-.20,.035,.018,wood);
 }
 else if(kind==='firecracker'){
  tube([[0,.45,0],[0,-.40,0]],.012,gold);for(let i=0;i<8;i++){const s=i%2?1:-1,c=cyl(s*.07,.30-i*.085,0,.04,.12,red);c.rotation.z=s*.4;for(const y of [-.045,.045]){const rim=cyl(s*.07,.30-i*.085+y,0,.042,.018,gold);rim.rotation.z=s*.4}}ribbon(0,.4,.05,.45);
 }
 else if(kind==='lion'){
  const fur=mat('#e8c994');box(0,.15,0,.37,.25,.31,red);const head=ball(0,.38,.04,.25,red);head.scale.set(1.12,.85,.9);for(const s of [-1,1]){ball(s*.15,.45,.21,.10,cream);ball(s*.15,.45,.285,.046,dark);ball(s*.16,.47,.322,.014,cream);ring(.105,.012,gold,s*.15,.45,.26);ball(s*.25,.42,0,.074,gold);ball(s*.14,.035,.08,.08,gold)}ball(0,.33,.28,.047,gold);box(0,.26,.24,.20,.065,.045,cream);for(let i=0;i<6;i++){const tuft=ball(-.125+i*.05,.19,.23,.028,fur);tuft.scale.y=1.7}star(0,.56,.17,.062,gold);
 }
 else throw new Error('Unknown decoration model: '+kind);
 g.userData.variant=variant;return batchCraft(g);
}
