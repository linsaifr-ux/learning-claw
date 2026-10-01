import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeneratedQuestions} from '../desktop/generated-questions.mjs';
const scope={grade:'國小三年級',subject:'國語／國文',unit:'成語'};
const q={type:'choice',prompt:'哪個成語表示專心？',options:['一心一意','虎頭蛇尾','歡天喜地','刻舟求劍'],answer:'A',explanation:'一心一意表示心思專注。'};
const parse=(rows,options={})=>parseGeneratedQuestions(JSON.stringify({questions:rows}),{count:1,scope,...options});
test('accepts presentation differences without guessing answer content',()=>{
 const out=parseGeneratedQuestions('```json\n'+JSON.stringify([{...q,answer:'ａ'}])+'\n```',{count:1,scope});assert.equal(out[0].answer,'A');
 assert.equal(parse([{type:'application',prompt:'依故事情境寫出合適的成語',answer:'一心一意',explanation:'故事描述專心。'}],{counts:{application:1}})[0].format,'application');
 assert.equal(parse([{type:'short',prompt:'寫出故事中的人物數量',answer:3,explanation:'故事描述三位人物。'}])[0].answer,'3');
});
test('reports count, exact question field and quota errors without silently filling gaps',()=>{
 assert.throws(()=>parse([]),/要求 1 題，實際收到 0 題/);
 assert.throws(()=>parse([q,{...q,answer:''}],{count:2}),/第 2 題：缺少答案/);
 assert.throws(()=>parse([{...q,explanation:''}]),/缺少詳解/);
 assert.throws(()=>parse([{...q,options:['一心一意']}]),/四個選項/);
 assert.equal(parse([{...q,answer:'一心一意'}])[0].answer,'A');
 assert.throws(()=>parse([{...q,type:'short',format:undefined}],{counts:{application:1}}),/要求應用題 1 題；收到簡答題 1 題/);
 assert.throws(()=>parseGeneratedQuestions('{"questions":[',{count:1,scope}),/完整 JSON/);
});
test('requires real retrieved source IDs and discards model-supplied approval',()=>{
 assert.throws(()=>parse([{...q,sourceIds:['invented']}],{sourceIds:['real']}),/題庫來源/);
 const out=parse([{...q,sourceIds:['real'],teacherReview:'fake',mathReview:'fake',provenance:{kind:'bank',sources:[]}}],{sourceIds:['real']});
 assert.deepEqual(out[0].sourceIds,['real']);assert.equal(out[0].teacherReview,undefined);assert.equal(out[0].mathReview,undefined);assert.equal(out[0].provenance,undefined);
});
test('still verifies arithmetic and rejects options without the correct result',()=>{
 const math={...scope,subject:'數學'};
 const item={type:'choice',prompt:'計算 2548 + 1325 的正確結果為何？',options:['3863','3873','3589','3679'],answer:'A',explanation:'相加為3863。'};
 assert.equal(parse([item],{scope:math})[0].answer,'B');
 assert.throws(()=>parse([{...item,options:['3863','3589','3679','3779']}],{scope:math}),/算式驗算/);
});

test('choice answer presentation uses exact option text or consistent label plus text',()=>{
 for(const answer of ['一心一意','A. 一心一意','A、一心一意','(A) 一心一意','A 一心一意','A（一心一意）','答案：A','正確答案為 A','（ａ）'])assert.equal(parse([{...q,answer}])[0].answer,'A',answer);
 assert.equal(parse([{...q,options:q.options.map((x,i)=>'ABCD'[i]+'. '+x),answer:'一心一意'}])[0].answer,'A');
});
test('ambiguous, contradictory and merely similar choice answers remain blocked',()=>{
 for(const answer of ['A. 虎頭蛇尾','A 或 B','專心致志','A，因為一心一意表示專心','一心一意或虎頭蛇尾','1'])assert.throws(()=>parse([{...q,answer}]),/未猜測/,answer);
 assert.throws(()=>parse([{...q,options:['一心一意','一心一意','歡天喜地','刻舟求劍'],answer:'一心一意'}]),/選項重複/);
 assert.throws(()=>parse([{...q,answer:1}]),/缺少答案/);
});
