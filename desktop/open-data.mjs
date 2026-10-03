import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {GRADES} from '../functions/domain.mjs';
import {cleanDataEvidence,cleanResourceLinks} from '../functions/open-data.mjs';
const bundled=JSON.parse(readFileSync(new URL('./library/open-data.json',import.meta.url),'utf8'));
export function createOpenDataService(db,{fetchImpl=fetch}={}){
let catalog=bundled;const archives=new Map();
const decode=value=>JSON.parse(value.startsWith('gz:')?gunzipSync(Buffer.from(value.slice(3),'base64'),{maxOutputLength:30000000}).toString('utf8'):value);
const remember=c=>{for(const source of c.sources)archives.set(source.sha256,c)};remember(bundled);
if(db){db.exec('CREATE TABLE IF NOT EXISTS open_data_snapshots(id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS open_data_active(id INTEGER PRIMARY KEY CHECK(id=1),snapshot_id TEXT NOT NULL)');for(const r of db.prepare('SELECT payload FROM open_data_snapshots').all())remember(decode(r.payload));const r=db.prepare('SELECT payload FROM open_data_snapshots WHERE id=(SELECT snapshot_id FROM open_data_active WHERE id=1)').get();if(r)catalog=decode(r.payload);}

const fail=m=>{throw Error(m)};
const norm=s=>String(s||'').normalize('NFKC').replace(/臺/g,'台').trim();
const subjectNames={'國語／國文':'國語文','國語':'國語文','國文':'國語文','英語':'英語文','英文':'英語文','社會':'社會領域','藝術':'藝術領域','自然':'自然科學','健體':'健康與體育','綜合':'綜合活動','資訊科技':'科技領域','生活科技':'科技領域','本土語文（閩南語文）':'閩南語'};
let schools=new Map(catalog.schools.map(s=>[s.id,s]));let media=new Map(catalog.resources.map(r=>[r.id,r]));
function selection({year=115,stage='primary',counties,snapshot}={}){if(!Number.isInteger(year)||!['primary','junior'].includes(stage))fail('請選擇有效學年度及學制');const chosen=snapshot?archives.get(snapshot):catalog;if(!chosen)fail('找不到原始資料快照');const rows=chosen.schools.filter(s=>s.year===year&&s.stage===stage);if(!rows.length)fail('此學制尚未收錄該學年度，請選擇其他年度');if(counties&&(!Array.isArray(counties)||counties.length!==2||counties[0]===counties[1]||counties.some(c=>!rows.some(r=>r.county===c))))fail('請選擇兩個不同且有資料的縣市');return rows}
function openDataInfo(){return {sources:catalog.sources,year:115,years:{primary:[...new Set(catalog.schools.filter(s=>s.stage==='primary').map(s=>s.year))].sort((a,b)=>b-a),junior:[...new Set(catalog.schools.filter(s=>s.stage==='junior').map(s=>s.year))].sort((a,b)=>b-a)},counties:[...new Set(catalog.schools.map(s=>s.county))].sort(),resourceCount:media.size,notice:'官方名錄及影音清單快照；清單不是完整題庫，學校選擇不是身分驗證。'}}
function searchSchools(input={}){if(typeof(input.query??'')!=='string'||(input.query||'').length>80)fail('校名請在80字以內');const rows=selection(input).filter(s=>(!input.county||s.county===input.county)&&norm(s.name).includes(norm(input.query)));return {total:rows.length,records:rows.slice(0,40)}}
function resolveSchool(context){if(!context||context.mode==='unspecified')return {mode:'unspecified'};if(context.mode==='mixed')return {mode:'mixed'};if(context.mode!=='school'||!schools.has(context.id))fail('學校不在此版官方名錄，請重新選擇');return {mode:'school',...schools.get(context.id)}}
function searchResources({grade,subject,query=''}={}){
 if(!GRADES.includes(grade)||typeof subject!=='string'||!subject.trim()||typeof query!=='string'||query.length>100||!query.trim())fail('請提供年級、科目及100字內的學習概念');
 const stage=GRADES.indexOf(grade)<2?'二':GRADES.indexOf(grade)<4?'三':'四',wanted=subjectNames[subject]||subject;
 const clean=norm(query),tokens=[...new Set([clean,...clean.split(/[\s、,，]+/)].filter(x=>x.length>=1))];
 const rows=catalog.resources.filter(r=>r.stages.includes(stage)&&r.subjects.includes(wanted)&&!/教師專業|教師研習|教學研究|專業學習社群/.test(r.title)).map(r=>{const full=norm(r.title+' '+r.keywords+' '+r.description+' '+r.content),score=tokens.reduce((n,t)=>n+(norm(r.title).includes(t)?4:0)+(full.includes(t)?1:0),0);return {...r,score}}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {total:rows.length,records:rows.slice(0,12).map(r=>({...r,reason:'來源標示符合學習階段與領域，關鍵字吻合；請預覽教材核對本次目標。'})),notice:'僅檢索公開描述及課綱欄位；不代表已核對影片內容。無符合項目時不放寬年級與科目。'};
}
function resolveLinks(links,scope){return cleanResourceLinks(links).map(l=>{const r=archives.get(l.snapshot)?.resources.find(r=>r.id===l.id&&r.snapshot===l.snapshot);if(!r)fail('教材來源版本已變更，請重新選擇');if(scope){const index=GRADES.indexOf(scope.grade),stage=index<2?'二':index<4?'三':'四';if(index<0||!r.stages.includes(stage)||!r.subjects.includes(subjectNames[scope.subject]||scope.subject)||/教師專業|教師研習|教學研究|專業學習社群/.test(r.title))fail('教材與目前年級或科目不符，請移除後重新搜尋');}return cleanResourceLinks([r])[0]})}
function dataQuestions(input){
 const {year=115,stage='primary',counties,snapshot}=input;const rows=selection({year,stage,counties,snapshot});if(!counties)fail('請選擇兩個縣市');
 const counts=counties.map(c=>rows.filter(r=>r.county===c).length),datasetId=stage==='primary'?'6087':'6088',source=(snapshot?archives.get(snapshot):catalog).sources.find(s=>s.id===datasetId);
 const table=`資料：教育部${stage==='primary'?'國民小學':'國民中學'}名錄，${year}學年度。\n${counties[0]}：${counts[0]}筆；${counties[1]}：${counts[1]}筆。\n本題計算所選名錄的筆數，不含另列的附設學部，不代表學生人數。`;
 return ['sum','difference','comparison'].map((template,i)=>{
  const prompt=table+'\n'+['兩個縣市合計有多少筆名錄資料？請寫出數量與單位「筆」。','兩個縣市的名錄筆數相差多少筆？請寫出數量與單位「筆」。','哪個說法可由表中資料直接確認？'][i];
  const value=i===0?counts[0]+counts[1]:Math.abs(counts[0]-counts[1]);
  const correct=counts[0]===counts[1]?'兩個縣市的名錄筆數相同。':`${counts[0]>counts[1]?counties[0]:counties[1]}的名錄筆數較多。`;
  const options=['名錄筆數較多表示教學品質一定比較好。','名錄筆數可以直接當作學生人數。','只看這份名錄就能確定每校學生的成績。',correct];
  const answerIndex=(counts[0]+counts[1])%4;[options[answerIndex],options[3]]=[options[3],options[answerIndex]];
  return {type:i===2?'choice':'short',...(i===2?{options,answer:'ABCD'[answerIndex]}:{format:'application',answer:String(value),answerUnit:'筆'}),prompt,explanation:i===0?`${counts[0]} + ${counts[1]} = ${value}，合計 ${value} 筆。`:i===1?`${Math.max(...counts)} − ${Math.min(...counts)} = ${value}，相差 ${value} 筆。`:`比較 ${counties[0]} ${counts[0]} 筆與 ${counties[1]} ${counts[1]} 筆，可知${correct}名錄未提供學生人數、成績與教學品質，不能推論這些資訊。`,dataEvidence:{version:1,template,year,stage,counties,snapshot:source.sha256},provenance:{kind:'data',sources:[{id:datasetId,revision:1,title:'官方名錄資料模板（非 AI 生成）',source:'教育部統計處',url:source.url}]}};
 });
}
function assertDataQuestion(question){if(!question.dataEvidence)return;const e=cleanDataEvidence(question.dataEvidence);const expected=dataQuestions(e).find(q=>q.dataEvidence.template===e.template);if(expected.dataEvidence.snapshot!==e.snapshot)fail('開放資料版本不符');const same=['type','prompt','explanation','answerUnit','format'].every(k=>(expected[k]||'')===(question[k]||''));const correct=q=>q.type==='choice'?q.options?.['ABCD'.indexOf(q.answer)]:q.answer;const options=q=>JSON.stringify([...(q.options||[])].sort());if(!same||correct(expected)!==correct(question)||options(expected)!==options(question))fail('資料題內容已變更，無法沿用來源驗證；請重新建立資料題，或移除資料驗證後作為教師自訂題核對');}

function persist(next){const id=createHash('sha256').update(JSON.stringify(next.sources.map(s=>[s.id,s.sha256]))).digest('hex');if(db){db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT OR REPLACE INTO open_data_snapshots VALUES (?,?)').run(id,'gz:'+gzipSync(JSON.stringify(next)).toString('base64'));db.prepare('INSERT OR REPLACE INTO open_data_active VALUES (1,?)').run(id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}remember(next);catalog=next;schools=new Map(next.schools.map(s=>[s.id,s]));media=new Map(next.resources.map(r=>[r.id,r]));}
// Cache each accepted snapshot in the teacher backup; old task references remain reproducible.
if(db)persist(catalog);
let syncing=false;
async function refresh(){if(syncing)fail('資料正在更新，請稍候');syncing=true;try{const next={version:1,sources:[],schools:[],resources:[]};for(const source of bundled.sources){const response=await fetchImpl(source.downloadUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)fail('官方來源暫時無法下載，仍使用原資料');const chunks=[];let size=0;for await(const part of response.body){size+=part.length;if(size>8000000)fail('官方檔案超過本版限制，原資料保留');chunks.push(part)}const bytes=Buffer.concat(chunks),sha=createHash('sha256').update(bytes).digest('hex'),text=bytes.toString('utf8').replace(/^\uFEFF/,'');next.sources.push({...source,sha256:sha,checkedDate:new Date().toISOString().slice(0,10)});if(source.id!=='6318'){const rows=JSON.parse(text);if(!Array.isArray(rows)||rows.length<100||rows.length>30000)fail('名錄格式或數量異常');const ids=new Set();for(const r of rows){const year=Number(r['學年度']),code=r['代碼'],name=r['學校名稱'],county=r['縣市名稱'];if(!Number.isInteger(year)||year<103||year>200||typeof code!=='string'||!/^\d{6}$/.test(code)||typeof name!=='string'||!name||name.length>100||typeof county!=='string'||county.length>40)fail('名錄欄位不完整，原資料保留');const id=source.id+':'+year+':'+code;if(ids.has(id))fail('名錄出現重複年度代碼');ids.add(id);next.schools.push({id,datasetId:source.id,year,code,name,county:county.split(']').at(-1),stage:source.id==='6087'?'primary':'junior',snapshot:sha});}}
else{const rows=parseCSV(text),head=rows.shift();const fields=['標題','影片網址','學習階段','學習領域','描述說明','關鍵字','學習內容','學習表現','影片長度','授權方式'];if(fields.some(f=>!head.includes(f))||rows.length<100||rows.length>20000)fail('教材清單欄位或數量異常');const ids=new Set();for(const row of rows){if(row.length!==head.length)fail('教材CSV欄數錯誤');const r=Object.fromEntries(head.map((k,i)=>[k,row[i]])),url=r['影片網址'].trim();if(!/^https:\/\/stv\.naer\.edu\.tw\/watch\/\d+$/.test(url))fail('教材網址格式異常');const id='6318:'+url.split('/').at(-1);if(ids.has(id))fail('教材清單有重複網址');ids.add(id);next.resources.push({id,title:r['標題'].trim(),description:r['描述說明'].trim(),keywords:r['關鍵字'].trim(),subjects:r['學習領域'].trim().split(/\s+/),stages:r['學習階段'].trim().split(/\s+/),content:r['學習內容'].trim(),performance:r['學習表現'].trim(),duration:r['影片長度'].trim(),license:r['授權方式'].trim(),url,snapshot:sha});}}}
// Refuse large unexplained losses; a maintainer must review source schema changes.
for(const source of next.sources){const oldCount=source.id==='6318'?catalog.resources.length:catalog.schools.filter(r=>r.datasetId===source.id).length;const newCount=source.id==='6318'?next.resources.length:next.schools.filter(r=>r.datasetId===source.id).length;if(newCount<oldCount*.8)fail('來源筆數大幅減少，原資料保留，請聯絡維護者核對');}persist(next);return openDataInfo();}finally{syncing=false}}
return {openDataInfo,searchSchools,resolveSchool,searchResources,resolveLinks,dataQuestions,assertDataQuestion,refresh};
}
const defaults=createOpenDataService();
export const {openDataInfo,searchSchools,resolveSchool,searchResources,resolveLinks,dataQuestions,assertDataQuestion}=defaults;
export function parseCSV(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x!==''))rows.push(row);row=[];value='';}else value+=c;}if(quoted)throw Error('CSV引號未結束');if(value||row.length){row.push(value);rows.push(row);}return rows;}
