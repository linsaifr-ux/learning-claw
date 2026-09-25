import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createClassroom} from '../desktop/service.mjs';
const row={grade:'國小三年級',subject:'國語／國文',unit:'成語',textbook:'',semester:'',difficulty:'一般',tags:['成語'],source:'教師自編',url:'',rights:'自編，供教學及 AI 參考',question:{type:'short',prompt:'說明「一心一意」的意思。',answer:'專心，沒有其他念頭。',explanation:'形容心思專注。'}};
test('teacher bank persists across restart, source retirement blocks publication and students cannot access bank',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'rag-service-'));let service=createClassroom({directory,setupCode:'qa'});
 try{let {token}=await service.call('teacherRegister',{email:'rag@example.com',password:'password123',setupCode:'qa'});
 const call=(name,data)=>service.call(name,data,token);
 const {record}=await call('questionBank',{operation:'save',record:row});await call('questionBank',{operation:'review',id:record.id,revision:record.revision,confirmed:true});
 const {questions}=await call('teacherAI',{mode:'ragQuestions',...row,count:1,material:''});assert.equal(questions[0].provenance.kind,'bank');
 const {classId}=await call('classroomAction',{type:'createClass',name:'測試班',grade:row.grade,requestId:crypto.randomUUID()});await call('classroomAction',{type:'registration',classId,open:true,requestId:crypto.randomUUID()});await call('setClassOpen',{open:true});const state=await call('state',{});const code=state.state.classes[0].code;const student=await service.call('studentAccess',{code,name:'測試同學',birthday:'0101',register:true});
 for(const operation of ['list','save','import','review','retire'])await assert.rejects(service.call('questionBank',{operation,record:row},student.token),e=>e.status===403);
 await assert.rejects(service.call('teacherAI',{mode:'ragQuestions',...row,count:1},student.token),e=>e.status===403);
 const assignment={...row,title:'成語練習',status:'draft',questions};await call('classroomAction',{type:'saveAssignment',classId,assignment,requestId:crypto.randomUUID()});
 service.close();service=createClassroom({directory});({token}=await service.call('teacherLogin',{email:'rag@example.com',password:'password123'}));
 assert.equal((await call('questionBank',{operation:'list'})).counts.approved,1);assert.equal((await call('teacherAI',{mode:'ragQuestions',...row,count:1})).questions.length,1);
 await call('questionBank',{operation:'retire',id:record.id,revision:record.revision});await assert.rejects(call('classroomAction',{type:'saveAssignment',classId,assignment:{...assignment,status:'published'},requestId:crypto.randomUUID()}),/來源已更新或停用/);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
