import {GRADES} from '../functions/domain.mjs';
import {questionKind} from '../functions/question-scope.mjs';
import {createHash} from 'node:crypto';
import {curriculumCatalog as catalog,curriculumTopics,sameCurriculumSubject} from './curriculum-catalog.mjs';
import {preparedLibraryRows} from './web-question-library.mjs';
const kinds=['choice','short','application','work'];
const unique=rows=>[...new Map(rows.map(r=>[createHash('sha256').update(JSON.stringify([r.question.type,r.question.prompt.normalize('NFKC').replace(/\s/g,''),r.question.options||[]])).digest('hex'),r])).values()];
const countKinds=rows=>Object.fromEntries(kinds.map(k=>[k,rows.filter(r=>questionKind(r.question)===k).length]));
export function curriculumCoverage(db,{grade=3,subject='',query='',page=0,target=36}={}){
 if(!Number.isInteger(page)||page<0||!Number.isInteger(target)||target<1||target>200)throw Error('每單元規劃需求需為 1–200 題');
 const selected=curriculumTopics({grade,subject,query}),allTopics=curriculumTopics({grade});
 const rows=db.prepare('SELECT record FROM question_bank WHERE grade=?').all(GRADES[grade-3]).map(r=>JSON.parse(r.record));
 const library=preparedLibraryRows().filter(r=>r.record.grade===GRADES[grade-3]);
 const subjects=[...new Set([...catalog.sources.filter(s=>s.subject).map(s=>s.subject),...catalog.topics.map(t=>t.subject),...rows.map(r=>r.subject),...library.map(r=>r.record.subject)])].filter(s=>s!=='科技'||grade>=7);
 const stats=t=>{
  const matched=rows.filter(r=>r.curriculumTopicIds?.includes(t.id)&&sameCurriculumSubject(t.subject,r.subject));
  const approved=unique(matched.filter(r=>r.status==='approved')),pending=unique(matched.filter(r=>r.status==='pending'));
  const candidates=library.filter(r=>r.record.curriculumTopicIds?.includes(t.id));
  return {...t,candidates:{ready:candidates.filter(r=>r.status==='prepared').length,activities:candidates.filter(r=>r.status==='draft').length,issues:candidates.filter(r=>r.status==='needs-check').length},counts:{approved:approved.length,pending:pending.length,byType:countKinds(approved),byDifficulty:Object.fromEntries([...new Set(approved.map(r=>r.difficulty))].map(d=>[d,approved.filter(r=>r.difficulty===d).length]))},target,shortage:Math.max(0,target-approved.length),coverageStatus:t.status==='needs-language-scope'?'needs-language-scope':approved.length>=target?'quantity-target-met':approved.length?'partial':'empty'};
 };
 const full=allTopics.map(stats);
 const matrix=subjects.map(s=>{
  const bank=rows.filter(r=>sameCurriculumSubject(s,r.subject)),items=full.filter(t=>sameCurriculumSubject(s,t.subject)),source=library.filter(r=>sameCurriculumSubject(s,r.record.subject));
  const approved=unique(bank.filter(r=>r.status==='approved'));
  return {subject:s,approved:approved.length,pending:unique(bank.filter(r=>r.status==='pending')).length,unmapped:bank.filter(r=>r.status!=='retired'&&!r.curriculumTopicIds?.length).length,byType:countKinds(approved),planningTopics:items.length,quantityMet:items.filter(t=>t.coverageStatus==='quantity-target-met').length,shortage:items.reduce((n,t)=>n+t.shortage,0),standardCodes:catalog.standards.filter(t=>t.grades.includes(grade)&&sameCurriculumSubject(s,t.subject)).length,packagedPrepared:source.filter(r=>r.status==='prepared').length,packagedDrafts:source.filter(r=>r.status==='draft').length,packagedIssues:source.filter(r=>r.status==='needs-check').length,status:'coverage-not-verified'};
 });
 const topics=selected.map(stats),safePage=Math.min(page,Math.max(0,Math.ceil(topics.length/20)-1));
 return {basis:catalog.basis,completeCoverage:false,grade,target,matrix,topics:topics.slice(safePage*20,safePage*20+20),total:topics.length,page:safePage,sources:catalog.sources,notice:'僅計入明確對應本單元且已核准的本機題目；題型分開計算。達到題量目標不代表考點、難度或內容品質已完整驗收。國中年級分配為跨版本編輯規劃，語種未定者維持缺口。隨附候選題與來源連結不計入可出題量。'};
}
