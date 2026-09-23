import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createClassroom}from'../desktop/service.mjs';import{studentView}from'../functions/views.mjs';
test('saved AI analysis survives restart and failed regeneration; student view excludes drafts',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ai-saved-'));let fail=false,calls=0;
 let service=createClassroom({directory,setupCode:'qa',gemini:async()=>{calls++;if(fail)throw Error('mock failure');return '### 已掌握\n**等分**\n- 補上例子'}});
 const read=()=>JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value),write=s=>service.database.prepare("UPDATE settings SET value=? WHERE id='classroom'").run(JSON.stringify(s));
 try{let login=await service.call('teacherRegister',{email:'teacher@example.com',password:'teach123',setupCode:'qa'});await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
 const s=read();s.workspace.classes=[{id:'c'}];s.workspace.students=[{id:'s',classId:'c',name:'測試',balance:3}];s.workspace.assignments=[{id:'a',classId:'c',questions:[{type:'short',prompt:'說明分數',answer:'等分'}]}];s.workspace.submissions=[{id:'sub',studentId:'s',assignmentId:'a',answers:['等分'],status:'pending'}];write(s);
 const r=await service.call('teacherAI',{mode:'analysis',submissionId:'sub'},login.token);assert.equal(read().workspace.teacherAIResults.sub.analysis.value,r.analysis);assert.equal(studentView(read().workspace,'s').teacherAIResults,undefined);
 fail=true;const next=read();next.rates={};write(next);await assert.rejects(service.call('teacherAI',{mode:'analysis',submissionId:'sub'},login.token));assert.equal(read().workspace.teacherAIResults.sub.analysis.value,r.analysis);
 service.close();service=createClassroom({directory});login=await service.call('teacherLogin',{email:'teacher@example.com',password:'teach123'});const loaded=await service.call('state',{},login.token);assert.equal(loaded.state.teacherAIResults.sub.analysis.value,r.analysis);assert.equal(loaded.state.submissions[0].status,'pending');assert.equal(loaded.state.students[0].balance,3);assert.equal(calls,2);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
