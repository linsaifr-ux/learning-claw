// Teacher-built machines and uploaded prize models. Shared by the server rules, the student view and the browser.
// Uploaded prizes are stored in the workspace with their collider; the GLB bytes live in the server database.
export const CUSTOM_PRIZE=/^u-[0-9a-f]{12}$/,CUSTOM_MACHINE=/^cm-[0-9a-f]{12}$/;
export const LIMITS={portraitChars:400000,prizes:30,machines:12,machinePrizes:[1,6],modelBytes:8*1024*1024,vertices:200000,hullPoints:64,thumbnailChars:200000};
export const isCustomPrize=kind=>typeof kind==='string'&&CUSTOM_PRIZE.test(kind);
export const isCustomMachine=id=>typeof id==='string'&&CUSTOM_MACHINE.test(id);
const fail=message=>{throw new Error(message)};
const check=(ok,message)=>{if(!ok)fail(message)};
const text=(value,max,label)=>{check(typeof value==='string'&&value.trim().length>0&&value.length<=max,`請填寫${label}（最多 ${max} 字）`);return value.trim()};
const color=(value,label)=>{check(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value),`${label}顏色格式不正確`);return value.toLowerCase()};

// A machine-ready record for the lobby and the 3D cabinet, numbered after the built-in machines.
export function customMachineList(state,builtIn=[]){return (state?.customMachines||[]).map((m,i)=>({...m,number:String(builtIn.length+i+1).padStart(2,'0'),custom:true}))}
export function customPrizeInfo(state,kind){const p=(state?.customPrizes||[]).find(x=>x.id===kind);return p&&{id:p.id,name:p.name,rarity:'common',color:'#8f7a5c',icon:'★',note:p.note||'老師上傳的收藏模型',custom:true,thumbnail:p.thumbnail}}
// Collider data for a pool: only the uploaded prizes need it; built-in ones ship with the code.
export function customCatalog(state,pool){const hulls={};for(const kind of pool)if(isCustomPrize(kind)){const p=(state?.customPrizes||[]).find(x=>x.id===kind);check(p,'機台中的自訂收藏已不存在');hulls[kind]=p.hull}return {pool:[...pool],hulls}}

export function addCustomPrize(s,record){
 s.customPrizes||=[];check(s.customPrizes.length<LIMITS.prizes,`自訂收藏最多 ${LIMITS.prizes} 款`);
 check(isCustomPrize(record.id)&&!s.customPrizes.some(p=>p.id===record.id),'收藏識別碼無效');
 check(/^[0-9a-f]{64}$/.test(record.model),'模型檔案識別碼無效');
 check(Array.isArray(record.hull)&&record.hull.length===1&&record.hull[0].length>=12&&record.hull[0].length<=LIMITS.hullPoints*3&&record.hull[0].every(Number.isFinite),'碰撞外形無效');
 check(typeof record.thumbnail==='string'&&record.thumbnail.length<=LIMITS.thumbnailChars&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(record.thumbnail),'預覽圖需為 PNG');
 check(record.rights===true,'請確認你有權使用此模型');
 s.customPrizes.push({id:record.id,name:text(record.name,30,'收藏名稱'),note:record.note?text(record.note,80,'收藏介紹'):'',source:text(record.source,100,'模型來源'),rights:true,model:record.model,bytes:record.bytes,vertices:record.vertices,hull:record.hull,thumbnail:record.thumbnail,at:record.at});
}

export function customMachineAction(s,a,{builtInMachines,builtInPrize,id}){
 s.customMachines||=[];s.customPrizes||=[];
 if(a.type==='saveCustomMachine'){
  const m=a.machine||{};const existing=m.id?s.customMachines.find(x=>x.id===m.id):null;check(!m.id||existing,'找不到這台自訂機台');
  check(existing||s.customMachines.length<LIMITS.machines,`自訂機台最多 ${LIMITS.machines} 台`);
  const prizes=Array.isArray(m.prizes)?m.prizes:[];const [min,max]=LIMITS.machinePrizes;
  check(prizes.length>=min&&prizes.length<=max&&new Set(prizes).size===prizes.length,`每台機台請選 ${min}–${max} 款不重複的收藏`);
  check(prizes.every(k=>builtInPrize(k)||s.customPrizes.some(p=>p.id===k)),'機台中有不存在的收藏');
  const name=text(m.name,12,'機台名稱');check(!builtInMachines.some(x=>x.name===name)&&!s.customMachines.some(x=>x.name===name&&x.id!==m.id),'已有同名機台');
  // The portrait (a rendered image of the cabinet) is stored by the server; the workspace keeps only its hash.
  check(m.portrait===undefined||/^[0-9a-f]{64}$/.test(m.portrait),'機台預覽圖無效');
  const record={id:existing?.id||'cm-'+id().replace(/-/g,'').slice(0,12),name,portrait:m.portrait||existing?.portrait,subtitle:m.subtitle?text(m.subtitle,40,'機台說明'):'老師準備的收藏機台',color:color(m.color,'機台'),accent:color(m.accent,'招牌'),prizes:[...prizes],at:existing?.at||a.now};
  if(existing)Object.assign(existing,record);else s.customMachines.push(record);
  return record;
 }
 if(a.type==='deleteCustomMachine'){
  check(s.customMachines.some(m=>m.id===a.machineId),'找不到這台自訂機台');
  s.customMachines=s.customMachines.filter(m=>m.id!==a.machineId);
  // Games already paid for keep their own prize snapshot; the class simply stops offering the machine.
  for(const c of s.classes)if(c.enabledMachines)c.enabledMachines=c.enabledMachines.filter(x=>x!==a.machineId);
  return;
 }
 if(a.type==='updateCustomPrize'){
  const p=s.customPrizes.find(x=>x.id===a.prizeId);check(p,'找不到這款自訂收藏');
  p.name=text(a.name,30,'收藏名稱');p.note=a.note?text(a.note,80,'收藏介紹'):'';return;
 }
 if(a.type==='deleteCustomPrize'){
  const p=s.customPrizes.find(x=>x.id===a.prizeId);check(p,'找不到這款自訂收藏');
  check(!s.customMachines.some(m=>m.prizes.includes(p.id)),'請先把這款收藏從所有自訂機台移除');
  check(!s.inventory.some(i=>i.kind===p.id),'已有學生收藏這款模型，為保留學生收藏不能刪除');
  check(!s.sessions.some(g=>g.status==='active'&&g.pool?.includes(p.id)),'有學生正在使用這款收藏的機台，請稍後再刪除');
  s.customPrizes=s.customPrizes.filter(x=>x.id!==p.id);return;
 }
 fail('不支援的機台操作');
}
