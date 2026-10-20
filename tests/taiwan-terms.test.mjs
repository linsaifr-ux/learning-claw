import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {localizeTaiwan,localizeDeep,mainlandTermNotes,TAIWAN_STYLE} from '../functions/taiwan-terms.mjs';import {createClassroom} from '../desktop/service.mjs';import {requestGemini} from '../functions/gemini.mjs';
test('mainland terms that are wrong in Taiwan are rewritten; Taiwanese usages that look similar stay',()=>{
 const cases=[['小明用打印機打印了3米長的海報，再用U盤存視頻。','小明用印表機列印了3公尺長的海報，再用隨身碟存影片。'],['初二的學生用鼠標點開軟件看信息','國二的學生用滑鼠點開軟體看資訊'],['西紅柿和菠蘿，還有菠蘿麵包','番茄和鳳梨，還有菠蘿麵包'],['長 25 厘米、重 2 千克，面積 6 平方米','長 25 公分、重 2 公斤，面積 6 平方公尺'],['橡皮擦、橡皮筋和一塊橡皮','橡皮擦、橡皮筋和一塊橡皮擦'],['重 5 噸，另 3 公噸','重 5 公噸，另 3 公噸']];
 for(const [input,want] of cases)assert.equal(localizeTaiwan(input),want);
 assert.equal(localizeTaiwan('這个题目'),'這个题目','stored text keeps its characters');assert.equal(localizeTaiwan('這个题目',{simplified:true}),'這個題目');
 for(const keep of ['大年初一的早上','正月初三的同學會','詩云：關關雎鳩','玉米和米飯','自行車道','智能障礙','東京地鐵','質量守恆','計算機'])assert.equal(localizeTaiwan(keep),keep,keep);
 assert.deepEqual(localizeDeep({id:'q-1',sourceIds:['web:123'],answer:'B',options:['視頻','影片']}),{id:'q-1',sourceIds:['web:123'],answer:'B',options:['影片','影片']});
 assert.deepEqual(mainlandTermNotes('質量很好，用計算機算').map(n=>n.term),['質量','計算機']);assert.deepEqual(mainlandTermNotes('影片與資訊'),[]);
});
test('every AI reply reaches the teacher in Taiwanese terms, and the model is told to write them',async()=>{
 let sent;const fetchImpl=async(url,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]})}};
 await requestGemini({key:'test-key-not-a-real-secret-12345',model:'m',prompt:'p',fetchImpl});assert.ok(sent.systemInstruction.parts[0].text.includes(TAIWAN_STYLE));
 const directory=mkdtempSync(join(tmpdir(),'taiwan-terms-'));
 const questions=[1,2,3].map(n=>({type:'short',prompt:`小華騎自行車到超市買了${n}個西紅柿，用手機拍了視頻，影片長 2 米嗎？`,answer:'坐公交車要 15 分鐘',explanation:'用打印機列出路線後計算'}));
 const service=createClassroom({directory,setupCode:'qa',gemini:async()=>JSON.stringify({questions})});
 try{const login=await service.call('teacherRegister',{email:'tw@example.com',password:'teach123',setupCode:'qa'});await service.call('saveTeacherKey',{key:'test-key-not-a-real-secret-12345'},login.token);
  const result=await service.call('teacherAI',{mode:'questions',grade:'國小三年級',subject:'數學',unit:'時間',material:''},login.token);
  assert.equal(result.questions[0].prompt,'小華騎自行車到超市買了1個番茄，用手機拍了影片，影片長 2 公尺嗎？');assert.equal(result.questions[0].answer,'坐公車要 15 分鐘');assert.equal(result.questions[0].explanation,'用印表機列出路線後計算');
  assert.deepEqual(mainlandTermNotes(result.questions[0].prompt).map(n=>n.term),['自行車']);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
test('question bank stores Taiwanese wording on save and fixes older records in place at start-up',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const directory=mkdtempSync(join(tmpdir(),'bank-terms-'));let s=createClassroom({directory,setupCode:'x'});
 try{const t=(await s.call('teacherRegister',{email:'b@example.com',password:'password8',setupCode:'x'})).token;
  const {record}=await s.call('questionBank',{operation:'save',record:{grade:'國小四年級',subject:'數學',unit:'長度',tags:['長度'],source:'教師自編',url:'',rights:'自編',question:{type:'short',prompt:'一條繩子長 3 米，剪下 120 厘米後還剩多少？',answer:'180 厘米',explanation:'3米=300厘米'}}},t);
  assert.equal(record.question.prompt,'一條繩子長 3 公尺，剪下 120 公分後還剩多少？');assert.equal(record.question.answer,'180 公分');
  s.close();const db=new DatabaseSync(join(directory,'classroom.sqlite'));const r=JSON.parse(db.prepare('SELECT record FROM question_bank').get().record);r.question.prompt='小華去買西紅柿，花了 5 分鐘';db.prepare('UPDATE question_bank SET record=?').run(JSON.stringify(r));db.close();
  s=createClassroom({directory});const t2=(await s.call('teacherLogin',{email:'b@example.com',password:'password8'})).token;const got=(await s.call('questionBank',{operation:'get',id:r.id},t2)).record;
  assert.equal(got.question.prompt,'小華去買番茄，花了 5 分鐘');assert.equal(got.revision,record.revision);
 }finally{s.close();rmSync(directory,{recursive:true,force:true})}
});
