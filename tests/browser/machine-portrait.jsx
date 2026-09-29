import React,{useRef}from'react';import{createRoot}from'react-dom/client';import{ClawWorld}from'../../src/World.jsx';
const id=new URLSearchParams(location.search).get('machine')||'classic';
function Portrait(){const ref=useRef();return <ClawWorld ref={ref} machineId={id} poolId={id} seed={12345} onReady={ready=>{if(ready){ref.current.view('lobby');document.body.dataset.ready='true'}}}/>}
createRoot(document.getElementById('root')).render(<Portrait/>);
const style=document.createElement('style');style.textContent='body{margin:0}.world{width:540px;height:650px}';document.head.append(style);
