import React,{useEffect,useRef,useState} from 'react';
import {Eye,EyeOff,KeyRound,Loader2,RefreshCw,Trash2} from 'lucide-react';
import {configured} from './firebase';
export default function AISettings({cloud,notify,onReset}){
 const[key,setKey]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[info,setInfo]=useState(null),[error,setError]=useState(''),[test,setTest]=useState(null),[consent,setConsent]=useState(false);const dialog=useRef(null);
 useEffect(()=>{let active=true;if(configured)cloud.keyStatus().then(r=>{if(active)setInfo(r)}).catch(()=>{if(active)setError('無法讀取 AI 設定，請確認登入身分與伺服器狀態。')});return()=>{active=false}},[]);
 async function run(fn){if(busy)return;setBusy(true);setError('');try{await fn()}catch(e){setError(e.message?.replace(/^Firebase:\s*/, '')||'操作失敗，請重試')}finally{setBusy(false)}}
 const state=!configured?'等待 Firebase 設定':!info?'讀取設定中':!info.configured?'尚未儲存金鑰':!info.enabled?'等待管理者啟用':test?'連線測試成功':'金鑰已儲存・尚未測試';
 return <><div className="page-title"><div><div className="eyebrow">06 / 教師工具設定</div><h1>接上你的備課助理。</h1><p>每位老師使用自己的 Gemini 金鑰，學生端不提供 AI 操作。</p></div></div><div className="settings-layout"><div>
 <section className="panel"><div className="section-head"><h2><KeyRound size={20}/>教師 Gemini API Key</h2><span className="badge">{state}</span></div>
 {!configured&&<div className="notice">目前尚未連接 Firebase。請先依下方教學建立後端，再回來填入金鑰；此示範頁不儲存或傳送金鑰。</div>}
 <p>金鑰由 教師後端加密保存，不會寫入網站原始碼、瀏覽器儲存空間或學生資料。</p>
 <label className="field"><span>API Key</span><div className="key-input"><input aria-label="教師 Gemini API Key" disabled={!configured||busy} type={show?'text':'password'} autoComplete="off" spellCheck="false" value={key} onChange={e=>setKey(e.target.value)} placeholder={cloud.desktop?'貼上老師自己的 Gemini API Key':'完成 Firebase 設定後，貼上教師金鑰'}/><button type="button" aria-label={show?'隱藏金鑰':'顯示金鑰'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
 <div className="button-row"><button className="primary" disabled={busy||!configured||!key.trim()} onClick={()=>run(async()=>{await cloud.saveKey(key.trim());setKey('');setShow(false);setTest(null);setInfo(await cloud.keyStatus());notify('金鑰已儲存，請測試連線')})}>儲存金鑰</button><button disabled={busy||!info?.configured||!info?.enabled||!consent} onClick={()=>run(async()=>{setTest(null);const result=await cloud.testKey();setTest(result);notify('Gemini 連線成功')})}>{busy?<Loader2 size={17} className="spin"/>:<RefreshCw size={17}/>}測試連線</button><button disabled={busy||!info?.configured} onClick={()=>dialog.current.showModal()}><Trash2 size={16}/>刪除金鑰</button></div>
 <label className="ai-confirm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我了解測試會向 Google 傳送「請只回答：連線成功」，並使用少量 API 額度。</label>
 <dl className="ai-connection"><div><dt>使用模型</dt><dd>{info?.model||'部署後顯示'}</dd></div><div><dt>金鑰保存</dt><dd>{info?.updatedAt?new Date(info.updatedAt).toLocaleString('zh-TW'):'尚無紀錄'}</dd></div>{test&&<div><dt>本次測試</dt><dd>{test.model} · {(test.latencyMs/1000).toFixed(1)} 秒</dd></div>}</dl>
 {error&&<div className="notice error" role="alert">{error}</div>}{info&&!info.enabled&&<p className="notice">後端尚未啟用 AI。管理者需設定 AI_ENABLED=true 並重新啟動後端服務。</p>}
 <p className="fine">儲存成功不代表連線成功。免費額度依 Google 專案與模型而定；本系統不自動更換模型、不自動重試，也不會替你開啟計費。已開啟計費的 Google 專案仍可能產生費用。</p>
 </section>
 <section className="panel privacy-note"><h3>免費 API 的資料界線</h3><p>備課可使用一般教材。分析前，請移除姓名、學號、聯絡方式及可辨識身分的細節；不要送出敏感或機密學生資料。自動遮蔽不能取代老師檢查。</p><p>AI 僅提供學習概念、作答證據及補強建議，提供批改建議，由老師核對分數與回饋後發布。</p><a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google 資料使用條款 ↗</a></section>
 <section className="panel"><h3>{cloud.desktop?'老師電腦伺服器':'Firebase 連線'}</h3><p>{cloud.desktop?'資料與加密金鑰保存在老師電腦，請備份完整資料資料夾。':configured?'已設定雲端專案；教師權限由後端驗證。':'先建立你的 Firebase 專案，才能安全保存每位老師的金鑰。'}</p><a href="/free-setup.html" target="_blank" rel="noreferrer">免費部署與 Firebase 設定教學 ↗</a>{!configured&&<button className="text-btn reset-demo" onClick={onReset}>重設示範資料</button>}</section></div>
 <section className="panel setup-guide"><span className="eyebrow">TEACHER’S FIELD GUIDE</span><h2>老師第一次設定</h2>{[
 ['登入 AI Studio',<>使用成人教師的 Google 帳號開啟 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">API Keys 頁面 ↗</a>，依 Google 畫面完成帳號設定。</>],
 ['建立專用金鑰','選擇或建立 Google Cloud 專案，再建立 API Key。這個專案可以與學校的 Firebase 專案分開；每位老師使用自己的金鑰。'],
 ['確認模型與免費用量',<>在 AI Studio 檢查專案計費狀態、模型權限和 <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noreferrer">用量限制 ↗</a>。同一專案的多把金鑰共用配額，免費額度不是無限使用。</>],
 ['回到此頁儲存','只在左側金鑰欄貼上，按「儲存金鑰」。保存後欄位會清空；不要把金鑰貼進教材、對話或 GitHub。'],
 ['測試連線','確認測試說明後勾選核取方塊，再按「測試連線」。成功時會顯示使用模型和回應秒數。'],
 ['出題與學習觀察','到「教學與出題」填寫年級、科目、單元和教材，產生 3 題草稿；或到「學習觀察」開啟作答，由老師主動分析。審閱後再發布。']
 ].map(([title,body],i)=><div className="guide-step" key={title}><span>{i+1}</span><div><b>{title}</b><p>{body}</p></div></div>)}<details><summary>測試失敗怎麼處理？</summary><p>金鑰或權限錯誤：檢查金鑰所屬專案及 API 限制，必要時重新建立金鑰。</p><p>模型不存在：請管理者更新 GEMINI_MODEL；系統不會擅自切換模型。</p><p>額度不足：到 AI Studio 查看用量，依 Google 顯示的限制等待後再試。</p><p>尚未啟用：請管理者完成 Firebase 部署及 AI_ENABLED 設定。系統另外限制每位老師每 10 秒一次、每天 50 次，測試也計入。</p></details></section></div>
 <dialog ref={dialog}><h2>刪除教師金鑰？</h2><p>刪除後 AI 暫停，代幣和收藏不受影響。這只刪除本站保存的金鑰；如需撤銷金鑰，請到 AI Studio 操作。</p><div className="button-row"><button disabled={busy} onClick={()=>dialog.current.close()}>取消</button><button className="primary" disabled={busy} onClick={()=>run(async()=>{await cloud.deleteKey();setInfo(i=>({...i,configured:false,updatedAt:null}));setTest(null);setKey('');dialog.current.close();notify('已刪除本站保存的金鑰')})}>確認刪除</button></div></dialog></>
}
