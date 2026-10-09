import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {ClassroomLauncher} from '../desktop/launcher/controller.mjs';
class Child extends EventEmitter {
 constructor(ipc){super();this.stdout=new PassThrough();this.stderr=new PassThrough();this.connected=ipc;this.exitCode=null;this.kills=0}
 send(message,callback){if(message.type==='connection'){this.publicUrl=message.publicUrl;queueMicrotask(()=>this.emit('message',{type:'connection-ready',id:message.id}));callback?.();return}assert.equal(message.type,'shutdown');this.shutdown=true;queueMicrotask(()=>this.exit());callback?.()}
 kill(){this.kills++;queueMicrotask(()=>this.exit())}
 exit(){this.exitCode=0;this.emit('exit',0)}
}
function fixture({behavior,checkPort=async()=>{},healthInterval=15000,probe=async()=>true}={}){const children=[];const launcher=new ClassroomLauncher({root:'/app',directory:'/data',checkPort,startTimeout:100,tunnelTimeout:100,retryDelay:1,healthInterval,probe,spawnProcess:(bin,args,options)=>{const c=new Child(options.stdio.includes('ipc'));children.push(c);assert.equal(options.windowsHide,true);queueMicrotask(()=>behavior?.(c,bin,options));return c}});return {launcher,children}}
test('local start carries setup code only in state; stop requests graceful IPC',async()=>{
 const {launcher,children}=fixture({behavior:c=>c.emit('message',{type:'ready',setupCode:'secret-code'})});
 await launcher.start('local');assert.equal(launcher.state.status,'running');assert.equal(launcher.state.setupCode,'secret-code');assert.equal(JSON.stringify(launcher.state.logs).includes('secret-code'),false);
 await assert.rejects(launcher.start('local'));await launcher.stop();assert.equal(children[0].shutdown,true);assert.equal(children[0].kills,0);assert.equal(launcher.state.setupCode,'');assert.equal(launcher.children.size,0);
});
test('online starts tunnel before server and stops both owned children',async()=>{
 const {launcher,children}=fixture({behavior:(c,bin,options)=>{if(/cloudflared(\.exe)?$/.test(bin))c.stderr.write('https://a-test.trycloudflare.com\nINF Registered tunnel connection');else{assert.equal(options.env.CLASSROOM_PUBLIC_URL,'https://a-test.trycloudflare.com');c.emit('message',{type:'ready'})}}});
 await launcher.start('online');assert.equal(launcher.state.status,'running');assert.equal(children.length,2);await launcher.stop();assert.equal(children[0].kills,1);assert.equal(children[1].shutdown,true);
});
test('occupied port never spawns or terminates any service',async()=>{const {launcher,children}=fixture({checkPort:async()=>{throw Error('連接埠已被使用')}});await launcher.start('online');assert.equal(launcher.state.status,'error');assert.equal(children.length,0)});
test('cancel startup shuts down tunnel without starting server',async()=>{const {launcher,children}=fixture();const started=launcher.start('online');await new Promise(resolve=>setImmediate(resolve));await launcher.stop();await started;assert.equal(children.length,1);assert.equal(launcher.state.status,'stopped');assert.equal(launcher.children.size,0)});
test('tunnel timeout cleans up and permits retry',async()=>{const {launcher,children}=fixture();await launcher.start('online');assert.equal(launcher.state.status,'error');assert.match(launcher.state.error,/逾時/);assert.equal(children[0].kills,1);assert.equal(launcher.children.size,0)});
test('spawn errors are handled; raw logs are not exposed',async()=>{const {launcher}=fixture({behavior:c=>{c.stderr.write('api_key=hidden');c.emit('error',Error('ENOENT'));c.exit()}});await launcher.start('local');assert.equal(launcher.state.status,'error');assert.equal(JSON.stringify(launcher.state).includes('hidden'),false)});
test('tunnel exit rebuilds origin without stopping the classroom server',async()=>{let n=0;const {launcher,children}=fixture({behavior:(c,bin)=>/cloudflared(\.exe)?$/.test(bin)?c.stderr.write(`https://test-${++n}.trycloudflare.com\nINF Registered tunnel connection`):c.emit('message',{type:'ready'})});try{await launcher.start('online');children[0].exit();await new Promise(resolve=>setTimeout(resolve,25));assert.equal(launcher.state.status,'running');assert.equal(children[1].shutdown,undefined);assert.equal(launcher.state.publicUrl,'https://test-2.trycloudflare.com');assert.equal(children[1].publicUrl,launcher.state.publicUrl);assert.equal(launcher.children.size,2)}finally{await launcher.stop()}});
test('stop cancels tunnel recovery without restarting a classroom',async()=>{let n=0;const {launcher,children}=fixture({behavior:(c,bin)=>/cloudflared(\.exe)?$/.test(bin)?(++n===1&&c.stderr.write('https://test-one.trycloudflare.com\nINF Registered tunnel connection')):c.emit('message',{type:'ready'})});await launcher.start('online');children[0].exit();await new Promise(resolve=>setTimeout(resolve,10));await launcher.stop();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(launcher.state.status,'stopped');assert.equal(launcher.children.size,0);assert.equal(children[1].shutdown,true);assert.equal(n,2)});

test('a tunnel URL alone does not claim connection readiness',async()=>{const {launcher,children}=fixture({behavior:c=>c.stderr.write('https://a-test.trycloudflare.com')});await launcher.start('online');assert.equal(launcher.state.status,'error');assert.equal(children.length,1);assert.equal(children[0].kills,1)});

test('failed external probe reports degraded connection without stopping service, then recovers',async()=>{
 let healthy=false;const {launcher,children}=fixture({healthInterval:5,probe:async()=>healthy,behavior:(c,bin)=>/cloudflared(\.exe)?$/.test(bin)?c.stderr.write('https://health-test.trycloudflare.com\nRegistered tunnel connection'):c.emit('message',{type:'ready'})});
 try{await launcher.start('online');await new Promise(r=>setTimeout(r,20));assert.equal(launcher.state.connection,'degraded');assert.equal(children[1].shutdown,undefined);healthy=true;await new Promise(r=>setTimeout(r,20));assert.equal(launcher.state.connection,'connected');assert.equal(children.length,2)}finally{await launcher.stop()}
});
