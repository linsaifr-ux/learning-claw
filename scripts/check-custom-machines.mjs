// Teacher uploads a GLB prize, builds a machine and opens it; a student plays it (isolated data, port 4183).
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';import {deflateSync} from 'node:zlib';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createClassroom} from '../desktop/service.mjs';import {classroomHttp} from '../desktop/http.mjs';
// A textured GLB: embedded PNG read by GLTFLoader through a blob: URL (needs connect-src blob:).
function png(w,h){const crc=b=>{let c=~0;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c>>>1^(0xEDB88320&-(c&1))}return ~c>>>0};const chunk=(t,d)=>{const b=Buffer.alloc(12+d.length);b.writeUInt32BE(d.length);b.write(t,4);d.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+d.length)),8+d.length);return b};const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(x<w/2?[200,60,40]:[40,90,160],y*(w*3+1)+1+x*3);const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
function texturedBox(){const v=[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]].map(([x,y,z])=>[x*.5,y*.7,z*.4]);const pos=new Float32Array(v.flat()),uv=new Float32Array(v.flatMap(([x,y])=>[x+.5,y/1.4+.5])),idx=new Uint16Array([0,1,2,0,2,3,5,4,7,5,7,6,4,0,3,4,3,7,1,5,6,1,6,2,3,2,6,3,6,7,4,5,1,4,1,0]),image=png(8,8);
 const parts=[Buffer.from(pos.buffer),Buffer.from(uv.buffer),Buffer.from(idx.buffer),image],views=[];let offset=0;const padded=parts.map(b=>{const p=Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);views.push({buffer:0,byteOffset:offset,byteLength:b.length});offset+=p.length;return p});const bin=Buffer.concat(padded);
 const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1},indices:2,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0}}],textures:[{source:0}],images:[{bufferView:3,mimeType:'image/png'}],buffers:[{byteLength:bin.length}],bufferViews:views,accessors:[{bufferView:0,componentType:5126,count:8,type:'VEC3',min:[-.5,-.7,-.4],max:[.5,.7,.4]},{bufferView:1,componentType:5126,count:8,type:'VEC2'},{bufferView:2,componentType:5123,count:36,type:'SCALAR'}]};
 const j=Buffer.from(JSON.stringify(json));const jp=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,0x20)]);const body=Buffer.concat([Buffer.from(new Uint32Array([jp.length,0x4E4F534A]).buffer),jp,Buffer.from(new Uint32Array([bin.length,0x004E4942]).buffer),bin]);return Buffer.concat([Buffer.from(new Uint32Array([0x46546C67,2,12+body.length]).buffer),body])}
const directory=mkdtempSync(join(tmpdir(),'custom-machines-')),service=createClassroom({directory,setupCode:'qa'}),port=4183,url=`http://127.0.0.1:${port}`;
const teacher=(await service.call('teacherRegister',{email:'custom@example.com',password:'password123',setupCode:'qa'})).token;
const call=(token,type,extra={})=>service.call('classroomAction',{type,requestId:crypto.randomUUID(),...extra},token);
const {classId}=await call(teacher,'createClass',{name:'自訂班',grade:'國小三年級'});await call(teacher,'registration',{classId,open:true});await service.call('setClassOpen',{open:true},teacher);
const code=(await service.call('state',{},teacher)).state.classes[0].code;const student=(await service.call('studentAccess',{code,name:'小玩家',birthday:'0202',register:true})).token;
await call(teacher,'grant',{ids:[(await service.call('state',{},student)).state.students[0].id],amount:9,reason:'測試'});
// A machine saved before lobby pictures existed.
await call(teacher,'saveCustomMachine',{machine:{name:'舊機台',color:'#7a5a3c',accent:'#f0d9a8',prizes:['cat','bear']}});
const server=classroomHttp(service,{webRoot:resolve('dist-desktop'),port});await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true,args:(process.env.CHROME_ARGS||'').split(' ').filter(Boolean)});mkdirSync('work',{recursive:true});writeFileSync('work/textured-box.glb',texturedBox());
const watch=(page,list)=>{page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|Couldn't load texture/.test(m.text()))list.push(m.text())})};
try{
 const t=await browser.newContext({viewport:{width:1360,height:1000}});await t.addCookies([{name:'tc-session',value:teacher,url,httpOnly:true,sameSite:'Strict'}]);const p=await t.newPage(),errors=[];watch(p,errors);p.on('dialog',d=>d.accept());await p.goto(url);
 await p.getByRole('button',{name:/遊戲與活動/}).click();await p.getByRole('button',{name:'自訂機台',exact:true}).click();
 await expect.poll(async()=>(await service.call('state',{},teacher)).state.customMachines.find(m=>m.name==='舊機台').portrait,{timeout:60000}).toMatch(/^[0-9a-f]{64}$/);await expect(p.getByRole('status').filter({hasText:'產生遊戲大廳'})).toHaveCount(0);
 await p.getByLabel('模型檔').setInputFiles('work/textured-box.glb');await expect(p.locator('.model-preview small')).toContainText('三角面',{timeout:30000});
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
  const s=await browser.newContext({viewport:size});await s.addCookies([{name:'tc-session',value:student,url,httpOnly:true,sameSite:'Strict'}]);const q=await s.newPage(),errs=[];watch(q,errs);await q.goto(url);
  await q.getByRole('button',{name:/遊戲大廳/}).first().click();const card=q.getByRole('button',{name:'進入實驗機台'});await expect(card).toBeVisible();const art=card.locator('img.lobby-cabinet');await expect(art).toHaveAttribute('src',/^\/custom-portraits\/[0-9a-f]{64}$/);await expect.poll(()=>art.evaluate(i=>i.complete&&i.naturalWidth)).toBeGreaterThan(200);
  if(size.width>400){await card.scrollIntoViewIfNeeded();await q.waitForTimeout(500);await q.screenshot({path:'work/custom-machine-lobby.png'});await card.click();await expect(q.locator('.world canvas')).toBeVisible({timeout:30000});await expect(q.locator('.prize-list')).toContainText('實驗兔');
   await q.getByRole('button',{name:/投入 .*枚代幣/}).click();await expect(q.getByRole('button',{name:'下爪！',exact:true})).toBeEnabled({timeout:60000});await q.waitForTimeout(1500);await q.screenshot({path:'work/custom-machine-play.png'});
   await q.getByRole('button',{name:'下爪！',exact:true}).click();await expect(q.locator('body')).toContainText(/你夾到了|新朋友加入收藏|這次沒有夾到/,{timeout:120000});
   const state=(await service.call('state',{},student)).state;assert.equal(state.sessions.find(g=>g.machineId.startsWith('cm-')).status,'finished');}
  else assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errs,[]);await s.close();
 }
 console.log('PASS: older machine gets its lobby picture automatically; textured GLB upload with preview and portrait, machine builder with rendered 3D lobby picture, delete guard, class opening, student lobby art, custom 3D machine play and server-verified result on desktop and phone.');
}finally{await browser.close();await new Promise(r=>server.close(r));service.close();rmSync(directory,{recursive:true,force:true})}
