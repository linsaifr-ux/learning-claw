import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createClassroom}from'../desktop/service.mjs';
test('desktop AI status and connection test use Gemini 3.5 Flash-Lite by default',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'classroom-model-'));let sent;
 const service=createClassroom({directory,setupCode:'qa',gemini:async args=>{sent=args;return '連線成功'}});
 try{const login=await service.call('teacherRegister',{email:'teacher@example.com',password:'teach123',setupCode:'qa'});
 await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
 const status=await service.call('teacherKeyStatus',{},login.token);assert.equal(status.model,'gemini-3.5-flash-lite');
 const result=await service.call('testTeacherKey',{},login.token);assert.equal(result.model,status.model);assert.equal(sent.model,status.model);assert.equal(sent.prompt,'請只回答：連線成功');assert.equal(sent.json,false);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
test('desktop question generation returns three validated questions for the editor',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'classroom-questions-'));let sent;
 const questions=[1,2,3].map(n=>({type:'short',prompt:`分數題目 ${n}`,answer:'二分之一',explanation:'等分為兩份取一份'}));
 const service=createClassroom({directory,setupCode:'qa',gemini:async args=>{sent=args;return JSON.stringify({questions})}});
 try{const login=await service.call('teacherRegister',{email:'teacher@example.com',password:'teach123',setupCode:'qa'});
 await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
 const result=await service.call('teacherAI',{mode:'questions',grade:'國小三年級',subject:'數學',unit:'認識分數',material:''},login.token);
 assert.deepEqual(result.questions,questions);assert.equal(sent.json,true);assert.equal(sent.model,'gemini-3.5-flash-lite');
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
test('teacher selected counts reach the schema; grading is a draft and never awards tokens',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'classroom-ai-tasks-'));let sent,reply;
 const service=createClassroom({directory,setupCode:'qa',gemini:async args=>{sent=args;return JSON.stringify(reply)}});
 const read=()=>JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value);
 const write=s=>service.database.prepare("UPDATE settings SET value=? WHERE id='classroom'").run(JSON.stringify(s));
 try{const login=await service.call('teacherRegister',{email:'teacher@example.com',password:'teach123',setupCode:'qa'});await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
 for(const count of [1,5,20]){const s=read();s.rates={};write(s);reply={questions:Array.from({length:count},()=>({type:'short',prompt:'何謂分數',answer:'等分',explanation:'等分圖示'}))};const result=await service.call('teacherAI',{mode:'questions',count,grade:'國小三年級',subject:'數學',unit:'分數',material:''},login.token);assert.equal(result.questions.length,count);assert.equal(sent.schema.properties.questions.minItems,count)}
 const s=read();s.rates={};s.workspace.students=[{id:'s',name:'小宇',balance:9}];s.workspace.assignments=[{id:'a',questions:[{type:'short',prompt:'何謂分數',answer:'等分'}]}];s.workspace.submissions=[{id:'sub',studentId:'s',assignmentId:'a',status:'pending',answers:['等分']}];write(s);const before=structuredClone(s.workspace);
 reply={items:[{questionIndex:1,score:75,feedback:'補上例子',evidence:'寫出等分'}],summary:'知道等分',strengths:'理解等分',gaps:'缺少例子',nextSteps:'畫分數圖',studentFeedback:'你知道等分的意思，試著再畫一張圖。'};
 const result=await service.call('teacherAI',{mode:'grade',submissionId:'sub'},login.token);assert.equal(result.grading.score,75);const saved=read().workspace;assert.deepEqual(saved.teacherAIResults.sub.grade.value,result.grading);delete saved.teacherAIResults;assert.deepEqual(saved,before);assert.equal(sent.schema.properties.items.type,'array');
 const reviewed=read();reviewed.rates={};reviewed.workspace.submissions[0].status='reviewed';reviewed.workspace.submissions[0].score=90;write(reviewed);await service.call('teacherAI',{mode:'grade',submissionId:'sub'},login.token);assert.equal(read().workspace.submissions[0].score,90);assert.deepEqual(read().workspace.ledger,reviewed.workspace.ledger);await assert.rejects(service.call('teacherAI',{mode:'grade',submissionId:'sub'},'invalid-token'));
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});

test('AI generated arithmetic reaches the editor corrected, or rejects invalid options',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'classroom-arithmetic-'));
 let question={type:'choice',prompt:'計算 2548 + 1325 的正確結果為何？',options:['3863','3873','3589','3679'],answer:'A',explanation:'相加為3863。'};
 const service=createClassroom({directory,setupCode:'qa',gemini:async()=>JSON.stringify({questions:[question]})});
 try {
  const login=await service.call('teacherRegister',{email:'teacher@example.com',password:'teach123',setupCode:'qa'});
  await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
  const data={mode:'questions',count:1,grade:'國小三年級',subject:'數學',unit:'加法',material:''};
  const result=await service.call('teacherAI',data,login.token);
  assert.equal(result.questions[0].answer,'B');assert.match(result.questions[0].explanation,/3873/);assert.doesNotMatch(result.questions[0].explanation,/3863/);
  const saved=JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value);saved.rates={};service.database.prepare("UPDATE settings SET value=? WHERE id='classroom'").run(JSON.stringify(saved));
  question={...question,options:['3863','3589','3679','3779']};
  await assert.rejects(service.call('teacherAI',data,login.token),/算式驗算未通過/);
 } finally {service.close();rmSync(directory,{recursive:true,force:true})}
});
