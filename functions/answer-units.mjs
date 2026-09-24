// Unit presence is checked for any explicit unit, not an allow-list of nouns.
// Exact rational arithmetic is used for numeric values and supported conversions.
const aliases={圓:'元',塊:'元',塊錢:'元',本書:'本',顆糖果:'顆',支:'枝',枝鉛筆:'枝',支鉛筆:'枝',張紙:'張',位:'人',位學生:'人',名學生:'人'};
const frac=(n,d=1n)=>{if(!d)throw Error('zero denominator');return d<0n?{n:-n,d:-d}:{n,d}};
const mul=(a,b)=>frac(a.n*b.n,a.d*b.d);
const equal=(a,b)=>a.n*b.d===b.n*a.d;
const numPattern='[+-]?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?(?:/[+-]?\\d+)?';
function number(text){
 const raw=text.replaceAll(',','');if(raw.length>50)throw Error('number too long');
 if(raw.includes('/')){const [a,b]=raw.split('/');const x=number(a),y=number(b);return frac(x.n*y.d,x.d*y.n)}
 const [mantissa,exp='0']=raw.toLowerCase().split('e'),e=Number(exp);if(!Number.isInteger(e)||Math.abs(e)>12)throw Error('exponent too large');
 const places=(mantissa.split('.')[1]||'').length;let n=BigInt(mantissa.replace('.','')),d=10n**BigInt(places);
 if(e>=0)n*=10n**BigInt(e);else d*=10n**BigInt(-e);return frac(n,d);
}
function unitName(text){return text.normalize('NFKC').trim().replace(/\s/g,'').replace(/[（(]([^()（）]+)[）)]/g,'$1').replace(/\^\{?([23])\}?/g,'$1').replace(/[·⋅×]/g,'*').replace(/−/g,'-')}
function canonical(unit){
 if(Object.hasOwn(aliases,unit))return aliases[unit];
 if(/^[包袋瓶罐箱盒杯碗盤顆粒條尾隻頭匹棵株朵束雙對套件枚面座間輛艘架份組隊排列本張枝][\p{Script=Han}]+$/u.test(unit))return unit[0];
 return unit;
}
function scalar(value){
 let text=String(value??'').normalize('NFKC').trim().replace(/^(?:答案(?:是|為)?\s*[:：]?|答\s*[:：])\s*/,'').replace(/[。.]$/,'').trim();
 const prefixed=new RegExp(`^(NT\\$|US\\$|HK\\$|[$¥€£])\\s*(${numPattern})$`).exec(text);
 if(prefixed)text=prefixed[2]+' '+prefixed[1];
 // A final answer following a purely arithmetic equality is unambiguous.
 if(/^[\d\s.,+\-*/×÷()=]+=[^=]+$/.test(text))text=text.slice(text.lastIndexOf('=')+1).trim();
 const match=new RegExp(`^(${numPattern})\\s*(.*?)$`,'u').exec(text);if(!match)return null;
 const rawUnit=unitName(match[2]);
 if(rawUnit.length>40||rawUnit&&(!/^[\p{Script=Han}a-zA-Zµμ°%‰Ω$¥€£][\p{Script=Han}a-zA-Zµμ°%‰Ω$¥€£\d/*^-]*$/u.test(rawUnit)||/因為|所以|或|約|左右|答案|等於|至少|以上|以下/.test(rawUnit)))return null;
 try{return {value:number(match[1]),display:match[1].replaceAll(',',''),unit:canonical(rawUnit),rawUnit}}catch{return null}
}
const measures=new Map();
function register(names,dimension,n,d=1){for(const name of names.split('|'))measures.set(name,{dimension,factor:frac(BigInt(n),BigInt(d))})}
register('公尺|米|m','L',1);register('公分|厘米|cm','L',1,100);register('毫米|公釐|mm','L',1,1000);register('公里|千米|km','L',1000);
register('克|公克|g','M',1);register('公斤|千克|kg','M',1000);register('毫克|mg','M',1,1000);register('公噸|t','M',1000000);
register('秒|秒鐘|s','T',1);register('分鐘|min','T',60);register('小時|時|h','T',3600);register('天|日','T',86400);
register('公升|升|L|l','L3',1,1000);register('毫升|毫公升|mL|ml|cc','L3',1,1000000);
register('公頃|ha','L2',10000);register('公畝|a','L2',100);
register('%|百分比','P',1,100);register('‰','P',1,1000);
register('度|°|deg','A',1);register('°C|攝氏度|攝氏','C',1);register('°F|華氏度|華氏','F',1);
function measure(unit){
 if(measures.has(unit))return measures.get(unit);
 const power=/^(?:平方(.+)|立方(.+)|(.+?)([23]))$/.exec(unit);
 if(power){const base=measures.get(power[1]||power[2]||power[3]),p=power[1]?2:power[2]?3:Number(power[4]);if(base?.dimension==='L')return {dimension:'L'+p,factor:frac(base.factor.n**BigInt(p),base.factor.d**BigInt(p))}}
 const parts=unit.split('/');if(parts.length===2){const a=measure(parts[0]),b=measure(parts[1]);if(a&&b)return {dimension:a.dimension+'/'+b.dimension,factor:frac(a.factor.n*b.factor.d,a.factor.d*b.factor.n)}}
 return null;
}
function sameUnit(a,b){const x=measure(a),y=measure(b);return a===b||!!(x&&y&&x.dimension===y.dimension&&equal(x.factor,y.factor))}
function promptUnit(question){
 const prompt=question.prompt||'';
 const explicit=prompt.match(/(?:請|須|必須|要)?(?:以|用)([\p{Script=Han}a-zA-Zµμ°%‰\d/^]{1,16})(?:為單位|表示答案|表示)[。？?，,]?/u);
 if(explicit)return {unit:unitName(explicit[1]),required:true};
 const asked=prompt.match(/(?:多少|幾)([\p{Script=Han}a-zA-Zµμ°%‰\d/^]{1,16})[？?。]?$/u);
 return asked?{unit:unitName(asked[1]),required:true}:null;
}
function expectation(question){
 if(/只(?:需)?(?:填|寫)(?:入)?數字|不(?:需|用)(?:填|寫)(?:入)?單位|免寫單位/.test(question.prompt||''))return null;
 const parsed=scalar(question.answer),declared=unitName(String(question.answerUnit||'')),asked=promptUnit(question);
 if(!parsed){const numericReference=/^[+-]?(?:\d|[.$¥€£])/.test(String(question.answer||'').trim())&&/[\p{L}%°$¥€£]/u.test(String(question.answer||''));return declared||asked||numericReference?{uncertain:true,unit:declared||asked?.unit||'待核對'}:null;}
 const inferred=declared||asked?.unit||'';
 if(!parsed.unit&&!inferred)return null;
 const unit=canonical(inferred);
 if(parsed.unit&&declared&&!sameUnit(parsed.unit,unit))return {uncertain:true,unit};
 const expected={...parsed,unit:parsed.unit||unit,rawUnit:parsed.rawUnit||inferred,required:!!declared||!!asked?.required};
 if(asked?.required&&parsed.unit&&!sameUnit(parsed.unit,canonical(asked.unit)))return {uncertain:true,unit:asked.unit};
 return expected;
}
export function inspectAnswerQuantity(question,answer){
 if(question.type==='choice')return null;
 const expected=expectation(question);if(!expected)return null;
 const actual=scalar(answer),expectedAnswer=expected.uncertain?String(question.answer):`${expected.display}${expected.unit}`;
 const common={expectedUnit:expected.unit,actualUnit:actual?.rawUnit||'',expectedAnswer,evidence:`參考答案：${question.answer}；實際作答：${answer}。`};
 const uncertain=()=>({...common,kind:'needs-review',numericCorrect:false,feedback:'這題的單位或作答格式無法由程式完整確認，請老師核對；目前不自動判為全對。'});
 if(expected.uncertain||!actual)return uncertain();
 const sameNumber=equal(actual.value,expected.value),from=measure(actual.unit),to=measure(expected.unit);
 const convertible=from&&to&&from.dimension===to.dimension;
 const converted=convertible&&equal(mul(actual.value,from.factor),mul(expected.value,to.factor));
 if(actual.unit===expected.unit&&sameNumber)return {...common,kind:'verified',numericCorrect:true};
 if(converted&&(!expected.required||sameUnit(actual.unit,expected.unit)))return {...common,kind:'verified',numericCorrect:true};
 if(actual.unit===expected.unit)return {...common,kind:'value-mismatch',numericCorrect:false,feedback:`單位相同，但數值與參考答案 ${expectedAnswer} 不符，請老師核對計算。`};
 if(actual.unit&&!sameNumber&&!converted)return uncertain();
 const ordinary=u=>/^[元本個顆枝張人盒包袋瓶罐箱杯碗盤粒條尾隻頭匹棵株朵束雙對套件枚面座間輛艘架份組隊排列]$/.test(u);
 if(actual.unit&&!converted&&(!from||!to)&&!(ordinary(actual.unit)&&ordinary(expected.unit))&&!expected.required)return uncertain();
 const kind=actual.unit?'wrong-unit':'missing-unit';
 return {...common,kind,numericCorrect:!!(sameNumber||converted),feedback:`${sameNumber||converted?'你的數值正確':'你的數值與參考答案不同'}，但${actual.unit?`這題應使用「${expected.unit}」，你寫的是「${actual.rawUnit}」`:'還沒有寫出單位'}。完整答案是 ${expectedAnswer}。`,evidence:common.evidence+' 單位錯誤或漏寫不能視為全對。'};
}
export function checkAnswerUnit(question,answer){
 const result=inspectAnswerQuantity(question,answer);
 return result&& !['verified','value-mismatch'].includes(result.kind)?result:null;
}
export function assignmentUnitChecks(assignment,submission){
 return assignment.questions.flatMap((q,i)=>{const result=checkAnswerUnit(q,submission.answers[i]);return result?[{questionIndex:i+1,...result}]:[]});
}
