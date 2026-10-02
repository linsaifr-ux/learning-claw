// Shared by teacher UI and local service; never treats subject aliases as review approval.
export function subjectKey(value){
 const key=String(value||'').normalize('NFKC').toLowerCase().replace(/[\s／/]/g,'');
 for(const aliases of [['國語國文','國語文','國語','國文','語文','中文'],['英語英文','英語文','英語','英文'],['臺灣台語','台灣台語','台語','臺語','閩南語','閩南語文','本土語文(閩南語文)','臺灣台語(閩南語文)'],['自然科學','自然'],['數學','数学'],['社會','社會科']])if(aliases.includes(key))return aliases[0];
 return key;
}
export function topicKey(value){return String(value||'').normalize('NFKC').replace(/[\s，。！？：、]/g,'').replace(/^(?:學生)?(?:能夠|能|可以)?(?:了解|理解|認識|學會|掌握|熟悉)/,'').replace(/^基礎/,'').replace(/的?(?:意義|概念|運用|應用)$/,'')}
const number=value=>{if(/^\d+$/.test(value))return Number(value);const digits='零一二三四五六七八九';if(value==='兩')return 2;if(value.includes('十')){const [a,b]=value.split('十');return (a?digits.indexOf(a):1)*10+(b?digits.indexOf(b):0)}return digits.indexOf(value)};
export function questionPlan(material=''){
 const text=String(material).normalize('NFKC'),plan={};
 const pattern=/(選擇題|簡答題|應用題|實作題|作品題)\s*[:：]?\s*([0-9零一二三四五六七八九十兩]+)\s*題/g;
 for(const match of text.matchAll(pattern)){const kind={'選擇題':'choice','簡答題':'short','應用題':'application','實作題':'work','作品題':'work'}[match[1]];if(kind in plan)throw Error('同一題型的數量重複，請合併成一項要求。');plan[kind]=number(match[2])}
 if(!Object.keys(plan).length)return null;
 const total=Object.values(plan).reduce((a,b)=>a+b,0);if(!Number.isInteger(total)||total<1||total>20)throw Error('題型配額合計需為 1–20 題。');
 return {counts:plan,total};
}
export const questionKind=q=>q.type==='short'&&q.format==='application'?'application':q.type;
export function checkQuestionPlan(questions,counts){if(!counts)return;const actual={};for(const q of questions){const kind=questionKind(q);actual[kind]=(actual[kind]||0)+1}if([...new Set([...Object.keys(actual),...Object.keys(counts)])].some(k=>(actual[k]||0)!==(counts[k]||0)))throw Error('題型配額不符，原有草稿保留，請重新產生。')}
export function planInstruction(counts){return counts?' 必須嚴格符合題型配額 '+JSON.stringify(counts)+'。application 是有具體情境、要求運用概念解題的應用題，輸出 type=short 且 format=application；一般簡答題不可標為 application。其他題型不得填 format。':''}
export function planSchema(schema){schema.properties.questions.items.properties.format={type:'string',enum:['application','']};return schema}
