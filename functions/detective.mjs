// Classroom-owned narrative overlays. Questions remain authoritative in assignments.
const requireValue=(ok,message)=>{if(!ok)throw Error(message)};
const str=(v,n)=>{requireValue(typeof v==='string'&&v.trim()&&v.length<=n,'請填寫完整內容，且勿超過字數限制');return v.trim()};
export const badgeStyles=[{id:'copper',name:'銅光調查員',color:'#a9613c'},{id:'ocean',name:'海藍觀察員',color:'#237486'},{id:'violet',name:'紫晶推理員',color:'#75529d'}];
export const narrativeScope=task=>JSON.stringify([task.grade,task.subject,task.unit,task.questions.map(q=>[q.type,q.prompt,q.options,q.answer,q.explanation,q.answerUnit])]);
export const caseKey=(sid,cid)=>sid+':'+cid;
export function caseTemplate(task){return {title:task.title+'：線索調查',intro:'調查委託已送達。請閱讀每個場景，完成學習題目並整理證據。',stages:task.questions.map((q,i)=>({scene:`調查站 ${i+1}：請先閱讀題目，將你的答案記入調查筆記。`,clue:`完成第 ${i+1} 站後，回顧你的作答，寫出它支持的推論。`,hint:'先找出題目已知條件，再說明你的判斷依據。'})),challenge:'綜合調查結果，哪一項最重要？',options:['根據所有線索提出有依據的結論','只根據第一個印象下結論','忽略不符合猜測的證據'],solution:0,ending:'你完成了這次調查。好的推論需要證據，也願意在發現新線索時修正。',policy:'complete',threshold:60};}
export function cleanNarrative(v,task){requireValue(v&&Array.isArray(v.stages)&&v.stages.length===task.questions.length,'每一道題都需要對應一個調查場景');requireValue(Array.isArray(v.options)&&v.options.length===3&&new Set(v.options).size===3,'結案需三個不同選項');requireValue(Number.isInteger(v.solution)&&v.solution>=0&&v.solution<3,'請選擇結案答案');return {title:str(v.title,100),intro:str(v.intro,1000),stages:v.stages.map(x=>({scene:str(x.scene,600),clue:str(x.clue,600),hint:str(x.hint,300),...Object.fromEntries(['location','objective','inspect','discovery'].filter(k=>x[k]!==undefined).map(k=>[k,str(x[k],k==='discovery'?600:120)]))})),challenge:str(v.challenge,600),options:v.options.map(x=>str(x,200)),solution:v.solution,ending:str(v.ending,1000)};}
export function detectiveAction(s,a,actor,{now,id}){
 s.characters||=[];s.detectiveCases||=[];s.caseProgress||={};s.badges||=[];s.badgeDisplays||={};
 const teacher=()=>requireValue(actor.role==='teacher','需要老師權限');
 if(a.type==='saveCharacter'){
  teacher();requireValue(s.classes.some(c=>c.id===a.classId),'找不到班級');const old=s.characters.find(c=>c.id===a.character?.id);requireValue(!old||old.classId===a.classId,'角色不屬於本班');requireValue(a.character?.rights===true,'請確認素材使用權限');requireValue(old||s.characters.filter(c=>c.classId===a.classId).length<12,'每班最多 12 位角色');
  const image=a.character.image;requireValue(typeof image==='string'&&image.length<=180000&&/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(image),'請上傳經轉換的 PNG 圖片（最多 130 KB）');
  const bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));requireValue(bytes.length>=33&&String.fromCharCode(...bytes.slice(12,16))==='IHDR','圖片格式不完整');const view=new DataView(bytes.buffer);requireValue(view.getUint32(16)>0&&view.getUint32(16)<=512&&view.getUint32(20)>0&&view.getUint32(20)<=512,'圖片寬高需為 1–512 像素');
  const row={id:old?.id||id(),classId:a.classId,name:str(a.character.name,30),source:str(a.character.source,200),image,rights:true,at:now};s.characters=s.characters.filter(c=>c.id!==row.id);s.characters.push(row);return;
 }
 if(a.type==='deleteCharacter'){teacher();const cases=s.detectiveCases.filter(c=>c.characterId===a.characterId);requireValue(!cases.length||a.confirmed===true,'刪除使用中角色需確認同時移除相關案件與徽章');const ids=new Set(cases.map(c=>c.id));s.characters=s.characters.filter(c=>c.id!==a.characterId);s.detectiveCases=s.detectiveCases.filter(c=>!ids.has(c.id));s.badges=s.badges.filter(b=>b.characterId!==a.characterId);for(const [key,p] of Object.entries(s.caseProgress))if(ids.has(p.caseId))delete s.caseProgress[key];for(const sid of Object.keys(s.badgeDisplays))s.badgeDisplays[sid]=s.badgeDisplays[sid].filter(id=>s.badges.some(b=>b.id===id));return;}
 if(a.type==='deleteCase'){teacher();const c=s.detectiveCases.find(c=>c.id===a.caseId);requireValue(c&&c.status==='draft','只有未發布案件可刪除');s.detectiveCases=s.detectiveCases.filter(x=>x.id!==c.id);return;}
 if(a.type==='saveCase'){
  teacher();const v=a.case,task=s.assignments.find(t=>t.id===v?.assignmentId);requireValue(task&&['draft','published'].includes(task.status)&&!task.archivedAt,'請先保存學習任務草稿');const old=s.detectiveCases.find(c=>c.id===v.id);requireValue(!old||old.status==='draft','已發布案件不可修改，避免改變學生進度');requireValue(!s.detectiveCases.some(c=>c.assignmentId===task.id&&c.id!==old?.id),'這份任務已有案件');requireValue(old||s.detectiveCases.length<100,'案件數量已達 100 件');const character=s.characters.find(c=>c.id===v.characterId&&c.classId===task.classId);requireValue(character,'請選擇本班角色');requireValue(v.status!=='published'||task.status==='published','請將題目與案件一起發布');requireValue(!v.questionSignature||v.questionSignature===narrativeScope(task),'題目已修改，請重新核對劇情並確認後再發布');const narrative=cleanNarrative(v,task);requireValue(['complete','score'].includes(v.policy),'請選擇通關條件');requireValue(Number.isInteger(v.threshold)&&v.threshold>=0&&v.threshold<=100,'門檻需為 0–100');requireValue(v.status!=='published'||v.reviewed===true,'請先確認劇情、線索與結案答案');
  requireValue(v.status!=='published'||!s.submissions.some(x=>x.assignmentId===task.id),'這份任務已有學生交卷，請另建新任務再發布案件');
  const row={...narrative,questionSignature:narrativeScope(task),id:old?.id||id(),assignmentId:task.id,classId:task.classId,characterId:character.id,character:{name:character.name,image:character.image},policy:v.policy,threshold:v.threshold,status:v.status==='published'?'published':'draft',at:old?.at||now};s.detectiveCases=s.detectiveCases.filter(c=>c.id!==row.id);s.detectiveCases.push(row);if(task.status==='draft')task.presentation='detective';return;
 }
 requireValue(actor.role==='student'&&actor.studentId===a.studentId,'只能操作自己的案件');const student=s.students.find(x=>x.id===a.studentId);requireValue(student,'找不到學生');
 if(a.type==='displayBadges'){requireValue(Array.isArray(a.badgeIds)&&a.badgeIds.length<=3&&new Set(a.badgeIds).size===a.badgeIds.length&&a.badgeIds.every(b=>s.badges.some(x=>x.id===b&&x.studentId===student.id)),'請選擇最多三枚自己的徽章');s.badgeDisplays[student.id]=a.badgeIds;return;}
 const c=s.detectiveCases.find(c=>c.id===a.caseId&&c.classId===student.classId&&c.status==='published');requireValue(c,'找不到已發布案件');const task=s.assignments.find(t=>t.id===c.assignmentId&&t.status==='published'&&(!t.archivedAt||a.type==='claimBadge')&&(!t.targetStudentId||t.targetStudentId===student.id));requireValue(task,'此任務不開放給你');
 const key=caseKey(student.id,c.id),p=s.caseProgress[key]||{studentId:student.id,caseId:c.id,answers:[],at:now};
 if(a.type==='caseAnswer'){requireValue(!p.finishedAt,'已結案，不能更改作答');if(Number.isInteger(a.index)&&a.index>=0&&a.index<p.answers.length&&p.answers[a.index]===a.answer)return;requireValue(a.index===p.answers.length&&a.index<task.questions.length,'調查進度已更新，請重新開啟');const answer=str(a.answer,3000);requireValue(task.questions[a.index].type!=='choice'||['A','B','C','D'].includes(answer),'請選擇 A–D');p.answers.push(answer);p.at=now;s.caseProgress[key]=p;return;}
 if(a.type==='finishCase'){
  if(p.finishedAt)return;requireValue(p.answers.length===task.questions.length,'請先完成所有調查站');requireValue(a.choice===c.solution,'推論與線索不符，請重新檢視證據');p.reason=str(a.reason,1500);p.finishedAt=now;s.caseProgress[key]=p;
  if(!s.submissions.some(x=>x.assignmentId===task.id&&x.studentId===student.id))s.submissions.unshift({id:id(),studentId:student.id,assignmentId:task.id,answers:p.answers,at:now,status:'pending'});return;
 }
 if(a.type==='claimBadge'){
  requireValue(p.finishedAt,'請先結案');if(s.badges.some(b=>b.caseId===c.id&&b.studentId===student.id))return;
  const sub=s.submissions.find(x=>x.assignmentId===task.id&&x.studentId===student.id);requireValue(sub,'找不到學習作答');
  if(c.policy==='score'){const score=sub.status==='reviewed'?sub.score:task.questions.every(q=>q.type==='choice')?Math.round(task.questions.filter((q,i)=>q.answer===sub.answers[i]).length/task.questions.length*100):null;requireValue(score!==null,'等待老師批閱後才能領取徽章');requireValue(score>=c.threshold,'目前成績未達本案門檻，請先查看學習回饋');}
  const owned=new Set(s.badges.filter(b=>b.studentId===student.id&&b.characterId===c.characterId).map(b=>b.style));const pool=badgeStyles.filter(b=>!owned.has(b.id));requireValue(pool.length,'這位角色三款徽章已集滿，仍保留本案通關紀錄');const bytes=new Uint32Array(1),limit=Math.floor(4294967296/pool.length)*pool.length;do{globalThis.crypto.getRandomValues(bytes)}while(bytes[0]>=limit);const style=pool[bytes[0]%pool.length];s.badges.push({id:id(),studentId:student.id,caseId:c.id,caseTitle:c.title,characterId:c.characterId,character:c.character,style:style.id,name:c.character.name+' · '+style.name,earnedAt:now});return;
 }
 throw Error('不支援的案件操作');
}
export function badgeEligibility(s,student,c){
 if((s.badges||[]).some(b=>b.caseId===c.id&&b.studentId===student.id))return {ready:false,message:'本案徽章已領取'};
 if(!s.caseProgress?.[caseKey(student.id,c.id)]?.finishedAt)return {ready:false,message:'完成調查與結案後即可查看領取資格'};
 const owned=new Set((s.badges||[]).filter(b=>b.studentId===student.id&&b.characterId===c.characterId).map(b=>b.style));
 if(badgeStyles.every(b=>owned.has(b.id)))return {ready:false,message:'這位角色三款徽章已集滿，本案通關紀錄已保存'};
 const task=s.assignments.find(t=>t.id===c.assignmentId),sub=s.submissions.find(x=>x.assignmentId===c.assignmentId&&x.studentId===student.id);
 if(!task||!sub)return {ready:false,message:'等待作答同步'};
 if(c.policy==='score'){const score=sub.status==='reviewed'?sub.score:task.questions.every(q=>q.type==='choice')?Math.round(task.questions.filter((q,i)=>q.answer===sub.answers[i]).length/task.questions.length*100):null;
 if(score===null)return {ready:false,message:'等待老師發布評分後，即可確認徽章領取資格'};
 if(score<c.threshold)return {ready:false,message:`目前成績 ${score} 分，未達 ${c.threshold} 分門檻；請查看老師的學習回饋`};}
 return {ready:true,message:'本案可免費領取一枚角色徽章'};
}
export function detectiveView(s,student){
 const progress=Object.fromEntries(Object.entries(s.caseProgress||{}).filter(([,p])=>p.studentId===student.id));
 return {detectiveCases:(s.detectiveCases||[]).filter(c=>c.status==='published'&&c.classId===student.classId&&s.assignments.some(t=>t.id===c.assignmentId&&(!t.targetStudentId||t.targetStudentId===student.id))).map(({solution,ending,...c})=>{const p=progress[caseKey(student.id,c.id)];return {...c,rewardState:badgeEligibility(s,student,c),stages:c.stages.map((x,i)=>({scene:x.scene,hint:x.hint,location:x.location,objective:x.objective,inspect:x.inspect,discovery:x.discovery,...(i<(p?.answers.length||0)?{clue:x.clue}:{})})),...(p?.finishedAt?{ending}:{})}}),caseProgress:progress,badges:(s.badges||[]).filter(b=>b.studentId===student.id),badgeDisplays:{[student.id]:s.badgeDisplays?.[student.id]||[]}};
}
