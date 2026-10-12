import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {TOYS,MACHINES} from '../functions/domain.mjs';
import {LIMITS,customCatalog} from '../functions/custom-machines.mjs';
import {ToyPortrait} from './Identity.jsx';
const ModelPreview=lazy(()=>import('./ModelPreview.jsx'));
const ClawWorld=lazy(()=>import('./World.jsx').then(m=>({default:m.ClawWorld})));
// Renders the machine off-screen from the lobby camera, like the built-in lobby pictures, and hands back the image.
function PortraitCapture({machine,custom,onDone}){
 const ref=useRef(),done=useRef(false);
 const finish=image=>{if(done.current)return;done.current=true;onDone(image)};
 useEffect(()=>{const t=setTimeout(()=>finish(null),25000);return()=>clearTimeout(t)},[]);
 const capture=()=>{let image=ref.current?.snapshot();
  if(image&&image.length>LIMITS.portraitChars*.95){const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.width/2;c.height=img.height/2;c.getContext('2d').drawImage(img,0,0,c.width,c.height);const small=c.toDataURL('image/webp',.8);finish(small.length<=LIMITS.portraitChars?small:null)};img.onerror=()=>finish(null);img.src=image;return}
  finish(image)};
 return <div className="portrait-capture" aria-hidden="true"><Suspense fallback={null}><ClawWorld ref={ref} machineId="portrait" poolId="legacy" custom={custom} skin={{name:machine.name,color:machine.color,accent:machine.accent}} seed={12345} onReady={ready=>{if(!ready||done.current)return;ref.current.view('lobby');setTimeout(capture,1200)}}/></Suspense></div>;
}
const blank={name:'',subtitle:'',color:'#5b6b8c',accent:'#f3d58c',prizes:[]};
const readBase64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(Error('無法讀取檔案'));r.readAsDataURL(file)});

