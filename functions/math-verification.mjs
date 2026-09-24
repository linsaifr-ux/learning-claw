import {verifyArithmeticQuestion} from './arithmetic.mjs';
export const isMathSubject = subject => /數學|数学|\bmath(?:ematics)?\b/i.test(subject || '');
// A content receipt, not an AI verdict. The server accepts it only from a teacher.
export function mathReviewContent(q, subject) {
 return JSON.stringify([subject?.trim(),q.type,q.prompt?.trim(),(q.type==='choice'?(q.options||[]):[]).map(x=>x.trim()),q.answer?.trim(),q.explanation||'',q.answerUnit?.trim()||'']);
}
export function hasMathReview(q, subject) {
 return typeof q.mathReview === 'string' && q.mathReview === mathReviewContent(q, subject);
}
const item='(顆糖果|本書|枝鉛筆)';
const n='(\\d{1,7})';
const patterns=[
 ['add',new RegExp(`^小明原有${n}${item},又得到${n}\\2,現在共有多少\\2\\?$`)],
 ['subtract',new RegExp(`^小明原有${n}${item},送出${n}\\2,還剩多少\\2\\?$`)],
 ['multiply',new RegExp(`^每盒有${n}${item},共有${n}盒,一共有多少\\2\\?$`)],
 ['divide',new RegExp(`^把${n}${item}平均分給${n}人,每人分到多少\\2\\?$`)]
];
function storyQuestion(q) {
 if (!['choice','short'].includes(q.type)) return null;
 const prompt=q.prompt.normalize('NFKC').replace(/\s/g,'');
 for (const [kind,pattern] of patterns) {
  const match=pattern.exec(prompt);if(!match)continue;
  const a=BigInt(match[1]),unit=match[2],b=BigInt(match[3]);
  if(a>1000000n||b>1000000n)throw Error('數量超出此題型可驗證範圍（0–1000000）。');
  if(kind==='subtract'&&b>a)throw Error('送出的數量超過原有數量，題目條件不成立。');
  if(kind==='divide'&&(b===0n||a%b!==0n))throw Error('平均分配題須有人可分，且完整物品必須能整除；請修改數量或題型。');
  const value=kind==='add'?a+b:kind==='subtract'?a-b:kind==='multiply'?a*b:a/b;
  const symbol={add:'＋',subtract:'−',multiply:'×',divide:'÷'}[kind];
  const reason={add:'題目問得到物品後的總數，所以把原有數量和得到的數量相加。',subtract:'題目問送出後剩下的數量，所以用原有數量減去送出的數量。',multiply:'每盒的數量相同，題目問所有盒子的總數，所以用每盒數量乘以盒數。',divide:'題目說平均分給每個人，所以用總數除以人數。'}[kind];
  let answer=`${value}${unit[0]}`;
  if(q.type==='choice'){
   const indices=q.options.flatMap((s,i)=>{
    const text=s.normalize('NFKC').replace(/\s/g,'');
    const raw=text.endsWith(unit)?text.slice(0,-unit.length):text;
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw))return [];
    return BigInt(raw.replaceAll(',',''))===value?[i]:[];
   });
   if(indices.length!==1)throw Error(`依題意應為 ${value}${unit}，選項必須恰有一個正確答案（單位須一致）。`);
   answer='ABCD'[indices[0]];
  }
  return {question:{...q,answer,explanation:`${reason}\n${a} ${symbol} ${b} = ${value}，因此答案是 ${value}${unit}。`},evidence:`已核對完整題幹、${kind==='divide'?'平均分配條件':kind==='subtract'?'剩餘數量條件':'數量關係'}、單位及答案。`};
 }
 return null;
}
export function inspectMathQuestion(q,subject) {
 if(!isMathSubject(subject))return {status:'not-applicable',question:q};
 try{
  const story=storyQuestion(q);
  if(story)return {status:'verified',...story};
  const direct=verifyArithmeticQuestion(q);
  if(direct!==q)return {status:'verified',question:direct,evidence:'直接整數算式已重新計算；答案與詳解由程式產生。'};
  return {status:'needs-review',question:q,evidence:'此題的題意、列式或解題過程尚無程式規則可完整核對，不代表題目錯誤。'};
 }catch(error){return {status:'invalid',question:q,evidence:error.message};}
}
export function validateMathPublication(q,subject,publish=false,now=Date.now()) {
 const result=inspectMathQuestion(q,subject);
 if(result.status==='invalid')throw Error(`數學驗證未通過：${result.evidence}`);
 if(result.status==='verified'){const {mathReview,mathReviewedAt,...verified}=result.question;return verified;}
 if(result.status==='needs-review'){
  const reviewed=hasMathReview(q,subject);
  if(publish&&!reviewed)throw Error('數學題尚未逐題確認題意、答案與詳解，請完成教師核對後再發布。');
  if(reviewed)return {...q,mathReviewedAt:now};
 }
 const {mathReview,mathReviewedAt,...clean}=q;return clean;
}
export const mathQuestionGuidance=`數學題不可只核對數值，要先核對題目要求、已知條件、單位及列式，再寫詳解。若教材適合單一步驟的整數數量應用題，可使用以下完整句型，僅替換非負整數數量（最多1000000）及同一種物品（顆糖果、本書、枝鉛筆）：
小明原有12顆糖果，又得到3顆糖果，現在共有多少顆糖果？
小明原有12顆糖果，送出3顆糖果，還剩多少顆糖果？
每盒有6枝鉛筆，共有4盒，一共有多少枝鉛筆？
把12本書平均分給3人，每人分到多少本書？
送出不可超過原有數量；平均分配的人數須大於零且可整除。選項使用純數值或數值加相同物品單位。不要為了套用句型改變教材要求；其他題型照需求出題，但保留給教師核對。AI 不得自稱通過系統驗證。`;
