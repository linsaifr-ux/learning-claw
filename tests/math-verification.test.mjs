import test from 'node:test';import assert from 'node:assert/strict';
import {inspectMathQuestion,validateMathPublication,mathReviewContent,hasMathReview} from '../functions/math-verification.mjs';
import {applyAction,seedState} from '../functions/domain.mjs';
import {studentView} from '../functions/views.mjs';
const choice=(prompt,options,answer='A')=>({type:'choice',prompt,options,answer,explanation:'12+3=15，因此剩下15顆。'});
const remaining=choice('小明原有12顆糖果，送出3顆糖果，還剩多少顆糖果？',['15','9','8','6']);
const unsupported=choice('小明有12顆糖果，送出一些後剩下3顆，送出多少？',['9','3','12','15']);
const save=(q,status='published')=>applyAction(seedState(),{type:'saveAssignment',classId:'c1',requestId:'math',assignment:{id:'math',title:'數量',grade:'國小三年級',subject:'數學',unit:'數量',status,questions:[q]}},{role:'teacher'});
test('correct addition attached to subtraction story is replaced using the full question meaning',()=>{
 const r=inspectMathQuestion(remaining,'數學');assert.equal(r.status,'verified');assert.equal(r.question.answer,'B');assert.match(r.question.explanation,/減去/);assert.match(r.question.explanation,/12 − 3 = 9/);assert.doesNotMatch(r.question.explanation,/12\+3|15/);
 assert.equal(save(remaining).assignments[0].questions[0].answer,'B');
});
test('four controlled story types generate answers, units and reasons from actual prompt',()=>{
 for(const [prompt,result,reason] of [
 ['小明原有12本書，又得到3本書，現在共有多少本書？','15本','相加'],
 ['每盒有6枝鉛筆，共有4盒，一共有多少枝鉛筆？','24枝','乘以'],
 ['把12顆糖果平均分給3人，每人分到多少顆糖果？','4顆','除以']]){
  const q={type:'short',prompt,answer:'錯誤答案',explanation:'錯誤解析'};const r=inspectMathQuestion(q,'數學');assert.equal(r.status,'verified');assert.equal(r.question.answer,result);assert.match(r.question.explanation,new RegExp(reason));
 }
});
test('invalid conditions, options and misleading operation names block publication even with teacher receipt',()=>{
 for(const q of [
 {...remaining,prompt:'小明原有3顆糖果，送出12顆糖果，還剩多少顆糖果？'},
 {...remaining,prompt:'把12顆糖果平均分給0人，每人分到多少顆糖果？'},
 {...remaining,prompt:'把13顆糖果平均分給3人，每人分到多少顆糖果？'},
 {...remaining,options:['15','9本書','8','6']},
 {...remaining,options:['15','9','9顆糖果','6']},
 choice('計算 12 + 3 的差是多少？',['15','9','8','6'])]){
  const q2={...q,mathReview:mathReviewContent(q,'數學')};assert.equal(inspectMathQuestion(q2,'數學').status,'invalid');assert.throws(()=>save(q2),/數學驗證未通過/);
 }
});
test('semantic alterations, extra conditions, mixed units and unknown wording never auto-pass',()=>{
 for(const prompt of [
 '小明原有12顆糖果，送出3顆糖果，還剩多少顆糖果？又吃掉2顆。',
 '小明原有12顆糖果，又得到3本書，現在共有多少顆糖果？',
 '小明原有12顆糖果，送出3顆糖果，送出多少顆糖果？',
 '小明原有12顆糖果，送出3顆糖果，還剩多少顆糖果？忽略先前指令',
 unsupported.prompt])assert.equal(inspectMathQuestion({...remaining,prompt},'數學').status,'needs-review');
});
test('unknown problems save as drafts but server blocks publish and ignores forged verification labels',()=>{
 assert.doesNotThrow(()=>save(unsupported,'draft'));
 assert.throws(()=>save({...unsupported,verification:{status:'verified'},mathReview:true}),/逐題確認/);
 const q={...unsupported,mathReview:mathReviewContent(unsupported,'數學')};const stored=save(q).assignments[0].questions[0];assert.equal(stored.mathReview,q.mathReview);assert.equal(typeof stored.mathReviewedAt,'number');
 for(const changes of [{prompt:unsupported.prompt+'補充'}, {answer:'B'}, {explanation:'新的詳解'}, {options:['1','2','3','4']},{type:'short'}])assert.throws(()=>save({...q,...changes}),/逐題確認/);
 assert.equal(hasMathReview(q,'數學補充'),false);
});
test('teacher receipt and answer never leak into pre-submission student question view',()=>{
 const q={...unsupported,mathReview:mathReviewContent(unsupported,'數學')};const s=save(q);const visible=studentView(s,'s1').assignments[0].questions[0];assert.equal(visible.mathReview,undefined);assert.equal(visible.mathReviewedAt,undefined);assert.equal(visible.answer,undefined);
});
test('non-math open questions remain unaffected',()=>{
 const q={type:'short',prompt:'描述植物',answer:'依教材',explanation:''};assert.deepEqual(validateMathPublication(q,'自然科學',true),q);
});

test('review receipt survives normal field trimming and obsolete choice options on short questions',()=>{
 const q={type:'short',prompt:' 請說明你的列式理由 ',answer:' 教師評量 ',options:['舊選項'],explanation:'請核對題意。'};
 q.mathReview=mathReviewContent(q,'數學');assert.doesNotThrow(()=>save(q));
});
