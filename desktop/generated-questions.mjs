import {applyAction,seedState} from '../functions/domain.mjs';
import {checkQuestionPlan,questionKind} from '../functions/question-scope.mjs';

const fail=message=>{throw Object.assign(new Error(message),{code:'failed-precondition',status:400})};
const labels={choice:'選擇題',short:'簡答題',application:'應用題',work:'作品／實作題'};
// Normalize presentation only. Never infer missing answers, explanations, or sources.
export function parseGeneratedQuestions(text,{count,scope,counts,sourceIds}={}){
 let parsed;
 try{parsed=JSON.parse(String(text).trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1'))}catch{fail('AI 回覆不是完整 JSON，原有草稿保留。請重新產生。')}
 const rows=Array.isArray(parsed)?parsed:parsed?.questions;
 if(!Array.isArray(rows))fail('AI 回覆缺少 questions 題目清單，原有草稿保留。');
 if(rows.length!==count)fail(`AI 題數不符：要求 ${count} 題，實際收到 ${rows.length} 題。原有草稿保留，請重新產生。`);
 const questions=rows.map((raw,i)=>{
  const prefix=`第 ${i+1} 題：`;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail(prefix+'題目資料不是物件。');
  const q={...raw};
  if(q.type==='application'&&(!q.format||q.format==='application')){q.type='short';q.format='application'}
  if(!['choice','short','work'].includes(q.type))fail(prefix+'題型無效，需為選擇、簡答或作品／實作題。');
  if(q.format!=null&&q.format!==''&&(q.format!=='application'||q.type!=='short'))fail(prefix+'應用題標記與題型不符。');
  if(typeof q.answer==='number'&&Number.isFinite(q.answer)&&q.type!=='choice')q.answer=String(q.answer);
  for(const [key,label,max] of [['prompt','題幹',2000],['answer','答案',2000],['explanation','詳解',3000]]){
   if(typeof q[key]!=='string'||!q[key].trim())fail(prefix+`缺少${label}，未猜補內容。`);
   if(q[key].length>max)fail(prefix+`${label}超過 ${max} 字，請縮短內容。`);
   q[key]=q[key].trim();
  }
  if(q.type==='choice'){
   if(!Array.isArray(q.options)||q.options.length!==4)fail(prefix+'選擇題需要恰好四個選項。');
   if(q.options.some(o=>typeof o!=='string'||!o.trim()||o.length>500))fail(prefix+'選項不可空白或超過 500 字。');
   q.answer=q.answer.normalize('NFKC').toUpperCase();
   if(!/^[A-D]$/.test(q.answer))fail(prefix+'選擇題答案必須是單一 A、B、C 或 D，未猜測對應選項。');
  }
  if(q.answerUnit!=null&&(typeof q.answerUnit!=='string'||q.answerUnit.length>40))fail(prefix+'答案單位格式錯誤或超過 40 字。');
  if(sourceIds&&(!Array.isArray(q.sourceIds)||!q.sourceIds.length||q.sourceIds.length>3||q.sourceIds.some(id=>!sourceIds.includes(id))))fail(prefix+'題庫來源缺漏或不在本次檢索結果中。');
  // Provider-supplied review receipts are never trusted.
  for(const key of ['teacherReview','teacherReviewedAt','mathReview','mathReviewedAt','provenance'])delete q[key];
  const state=seedState(true);state.classes=[{id:'validate'}];
  let validated;
  try{validated=applyAction(state,{type:'saveAssignment',classId:'validate',requestId:'validate-generated',assignment:{...scope,title:'AI 草稿',status:'draft',questions:[q]}},{role:'teacher'}).assignments[0].questions[0]}
  catch(e){if(/^(算式驗算|數學驗證)/.test(e.message||''))fail(e.message+`（第 ${i+1} 題）`);fail(prefix+'未通過題目內容檢查，原有草稿保留。')}
  return {...validated,...(sourceIds?{sourceIds:q.sourceIds}:{})};
 });
 try{checkQuestionPlan(questions,counts)}catch{
  const actual={};for(const q of questions){const k=questionKind(q);actual[k]=(actual[k]||0)+1}
  const describe=c=>Object.entries(labels).filter(([k])=>c[k]>0).map(([k,label])=>`${label} ${c[k]} 題`).join('、');
  fail(`AI 題型配額不符：要求${describe(counts)}；收到${describe(actual)}。原有草稿保留，不會將一般簡答題冒充應用題。`);
 }
 return questions;
}
