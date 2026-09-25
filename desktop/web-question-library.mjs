import {readFileSync} from 'node:fs';
import {subjectKey} from '../functions/question-scope.mjs';
let cached;
function library(){if(!cached){const read=name=>JSON.parse(readFileSync(new URL('./library/'+name,import.meta.url),'utf8'));cached={sources:read('sources.json'),questions:read('staging-questions.json').records,summary:read('summary.json'),prepared:read('prepared-questions.json'),elementary:read('elementary-questions.json')}}return cached}
export function preparedLibraryRows(local=[]){const map=new Map([...library().prepared.records,...library().elementary.records].map(r=>[r.id,r]));for(const r of local)map.set(r.id,r);return [...map.values()]}
export function stagingLibraryRows(){return library().questions}
export function webQuestionLibrary({kind='questions',subject='',grade='',query='',page=0}={},local=[]){
 if(!['questions','sources','prepared','issues'].includes(kind)||typeof query!=='string'||query.length>100||typeof subject!=='string'||subject.length>40||typeof grade!=='string'||grade.length>20)throw Error('請確認網路題庫篩選條件');
 const data=library(),prepared=preparedLibraryRows(local),needle=query.normalize('NFKC').toLowerCase().trim();let rows=kind==='questions'?data.questions:kind==='sources'?data.sources.resources:prepared.filter(r=>kind==='prepared'?r.status==='prepared':r.status==='needs-check').map(r=>({...data.questions.find(s=>s.id===r.id),...(r.id.startsWith('market-')?{id:r.id,subject:r.record.subject,question:r.record.question,sourceUrl:r.record.url,originalRange:'國小三年級',answerOrigin:'整理參考答案（原卷未附答案）'}:{}),preparation:r}));
 rows=rows.filter(r=>{if(kind!=='sources'){if(subject&&subjectKey(r.subject)!==subjectKey(subject))return false;return !needle||[r.question.prompt,...(r.question.options||[])].join(' ').normalize('NFKC').toLowerCase().includes(needle)}
 if(grade&&!r.listings.some(x=>x.grade===Number(grade)))return false;
 if(subject&&!r.listings.some(x=>subjectKey(x.label.split(' ').slice(1).join(' '))===subjectKey(subject)))return false;
 return !needle||r.title.normalize('NFKC').toLowerCase().includes(needle)});
 const total=rows.length,maxPage=Math.max(0,Math.ceil(total/20)-1),safePage=Math.min(maxPage,Math.max(0,Number.isInteger(page)?page:0));
 return {kind,records:rows.slice(safePage*20,safePage*20+20),total,page:safePage,summary:{...data.summary,elementaryQuestions:data.elementary.records.length,processedQuestions:prepared.filter(r=>!r.id.startsWith('market-')).length,preparedQuestions:prepared.filter(r=>r.status==='prepared').length,disputedQuestions:prepared.filter(r=>r.status==='needs-check').length},portals:data.sources.portals};
}
