import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs/promises';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.()})}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.()})}};
const mat=(c,r=.9)=>new T.MeshStandardMaterial({color:c,roughness:r});
function sphere(g,name,x,y,z,sx,sy,sz,m){const mesh=new T.Mesh(new T.SphereGeometry(1,28,20),m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh}
function stroke(g,pts,r,m){const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,8,r,5,false),m);g.add(mesh)}
await fs.mkdir('public/models',{recursive:true});
for(const [kind,c] of [['bear','#b98452'],['bunny','#e2ccaf'],['cat','#86a990']]){const g=new T.Group();g.name=kind;const fur=mat(c),cream=mat('#f4e4c7'),dark=mat('#38281e'),pink=mat('#db9790'),bow=mat('#905644'),white=mat('#fffdef',.25);
 sphere(g,'pear_body',0,.52,0,.38,.47,.28,fur);sphere(g,'belly_patch',0,.46,.255,.235,.275,.06,cream);sphere(g,'head',0,1.08,.015,.40,.35,.32,fur);
 for(const s of [-1,1]){if(kind==='bunny'){sphere(g,'long_ear',s*.22,1.52,0,.115,.36,.1,fur).rotation.z=s*-.17;sphere(g,'ear_lining',s*.22,1.54,.075,.065,.26,.04,pink)}else if(kind==='cat'){const ear=new T.Mesh(new T.ConeGeometry(.17,.31,24),fur);ear.position.set(s*.29,1.4,0);g.add(ear)}else{sphere(g,'ear',s*.31,1.35,0,.155,.16,.115,fur);sphere(g,'ear_lining',s*.31,1.35,.096,.09,.098,.025,cream)}sphere(g,'arm',s*.36,.59,.02,.17,.29,.18,fur).rotation.z=s*.37;sphere(g,'foot',s*.235,.15,.09,.205,.18,.245,fur);sphere(g,'paw',s*.235,.15,.299,.115,.095,.025,cream);sphere(g,'eye',s*.14,1.12,.311,.039,.048,.021,dark);sphere(g,'glint',s*.14-.01,1.137,.33,.009,.01,.006,white);sphere(g,'cheek',s*.245,1.015,.265,.07,.033,.028,pink)}
 sphere(g,'muzzle',0,.995,.313,.145,.102,.058,cream);sphere(g,'nose',0,1.027,.37,.039,.027,.022,dark);stroke(g,[[0,1.008,.373],[0,.969,.375],[-.031,.953,.372]],.006,dark);stroke(g,[[0,.969,.375],[.031,.953,.372]],.006,dark);sphere(g,'bow_left',-.075,.81,.285,.08,.06,.035,bow);sphere(g,'bow_right',.075,.81,.285,.08,.06,.035,bow);sphere(g,'bow_knot',0,.81,.315,.032,.035,.027,bow);
 // Raised stitching follows the belly edge; all geometry is original.
 for(let i=0;i<28;i++){const a=i*Math.PI*2/28;stroke(g,[-.024,.024].map(t=>[.24*Math.cos(a+t),.46+.28*Math.sin(a+t),.282]),.003,bow)}
 sphere(g,'tail',0,.37,-.267,.13,.13,.13,fur);
 const data=await new GLTFExporter().parseAsync(g,{binary:true});await fs.writeFile('public/models/'+kind+'.glb',Buffer.from(data));console.log(kind,data.byteLength);
}
