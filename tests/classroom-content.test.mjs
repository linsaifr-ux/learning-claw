import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {createQuestionBank} from '../desktop/question-bank.mjs';import {curriculumCoverage} from '../desktop/curriculum-coverage.mjs';import {curriculumRole} from '../desktop/curriculum-policy.mjs';import {samePracticeQuestion} from '../functions/question-history.mjs';import {preparedLibraryRows} from '../desktop/web-question-library.mjs';
const rows=JSON.parse(readFileSync(new URL('../desktop/library/classroom-content.json',import.meta.url))).records;
test('all original lessons preserve their complete stimulus and scoped mapping through import',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db);for(const row of rows){const r=bank.save(row.record);assert.equal(r.status,'pending');assert.equal(r.question.prompt,row.record.question.prompt);assert.match(r.question.prompt,/【作答任務】/);assert(r.curriculumTopicIds.length);assert(!/教師須先提供|需老師提供教材/.test(r.question.prompt));if(r.question.type==='choice'){assert.equal(new Set(r.question.options).size,4);assert.equal(r.question.answer,row.record.question.answer)}else assert.match(r.question.explanation,/規準|分|答案須|完整答案須|指出|须|需分辨/)}assert.equal(bank.list().counts.approved||0,0)}finally{db.close()}
});
test('shared stimulus never hides genuinely different tasks, but exact repeated tasks remain duplicates',()=>{
 const stem='原創共同閱讀材料。'.repeat(60)+'【作答任務】\n';
 const a={type:'short',prompt:stem+'請找出主角改變計畫的原因。',answer:'原因'},b={...a,prompt:stem+'請依照事件發生的順序寫出三個步驟。'};
 assert.equal(samePracticeQuestion(a,b),false);assert.equal(samePracticeQuestion(a,{...a}),true);
 assert.equal(samePracticeQuestion({...a,prompt:stem+'計算 12 + 15。'},{...a,prompt:stem+'計算 12 + 16。'}),false);
});
test('cross-cutting capabilities and unselected languages do not create fake per-unit demand',()=>{
 assert.equal(curriculumRole({subject:'自然科學',name:'觀察與定題（三四年級）'}),'cross-unit-competency');
 assert.equal(curriculumRole({subject:'自然科學',name:'植物的運輸與光合作用'}),'teaching-unit');
 assert.equal(curriculumRole({subject:'本土語文（客語文）',name:'能力'}),'outside-selected-language');
 assert.equal(curriculumRole({subject:'本土語文（閩南語文）',name:'臺灣台語生活詞義'}),'teaching-unit');
 const db=new DatabaseSync(':memory:');try{createQuestionBank(db);const r=curriculumCoverage(db,{grade:3,subject:'自然科學',query:'觀察與定題'});assert.equal(r.topics[0].target,0);assert.equal(r.topics[0].shortage,0);assert.equal(r.topics[0].coverageStatus,'cross-unit-competency');assert.equal(r.completeCoverage,false)}finally{db.close()}
});
test('third-grade Taiwanese can assemble requested types after selective review, without Gemini',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db);const input=preparedLibraryRows().filter(r=>r.status==='prepared'&&r.record.grade==='國小三年級'&&r.record.curriculumTopicIds?.includes('lc-taiwanese-3'));for(const row of input){const r=bank.save(row.record);bank.review({id:r.id,revision:r.revision,confirmed:true})}
 const result=bank.quickQuestions({grade:'國小三年級',subject:'臺灣台語（閩南語文）',unit:'臺灣台語生活詞義',material:'選擇題8題，應用題2題',count:10});assert.equal(result.questions.length,10);assert.equal(result.questions.filter(q=>q.type==='choice').length,8);assert.equal(result.questions.filter(q=>q.format==='application').length,2);
 }finally{db.close()}
});
test('computed lesson choice keys agree with independent calculations from the supplied scenarios',()=>{
 for(const row of rows){const q=row.record.question;if(q.type!=='choice')continue;const answer=q.options['ABCD'.indexOf(q.answer)],p=q.prompt;
 if(p.includes('甲杯上升幾度')){const initial=Number(p.match(/起初都是 (\d+)°C/)[1]),final=Number(p.match(/後甲杯 (\d+)°C/)[1]);assert.equal(answer,`${final-initial}°C`)}
 if(p.includes('此樣本的密度為何')){const m=Number(p.match(/質量(\d+)公克/)[1]),v=Number(p.match(/體積(\d+)立方公分/)[1]);assert.equal(answer,`${m/v}公克／立方公分`)}
 if(p.includes('程式最後輸出多少')){const limit=Number(p.match(/取1到(\d+)/)[1]);assert.equal(answer,String(Array.from({length:limit},(_,i)=>i+1).reduce((a,b)=>a+b,0)))}
 if(p.includes('通過電阻的電流為何')){const u=Number(p.match(/電壓(\d+)伏特/)[1]),r=Number(p.match(/電阻(\d+)歐姆/)[1]);assert.equal(answer,`${u/r}安培`)}
 }
});
test('daily supply requires the requested types and deduplicates across all simulated papers',async()=>{
 const {supplyPlan,simulateSupply}=await import('../desktop/curriculum-supply.mjs');const plan=supplyPlan('選擇題8題，應用題2題',3);
 const choices=Array.from({length:36},(_,i)=>({id:'c'+i,question:{type:'choice',prompt:`計算 ${100+i} + 2 的結果？`,answer:'A',options:[String(102+i),'0','1','2']}}));
 assert.equal(simulateSupply(choices,plan).papers,0);assert.equal(simulateSupply(choices,plan).missingByType.application,2);
 const apps=Array.from({length:6},(_,i)=>({id:'a'+i,question:{type:'short',format:'application',prompt:`有 ${10+i} 本書，再收到2本，共有幾本？`,answer:String(12+i)}}));
 assert.equal(simulateSupply([...choices,...apps],plan).papers,3);assert.equal(simulateSupply([...choices,...apps.slice(0,2),...apps.slice(0,2)],plan).papers,1);
 assert.throws(()=>supplyPlan('選擇題8題且保證有趣',3));assert.throws(()=>supplyPlan('選擇題8題',0));
});
test('retired packaged items never reappear in potential supply from their bundled copies',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db),items=preparedLibraryRows().filter(r=>r.status==='prepared'&&r.record.grade==='國小三年級'&&r.record.curriculumTopicIds?.includes('lc-taiwanese-3'));
 const scope={grade:3,subject:'臺灣台語',query:'臺灣台語生活詞義',material:'選擇題1題',rounds:1};assert.equal(curriculumCoverage(db,scope).topics[0].supply.potential.papers,1);
 for(const item of items){const saved=bank.save(item.record);bank.retire({id:saved.id,revision:saved.revision})}
 assert.equal(curriculumCoverage(db,scope).topics[0].supply.potential.papers,0);
 }finally{db.close()}
});