// Teacher tools: upload GLB prizes, then build machines from uploaded and built-in prizes.
export default function CustomMachines({state,act,busy,cloud,notify}){
 const prizes=state.customPrizes||[],machines=state.customMachines||[];
 const [file,setFile]=useState(null),[thumbnail,setThumbnail]=useState(''),[fileError,setFileError]=useState(''),[form,setForm]=useState({name:'',source:'',note:'',rights:false}),[uploading,setUploading]=useState(false);
 const [editor,setEditor]=useState(null),[rename,setRename]=useState(null),[capturing,setCapturing]=useState(false),[,setBackfilled]=useState(0);
 // Machines saved before lobby pictures existed get theirs rendered here, one at a time, without asking.
 const tried=useRef(new Set());
 const missing=cloud.desktop&&!editor&&!capturing&&!busy?machines.find(m=>!m.portrait&&!tried.current.has(m.id)):null;
 async function backfill(m,portrait){tried.current.add(m.id);if(portrait)await act({type:'saveCustomMachine',machine:{id:m.id,name:m.name,subtitle:m.subtitle,color:m.color,accent:m.accent,prizes:m.prizes,portrait}},{});setBackfilled(n=>n+1)}
 const desktop=!!cloud.desktop;
 const pick=f=>{setThumbnail('');setFileError('');if(!f){setFile(null);return}if(!/\.glb$/i.test(f.name)){setFile(null);setFileError('請選擇 .glb 檔（glTF 2.0 二進位格式）');return}if(f.size>LIMITS.modelBytes){setFile(null);setFileError(`檔案 ${(f.size/1024/1024).toFixed(1)} MB，超過 ${LIMITS.modelBytes/1024/1024} MB 上限`);return}setFile(f);if(!form.name)setForm(v=>({...v,name:f.name.replace(/\.glb$/i,'').slice(0,30)}))};
 async function upload(e){e.preventDefault();if(!file||!thumbnail)return;setUploading(true);try{const result=await cloud.uploadCustomPrize({...form,glb:await readBase64(file),thumbnail});notify(`已加入「${result.prize.name}」，可以放進自訂機台`);setFile(null);setThumbnail('');setForm({name:'',source:'',note:'',rights:false});e.target.reset()}catch(err){notify(err.message,true)}finally{setUploading(false)}}
 const toggle=id=>setEditor(v=>({...v,prizes:v.prizes.includes(id)?v.prizes.filter(x=>x!==id):v.prizes.length>=LIMITS.machinePrizes[1]?v.prizes:[...v.prizes,id]}));
 async function save(portrait){setCapturing(false);if(await act({type:'saveCustomMachine',machine:{...editor,...(portrait?{portrait}:{})}},{message:editor.id?'機台已更新':'機台已建立，請到「機台」分頁開放給班級'}))setEditor(null)}
 function saveMachine(e){e.preventDefault();if(desktop)setCapturing(true);else save(null)}
 const choices=[...prizes.map(p=>({id:p.id,name:p.name,group:'我上傳的收藏'})),...TOYS.map(t=>({id:t.id,name:t.name,group:'內建收藏'}))];
 return <div className="custom-machines">
  <section className="panel"><h2>上傳收藏模型</h2><p className="muted">支援 .glb（glTF 2.0 二進位）檔，{LIMITS.modelBytes/1024/1024} MB、{(LIMITS.vertices/10000)} 萬個頂點以內；不支援 Draco／meshopt 壓縮，貼圖需嵌入檔案內。放進機台時會自動縮放到和其他收藏相近的大小，伺服器會檢查模型能否在機台裡站穩。</p>
   {!desktop?<p className="notice">示範模式不能上傳模型，請使用老師電腦版。</p>:<form className="custom-upload" onSubmit={upload}>
    <div className="custom-upload-fields"><label className="field">模型檔<input type="file" accept=".glb,model/gltf-binary" onChange={e=>pick(e.target.files?.[0])} disabled={uploading}/></label>{fileError&&<p role="alert" className="notice error">{fileError}</p>}
     <label className="field">收藏名稱<input value={form.name} maxLength={30} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
     <label className="field">模型來源<input value={form.source} maxLength={100} placeholder="例如：自己建模、Poly Pizza（CC BY）作者名" onChange={e=>setForm({...form,source:e.target.value})} required/></label>
     <label className="field">收藏介紹（選填）<input value={form.note} maxLength={80} onChange={e=>setForm({...form,note:e.target.value})}/></label>
     <label className="check"><input type="checkbox" checked={form.rights} onChange={e=>setForm({...form,rights:e.target.checked})}/>我確認有權在課堂中使用此模型，且模型不含學生個資或不當內容</label>
     <button className="primary" disabled={!file||!thumbnail||!form.rights||!form.name.trim()||!form.source.trim()||uploading}>{uploading?'上傳與檢查中…':'上傳並檢查模型'}</button></div>
    {file&&<Suspense fallback={<p>載入預覽…</p>}><ModelPreview file={file} onThumbnail={setThumbnail} onError={message=>{setFileError(message);setFile(null)}}/></Suspense>}
   </form>}
  </section>
  <section className="panel"><div className="section-head"><h2>我上傳的收藏 · {prizes.length}/{LIMITS.prizes}</h2></div>
   {prizes.length?<div className="custom-prize-grid">{prizes.map(p=><article key={p.id} className="custom-prize-card"><ToyPortrait kind={p.id}/>{rename?.id===p.id?<form onSubmit={async e=>{e.preventDefault();if(await act({type:'updateCustomPrize',prizeId:p.id,name:rename.name,note:rename.note},{message:'已更新收藏名稱'}))setRename(null)}}><input aria-label="收藏名稱" value={rename.name} maxLength={30} onChange={e=>setRename({...rename,name:e.target.value})}/><div className="button-row"><button className="primary" disabled={busy||!rename.name.trim()}>保存</button><button type="button" onClick={()=>setRename(null)}>取消</button></div></form>:<><b>{p.name}</b><small>{p.source}</small><div className="button-row"><button type="button" onClick={()=>setRename({id:p.id,name:p.name,note:p.note||''})}>改名</button><button type="button" disabled={busy} onClick={()=>{if(confirm(`刪除「${p.name}」？已有學生收藏或仍在機台中的模型不能刪除。`))act({type:'deleteCustomPrize',prizeId:p.id},{message:'已刪除收藏模型'})}}>刪除</button></div></>}</article>)}</div>:<p className="muted">還沒有上傳的收藏。上傳後即可放進自訂機台。</p>}
  </section>
  <section className="panel"><div className="section-head"><h2>自訂機台 · {machines.length}/{LIMITS.machines}</h2>{!editor&&desktop&&<button className="primary" disabled={machines.length>=LIMITS.machines} onClick={()=>setEditor({...blank})}>＋ 新增機台</button>}</div>
   {editor&&<form className="custom-machine-editor" onSubmit={saveMachine}><h3>{editor.id?'編輯機台：'+editor.name:'新增機台'}</h3>
    <div className="form-grid"><label className="field">機台名稱<input value={editor.name} maxLength={12} onChange={e=>setEditor({...editor,name:e.target.value})} required/></label><label className="field">一句話介紹（選填）<input value={editor.subtitle} maxLength={40} onChange={e=>setEditor({...editor,subtitle:e.target.value})}/></label><label className="field">機身顏色<input type="color" value={editor.color} onChange={e=>setEditor({...editor,color:e.target.value})}/></label><label className="field">招牌文字顏色<input type="color" value={editor.accent} onChange={e=>setEditor({...editor,accent:e.target.value})}/></label></div>
    <fieldset className="custom-machine-prizes"><legend>機台裡的收藏（已選 {editor.prizes.length}／最多 {LIMITS.machinePrizes[1]} 款）</legend>{['我上傳的收藏','內建收藏'].map(group=><div key={group}><small>{group}</small><div className="custom-choice-grid">{choices.filter(c=>c.group===group).map(c=><label key={c.id} className={editor.prizes.includes(c.id)?'selected':''}><input type="checkbox" checked={editor.prizes.includes(c.id)} disabled={!editor.prizes.includes(c.id)&&editor.prizes.length>=LIMITS.machinePrizes[1]} onChange={()=>toggle(c.id)}/><ToyPortrait kind={c.id}/><span>{c.name}</span></label>)}{group==='我上傳的收藏'&&!prizes.length&&<p className="muted">先在上方上傳模型。</p>}</div></div>)}</fieldset>
    <p className="fine">保存時會產生大廳用的 3D 機台預覽圖，伺服器也會實際擺放幾次，確認這組收藏能在機台裡站穩；已付代幣的當局會照開局時的收藏完成。</p>{capturing&&<PortraitCapture machine={editor} custom={customCatalog(state,editor.prizes)} onDone={save}/>}
    <div className="button-row"><button className="primary" disabled={busy||capturing||!editor.name.trim()||!editor.prizes.length}>{capturing?'產生機台預覽圖…':busy?'檢查擺放中…':'保存機台'}</button><button type="button" onClick={()=>setEditor(null)}>取消</button></div></form>}
   {missing&&<><p className="fine" role="status">正在為「{missing.name}」產生遊戲大廳的 3D 機台圖…</p><PortraitCapture key={missing.id} machine={missing} custom={customCatalog(state,missing.prizes)} onDone={image=>backfill(missing,image)}/></>}{machines.length?<div className="custom-machine-list">{machines.map(m=><article key={m.id} style={{'--machine-color':m.color}}><div><b>{m.name}</b><small>{m.subtitle}</small><span>{m.prizes.map(id=>prizes.find(p=>p.id===id)?.name||TOYS.find(t=>t.id===id)?.name||'已移除').join('、')}</span></div><div className="button-row"><button type="button" onClick={()=>setEditor({id:m.id,name:m.name,subtitle:m.subtitle,color:m.color,accent:m.accent,prizes:[...m.prizes]})}>編輯</button><button type="button" disabled={busy} onClick={()=>{if(confirm(`刪除「${m.name}」？各班的開放設定會一併移除，已付代幣的當局仍可完成。`))act({type:'deleteCustomMachine',machineId:m.id},{message:'已刪除機台'})}}>刪除</button></div></article>)}</div>:!editor&&<p className="muted">還沒有自訂機台。內建 {MACHINES.length} 台機台仍可在「機台」分頁開放。</p>}
  </section>
 </div>;
}
