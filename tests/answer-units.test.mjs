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
test('AI full credit and contradictory praise are overridden; teacher decides unit penalty',()=>{
 const assignment={subject:'數學',questions:[q]},submission={answers:['4500個']};
 const raw={items:[{questionIndex:1,score:100,feedback:'你全部答對了',evidence:'4500個'}],summary:'全部正確',strengths:'單位完全正確',gaps:'無',nextSteps:'不用練習',studentFeedback:'你全部答對了'};
 const result=parseGrading(JSON.stringify(raw),assignment,submission);
 assert.equal(result.score,null);assert.equal(result.items[0].score,null);assert.equal(result.items[0].unitCheck.kind,'wrong-unit');assert.match(result.feedback,/4500本/);assert.doesNotMatch(JSON.stringify(result),/全部答對|全部正確|單位完全正確/);
 assert.match(gradingPrompt(assignment,submission),/wrong-unit/);assert.match(analysisPrompt(assignment,submission),/wrong-unit/);
});
