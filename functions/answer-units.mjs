// Only discrete counts with an explicit reference unit. Measurement conversion
// and prose/multi-step answers are not inferred from arbitrary embedded numbers.
const aliases={本:'本',本書:'本',個:'個',顆:'顆',顆糖果:'顆',枝:'枝',支:'枝',枝鉛筆:'枝',支鉛筆:'枝',張:'張',張紙:'張',人:'人',位:'人',位學生:'人',名學生:'人',盒:'盒'};
function quantity(value){
 const text=String(value||'').normalize('NFKC').replace(/\s/g,'').replace(/^(?:答案(?:是|為)?[:：]?|答[:：])/,'').replace(/[。.]$/,'');
 const m=/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d{1,12}))([\p{Script=Han}]{0,8})$/u.exec(text);
 if(!m)return null;
 return {number:BigInt(m[1].replaceAll(',','')),unit:aliases[m[2]]||m[2],rawUnit:m[2]};
}
export function checkAnswerUnit(question,answer){
 if(question.type==='choice')return null;
 const expected=quantity(question.answer);if(!expected||!expected.unit||!aliases[expected.rawUnit])return null;
 const actual=quantity(answer);
 if(!actual)return null;
 if(actual.unit===expected.unit)return null;
 const numeric=actual.number===expected.number;
 return {kind:actual.unit?'wrong-unit':'missing-unit',numericCorrect:numeric,expectedUnit:expected.unit,actualUnit:actual.rawUnit,expectedAnswer:`${expected.number}${expected.unit}`,feedback:`${numeric?'你的數值正確':'你的數值與參考答案不同'}，但${actual.unit?`「${actual.rawUnit}」不是這題的正確單位`:'還沒有寫出單位'}。這題應使用「${expected.unit}」，完整答案是 ${expected.number}${expected.unit}。`,evidence:`參考答案：${question.answer}；實際作答：${answer}。單位錯誤或漏寫不能視為全對。`};
}
export function assignmentUnitChecks(assignment,submission){
 return assignment.questions.flatMap((q,i)=>{const result=checkAnswerUnit(q,submission.answers[i]);return result?[{questionIndex:i+1,...result}]:[]});
}
