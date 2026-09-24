// Deliberately accept only direct, two-integer calculation questions.
// Word problems, comparisons, equations and multi-step expressions are not inferred.
export function verifyArithmeticQuestion(question) {
 if (!['choice','short'].includes(question.type)) return question;
 const prompt = question.prompt.normalize('NFKC').trim();
 const match = /^(?:請)?(?:計算(?:下列算式)?|求出?|算出)?\s*([+-]?\d{1,12})\s*([+\-−×*])\s*([+-]?\d{1,12})\s*(?:(?:的|之)?(?:正確)?(?:計算)?(?:結果|答案|和|差|積)(?:是多少|為多少|為何|是什麼|是|為)?(?:多少)?|等於多少|是多少|=\s*(?:\?|□|\(\s*\))?)?\s*[?？。]?$/u.exec(prompt);
 if (!match) return question;
 const [, left, operator, right] = match;
 const requested=prompt.match(/(?:的)?(和|差|積)(?:是|為|多少|[?？。]|$)/)?.[1];
 if(requested && requested!== (operator==='+'?'和':/[-−]/u.test(operator)?'差':'積')) throw new Error('題目要求的和、差或積與算式運算符號不一致，請修改題意。');
 const a = BigInt(left), b = BigInt(right);
 const value = operator === '+' ? a + b : /[-−]/u.test(operator) ? a - b : a * b;
 const matches = question.type === 'choice' ? question.options.flatMap((option, i) => {
  const text = option.normalize('NFKC').trim();
  // Only unadorned numbers (with optional proper thousands separators).
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) return [];
  return BigInt(text.replaceAll(',', '')) === value ? [i] : [];
 }) : [];
 if (question.type === 'choice' && matches.length !== 1) throw new Error(`算式驗算未通過：${left} ${operator} ${right} = ${value}，四個選項必須恰有一個正確答案，請修改選項或重新產生。`);
 const symbol = /[-−]/u.test(operator) ? '−' : operator === '*' ? '×' : operator;
 const answer = question.type === 'choice' ? 'ABCD'[matches[0]] : String(value);
 const steps = operator === '+' && a >= 0n && b >= 0n ? additionSteps(a,b) : '';
 return {...question, answer, explanation: `${steps}${left} ${symbol} ${right} = ${value}。${question.type === 'choice' ? `正確答案是選項 ${answer}（${value}）。` : `答案是 ${value}。`}`};
}

// Produce carry explanations from the same operands, never preserve AI prose.
function additionSteps(a,b) {
 const places=['個','十','百','千','萬','十萬','百萬','千萬','億','十億','百億','千億','兆'];
 const left=String(a).split('').reverse(),right=String(b).split('').reverse(),steps=[];
 let carry=0;
 for(let i=0;i<Math.max(left.length,right.length);i++){
  const x=Number(left[i]||0),y=Number(right[i]||0),sum=x+y+carry;
  steps.push(`${places[i]}位：${x}＋${y}${carry?'＋'+carry+'（進位）':''}＝${sum}，${sum>=10?'寫'+sum%10+'，進1':'寫'+sum}。`);
  carry=Math.floor(sum/10);
 }
 if(carry)steps.push(`最高位進位 ${carry}。`);
 return steps.join('\n')+'\n';
}
