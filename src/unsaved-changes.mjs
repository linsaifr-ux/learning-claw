import{useEffect,useRef}from'react';
const pending=new Set();
export function confirmLeave(){return pending.size===0||window.confirm('還有未保存的修改。確定要離開並放棄這些修改嗎？')}
export function useUnsavedChanges(dirty){const token=useRef(Symbol());useEffect(()=>{const key=token.current;if(dirty)pending.add(key);else pending.delete(key);const warn=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>{pending.delete(key);window.removeEventListener('beforeunload',warn)}},[dirty])}
