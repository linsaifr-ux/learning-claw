// Deliberately accept only direct, two-integer calculation questions.
// Word problems, comparisons, equations and multi-step expressions are not inferred.
export function verifyArithmeticQuestion(question) {
 if (question.type !== 'choice') return question;
 const prompt = question.prompt.normalize('NFKC').trim();
 const match = /^(?:請)?(?:計算|求出?|算出)?\s*([+-]?\d{1,12})\s*([+\-−×*])\s*([+-]?\d{1,12})\s*(?:(?:的)?(?:結果|答案|和|差|積)(?:是|為)?(?:多少)?|等於多少|是多少|=\s*(?:\?|□|\(\s*\))?)?\s*[?？。]?$/u.exec(prompt);
 if (!match) return question;
 const [, left, operator, right] = match;
 const a = BigInt(left), b = BigInt(right);
 const value = operator === '+' ? a + b : /[-−]/u.test(operator) ? a - b : a * b;
 const matches = question.options.flatMap((option, i) => {
  const text = option.normalize('NFKC').trim();
  // Only unadorned numbers (with optional proper thousands separators).
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) return [];
  return BigInt(text.replaceAll(',', '')) === value ? [i] : [];
 });
 if (matches.length !== 1) throw new Error(`算式驗算未通過：${left} ${operator} ${right} = ${value}，四個選項必須恰有一個正確答案，請修改選項或重新產生。`);
 const symbol = /[-−]/u.test(operator) ? '−' : operator === '*' ? '×' : operator;
 return {...question, answer: 'ABCD'[matches[0]], explanation: `${left} ${symbol} ${right} = ${value}。正確答案是選項 ${'ABCD'[matches[0]]}（${value}）。`};
}
