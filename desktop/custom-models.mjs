// Uploaded prize models: GLB validation, vertex extraction and the collider used in the claw machine.
// Only self-contained GLB 2.0 files are accepted (no external files, no Draco/meshopt), so the browser can
// render exactly what the server measured.
import {LIMITS} from '../functions/custom-machines.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400})};
const check=(ok,message)=>{if(!ok)fail(message)};
const ALLOWED_EXTENSIONS=/^(KHR_materials_[a-z_]+|KHR_texture_transform|KHR_mesh_quantization)$/;

const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function multiply(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v}return o}
function localMatrix(node){
 if(node.matrix){check(Array.isArray(node.matrix)&&node.matrix.length===16&&node.matrix.every(Number.isFinite),'節點矩陣格式錯誤');return node.matrix}
 const [tx,ty,tz]=node.translation||[0,0,0],[x,y,z,w]=node.rotation||[0,0,0,1],[sx,sy,sz]=node.scale||[1,1,1];
 check([tx,ty,tz,x,y,z,w,sx,sy,sz].every(Number.isFinite),'節點位置或旋轉格式錯誤');
 return [(1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,(2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,(2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,tx,ty,tz,1];
}

// Returns world-space vertex positions of every triangle mesh in the default scene.
export function readGlb(buffer){
 check(Buffer.isBuffer(buffer)&&buffer.length>=20&&buffer.readUInt32LE(0)===0x46546C67,'不是 GLB 檔案，請以 .glb（二進位）格式匯出');
 check(buffer.length<=LIMITS.modelBytes,`模型檔超過 ${LIMITS.modelBytes/1024/1024} MB，請減少面數或縮小貼圖`);
 check(buffer.readUInt32LE(4)===2,'只支援 glTF 2.0 模型');check(buffer.readUInt32LE(8)===buffer.length,'檔案長度不符，可能已損壞');
 let json,bin,offset=12;
 while(offset+8<=buffer.length){const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4);check(offset+8+length<=buffer.length,'檔案區塊損壞');const data=buffer.subarray(offset+8,offset+8+length);
  if(type===0x4E4F534A&&!json){try{json=JSON.parse(data.toString('utf8'))}catch{fail('模型資料格式錯誤')}}else if(type===0x004E4942&&!bin)bin=data;offset+=8+length}
 check(json&&typeof json==='object','缺少模型資料');check(String(json.asset?.version||'').startsWith('2.'),'只支援 glTF 2.0 模型');
 const required=json.extensionsRequired||[];
 for(const name of required){if(/draco|meshopt/i.test(name))fail('請關閉 Draco／meshopt 壓縮後重新匯出 GLB');check(ALLOWED_EXTENSIONS.test(name),`不支援模型使用的擴充功能：${name}`)}
 check((json.buffers||[]).every((b,i)=>i===0&&!b.uri),'模型必須是單一 GLB 檔，不能引用外部檔案');
 check((json.images||[]).every(img=>!img.uri&&Number.isInteger(img.bufferView)),'貼圖需嵌入在 GLB 檔內');
 check(bin||!(json.buffers||[]).length,'缺少模型的二進位資料');
 const views=json.bufferViews||[],accessors=json.accessors||[],meshes=json.meshes||[],nodes=json.nodes||[];
 const sizes={5126:4,5120:1,5121:1,5122:2,5123:2},scale={5126:1,5120:127,5121:255,5122:32767,5123:65535};
 const view=new DataView(bin?.buffer||new ArrayBuffer(0),bin?.byteOffset||0,bin?.byteLength||0);
 const read=(type,at)=>type===5126?view.getFloat32(at,true):type===5120?view.getInt8(at):type===5121?view.getUint8(at):type===5122?view.getInt16(at,true):view.getUint16(at,true);
 const positions=[];
 function addPrimitive(primitive,matrix){
  const a=accessors[primitive.attributes?.POSITION];check(a&&a.type==='VEC3'&&sizes[a.componentType]&&Number.isInteger(a.count)&&a.count>0,'模型頂點格式不支援');check(!a.sparse,'不支援 sparse 頂點，請重新匯出');
  const v=views[a.bufferView];check(v&&(v.buffer||0)===0,'頂點資料位置錯誤');
  const size=sizes[a.componentType],stride=v.byteStride||size*3,start=(v.byteOffset||0)+(a.byteOffset||0);
  check(start+stride*(a.count-1)+size*3<=(v.byteOffset||0)+v.byteLength&&(v.byteOffset||0)+v.byteLength<=view.byteLength,'頂點資料超出檔案範圍');
  check(positions.length/3+a.count<=LIMITS.vertices,`模型頂點超過 ${LIMITS.vertices.toLocaleString()} 個，請先減面`);
  const k=a.normalized?scale[a.componentType]:1;
  for(let i=0;i<a.count;i++){const at=start+i*stride,x=read(a.componentType,at)/k,y=read(a.componentType,at+size)/k,z=read(a.componentType,at+2*size)/k;
   positions.push(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])}
 }
 const seen=new Set();
 function visit(index,parent,depth){check(Number.isInteger(index)&&nodes[index]&&!seen.has(index)&&depth<64,'模型節點結構錯誤');seen.add(index);const node=nodes[index],matrix=multiply(parent,localMatrix(node));
  if(node.mesh!==undefined){const mesh=meshes[node.mesh];check(mesh,'模型網格遺失');for(const p of mesh.primitives||[])if(p.mode===undefined||p.mode>=4)addPrimitive(p,matrix)}
  for(const child of node.children||[])visit(child,matrix,depth+1)}
 const scene=(json.scenes||[])[json.scene??0];check(scene&&Array.isArray(scene.nodes),'模型沒有可顯示的場景');
 for(const root of scene.nodes)visit(root,identity(),0);
 check(positions.length>=12,'模型沒有可顯示的立體網格');check(positions.every(Number.isFinite),'模型頂點含有無效數值');
 return {positions:Float32Array.from(positions),vertices:positions.length/3};
}

// Same normalisation as the browser: centre the bounding box, longest side 0.95, lifted to y 0.5, then the
// machine scale (0.54 x 1.3) and offset (-0.29). Collider = up to 64 extreme points (Rapier builds the hull).
export function machineShape(positions,limit=LIMITS.hullPoints){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let a=0;a<3;a++){min[a]=Math.min(min[a],positions[i+a]);max[a]=Math.max(max[a],positions[i+a])}
 const size=max.map((v,a)=>v-min[a]),longest=Math.max(...size);check(longest>0,'模型沒有大小');
 check(Math.min(...size)/longest>=.04,'模型太扁（幾乎沒有厚度），夾子無法夾取');
 const center=max.map((v,a)=>(v+min[a])/2),k=.95/longest*.54*1.3,lift=.5*.54*1.3-.29;
 const point=i=>[(positions[i]-center[0])*k,(positions[i+1]-center[1])*k+lift,(positions[i+2]-center[2])*k];
 const count=positions.length/3,pick=[],dist=new Float64Array(count).fill(Infinity);
 // Start from the vertex farthest from the centre, then keep taking the vertex farthest from those chosen.
 let first=0,far=-1;for(let i=0;i<count;i++){const [x,y,z]=point(i*3),d=x*x+(y-lift)**2+z*z;if(d>far){far=d;first=i}}pick.push(first);
 while(pick.length<Math.min(limit,count)){const last=point(pick[pick.length-1]*3);let best=-1,bestD=-1;for(let i=0;i<count;i++){const [x,y,z]=point(i*3),d=Math.hypot(x-last[0],y-last[1],z-last[2]);if(d<dist[i])dist[i]=d;if(dist[i]>bestD){bestD=dist[i];best=i}}if(bestD<=1e-6)break;pick.push(best)}
 const round=v=>+v.toFixed(4);
 return {hull:[pick.flatMap(i=>point(i*3).map(round))],size:size.map(v=>round(v*k)),frustum:()=>{
  // Flat-ended stand-in for models whose rounded base keeps rocking (same idea as the crown and volcano).
  const ys=[];for(let i=0;i<positions.length;i+=3)ys.push(point(i)[1]);const lo=Math.min(...ys),hi=Math.max(...ys),band=(hi-lo)*.15;let rb=0,rt=0;
  for(let i=0;i<positions.length;i+=3){const [x,y,z]=point(i),r=Math.hypot(x,z);if(y<lo+band)rb=Math.max(rb,r);if(y>hi-band)rt=Math.max(rt,r)}
  return [[[lo,rb],[hi,rt]].flatMap(([y,r])=>Array.from({length:16},(_,j)=>[Math.cos(j*Math.PI/8)*r,y,Math.sin(j*Math.PI/8)*r]).flat()).map(round)]}};
}
