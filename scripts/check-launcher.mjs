// Packaged Apple Silicon GUI smoke test. Uses only temporary data and a test port.
import {_electron as electron,expect} from '@playwright/test';
import {mkdtempSync,mkdirSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
const temp=mkdtempSync(join(tmpdir(),'claw-gui-'));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const executablePath=process.env.CLASSROOM_LAUNCHER_APP||resolve('../寶物教室-Mac-Apple-Silicon試用版/學習有爪.app/Contents/MacOS/Electron');
let app;
try{
 app=await electron.launch({executablePath,args:['--user-data-dir='+join(temp,'profile')],env:{...process.env,PORT:String(port),CLASSROOM_DATA_DIR:join(temp,'data')},timeout:30000});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await expect(page.locator('#version')).toHaveText('v'+JSON.parse(readFileSync('package.json','utf8')).version);await expect(page.locator('#start')).toBeDisabled();
 await page.screenshot({path:'work/launcher-idle.png',fullPage:true});
 await page.getByRole('radio',{name:/本機備課/}).check();await expect(page.locator('#start')).toBeEnabled();
 await page.locator('#start').click();await expect(page.locator('#status')).toHaveText('服務已啟動');await expect(page.locator('#setup')).toBeVisible();
 const setupCode=await page.locator('#setup-code').textContent();assert(setupCode.length>0,'setup code');
 await page.screenshot({path:'work/launcher-running.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 await app.evaluate(({clipboard})=>{clipboard.writeText=text=>{globalThis.copiedSetup=text};clipboard.readText=()=>globalThis.copiedSetup});
 await page.locator('#copy-setup').click();assert(await app.evaluate(({clipboard})=>clipboard.readText())===setupCode,'copy setup code');

 const url=`http://127.0.0.1:${port}`;
 assert((await fetch(url)).status===200,'teacher HTTP');
 const response=await fetch(url+'/api/teacherRegister',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({email:'gui-test@example.com',password:'testpassword',setupCode})});assert(response.status===200,'teacher registration');
 await app.evaluate(({shell})=>{shell.openExternal=async url=>{globalThis.openedTeacher=url}});await page.locator('#open').click();assert(await app.evaluate(()=>globalThis.openedTeacher)===url,'open teacher browser');
 page.on('dialog',dialog=>dialog.accept());await page.locator('#stop').click();await expect(page.locator('#status')).toHaveText('尚未啟動');assert(!existsSync(join(temp,'data/server.lock')),'lock removed');
 await page.locator('#start').click();await expect(page.locator('#status')).toHaveText('服務已啟動');await expect(page.locator('#setup')).toBeHidden();assert(!(await(await fetch(url+'/api/meta')).json()).setupRequired,'persisted account');
 // Check closing the native window asks first, and Cancel preserves the service.
 await app.evaluate(({dialog,BrowserWindow})=>{dialog.showMessageBox=async()=>({response:0});BrowserWindow.getAllWindows()[0].close()});
 await expect(page.locator('#status')).toHaveText('服務已啟動');
 assert((await fetch(url)).status===200,'cancel close keeps server');
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1})});
 await app.close();app=null;assert(!existsSync(join(temp,'data/server.lock')),'quit gracefully stops server');
 assert(errors.length===0,errors.join('\n'));
 console.log('Packaged GUI: render, local start/stop, settings code, teacher registration, restart persistence, browser action, close confirmation and graceful shutdown passed.');
}finally{if(app){await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1})}).catch(()=>{});await app.close().catch(()=>{})}rmSync(temp,{recursive:true,force:true})}
function assert(value,message){if(!value)throw Error(message)}
