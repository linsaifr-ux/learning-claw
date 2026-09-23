import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyArithmeticQuestion} from '../functions/arithmetic.mjs';
import {applyAction,seedState} from '../functions/domain.mjs';
import {studentView} from '../functions/views.mjs';
const broken={type:'choice',prompt:'計算 2345 + 1234 的結果是多少？',options:['3479','3579','3589','3679'],answer:'A',explanation:'個位 5+4=9，十位 4+3=7，百位 3+2=5，千位 2+1=3，相加為 3479。'};
test('reported answer and explanation are recalculated before saving; student B is correct',()=>{
 let s=applyAction(seedState(),{type:'saveAssignment',requestId:'math-save',classId:'c1',assignment:{id:'math',title:'加法',unit:'加法',grade:'國小三年級',subject:'數學',status:'published',questions:[broken]}},{role:'teacher'});
 assert.equal(s.assignments[0].questions[0].answer,'B');assert.match(s.assignments[0].questions[0].explanation,/2345 \+ 1234 = 3579/);assert.doesNotMatch(s.assignments[0].questions[0].explanation,/3479/);
 s=applyAction(s,{type:'submit',requestId:'math-submit',studentId:'s1',assignmentId:'math',answers:['B']},{role:'student',studentId:'s1'});
 assert.equal(studentView(s,'s1').submissions[0].choiceResults[0].correct,true);
 assert.equal(studentView(s,'s1').assignments[0].questions[0].answer,undefined);
 assert.equal(broken.answer,'A');
});
test('integer operations handle carrying, borrowing, signs and exact large products',()=>{
 for(const [prompt,value] of [['999 + 1 = ?','1000'],['計算 1000 − 1。','999'],['計算 -2 - 3 的差是多少？','-5'],['求 １２ × １２ 的積是多少？','144'],['999999999999 * 999999999999?','999999999998000000000001']]){
  const q=verifyArithmeticQuestion({...broken,prompt,options:['8',value,'9','10']});assert.equal(q.answer,'B',prompt);assert.ok(q.explanation.includes(value));
 }
});
test('missing or duplicate correct numeric options fail instead of publishing a wrong key',()=>{
 for(const options of [['3479','3589','3679','3779'],['3579','3,579','3679','3779']])assert.throws(()=>verifyArithmeticQuestion({...broken,options}),/算式驗算未通過/);
});
test('comparisons, word problems, multi-step and open work are left for teacher review',()=>{
 for(const prompt of ['下列哪一個算式的答案最大？','小明有 2345 元，再得到 1234 元，買書後剩多少？','計算 2345 + 1234 - 100 的結果是多少？','說明為什麼 2345 + 1234 的結果不是 3479？']){
  const q={...broken,prompt};assert.equal(verifyArithmeticQuestion(q),q);
 }
 const q={...broken,type:'work'};assert.equal(verifyArithmeticQuestion(q),q);
});
