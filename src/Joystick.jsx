import React,{useEffect,useRef,useState} from 'react';
export default function Joystick({disabled,onMove}){
 const [v,setV]=useState({x:0,z:0}),held=useRef(false),callback=useRef(onMove);callback.current=onMove;
 const stop=()=>{held.current=false;setV({x:0,z:0});callback.current(0,0)};
 useEffect(()=>{if(disabled)stop()},[disabled]);useEffect(()=>{window.addEventListener('blur',stop);return()=>{window.removeEventListener('blur',stop);callback.current(0,0)}},[]);
 function move(e){if(!held.current||disabled)return;const r=e.currentTarget.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/45,z=(e.clientY-r.top-r.height/2)/45;const len=Math.hypot(x,z);if(len>1){x/=len;z/=len}if(len<.12){x=0;z=0}setV({x,z});callback.current(x,z)}
 return <div className={'analog-stick '+(disabled?'disabled':'')} aria-label="拖曳搖桿移動夾爪，亦可使用下方方向按鈕" onPointerDown={e=>{if(disabled)return;held.current=true;e.currentTarget.setPointerCapture(e.pointerId);move(e)}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}><span className="stick-up">前</span><span className="stick-left">左</span><span className="stick-right">右</span><span className="stick-down">後</span><div className="stick-shaft" style={{transform:`translate(${v.x*36}px,${v.z*36}px)`}}/><div className="stick-ball" style={{transform:`translate(${v.x*45}px,${v.z*45}px)`}}/></div>
}
