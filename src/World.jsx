import {wallOpacityTarget,fadeOpacity,createWallFader} from './room-wall-fade.mjs';
import {roomShell} from './room-shell.mjs';
import {roomSize,wallPlacement,wallRotation,WALLS,WALL_NAMES,placementProblem,furnitureSize,surfaceAt} from '../functions/room-space.mjs';
import {FURNITURE} from '../functions/furniture.mjs';
import {decorationModel} from './decoration-models.mjs';
import {decorationRoom,DECORATIONS} from '../functions/room-decorations.mjs';
import {craftPolar} from './polar-craft.mjs';
import {collectibleModel} from './collectible-models.mjs';
import {applyPolarPalette} from './toy-palette.mjs';
import React,{useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {createPhysics,stepPhysics,captured,STEPS,DT} from '../functions/physics.mjs';
import {SOLIDS,LIMIT,CABINET_GROUND_Y,isCapsulePrize} from '../functions/machine.mjs';
import {FESTIVALS,MACHINES} from '../functions/domain.mjs';
const ready=RAPIER.init();
const models=new Map();
export async function toy(kind,outfit,capsule=false){
 if(isCapsulePrize(kind)){
  const equipment=kind.slice(10),part=kind.startsWith('accessory-')?new T.Group():collectibleModel(kind);if(kind.startsWith('accessory-'))dressToy(part,['scarf','bow'].includes(equipment)?{neck:equipment}:{head:equipment});
  const bounds=new T.Box3().setFromObject(part),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());part.position.sub(center);const root=new T.Group();root.add(part);const scale=(capsule?.62:.95)/Math.max(size.x,size.y,size.z);root.scale.setScalar(scale);root.updateMatrixWorld(true);
  const prize=new T.Group();prize.add(root);root.position.y=capsule?.537:.5;
  if(capsule){const glass=new T.MeshPhysicalMaterial({color:'#99cad5',transparent:true,opacity:.30,roughness:.18,depthWrite:false});sphere(prize,0,.537,0,.537,glass);const seam=new T.Mesh(new T.TorusGeometry(.537,.018,10,48),material('#d0a66d',.3,.45));seam.rotation.x=Math.PI/2;seam.position.y=.537;prize.add(seam);const arc=new T.Mesh(new T.TorusGeometry(.537,.006,6,48),new T.MeshBasicMaterial({color:'#81aeba',transparent:true,opacity:.55}));arc.position.y=.537;prize.add(arc)}return prize;
 }
 const baseKind=kind==='polar'?'bear':kind;
 if(!models.has(baseKind))models.set(baseKind,new GLTFLoader().loadAsync('/models/'+baseKind+'.glb').then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g.scene}));
 const root=(await models.get(baseKind)).clone(true);
 if(kind==='polar'){applyPolarPalette(root);craftPolar(root)}
 if(outfit)dressToy(root,outfit);return root;
}
const material=(color,roughness=.45,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function box(scene,x,y,z,w,h,d,m,round=.03){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,round),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh}
function sphere(scene,x,y,z,r,m){const mesh=new T.Mesh(new T.SphereGeometry(r,20,14),m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh}
function cylinder(scene,x,y,z,r,h,m){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,24),m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh}
function dressToy(root,{head='none',neck='none'}){
 const gold=material('#eac263',.28,.45),berry=material('#a9415c',.82),teal=material('#447d82',.85);
 if(head==='crown'){cylinder(root,0,1.42,.08,.18,.09,gold);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const peak=new T.Mesh(new T.ConeGeometry(.045,.14,4),gold);peak.position.set(Math.cos(a)*.155,1.52,.08+Math.sin(a)*.155);root.add(peak)}sphere(root,0,1.44,.263,.035,berry)}
 if(head==='beret'){const hat=sphere(root,0,1.45,.10,.26,berry);hat.scale.set(1,.28,.85);cylinder(root,.035,1.54,.1,.022,.065,berry)}
 if(head==='star'){const shape=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.07:.15;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r)}shape.closePath();const star=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.01,bevelThickness:.008,bevelSegments:2,steps:1}),gold);star.position.set(.27,1.30,.27);star.rotation.z=-.18;root.add(star)}
 if(neck!=='none')root.traverse(o=>{if(o.name.startsWith('bow_'))o.visible=false});
 if(neck==='scarf'){const wrap=new T.Mesh(new T.TorusGeometry(.255,.055,10,36),teal);wrap.rotation.x=Math.PI/2;wrap.position.set(0,.83,.015);root.add(wrap);const tail=box(root,.14,.65,.295,.12,.35,.045,teal);tail.rotation.z=-.18;box(root,.14,.51,.325,.13,.025,.018,gold)}
 if(neck==='bow'){for(const side of [-1,1]){const wing=sphere(root,side*.09,.81,.32,.11,berry);wing.scale.set(1,.68,.35)}sphere(root,0,.81,.36,.044,gold)}
}
function label(scene,text,x,y,z,w,h,bg='#294b38',fg='#ecf7ac'){
 // Match the sign's physical aspect ratio so glyphs are not stretched flat.
 const canvas=document.createElement('canvas');
 canvas.width=Math.min(w>=2?2048:1024,scene.userData.maxTextureSize||2048);
 canvas.height=Math.max(32,Math.round(canvas.width*h/w));
 const context=canvas.getContext('2d');
 context.fillStyle=bg;context.fillRect(0,0,canvas.width,canvas.height);
 const fontFamily='"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';
 let fontSize=canvas.height*.72;
 context.font=`600 ${fontSize}px ${fontFamily}`;
 const maxWidth=canvas.width*.90;
 fontSize*=Math.min(1,maxWidth/context.measureText(text).width);
 context.font=`600 ${fontSize}px ${fontFamily}`;
 const metrics=context.measureText(text);
 context.textAlign='center';context.textBaseline='alphabetic';context.fillStyle=fg;
 const baseline=(canvas.height+metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
 context.fillText(text,canvas.width/2,baseline);
 const map=new T.CanvasTexture(canvas);
 map.colorSpace=T.SRGBColorSpace;
 map.anisotropy=scene.userData.signAnisotropy||1;
 map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;
 const signMaterial=new T.MeshBasicMaterial({map,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(w,h),signMaterial);
 mesh.position.set(x,y,z);scene.add(mesh);return mesh;
}
function setup(el,room=false){const scene=new T.Scene();scene.background=new T.Color(room?'#e6ebe0':'#eee5d6');const camera=new T.PerspectiveCamera(36,1,.1,80);camera.position.set(room?6:6.8,room?5.4:4.7,room?7.5:8.2);const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));scene.userData.signAnisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());scene.userData.maxTextureSize=renderer.capabilities.maxTextureSize;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',room?'可佈置的 3D 寶物房':'3D 夾娃娃機');const pmrem=new T.PMREMGenerator(renderer);const envScene=new RoomEnvironment();const env=pmrem.fromScene(envScene,.04);scene.environment=env.texture;envScene.dispose();pmrem.dispose();const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,room?1:1.9,0);controls.enablePan=false;controls.minDistance=room?6:2;controls.maxDistance=room?20:13;controls.minPolarAngle=room?.55:.03;controls.maxPolarAngle=room?1.42:1.65;controls.minAzimuthAngle=room?-.75:-Infinity;controls.maxAzimuthAngle=room?.85:Infinity;controls.enableDamping=true;const key=new T.DirectionalLight('#fff6de',2.3);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.bias=-.0005;scene.add(key,new T.HemisphereLight('#fff9e5','#8e9d82',1.1));const floor=new T.Mesh(new T.PlaneGeometry(100,100),material(room?'#e3e8dc':'#e5dbc9',.85));floor.rotation.x=-Math.PI/2;floor.position.y=room?-.12:CABINET_GROUND_Y;floor.receiveShadow=true;scene.add(floor);let roomFit=1;const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;if(room){const nextFit=Math.max(1,1.25/camera.aspect);camera.position.sub(controls.target).multiplyScalar(nextFit/roomFit).add(controls.target);roomFit=nextFit;}camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();return{scene,camera,renderer,controls,dispose(){ro.disconnect();controls.dispose();renderer.dispose();env.dispose();const materials=new Set();scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)});materials.forEach(m=>m.dispose());scene.traverse(o=>{o.geometry?.dispose();o.shadow?.dispose();if(o.isMesh){if(o.material?.map&&o.material.map.isCanvasTexture)o.material.map.dispose()}});el.replaceChildren()}}}
function cabinet(scene,machineId){
 const skin=MACHINES.find(m=>m.id===machineId)||MACHINES[0];
 const white=material('#f0eee0',.28),green=material(skin.color,.32),metal=material('#bdc9c5',.23,.85),dark=material('#23332c'),gold=material('#e4b75d',.27,.65);
 const glass=new T.MeshPhysicalMaterial({color:'#dbe8e5',transparent:true,opacity:.055,roughness:.03,depthWrite:false,side:T.DoubleSide});
 const canopy=[];for(const [type,x,y,z,w,h,d] of SOLIDS){const m=box(scene,x,y,z,w,h,d,type==='glass'?glass:type==='rim'?gold:type==='chute'||type==='tray'?dark:white,0);if(type==='roof')canopy.push(m)};
 // Panels leave the entire front collection opening unobstructed.
 box(scene,-.79,-.52,0,2.04,.92,3.1,green);box(scene,1.79,-.52,0,.28,.92,3.1,green);
 canopy.push(box(scene,0,4.12,-.35,3.86,.46,2.5,green,.08),label(scene,skin.name,0,4.12,.91,2.9,.34,skin.color,skin.accent));
 for(const x of [-1.89,1.89])for(const z of [-1.54,1.54])box(scene,x,1.85,z,.1,3.7,.1,white);
 label(scene,'PRIZE OUT ↓',.945,-.22,1.59,1.12,.18,'#243c51','#f3d58c');
 label(scene,'寶物領取口',.945,-.84,1.90,1.05,.13,'#23332c','#ecf4c8');
 for(const z of [-1.3,1.3])box(scene,0,3.6,z,3.6,.045,.075,metal);
 const bridge=box(scene,0,3.58,0,.08,.08,2.75,metal);
 box(scene,-.83,.07,1.77,1.7,.16,.50,green);
 const stick=new T.Group();stick.position.set(-1.12,.17,1.79);scene.add(stick);cylinder(stick,0,.12,0,.026,.24,metal);sphere(stick,0,.26,0,.105,dark);cylinder(scene,-1.12,.18,1.79,.12,.045,dark);cylinder(scene,-.40,.18,1.79,.12,.065,gold);
 const ring=new T.Mesh(new T.TorusGeometry(.26,.014,8,48),new T.MeshBasicMaterial({color:'#b2d663'}));ring.rotation.x=-Math.PI/2;ring.position.y=.014;scene.add(ring);return{metal,ring,stick,bridge,canopy};
}
export const ClawWorld=forwardRef(function ClawWorld({seed=12345,machineId='classic',poolId='legacy',onPhase,onFinish,onReady},ref){
 const host=useRef(null),ctx=useRef(null),callbacks=useRef({onPhase,onFinish,onReady});callbacks.current={onPhase,onFinish,onReady};const[error,setError]=useState('');
 useImperativeHandle(ref,()=>({
 move(dx,dz){const c=ctx.current;if(c&&!c.running){c.target.x=T.MathUtils.clamp(c.target.x+dx,-LIMIT.x,LIMIT.x);c.target.z=T.MathUtils.clamp(c.target.z+dz,-LIMIT.z,LIMIT.z)}},
 stick(x,z){if(ctx.current)ctx.current.input={x,z}},
 drop(){const c=ctx.current;if(!c||c.running)return null;c.prepareDrop();c.running=true;c.step=0;c.acc=0;c.input={x:0,z:0};return {...c.target}},target(){return ctx.current?.target},
 view(name){const c=ctx.current;if(!c)return;c.canopy.forEach(m=>m.visible=name!=='top');const views={lobby:[3.8,3.2,12.5],front:[0,3,10],left:[-9,3.5,1],right:[9,3.5,1],top:[0,10,.01],exit:[3,1,5],overview:[6.8,4.7,8.2]};c.base.camera.position.set(...(views[name]||views.front));c.base.controls.target.set(name==='exit'?.945:0,name==='exit'?-.35:1.8,name==='exit'?1:0);c.base.controls.update()}
 }),[]);
 useEffect(()=>{let gone=false,frame=0,base,sim,c;setError('');callbacks.current.onReady?.(false);
 async function init(){try{await ready;if(gone)return;base=setup(host.current);sim=createPhysics(RAPIER,seed,{x:0,z:0},0,poolId);const{metal,ring,stick,bridge,canopy}=cabinet(base.scene,machineId);
 const meshes=await Promise.all(sim.toys.map(async t=>{const root=new T.Group(),mesh=await toy(t.kind,undefined,true);mesh.scale.setScalar(.54);mesh.position.y=-.29;root.add(mesh);base.scene.add(root);return root}));if(gone){sim.world.free();base.dispose();return}
 const clawMeshes=sim.parts.map(p=>{const group=new T.Group();for(const link of p.links){const m=new T.Mesh(new T.CapsuleGeometry(.035,link.len,6,12),metal);m.position.copy(link.p);m.quaternion.copy(link.q);m.castShadow=true;group.add(m)}sphere(group,0,0,0,.058,metal);base.scene.add(group);return group});
 const head=cylinder(base.scene,0,3.3,0,.21,.2,metal),cable=cylinder(base.scene,0,3.5,0,.012,.3,material('#334a3d',.4,.6)),trolley=box(base.scene,0,3.62,0,.38,.16,.34,metal);
 c={base,canopy,target:{x:0,z:0},input:{x:0,z:0},running:false,step:0,acc:0,last:performance.now()};c.prepareDrop=()=>sim.prepareDrop(c.target);ctx.current=c;callbacks.current.onReady?.(true);let prevLabel='';
 function tick(time){if(gone)return;frame=requestAnimationFrame(tick);const dt=Math.min((time-c.last)/1000,.08);c.last=time;c.acc+=dt;
 if(!c.running){c.target.x=T.MathUtils.clamp(c.target.x+c.input.x*dt*.8,-LIMIT.x,LIMIT.x);c.target.z=T.MathUtils.clamp(c.target.z+c.input.z*dt*.8,-LIMIT.z,LIMIT.z)}
 while(c.acc>=DT){if(c.running){const p=stepPhysics(sim,c.step,c.target);if(p.label!==prevLabel){prevLabel=p.label;callbacks.current.onPhase?.(p.label)}c.step++;if(c.step>=STEPS){c.running=false;c.input={x:0,z:0};const exitPoint=new T.Vector3(.945,-.6,1.65).project(base.camera),rect=base.renderer.domElement.getBoundingClientRect();callbacks.current.onFinish?.(captured(sim).map(i=>sim.toys[i].kind),{...c.target},{x:T.MathUtils.clamp(rect.left+(exitPoint.x+1)*rect.width/2,0,innerWidth),y:T.MathUtils.clamp(rect.top+(1-exitPoint.y)*rect.height/2,0,innerHeight)});c.target={x:sim.head.translation().x,z:sim.head.translation().z};}}c.acc-=DT}
 sim.toys.forEach((t,i)=>{meshes[i].position.copy(t.body.translation());meshes[i].quaternion.copy(t.body.rotation())});const aimOffset=new T.Vector3(c.running?0:c.target.x-sim.head.translation().x,0,c.running?0:c.target.z-sim.head.translation().z);sim.parts.forEach((t,i)=>{clawMeshes[i].position.copy(t.body.translation()).add(aimOffset);clawMeshes[i].quaternion.copy(t.body.rotation())});head.position.copy(sim.head.translation()).add(aimOffset);cable.position.set(head.position.x,(head.position.y+3.6)/2,head.position.z);cable.scale.y=Math.max(.05,(3.6-head.position.y)/.3);trolley.position.x=head.position.x;trolley.position.z=head.position.z;bridge.position.x=head.position.x;stick.rotation.z=-c.input.x*.3;stick.rotation.x=c.input.z*.3;ring.position.set(c.target.x,.014,c.target.z);ring.visible=!c.running;base.controls.update();base.renderer.render(base.scene,base.camera)}tick(performance.now())
 }catch(e){console.error(e);if(!gone)setError('無法載入 3D 畫面，請重新載入或使用支援 WebGL 的瀏覽器。')}}init();
 return()=>{gone=true;cancelAnimationFrame(frame);ctx.current=null;if(c){sim.world.free();base.dispose()}}
 },[seed,machineId,poolId]);return <div className="world-wrap"><div className="world" ref={host}/>{error&&<div className="world-error">{error}</div>}</div>
});
function roomDetails(scene,room,wood){
 const style=room.style||'studio',ink=material(style==='observatory'?'#46536f':'#667e69'),ivory=material('#fff0d4',.72),brass=material('#c49c53',.3,.55);
 // Skirting and framed wall panels sit clear of the wall plane.
 box(scene,0,.16,-1.93,4.8,.15,.08,ivory);box(scene,-2.36,.16,0,.08,.15,3.9,ivory);
 for(const x of [-2.25,-.85,.85,2.25])box(scene,x,1.6,-1.93,.032,2.55,.035,ivory);
 for(const y of [.45,2.76])box(scene,0,y,-1.93,4.55,.035,.04,ivory);
 if(style==='observatory'){
  const pane=cylinder(scene,-1.3,1.85,-1.80,.48,.055,material('#26364f'));pane.rotation.x=Math.PI/2;
  const rim=new T.Mesh(new T.TorusGeometry(.49,.035,12,64),brass);rim.position.set(-1.3,1.85,-1.75);scene.add(rim);
  for(let i=0;i<13;i++)sphere(scene,-1.3+Math.sin(i*2.4)*.36,1.85+Math.cos(i*3.1)*.34,-1.745,.012,ivory);
  const planet=sphere(scene,1.55,2.67,-.65,.18,material('#b69bcb'));const orbit=new T.Mesh(new T.TorusGeometry(.29,.018,8,48),brass);orbit.position.copy(planet.position);orbit.rotation.set(.8,.2,.3);scene.add(orbit);cylinder(scene,1.55,2.9,-.65,.008,.3,brass);
 }else{
  box(scene,-1.4,1.85,-1.82,1.15,1.18,.05,material(style==='garden'?'#bad5c5':'#c5dce1'));
  for(const x of [-2.02,-1.4,-.78])box(scene,x,1.85,-1.76,.055,1.3,.07,ivory);
  for(const y of [1.21,1.85,2.49])box(scene,-1.4,y,-1.76,1.3,.055,.07,ivory);
  box(scene,-1.4,1.17,-1.7,1.4,.07,.3,wood);
  if(style==='studio')for(let i=0;i<4;i++)box(scene,-1.4,2.42-i*.09,-1.72,1.15,.045,.06,wood);
 }
 // Inset cabinet doors, pulls and a small reading lamp.
 for(const x of [-1.65,-.55,.55,1.65]){box(scene,x,.28,-1.056,.98,.28,.025,ivory);sphere(scene,x+.3,.3,-1.026,.02,brass)}
 cylinder(scene,1.85,.69,-1.42,.055,.35,brass);cylinder(scene,1.85,.535,-1.42,.15,.025,brass);
 const shade=new T.Mesh(new T.ConeGeometry(.23,.24,32,1,true),ivory);shade.position.set(1.85,.91,-1.42);scene.add(shade);
 const plant=(x,y,z,large=false)=>{const h=large?.65:.25;cylinder(scene,x,y+.10,z,large?.16:.09,.20,material('#b97859'));cylinder(scene,x,y+.25+h/2,z,.014,h,ink);for(let i=0;i<6;i++){const a=i*2.4;const leaf=sphere(scene,x+Math.sin(a)*.10,y+.29+i*h/6,z+Math.cos(a)*.1,large?.13:.07,material(i%2?'#688864':'#8ca16f'));leaf.scale.set(.6,1.5,.45);leaf.rotation.z=Math.sin(a)*.7}};
 plant(-2.17,.06,1.6,true);plant(-1.63,1.2,-1.67);
 if(style==='garden'){for(let i=0;i<9;i++){const leaf=sphere(scene,2.10+Math.sin(i)*.11,1.18+i*.16,-1.8,.08,material('#72936b'));leaf.scale.set(1,.65,.3)}plant(.95,.54,-1.48)}
 else{for(let i=0;i<4;i++){const book=box(scene,.85+i*.075,.68,-1.6,.055,.28,.18,material(['#92777d','#7b9385','#d0b372','#617690'][i]));book.rotation.z=i===3?-.13:0}}
 label(scene,style==='observatory'?'星 光 收 藏':style==='garden'?'小 小 花 園':'我 的 珍 藏',.45,2.25,-1.85,1.28,.25,style==='observatory'?'#354665':'#637d69','#fff1d1');
 if((room.rug||'round')!=='none'){
  const rugmat=material(style==='observatory'?'#bbc0d5':style==='garden'?'#d5ddbc':'#ecd5bc',.96);
  const cloud=new T.Shape();cloud.moveTo(-1.3,-.45);cloud.bezierCurveTo(-1.8,-.1,-1.4,.55,-.85,.55);cloud.bezierCurveTo(-.7,1.05,.05,1.1,.3,.72);cloud.bezierCurveTo(.95,1.05,1.7,.4,1.25,0);cloud.bezierCurveTo(1.7,-.65,.7,-1,.1,-.65);cloud.bezierCurveTo(-.4,-1.05,-1.05,-.9,-1.3,-.45);
  const rug=new T.Mesh(room.rug==='cloud'?new T.ShapeGeometry(cloud,32):new T.CircleGeometry(1.35,64),rugmat);rug.rotation.x=-Math.PI/2;rug.scale.y=.7;rug.position.set(.15,.062,.52);rug.receiveShadow=true;scene.add(rug);
 }
}
export function RoomWorld({room,inventory,selected,onPlace,onSelect,selectedDecoration,onDecorationPlace,onDecorationSelect,onPlacementIssue}){
 const host=useRef(null),live=useRef(),view=useRef(null),api=useRef(null),callbacks=useRef();live.current={room,inventory,selected,selectedDecoration};callbacks.current={onPlace,onSelect,onDecorationPlace,onDecorationSelect,onPlacementIssue};
 const [error,setError]=useState(''),[mode,setMode]=useState('overview'),[wallView,setWallView]=useState('back'),[grid,setGrid]=useState(true),[hint,setHint]=useState('');const interaction=useRef();interaction.current={mode,wallView,grid};
 const chooseView=(next,wall=wallView)=>{setMode(next);setWallView(wall);api.current?.view(next,wall)};
 useEffect(()=>{let gone=false,frame=0,base;const toys=new Map(),decor=new Map();const dispose=o=>{const materials=new Set();o.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m)});materials.forEach(m=>m.dispose())};
 async function init(){try{
  base=setup(host.current,true);const {scene,camera,renderer,controls}=base;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minPolarAngle=.01;controls.minDistance=3;controls.maxDistance=22;
  const shell=roomShell(scene,room);if(view.current){camera.position.fromArray(view.current.position);controls.target.fromArray(view.current.target);controls.update()}
  const setView=(next,wall)=>{const distance=Math.max(shell.width,shell.depth),fit=Math.max(1,1.15/camera.aspect);controls.enableRotate=next!=='wall';controls.target.set(0,next==='top'?0:1.2,0);if(next==='top')camera.position.set(0,distance*1.8*fit,.01);else if(next==='wall'){const n={back:[0,0,1],front:[0,0,-1],left:[1,0,0],right:[-1,0,0]}[wall];camera.position.set(n[0]*distance*1.4*fit,1.5,n[2]*distance*1.4*fit)}else camera.position.set(distance*1.05*fit,distance*.95*fit,distance*1.3*fit);controls.update()};api.current={view:setView};if(interaction.current.mode!=='overview')setView(interaction.current.mode,interaction.current.wallView);
  const guide=new T.GridHelper(Math.max(shell.width,shell.depth),Math.round(Math.max(shell.width,shell.depth)/.25),'#8f9c8d','#b7bbae');guide.position.y=.079;guide.material.transparent=true;guide.material.opacity=.22;scene.add(guide);
  const ghost=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#638363',wireframe:true,transparent:true,opacity:.8,depthTest:false}));ghost.renderOrder=20;ghost.visible=false;scene.add(ghost);
  let selectedOutline=null,signature='',pending=new Set();
  const wallFaders=new Map(shell.walls.map(w=>[w.userData.wall,createWallFader(w)])),wallOpacities=new Map(),decorFaders=new WeakMap();
  const sync=(dt)=>{const state=live.current,current=state.room;
   for(const [id,m] of toys)if(!current.placements.some(p=>p.itemId===id)){scene.remove(m);dispose(m);toys.delete(id)}
   for(const p of current.placements){const found=state.inventory.find(x=>x.id===p.itemId);if(!found)continue;let m=toys.get(p.itemId);if(!m&&!pending.has(p.itemId)){pending.add(p.itemId);toy(found.kind,current.outfits?.find(x=>x.itemId===p.itemId)).then(value=>{pending.delete(p.itemId);if(gone){dispose(value);return}value.scale.setScalar(.65);value.userData.itemId=p.itemId;toys.set(p.itemId,value);scene.add(value)});continue}if(m){m.position.set(p.x,p.y??(p.z<-.95?.54:.07),p.z);m.rotation.y=p.rotation}}
   const key=JSON.stringify([current.decorations,state.selectedDecoration,state.selected,toys.has(state.selected)]);if(signature!==key){signature=key;if(selectedOutline){scene.remove(selectedOutline);selectedOutline.geometry.dispose();selectedOutline.material.dispose();selectedOutline=null}
    for(const[id,m]of decor)if(!current.decorations?.some(d=>d.id===id)){scene.remove(m);dispose(m);decor.delete(id)}
    for(const d of current.decorations||[]){let m=decor.get(d.id);if(m&&m.userData.variant!==(d.variant||'classic')){scene.remove(m);dispose(m);decor.delete(d.id);m=null}if(!m){m=decorationModel(d.kind,d.variant);m.userData.decorationId=d.id;decor.set(d.id,m);scene.add(m)}m.position.set(d.x,d.y,d.z);m.scale.setScalar(d.scale);const wall=[...DECORATIONS,...FURNITURE].find(f=>f.id===d.kind)?.surface==='wall';m.rotation.set(0,wall?wallRotation(d.wall):d.rotation,wall?d.rotation:0);m.userData.wall=wall?d.wall||'back':null;
     if(d.id===state.selectedDecoration){selectedOutline=new T.BoxHelper(m,'#b4723e');scene.add(selectedOutline)}}
   }
   if(!selectedOutline&&state.selected&&toys.has(state.selected)){selectedOutline=new T.BoxHelper(toys.get(state.selected),'#b4723e');scene.add(selectedOutline)}
   if(selectedOutline)selectedOutline.update();
   for(const w of shell.walls){const id=w.userData.wall,target=wallOpacityTarget(id,interaction.current.mode,interaction.current.wallView,camera.position),opacity=wallOpacities.has(id)?fadeOpacity(wallOpacities.get(id),target,dt):target;wallOpacities.set(id,opacity);wallFaders.get(id)(opacity)}
   for(const m of decor.values())if(m.userData.wall){if(!decorFaders.has(m))decorFaders.set(m,createWallFader(m));decorFaders.get(m)(wallOpacities.get(m.userData.wall)??1)}
   if(selectedOutline){const wall=decor.get(state.selectedDecoration)?.userData.wall;selectedOutline.material.transparent=true;selectedOutline.material.opacity=wall?wallOpacities.get(wall)??1:1;selectedOutline.visible=selectedOutline.material.opacity>.001}
   guide.visible=interaction.current.grid&&(!!state.selected||!!state.selectedDecoration)&&interaction.current.mode!=='showcase';
  };
  const ray=new T.Raycaster(),pointer=new T.Vector2();let down,candidate;
  const cast=e=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera)};
  const locate=e=>{candidate=null;ghost.visible=false;cast(e);const state=live.current,d=state.room.decorations?.find(d=>d.id===state.selectedDecoration),isToy=!!state.selected,definition=FURNITURE.find(f=>f.id===d?.kind),isWall=[...DECORATIONS,...FURNITURE].find(f=>f.id===d?.kind)?.surface==='wall';if(interaction.current.mode==='showcase'||(!d&&!isToy)){ghost.visible=false;candidate=null;return}
   const p=new T.Vector3(),snap=v=>interaction.current.grid?Math.round(v*4)/4:Math.round(v*100)/100;let placement;
   if(isWall){const side=interaction.current.mode==='wall'?interaction.current.wallView:d.wall||'back',size=roomSize(state.room),normal=['back','front'].includes(side)?new T.Vector3(0,0,1):new T.Vector3(1,0,0),offset={back:size.depth/2-.16,front:-size.depth/2+.16,left:size.width/2-.16,right:-size.width/2+.16}[side];if(!ray.ray.intersectPlane(new T.Plane(normal,offset),p))return;placement=wallPlacement(state.room,side,snap(['back','front'].includes(side)?p.x:p.z),Math.min(2.6,Math.max(.25,snap(p.y))))}
   else{if(!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.07),p))return;placement={x:snap(p.x),z:snap(p.z),y:.07,supportId:null};if(isToy||!definition?.solid){const hits=[];for(const other of state.room.decorations||[]){if(other.id===d?.id)continue;const f=FURNITURE.find(f=>f.id===other.kind);for(const h of f?.supports||[]){const hit=new T.Vector3(),y=other.y+h*other.scale;if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-y),hit)){const surface=surfaceAt(state.room,hit.x,hit.z,d?.id);if(surface.id===other.id)hits.push({x:hit.x,z:hit.z,y,supportId:other.id,distance:camera.position.distanceTo(hit)})}}}if(state.room.builtins!==false){const hit=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.54),hit)&&surfaceAt(state.room,hit.x,hit.z).id==='builtin')hits.push({x:hit.x,z:hit.z,y:.54,supportId:'builtin',distance:camera.position.distanceTo(hit)})}if(hits.length){const hit=hits.sort((a,b)=>a.distance-b.distance)[0];placement={x:hit.x,z:hit.z,y:hit.y,supportId:hit.supportId}}}}
   const item={...d,...placement},problem=placementProblem(state.room,item,{wall:isWall,toy:isToy});candidate={placement,problem,isToy};const b=isToy?{w:.48,h:.55,d:.48}:furnitureSize(item);ghost.rotation.y=isWall?wallRotation(placement.wall):0;ghost.scale.set(b.w,b.h,b.d);ghost.position.set(placement.x,placement.y+(isWall?0:b.h/2),placement.z);ghost.material.color.set(problem?'#bd5345':'#568458');ghost.visible=true;setHint(problem|| (placement.supportId?'貼齊家具表面 · 點一下放置':'點一下放置，確認後保存'));
  };
  const pointerDown=e=>{down={x:e.clientX,y:e.clientY};locate(e)};const up=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;locate(e);if(candidate){if(candidate.problem){callbacks.current.onPlacementIssue?.(candidate.problem);return}const p=candidate.placement;if(candidate.isToy)callbacks.current.onPlace?.(p.x,p.z,p.y,p.supportId);else callbacks.current.onDecorationPlace?.(p);ghost.visible=false;return}cast(e);const hits=ray.intersectObjects([...toys.values(),...[...decor.values()].filter(m=>m.visible&&(m.userData.wallOpacity??1)>.25)],true);if(hits[0]){let m=hits[0].object;while(m&&!m.userData.itemId&&!m.userData.decorationId)m=m.parent;if(m?.userData.itemId)callbacks.current.onSelect?.(m.userData.itemId);else if(m?.userData.decorationId)callbacks.current.onDecorationSelect?.(m.userData.decorationId)}};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',locate);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointerleave',()=>{ghost.visible=false;setHint('')});
  let previousFrame=performance.now();const tick=()=>{if(gone)return;frame=requestAnimationFrame(tick);const now=performance.now(),dt=Math.min(.05,(now-previousFrame)/1000);previousFrame=now;if(document.hidden)return;controls.update();sync(dt);renderer.render(scene,camera)};tick();
 }catch(e){console.error(e);setError('無法載入寶物房，請重新整理；收藏仍保留。')}}init();return()=>{gone=true;cancelAnimationFrame(frame);api.current=null;if(base)view.current={position:base.camera.position.toArray(),target:base.controls.target.toArray()};base?.dispose()}},[room.wall,room.style,room.floor,room.rug,room.layout,room.lighting,room.windowStyle,room.builtins,JSON.stringify(room.wallColors),JSON.stringify(room.outfits)]);
 return <div className="world-wrap room-world"><div className="room-camera-tools" role="group" aria-label="房間視角">{[['overview','佈置'],['top','俯視'],['showcase','展示']].map(([id,name])=><button key={id} aria-pressed={mode===id} onClick={()=>chooseView(id)}>{name}</button>)}<select aria-label="正面編輯牆面" value={mode==='wall'?wallView:''} onChange={e=>{if(e.target.value)chooseView('wall',e.target.value)}}><option value="">牆面視角</option>{WALLS.map(id=><option key={id} value={id}>{WALL_NAMES[id]}</option>)}</select><button aria-pressed={grid} onClick={()=>setGrid(!grid)}>吸附 {grid?'開':'關'}</button></div><div className="world" ref={host}/>{hint&&<div className="room-placement-hint" role="status">{hint}</div>}{error&&<div className="world-error">{error}</div>}</div>
}
