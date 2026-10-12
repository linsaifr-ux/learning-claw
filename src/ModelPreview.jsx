import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
// Shows a GLB the teacher picked before uploading, and hands back a small PNG used as its 2D portrait.
export default function ModelPreview({file,onThumbnail,onError}){
 const host=useRef(null);const[stats,setStats]=useState(null);
 useEffect(()=>{let gone=false,frame=0,renderer,environment,resize;setStats(null);
  (async()=>{try{
   const gltf=await new GLTFLoader().parseAsync(await file.arrayBuffer(),'');if(gone)return;
   const model=gltf.scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const longest=Math.max(size.x,size.y,size.z);if(!(longest>0))throw Error('模型沒有可顯示的網格');
   model.position.sub(center);const holder=new T.Group();holder.add(model);holder.scale.setScalar(1/longest);
   let triangles=0;model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3});
   setStats({size:[size.x,size.y,size.z].map(v=>v/longest),triangles:Math.round(triangles)});
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.01,20);scene.add(holder);
   renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;
   const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
   scene.add(new T.HemisphereLight('#fff4df','#6a7d91',1.6));const light=new T.DirectionalLight('#fff3d9',2.4);light.position.set(-2,4,5);scene.add(light);
   camera.position.set(.9,.55,1.6);camera.lookAt(0,0,0);
   // Portrait first, at a fixed small size, then the live turntable.
   renderer.setSize(160,160,false);camera.aspect=1;camera.updateProjectionMatrix();renderer.render(scene,camera);if(gone||!host.current)return;onThumbnail?.(renderer.domElement.toDataURL('image/png'));
   host.current.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','模型 3D 預覽');
   const fit=()=>{if(gone||!host.current)return;const w=host.current.clientWidth,h=host.current.clientHeight||w;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};resize=new ResizeObserver(fit);resize.observe(host.current);fit();
   const tick=t=>{if(gone)return;holder.rotation.y=t/1600;renderer.render(scene,camera);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);
  }catch(e){if(!gone)onError?.(/Draco|meshopt|EXT_|KHR_/.test(e.message)?'模型使用了不支援的壓縮或擴充，請以未壓縮 GLB 匯出':'無法讀取這個 GLB 模型：'+e.message)}})();
  return()=>{gone=true;cancelAnimationFrame(frame);resize?.disconnect();renderer?.dispose();environment?.dispose();host.current?.replaceChildren()};
 },[file]);
 return <div className="model-preview"><div className="model-preview-canvas" ref={host}/>{stats&&<small>約 {stats.triangles.toLocaleString()} 個三角面 · 比例 {stats.size.map(v=>v.toFixed(2)).join(' × ')}（放進機台後最長邊會縮放到和其他收藏相近）</small>}</div>;
}
