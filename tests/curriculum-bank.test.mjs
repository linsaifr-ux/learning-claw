import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {createQuestionBank} from '../desktop/question-bank.mjs';import {curriculumCoverage} from '../desktop/curriculum-coverage.mjs';import {curriculumTopics} from '../desktop/curriculum-catalog.mjs';import {preparedLibraryRows,webQuestionLibrary} from '../desktop/web-question-library.mjs';
const seeds=JSON.parse(readFileSync(new URL('../desktop/library/curriculum-seeds.json',import.meta.url))).records;
const gcd=(a,b)=>b?gcd(b,a%b):a;const fraction=(a,b)=>{const d=gcd(a,b);return b/d===1?String(a/d):`${a/d}/${b/d}`};
test('all 756 numeric candidates recompute from the actual question text, not supplied answer metadata',()=>{
 const rows=seeds.filter(r=>r.sourceMeta.calculation);assert.equal(rows.length,756);
 for(const r of rows){const q=r.record.question,p=q.prompt,nums=p.match(/-?\d+/g).map(Number),[a,b,c]=nums;let answer;
 switch(r.sourceMeta.calculation.op){
 case 'add':assert.match(p,/計算.*\+/);answer=a+b;break;
 case 'mul':assert.match(p,/×|長方形|相似三角形/);answer=p.includes('相似三角形')?a/b*c:a*b;break;
 case 'div':assert.match(p,/÷|平均分|平均速率/);answer=p.includes('速率')?b/a:a/b;break;
 case 'triangle':assert.match(p,/底為.*對應的高/);answer=a*b/2;break;
 case 'volume':assert.match(p,/長方體長.*寬.*高/);answer=a*b*c;break;
 case 'fraction':answer=p.includes('機率')?fraction(a,a+b):fraction(a,b);break;
 case 'gcd':assert.match(p,/最大公因數/);answer=gcd(a,b);break;
 case 'linear':assert.match(p,/解方程式/);answer=(c-b)/a;break;
 case 'proportion':assert.match(p,/成正比/);answer=b/a*c;break;
 case 'hypotenuse':assert.match(p,/直角三角形兩股/);answer=Math.sqrt(a*a+b*b);break;
 case 'sequence':assert.match(p,/等差數列/);answer=a+(c-1)*b;break;
 case 'linearValue':assert.match(p,/一次函數/);answer=a*c+b;break;
 case 'quadraticValue':assert.match(p,/二次函數/);answer=a*c*c+b;break;
 default:assert.fail('unknown computation');
 }
 assert.equal(q.answer,String(answer),p);assert(q.explanation.includes(String(answer)),p);if(q.format==='application')assert(q.answerUnit,p);
 }
});
test('all bundled candidate content imports as pending with valid mapping; source answers stay unchanged',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db);for(const row of seeds){const saved=bank.save(row.record);assert.equal(saved.status,'pending');assert.equal(saved.question.answer,row.record.question.answer,row.id);assert(saved.curriculumTopicIds?.length,row.id);assert(saved.source&&saved.rights);}
 assert.equal(bank.list().counts.approved||0,0);assert.equal(new Set(seeds.map(r=>r.id)).size,seeds.length);
 assert(seeds.filter(r=>r.sourceMeta.delivery==='teacher-led').every(r=>r.status==='draft'&&r.sourceMeta.issueCodes.includes('materials')));
 }finally{db.close()}
});
test('coverage counts only explicitly mapped approved rows, rejects incompatible mappings, and retirement removes capacity',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db),input=seeds.find(r=>r.record.grade==='國小三年級'&&r.record.unit==='基礎成語與生活情境'&&r.record.question.type==='choice').record;
 const r=bank.save(input),id=r.curriculumTopicIds[0],filters={grade:3,subject:'國文',query:'成語',target:1};
 let row=curriculumCoverage(db,filters).topics.find(t=>t.id===id);assert.equal(row.counts.approved,0);assert.equal(row.counts.pending,1);assert.equal(row.shortage,1);
 assert.throws(()=>bank.save({...input,grade:'國中三年級'}),/不符合/);assert.throws(()=>bank.save({...input,subject:'英語'}),/不符合/);
 bank.review({id:r.id,revision:r.revision,confirmed:true});const ready=curriculumCoverage(db,filters);row=ready.topics.find(t=>t.id===id);assert.equal(row.counts.approved,1);assert.equal(row.counts.byType.choice,1);assert.equal(row.coverageStatus,'quantity-target-met');assert.equal(ready.completeCoverage,false);
 assert.equal(bank.list({topicId:id}).total,1);bank.retire({id:r.id,revision:r.revision});assert.equal(curriculumCoverage(db,filters).topics.find(t=>t.id===id).counts.approved,0);
 assert.throws(()=>curriculumCoverage(db,{target:0}));assert.throws(()=>curriculumTopics({grade:10}));
 }finally{db.close()}
});
test('the original third-grade idiom request can assemble 8 choices and 2 applications after one-time review, without AI',()=>{
 const db=new DatabaseSync(':memory:');try{const bank=createQuestionBank(db),rows=seeds.filter(r=>r.record.grade==='國小三年級'&&r.record.unit==='基礎成語與生活情境');bank.importRows(rows.map(r=>r.record));
 const scope={grade:'國小三年級',subject:'國文',unit:'能了解基礎成語',material:'選擇題8題，應用題2題',count:10};assert.equal(bank.quickQuestions(scope).questions.length,0);
 for(const r of bank.list().records)bank.review({id:r.id,revision:r.revision,confirmed:true});
 const assembled=bank.quickQuestions(scope);assert.equal(assembled.questions.length,10);assert.equal(assembled.questions.filter(q=>q.type==='choice').length,8);assert.equal(assembled.questions.filter(q=>q.format==='application').length,2);assert(assembled.questions.every(q=>q.teacherReview));
 }finally{db.close()}
});
test('candidate origin and grade filters stay separate from official source indexing and AI preparation progress',()=>{
 const all=preparedLibraryRows();assert.equal(all.length,1479+seeds.length);const r=webQuestionLibrary({kind:'prepared',grade:'國小三年級',subject:'國文',topicId:'lc-idioms-3'});assert.equal(r.total,40);assert(r.records.every(x=>x.preparation.record.grade==='國小三年級'));assert.equal(r.summary.processedQuestions,810);assert.equal(r.summary.approvedQuestions,0);assert.equal(r.summary.originalMathCandidates,756);
});

