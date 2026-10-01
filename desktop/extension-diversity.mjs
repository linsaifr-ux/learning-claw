import{subjectKey}from'../functions/question-scope.mjs';
const clean=v=>String(v||'').normalize('NFKC').trim();
export function idiomScope(scope){return subjectKey(scope.subject)==='國語國文'&&/成語/.test(scope.unit)}
export function idiomTarget(q){
 const answer=clean(q.type==='choice'?q.options?.['ABCD'.indexOf(q.answer)]:q.answer).replace(/^[A-D][.、:)\s]+/i,'');
 if(/^[\p{Script=Han}]{4}$/u.test(answer))return answer;
 const named=[...clean(q.prompt).matchAll(/[「『]([\p{Script=Han}]{4})[」』]/gu)].map(m=>m[1]);
 if(new Set(named).size===1)return named[0];
 const supplied=clean(q.targetConcept);if(/^[\p{Script=Han}]{4}$/u.test(supplied)&&(clean(q.prompt).includes(supplied)||answer.includes(supplied)))return supplied;
 return null;
}
export function spreadIdiomRecords(records,scope){if(!idiomScope(scope))return records;const buckets=new Map();for(const r of records){const key=idiomTarget(r.question)||r.id;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r)}const out=[];while(out.length<records.length)for(const items of buckets.values())if(items.length)out.push(items.shift());return out}
export function checkExtensionDiversity(originals,generated,scope,material='',focusTargets=null){
 if(!idiomScope(scope))return null;
 if(focusTargets?.length){const targets=[...originals,...generated].map(idiomTarget);if(targets.some(t=>!t||!focusTargets.includes(t)))throw Object.assign(Error('錯題補強須集中在已辨識的錯答成語：'+focusTargets.join('、')+'，請更換情境但不要加入其他主要考點。'),{code:'extension-diversity'});return {targets,unique:new Set(targets).size,focused:true};}
 if(originals.length+generated.length<5)return null;
 const questions=[...originals,...generated],targets=questions.map(idiomTarget),counts={};for(const t of targets)if(t)counts[t]=(counts[t]||0)+1;
 const request=clean(scope.unit)+' '+clean(material);
 // An explicit focused drill may repeat named idioms; ordinary quotas are not an exemption.
 const focused=/(?:只考|只練|限定|專練|反覆練習|重複練習)/.test(request)&&Object.keys(counts).length>0&&Object.keys(counts).every(t=>request.includes(t));
 if(focused)return {targets,unique:Object.keys(counts).length,focused:true};
 const minimum=Math.ceil(questions.length*.6),limit=Math.max(2,Math.ceil(questions.length/5));
 if(generated.some(q=>!idiomTarget(q))||Object.keys(counts).length<minimum||Object.values(counts).some(n=>n>limit)){
  throw Object.assign(Error(`考點過度集中或無法辨識：${questions.length} 題基礎成語練習至少需 ${minimum} 個不同主要成語，每個最多 ${limit} 題。目前可辨識 ${Object.keys(counts).length} 個：${Object.entries(counts).map(([t,n])=>t+' '+n+'題').join('、')||'無'}。請擴充同範圍考點；無法支援時減少題數或補充教材。`),{code:'extension-diversity'});
 }
 return {targets,unique:Object.keys(counts).length,focused:false};
}
