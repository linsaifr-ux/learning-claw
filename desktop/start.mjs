import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,copyFileSync,existsSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {backup} from 'node:sqlite';
import {createClassroom} from './service.mjs';
import {classroomHttp} from './http.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),directory=process.env.CLASSROOM_DATA_DIR||join(process.env.APPDATA||(process.platform==='darwin'?join(homedir(),'Library','Application Support'):homedir()),'TreasureClassroom');
const port=Number(process.env.PORT)||4180,publicOrigin=process.env.CLASSROOM_PUBLIC_URL||'';
if(publicOrigin&&!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/?$/.test(publicOrigin))throw Error('CLASSROOM_PUBLIC_URL 必須是完整 HTTPS 網址');
if(!existsSync(join(root,'dist-desktop/index.html')))throw Error('缺少網頁檔案，請先執行 npm run build:desktop');
mkdirSync(directory,{recursive:true,mode:0o700});
const lock=join(directory,'server.lock');
if(existsSync(lock)){const pid=Number(readFileSync(lock,'utf8'));let live=true;try{process.kill(pid,0)}catch(e){if(e.code==='ESRCH')live=false}if(live)throw Error('這個資料夾的伺服器已在執行，請勿重複開啟');unlinkSync(lock)}
writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});process.on('exit',()=>{try{unlinkSync(lock)}catch{}});
const service=createClassroom({directory,model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'});
const folder=join(directory,'backups',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(folder,{recursive:true});await backup(service.database,join(folder,'classroom.sqlite'));copyFileSync(join(directory,'server.key'),join(folder,'server.key'));
const server=classroomHttp(service,{webRoot:join(root,'dist-desktop'),port,publicOrigin});server.on('error',e=>{console.error('伺服器啟動失敗：'+e.message);service.close();process.exitCode=1});server.listen(port,'127.0.0.1',()=>{console.log(`寶物教室已啟動：http://127.0.0.1:${port}\n資料與備份位置：${directory}\n外網網址：${publicOrigin||'尚未設定（目前只有本機可以連線）'}\n關閉此視窗或按 Ctrl+C 結束服務。`);if(service.setupCode)console.log('首次建立老師帳號時使用此設定碼（請勿分享給學生）：'+service.setupCode)});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{service.close();process.exit(0)}));
