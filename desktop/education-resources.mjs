// Official endpoint only. Never echo provider URLs, keys or raw errors.
const endpoint='https://market.cloud.edu.tw/api/v2/search/edumarket/';
export function resourceKey(value){if(typeof value!=='string'||value.length<8||value.length>512||/\s/.test(value))throw Error('請填寫完整教育大市集 API Key');return value}
function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''}catch{return ''}}
export async function searchEducationResources({key,query,page=1,fetchImpl=fetch}){
 resourceKey(key);if(typeof query!=='string'||!query.trim()||query.length>100||!Number.isInteger(page)||page<1||page>1000)throw Error('請輸入100字內的資源關鍵字及有效頁碼');
 const u=new URL(endpoint+encodeURIComponent(query.trim()));u.search=new URLSearchParams({key,page:String(page),rows:'20'}).toString();let data;
 try{const r=await fetchImpl(u,{redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!r.ok)throw Error();const raw=await r.text();if(raw.length>2000000)throw Error();data=JSON.parse(raw)}catch{throw Error('教育大市集連線失敗，請確認金鑰及網路後重試。')}
 if(data.status!==1||!Array.isArray(data.resources))throw Error('教育大市集未接受此查詢，請確認 API 已開通及金鑰有效。');
 const str=x=>typeof x==='string'?x.slice(0,3000):'',arr=x=>Array.isArray(x)?x.map(str).filter(Boolean).slice(0,50):[];
 return {page,totalPages:Math.max(0,Number(data.totalpage)||0),records:data.resources.slice(0,20).map(r=>({id:String(r.id).slice(0,80),title:str(r.title),description:str(r.desc),url:safeUrl(r.url),license:str(r.copyright)||'未提供授權標示',grades:arr(r.grade),domains:arr(r.domain),keywords:arr(r.keyword),attachments:Array.isArray(r.attachment)?r.attachment.slice(0,20).map(a=>({name:str(a.name),url:safeUrl(a.link),type:str(a.type)})).filter(a=>a.url):[],learningMap:Array.isArray(r.learningmap?.item)?r.learningmap.item.slice(0,30).map(i=>({domain:str(i.domain),stage:str(i.level),content:str(i.content),performance:str(i.performance)})):[],status:'source-only',notice:'搜尋到來源不代表已取得再利用授權，也不代表已拆成可出題的題目。'}))};
}
