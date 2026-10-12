// Teacher uploads a GLB prize, builds a machine and opens it; a student plays it (isolated data, port 4183).
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';
const directory=mkdtempSync(join(tmpdir(),'custom-machines-')),service=createClassroom({directory,setupCode:'qa'}),port=4183,url=`http://127.0.0.1:${port}`;
const teacher=(await service.call('teacherRegister',{email:'custom@example.com',password:'password123',setupCode:'qa'})).token;
const call=(token,type,extra={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
const {classId}=await call(teacher,'createClass',{name:'自訂班',grade:'國小三年級'});await call(teacher,'registration',{classId,open:true});await service.call('setClassOpen',{open:true},teacher);
const code=(await service.call('state',{},teacher)).state.classes[0].code;const student=(await service.call('studentAccess',{code,name:'小玩家',birthday:'0202',register:true})).token;
await call(teacher,'grant',{ids:[(await service.call('state',{},student)).state.students[0].id],amount:9,reason:'測試'});
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port});await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true,args:(process.env.CHROME_ARGS||'').split(' ').filter(Boolean)});mkdirSync('work',{recursive:true});
try{
 const t=await browser.newContext({viewport:{width:1360,height:1000}});await t.addCookies([{name:'tc-session',value:teacher,url,httpOnly:true,sameSite:'Strict'}]);const p=await t.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);
 await p.getByRole('button',{name:/遊戲與活動/}).click();await p.getByRole('button',{name:'自訂機台',exact:true}).click();
 await p.getByLabel('模型檔').setInputFiles('public/models/bunny.glb');await expect(p.locator('.model-preview small')).toContainText('三角面',{timeout:30000});
 await p.getByLabel('收藏名稱').fill('實驗兔');await p.getByLabel('模型來源').fill('本專案原創模型');await p.getByRole('checkbox',{name:/我確認有權/}).check();
 await p.getByRole('button',{name:'上傳並檢查模型'}).click();await expect(p.locator('.custom-prize-card')).toContainText('實驗兔',{timeout:60000});
 await expect(p.locator('.custom-prize-card img.custom-portrait')).toHaveAttribute('src',/^data:image\/png/);
 await p.getByRole('button',{name:'＋ 新增機台'}).click();await p.getByLabel('機台名稱').fill('實驗機台');await p.getByLabel('一句話介紹（選填）').fill('老師的實驗收藏');
 const editor=p.locator('.custom-machine-editor');await editor.locator('label',{hasText:'實驗兔'}).click();await editor.locator('label',{hasText:'森林小貓'}).click();
 await p.screenshot({path:'work/custom-machine-editor.png',fullPage:true});
 await p.getByRole('button',{name:'保存機台'}).click();await expect(p.locator('.custom-machine-list')).toContainText('實驗機台',{timeout:60000});
 await expect(p.getByRole('button',{name:/刪除/}).first()).toBeVisible();
 // Deleting a prize used by a machine is refused with a reason.
 await p.locator('.custom-prize-card').getByRole('button',{name:'刪除'}).click();await expect(p.locator('.toast')).toContainText('先把這款收藏從所有自訂機台移除');
 await p.getByRole('button',{name:'機台',exact:true}).click();await p.getByRole('checkbox',{name:'開放實驗機台'}).check();await p.getByRole('button',{name:'保存班級設定',exact:true}).click();
 await expect.poll(async()=>(await service.call('state',{},teacher)).state.classes[0].enabledMachines?.length).toBeGreaterThan(0);
 assert.ok((await service.call('state',{},teacher)).state.classes[0].enabledMachines.some(id=>id.startsWith('cm-')));
 assert.deepEqual(errors,[]);await t.close();
 for(const size of [{width:1360,height:1000},{width:390,height:844}]){
  const s=await browser.newContext({viewport:size});await s.addCookies([{name:'tc-session',value:student,url,httpOnly:true,sameSite:'Strict'}]);const q=await s.newPage(),errs=[];q.on('pageerror',e=>errs.push(e.message));await q.goto(url);
  await q.getByRole('button',{name:/遊戲大廳/}).first().click();const card=q.getByRole('button',{name:'進入實驗機台'});await expect(card).toBeVisible();await expect(card.locator('svg.lobby-cabinet')).toBeVisible();
  if(size.width>400){await q.screenshot({path:'work/custom-machine-lobby.png'});await card.click();await expect(q.locator('.world canvas')).toBeVisible({timeout:30000});await expect(q.locator('.prize-list')).toContainText('實驗兔');
   await q.getByRole('button',{name:/投入 .*枚代幣/}).click();await expect(q.getByRole('button',{name:'下爪！',exact:true})).toBeEnabled({timeout:60000});await q.waitForTimeout(1500);await q.screenshot({path:'work/custom-machine-play.png'});
   await q.getByRole('button',{name:'下爪！',exact:true}).click();await expect(q.locator('body')).toContainText(/你夾到了|新朋友加入收藏|這次沒有夾到/,{timeout:120000});
   const state=(await service.call('state',{},student)).state;assert.equal(state.sessions.find(g=>g.machineId.startsWith('cm-')).status,'finished');}
  else assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errs,[]);await s.close();
 }
 console.log('PASS: GLB upload with preview and portrait, machine builder, delete guard, class opening, student lobby art, custom 3D machine play and server-verified result on desktop and phone.');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
