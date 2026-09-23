// Optional test-only tunnel. The launcher asks the teacher to read terms first.
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),port=process.env.PORT||'4180';let app,started=false,stopping=false,buffer='';
const tunnel=spawn(resolve(root,'runtime',process.platform==='win32'?'cloudflared.exe':'cloudflared'),['tunnel','--no-autoupdate','--url',`http://127.0.0.1:${port}`],{stdio:['ignore','pipe','pipe'],windowsHide:true});
const stop=()=>{if(stopping)return;stopping=true;clearTimeout(timeout);app?.kill();tunnel.kill()};
const timeout=setTimeout(()=>{console.error('無法建立試用通道，請檢查網路或 cloudflared 既有設定。');stop();process.exitCode=1},90000);
function receive(chunk){buffer=(buffer+chunk.toString()).slice(-12000);const url=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0];if(url&&!started){started=true;clearTimeout(timeout);console.log('本次試用網址：'+url+'\n每次啟動可能更換網址，請重新分享班級連結。');app=spawn(process.execPath,[resolve(root,'desktop/start.mjs')],{env:{...process.env,CLASSROOM_PUBLIC_URL:url},stdio:'inherit'});app.once('exit',stop)}}
tunnel.stdout.on('data',receive);tunnel.stderr.on('data',receive);tunnel.once('error',e=>{console.error('無法啟動通道：'+e.message);stop();process.exitCode=1});tunnel.once('exit',()=>{if(!stopping){console.error('外網通道已中斷，學生暫時無法連線。');stop();process.exitCode=1}});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
