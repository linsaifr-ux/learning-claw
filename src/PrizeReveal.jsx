import React,{useEffect,useLayoutEffect,useRef,useState,useCallback,lazy,Suspense} from 'react';
import {X,ArrowRight,Home} from 'lucide-react';
import {TOYS,RARITIES} from '../functions/domain.mjs';
const PrizeModel=lazy(()=>import('./PrizeModel.jsx'));
export default function PrizeReveal({prizes,origin,onClose,onRoom}){
 const dialog=useRef(null),stage=useRef(null);const[index,setIndex]=useState(0),[readyIndex,setReadyIndex]=useState(-1);
 const ready=readyIndex===index;const onModelReady=useCallback(()=>setReadyIndex(index),[index]);
 const item=TOYS.find(t=>t.id===prizes[index]);const rarity=RARITIES[item.rarity];
 useLayoutEffect(()=>{dialog.current.showModal();const rect=stage.current.getBoundingClientRect();const x=origin?.x??innerWidth/2,y=origin?.y??innerHeight*.8;dialog.current.style.setProperty('--launch-x',`${x-rect.left-rect.width/2}px`);dialog.current.style.setProperty('--launch-y',`${y-rect.top-rect.height/2}px`);},[]);
 useEffect(()=>{const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before}},[]);
 return <dialog className={`prize-reveal rarity-${item.rarity}${ready?'':' prize-pending'}`} ref={dialog} aria-labelledby="prize-title" onCancel={e=>{e.preventDefault();onClose()}}>
  <button className="prize-close icon-btn" aria-label="關閉獲獎展示" onClick={onClose}><X size={22}/></button>
  <div className="prize-kicker">寶物兌換所 / COLLECTION RECEIPT</div>
  <h2 id="prize-title">恭喜！你夾到了！</h2>
  <div className="prize-stage" ref={stage} key={index}>
   <div className="prize-halo" aria-hidden="true"/>
   <div className="prize-confetti" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--angle':`${i*30}deg`,'--delay':`${.12+(i%3)*.06}s`}}/>)}</div>
   {!ready&&<div className="prize-loading" role="status">正在準備寶物展示…</div>}
   <div className="prize-object"><Suspense fallback={null}><PrizeModel kind={item.id} onReady={onModelReady}/></Suspense></div>
  </div>
  <div className="prize-caption" key={'caption-'+index}>
   <span className="prize-rarity"><span aria-hidden="true">{'◆'.repeat(rarity.level)}</span> {rarity.label}</span>
   <h3>{item.name}</h3><p>{item.note}</p>
   <div className="prize-saved">已加入你的收藏庫{prizes.length>1&&<span> · 第 {index+1} / {prizes.length} 件</span>}</div>
  </div>
  <div className="prize-actions">{index<prizes.length-1?<button className="primary" onClick={()=>setIndex(i=>i+1)}>下一件寶物 <ArrowRight size={18}/></button>:<><button onClick={onClose}>繼續逛機台</button><button className="primary" onClick={onRoom}><Home size={18}/>去收藏房</button></>}</div>
 </dialog>
}
