import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {DatabaseSync} from 'node:sqlite';import {createClassroom} from '../desktop/service.mjs';
const blob=dir=>{const db=new DatabaseSync(join(dir,'classroom.sqlite'));try{return JSON.parse(db.prepare("SELECT value FROM settings WHERE id='classroom'").get().value)}finally{db.close()}};
test('duplicate requests replay from the receipt table, old in-state receipts migrate out, processed ids are capped',async()=>{const dir=mkdtempSync(join(tmpdir(),'claw-receipts-'));try{
 let s=createClassroom({directory:dir,setupCode:'x'});const {token}=await s.call('teacherRegister',{email:'r@example.com',password:'password8',setupCode:'x'});
 const created=await s.call('classroomAction',{type:'createClass',name:'甲班',grade:'國小三年級',requestId:'same-1'},token);
 assert.deepEqual(await s.call('classroomAction',{type:'createClass',name:'甲班',grade:'國小三年級',requestId:'same-1'},token),created);
 await assert.rejects(s.call('classroomAction',{type:'createClass',name:'乙班',grade:'國小三年級',requestId:'same-1'},token),/內容不同/);
 assert.equal((await s.call('state',{},token)).state.classes.length,1);assert.equal(blob(dir).actionReceipts,undefined);
 const {classId}=created;await s.call('classroomAction',{type:'addStudent',classId,name:'小宇',requestId:'add-1'},token);const sid=(await s.call('state',{},token)).state.students[0].id;s.close();
 // Data written by older versions: receipts inside the JSON and a long processed list.
 const db=new DatabaseSync(join(dir,'classroom.sqlite'));const old=blob(dir);old.actionReceipts={legacy:{signature:'sig',result:{ok:true,legacy:true}}};old.workspace.processed=[...Array.from({length:2500},(_,i)=>'old-'+i),...old.workspace.processed];db.prepare("UPDATE settings SET value=? WHERE id='classroom'").run(JSON.stringify(old));db.close();
 s=createClassroom({directory:dir});const login=await s.call('teacherLogin',{email:'r@example.com',password:'password8'});
 const after=blob(dir);assert.equal(after.actionReceipts,undefined);assert.equal(after.workspace.processed.length,2000);assert(after.workspace.processed.includes('add-1'));
 const check=new DatabaseSync(join(dir,'classroom.sqlite'),{readOnly:true});assert.equal(check.prepare("SELECT result FROM action_receipts WHERE key='legacy'").get().result,'{"ok":true,"legacy":true}');check.close();
 const grant={type:'grant',ids:[sid],amount:2,reason:'參與',requestId:'grant-1'};await s.call('classroomAction',grant,login.token);await s.call('classroomAction',grant,login.token);
 assert.equal((await s.call('state',{},login.token)).state.ledger.filter(x=>x.reason==='參與').length,1);s.close();
}finally{rmSync(dir,{recursive:true,force:true})}});
