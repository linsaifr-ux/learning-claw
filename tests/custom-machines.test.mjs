import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {readGlb,machineShape} from '../desktop/custom-models.mjs';import {studentView} from '../functions/views.mjs';
const thumbnail='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=';
// Minimal GLB writer for crafted test files.
function glb(json,bin=Buffer.alloc(0)){const pad=(b,c)=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4,c)]);const j=pad(Buffer.from(JSON.stringify(json)),0x20),bb=pad(bin,0);const chunks=[Buffer.from(new Uint32Array([j.length,0x4E4F534A]).buffer),j,...(bin.length?[Buffer.from(new Uint32Array([bb.length,0x004E4942]).buffer),bb]:[])];const body=Buffer.concat(chunks);return Buffer.concat([Buffer.from(new Uint32Array([0x46546C67,2,12+body.length]).buffer),body])}
function box([w,h,d],extra={}){const p=new Float32Array([-w,-h,-d,w,-h,-d,w,h,-d,-w,h,-d,-w,-h,d,w,-h,d,w,h,d,-w,h,d].map((v,i)=>v/2));return glb({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,translation:[3,1,0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:p.byteLength}],bufferViews:[{buffer:0,byteLength:p.byteLength}],accessors:[{bufferView:0,componentType:5126,count:8,type:'VEC3',min:[-w/2,-h/2,-d/2],max:[w/2,h/2,d/2]}],...extra},Buffer.from(p.buffer))}
test('GLB reader takes world-space vertices and refuses files the browser could not render the same way',()=>{
 const {positions,vertices}=readGlb(box([2,1,1]));assert.equal(vertices,8);assert.equal(positions[0],2);assert.equal(positions[1],.5);
 const shape=machineShape(positions);const xs=shape.hull[0].filter((_,i)=>i%3===0);assert.ok(Math.abs(Math.max(...xs)-.95*.54*1.3/2)<1e-3,'longest side scaled like the crafted prizes');
 assert.throws(()=>readGlb(Buffer.from('not a model')),/GLB/);
 assert.throws(()=>readGlb(box([1,1,1],{buffers:[{byteLength:96,uri:'outside.bin'}]})),/外部檔案/);
 assert.throws(()=>readGlb(box([1,1,1],{extensionsRequired:['KHR_draco_mesh_compression']})),/Draco/);
 assert.throws(()=>readGlb(box([1,1,1],{images:[{uri:'skin.png'}]})),/貼圖/);
 assert.throws(()=>machineShape(readGlb(box([1,1,.001])).positions),/太扁/);
 const bear=readGlb(readFileSync('public/models/bear.glb'));assert.ok(bear.vertices>1000);
});
test('teacher uploads a model, builds a machine, opens it for a class; a student plays and the server replays with the snapshot',{timeout:120000},async()=>{
 const directory=mkdtempSync(join(tmpdir(),'custom-machine-'));let service=createClassroom({directory,setupCode:'x'});
 try{const teacher=(await service.call('teacherRegister',{email:'c@example.com',password:'password8',setupCode:'x'})).token;
  const act=(token,type,extra={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
  const {classId}=await act(teacher,'createClass',{name:'甲班',grade:'國小三年級'});await act(teacher,'registration',{classId,open:true});await service.call('setClassOpen',{open:true},teacher);
  const code=(await service.call('state',{},teacher)).state.classes[0].code;const student=(await service.call('studentAccess',{code,name:'小宇',birthday:'0101',register:true})).token;
  const upload=(extra={})=>service.call('uploadCustomPrize',{name:'自製小熊',source:'本專案原創模型',rights:true,glb:readFileSync('public/models/bear.glb').toString('base64'),thumbnail,...extra},teacher);
  await assert.rejects(service.call('uploadCustomPrize',{name:'x',source:'x',rights:true,glb:'',thumbnail},student),e=>e.status===403);
  await assert.rejects(upload({rights:false}),/權/);await assert.rejects(upload({glb:Buffer.from('nope').toString('base64')}),/GLB/);
  const {prize}=await upload();assert.match(prize.id,/^u-[0-9a-f]{12}$/);
  let state=(await service.call('state',{},teacher)).state;const record=state.customPrizes[0];assert.equal(record.source,'本專案原創模型');assert.ok(record.hull[0].length<=64*3);
  await assert.rejects(act(teacher,'saveCustomMachine',{machine:{name:'太多',color:'#336699',accent:'#ffeeaa',prizes:['bear','cat','bunny','polar','robot','rocket','whale']}}),/1–6/);
  await assert.rejects(act(teacher,'saveCustomMachine',{machine:{name:'自製機台',color:'#336699',accent:'#ffeeaa',prizes:[prize.id],portrait:'data:image/svg+xml;base64,PHN2Zz4='}}),/預覽圖/);
  await act(teacher,'saveCustomMachine',{machine:{name:'自製機台',subtitle:'老師的模型',color:'#336699',accent:'#ffeeaa',prizes:[prize.id,'cat'],portrait:thumbnail}});
  state=(await service.call('state',{},teacher)).state;const machine=state.customMachines[0];assert.match(machine.id,/^cm-[0-9a-f]{12}$/);assert.match(machine.portrait,/^[0-9a-f]{64}$/);assert.equal(service.customPortrait(student,machine.portrait).type,'image/png');assert.throws(()=>service.customPortrait('bad',machine.portrait));
  await assert.rejects(act(teacher,'deleteCustomPrize',{prizeId:prize.id}),/移除/);
  await assert.rejects(act(student,'startGame',{machineId:machine.id}),/尚未開放/);
  await act(teacher,'settings',{classId,cost:1,festival:state.classes[0].festival,eventActive:false,enabledMachines:['classic',machine.id]});
  await act(teacher,'grant',{ids:[(await service.call('state',{},student)).state.students[0].id],amount:5,reason:'測試'});
  const view=(await service.call('state',{},student)).state;assert.equal(view.customMachines[0].id,machine.id);assert.equal(view.customPrizes[0].source,undefined);assert.ok(view.customPrizes[0].hull);
  // The model file is served to signed-in users only.
  assert.ok(service.customModel(student,record.model).length>1000);assert.throws(()=>service.customModel('bad-token',record.model));
  await act(student,'startGame',{machineId:machine.id});const game=(await service.call('state',{},student)).state.sessions.find(g=>g.status==='active');assert.deepEqual(game.pool,[prize.id,'cat']);
  // Teacher edits mid-game: the paid game keeps its snapshot.
  await act(teacher,'saveCustomMachine',{machine:{...machine,prizes:['bear']}});
  const finished=await act(student,'finishGame',{sessionId:game.id,target:{x:0,z:0}});assert.ok(Array.isArray(finished.prizes));assert.ok(finished.prizes.every(k=>[prize.id,'cat'].includes(k)));
  await act(teacher,'deleteCustomMachine',{machineId:machine.id});assert.equal(service.customPortrait(teacher,machine.portrait),null);state=(await service.call('state',{},teacher)).state;assert.deepEqual(state.classes[0].enabledMachines,['classic']);
  // A model a student already owns stays, so their collection never loses it.
  if(finished.prizes.includes(prize.id)){await assert.rejects(act(teacher,'deleteCustomPrize',{prizeId:prize.id}),/學生收藏/);assert.ok(service.customModel(teacher,record.model))}
  else{await act(teacher,'deleteCustomPrize',{prizeId:prize.id});assert.equal(service.customModel(teacher,record.model),null);service.close();service=createClassroom({directory});const again=(await service.call('teacherLogin',{email:'c@example.com',password:'password8'})).token;assert.equal((await service.call('state',{},again)).state.customPrizes.length,0)}
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
