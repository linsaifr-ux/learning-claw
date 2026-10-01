import{subjectKey,topicKey}from'./question-scope.mjs';
const text=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/^\s*(?:第\s*[0-9一二三四五六七八九十]+\s*題\s*[:：、.]?|[0-9]+\s*[.、)）])\s*/,'').replace(/[\s\p{P}]/gu,c=>'.-/:%'.includes(c)?c:'');
const inputError=message=>Object.assign(new Error(message),{status:400});
const grams=s=>new Set(Array.from({length:Math.max(0,s.length-2)},(_,i)=>s.slice(i,i+3)));
export function samePracticeQuestion(a,b){
 const x=text(a.prompt),y=text(b.prompt);if(!x||!y)return false;
 const answer=q=>q.type==='choice'?text(String(q.options?.['ABCD'.indexOf(q.answer)]||'').normalize('NFKC').replace(/^[A-D][.、:)]\s*/i,'')):null;
 const options=q=>JSON.stringify((q.options||[]).map(o=>text(String(o).normalize('NFKC').replace(/^[A-D][.、:)]\s*/i,''))).sort());
 if(a.type==='choice'&&b.type==='choice'&&answer(a)!==answer(b)&&options(a)!==options(b))return false;
 if(x===y)return true;
 // Different quantities may form a valid new exercise; never collapse their digits.
 if(JSON.stringify(x.match(/\d+(?:\.\d+)?/g))!==JSON.stringify(y.match(/\d+(?:\.\d+)?/g)))return false;
 if(Math.min(x.length,y.length)<20)return false;const A=grams(x),B=grams(y);return 2*[...A].filter(g=>B.has(g)).length/(A.size+B.size)>=.9;
}
export function practicePolicy(workspace,data){
 if(!workspace.classes.some(c=>c.id===data.classId))throw inputError('請先選擇要出題的班級');
 const purpose=data.practicePurpose||'new';if(!['new','review','remedial'].includes(purpose))throw inputError('出題目的無效');
 const percent=purpose==='review'?Number(data.reviewPercent??25):0;if(![0,25,50,100].includes(percent))throw inputError('複習舊題比例無效');
 const assignments=workspace.assignments.filter(a=>a.classId===data.classId&&a.status==='published'&&a.id!==data.assignmentId&&subjectKey(a.subject)===subjectKey(data.subject));
 const history=assignments.flatMap(a=>a.questions),wrong=[];
 if(purpose==='remedial')for(const a of assignments.filter(a=>topicKey(a.unit)===topicKey(data.unit)))for(const sub of workspace.submissions.filter(s=>s.assignmentId===a.id))a.questions.forEach((q,i)=>{if(q.type==='choice'&&sub.answers?.[i]&&sub.answers[i]!==q.answer&&!wrong.some(w=>samePracticeQuestion(w,q)))wrong.push(q)});
 if(purpose==='remedial'&&!wrong.length)throw inputError('此班級、科目與單元尚無可判定的選擇題錯答。請使用新題練習，或先取得作答；不會把未作答或開放題當成錯題。');
 const safe=q=>Object.fromEntries(['type','prompt','options','answer','explanation','format'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));return {purpose,percent,allowRepeat:data.allowRepeat===true,history:history.map(safe),wrong:wrong.map(safe)};
}
export function repeatedQuestion(q,policy){return !!policy?.history.some(old=>samePracticeQuestion(q,old))}
export function repeatLimit(policy,count){return !policy?count:policy.purpose==='review'?Math.floor(count*policy.percent/100):policy.purpose==='remedial'&&policy.allowRepeat?count:0}
export function repeatAllowed(q,policy){return !policy||policy.purpose==='review'||policy.purpose==='remedial'&&policy.allowRepeat&&policy.wrong.some(old=>samePracticeQuestion(q,old))}
export function selectPracticeRecords(records,policy,count,counts,{completeLater=false}={}){
 const remaining=counts?{...counts}:null,selected=[],used=[],limit=repeatLimit(policy,count);let repeats=0,excluded=0;
 const sorted=[...records].sort((a,b)=>Number(repeatedQuestion(a.question,policy))-Number(repeatedQuestion(b.question,policy)));
 for(const r of sorted){const q=r.question,old=repeatedQuestion(q,policy);if(old&&(!repeatAllowed(q,policy)||repeats>=limit)){excluded++;continue}if(used.some(x=>samePracticeQuestion(x,q)))continue;
 const kind=q.type==='short'&&q.format==='application'?'application':q.type;if(selected.length>=count||(remaining&&!(remaining[kind]>0)))continue;
 selected.push(r);used.push(q);if(old)repeats++;if(remaining)remaining[kind]--;
 }
 // A smaller partial paper must still satisfy its actual old-question percentage.
 if(!completeLater)while(repeats>repeatLimit(policy,selected.length)){
  const index=selected.findLastIndex(r=>repeatedQuestion(r.question,policy));if(index<0)break;
  const [r]=selected.splice(index,1),q=r.question;repeats--;excluded++;
  if(remaining)remaining[q.type==='short'&&q.format==='application'?'application':q.type]++;
 }
 return {selected,remaining,repeats,excluded};
}
export function assertPracticeQuestions(questions,policy,count=questions.length){
 if(!policy)return;const repeated=questions.filter(q=>repeatedQuestion(q,policy));if(repeated.length>repeatLimit(policy,count)||repeated.some(q=>!repeatAllowed(q,policy)))throw Object.assign(Error('題目與本班已發布內容重複或高度相似，超過本次允許的舊題數。請換題或明確切換複習模式。'),{code:'practice-repeat',status:400});
 for(let i=0;i<questions.length;i++)if(questions.slice(0,i).some(q=>samePracticeQuestion(q,questions[i])))throw Object.assign(Error('同一份任務含有重複或高度相似題目，請換題。'),{code:'practice-repeat',status:400});
}
