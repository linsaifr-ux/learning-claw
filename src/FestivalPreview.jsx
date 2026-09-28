import React,{lazy,Suspense,useState,useEffect} from 'react';
import {FESTIVALS} from '../functions/domain.mjs';
const Room=lazy(()=>import('./World.jsx').then(m=>({default:m.RoomWorld})));
const inventory=[{id:'preview-bear',kind:'bear'},{id:'preview-cat',kind:'cat'}];
const placements=[{itemId:'preview-bear',x:-.65,z:.5,rotation:0},{itemId:'preview-cat',x:.65,z:.5,rotation:0}];
const noop=()=>{};
const DETAILS={moon:'右側牆面增加月亮，牆上加入金色星點。',halloween:'左側展示櫃上增加一顆南瓜。',christmas:'左側展示櫃旁增加聖誕樹與金色樹頂裝飾。',spring:'後方牆面左右各增加一盞紅色燈籠與金色垂飾。',none:'保留日常家具與收藏，不加節慶裝飾。'};
export default function FestivalPreview({festival,enabled,activeClass}){
 const [daily,setDaily]=useState(false);useEffect(()=>setDaily(false),[festival]);const theme=daily?'none':festival;
 const changed=festival!==activeClass?.festival||enabled!==!!activeClass?.eventActive;
 return <section className="festival-preview panel" aria-label="節慶預覽與影響"><div className="section-head"><div><div className="eyebrow">學生寶物房 / 實際 3D 佈置</div><h2>{daily?'日常佈置':FESTIVALS[festival].short+'預覽'}</h2><p>{DETAILS[theme]}</p></div><div className="button-row" role="group" aria-label="比較節慶佈置"><button aria-pressed={!daily} onClick={()=>setDaily(false)}>所選節慶</button><button aria-pressed={daily} onClick={()=>setDaily(true)}>日常對照</button></div></div><div className="festival-preview-grid"><div><Suspense fallback={<div className="world-loading">準備寶物房預覽…</div>}><Room room={{wall:'mint',style:'studio',floor:'oak',rug:'round',theme,placements}} inventory={inventory} onSelect={noop} onPlace={noop}/></Suspense><p className="fine">拖曳可轉動視角。示範房間與學生端使用同一套場景；家具、收藏與牆色僅供示範。預覽不更動學生房間。</p></div><div className="festival-impact"><div className={'festival-status '+(changed?'draft':'saved')} role="status"><b>{changed?'尚未保存的設定':'目前已保存設定'}</b><p>{enabled?`${changed?'保存後，學生可選用':'目前學生可選用'}「${FESTIVALS[festival].short}」。`:`${changed?'保存後，停止開放':'目前未開放'}新的節慶佈置。上方仍可查看所選主題的外觀。`}</p></div><h3>學生會看到什麼？</h3><ol><li>老師選好節慶，勾選「開放節慶佈置」，按「保存班級設定」。</li><li>學生到「我的寶物房 → 空間佈置 → 節慶佈置」選擇主題。</li><li>學生按「保存佈置」才套用，不會自動替全班換房間。</li></ol><h3>影響範圍</h3><ul><li>只開放房間節慶裝飾，不會發放新娃娃或配件，也不改機台獎品、稀有度與代幣數。</li><li>切換節慶後，只開放新主題；學生原本已保存的舊主題仍保留。</li><li>結束活動不刪收藏或房間。學生可改回日常；改掉的舊節慶，要等老師再次開放才能選回。</li></ul><p className="fine">每次夾取費用與機台開放另依本頁設定，按保存時一併更新。</p></div></div></section>
}
