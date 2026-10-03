import {questionPlan} from '../functions/question-scope.mjs';
import {selectPracticeRecords} from '../functions/question-history.mjs';
export function supplyPlan(material='選擇題8題，應用題2題',rounds=3){
 if(typeof material!=='string'||material.length>150||!Number.isInteger(rounds)||rounds<1||rounds>6)throw Error('供題試算需為 1–6 份，每份 1–20 題');
 const rest=material.normalize('NFKC').replace(/(選擇題|簡答題|應用題|實作題|作品題)\s*[:：]?\s*([0-9零一二三四五六七八九十兩]+)\s*題/g,'').replace(/[\s,，、。；;＋+]/g,'');
 const plan=questionPlan(material);if(rest||!plan)throw Error('請以「選擇題8題，應用題2題」等題型配額進行供題試算');return {...plan,material,rounds};
}
export function simulateSupply(records,plan){
 const history=[];let papers=0,missingByType={};
 for(let i=0;i<plan.rounds;i++){
  const result=selectPracticeRecords(records,{purpose:'new',percent:0,allowRepeat:false,history,wrong:[]},plan.total,plan.counts);
  if(result.selected.length!==plan.total){missingByType=Object.fromEntries(Object.entries(result.remaining||{}).filter(([,v])=>v>0));break}
  papers++;history.push(...result.selected.map(r=>r.question));
 }
 return {papers,requested:plan.rounds,questionsPerPaper:plan.total,missingByType,complete:papers===plan.rounds};
}
