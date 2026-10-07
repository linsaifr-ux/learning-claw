import {useState} from 'react';
// Only navigation preferences live here; no task answers or editor contents.
export default function useViewPreference(memory,key,initial){
 const [value,setValue]=useState(()=>memory?.current[key]??initial);
 return [value,next=>setValue(previous=>{const result=typeof next==='function'?next(previous):next;if(memory)memory.current[key]=result;return result})];
}
