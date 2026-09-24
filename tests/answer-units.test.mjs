import test from 'node:test';import assert from 'node:assert/strict';
import {checkAnswerUnit} from '../functions/answer-units.mjs';
import {parseGrading,gradingPrompt,analysisPrompt} from '../functions/ai-tasks.mjs';
const q={type:'work',prompt:'書局原有8000本書，賣出3500本書，還剩多少本書？',answer:'4500本書'};
test('numeric match does not excuse wrong or missing unit, including work-type numeric answers',()=>{
 for(const answer of ['4500個','４５００ 個','4,500個','4500']){const r=checkAnswerUnit(q,answer);assert.equal(r.numericCorrect,true);assert.equal(r.expectedAnswer,'4500本');assert.match(r.feedback,/完整答案是 4500本/)}
 for(const answer of ['4500本','4500 本書','４５００本','4,500本','答案：4500本。'])assert.equal(checkAnswerUnit(q,answer),null);
 assert.equal(checkAnswerUnit(q,'450個').numericCorrect,false);
 assert.equal(checkAnswerUnit({...q,answer:'1公尺'},'100公分'),null);
 assert.equal(checkAnswerUnit({...q,answer:'依推理給分'},'4500個'),null);
});
test('AI full credit and contradictory praise are overridden; both unit errors use a one-point penalty',()=>{
 const assignment={subject:'數學',questions:[q]},submission={answers:['4500個']};
 const raw={items:[{questionIndex:1,score:100,feedback:'你全部答對了',evidence:'4500個'}],summary:'全部正確',strengths:'單位完全正確',gaps:'無',nextSteps:'不用練習',studentFeedback:'你全部答對了'};
 const result=parseGrading(JSON.stringify(raw),assignment,submission);
 assert.equal(result.score,99);assert.equal(result.items[0].score,99);assert.equal(result.items[0].unitCheck.kind,'wrong-unit');assert.match(result.feedback,/4500本/);assert.doesNotMatch(JSON.stringify(result),/全部答對|全部正確|單位完全正確/);
 assert.match(gradingPrompt(assignment,submission),/wrong-unit/);assert.match(analysisPrompt(assignment,submission),/wrong-unit/);
});

test('missing and wrong units cost the same one total point for 1, 3, 10 and 20 questions',()=>{
 for(const count of [1,3,10,20])for(const answer of ['4500','4500個'])for(const aiScore of [100,50,null]){
  const assignment={questions:[q,...Array.from({length:count-1},()=>({type:'choice',answer:'A'}))]},submission={answers:[answer,...Array(count-1).fill('A')]};
  const raw={items:[{questionIndex:1,score:aiScore,feedback:'你的作答已核對',evidence:answer}],summary:'核對',strengths:'數值',gaps:'單位',nextSteps:'寫單位',studentFeedback:'記得寫單位'};
  const result=parseGrading(JSON.stringify(raw),assignment,submission);
  assert.equal(result.score,99);assert.equal(result.items[0].score,100-count);assert.equal(result.items[0].unitCheck.deduction,1);assert.match(result.items[0].feedback,/本題扣 1 分/);
 }
});
test('unit handling never invents process credit or turns an incorrect number into near-full marks',()=>{
 const raw={items:[{questionIndex:1,score:100,feedback:'你的作答已核對',evidence:'450個'}],summary:'核對',strengths:'數值',gaps:'單位',nextSteps:'寫單位',studentFeedback:'記得寫單位'};
 assert.equal(parseGrading(JSON.stringify(raw),{questions:[q]},{answers:['450個']}).score,null);
 for(const score of [0,null,50]){
  raw.items[0].score=score;const result=parseGrading(JSON.stringify(raw),{questions:[{...q,prompt:q.prompt+'請說明過程。'}]},{answers:['4500個']});
  assert.equal(result.score,score===null?null:Math.max(0,score-1));
 }
});

test('reported ninth question: bare 2200 misses 元 and loses exactly one total point',()=>{
 const money={type:'short',prompt:'小明原有3400元，花掉1200元，還剩多少元？',answer:'2200元',explanation:'3400 - 1200 = 2200。'};
 for(const answer of ['2200','2,200','２２００','答案：2200。','2200個']){
  const issue=checkAnswerUnit(money,answer);assert.equal(issue.numericCorrect,true);assert.equal(issue.expectedAnswer,'2200元');
  const questions=Array.from({length:10},(_,i)=>i===8?money:{type:'choice',answer:'A'});
  const answers=questions.map((q,i)=>i===8?answer:'A');
  const raw={items:[{questionIndex:9,score:100,feedback:'你答對了',evidence:answer}],summary:'全對',strengths:'計算',gaps:'無',nextSteps:'繼續練習',studentFeedback:'你都答對了'};
  const result=parseGrading(JSON.stringify(raw),{questions},{answers});assert.equal(result.score,99);assert.equal(result.items[0].score,90);assert.match(result.items[0].feedback,/2200元/);assert.match(result.feedback,/本題扣 1 分/);
 }
 for(const answer of ['2200元','2,200 元','2200圓','2200塊錢'])assert.equal(checkAnswerUnit(money,answer),null);
 assert.equal(checkAnswerUnit(money,'220元'),null); // Numeric correctness belongs to the separate grading rule.
});
