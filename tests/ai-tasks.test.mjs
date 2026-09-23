import test from 'node:test';import assert from 'node:assert/strict';import{questionCount,questionsSchema,gradingPrompt,parseGrading}from'../functions/ai-tasks.mjs';
const q={questions:[{type:'choice',answer:'A'},{type:'short',prompt:'說明分數',answer:'等分'}]},sub={answers:['A','小宇說是等分，mail@example.com']};
const response=()=>({items:[{questionIndex:2,score:60,feedback:'請補上分母意義',evidence:'提到等分'}],summary:'理解等分',strengths:'知道等分',gaps:'尚未說明分母',nextSteps:'畫出等分圖',studentFeedback:'你知道等分的意思，試著再畫一張圖。'});
test('question count accepts 1–20 and rejects invalid values',()=>{for(const n of [1,5,20]){assert.equal(questionCount(n),n);assert.equal(questionsSchema(n).properties.questions.maxItems,n)}for(const n of [0,21,1.5,'5',null])assert.throws(()=>questionCount(n));assert.equal(questionCount(),3)});
test('grading uses answer evidence and removes names and emails',()=>{const prompt=gradingPrompt(q,sub,[{name:'小宇'}]);assert.ok(!prompt.includes('小宇'));assert.ok(!prompt.includes('mail@example.com'));assert.ok(prompt.includes('等分'));assert.throws(()=>gradingPrompt({questions:[q.questions[0]]},sub))});
test('grading calculates mixed assignment total and does not invent missing scores',()=>{let r=response();assert.equal(parseGrading(JSON.stringify(r),q,sub).score,80);r.items[0].score=null;assert.equal(parseGrading(JSON.stringify(r),q,sub).score,null)});
test('grading rejects wrong question, duplicate rows and invalid scores',()=>{for(const edit of [r=>r.items[0].questionIndex=1,r=>r.items.push(r.items[0]),r=>r.items[0].score=101,r=>r.items[0].score='60',r=>r.items[0].evidence='']){const r=response();edit(r);assert.throws(()=>parseGrading(JSON.stringify(r),q,sub))}});

test('analysis produces distinct teacher and student versions and rejects teacher greetings in student text',async()=>{
 const {analysisSchema,analysisPrompt,parseAnalysis}=await import('../functions/ai-tasks.mjs');
 const prompt=analysisPrompt({...q,grade:'國小三年級'},sub,[{name:'小宇'}]);assert.ok(prompt.includes('國小三年級'));assert.ok(prompt.includes('150–300'));assert.ok(!prompt.includes('小宇'));assert.ok(!prompt.includes('mail@example.com'));assert.deepEqual(analysisSchema.required,['analysis','studentFeedback']);
 const good={analysis:'教師分析：觀念缺口',studentFeedback:'你已經知道等分，試著畫出兩份。'};assert.deepEqual(parseAnalysis(JSON.stringify(good)),good);
 for(const value of [{analysis:'報告'}, {...good,studentFeedback:'教師您好，以下為報告'}, {...good,studentFeedback:'該位學生已掌握'}, {...good,studentFeedback:''}])assert.throws(()=>parseAnalysis(JSON.stringify(value)));
});

test('grading keeps teacher summary out of student feedback and rejects report-style drafts',()=>{
 const r=response();r.summary='已掌握概念：學生能掌握等分。觀念缺口：缺少例子';const g=parseGrading(JSON.stringify(r),q,sub);assert.equal(g.feedback,r.studentFeedback);assert.equal(g.feedbackFormat,'student-v1');assert.ok(!g.feedback.includes('觀念缺口'));
 for(const field of ['studentFeedback','item']){const bad=response();if(field==='item')bad.items[0].feedback='具體證據：學生能掌握';else bad.studentFeedback='已掌握概念：學生能掌握';assert.throws(()=>parseGrading(JSON.stringify(bad),q,sub))}
 const prompt=gradingPrompt(q,sub);assert.ok(prompt.includes('起初領先、後來落後'));assert.ok(prompt.includes('參考答案不等於唯一可接受答案'));
});
