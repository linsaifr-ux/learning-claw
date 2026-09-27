import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original, deterministic surface patterns. No network assets or image-generation runtime.
const textures=new Map();
export function surfaceTexture(kind='weave'){
 if(textures.has(kind))return textures.get(kind);
 const n=128,data=new Uint8Array(n*n*4);let seed=7193;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5);
  const weave=Math.sin(x*Math.PI/4)*Math.cos(y*Math.PI/4);
  const v=Math.round(128+(kind==='weave'?weave*42+noise*12:noise*28+Math.sin(x*.1)*5));
  const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,n,n);texture.name='original-'+kind+'-v1';texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(kind==='weave'?6:2,kind==='weave'?6:2);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textures.set(kind,texture);return texture;
}
// Bake rigid ornamental meshes by material: detail without one draw call per screw.
export function batchCraft(root){
 root.updateMatrixWorld(true);const groups=new Map();
 root.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose()}if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g)});
 const result=new T.Group();result.name=root.name;result.userData={...root.userData};
 for(const [material,parts]of groups){const geometry=mergeGeometries(parts);if(!geometry)throw new Error('Incompatible crafted geometry');const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);parts.forEach(g=>g.dispose())}
 const originals=new Set();root.traverse(o=>{if(o.geometry)originals.add(o.geometry)});originals.forEach(g=>g.dispose());return result;
}
export function craftStats(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3}});return {triangles,meshes}}
