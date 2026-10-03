// Teacher approval binds the complete question and teaching scope, not an AI verdict.
export function questionReviewContent(q,scope={}){
 return JSON.stringify(['question-review-v1',...['grade','subject','unit','textbook','semester','difficulty'].map(k=>String(scope[k]||'').trim()),q.type,q.prompt?.trim(),q.type==='choice'?(q.options||[]).map(v=>v.trim()):[],q.answer?.trim(),q.explanation||'',q.answerUnit?.trim()||'',q.provenance||null,...(q.format?[q.format]:[]),...(q.dataEvidence?[q.dataEvidence]:[])]);
}
export const hasQuestionReview=(q,scope)=>q.teacherReview===questionReviewContent(q,scope);
export function validateQuestionReview(question,original,scope,publish,now){
 const p=original.provenance;
 if(!p)return question;
 if(!['bank','rag','ai','data'].includes(p.kind))throw Error('無效題目來源');
 const sources=Array.isArray(p.sources)?p.sources.slice(0,3).map(s=>({id:String(s.id||'').slice(0,80),revision:Number(s.revision)||1,title:String(s.title||'').slice(0,100),source:String(s.source||'').slice(0,200),url:/^https?:\/\//.test(s.url||'')?String(s.url).slice(0,500):''})):[];
 const provenance={kind:p.kind,sources};
 const result={...question,provenance};
 if(p.kind==='rag'&&!sources.length)throw Error('RAG 延伸題缺少題庫來源');
 if(typeof original.teacherReview==='string'&&hasQuestionReview(original,scope))result.teacherReview=original.teacherReview;
 if(publish&&!hasQuestionReview(result,scope))throw Error('題庫／AI 題目尚未逐題確認正確性，請教師核對題意、答案與詳解後再發布。');
 if(hasQuestionReview(result,scope))return {...result,teacherReviewedAt:now};
 delete result.teacherReview;return result;
}
