const {app,BrowserWindow,ipcMain,shell,dialog,powerSaveBlocker,clipboard}=require('electron');
const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const {homedir}=require('node:os');
const {mkdirSync}=require('node:fs');
const fs=require('node:fs');
app.setName('學習有爪');
let win,controller,quitting=false,blocker;
if(!app.requestSingleInstanceLock()){app.quit()}else{
app.on('second-instance',()=>{if(win){win.show();if(win.isMinimized())win.restore();win.focus()}});
app.whenReady().then(async()=>{
 const packaged=fs.existsSync(join(process.resourcesPath,'server','desktop/start.mjs'));
 const root=packaged?join(process.resourcesPath,'server'):fs.existsSync(join(__dirname,'../../desktop/start.mjs'))?resolve(__dirname,'../..'):resolve(__dirname,'../../..');
 const directory=process.env.CLASSROOM_DATA_DIR||join(process.env.APPDATA||(process.platform==='darwin'?join(homedir(),'Library','Application Support'):homedir()),'TreasureClassroom');
 const {ClassroomLauncher}=await import(pathToFileURL(join(__dirname,'controller.mjs')).href);
 controller=new ClassroomLauncher({root,directory,port:Number(process.env.PORT)||4180});
 const page=pathToFileURL(join(__dirname,'index.html')).href;
 const state=()=>({...controller.snapshot(),version:require('./package.json').version});
 function trusted(event){if(event.sender!==win?.webContents||event.senderFrame?.url!==page)throw Error('不允許的操作')}
 for(const [name,handler] of Object.entries({
  state:()=>state(),start:mode=>controller.start(mode),stop:()=>controller.stop(),
  openTeacher:()=>shell.openExternal(controller.state.localUrl),
  copySetup:()=>{if(controller.state.status==='running'&&controller.state.setupCode)clipboard.writeText(controller.state.setupCode)},
  openData:async()=>{mkdirSync(directory,{recursive:true});return shell.openPath(directory)},
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
 if(confirming)return;confirming=true;
 if(controller&&['starting','running'].includes(controller.state.status)){
  const choice=await dialog.showMessageBox(win,{type:'question',buttons:['繼續使用','停止服務並離開'],defaultId:0,cancelId:0,title:'教室服務仍在執行',message:'離開會中斷學生連線。確定結束嗎？'});
  if(choice.response===0){confirming=false;return}
 }
 quitting=true;await controller?.stop();app.quit();
}
