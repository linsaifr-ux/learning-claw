// A wrong choice in a detective story must not unlock the evidence; the student retries, the first try is what feedback uses,
// and after closing the case the character recaps every station with the answer and explanation (isolated data, port 4186).
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';import {caseTemplate} from '../functions/detective.mjs';
const directory=mkdtempSync(join(tmpdir(),'detective-retry-')),service=createClassroom({directory,setupCode:'qa'}),port=4186,url=`http://127.0.0.1:${port}`;
const teacher=(await service.call('teacherRegister',{email:'retry@example.com',password:'password123',setupCode:'qa'})).token;
const call=(token,type,extra={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
const {classId}=await call(teacher,'createClass',{name:'推理班',grade:'國小三年級'});await call(teacher,'registration',{classId,open:true});await service.call('setClassOpen',{open:true},teacher);
const code=(await service.call('state',{},teacher)).state.classes[0].code;const student=(await service.call('studentAccess',{code,name:'小探員',birthday:'0305',register:true})).token;
await call(teacher,'saveAssignment',{classId,assignment:{id:'task',title:'天空觀察',unit:'閱讀',grade:'國小三年級',subject:'國語／國文',status:'published',questions:[{type:'choice',prompt:'天空是什麼顏色？',options:['藍色','紅色','紫色','橙色'],answer:'A',explanation:'晴天時陽光中的藍光被空氣散射得最多，所以天空看起來是藍色。'},{type:'short',prompt:'寫下你觀察到的雲的形狀。',answer:'像棉花一樣蓬鬆',explanation:'積雲像棉花。'}]}});
await call(teacher,'saveCharacter',{classId,character:{name:'貓頭鷹',source:'原創',rights:true,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII='}});
let state=(await service.call('state',{},teacher)).state;const story=caseTemplate(state.assignments[0]);story.stages[0].hint='抬頭看看晴天的樣子。';story.stages[0].clue='窗邊的觀察日誌寫著：「中午的天空像海一樣。」';
await call(teacher,'saveCase',{case:{...story,assignmentId:'task',characterId:state.characters[0].id,status:'published',reviewed:true}});
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port});await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true,args:(process.env.CHROME_ARGS||'').split(' ').filter(Boolean)});
try{for(const size of [{width:1280,height:900},{width:390,height:844}]){
 const ctx=await browser.newContext({viewport:size});await ctx.addCookies([{name:'tc-session',value:student,url,httpOnly:true,sameSite:'Strict'}]);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 if(size.width<400){await page.getByRole('button',{name:'已完成與回饋',exact:true}).click();await page.getByRole('button',{name:'回顧案件與領取徽章'}).click()}
 else await page.locator('article').filter({hasText:'天空觀察'}).getByRole('button').first().click();
 const action=page.getByRole('region',{name:'調查行動與選項'}),dialogue=page.locator('.story-dialogue');
 const begin=page.getByRole('button',{name:'我準備好了，開始調查'});if(await begin.count())await begin.click();
 const inspect=page.getByRole('button',{name:/查看現場紀錄/});if(await inspect.count())await inspect.click();
 const progress=()=>service.call('state',{},student).then(r=>r.state.caseProgress[Object.keys(r.state.caseProgress)[0]]);
 if(size.width>400){
  await action.getByLabel('紅色').check();await action.getByRole('button',{name:'確認判斷，繼續追查'}).click();
  await expect(dialogue).toContainText('和現場證據對不上');await expect(dialogue).toContainText('抬頭看看晴天的樣子。');
  await expect(action.getByLabel('紅色')).toBeDisabled();await page.screenshot({path:'work/detective-retry-wrong.png'});await expect(action.getByText('天空是什麼顏色？')).toBeVisible();
  let p=await progress();assert.equal(p.answers.length,0);assert.deepEqual(p.misses,{0:['B']});
  await action.getByLabel('藍色').check();await expect(dialogue).not.toContainText('和現場證據對不上');await action.getByRole('button',{name:'確認判斷，繼續追查'}).click();
  await expect(page.locator('.story-status')).toContainText('調查 1/2');p=await progress();assert.deepEqual(p.answers,['A']);
  const next=()=>page.locator('.story-dialogue button.primary').click();
  await next();const inspect2=page.getByRole('button',{name:/查看現場紀錄/});if(await inspect2.count())await inspect2.click();
  await action.getByRole('textbox').fill('像棉花一樣');await action.getByRole('button',{name:'確認判斷，繼續追查'}).click();await expect(page.locator('.story-status')).toContainText('調查 2/2');
  await next();await action.getByRole('radio').first().check();await action.getByRole('textbox').fill('天空是藍色，雲像棉花');await action.getByRole('button',{name:'提出結案推論'}).click();
  // Recap: station 1 shows the right answer, the first wrong pick and the explanation; station 2 waits for the teacher.
  await action.getByRole('button',{name:/一起回顧每一站/}).click();
  await expect(dialogue).toContainText('案件回顧 1/2');await expect(dialogue).toContainText('還記得我們找到的「窗邊的觀察日誌');await expect(dialogue).toContainText('你一開始選了 B');await expect(dialogue).toContainText('正確答案是 A');
  await expect(action.locator('.recap-options li.right')).toContainText('藍色');await expect(action.locator('.recap-options li.first-wrong')).toContainText('紅色');await expect(action.locator('.recap-explain')).toContainText('藍光被空氣散射');
  await page.screenshot({path:'work/detective-recap-desktop.png'});
  await action.getByRole('button',{name:'下一站 →'}).click();await expect(dialogue).toContainText('案件回顧 2/2');await expect(dialogue).toContainText('由老師批閱');await expect(dialogue).not.toContainText('還記得我們找到的');await expect(action.locator('.recap-note')).toContainText('像棉花一樣');await expect(action.locator('.recap-explain')).toHaveCount(0);
  await action.getByRole('button',{name:'← 上一站'}).click();await expect(dialogue).toContainText('案件回顧 1/2');await action.getByRole('button',{name:'下一站 →'}).click();await action.getByRole('button',{name:'回顧完成'}).click();await expect(action.getByRole('button',{name:/一起回顧每一站/})).toBeVisible();
 }else{
  // Phone: the closed case offers the recap and it fits the screen.
  await action.getByRole('button',{name:/一起回顧每一站/}).click();await expect(action.locator('.recap-explain')).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'work/detective-recap-mobile.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);await ctx.close();
}
 const sub=(await service.call('state',{},teacher)).state.submissions[0];assert.deepEqual(sub.answers,['B','像棉花一樣']);assert.deepEqual(sub.caseRetries,{0:['B']});
 console.log('PASS: wrong choice keeps the station locked with a hint and disabled option; right choice unlocks evidence; feedback keeps the first try; the closing recap explains every station on desktop and phone.');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
