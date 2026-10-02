const {app,BrowserWindow,ipcMain,shell,dialog,powerSaveBlocker,clipboard}=require('electron');
const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const {homedir}=require('node:os');
const {mkdirSync}=require('node:fs');
const fs=require('node:fs');
app.setName('學習有爪');
let win,controller,quitting=false,blocker,maintenanceBusy=false,restoreFile=null;
if(!app.requestSingleInstanceLock()){app.quit()}else{
app.on('second-instance',()=>{if(win){win.show();if(win.isMinimized())win.restore();win.focus()}});
app.whenReady().then(async()=>{
 const packaged=fs.existsSync(join(process.resourcesPath,'server','desktop/start.mjs'));
 const root=packaged?join(process.resourcesPath,'server'):fs.existsSync(join(__dirname,'../../desktop/start.mjs'))?resolve(__dirname,'../..'):resolve(__dirname,'../../..');
 const directory=process.env.CLASSROOM_DATA_DIR||join(process.env.APPDATA||(process.platform==='darwin'?join(homedir(),'Library','Application Support'):homedir()),'TreasureClassroom');
 const {ClassroomLauncher}=await import(pathToFileURL(join(__dirname,'controller.mjs')).href);
 controller=new ClassroomLauncher({root,directory,port:Number(process.env.PORT)||4180});
 const page=pathToFileURL(join(__dirname,'index.html')).href;
 const backupInfo=()=>{try{const b=JSON.parse(fs.readFileSync(join(directory,'backup-status.json'),'utf8'));return {at:b.at,bytes:b.bytes}}catch{return null}};
 const state=()=>({...controller.snapshot(),version:require('./package.json').version,backupInfo:backupInfo()});
 function trusted(event){if(event.sender!==win?.webContents||event.senderFrame?.url!==page)throw Error('不允許的操作')}
 for(const [name,handler] of Object.entries({
  state:()=>state(),start:mode=>{if(maintenanceBusy)throw Error('資料管理正在處理中');return controller.start(mode)},stop:()=>controller.stop(),
  openTeacher:()=>shell.openExternal(controller.state.localUrl),
  copySetup:()=>{if(controller.state.status==='running'&&controller.state.setupCode)clipboard.writeText(controller.state.setupCode)},
  openData:async()=>{mkdirSync(directory,{recursive:true});return shell.openPath(directory)},
  maintenance:async data=>{
   if(maintenanceBusy||!['stopped','error'].includes(controller.state.status)||controller.children.size)throw Error('請先自行停止教室服務，再操作帳號與備份');
   if(!data||!['issueRecovery','resetPassword','exportBackup','previewRestore','restoreBackup'].includes(data.operation))throw Error('無效操作');
   maintenanceBusy=true;
   try{
    let file;
    if(data.operation==='exportBackup'){const selected=await dialog.showSaveDialog(win,{title:'匯出加密課堂備份',defaultPath:'學習有爪-'+new Date().toISOString().slice(0,10)+'.clawbackup',filters:[{name:'加密教室備份',extensions:['clawbackup']}]});if(selected.canceled)return {cancelled:true};file=selected.filePath}
    if(data.operation==='previewRestore'){restoreFile=null;const selected=await dialog.showOpenDialog(win,{title:'選擇加密課堂備份',properties:['openFile'],filters:[{name:'加密教室備份',extensions:['clawbackup']}]});if(selected.canceled)return {cancelled:true};file=selected.filePaths[0]}
    if(data.operation==='restoreBackup'){if(!restoreFile||data.revision!==restoreFile.revision)throw Error('請先預覽備份');const choice=await dialog.showMessageBox(win,{type:'warning',buttons:['取消','確認取代並還原'],defaultId:0,cancelId:0,message:'還原將取代目前課堂資料並清除管理中的舊備份。',detail:'請先匯出需要保留的加密備份。本機與備份中已記錄的刪除會套用；外部副本不受影響。'});if(choice.response!==1)return {cancelled:true};file=restoreFile.path}
    const {spawn}=require('node:child_process');const result=await new Promise((resolveResult,reject)=>{const child=spawn(join(root,'runtime',process.platform==='win32'?'node.exe':'node'),[join(root,'desktop/maintenance.mjs')],{cwd:root,windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},stdio:['pipe','pipe','pipe']});let output='';const timer=setTimeout(()=>{child.kill();reject(Error('資料管理逾時，請重試；下次啟動會檢查未完成還原'))},120000);child.stdout.on('data',chunk=>{output+=chunk;if(output.length>30000){child.kill();reject(Error('回應異常'))}});child.stderr.on('data',()=>{});child.once('error',()=>{clearTimeout(timer);reject(Error('無法執行資料管理工具'))});child.once('exit',()=>{clearTimeout(timer);try{const response=JSON.parse(output);if(response.error)reject(Error(response.error));else resolveResult(response.result)}catch{reject(Error('資料管理未完成，下次啟動會檢查未完成還原'))}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({directory,operation:data.operation,password:data.password,backupPassword:data.backupPassword,code:data.code,newPassword:data.newPassword,file,revision:data.revision,confirmed:data.confirmed}))});
    if(data.operation==='previewRestore')restoreFile={path:file,revision:result.revision};if(data.operation==='restoreBackup')restoreFile=null;
    return result;
   }finally{maintenanceBusy=false}
  },
  openBackups:async()=>{const path=join(directory,'backups');mkdirSync(path,{recursive:true});return shell.openPath(path)},
  terms:()=>shell.openExternal('https://www.cloudflare.com/terms/'),privacy:()=>shell.openExternal('https://www.cloudflare.com/privacypolicy/')
 }))ipcMain.handle('launcher:'+name,(event,...args)=>{trusted(event);return handler(...args)});
 controller.on('state',()=>{
  if(['starting','running'].includes(controller.state.status)){if(blocker===undefined)blocker=powerSaveBlocker.start('prevent-app-suspension')}
  else if(blocker!==undefined){powerSaveBlocker.stop(blocker);blocker=undefined}
  if(win&&!win.isDestroyed())win.webContents.send('launcher:state',state());
 });
 win=new BrowserWindow({width:1000,height:780,minWidth:760,minHeight:620,title:'學習有爪｜教師啟動中心',icon:join(__dirname,'icon.png'),backgroundColor:'#f4efe5',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.setMenu(null);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
 win.on('close',event=>{if(!quitting){event.preventDefault();void quitSafely()}});
 await win.loadFile(join(__dirname,'index.html'));
}).catch(error=>{dialog.showErrorBox('啟動中心無法開啟',error.message);app.exit(1)});
app.on('before-quit',event=>{if(!quitting){event.preventDefault();void quitSafely()}});
}
let confirming=false;
async function quitSafely(){
 if(confirming)return;if(maintenanceBusy){await dialog.showMessageBox(win,{message:'帳號或備份正在處理，請完成後再離開。'});return}confirming=true;
 if(controller&&['starting','running'].includes(controller.state.status)){
  const choice=await dialog.showMessageBox(win,{type:'question',buttons:['繼續使用','停止服務並離開'],defaultId:0,cancelId:0,title:'教室服務仍在執行',message:'離開會中斷學生連線。確定結束嗎？'});
  if(choice.response===0){confirming=false;return}
 }
 quitting=true;await controller?.stop();app.quit();
}
