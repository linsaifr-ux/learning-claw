import {questionCount,questionsSchema,gradingSchema,gradingPrompt,parseGrading,analysisSchema,analysisPrompt,parseAnalysis} from '../functions/ai-tasks.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,randomUUID,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {applyAction,seedState,GRADES} from '../functions/domain.mjs';
import {studentView} from '../functions/views.mjs';
import {studentInput,credentialId,birthdayHash,birthdayMatches} from '../functions/student-credentials.mjs';
import {requestGemini} from '../functions/gemini.mjs';
import R from '@dimforge/rapier3d-compat';
import {simulate,validateTarget} from '../functions/physics.mjs';
const ready=R.init();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const teacherActions=new Set(['createClass','registration','addStudent','grant','undo','settings','saveAssignment','review','publishAnalysis','updateReview']);
const studentActions=new Set(['startGame','finishGame','saveRoom','submit']);
const digest=s=>createHash('sha256').update(s).digest('hex');
export function createClassroom({directory,setupCode=randomBytes(24).toString('hex'),model='gemini-3.5-flash-lite',gemini=requestGemini}){
 mkdirSync(directory,{recursive:true,mode:0o700});const secretFile=join(directory,'server.key');if(!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32),{mode:0o600,flag:'wx'});const secret=readFileSync(secretFile);if(secret.length!==32)throw new Error('server.key 已損壞，請還原備份');
 const db=new DatabaseSync(join(directory,'classroom.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY,value TEXT NOT NULL)');try{chmodSync(join(directory,'classroom.sqlite'),0o600)}catch{}
 const read=()=>JSON.parse(db.prepare('SELECT value FROM settings WHERE id=?').get('classroom').value);
 const save=s=>db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run('classroom',JSON.stringify(s));
 if(!db.prepare('SELECT id FROM settings WHERE id=?').get('classroom'))save({workspace:seedState(true),teacher:null,credentials:{},key:null,rates:{},open:false});
 // Session tokens never persist; restart requires a fresh login and always closes class.
 let initial=read();initial.open=false;save(initial);const sessions=new Map();
 const session=actor=>{for(const[k,v]of sessions)if(v.until<Date.now())sessions.delete(k);const token=randomBytes(32).toString('hex');sessions.set(digest(token),{...actor,until:Date.now()+8*3600000});return{token}};
 const authenticate=token=>{const actor=sessions.get(digest(String(token||'')));if(!actor||actor.until<Date.now())fail('請重新登入',401);if(actor.role==='student'&&!read().open)fail('老師已結束課堂',403);return actor};
 const teacher=a=>{if(a.role!=='teacher')fail('只有老師可以使用此功能',403)};
 function rate(id,max=5,window=15*60000){const s=read(),now=Date.now();for(const[k,v]of Object.entries(s.rates))if(now-v.at>86400000)delete s.rates[k];const r=s.rates[id];if(r&&now-r.at<window&&r.count>=max)fail('嘗試次數過多，請稍後再試',429);s.rates[id]=r&&now-r.at<window?{at:r.at,count:r.count+1}:{at:now,count:1};save(s)}
 function encrypt(key){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',secret,iv),data=Buffer.concat([c.update(key,'utf8'),c.final()]);return{iv:iv.toString('hex'),tag:c.getAuthTag().toString('hex'),data:data.toString('hex'),updatedAt:Date.now()}}
 function decrypt(key){const c=createDecipheriv('aes-256-gcm',secret,Buffer.from(key.iv,'hex'));c.setAuthTag(Buffer.from(key.tag,'hex'));return Buffer.concat([c.update(Buffer.from(key.data,'hex')),c.final()]).toString('utf8')}
 async function ai(prompt,json=false,schema){const s=read();if(!s.key)fail('請先儲存老師自己的 Gemini API Key');rate('ai-minute',1,10000);rate('ai-day',50,86400000);return gemini({key:decrypt(s.key),model,prompt,json,schema})}
 async function call(name,data={},token='',source='local'){
 if(name==='teacherRegister'){rate('setup',5);const s=read();if(s.teacher||data.setupCode!==setupCode)fail('首次設定碼不正確，或老師帳號已建立',403);const email=String(data.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof data.password!=='string'||data.password.length<8||data.password.length>128)fail('請填有效 Email 及至少 8 字元密碼');const password=await birthdayHash(data.password,secret);const latest=read();if(latest.teacher)fail('老師帳號已建立',409);latest.teacher={email,uid:randomUUID(),...password};save(latest);return session({role:'teacher',uid:latest.teacher.uid})}
 if(name==='teacherLogin'){rate('teacher-login',10);const s=read();if(!s.teacher||String(data.email||'').trim().toLowerCase()!==s.teacher.email||typeof data.password!=='string'||!await birthdayMatches(data.password,secret,s.teacher))fail('Email 或密碼不正確',401);return session({role:'teacher',uid:s.teacher.uid})}
 if(name==='studentAccess'){let v;try{v=studentInput(data)}catch(e){fail(e.message)}const s=read();if(!s.open)fail('老師尚未開課',403);const id=credentialId(v.code,v.name,secret);rate('student:'+id);rate('source:'+digest(source),120);let row=s.credentials[id];if(data.register===true){const c=s.workspace.classes.find(c=>c.code===v.code&&c.registrationOpen);if(!c)fail('老師尚未開放註冊，請確認班級連結',403);if(row)fail('此姓名已註冊，請登入或向老師取得辨識名稱',409);const password=await birthdayHash(v.birthday,secret);const latest=read();if(!latest.open||!latest.workspace.classes.some(c=>c.code===v.code&&c.registrationOpen))fail('老師已關閉註冊',403);if(latest.credentials[id])fail('此姓名已註冊',409);if(latest.workspace.students.length>=100)fail('此試行版本最多 100 位學生');row={uid:randomUUID(),...password};latest.workspace=applyAction(latest.workspace,{type:'addStudent',studentId:row.uid,classId:c.id,name:v.name,requestId:randomUUID()},{role:'teacher'});latest.credentials[id]=row;save(latest)}else if(!row||!await birthdayMatches(v.birthday,secret,row))fail('姓名、生日月日或班級連結不正確',401);return session({role:'student',uid:row.uid})}
 const actor=authenticate(token);if(name==='logout'){sessions.delete(digest(token));return{ok:true}}
 if(name==='state'){const s=read();return{user:{uid:actor.uid},role:actor.role,state:actor.role==='teacher'?s.workspace:studentView(s.workspace,actor.uid),classOpen:s.open}}
 if(name==='setClassOpen'){teacher(actor);const s=read();s.open=data.open===true;save(s);if(!s.open)for(const[k,v]of sessions)if(v.role==='student')sessions.delete(k);return{open:s.open}}
 if(name==='classroomAction'){const a={...data};if(!(actor.role==='teacher'?teacherActions:studentActions).has(a.type))fail('此身分不能操作',403);if(typeof a.requestId!=='string'||a.requestId.length>80)fail('缺少操作識別碼');let s=read();if(a.type!=='finishGame'&&s.workspace.processed.includes(a.requestId))return{ok:true};if(actor.role==='student')a.studentId=actor.uid;
 if(a.type==='createClass'){a.classId=randomUUID();a.code=randomBytes(8).toString('hex').toUpperCase()}
 if(a.type==='addStudent'){a.studentId=randomUUID();if(s.workspace.students.length>=100)fail('此試行版本最多 100 位學生')}
 if(a.type==='startGame'){a.seed=randomBytes(4).readUInt32LE();a.sessionId=randomUUID()}
 let prizes;const acting={role:actor.role,studentId:actor.uid,name:actor.role==='teacher'?'老師':'學生'};
 if(a.type==='finishGame'){const target=validateTarget(a.target);let game=s.workspace.sessions.find(g=>g.id===a.sessionId&&g.studentId===actor.uid);if(!game)fail('找不到這局遊戲');if(game.status==='finished')return{ok:true,prizes:game.prizes};if(!game.target){game.target=target;save(s)}await ready;authenticate(token);s=read();game=s.workspace.sessions.find(g=>g.id===a.sessionId&&g.studentId===actor.uid);if(game.status==='finished')return{ok:true,prizes:game.prizes};prizes=simulate(R,game.seed,game.target);a.prizes=prizes;acting.verifiedGame=true}
 try{s.workspace=applyAction(s.workspace,a,acting)}catch(e){fail(e.message)}save(s);return{ok:true,...(a.type==='createClass'?{classId:a.classId}:{}),...(prizes?{prizes}:{})}}
 teacher(actor);
 if(name==='teacherKeyStatus'){const k=read().key;return{configured:!!k,enabled:true,model,updatedAt:k?.updatedAt}}
 if(name==='saveTeacherKey'){if(typeof data.key!=='string'||data.key.length<20||data.key.length>512||/\s/.test(data.key))fail('請填寫完整 API Key');const s=read();s.key=encrypt(data.key);save(s);return{ok:true}}
 if(name==='deleteTeacherKey'){const s=read();s.key=null;save(s);return{ok:true}}
 if(name==='testTeacherKey'){const start=Date.now();await ai('請只回答：連線成功');return{ok:true,model,latencyMs:Date.now()-start,testedAt:Date.now()}}
 function saveAIResult(submissionId,mode,value){const latest=read();if(!latest.workspace.submissions.some(x=>x.id===submissionId))fail('找不到作答');latest.workspace.teacherAIResults||={};latest.workspace.teacherAIResults[submissionId]||={};if(mode==='analysisPair'){const at=Date.now();latest.workspace.teacherAIResults[submissionId]={...latest.workspace.teacherAIResults[submissionId],analysis:{value:value.analysis,at},studentFeedback:{value:value.studentFeedback,at,format:'student-v1'}}}else latest.workspace.teacherAIResults[submissionId][mode]={value,at:Date.now()};save(latest);return value}
 if(name==='teacherAI'){if(data.mode==='questions'){const count=questionCount(data.count);if(!GRADES.includes(data.grade)||typeof data.subject!=='string'||!data.subject.trim()||data.subject.length>30||typeof data.unit!=='string'||!data.unit.trim()||data.unit.length>100||typeof data.material!=='string'||data.material.length>10000)fail('請確認年級、科目、單元及教材');const text=await ai('請依以下資料出 '+count+' 題，JSON 格式 questions，每題 type(choice/short/work)、prompt、answer、explanation；choice 須四個 options，答案 A–D。教材：'+JSON.stringify(data),true,questionsSchema(count));let questions;try{questions=JSON.parse(text).questions;if(questions.length!==count)throw Error();const empty=seedState(true);empty.classes=[{id:'validate'}];const validated=applyAction(empty,{type:'saveAssignment',classId:'validate',requestId:randomUUID(),assignment:{grade:data.grade,subject:data.subject,unit:data.unit,title:'AI 草稿',questions}},{role:'teacher'});questions=validated.assignments[0].questions}catch(e){fail(e.message?.startsWith('算式驗算')?e.message:'AI 題目格式不完整，請重試')}return{questions}}
 if(data.mode==='grade'){const s=read().workspace,sub=s.submissions.find(x=>x.id===data.submissionId),q=s.assignments.find(x=>x.id===sub?.assignmentId);if(!q||!sub)fail('找不到作答');const grading=parseGrading(await ai(gradingPrompt(q,sub,s.students),true,gradingSchema),q,sub);return{grading:saveAIResult(sub.id,'grade',grading)}}
 if(data.mode==='analysis'){const s=read().workspace,sub=s.submissions.find(x=>x.id===data.submissionId),q=s.assignments.find(x=>x.id===sub?.assignmentId);if(!q||!sub)fail('找不到作答');const result=parseAnalysis(await ai(analysisPrompt(q,sub,s.students),true,analysisSchema));return saveAIResult(sub.id,'analysisPair',result)}}
 fail('不支援的操作',404)
 }
 return{call,setupCode:read().teacher?null:setupCode,close:()=>db.close(),database:db};
}
