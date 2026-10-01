// Keep the same receipt after an uncertain transport failure. Successful grants
// always get a fresh ID so teachers can intentionally award the same amount again.
export function createGrantRetry(makeId=()=>crypto.randomUUID()){
 const pending=new Map();
 return async (actor,action,send)=>{
  if(action.type!=='grant')return send({...action,requestId:makeId()});
  const key=JSON.stringify([actor,[...new Set(action.ids||[])].sort(),action.amount,action.reason]);
  let entry=pending.get(key);
  if(entry?.flight)return entry.flight;
  if(!entry){entry={id:makeId()};pending.set(key,entry)}
  const flight=Promise.resolve().then(()=>send({...action,requestId:entry.id})).then(result=>{pending.delete(key);return result},error=>{
   const definite=error.status>=400&&error.status<500||['functions/invalid-argument','functions/permission-denied','functions/unauthenticated','functions/failed-precondition','functions/resource-exhausted'].includes(error.code);
   if(definite)pending.delete(key);
   throw error;
  }).finally(()=>{entry.flight=null});
  entry.flight=flight;return flight;
 }
}
