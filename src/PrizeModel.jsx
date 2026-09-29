import {decorationModel} from './decoration-models.mjs';
import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {toy} from './World.jsx';
import {ToyPortrait} from './Identity.jsx';
export default function PrizeModel({kind,onReady,outfit,decoration=false,variant='classic'}){
 const host=useRef(null);const[failed,setFailed]=useState(false);
 useEffect(()=>{let gone=false,frame=0,renderer,environment,resize,model;setFailed(false);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
 const onMotion=()=>{reduced=motion.matches};motion.addEventListener('change',onMotion);
 async function init(){try{
  const asset=decoration?decorationModel(kind,variant):await toy(kind,outfit);if(gone)return;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,30);
  const bounds=new T.Box3().setFromObject(asset),center=bounds.getCenter(new T.Vector3());asset.position.sub(center);
  model=new T.Group();model.add(asset);scene.add(model);
  renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight('#fff4df','#6a7d91',2));const light=new T.DirectionalLight('#fff3d9',3);light.position.set(-2,4,5);scene.add(light);
  host.current.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','獲得的寶物 3D 展示');
  const fit=()=>{const w=host.current.clientWidth,h=host.current.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const size=bounds.getSize(new T.Vector3());camera.position.set(0,.06,Math.max(size.y,size.x/camera.aspect)/2/Math.tan(T.MathUtils.degToRad(17))*1.24);camera.lookAt(0,0,0);camera.updateProjectionMatrix()};
  resize=new ResizeObserver(fit);resize.observe(host.current);fit();
  const start=performance.now();function tick(now){if(gone)return;const t=(now-start)/1000;model.rotation.y=reduced?-.16:Math.sin(t*.8)*.4;model.position.y=reduced?0:Math.sin(t*1.8)*.035;renderer.render(scene,camera);frame=requestAnimationFrame(tick)}tick(start);onReady?.();
 }catch{if(!gone){setFailed(true);onReady?.()}}}init();
 return()=>{gone=true;cancelAnimationFrame(frame);motion.removeEventListener('change',onMotion);resize?.disconnect();renderer?.dispose();environment?.dispose();host.current?.replaceChildren()};
 },[kind,onReady,outfit?.head,outfit?.neck,decoration,variant]);
 return <div className="prize-model"><div className="prize-model-canvas" ref={host}/>{failed&&(decoration?<p>無法載入物件預覽</p>:<ToyPortrait kind={kind}/>)}</div>
}
