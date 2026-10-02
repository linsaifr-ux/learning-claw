// Session storage survives a reload, but intentionally not a closed shared-device tab.
export function createDurableAction({storage,makeId=()=>crypto.randomUUID()}={}){
 const flights=new Map();
 return async(actor,action,send)=>{
  if(!['grant','submit'].includes(action.type))return send({...action,requestId:makeId()});
  const payload={...action};delete payload.requestId;
  if(payload.type==='grant')payload.ids=[...new Set(payload.ids||[])].sort();
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([actor,stable(payload)])));
  const key='claw-pending:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(flights.has(key))return flights.get(key);
  let id;try{id=storage.getItem(key)||makeId();storage.setItem(key,id)}catch{throw Error('瀏覽器無法保存送出紀錄。請允許此網站使用儲存空間後重試。')}
  const clear=()=>{try{storage.removeItem(key)}catch{}};
  const flight=Promise.resolve().then(()=>send({...payload,requestId:id})).then(result=>{clear();return result},error=>{
   // Authentication/rate failures do not prove whether an earlier attempt was committed.
   if([400,409,422].includes(error.status))clear();throw error;
  }).finally(()=>flights.delete(key));flights.set(key,flight);return flight;
 };
}
export function clearClassroomSession(storage){try{for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith('claw-draft:'))storage.removeItem(key)}}catch{}}
