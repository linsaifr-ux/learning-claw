import test from 'node:test';import assert from 'node:assert/strict';
import {sourcePreparationPrompt,parseSourcePreparation,sameSourceAnswer} from '../desktop/source-preparation.mjs';
const row={id:'cmath-test',originalAnswer:'20',status:'draft',record:{grade:'國小三年級',subject:'數學',unit:'乘法',tags:[],question:{type:'short',prompt:'每盒有5枝鉛筆，買4盒，共有幾枝鉛筆？',answer:'20',explanation:''}},sourceMeta:{kind:'cmath'}};
const item={id:row.id,grade:'國小三年級',unit:'乘法應用',tags:['乘法'],solvedAnswer:'20',answerUnit:'枝',explanation:'每盒有5枝鉛筆，4盒的鉛筆數量相同，可以用乘法計算。5 × 4 = 20，所以共有20枝鉛筆。',usable:true,reason:''};
test('source preparation hides source answers and preserves prompt and source answer in teacher drafts',()=>{const prompt=sourcePreparationPrompt([row]);assert(!prompt.includes('originalAnswer'));assert(!prompt.includes('"answer":'));const [r]=parseSourcePreparation(JSON.stringify({items:[item]}),[row]);assert.equal(r.status,'prepared');assert.equal(r.record.question.prompt,row.record.question.prompt);assert.equal(r.record.question.answer,'20');assert.equal(r.record.question.answerUnit,'枝');assert.equal(r.record.status,undefined);assert.equal(r.sourceMeta.curriculumVerified,false);assert.equal(row.record.question.explanation,'')});
test('independent disagreement never silently replaces the source answer',()=>{const [r]=parseSourcePreparation(JSON.stringify({items:[{...item,solvedAnswer:'25'}]}),[row]);assert.equal(r.status,'needs-check');assert.equal(r.record.question.answer,'20');assert.match(r.issue,/不一致/)});
test('bad IDs, incomplete batches, and missing unit evidence cannot be marked prepared',()=>{assert.throws(()=>parseSourcePreparation(JSON.stringify({items:[{...item,id:'other'}]}),[row]),/ID/);assert.throws(()=>parseSourcePreparation('{"items":[]}',[row]),/題數/);const [r]=parseSourcePreparation(JSON.stringify({items:[{...item,answerUnit:''}]}),[row]);assert.equal(r.status,'needs-check')});
test('numeric comparison handles fractions and percentages without arbitrary tolerance',()=>{assert(sameSourceAnswer('0.5','1/2'));assert(sameSourceAnswer('25%','0.25'));assert(!sameSourceAnswer('25%','25'));assert(!sameSourceAnswer('3479','3579'));assert(!sameSourceAnswer('1/0','0'))});
import {DatabaseSync} from 'node:sqlite';import {createQuestionBank} from '../desktop/question-bank.mjs';
test('resumed source preparation updates managed pending drafts but preserves teacher edits and approvals',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db),r={...row.record,source:'test source',url:'https://example.org/exam',rights:'使用者確認授權',originLibraryId:'cmath-test'};
 assert.equal(bank.importRows([r],{refreshLibraryDrafts:true}).imported,1);let saved=bank.list().records[0];const originalId=saved.id;assert.equal(saved.status,'pending');assert.throws(()=>bank.review({id:saved.id,revision:saved.revision,confirmed:true}),/詳解/);
 const filled={...r,unit:'乘法應用',question:{...r.question,explanation:item.explanation,answerUnit:'枝'}};
 assert.equal(bank.importRows([filled],{refreshLibraryDrafts:true}).updated,1);saved=bank.list().records[0];assert.equal(saved.id,originalId);assert.equal(saved.revision,2);assert.equal(saved.status,'pending');
 const teacher=bank.save({...saved,unit:'老師修訂單元'});assert.equal(bank.importRows([filled],{refreshLibraryDrafts:true}).updated,0);assert.equal(bank.get(teacher.id).unit,'老師修訂單元');
 bank.review({id:teacher.id,revision:teacher.revision,confirmed:true});assert.equal(bank.importRows([filled],{refreshLibraryDrafts:true}).updated,0);assert.equal(bank.get(teacher.id).status,'approved');
 }finally{db.close()}
});
