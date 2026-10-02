import {request} from 'node:http';import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';
import {createDurableAction} from '../src/durable-action.mjs';
import {readTaskDraft,saveTaskDraft,taskDraftKey} from '../src/task-draft.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('lost grant response survives client reload and server restart without duplicate coins',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'claw-retry-'));let service;
 try{service=createClassroom({directory,setupCode:'test'});let {token}=await service.call('teacherRegister',{email:'test@example.com',password:'password8',setupCode:'test'});
 const call=a=>service.call('classroomAction',a,token);const actor=(await service.call('state',{},token)).user.uid;
 const create={type:'createClass',name:'連線驗收班',grade:'國小三年級',requestId:crypto.randomUUID()};const first=await call(create);assert.deepEqual(await call(create),first);
 await call({type:'addStudent',classId:first.classId,name:'同學',requestId:crypto.randomUUID()});const student=(await service.call('state',{},token)).state.students[0];
 const disk=storage(),action={type:'grant',ids:[student.id],amount:2,reason:'課堂參與'};
 let original;await assert.rejects(createDurableAction({storage:disk})(actor,action,async a=>{original=a;await call(a);throw Error('lost response')}));
 service.close();service=createClassroom({directory});({token}=await service.call('teacherLogin',{email:'test@example.com',password:'password8'}));
 await createDurableAction({storage:disk})(actor,action,call);assert.equal((await service.call('state',{},token)).state.students[0].balance,2);
 await assert.rejects(call({...original,amount:4}),e=>e.status===409);
 await createDurableAction({storage:disk})(actor,action,call);assert.equal((await service.call('state',{},token)).state.students[0].balance,4);
 }finally{service?.close();rmSync(directory,{recursive:true,force:true})}
});
test('retry keeps receipt on expired login; concurrent submit shares flight and storage errors stop send',async()=>{
 const disk=storage(),ids=[],action={type:'submit',assignmentId:'a',answers:['答案']};
 await assert.rejects(createDurableAction({storage:disk})('student',action,async a=>{ids.push(a.requestId);throw Object.assign(Error('login'),{status:401})}));
 let release;const retry=createDurableAction({storage:disk}),send=a=>{ids.push(a.requestId);return new Promise(r=>release=r)};
 const one=retry('student',action,send),two=retry('student',action,send);while(!release)await new Promise(r=>setImmediate(r));await new Promise(r=>setTimeout(r,10));assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);release({ok:true});await Promise.all([one,two]);
 await assert.rejects(createDurableAction({storage:{getItem(){throw Error('blocked')}}})('student',action,()=>assert.fail('must not send')),/儲存/);
});
test('drafts are isolated by student, assignment and revision, with a one-day limit',()=>{
 const disk=storage(),student={id:'s',classId:'c'},task={id:'a',questions:[{type:'short',prompt:'問題'}]};
 assert(saveTaskDraft(disk,student,task,['未交卷答案']));assert.deepEqual(readTaskDraft(disk,student,task),['未交卷答案']);assert.deepEqual(readTaskDraft(disk,{...student,id:'other'},task),['']);const key=taskDraftKey(student,task),old=JSON.parse(disk.getItem(key));old.at=Date.now()-86400001;disk.setItem(key,JSON.stringify(old));assert.deepEqual(readTaskDraft(disk,student,task),['']);saveTaskDraft(disk,student,task,['重新作答']);assert.deepEqual(readTaskDraft(disk,student,{...task,questions:[{type:'short',prompt:'更改'}]}),['']);
});
test('trusted origin update removes old host and CSRF origin while preserving local access',async()=>{
 const port=14391,local=`http://127.0.0.1:${port}`,server=classroomHttp({call:async()=>({ok:true})},{webRoot:tmpdir(),port,publicOrigin:'https://old.trycloudflare.com'});
 try{await new Promise((r,j)=>{server.once('error',j);server.listen(port,'127.0.0.1',r)});
 server.updatePublicOrigin('');assert.equal((await (await fetch(local+'/api/meta')).json()).publicOrigin,'');
 server.updatePublicOrigin('https://new.trycloudflare.com');assert.throws(()=>server.updatePublicOrigin('https://evil.example'));
 const post=origin=>fetch(local+'/api/state',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal((await post('https://old.trycloudflare.com')).status,403);assert.equal((await post('https://new.trycloudflare.com')).status,200);assert.equal((await post(local)).status,200);
 assert.equal(await new Promise((resolve,reject)=>{const req=request(local+'/api/meta',{headers:{Host:'old.trycloudflare.com'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()}),403);
 const meta=await (await fetch(local+'/api/meta')).json();assert.equal(meta.publicOrigin,'https://new.trycloudflare.com');assert.equal(meta.connectionRevision,2);
 }finally{await new Promise(r=>server.close(r))}
});
