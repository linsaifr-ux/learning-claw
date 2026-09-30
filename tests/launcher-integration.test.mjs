import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,symlinkSync,mkdirSync,rmSync,existsSync,readdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {createClassroom} from '../desktop/service.mjs';
import {ClassroomLauncher} from '../desktop/launcher/controller.mjs';
async function unusedPort(){const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));return port}
test('bundled Node IPC starts, preserves teacher data on restart and releases lock and restores a startup backup',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'claw-launcher-'));const root=join(temp,'app');mkdirSync(root);const directory=join(temp,'data');const port=await unusedPort();
 for(const name of ['desktop','functions','dist-desktop','node_modules'])symlinkSync(resolve(name),join(root,name),'dir');
 mkdirSync(join(root,'runtime'));symlinkSync(process.execPath,join(root,'runtime',process.platform==='win32'?'node.exe':'node'));
 const launcher=new ClassroomLauncher({root,directory,port});
 try{
  await launcher.start('local');assert.equal(launcher.state.status,'running',launcher.state.error);assert.ok(launcher.state.setupCode);
  const url=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(url)).status,200);
  const meta=await (await fetch(url+'/api/meta')).json();assert.equal(meta.setupRequired,true);assert.equal(meta.publicOrigin,'');
  const response=await fetch(url+'/api/teacherRegister',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({email:'launcher@example.com',password:'password123',setupCode:launcher.state.setupCode})});
  assert.equal(response.status,200,await response.text());
  await launcher.stop();assert.equal(existsSync(join(directory,'server.lock')),false);
  await launcher.start('local');assert.equal(launcher.state.status,'running',launcher.state.error);assert.equal(launcher.state.setupCode,'');assert.equal((await (await fetch(url+'/api/meta')).json()).setupRequired,false);
  const backups=readdirSync(join(directory,'backups')).sort();assert.ok(backups.length>=2);
  await launcher.stop();
  const restoredDirectory=join(temp,'restored');mkdirSync(restoredDirectory);
  for(const name of ['classroom.sqlite','server.key'])copyFileSync(join(directory,'backups',backups.at(-1),name),join(restoredDirectory,name));
  const restored=createClassroom({directory:restoredDirectory});
  try{assert.equal(restored.setupCode,null);const login=await restored.call('teacherLogin',{email:'launcher@example.com',password:'password123'});assert.ok(login.token);assert.equal((await restored.call('state',{},login.token)).classOpen,false)}finally{restored.close()}

 }finally{await launcher.stop();rmSync(temp,{recursive:true,force:true})}
});
