import React,{useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {createPhysics,stepPhysics,captured,STEPS,DT} from '../functions/physics.mjs';
import {SOLIDS,LIMIT,CABINET_GROUND_Y} from '../functions/machine.mjs';
import {FESTIVALS} from '../functions/domain.mjs';
const ready=RAPIER.init();
const models=new Map();
export async function toy(kind){if(!models.has(kind))models.set(kind,new GLTFLoader().loadAsync('/models/'+kind+'.glb').then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g.scene}));return(await models.get(kind)).clone(true)}
const material=(color,roughness=.45,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function box(scene,x,y,z,w,h,d,m,round=.03){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,round),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh}
function sphere(scene,x,y,z,r,m){const mesh=new T.Mesh(new T.SphereGeometry(r,20,14),m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh}
function cylinder(scene,x,y,z,r,h,m){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,24),m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh}
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
function setup(el,room=false){const scene=new T.Scene();scene.background=new T.Color(room?'#e6ebe0':'#eee5d6');const camera=new T.PerspectiveCamera(36,1,.1,80);camera.position.set(room?6:6.8,room?5.4:4.7,room?7.5:8.2);const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));scene.userData.signAnisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());scene.userData.maxTextureSize=renderer.capabilities.maxTextureSize;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',room?'可佈置的 3D 寶物房':'3D 夾娃娃機');const pmrem=new T.PMREMGenerator(renderer);const envScene=new RoomEnvironment();const env=pmrem.fromScene(envScene,.04);scene.environment=env.texture;envScene.dispose();pmrem.dispose();const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,room?1:1.9,0);controls.enablePan=false;controls.minDistance=room?6:2;controls.maxDistance=room?13:13;controls.minPolarAngle=room?.55:.03;controls.maxPolarAngle=room?1.42:1.65;controls.minAzimuthAngle=room?-.75:-Infinity;controls.maxAzimuthAngle=room?.85:Infinity;controls.enableDamping=true;const key=new T.DirectionalLight('#fff6de',2.3);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.bias=-.0005;scene.add(key,new T.HemisphereLight('#fff9e5','#8e9d82',1.1));const floor=new T.Mesh(new T.PlaneGeometry(100,100),material(room?'#e3e8dc':'#e5dbc9',.85));floor.rotation.x=-Math.PI/2;floor.position.y=room?-.12:CABINET_GROUND_Y;floor.receiveShadow=true;scene.add(floor);const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();return{scene,camera,renderer,controls,dispose(){ro.disconnect();controls.dispose();renderer.dispose();env.dispose();scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material?.map&&o.material.map.isCanvasTexture)o.material.map.dispose()}});el.replaceChildren()}}}
function cabinet(scene){
 const white=material('#f0eee0',.28),green=material('#243c51',.32),metal=material('#bdc9c5',.23,.85),dark=material('#23332c'),gold=material('#e4b75d',.27,.65);
 const glass=new T.MeshPhysicalMaterial({color:'#dbe8e5',transparent:true,opacity:.055,roughness:.03,depthWrite:false,side:T.DoubleSide});
 const canopy=[];for(const [type,x,y,z,w,h,d] of SOLIDS){const m=box(scene,x,y,z,w,h,d,type==='glass'?glass:type==='rim'?gold:type==='chute'||type==='tray'?dark:white,0);if(type==='roof')canopy.push(m)};
 // Panels leave the entire front collection opening unobstructed.
 box(scene,-.79,-.52,0,2.04,.92,3.1,green);box(scene,1.79,-.52,0,.28,.92,3.1,green);
 canopy.push(box(scene,0,4.12,-.35,3.86,.46,2.5,green,.08),label(scene,'寶 物 兌 換 所',0,4.12,.91,2.9,.34,'#243c51','#f3d58c'));
 for(const x of [-1.89,1.89])for(const z of [-1.54,1.54])box(scene,x,1.85,z,.1,3.7,.1,white);
 label(scene,'PRIZE OUT ↓',.945,-.22,1.59,1.12,.18,'#243c51','#f3d58c');
 label(scene,'寶物領取口',.945,-.84,1.90,1.05,.13,'#23332c','#ecf4c8');
 for(const z of [-1.3,1.3])box(scene,0,3.6,z,3.6,.045,.075,metal);
 const bridge=box(scene,0,3.58,0,.08,.08,2.75,metal);
 box(scene,-.83,.07,1.77,1.7,.16,.50,green);
 const stick=new T.Group();stick.position.set(-1.12,.17,1.79);scene.add(stick);cylinder(stick,0,.12,0,.026,.24,metal);sphere(stick,0,.26,0,.105,dark);cylinder(scene,-1.12,.18,1.79,.12,.045,dark);cylinder(scene,-.40,.18,1.79,.12,.065,gold);
 const ring=new T.Mesh(new T.TorusGeometry(.26,.014,8,48),new T.MeshBasicMaterial({color:'#b2d663'}));ring.rotation.x=-Math.PI/2;ring.position.y=.014;scene.add(ring);return{metal,ring,stick,bridge,canopy};
}
export const ClawWorld=forwardRef(function ClawWorld({seed=12345,onPhase,onFinish,onReady},ref){
 const host=useRef(null),ctx=useRef(null),callbacks=useRef({onPhase,onFinish,onReady});callbacks.current={onPhase,onFinish,onReady};const[error,setError]=useState('');
 useImperativeHandle(ref,()=>({
 move(dx,dz){const c=ctx.current;if(c&&!c.running){c.target.x=T.MathUtils.clamp(c.target.x+dx,-LIMIT.x,LIMIT.x);c.target.z=T.MathUtils.clamp(c.target.z+dz,-LIMIT.z,LIMIT.z)}},
 stick(x,z){if(ctx.current)ctx.current.input={x,z}},
 drop(){const c=ctx.current;if(!c||c.running)return null;c.prepareDrop();c.running=true;c.step=0;c.acc=0;c.input={x:0,z:0};return {...c.target}},target(){return ctx.current?.target},
 view(name){const c=ctx.current;if(!c)return;c.canopy.forEach(m=>m.visible=name!=='top');const views={front:[0,3,10],left:[-9,3.5,1],right:[9,3.5,1],top:[0,10,.01],exit:[3,1,5],overview:[6.8,4.7,8.2]};c.base.camera.position.set(...(views[name]||views.front));c.base.controls.target.set(name==='exit'?.945:0,name==='exit'?-.35:1.8,name==='exit'?1:0);c.base.controls.update()}
 }),[]);
 useEffect(()=>{let gone=false,frame=0,base,sim,c;setError('');callbacks.current.onReady?.(false);
 async function init(){try{await ready;if(gone)return;base=setup(host.current);sim=createPhysics(RAPIER,seed);const{metal,ring,stick,bridge,canopy}=cabinet(base.scene);
 const meshes=await Promise.all(sim.toys.map(async t=>{const root=new T.Group(),mesh=await toy(t.kind);mesh.scale.setScalar(.54);mesh.position.y=-.29;root.add(mesh);base.scene.add(root);return root}));if(gone){sim.world.free();base.dispose();return}
 const clawMeshes=sim.parts.map(p=>{const group=new T.Group();for(const link of p.links){const m=new T.Mesh(new T.CapsuleGeometry(.035,link.len,6,12),metal);m.position.copy(link.p);m.quaternion.copy(link.q);m.castShadow=true;group.add(m)}sphere(group,0,0,0,.058,metal);base.scene.add(group);return group});
 const head=cylinder(base.scene,0,3.3,0,.21,.2,metal),cable=cylinder(base.scene,0,3.5,0,.012,.3,material('#334a3d',.4,.6)),trolley=box(base.scene,0,3.62,0,.38,.16,.34,metal);
 c={base,canopy,target:{x:0,z:0},input:{x:0,z:0},running:false,step:0,acc:0,last:performance.now()};c.prepareDrop=()=>sim.prepareDrop(c.target);ctx.current=c;callbacks.current.onReady?.(true);let prevLabel='';
 function tick(time){if(gone)return;frame=requestAnimationFrame(tick);const dt=Math.min((time-c.last)/1000,.08);c.last=time;c.acc+=dt;
 if(!c.running){c.target.x=T.MathUtils.clamp(c.target.x+c.input.x*dt*.8,-LIMIT.x,LIMIT.x);c.target.z=T.MathUtils.clamp(c.target.z+c.input.z*dt*.8,-LIMIT.z,LIMIT.z)}
 while(c.acc>=DT){if(c.running){const p=stepPhysics(sim,c.step,c.target);if(p.label!==prevLabel){prevLabel=p.label;callbacks.current.onPhase?.(p.label)}c.step++;if(c.step>=STEPS){c.running=false;c.input={x:0,z:0};const exitPoint=new T.Vector3(.945,-.6,1.65).project(base.camera),rect=base.renderer.domElement.getBoundingClientRect();callbacks.current.onFinish?.(captured(sim).map(i=>sim.toys[i].kind),{...c.target},{x:T.MathUtils.clamp(rect.left+(exitPoint.x+1)*rect.width/2,0,innerWidth),y:T.MathUtils.clamp(rect.top+(1-exitPoint.y)*rect.height/2,0,innerHeight)});c.target={x:sim.head.translation().x,z:sim.head.translation().z};}}c.acc-=DT}
 sim.toys.forEach((t,i)=>{meshes[i].position.copy(t.body.translation());meshes[i].quaternion.copy(t.body.rotation())});const aimOffset=new T.Vector3(c.running?0:c.target.x-sim.head.translation().x,0,c.running?0:c.target.z-sim.head.translation().z);sim.parts.forEach((t,i)=>{clawMeshes[i].position.copy(t.body.translation()).add(aimOffset);clawMeshes[i].quaternion.copy(t.body.rotation())});head.position.copy(sim.head.translation()).add(aimOffset);cable.position.set(head.position.x,(head.position.y+3.6)/2,head.position.z);cable.scale.y=Math.max(.05,(3.6-head.position.y)/.3);trolley.position.x=head.position.x;trolley.position.z=head.position.z;bridge.position.x=head.position.x;stick.rotation.z=-c.input.x*.3;stick.rotation.x=c.input.z*.3;ring.position.set(c.target.x,.014,c.target.z);ring.visible=!c.running;base.controls.update();base.renderer.render(base.scene,base.camera)}tick(performance.now())
 }catch(e){console.error(e);if(!gone)setError('無法載入 3D 畫面，請重新載入或使用支援 WebGL 的瀏覽器。')}}init();
 return()=>{gone=true;cancelAnimationFrame(frame);ctx.current=null;if(c){sim.world.free();base.dispose()}}
 },[seed]);return <div className="world-wrap"><div className="world" ref={host}/>{error&&<div className="world-error">{error}</div>}</div>
});
export function RoomWorld({room,inventory,selected,onPlace,onSelect}){const host=useRef(null),callbacks=useRef({onPlace,onSelect});callbacks.current={onPlace,onSelect};const[error,setError]=useState('');useEffect(()=>{let gone=false,frame=0,base;const meshes=[];async function init(){try{base=setup(host.current,true);const{scene,camera,renderer}=base;const wood=material('#cbae81',.8),walls={mint:'#afc9ad',blue:'#9bb7cd',pink:'#d2aebc',cream:'#e2d6b3'};box(scene,0,-.02,0,5,.12,4.2,wood);box(scene,0,1.45,-2.02,5,3,.12,material(walls[room.wall]||walls.mint,.9));box(scene,-2.46,1.45,0,.12,3,4.2,material(walls[room.wall]||walls.mint,.9));for(let x=-2.25;x<2.5;x+=.45)box(scene,x,.046,0,.012,.005,4,material('#a98e69'));box(scene,0,.25,-1.4,4.45,.4,.65,material('#f1e5ce'));box(scene,0,.49,-1.4,4.6,.08,.78,wood);label(scene,'MY LITTLE TREASURES',0,2.6,-1.947,2.65,.36,room.wall==='blue'?'#9bb7cd':walls[room.wall]||walls.mint,'#385641');const rug=new T.Mesh(new T.CircleGeometry(1.5,64),material('#efe7cd',.95));rug.rotation.x=-Math.PI/2;rug.scale.y=.72;rug.position.set(.15,.052,.45);rug.receiveShadow=true;scene.add(rug);
 const theme=room.theme||'none';const gold=material('#e3b963',.45,.15);if(theme==='moon'){const moon=sphere(scene,1.55,2.03,-1.83,.35,material('#f5d97b',.8));sphere(scene,1.68,2.12,-1.64,.30,material(walls[room.wall]||walls.mint));for(let i=0;i<6;i++)sphere(scene,-1.7+i*.54,2.25+(i%2)*.15,-1.88,.035,gold)}else if(theme==='christmas'){const trunk=cylinder(scene,-1.8,.38,-1.25,.075,.5,wood);for(let i=0;i<3;i++){const m=new T.Mesh(new T.ConeGeometry(.4-i*.08,.6,24),material('#3b7254'));m.position.set(-1.8,.75+i*.3,-1.25);scene.add(m)}sphere(scene,-1.8,1.5,-1.25,.08,gold)}else if(theme==='halloween'){const p=sphere(scene,-1.85,.77,-1.4,.27,material('#d68843'));p.scale.y=.85;cylinder(scene,-1.85,1,-1.4,.035,.14,wood)}else if(theme==='spring'){for(const x of [-1.8,1.8]){sphere(scene,x,2.08,-1.7,.2,material('#b65040'));cylinder(scene,x,1.78,-1.7,.015,.28,gold)}}
 for(const placement of room.placements){const item=inventory.find(x=>x.id===placement.itemId);if(!item)continue;const mesh=await toy(item.kind);if(gone)return;mesh.scale.setScalar(.65);mesh.position.set(placement.x,placement.z<-.95?.54:.07,placement.z);mesh.rotation.y=placement.rotation;mesh.userData.itemId=item.id;scene.add(mesh);meshes.push(mesh);if(selected===item.id){const ring=new T.Mesh(new T.TorusGeometry(.36,.015,6,40),new T.MeshBasicMaterial({color:'#628b36'}));ring.rotation.x=-Math.PI/2;ring.position.set(placement.x,mesh.position.y+.01,placement.z);scene.add(ring)}}
 const ray=new T.Raycaster(),pointer=new T.Vector2();let down;const pointerDown=e=>{down={x:e.clientX,y:e.clientY}};const up=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);if(selected){const p=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.07),p))callbacks.current.onPlace(T.MathUtils.clamp(p.x,-2.1,2.1),T.MathUtils.clamp(p.z,-1.6,1.6))}else{const hit=ray.intersectObjects(meshes,true)[0];if(hit){let obj=hit.object;while(obj&&!obj.userData.itemId)obj=obj.parent;if(obj)callbacks.current.onSelect(obj.userData.itemId)}}};renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',up);function tick(){if(gone)return;frame=requestAnimationFrame(tick);base.controls.update();renderer.render(scene,camera)}tick()}catch(e){console.error(e);setError('無法載入寶物房。你仍可在下方查看收藏清單。')}}init();return()=>{gone=true;cancelAnimationFrame(frame);base?.dispose()}},[room.wall,room.theme,JSON.stringify(room.placements),inventory.map(x=>x.id).join(','),selected]);return <div className="world-wrap room-world"><div className="world" ref={host}/>{error&&<div className="world-error">{error}</div>}</div>}
