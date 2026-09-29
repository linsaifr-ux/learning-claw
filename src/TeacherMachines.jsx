import React,{lazy,Suspense,useRef,useState} from 'react';
import MachineLobby from './MachineLobby.jsx';
import {MACHINES,TOYS,RARITIES,openMachineIds} from '../functions/domain.mjs';
import {prizePool} from '../functions/machine.mjs';
import {ToyPortrait} from './Identity.jsx';
const World=lazy(()=>import('./World').then(m=>({default:m.ClawWorld})));
export default function TeacherMachines({activeClass}){
 const [selected,setSelected]=useState(null),ref=useRef();
 const machine=MACHINES.find(m=>m.id===selected);
 return <div className="teacher-machines">{!machine?<MachineLobby teacher activeClass={activeClass} onEnter={setSelected}/>:<><div className="machine-back"><button onClick={()=>setSelected(null)}>← 返回機台大廳</button><span>{openMachineIds(activeClass).includes(machine.id)?'此班級學生開放中':'此班級學生未開放'} · 教師預覽</span></div><h2>{machine.name}</h2><p>{machine.subtitle}。拖曳畫面或使用下方按鈕切換視角；預覽不扣代幣、不發放收藏。</p><div className="game-layout"><div className="machine-panel"><div className="machine-top"><span><b className="machine-number">{machine.number}</b>{machine.name}</span><span>教師預覽</span></div><Suspense fallback={<div className="world-loading">準備立體機台…</div>}><World key={machine.id} ref={ref} machineId={machine.id} poolId={machine.id} seed={12345}/></Suspense><div className="machine-bottom"><span>拖曳旋轉 · 滾輪縮放</span><div className="camera-presets">{[['overview','全景'],['front','正面'],['left','左側'],['right','右側'],['top','俯視・透視頂蓋'],['exit','出獎口']].map(([id,label])=><button key={id} className="text-btn" onClick={()=>ref.current?.view(id)}>{label}</button>)}</div></div></div><div className="prize-list"><h3>本機收藏圖鑑</h3>{TOYS.filter(t=>prizePool(machine.id).includes(t.id)).map(t=><div key={t.id}><span><ToyPortrait kind={t.id}/></span><div><b>{t.name}<span className={'rarity-tag rarity-'+t.rarity}>{RARITIES[t.rarity].label}</span></b><small>{t.note}</small></div></div>)}</div></div></>}</div>
}
