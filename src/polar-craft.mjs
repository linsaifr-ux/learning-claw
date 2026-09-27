import * as T from 'three';
import {surfaceTexture,batchCraft} from './model-craft.mjs';
// Preserve the bear silhouette and collision hull; decorate within its existing surface.
export function craftPolar(root){
 const copies=new Map();root.traverse(o=>{if(!o.isMesh)return;const source=o.material;if(!copies.has(source)){const m=source.clone();if(['d6e5ee','f0f4f5','d6b5c1','789cc0'].includes(m.color.getHexString())){m.bumpMap=surfaceTexture('weave');m.bumpScale=.008;m.roughness=.93}else if(m.color.getHexString()==='293744')m.roughness=.28;copies.set(source,m)}o.material=copies.get(source)});
 const details=new T.Group();details.name='polar-embroidery-v1';const thread=new T.MeshStandardMaterial({color:'#8eaaba',roughness:.92}),ivory=new T.MeshStandardMaterial({color:'#e9f0ef',roughness:.94});
 function stitch(points,r=.0028,m=thread){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),8,r,5,false);details.add(new T.Mesh(g,m))}
 const surface=(x,y)=>[x,y,.255+.06*Math.sqrt(Math.max(0,1-(x/.235)**2-((y-.46)/.275)**2))+.003];
 for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a),y=Math.cos(a);stitch([surface(0,.46),surface(x*.10,.46+y*.10)]);for(const d of [-1,1]){const t=a+d*.85;stitch([surface(x*.064,.46+y*.064),surface(x*.064-Math.sin(t)*.034,.46+y*.064-Math.cos(t)*.034)])}}
 for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*.235+(i-1)*.041;stitch([[x,.202,.318],[x,.222,.313]],.0027,ivory)}
 // Subtle back seam along the existing torso surface.
 for(let i=0;i<13;i++){const y=.22+i*.042,z=-.28*Math.sqrt(Math.max(0,1-((y-.52)/.47)**2));stitch([[-.009,y,z-.001],[.009,y+.007,z-.001]],.0025,ivory)}
 root.add(batchCraft(details));root.userData.artRevision=1;return root;
}
