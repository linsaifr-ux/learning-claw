import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const directory=mkdtempSync(join(tmpdir(),'claw-connection-ui-')),service=createClassroom({directory,setupCode:'audit'}),port=4193,url=`http://127.0.0.1:${port}`,server=classroomHttp(service,{webRoot:'dist-desktop',port});let browser;
try{
 const {token}=await service.call('teacherRegister',{email:'audit@example.com',password:'password8',setupCode:'audit'});
 const act=(type,data={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...data},token);
 const {classId}=await act('createClass',{name:'斷線驗收班',grade:'國小三年級'});await act('registration',{classId,open:true});await service.call('setClassOpen',{open:true},token);
 const code=(await service.call('state',{},token)).state.classes[0].code;
 // An isolated fixture avoids invoking AI or using any teacher question bank.
 const record=JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value);
 record.workspace.assignments.push({id:'offline-test',classId,status:'published',title:'作答保存驗收',unit:'說明想法',subject:'國語',reward:1,questions:[{type:'short',prompt:'請寫出今天的發現',answer:'開放回答'}]});
 service.database.prepare("UPDATE settings SET value=? WHERE id='classroom'").run(JSON.stringify(record));
 await new Promise(r=>server.listen(port,'127.0.0.1',r));browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
 await context.request.post(url+'/api/studentAccess',{headers:{Origin:url},data:{code,name:'測試同學',birthday:'0101',register:true}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 async function openTask(){await page.locator('aside').getByRole('button',{name:/學習任務/}).click();await page.getByRole('button',{name:'開始任務',exact:true}).click()}
 await openTask();await page.getByLabel('第1題作答').fill('草稿不會因重新整理而消失');await page.reload();await openTask();await expect(page.getByLabel('第1題作答')).toHaveValue('草稿不會因重新整理而消失');
 await context.setOffline(true);await expect(page.getByRole('alert')).toContainText('目前離線');await page.getByLabel('第1題作答').fill('離線期間繼續作答');
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:/下載作答副本/}).click();await downloadEvent;
 await context.setOffline(false);let lost=true;await page.route('**/api/classroomAction',async route=>{const data=route.request().postDataJSON();if(data.type==='submit'&&lost){lost=false;await route.fetch();await route.abort('failed')}else await route.continue()});
 await page.getByRole('button',{name:/交卷並查看答案/}).click();await expect.poll(()=>JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value).workspace.submissions.length).toBe(1);
 await page.reload();await page.locator('aside').getByRole('button',{name:/學習任務/}).click();await page.getByRole('button',{name:'查看答案與詳解',exact:true}).click();await expect(page.getByLabel('第1題作答')).toHaveValue('離線期間繼續作答');await expect(page.getByText('已交卷。選擇題可立即核對，非選擇題等待老師批閱。')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('claw-draft:')).length)).toBe(0);
 assert.equal(JSON.parse(service.database.prepare("SELECT value FROM settings WHERE id='classroom'").get().value).workspace.submissions.length,1);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('work/connection-recovery',{recursive:true});await page.screenshot({path:'work/connection-recovery/student-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 const teacherContext=await browser.newContext({viewport:{width:1360,height:900}});await teacherContext.request.post(url+'/api/teacherLogin',{headers:{Origin:url},data:{email:'audit@example.com',password:'password8'}});const teacherPage=await teacherContext.newPage();await teacherPage.goto(url);await teacherPage.locator('aside').getByRole('button',{name:/班級與連線/}).click();
 server.updatePublicOrigin('https://first-test.trycloudflare.com');await teacherPage.getByRole('button',{name:'更新連線資訊',exact:true}).click();await expect(teacherPage.locator('.classroom-share-row input')).toHaveValue('https://first-test.trycloudflare.com/?class='+code);
 server.updatePublicOrigin('https://next-test.trycloudflare.com',false);await teacherPage.getByRole('button',{name:'更新連線資訊',exact:true}).click();await expect(teacherPage.locator('.classroom-share-row input')).toHaveValue('https://next-test.trycloudflare.com/?class='+code);await expect(teacherPage.locator('.classroom-status')).toContainText('外網暫時不穩定');await expect(teacherPage.locator('.classroom-status')).toHaveClass(/is-unstable/);await teacherPage.screenshot({path:'work/connection-recovery/teacher-connection.png',fullPage:true});await teacherContext.close();
 console.log('PASS: draft reload, offline editing, answer download, lost submit response, confirmed result after reload, one submission, draft cleanup, mobile layout, teacher link replacement and degraded state');
}finally{await browser?.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
