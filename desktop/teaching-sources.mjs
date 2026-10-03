import {readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {GRADES} from '../functions/domain.mjs';
import {subjectKey,topicKey} from '../functions/question-scope.mjs';
const bundled=JSON.parse(readFileSync(new URL('./library/teaching-sources.json',import.meta.url),'utf8'));
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replaceAll('臺','台');
const tokens=x=>[...new Set((norm(topicKey(x)).match(/[\p{Script=Han}]+|[a-z0-9]+/gu)||[]).flatMap(w=>/\p{Script=Han}/u.test(w)?w.length<2?[]:Array.from({length:w.length-1},(_,i)=>w.slice(i,i+2)):[w]))];
const subject=x=>['科技','資訊','資訊科技','科技領域'].includes(x)?'資訊科技':['綜合','綜合活動'].includes(x)?'綜合':subjectKey(x);
export function createTeachingSources(db,{catalog=bundled}={}){
 const historical=new Map();
 if(db){db.exec('CREATE TABLE IF NOT EXISTS teaching_source_snapshots(id TEXT PRIMARY KEY,payload TEXT NOT NULL)');for(const r of db.prepare('SELECT payload FROM teaching_source_snapshots').all()){const rows=JSON.parse(gunzipSync(Buffer.from(r.payload,'base64'),{maxOutputLength:30000000}).toString());for(const row of rows)historical.set(row.id,row)}for(const s of catalog.sources){const rows=catalog.records.filter(r=>r.datasetId===s.id);db.prepare('INSERT OR IGNORE INTO teaching_source_snapshots VALUES (?,?)').run(s.sha256,gzipSync(JSON.stringify(rows)).toString('base64'))}}
 for(const r of catalog.records)historical.set(r.id,r);
 const indexed=catalog.records.map(r=>({...r,terms:new Set(tokens(r.title+' '+r.tags.join(' ')+' '+r.body)),titleNorm:norm(r.title+' '+r.tags.join(' '))}));
 function info(){return {sources:catalog.sources,audit:catalog.audit,counts:Object.fromEntries(['question','knowledge','link'].map(k=>[k,catalog.records.filter(r=>r.kind===k).length])),notice:'官方原題與知識是參考來源，尚未代表逐題適齡或核准。教材連結不作答案依據。'}}
 function compatible(r,scope){const grade=GRADES.indexOf(scope.grade)+3;return grade>=3&&grade<=9&&r.subjects.some(s=>subject(s)===subject(scope.subject))&&(!r.grades.length||r.grades.includes(grade));}
 function search(scope,{queries=[scope.unit||scope.query],limit=12,linksOnly=false}={}){
  if(!GRADES.includes(scope.grade)||typeof scope.subject!=='string'||!Array.isArray(queries)||queries.length>5||queries.some(q=>typeof q!=='string'||q.length>100))throw Error('請提供有效年級、科目與學習目標');
  if(!linksOnly&&(scope.textbook||scope.semester))return []; // These sources do not assert a textbook edition or semester.
  const qs=queries.map(q=>({full:norm(topicKey(q)),tokens:tokens(q)})).filter(q=>q.tokens.length);
  return indexed.filter(r=>compatible(r,scope)&&(linksOnly?r.kind==='link':r.kind!=='link')).map(r=>{const score=Math.max(0,...qs.map(q=>{const overlap=q.tokens.filter(t=>r.terms.has(t)).length/q.tokens.length;return overlap>=.6?overlap+(r.titleNorm.includes(q.full)?2:0):0}));return {...r,score}}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.min(limit,40)).map(({terms,titleNorm,...r})=>r);
 }
 function get(id){const r=historical.get(id);if(!r)throw Error('官方教學來源不存在或版本已遺失，請重新檢索');return r}
 const citation=r=>({id:r.id,revision:1,title:r.title.slice(0,100),source:r.source,url:r.url});
 function resolve(refs,scope){if(!Array.isArray(refs)||!refs.length||refs.length>3||new Set(refs.map(r=>r.id)).size!==refs.length)throw Error('官方教學來源不完整');return refs.map(ref=>{const r=get(ref.id);if(ref.revision!==1||r.kind==='link'||!compatible(r,scope))throw Error('官方教學来源不符合本次教學範圍');return citation(r)})}
 function resolveLink(link,scope){const r=get(link.id);if(r.kind!=='link'||link.snapshot!==r.snapshot||(scope&&!compatible(r,scope)))throw Error('教材來源或學習範圍不符');return {id:r.id,snapshot:r.snapshot,title:r.title,url:r.url,duration:'',license:r.license,source:r.source}}
 return {info,search,get,citation,resolve,resolveLink};
}
