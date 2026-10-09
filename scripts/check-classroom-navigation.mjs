import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';
import {classroomHttp} from '../desktop/http.mjs';

// Isolated accounts and database: never use the teacher's installed classroom.
const directory=mkdtempSync(join(tmpdir(),'classroom-navigation-'));
const service=createClassroom({directory,setupCode:'qa'});
const {token}=await service.call('teacherRegister',{email:'navigation@example.com',password:'password123',setupCode:'qa'});
for(const name of ['甲班','乙班'])await service.call('classroomAction',{requestId:crypto.randomUUID(),type:'createClass',name,grade:'國小三年級'},token);
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port:4198});
await new Promise(r=>server.listen(4198,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/same key|unique.*key/i.test(m.text()))errors.push(m.text())});
 await page.context().addCookies([{name:'tc-session',value:token,url:'http://127.0.0.1:4198',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('http://127.0.0.1:4198');
 const background=page.locator('summary').filter({hasText:'教學背景'});
 const management=page.getByRole('heading',{name:'學生與班級資料管理',exact:true});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});
  // Phone nav shows a subset; the rest sits behind 更多.
  const nav=async name=>{const b=page.getByRole('button',{name}).first();if(!await b.isVisible())await page.locator('.nav-more').click();await b.click()};
  for(let i=0;i<3;i++){
   await nav(/班級與上課/);
   await page.getByRole('button',{name:'班級設定',exact:true}).click();
   await expect(background).toHaveCount(1);
   await expect(management).toHaveCount(0);
   await background.click();
   await page.getByLabel('班級教學情境').selectOption('school');
   await expect(page.getByLabel('查詢校名')).toBeVisible();
   await page.getByLabel('目前教學班級').selectOption({label:i%2?'甲班':'乙班'});
   await expect(background).toHaveCount(1);
   await expect(management).toHaveCount(0);
   await nav(/系統設定/);
   await page.getByRole('button',{name:'帳號與資料',exact:true}).click();
   await expect(management).toHaveCount(1);
   await expect(background).toHaveCount(0);
   await nav(/學習任務/);
   await expect(page.getByRole('heading',{name:'學習任務',exact:true})).toBeVisible();
   await expect(background).toHaveCount(0);
   await expect(management).toHaveCount(0);
   await expect(page.getByText('查詢115學年度名錄',{exact:true})).toHaveCount(0);
   await page.getByRole('button',{name:'建立學習任務',exact:true}).click();
   await expect(page.locator('dialog')).toBeVisible();
   await expect(background).toHaveCount(0);
   await page.getByRole('button',{name:'關閉',exact:true}).click();
   await nav(/課堂獎勵/);
   await expect(background).toHaveCount(0);
  }
 }
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: repeated classroom/class switching → lessons → editor → rewards, desktop and mobile; school context only under 班級設定, data management only under 系統設定 → 帳號與資料.');
}finally{
 await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true});
}
