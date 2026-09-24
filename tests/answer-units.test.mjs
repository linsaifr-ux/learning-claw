import test from 'node:test';import assert from 'node:assert/strict';
import {checkAnswerUnit} from '../functions/answer-units.mjs';
import {parseGrading,gradingPrompt,analysisPrompt} from '../functions/ai-tasks.mjs';
const q={type:'work',prompt:'書局原有8000本書，賣出3500本書，還剩多少本書？',answer:'4500本書'};
test('numeric match does not excuse wrong or missing unit, including work-type numeric answers',()=>{
 for(const answer of ['4500個','４５００ 個','4,500個','4500']){const r=checkAnswerUnit(q,answer);assert.equal(r.numericCorrect,true);assert.equal(r.expectedAnswer,'4500本');assert.match(r.feedback,/完整答案是 4500本/)}
 for(const answer of ['4500本','4500 本書','４５００本','4,500本','答案：4500本。'])assert.equal(checkAnswerUnit(q,answer),null);
 assert.equal(checkAnswerUnit(q,'450個').numericCorrect,false);
 assert.equal(checkAnswerUnit({...q,prompt:'填入距離',answer:'1公尺'},'100公分'),null);
 assert.equal(checkAnswerUnit({...q,answer:'依推理給分'},'4500個').kind,'needs-review');
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

test('all explicit units enter missing-unit checks without a noun allow-list',()=>{
 for(const unit of ['包','瓶','隻','公尺','km','平方公分','m²','立方公尺','毫升','mL','公斤','秒','小時','度','°C','%','公尺/秒','自訂單位','widgets','constructor','toString']){
  const issue=checkAnswerUnit({type:'short',prompt:'填入答案',answer:'12'+unit},'12');assert.equal(issue?.kind,'missing-unit',unit);assert.equal(issue.numericCorrect,true,unit);
 }
 for(const [reference,answer] of [['0.5公升','0.50'],['1/2公升','0.5'],['1e3公尺','1000']])assert.equal(checkAnswerUnit({type:'short',answer:reference},answer).numericCorrect,true);
});
test('equivalent units and exact decimals/fractions do not receive unit penalties',()=>{
 for(const [reference,answer] of [['1公尺','100公分'],['1公斤','1000g'],['1公升','1000mL'],['1m²','10000cm^2'],['1立方公尺','1000公升'],['1小時','60分鐘'],['10公尺/秒','36公里/小時'],['0.5公升','1/2公升'],['50%','500‰'],['12瓶水','12瓶'],['12widgets','12widgets']])assert.equal(checkAnswerUnit({type:'short',answer:reference},answer),null,reference+' vs '+answer);
});
test('explicit required unit overrides equivalent conversion; prompt inference and no-unit instructions work',()=>{
 const short={type:'short',prompt:'請以公尺為單位。',answer:'1公尺'};
 assert.equal(checkAnswerUnit(short,'100公分').kind,'wrong-unit');assert.equal(checkAnswerUnit(short,'100公分').numericCorrect,true);
 assert.equal(checkAnswerUnit({...short,prompt:'總長多少公尺？'},'100公分').kind,'wrong-unit');
 assert.equal(checkAnswerUnit({...short,answer:'1m'},'1公尺'),null);
 assert.equal(checkAnswerUnit({...short,prompt:'請填答案',answerUnit:'公尺'},'100公分').kind,'wrong-unit');
 assert.equal(checkAnswerUnit({type:'short',prompt:'共有多少瓶水？',answer:'12'},'12').expectedUnit,'瓶');
 assert.equal(checkAnswerUnit({type:'short',prompt:'共有多少瓶水？只填數字。',answer:'12瓶'},'12'),null);
});
test('ambiguous or mixed answers and incompatible author metadata never silently pass',()=>{
 for(const [question,answer] of [[{type:'short',answer:'1公尺'},'1公尺20公分'],[{type:'short',answer:'1公尺'},'我的解法如下'],[{type:'short',answer:'1不明單位'},'1另一單位'],[{type:'short',answer:'1公尺',answerUnit:'公斤'},'1公斤']])assert.equal(checkAnswerUnit(question,answer).kind,'needs-review');
});
test('verified conversion overrides an AI false negative; unparseable response cannot keep full credit',()=>{
 const question={type:'short',answer:'1公尺'},raw={items:[{questionIndex:1,score:0,feedback:'你的單位錯了',evidence:'100公分'}],summary:'單位錯',strengths:'數字',gaps:'單位錯',nextSteps:'核對',studentFeedback:'你的單位錯了'};
 const converted=parseGrading(JSON.stringify(raw),{questions:[question]},{answers:['100公分']});assert.equal(converted.score,100);assert.doesNotMatch(converted.feedback,/你的單位錯了/);
 raw.items[0].score=100;const uncertain=parseGrading(JSON.stringify(raw),{questions:[question]},{answers:['1公尺20公分']});assert.equal(uncertain.score,null);assert.match(uncertain.feedback,/無法由程式完整確認/);
});

test('unsupported numeric reference unit formats are flagged instead of silently skipped',()=>{
 assert.equal(checkAnswerUnit({type:'short',answer:'$2200'},'2200').kind,'missing-unit');
 assert.equal(checkAnswerUnit({type:'short',answer:'12m·s⁻¹'},'12').kind,'missing-unit');
 assert.equal(checkAnswerUnit({type:'short',answer:'10（平方公尺）'},'10').kind,'missing-unit');
});
