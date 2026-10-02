import {readFileSync} from 'node:fs';
import {GRADES} from '../functions/domain.mjs';
import {subjectKey} from '../functions/question-scope.mjs';
const read=name=>JSON.parse(readFileSync(new URL('./library/'+name,import.meta.url),'utf8'));
const elementary=read('curriculum-catalog.json'),junior=read('junior-topic-plan.json');
export const curriculumCatalog={...elementary,topics:[...elementary.topics,...junior.topics],sources:[...elementary.sources,junior.source]};
export const sameCurriculumSubject=(a,b)=>subjectKey(a)===subjectKey(b)||(a==='科技'&&['資訊科技','生活科技'].includes(b));
export function curriculumTopics({grade=3,subject='',query=''}={}){
 if(!Number.isInteger(grade)||grade<3||grade>9||typeof subject!=='string'||subject.length>50||typeof query!=='string'||query.length>100)throw Error('請確認課綱篩選條件');
 const needle=query.normalize('NFKC').toLowerCase();
 return curriculumCatalog.topics.filter(t=>t.grades.includes(grade)&&(!subject||sameCurriculumSubject(subject,t.subject))&&(!needle||[t.name,t.description,...t.contentCodes].join(' ').normalize('NFKC').toLowerCase().includes(needle)));
}
export function validateCurriculumMapping(ids,scope){
 if(ids===undefined)return [];
 if(!Array.isArray(ids)||ids.length>5||ids.some(id=>typeof id!=='string'))throw Error('單題最多對應五個課綱單元');
 const available=curriculumTopics({grade:GRADES.indexOf(scope.grade)+3,subject:scope.subject});
 if(ids.some(id=>!available.some(t=>t.id===id&&t.status!=='needs-language-scope')))throw Error('單元對應不符合年級／科目，請重新選擇');
 return [...new Set(ids)];
}
