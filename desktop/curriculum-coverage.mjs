import {readFileSync} from 'node:fs';
import {GRADES} from '../functions/domain.mjs';
import {subjectKey} from '../functions/question-scope.mjs';
const catalog=JSON.parse(readFileSync(new URL('./library/curriculum-catalog.json',import.meta.url),'utf8'));
export function curriculumCoverage(db,{grade=3,subject='',query='',page=0}={}){
 if(!Number.isInteger(grade)||grade<3||grade>9||typeof subject!=='string'||subject.length>50||typeof query!=='string'||query.length>100||!Number.isInteger(page)||page<0)throw Error('請確認課綱篩選條件');
 const subjects=[...new Set([...catalog.sources.filter(s=>s.subject).map(s=>s.subject),...catalog.topics.map(t=>t.subject)])];
 const counts=db.prepare('SELECT subject,status,count(*) n FROM question_bank WHERE grade=? GROUP BY subject,status').all(GRADES[grade-3]);
 const matrix=subjects.map(s=>({subject:s,approved:counts.filter(r=>subjectKey(r.subject)===subjectKey(s)&&r.status==='approved').reduce((n,r)=>n+r.n,0),pending:counts.filter(r=>subjectKey(r.subject)===subjectKey(s)&&r.status==='pending').reduce((n,r)=>n+r.n,0),planningTopics:catalog.topics.filter(t=>t.grades.includes(grade)&&subjectKey(t.subject)===subjectKey(s)).length,standardCodes:catalog.standards.filter(t=>t.grades.includes(grade)&&subjectKey(t.subject)===subjectKey(s)).length,status:'coverage-not-verified'}));
 const needle=query.normalize('NFKC').toLowerCase();const topics=catalog.topics.filter(t=>t.grades.includes(grade)&&(!subject||subjectKey(t.subject)===subjectKey(subject))&&(!needle||[t.name,t.description,...t.contentCodes].join(' ').normalize('NFKC').toLowerCase().includes(needle)));
 const safePage=Math.min(page,Math.max(0,Math.ceil(topics.length/20)-1));return {basis:catalog.basis,completeCoverage:false,grade,matrix,topics:topics.slice(safePage*20,safePage*20+20),total:topics.length,page:safePage,sources:catalog.sources,notice:'科目題數不代表單元完整覆蓋。課綱代碼尚未逐項人工核對，社群主題僅供規劃；國中目前只有代碼索引，尚未完成通用單元與題目對應。'};
}
