// Publish only reviewed-by-parser AI preparation, never teacher approvals or credentials.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const progress=JSON.parse(readFileSync(resolve(root,process.argv[2]||'work/library-preparation-progress.json'),'utf8'));
const sources=JSON.parse(readFileSync(resolve(root,'desktop/library/staging-questions.json'),'utf8')).records;
const seen=new Set();
for(const r of progress.records){const source=sources.find(s=>s.id===r.id);if(!source||seen.has(r.id)||!['prepared','needs-check'].includes(r.status)||r.record.status||r.record.question.prompt!==source.question.prompt||JSON.stringify(r.record.question.options)!==JSON.stringify(source.question.options)||r.record.question.answer!==source.question.answer)throw Error('Preparation changed source identity, wording, answer or status');seen.add(r.id);const conclusions=[...(r.record.question.explanation||'').matchAll(/(?:故|因此|所以|正確答案|答案)(?:[為是應選項\s：:（）()]*)([ABCD])(?:[。．.，、）)\s]|$)/g)].map(m=>m[1]);if(conclusions.some(a=>a!==r.aiSuggestedAnswer)){r.status='needs-check';r.issue='詳解結論與AI答案欄不一致，需核對'}}
const records=progress.records.slice().sort((a,b)=>sources.findIndex(s=>s.id===a.id)-sources.findIndex(s=>s.id===b.id));
const result={format:'learning-claw-prepared-v1',preparedAt:new Date().toISOString(),model:'gemini-3.5-flash-lite',sourceSha256:createHash('sha256').update(readFileSync(resolve(root,'desktop/library/staging-questions.json'))).digest('hex'),notice:'AI 建議分類與詳解，尚未經教師審核；來源答案保留，疑義題不得自動匯入。',records};
const stats={processedQuestions:records.length,preparedQuestions:records.filter(r=>r.status==='prepared').length,disputedQuestions:records.filter(r=>r.status==='needs-check').length};
for(const dir of ['desktop/library','question-banks/web-library']){const path=resolve(root,dir);writeFileSync(resolve(path,'prepared-questions.json'),JSON.stringify(result,null,2)+'\n');const summary=JSON.parse(readFileSync(resolve(path,'summary.json'),'utf8'));Object.assign(summary,stats,{approvedQuestions:0,completeCoverage:false});writeFileSync(resolve(path,'summary.json'),JSON.stringify(summary,null,2)+'\n');}
console.log(JSON.stringify(stats));
