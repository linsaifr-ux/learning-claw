import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {join} from 'node:path';

export class ClassroomLauncher extends EventEmitter {
  constructor({root,directory,port=4180,spawnProcess=spawn,checkPort=availablePort,startTimeout=30000,tunnelTimeout=90000}) {
    super();Object.assign(this,{root,directory,port,spawnProcess,checkPort,startTimeout,tunnelTimeout});
    this.children=new Set();this.state={status:'stopped',mode:'online',publicUrl:'',setupCode:'',error:'',logs:[],localUrl:`http://127.0.0.1:${port}`,directory};
  }
  snapshot(){return structuredClone(this.state)}
  update(patch){Object.assign(this.state,patch);this.emit('state',this.snapshot())}
  log(message){this.state.logs=[...this.state.logs,{time:new Date().toLocaleTimeString('zh-TW'),message}].slice(-50);this.update({})}
  child(binary,args,env,ipc=false){
    const child=this.spawnProcess(binary,args,{cwd:this.root,env,windowsHide:true,stdio:['ignore','pipe','pipe',...(ipc?['ipc']:[])]});
    this.children.add(child);
    child.once('exit',()=>{this.children.delete(child);if(this.state.status==='running')void this.fail('服務意外中斷。請確認網路與程式檔案，再重新啟動。')});
    // Keep an error listener throughout the child's life; waiting code also receives it.
    child.on('error',()=>{if(!child.pid){child.spawnFailed=true;this.children.delete(child)}if(this.state.status==='running')void this.fail('執行程式失敗，請重新解壓縮完整版本。')});
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
        const tunnel=this.child(join(this.root,'runtime',process.platform==='win32'?'cloudflared.exe':'cloudflared'),['tunnel','--no-autoupdate','--url',this.state.localUrl],env);
        publicUrl=await waitForChild(tunnel,{signal,timeout:this.tunnelTimeout,type:'url'});
        this.log('已取得本次外網網址，正在啟動教室服務。');
      }else this.log('正在啟動本機教室服務。');
      signal.throwIfAborted();
      const server=this.child(join(this.root,'runtime',process.platform==='win32'?'node.exe':'node'),['desktop/start.mjs'],{...env,CLASSROOM_PUBLIC_URL:publicUrl},true);
      const ready=await waitForChild(server,{signal,timeout:this.startTimeout,type:'ready'});
      signal.throwIfAborted();
      // A tunnel can exit while the database/server is starting.
      if([...this.children].some(c=>c.exitCode!==null&&c.exitCode!==undefined)|| (mode==='online'&&this.children.size!==2))throw Error('外網連線已中斷，請重新啟動。');
      this.update({status:'running',publicUrl,setupCode:ready.setupCode||''});
      this.log('教室服務已就緒。請開啟教師網頁，到「班級與連線」開始上課並分享學生入口。');
    }catch(error){
      if(signal.aborted)return;
      await this.fail(error.message||'啟動失敗，請重新嘗試。');
    }
    return this.snapshot();
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
