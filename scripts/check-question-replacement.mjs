import{chromium,expect}from'@playwright/test';import assert from'node:assert/strict';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{createClassroom}from'../desktop/service.mjs';import{classroomHttp}from'../desktop/http.mjs';
const directory=mkdtempSync(join(tmpdir(),'quick-qa-'));let calls=0;const service=createClassroom({directory,setupCode:'qa',gemini:async()=>{calls++;throw Error('must not use AI')}});
const login=await service.call('teacherRegister',{email:'quick@example.com',password:'password123',setupCode:'qa'});const call=(name,data)=>service.call(name,data,login.token);await call('classroomAction',{type:'createClass',name:'測試班',grade:'國小三年級',requestId:crypto.randomUUID()});
const row={grade:'國小三年級',subject:'國語／國文',unit:'成語',source:'原創',rights:'原創供教學使用',question:{type:'choice',prompt:'哪個成語表示專心？',options:['一心一意','半途而廢','畫蛇添足','守株待兔'],answer:'A',explanation:'一心一意指專心致志。'}};
const {record}=await call('questionBank',{operation:'save',record:row});await call('questionBank',{operation:'review',id:record.id,revision:record.revision,confirmed:true});await call('questionBank',{operation:'save',record:{...row,question:{...row.question,prompt:'尚未審核的成語題'}}});
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port:4193});await new Promise(r=>server.listen(4193,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});

try{
 const classId=(await call('state',{})).state.classes[0].id;
 const scope={grade:row.grade,subject:'國文',unit:'成語',classId,practicePurpose:'new'};
 const initial=await call('teacherAI',{...scope,mode:'bankQuestions',count:1,material:'選擇題1題'});
 await call('classroomAction',{type:'saveAssignment',classId,requestId:crypto.randomUUID(),assignment:{...scope,id:'history',title:'上次練習',status:'published',questions:initial.questions}});
 const page=await browser.newPage({viewport:{width:Number(process.env.QA_WIDTH)||1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.context().addCookies([{name:'tc-session',value:login.token,url:'http://127.0.0.1:4193',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('http://127.0.0.1:4193');await page.getByRole('button',{name:/學習任務/}).click();await page.getByRole('button',{name:'建立學習任務'}).click();
 const d=page.getByRole('dialog'),purpose=d.getByRole('combobox',{name:'本次出題目的',exact:true});await expect(purpose).toHaveValue('new');
 await d.getByLabel('任務名稱').fill('再練成語');await d.getByLabel('科目（可自訂）').fill('國文');await d.getByLabel('單元與學習目標').fill('成語');await d.getByLabel('教材或出題要求（不含學生個資）').fill('選擇題1題');
 await expect(d.getByRole('combobox',{name:'本次共 1 題（依上方題型配額）',exact:true})).toHaveValue('1');await d.getByRole('button',{name:'快速組卷',exact:true}).click();await expect(d.locator('.ai-generation-status')).toContainText('已排除 1 題本班舊題');
 await d.getByRole('button',{name:'允許複習舊題',exact:true}).click();await expect(purpose).toHaveValue('review');await expect(d.getByRole('combobox',{name:'舊題最多比例',exact:true})).toHaveValue('100');
 await d.getByRole('button',{name:'快速組卷',exact:true}).click();await expect(d.getByRole('button',{name:'發布任務',exact:true})).toBeEnabled();await d.getByRole('button',{name:'保存草稿',exact:true}).click();await page.getByRole('button',{name:'編輯題目',exact:true}).click();
 await expect(purpose).toHaveValue('review');await expect(d.getByRole('combobox',{name:'舊題最多比例',exact:true})).toHaveValue('100');await expect(d.getByLabel('教材或出題要求（不含學生個資）')).toHaveValue('選擇題1題');await expect(d.getByRole('combobox',{name:'本次共 1 題（依上方題型配額）',exact:true})).toHaveValue('1');
 await purpose.selectOption('new');await expect(d.getByRole('button',{name:'發布任務',exact:true})).toBeDisabled();await expect(d.locator('.notice.error')).toContainText('本班已發布');await expect(d).toBeVisible();await expect(d.locator('.question-editor')).toContainText('哪個成語表示專心');

 await d.getByRole('button',{name:'從題庫替換重複題',exact:true}).click();await expect(d.locator('.ai-generation-status')).toContainText('原草稿完整保留');
 const {record:replacement}=await call('questionBank',{operation:'save',record:{...row,question:{...row.question,prompt:'小明畫圖時專注於作品，可以用哪個成語形容？'}}});await call('questionBank',{operation:'review',id:replacement.id,revision:replacement.revision,confirmed:true});
 await d.getByRole('button',{name:'從題庫替換重複題',exact:true}).click();await expect(d.locator('.ai-generation-status')).toContainText('已替換第 1 題');await expect(d.locator('.question-editor')).toContainText('小明畫圖');await expect(d.getByRole('button',{name:'從題庫替換重複題',exact:true})).toHaveCount(0);await expect(purpose).toHaveValue('new');await expect(d.getByRole('button',{name:'發布任務',exact:true})).toBeEnabled();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await d.getByRole('button',{name:'發布任務',exact:true}).click();await expect(d).toHaveCount(0);assert.equal(calls,0);assert.deepEqual(errors,[]);console.log('Replacement browser passed: visible conflicts, shortage keeps draft, direct replacement clears conflict and publishes in NEW mode without AI or redundant approval.');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
