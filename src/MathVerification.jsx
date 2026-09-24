import React from 'react';
import {inspectMathQuestion,hasMathReview,mathReviewContent} from '../functions/math-verification.mjs';
export default function MathVerification({question,subject,index,onChange}) {
 const result=inspectMathQuestion(question,subject);
 if(result.status==='not-applicable')return null;
 const checked=hasMathReview(question,subject);
 const corrected=result.status==='verified'&&(result.question.answer!==question.answer||result.question.explanation!==question.explanation);
 return <section className={'math-verification '+result.status} aria-label={`第 ${index+1} 題數學檢查`}>
  <strong>{result.status==='verified'?'題意與算式：規則驗證通過':result.status==='invalid'?'題目存在問題，暫不可發布':checked?'教師已核對（非自動驗證）':'需要教師核對'}</strong>
  <p>{result.evidence}</p>
  {result.status==='verified'&&<><p>核對答案：{result.question.answer}</p><p className="math-explanation">{result.question.explanation}</p>{corrected&&<><p>保存時將套用以上答案與詳解，取代目前內容。</p><button type="button" onClick={()=>onChange(result.question)}>套用驗算答案與詳解</button></>}</>}
  {result.status==='needs-review'&&<label className="math-review-confirm"><input type="checkbox" checked={checked} onChange={e=>onChange({...question,mathReview:e.target.checked?mathReviewContent(question,subject):undefined})}/><span>我已逐項核對：題目條件足夠、列式符合題意、答案與單位正確、詳解每一步合理。</span></label>}
  <small>僅支援直接整數加減乘選擇／簡答題，以及指定句型的得到、送出、整盒數量與整除分配題。修改內容後需重新檢查；此檢查不代表已驗證適齡性或教材適切性。</small>
 </section>;
}
