import {readFileSync} from 'node:fs';
import {subjectKey} from '../functions/question-scope.mjs';
let cached;
function library(){if(!cached){const read=name=>JSON.parse(readFileSync(new URL('./library/'+name,import.meta.url),'utf8'));cached={sources:read('sources.json'),questions:read('staging-questions.json').records,summary:read('summary.json')}}return cached}
export function webQuestionLibrary({kind='questions',subject='',grade='',query='',page=0}={}){
 if(!['questions','sources'].includes(kind)||typeof query!=='string'||query.length>100||typeof subject!=='string'||subject.length>40||typeof grade!=='string'||grade.length>20)throw Error('請確認網路題庫篩選條件');
 const data=library(),needle=query.normalize('NFKC').toLowerCase().trim();let rows=kind==='questions'?data.questions:data.sources.resources;
 rows=rows.filter(r=>{if(kind==='questions'){if(subject&&subjectKey(r.subject)!==subjectKey(subject))return false;return !needle||[r.question.prompt,...r.question.options].join(' ').normalize('NFKC').toLowerCase().includes(needle)}
 if(grade&&!r.listings.some(x=>x.grade===Number(grade)))return false;
 if(subject&&!r.listings.some(x=>subjectKey(x.label.split(' ').slice(1).join(' '))===subjectKey(subject)))return false;
 return !needle||r.title.normalize('NFKC').toLowerCase().includes(needle)});
 const total=rows.length,maxPage=Math.max(0,Math.ceil(total/20)-1),safePage=Math.min(maxPage,Math.max(0,Number.isInteger(page)?page:0));
 return {kind,records:rows.slice(safePage*20,safePage*20+20),total,page:safePage,summary:data.summary,portals:data.sources.portals};
}
