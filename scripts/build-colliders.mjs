import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {Vector3} from 'three';
const output={};
for(const kind of ['bear','bunny','cat']){
 const b=await fs.readFile(`public/models/${kind}.glb`);const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');g.scene.updateMatrixWorld(true);const groups=new Map();
 g.scene.traverse(o=>{if(!o.isMesh)return;const n=o.name;let key=/^(arm|foot|long_ear|ear|tail)/.test(n)&&!n.startsWith('ear_lining')?n:/head|eye|glint|cheek|muzzle|nose|ear_lining/.test(n)?'head':n.startsWith('mesh')?'head':'body';const list=groups.get(key)||[];const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).multiplyScalar(.54);v.y-=.29;list.push(v)}groups.set(key,list)});
 output[kind]=[...groups.values()].map(points=>{const hull=new ConvexHull().setFromPoints(points);const verts=new Set();for(const f of hull.faces){let e=f.edge;do{verts.add(e.head().point);e=e.next}while(e!==f.edge)}return [...verts].flatMap(v=>v.toArray().map(x=>+x.toFixed(6)))});
}
await fs.writeFile('functions/toy-hulls.mjs','// Generated from the actual GLB meshes; run scripts/build-colliders.mjs after model changes.\nexport default '+JSON.stringify(output)+';\n');
