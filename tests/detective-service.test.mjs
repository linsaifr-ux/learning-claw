import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createClassroom} from '../desktop/service.mjs';import {caseTemplate} from '../functions/detective.mjs';
test('desktop detective authorization, durable claims and server restart preserve learning records',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'detective-service-'));let service=createClassroom({directory,setupCode:'test'});
 try{
 const teacher=(await service.call('teacherRegister',{email:'test@example.com',password:'password123',setupCode:'test'})).token;
 const call=(token,type,extra={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
 const {classId}=await call(teacher,'createClass',{name:'測試班',grade:'國小三年級'});await call(teacher,'registration',{classId,open:true});await service.call('setClassOpen',{open:true},teacher);
 const code=(await service.call('state',{},teacher)).state.classes[0].code;const student=(await service.call('studentAccess',{code,name:'探員',birthday:'0305',register:true})).token;
 await assert.rejects(service.call('teacherAI',{mode:'detective',assignmentId:'task'},student),e=>e.status===403);
 await assert.rejects(call(student,'saveCharacter',{classId}),e=>e.status===403);
 await call(teacher,'saveAssignment',{classId,assignment:{id:'task',title:'觀察',unit:'閱讀',grade:'國小三年級',subject:'國語／國文',status:'published',questions:[{type:'choice',prompt:'天空是什麼顏色？',options:['藍','紅','紫','橙'],answer:'A',explanation:'文中描述天空是藍色。'}]}});
 await call(teacher,'saveCharacter',{classId,character:{name:'探員',source:'原創',rights:true,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII='}});
 let state=(await service.call('state',{},teacher)).state;await call(teacher,'saveCase',{case:{...caseTemplate(state.assignments[0]),assignmentId:'task',characterId:state.characters[0].id,status:'published',reviewed:true}});
 state=(await service.call('state',{},student)).state;const caseId=state.detectiveCases[0].id;assert.equal(state.detectiveCases[0].solution,undefined);
 await call(student,'caseAnswer',{caseId,index:0,answer:'A',studentId:'forged'});await call(student,'finishCase',{caseId,choice:0,reason:'根據線索'});
 const requestId=crypto.randomUUID();await call(student,'claimBadge',{caseId,requestId});await call(student,'claimBadge',{caseId,requestId});state=(await service.call('state',{},student)).state;assert.equal(state.badges.length,1);assert.equal(state.submissions.length,1);assert.equal(state.students[0].balance,0);
 await call(student,'displayBadges',{badgeIds:[state.badges[0].id]});service.close();service=createClassroom({directory});const owner=(await service.call('teacherLogin',{email:'test@example.com',password:'password123'})).token;await service.call('setClassOpen',{open:true},owner);const reopened=(await service.call('studentAccess',{code,name:'探員',birthday:'0305'})).token;state=(await service.call('state',{},reopened)).state;assert.equal(state.badges.length,1);assert.equal(Object.values(state.badgeDisplays)[0].length,1);assert.equal(Object.values(state.caseProgress)[0].answers[0],'A');
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});

test('ten-question story sends exact schema, returns useful validation errors and preserves saved draft',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'detective-ten-'));let sent;
 const service=createClassroom({directory,setupCode:'test',gemini:async args=>{sent=args;return JSON.stringify({stages:[]})}});
 try{
  const token=(await service.call('teacherRegister',{email:'test@example.com',password:'password123',setupCode:'test'})).token;
  const action=(type,extra)=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
  const {classId}=await action('createClass',{name:'測試',grade:'國小三年級'});
  await action('saveAssignment',{classId,assignment:{id:'ten',title:'成語大冒險2',unit:'基礎成語',grade:'國小三年級',subject:'國語／國文',status:'draft',questions:Array.from({length:10},(_,i)=>({type:'short',prompt:`第${i+1}題成語造句`,answer:'參考答案',explanation:'說明'}))}});
  await service.call('saveTeacherKey',{key:'test-key-not-real-123456789'},token);
  const before=(await service.call('state',{},token)).state.assignments;
  await assert.rejects(service.call('teacherAI',{mode:'detective',assignmentId:'ten'},token),e=>e.code==='failed-precondition'&&e.message.includes('需要 10 站，收到 0 站'));
  assert.equal(sent.schema.properties.stages.minItems,10);assert.equal(sent.schema.properties.stages.maxItems,10);assert.equal(sent.schemaMode,undefined);assert.equal(sent.maxOutputTokens,16384);assert.equal(sent.timeoutMs,90000);
  assert.deepEqual((await service.call('state',{},token)).state.assignments,before);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
