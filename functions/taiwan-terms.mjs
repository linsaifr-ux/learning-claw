// Mainland-Chinese wording that slips into AI output, rewritten to the terms Taiwanese elementary and junior-high
// students learn. Only replacements that are wrong in Taiwan in every context are automatic; words that are also
// correct Taiwanese usage in some sense are only flagged for the teacher.

// [mainland, Taiwan] — longer terms first so 打印機 is handled before 打印.
const REPLACE=[
 ['筆記本電腦','筆記型電腦'],['互聯網','網際網路'],['數據庫','資料庫'],['服務器','伺服器'],['打印機','印表機'],['程序員','程式設計師'],['公交車','公車'],['出租車','計程車'],['獼猴桃','奇異果'],['方便麵','泡麵'],['冰激凌','冰淇淋'],['圓珠筆','原子筆'],['卷筆刀','削鉛筆機'],['宇航員','太空人'],['早上好','早安'],['晚上好','晚安'],['衛生間','廁所'],
 ['視頻','影片'],['軟件','軟體'],['硬件','硬體'],['信息','資訊'],['鼠標','滑鼠'],['打印','列印'],['屏幕','螢幕'],['網絡','網路'],['博客','部落格'],['鏈接','連結'],['默認','預設'],['U盤','隨身碟'],['優盤','隨身碟'],['硬盤','硬碟'],['內存','記憶體'],['激光','雷射'],['短信','簡訊'],['公交','公車'],['西紅柿','番茄'],['酸奶','優格'],['塑料','塑膠'],['編程','程式設計'],['數碼','數位'],['高清','高畫質'],['初中','國中'],
 ['平方厘米','平方公分'],['立方厘米','立方公分'],['平方米','平方公尺'],['立方米','立方公尺'],['千米','公里'],['厘米','公分'],['千克','公斤'],
];
// Correct in Taiwan in some sense, so the teacher decides: [term, suggestion].
const FLAG=[['質量','「品質」（物理的質量不用改）'],['計算機','「電腦」（若指計算器則不用改）'],['項目','「專案」或「項目」依語意'],['水平','「水準」（若指水平方向則不用改）'],['渠道','「管道」'],['文件','「檔案」或「文件」依語意'],['數據','「資料」或「數據」依語意'],['程序','「程式」或「步驟」依語意'],['土豆','「馬鈴薯」（台灣的土豆是花生）'],['自行車','「腳踏車」（自行車道不用改）'],['摩托車','「機車」'],['地鐵','「捷運」（國外的地鐵可保留）'],['空調','「冷氣」'],['智能','「智慧」（智能障礙等專有名詞不用改）'],['信號','「訊號」'],['老鄉','「同鄉」'],['搞定','「完成」'],['靠譜','「可靠」'],['點贊','「按讚」'],['打車','「搭計程車」']];
// A few simplified characters that only exist in simplified Chinese and map to a single traditional character.
const SIMPLIFIED={们:'們',这:'這',个:'個',说:'說',时:'時',为:'為',会:'會',学:'學',习:'習',题:'題',问:'問',关:'關',门:'門',开:'開',东:'東',车:'車',长:'長',见:'見',写:'寫',读:'讀',书:'書',对:'對',动:'動',点:'點',样:'樣',还:'還',进:'進',过:'過',从:'從',经:'經',没:'沒',认:'認',让:'讓',请:'請',谁:'誰',给:'給',边:'邊',数:'數',线:'線',图:'圖',计:'計',区:'區',场:'場',应:'應',实:'實',现:'現',觉:'覺',钱:'錢',买:'買',卖:'賣',鸟:'鳥',鱼:'魚',马:'馬',猫:'貓',树:'樹',叶:'葉',风:'風',电:'電',脑:'腦',饭:'飯',吗:'嗎',儿:'兒',亲:'親',爱:'愛',乐:'樂',欢:'歡',试:'試',错:'錯',选:'選',项:'項',确:'確',种:'種',类:'類',号:'號',级:'級',阶:'階',纸:'紙',笔:'筆',画:'畫',颜:'顏',绿:'綠',红:'紅',蓝:'藍',黄:'黃'};

const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const replaceRule=new RegExp(REPLACE.map(([a])=>escape(a)).join('|'),'g'),replaceMap=Object.fromEntries(REPLACE);
const simplifiedRule=new RegExp('['+Object.keys(SIMPLIFIED).join('')+']','g');

// Simplified characters are converted only on request (stray characters in an AI reply); converting a few
// characters of a fully simplified text would leave a mix, so stored originals are never touched.
export const simplifiedCount=text=>typeof text==='string'?(text.match(simplifiedRule)||[]).length:0;
export function localizeTaiwan(text,{simplified=false}={}){
 if(typeof text!=='string'||!/[㐀-鿿]/.test(text))return text;
 let out=(simplified?text.replace(simplifiedRule,c=>SIMPLIFIED[c]):text).replace(replaceRule,m=>replaceMap[m]);
 // Number + 米 is a length in metres; 玉米 / 米飯 have no number before them.
 out=out.replace(/菠蘿(?!麵包)/g,'鳳梨').replace(/(\d)(\s*)米(?![飯粉糕粒酒])/g,'$1$2公尺').replace(/(?<![公立])噸/g,'公噸').replace(/橡皮(?![擦筋艇球圈])/g,'橡皮擦').replace(/(?<![國高年月正])初([一二三])(?=[學年生上下的同班])/g,'國$1');
 return out;
}
// Walk any JSON-like value and localise every string (ids and other ASCII strings are untouched).
export function localizeDeep(value,options){if(typeof value==='string')return localizeTaiwan(value,options);if(Array.isArray(value))return value.map(v=>localizeDeep(v,options));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localizeDeep(v,options)]));return value}
// The student-facing text of a question (choice answers are letters and stay as they are).
export function localizeQuestion(q){if(!q||typeof q!=='object')return q;const out={...q};for(const k of ['prompt','explanation','answer','answerUnit'])if(typeof out[k]==='string')out[k]=localizeTaiwan(out[k]);if(Array.isArray(out.options))out.options=out.options.map(o=>localizeTaiwan(o));return out}
// Words worth a second look, with a suggestion: [{term,suggestion}].
export function mainlandTermNotes(text){if(typeof text!=='string')return [];const seen=new Set();return FLAG.filter(([term])=>text.includes(term)&&!seen.has(term)&&seen.add(term)).map(([term,suggestion])=>({term,suggestion}))}
export const TAIWAN_STYLE='使用臺灣國中小課本與生活中的正體中文用語，不使用中國大陸用語或簡體字。例如：影片（不寫視頻）、軟體（軟件）、資訊（信息）、網路（網絡）、列印（打印）、螢幕（屏幕）、滑鼠（鼠標）、品質（質量，物理質量除外）、腳踏車（自行車）、公車（公交車）、捷運（地鐵）、計程車（出租車）、番茄（西紅柿）、鳳梨（菠蘿）、馬鈴薯（土豆）、機車（摩托車）、優格（酸奶）、塑膠（塑料）、冷氣（空調）、國中（初中）、公尺／公分／公斤（米／厘米／千克），長度單位可用毫米；人名、地名、店名與生活情境以臺灣常見的為主。';
