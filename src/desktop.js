import {useEffect,useState,useCallback,useRef} from 'react';
import {createGrantRetry} from './grant-retry.mjs';
export function useDesktop(){const grants=useRef(createGrantRetry());const refreshVersion=useRef(0);const[snapshot,setSnapshot]=useState({user:null,role:null,state:null,classOpen:false}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[meta,setMeta]=useState({});
 const call=useCallback(async(name,data={})=>{let response;try{response=await fetch('/api/'+name,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(name==='teacherAI'?(data.mode==='ragIntentQuestions'||data.mode==='ragQuestions'||data.mode==='replaceRepeated'?240000:190000):65000)})}catch{throw Error('無法連到老師電腦，請確認老師已開課並保持網路連線')}const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'操作失敗'),{status:response.status});return result},[]);
 const refresh=useCallback(async()=>{const version=++refreshVersion.current;
 const [connection,current]=await Promise.allSettled([
  fetch('/api/meta',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error('無法更新本次外網網址');return r.json()}),
  call('state')
 ]);
 if(version!==refreshVersion.current)return;
 setMeta(connection.status==='fulfilled'?connection.value:{});
 if(current.status==='fulfilled'){setSnapshot(current.value);setError(connection.status==='fulfilled'?'':'無法更新連線資訊，請確認老師伺服器與外網通道仍在執行。')}
 else{const e=current.reason;if(e.status===401||e.status===403)setSnapshot({user:null,role:null,state:null,classOpen:false});setError(e.status===401?'':e.message)}
 setLoading(false);
 },[call]);
 useEffect(()=>{let gone=false,timer;async function poll(){if(gone)return;await refresh();if(!gone)timer=setTimeout(poll,5000)}poll();const focus=()=>{if(!gone)refresh()};window.addEventListener('focus',focus);return()=>{gone=true;++refreshVersion.current;clearTimeout(timer);window.removeEventListener('focus',focus)}},[refresh]);
 const login=async(name,data)=>{await call(name,data);await refresh()};
 return{...snapshot,desktop:true,publicOrigin:meta.publicOrigin,refreshConnection:refresh,setupRequired:meta.setupRequired,loading,error,login:(email,password)=>login('teacherLogin',{email,password}),registerTeacher:(email,password,setupCode)=>login('teacherRegister',{email,password,setupCode}),studentAccess:data=>login('studentAccess',data),logout:async()=>{++refreshVersion.current;await call('logout');++refreshVersion.current;setSnapshot({user:null,role:null,state:null,classOpen:false})},resetPassword:async()=>{throw Error('電腦版尚未提供自動重設密碼，請妥善保管原本老師帳號；還原備份不會重設密碼')},action:async action=>{const result=await grants.current(snapshot.user?.uid,action,data=>call('classroomAction',data));await refresh();return result},saveKey:key=>call('saveTeacherKey',{key}),deleteKey:()=>call('deleteTeacherKey'),testKey:()=>call('testTeacherKey'),generate:async data=>{const result=await call('teacherAI',data);await refresh();return result},questionBank:data=>call('questionBank',data),keyStatus:()=>call('teacherKeyStatus'),setClassOpen:async open=>{await call('setClassOpen',{open});await refresh()}};
}
