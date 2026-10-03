// Shared, browser-safe shape validation. Authenticity is checked by the desktop service.
export function cleanResourceLinks(value=[]){
 if(!Array.isArray(value)||value.length>3)throw Error('每次最多附上三份教學資源');
 if(new Set(value.map(r=>r?.id)).size!==value.length)throw Error('教學資源不可重複');
 return value.map(r=>{if(!r||typeof r.id!=='string'||!(/^(?:6318:\d+|41560:[a-f0-9]{16}:\d+)$/.test(r.id))||typeof r.snapshot!=='string'||!/^[a-f0-9]{64}$/.test(r.snapshot)||typeof r.title!=='string'||!r.title.trim()||r.title.length>300||typeof r.url!=='string'||!(/^https:\/\/stv\.naer\.edu\.tw\/watch\/\d+$/.test(r.url)||/^https:\/\/(?:video\.cloud\.edu\.tw|(?:www\.)?eteacher\.edu\.tw)\/[^\s]*$/.test(r.url)))throw Error('教學資源來源格式不正確');return {id:r.id,snapshot:r.snapshot,title:r.title,url:r.url,source:String(r.source||'愛學網').slice(0,100),duration:String(r.duration||'').slice(0,30),license:String(r.license||'').slice(0,80)}});
}
export function cleanDataEvidence(e){
 if(!e)return undefined;
 if(!e||!['sum','difference','comparison'].includes(e.template)||e.version!==1||!Number.isInteger(e.year)||e.year<103||e.year>200||!['primary','junior'].includes(e.stage)||!Array.isArray(e.counties)||e.counties.length!==2||e.counties.some(v=>typeof v!=='string'||v.length>20)||e.counties[0]===e.counties[1]||typeof e.snapshot!=='string'||!/^[a-f0-9]{64}$/.test(e.snapshot))throw Error('開放資料題目來源格式不正確');
 return {version:1,template:e.template,year:e.year,stage:e.stage,counties:e.counties,snapshot:e.snapshot};
}
