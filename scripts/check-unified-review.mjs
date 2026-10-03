import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';
import {inspectMathQuestion,hasMathReview} from '../functions/math-verification.mjs';import {hasQuestionReview} from '../functions/question-review.mjs';
const directory=mkdtempSync(join(tmpdir(),'unified-review-')),service=createClassroom({directory,setupCode:'qa'});
const {token}=await service.call('teacherRegister',{email:'review@example.com',password:'password123',setupCode:'qa'});
const act=data=>service.call('classroomAction',{requestId:crypto.randomUUID(),...data},token);
const {classId}=await act({type:'createClass',name:'核准測試班',grade:'國小五年級'});
const q={type:'short',prompt:'三角形的內角和是多少？',answer:'180度',explanation:'三角形的三個內角相加為180度。',provenance:{kind:'ai',sources:[]}};
assert.equal(inspectMathQuestion(q,'數學').status,'needs-review');
await act({type:'saveAssignment',classId,assignment:{id:'review-task',title:'三角形內角',grade:'國小五年級',subject:'數學',unit:'三角形',status:'draft',questions:[q]}});
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port:4199});await new Promise(r=>server.listen(4199,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.context().addCookies([{name:'tc-session',value:token,url:'http://127.0.0.1:4199',httpOnly:true,sameSite:'Strict'}]);await page.goto('http://127.0.0.1:4199');
 await page.getByRole('button',{name:/教學與出題/}).click();await page.getByRole('button',{name:/繼續編輯/}).click();
 const modal=page.locator('dialog');await expect(modal.getByRole('checkbox')).toHaveCount(1);await expect(modal.getByRole('button',{name:'發布任務',exact:true})).toBeDisabled();
 await modal.getByRole('checkbox',{name:'確認第1題正確性',exact:true}).click();await expect(modal.getByRole('button',{name:'發布任務',exact:true})).toBeEnabled();
 await modal.locator('.question-editor textarea').first().fill('請問三角形的三個內角和是多少？');await expect(modal.getByRole('button',{name:'發布任務',exact:true})).toBeDisabled();await expect(modal.getByRole('checkbox')).toHaveCount(1);
 await modal.getByRole('checkbox',{name:'確認第1題正確性',exact:true}).click();await expect(modal.getByRole('button',{name:'發布任務',exact:true})).toBeEnabled();await modal.getByRole('button',{name:'保存草稿',exact:true}).click();
 const task=(await service.call('state',{},token)).state.assignments[0];assert(hasMathReview(task.questions[0],task.subject));assert(hasQuestionReview(task.questions[0],task));
 await page.getByRole('button',{name:/繼續編輯/}).click();await expect(modal.getByRole('checkbox')).toHaveCount(0);await expect(modal.getByRole('button',{name:'發布任務',exact:true})).toBeEnabled();await modal.getByRole('button',{name:'發布任務',exact:true}).click();await expect(page.getByText('任務已發布給班級學生',{exact:true})).toBeVisible();assert.equal(errors.length,0);
 console.log('PASS: one confirmation saves both reviews; edits invalidate; saved approved question publishes without repeat confirmation.');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
