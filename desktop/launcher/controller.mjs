import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';

export class ClassroomLauncher extends EventEmitter {
  constructor({root,directory,port=4180,spawnProcess=spawn,checkPort=availablePort,startTimeout=30000,tunnelTimeout=90000,retryDelay=2000,healthInterval=15000,probe=probeTunnel}) {
    super();Object.assign(this,{root,directory,port,spawnProcess,checkPort,startTimeout,tunnelTimeout,retryDelay,healthInterval,probe});
    this.children=new Set();this.state={status:'stopped',mode:'online',publicUrl:'',setupCode:'',error:'',logs:[],localUrl:`http://127.0.0.1:${port}`,directory};
  }
  snapshot(){return structuredClone(this.state)}
  update(patch){Object.assign(this.state,patch);this.emit('state',this.snapshot())}
  log(message){this.state.logs=[...this.state.logs,{time:new Date().toLocaleTimeString('zh-TW'),message}].slice(-50);this.update({})}
  child(binary,args,env,ipc=false){
    const child=this.spawnProcess(binary,args,{cwd:this.root,env,windowsHide:true,stdio:['ignore','pipe','pipe',...(ipc?['ipc']:[])]});
    this.children.add(child);
    child.once('exit',()=>{this.children.delete(child);if(this.state.status==='running'){if(child===this.tunnel)void this.reconnect();else if(child===this.server)void this.fail('教室服務意外中斷，請重新啟動。')}});
    // Keep an error listener throughout the child's life; waiting code also receives it.
    child.on('error',()=>{if(!child.pid){child.spawnFailed=true;this.children.delete(child)}if(this.state.status==='running'&&child===this.server)void this.fail('執行程式失敗，請重新解壓縮完整版本。')});
    return child;
  }
  async start(mode){
    if(!['online','local'].includes(mode))throw Error('未知連線方式');
    if(!['stopped','error'].includes(this.state.status)||this.children.size)throw Error('服務正在執行或處理中');
    this.abort=new AbortController();const signal=this.abort.signal;
    this.update({status:'starting',mode,error:'',publicUrl:'',setupCode:'',logs:[]});
    try{
      await this.checkPort(this.port);signal.throwIfAborted();
      const env={...process.env,CLASSROOM_DATA_DIR:this.directory,PORT:String(this.port),CLASSROOM_PUBLIC_URL:''};
      delete env.ELECTRON_RUN_AS_NODE;
      let publicUrl='';
      if(mode==='online'){
        this.log('正在建立本次外網連線，通常需要數十秒…');
        const tunnel=this.tunnel=this.child(join(this.root,'runtime',process.platform==='win32'?'cloudflared.exe':'cloudflared'),['tunnel','--no-autoupdate','--url',this.state.localUrl],env);
        publicUrl=await waitForChild(tunnel,{signal,timeout:this.tunnelTimeout,type:'url'});
        this.log('已取得本次外網網址，正在啟動教室服務。');
      }else this.log('正在啟動本機教室服務。');
      signal.throwIfAborted();
      const server=this.server=this.child(join(this.root,'runtime',process.platform==='win32'?'node.exe':'node'),['desktop/start.mjs'],{...env,CLASSROOM_PUBLIC_URL:publicUrl},true);
      const ready=await waitForChild(server,{signal,timeout:this.startTimeout,type:'ready'});
      signal.throwIfAborted();
      // A tunnel can exit while the database/server is starting.
      if([...this.children].some(c=>c.exitCode!==null&&c.exitCode!==undefined)|| (mode==='online'&&this.children.size!==2))throw Error('外網連線已中斷，請重新啟動。');
      this.update({status:'running',connection:mode==='online'?'connected':'local',publicUrl,setupCode:ready.setupCode||''});
      if(mode==='online')this.monitorConnection(signal);
      this.log('教室服務已就緒。請開啟教師網頁，到「班級與連線」開始上課並分享學生入口。');
    }catch(error){
      if(signal.aborted)return;
      await this.fail(error.message||'啟動失敗，請重新嘗試。');
    }
    return this.snapshot();
  }
  async monitorConnection(signal){
    while(!signal.aborted){
      try{await delay(this.healthInterval,undefined,{signal})}catch{return}
      if(this.reconnecting||!this.state.publicUrl)continue;
      const url=this.state.publicUrl;
      const healthy=await this.probe(url,signal).catch(()=>false);
      if(signal.aborted||this.reconnecting||url!==this.state.publicUrl)continue;
      const connection=healthy?'connected':'degraded';
      if(this.state.connection!==connection){
        try{await this.setConnection(url,signal,healthy)}catch{if(!signal.aborted)await this.fail('無法更新連線狀態，請重新啟動教室');return}
        this.update({connection});this.log(healthy?'外網檢查已恢復，可以繼續使用目前的學生入口。':'外網檢查未通過。教室仍在本機執行，通道會嘗試恢復，請確認老師電腦的網路。');
      }
    }
  }
  async setConnection(publicUrl,signal,available=true){
    signal.throwIfAborted();const server=this.server,id=randomUUID();
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>done(Error('教室連線資訊更新逾時')),this.startTimeout);
      const done=error=>{clearTimeout(timer);server.off('message',message);server.off('exit',exit);signal.removeEventListener('abort',cancel);error?reject(error):resolve()};
      const message=m=>{if(m?.id===id)done(m.type==='connection-ready'?null:Error('無法更新教室連線'))};
      const exit=()=>done(Error('教室服務已停止')),cancel=()=>done(Error('已取消重連'));
      server.on('message',message);server.once('exit',exit);signal.addEventListener('abort',cancel,{once:true});
      try{server.send({type:'connection',id,publicUrl,available},error=>{if(error)done(error)})}catch(error){done(error)}
    });
  }
  async reconnect(){
    if(this.reconnecting||this.state.status!=='running'||this.abort.signal.aborted)return;
    this.reconnecting=true;const signal=this.abort.signal;
    this.update({connection:'reconnecting',publicUrl:''});this.log('外網通道中斷，正在重建；本機教室與課堂資料保留。');
    try{
      await this.setConnection('',signal);
      for(let attempt=0;!signal.aborted;attempt++){
        await delay(Math.min(this.retryDelay*2**Math.min(attempt,4),30000),undefined,{signal});
        let candidate;
        try{
          const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
          candidate=this.child(join(this.root,'runtime',process.platform==='win32'?'cloudflared.exe':'cloudflared'),['tunnel','--no-autoupdate','--url',this.state.localUrl],env);
          const url=await waitForChild(candidate,{signal,timeout:this.tunnelTimeout,type:'url'});
          await this.setConnection(url,signal);signal.throwIfAborted();
          if(!this.children.has(candidate))throw Error('通道已中斷');
          this.tunnel=candidate;this.update({connection:'connected',publicUrl:url});
          this.log('已重建外網通道。請到「班級與連線」複製新的學生入口，重新分享給學生。');return;
        }catch(error){
          if(candidate)await terminateChild(candidate);
          if(signal.aborted)return;
          await this.setConnection('',signal);
          if(attempt===0)this.log('目前仍無法連線，將持續重試。可繼續本機備課，或停止教室服務。');
        }
      }
    }catch(error){if(!signal.aborted)await this.fail('無法更新教室的外網連線資訊，請重新啟動。')}
    finally{this.reconnecting=false}
  }
  async fail(message){await this.stop();this.update({status:'error',error:message});this.log(message)}
  async stop(){
    if(this.stopping)return this.stopping;
    this.abort?.abort();this.update({status:'stopping',setupCode:'',publicUrl:''});
    this.stopping=(async()=>{
      await Promise.all([...this.children].map(terminateChild));
      this.update({status:'stopped'});this.log('教室服務已停止，資料保留在這台電腦。');
    })();
    try{await this.stopping}finally{this.stopping=null}
    return this.snapshot();
  }
}
function availablePort(port){return new Promise((resolve,reject)=>{
  const probe=createServer();probe.once('error',()=>reject(Error(`連接埠 ${port} 已被使用。若舊版終端機教室仍在執行，請先自行關閉舊版，再按啟動。`)));
  probe.listen(port,'127.0.0.1',()=>probe.close(resolve));
})}
function waitForChild(child,{signal,timeout,type}){return new Promise((resolve,reject)=>{
  let buffer='';const timer=setTimeout(()=>done(Error(type==='url'?'外網連線逾時。請確認網路，或先使用本機模式。':'教室啟動逾時，請重試。')),timeout);
  function done(error,value){clearTimeout(timer);child.off('error',onError);child.off('exit',onExit);child.off('message',onMessage);child.stdout?.off('data',onData);child.stderr?.off('data',onData);signal.removeEventListener('abort',onAbort);error?reject(error):resolve(value)}
  function onError(){done(Error('無法執行內附程式，請完整解壓縮並確認系統允許開啟。'))}
  function onExit(){done(Error(buffer.includes('伺服器已在執行')?'同一份教室資料已由其他程式使用，請先關閉原本的教室程式。':'啟動程序提前結束。請確認網路與程式檔案，再重新啟動。'))}
  function onMessage(message){if(type==='ready'&&message?.type==='ready')done(null,message)}
  function onData(data){buffer=(buffer+data.toString()).slice(-16000);if(type==='url'){const url=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0];if(url&&buffer.includes('Registered tunnel connection'))done(null,url)}}
  function onAbort(){done(Error('啟動已取消'))}
  child.on('error',onError);child.once('exit',onExit);child.on('message',onMessage);child.stdout?.on('data',onData);child.stderr?.on('data',onData);signal.addEventListener('abort',onAbort,{once:true});
  if(signal.aborted)onAbort();
})}
async function terminateChild(child){
  if(child.spawnFailed||child.exitCode!=null||child.signalCode)return;
  await new Promise(resolve=>{
    const force=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},6000);
    const finish=()=>{clearTimeout(force);resolve()};child.once('exit',finish);
    if(child.connected){try{child.send({type:'shutdown'},error=>{if(error)try{child.kill()}catch{}})}catch{child.kill()}}
    else {try{child.kill()}catch{finish()}}
  });
}

async function probeTunnel(url,signal){
 const response=await fetch(url+'/api/meta',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
 if(!response.ok)return false;
 const meta=await response.json();return meta.publicOrigin===url;
}