test('Taiwanese aliases share scope, retain dictionary references and never count as listening coverage',async()=>{
 const {subjectKey}=await import('../functions/question-scope.mjs');
 for(const label of ['臺灣台語（閩南語文）','本土語文（閩南語文）','台語'])assert.equal(subjectKey(label),'臺灣台語');
 assert.notEqual(subjectKey('本土語文（客語文）'),subjectKey('臺灣台語'));
 const rows=seeds.filter(r=>r.sourceMeta.language==='臺灣台語');assert.equal(rows.length,33);
 for(const row of rows){assert.match(row.record.url,/^https:\/\/sutian\.moe\.edu\.tw\//);assert.match(row.sourceMeta.dialect,/不評發音/);assert.equal(row.status,'prepared');assert(row.record.curriculumTopicIds[0].startsWith('lc-taiwanese-'));}
 for(let grade=3;grade<=9;grade++)assert(curriculumTopics({grade,subject:'臺灣台語（閩南語文）'}).some(t=>t.id===`lc-taiwanese-${grade}`));
});
test('unit import is pending, idempotent, grade-scoped and preserves teacher revisions',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{createClassroom}=await import('../desktop/service.mjs');
 const directory=mkdtempSync(join(tmpdir(),'curriculum-unit-')),service=createClassroom({directory,setupCode:'qa'});
 try{const {token}=await service.call('teacherRegister',{email:'unit@example.com',password:'password123',setupCode:'qa'});const call=(operation,data={})=>service.call('questionBank',{operation,...data},token);
 const scope={topicId:'lc-taiwanese-3',filters:{grade:3,subject:'臺灣台語（閩南語文）'}};
 await assert.rejects(call('importCurriculumUnit',{topicId:scope.topicId}));
 await assert.rejects(call('importCurriculumUnit',{...scope,filters:{grade:4}}));
 assert.equal((await call('importCurriculumUnit',scope)).imported,6);
 const first=(await call('list')).records[0];assert.equal(first.status,'pending');
 const changed=(await call('save',{record:{...first,question:{...first.question,explanation:first.question.explanation+' 教師確認語境。'}}})).record;
 await call('review',{id:changed.id,revision:changed.revision,confirmed:true});
 assert.equal((await call('importCurriculumUnit',scope)).imported,0);
 const current=(await call('get',{id:changed.id})).record;assert.equal(current.status,'approved');assert.match(current.question.explanation,/教師確認語境/);
 assert.equal((await call('list')).total,6);
 }finally{service.close();rmSync(directory,{recursive:true,force:true})}
});
