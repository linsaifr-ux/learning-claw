import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';import {createQuestionBank} from '../desktop/question-bank.mjs';
const root=new URL('../',import.meta.url),read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const base=read('work/source-processing/source-drafts.json');const progressPath=new URL('work/source-processing/ai-progress.json',root);const ai=existsSync(progressPath)?JSON.parse(readFileSync(progressPath,'utf8')).records:[];
const map=new Map(base.records.map(r=>[r.id,r]));for(const r of ai){if(!map.has(r.id))throw Error('AI來源ID不符');map.set(r.id,r)}
const db=new DatabaseSync(':memory:');const bank=createQuestionBank(db);const records=[];
for(const r of map.values()){
 r.record.originLibraryId=r.id;
 if(['draft','prepared'].includes(r.status))try{const saved=bank.save(r.record);if(saved.question.answer!==r.record.question.answer)throw Error('格式檢查改變來源答案');}catch(e){r.status='needs-check';r.issue='格式檢查未通過：'+e.message}
 records.push(r);
}db.close();
const audits=read('work/source-processing/pdf-processing-audit.json');const papers=audits.map(a=>({id:a.sha256,title:a.title,url:a.url,pages:a.pages,status:a.status,parsedQuestions:a.candidateIds.length,heldBlocks:a.blocks.filter(b=>b.reason).length,reason:a.reason||'',reasons:[...new Set(a.blocks.map(b=>b.reason).filter(Boolean))],rights:a.rights}));
const count=status=>records.filter(r=>r.status===status).length;
const data={format:'learning-claw-supplement-v1',permissionRecordedAt:'2026-09-26',permissionBasis:'使用者確認本專案可授權使用；非發布者新授權聲明',records,papers,summary:{sourceMathQuestions:400,schoolTextQuestions:records.filter(r=>r.sourceMeta.kind==='school-pdf').length,prepared:count('prepared'),drafts:count('draft'),issues:count('needs-check'),pdfFiles:papers.length,pdfPages:papers.reduce((a,p)=>a+p.pages,0),heldPdfBlocks:papers.reduce((a,p)=>a+p.heldBlocks,0),approved:0,completeCoverage:false}};
for(const folder of ['desktop/library','question-banks/web-library'])writeFileSync(new URL(folder+'/supplemental-questions.json',root),JSON.stringify(data,null,2)+'\n');
writeFileSync(new URL('question-banks/source-discovery/processing-summary.json',root),JSON.stringify({...data.summary,papers,permissionBasis:data.permissionBasis},null,2)+'\n');
console.log(JSON.stringify(data.summary));
