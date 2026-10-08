// Verifies editing an existing detective character from 遊戲與活動 → 角色素材 (isolated temp data, port 4195).
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {deflateSync} from 'node:zlib';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';
const png=(w,h,rgb)=>{const crc=b=>{let c=~0;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c>>>1^(0xEDB88320&-(c&1))}return ~c>>>0};const chunk=(t,d)=>{const b=Buffer.alloc(12+d.length);b.writeUInt32BE(d.length);b.write(t,4);d.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+d.length)),8+d.length);return b};const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(rgb,y*(w*3+1)+1+x*3);const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64')};
const directory=mkdtempSync(join(tmpdir(),'character-edit-')),service=createClassroom({directory,setupCode:'qa'});
const {token}=await service.call('teacherRegister',{email:'chars@example.com',password:'password123',setupCode:'qa'});
const act=data=>service.call('classroomAction',{requestId:crypto.randomUUID(),...data},token);
const {classId}=await act({type:'createClass',name:'角色測試班',grade:'國小五年級'});
await act({type:'saveCharacter',classId,character:{name:'小偵探',source:'自繪原創',image:png(64,64,[200,80,60]),rights:true}});
const before=(await service.call('state',{},token)).state.characters[0];
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port:4195});await new Promise(r=>server.listen(4195,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.context().addCookies([{name:'tc-session',value:token,url:'http://127.0.0.1:4195',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('http://127.0.0.1:4195');await page.getByRole('button',{name:/遊戲與活動/}).click();await page.getByRole('button',{name:'角色素材',exact:true}).click();
 await page.getByRole('button',{name:'編輯',exact:true}).click();
 await expect(page.getByRole('heading',{name:'編輯角色：小偵探'})).toBeVisible();
 await expect(page.getByLabel('角色名稱')).toHaveValue('小偵探');
 await page.getByLabel('角色名稱').fill('小偵探・改');await page.getByLabel('素材來源或授權說明').fill('自繪原創（修訂）');
  await page.getByRole('button',{name:'保存修改'}).click();await expect(page.getByText('角色已更新')).toBeVisible();
 await expect(page.getByRole('heading',{name:'新增角色'})).toBeVisible();
 const after=(await service.call('state',{},token)).state.characters;
 assert.equal(after.length,1);assert.equal(after[0].id,before.id);assert.equal(after[0].name,'小偵探・改');assert.equal(after[0].source,'自繪原創（修訂）');assert.equal(after[0].image,before.image);
 // Cancel restores the empty form without saving.
 await page.getByRole('button',{name:'編輯',exact:true}).click();await page.getByLabel('角色名稱').fill('不該保存');await page.getByRole('button',{name:'取消編輯'}).click();
 await expect(page.getByRole('heading',{name:'新增角色'})).toBeVisible();assert.equal((await service.call('state',{},token)).state.characters[0].name,'小偵探・改');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: 編輯角色保留同一個 id 與原圖，名稱與來源已更新；取消編輯不會保存。');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
