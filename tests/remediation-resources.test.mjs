import test from 'node:test';
import assert from 'node:assert/strict';
import {remediationEvidence,remediationPrompt,parseRemediation} from '../desktop/remediation-resources.mjs';
const assignment={grade:'國小五年級',subject:'資訊科技',unit:'全部資訊概念',questions:[
 {type:'choice',prompt:'保護帳密',answer:'A',options:['不分享','分享','公開','轉傳']},
 {type:'choice',prompt:'正確考點不能拿去補強',answer:'B'},
 {type:'short',prompt:'單位問題',answer:'100元'},
 {type:'work',prompt:'尚待教師確認',answer:'依作品評估'},
 {type:'short',prompt:'空白不是觀念證據',answer:'例子'},
 {type:'short',prompt:'已掌握',answer:'說明'}]};
const sub={answers:['B','B','100','描述','','正確']};
const grading={items:[{questionIndex:3,score:94,feedback:'漏写單位',evidence:'只寫100'},{questionIndex:4,score:null},{questionIndex:5,score:0},{questionIndex:6,score:100}]};
test('recommendations use only observed wrong choices and scored non-choice gaps',()=>{assert.deepEqual(remediationEvidence(assignment,sub,grading).map(e=>e.questionIndex),[1,3]);assert.deepEqual(remediationEvidence(assignment,sub,null).map(e=>e.questionIndex),[1]);assert.deepEqual(remediationEvidence({...assignment,questions:[assignment.questions[1]]},{answers:['B']},null),[])});
test('concept generation omits unrelated unit, correct questions, identity and contacts',()=>{const evidence=remediationEvidence(assignment,sub,grading);evidence[0].answer='王小明 a@example.com 0912345678';const prompt=remediationPrompt(assignment,evidence,[{name:'王小明'}]);assert(!prompt.includes('王小明'));assert(!prompt.includes('a@example.com'));assert(!prompt.includes('0912345678'));assert(!prompt.includes('全部資訊概念'));assert(!prompt.includes('正確考點'));assert(prompt.includes('單位問題'))});
test('unsupported question references and malformed model output are rejected',()=>{const evidence=remediationEvidence(assignment,sub,grading);const concept={query:'帳號密碼',questionIndexes:[1],reason:'辨識帳密保護做法'};assert.equal(parseRemediation(JSON.stringify({concepts:[concept]}),evidence).length,1);assert.deepEqual(parseRemediation('{"concepts":[]}',evidence),[]);for(const text of ['oops','null','{}',JSON.stringify({concepts:[{...concept,questionIndexes:[2]}]}),JSON.stringify({concepts:[{...concept,query:''}]})])assert.throws(()=>parseRemediation(text,evidence))});

import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';
test('teacher-only recommendation cache, no-match fallback and optional publication work end to end',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'remediation-service-'));let calls=0;
 const service=createClassroom({directory,setupCode:'qa',gemini:async({prompt})=>{calls++;assert(prompt.startsWith('任務：依實際錯題'));assert(!prompt.includes('學生甲'));return JSON.stringify({concepts:[{query:'zzNoMatchingConcept987',questionIndexes:[1],reason:'測試無符合教材'}]})}});
 try{
  const {token}=await service.call('teacherRegister',{email:'remediation@example.com',password:'password123',setupCode:'qa'});
  const act=data=>service.call('classroomAction',{requestId:crypto.randomUUID(),...data},token),resources=data=>service.call('questionBank',{operation:'recommendResources',...data},token);
  const {classId}=await act({type:'createClass',name:'教材測試班',grade:'國小五年級'});
  await act({type:'registration',classId,open:true});await service.call('setClassOpen',{open:true},token);
  const c=(await service.call('state',{},token)).state.classes.find(c=>c.id===classId);
  const student=await service.call('studentAccess',{code:c.code,name:'學生甲',birthday:'0101',register:true});
  await act({type:'saveAssignment',classId,assignment:{id:'lesson',title:'保護帳密',grade:c.grade,subject:'資訊科技',unit:'網路安全',status:'published',rewardMode:'perQuestion',reward:1,questions:[{type:'choice',prompt:'陌生人要求密碼應怎麼做？',options:['不提供','提供','公開','轉傳'],answer:'A',explanation:'不應提供帳密。'}]}});
  const sid=(await service.call('state',{},student.token)).user.uid;
  await service.call('classroomAction',{type:'submit',requestId:crypto.randomUUID(),studentId:sid,assignmentId:'lesson',answers:['B']},student.token);
  const submission=(await service.call('state',{},token)).state.submissions[0];
  await assert.rejects(()=>service.call('questionBank',{operation:'recommendResources',submissionId:submission.id},student.token),/只有老師/);
  await assert.rejects(()=>resources({submissionId:'missing'}),/找不到/);
  await assert.rejects(()=>resources({submissionId:submission.id}),/API Key/);
  assert.equal(calls,0);
  await service.call('saveTeacherKey',{key:'test-only-fake-key-not-a-real-key'},token);
  const first=await resources({submissionId:submission.id});assert.equal(first.total,0);assert.match(first.notice,/可直接發布/);assert.equal(calls,1);
  await service.call('deleteTeacherKey',{},token);
  const second=await resources({submissionId:submission.id});assert(second.cached);assert.equal(calls,1);
  await assert.rejects(()=>resources({submissionId:submission.id,regenerate:true}),/API Key/);
  await act({type:'review',submissionId:submission.id,score:0,feedback:'練習保護帳密',itemFeedback:['請勿提供密碼'],reward:1,resourceLinks:[]});
  const published=(await service.call('state',{},student.token)).state;assert(!published.teacherAIResults);assert.equal(published.submissions[0].status,'reviewed');assert.deepEqual(published.submissions[0].resourceLinks,[]);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
