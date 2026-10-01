import {hasQuestionReview,questionReviewContent} from './question-review.mjs';
import {hasMathReview,mathReviewContent} from './math-verification.mjs';
const letters='ABCD';
export const optionText=(value,index)=>String(value||'').normalize('NFKC').trim().replace(new RegExp('^(?:'+letters[index]+'[.、:)]\\s*|[([]'+letters[index]+'[)\\]]\\s*)','i'),'').trim();
const refs=()=>/(?:選項\s*|答案(?:是|為|：|:)?\s*|正解(?:是|為|：|:)?\s*|option\s+)[A-D]\b|[（(][A-D][）)]|\b[A-D](?=\s*[：:、.]|\s*項)/gi;
export function choiceLayoutReason(q){
 if(q.type!=='choice')return '非選擇題';
 if(q.options?.length!==4||!letters.includes(q.answer)||q.answer?.length!==1)return '選項或答案格式不完整';
 const options=q.options.map(optionText);if(options.some(x=>!x)||new Set(options).size!==4)return '選項空白或重複';
 if(/以上|上述|前述|以下皆|前[兩二三四]|後[兩二三四]|第[一二三四1234]個選項/.test([q.prompt,...options,q.explanation].join(' ')))return '包含相對位置描述，需人工核對';
 if(/\b[A-D]\b/.test([q.prompt,...options].join(' ')))return '題幹或選項引用字母，需人工核對';
 if(/\b[A-D]\b/.test(String(q.explanation||'').replace(refs(),'')))return '詳解字母引用不明確，需人工核對';
 return '';
}
export function permuteChoice(q,order,scope={}){
 if(choiceLayoutReason(q))return null;
 if(order.length!==4||new Set(order).size!==4||order.some(i=>!Number.isInteger(i)||i<0||i>3))return null;
 const map=Object.fromEntries(order.map((old,index)=>[letters[old],letters[index]]));
 const result={...q,options:order.map(old=>optionText(q.options[old],old)),answer:map[q.answer],explanation:String(q.explanation||'').replace(refs(),match=>match.replace(/[A-D]\b/i,c=>map[c.toUpperCase()]))};
 delete result.teacherReview;delete result.teacherReviewedAt;delete result.mathReview;delete result.mathReviewedAt;
 if(hasQuestionReview(q,scope)){result.teacherReview=questionReviewContent(result,scope);if(q.teacherReviewedAt)result.teacherReviewedAt=q.teacherReviewedAt}
 if(hasMathReview(q,scope.subject)){result.mathReview=mathReviewContent(result,scope.subject);if(q.mathReviewedAt)result.mathReviewedAt=q.mathReviewedAt}
 return result;
}
const content=q=>JSON.stringify([q.type,q.prompt?.trim(),q.options?.map(x=>x.trim()),q.answer,q.explanation||'',q.answerUnit||'',q.format||'']);
export function isChoicePermutation(original,current){
 if(choiceLayoutReason(original)||current.type!=='choice')return false;
 const options=original.options.map(optionText),order=(current.options||[]).map(x=>options.indexOf(x.trim()));
 const expected=permuteChoice(original,order);return !!expected&&content(expected)===content(current);
}
export function choiceDistribution(questions){const counts={A:0,B:0,C:0,D:0};for(const q of questions)if(q.type==='choice'&&q.answer in counts)counts[q.answer]++;return counts}
function shuffle(items,rng){for(let i=items.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[items[i],items[j]]=[items[j],items[i]]}return items}
export function balanceChoices(questions,scope={},rng=Math.random,onlyIndices=null){
 if(questions.filter(q=>q.type==='choice').length<2)return {questions,choiceLayout:{counts:choiceDistribution(questions),changed:[],skipped:questions.flatMap((q,index)=>q.type==='choice'&&choiceLayoutReason(q)?[{index,reason:choiceLayoutReason(q)}]:[])}};
 const counts={A:0,B:0,C:0,D:0},movable=[],skipped=[];
 questions.forEach((q,index)=>{if(q.type!=='choice')return;if(onlyIndices&&!onlyIndices.includes(index)){if(q.answer in counts)counts[q.answer]++;return}const reason=choiceLayoutReason(q);if(reason){skipped.push({index,reason});if(q.answer in counts)counts[q.answer]++}else movable.push(index)});
 const targets=[];for(const index of movable){const min=Math.min(...Object.values(counts)),choices=Object.keys(counts).filter(k=>counts[k]===min),target=choices[Math.floor(rng()*choices.length)];targets.push(target);counts[target]++}
 shuffle(targets,rng);const result=[...questions],changed=[];
 movable.forEach((index,i)=>{const q=questions[index],target=letters.indexOf(targets[i]),correct=letters.indexOf(q.answer);if(correct===target)return;const order=shuffle([0,1,2,3].filter(j=>j!==correct),rng);order.splice(target,0,correct);result[index]=permuteChoice(q,order,scope);changed.push(index)});
 return {questions:result,choiceLayout:{counts:choiceDistribution(result),changed,skipped}};
}
