import test from 'node:test';import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {simulate,validateTarget,createPhysics,stepPhysics,captured,STEPS,toyLayout} from '../functions/physics.mjs';import {EXIT,LIMIT} from '../functions/machine.mjs';
await R.init();
test('physics replay deterministically awards a toy that passes through the chute',()=>{const target={x:-.3125373423099518,z:.1933855563402176};const a=simulate(R,12345,target),b=simulate(R,12345,target);assert.deepEqual(a,b);assert.ok(a.length>0)});
test('non-finite and out-of-bounds claw targets rejected',()=>{for(const t of [{x:Infinity,z:0},{x:LIMIT.x+.001,z:0},{x:0,z:LIMIT.z+.001},{x:0,z:NaN}])assert.throws(()=>validateTarget(t))});
test('open chute receives falling toy while solid floor supports toy',()=>{const s=createPhysics(R,1);try{const t=s.toys[0];t.body.setTranslation({x:EXIT.x,y:1.5,z:EXIT.z},true);t.body.setLinvel({x:0,y:0,z:0},true);assert.deepEqual(captured(s),[]);for(let i=0;i<360;i++){s.world.step();s.collect()}assert.ok(captured(s).includes(0));assert.ok(t.body.translation().y<-.4);assert.ok(s.toys[1].body.translation().y>0)}finally{s.world.free()}});
test('claw and toys remain finite and solid contacts stay within solver tolerance at travel corners',()=>{let worst=0;for(const target of [{x:LIMIT.x,z:LIMIT.z},{x:-LIMIT.x,z:-LIMIT.z},{x:LIMIT.x,z:-LIMIT.z},{x:-LIMIT.x,z:LIMIT.z},{x:-.4,z:-.1}]){const s=createPhysics(R,12345,target);try{for(let step=0;step<STEPS;step++){stepPhysics(s,step,target);for(const p of s.parts){const pos=p.body.translation();assert.ok(Number.isFinite(pos.x)&&Math.abs(pos.x)<2&&pos.y>-.1)}if(step%4===0)for(const t of s.toys)for(const c of t.colliders)s.world.contactPairsWith(c,other=>{if(other.isSensor()||other.parent()?.handle===t.body.handle)return;const contact=c.contactCollider(other,0);if(contact)worst=Math.max(worst,-contact.distance)})}assert.ok(s.toys.every(t=>t.body.translation().y>-1.1))}finally{s.world.free()}}assert.ok(worst<.025,`penetration ${worst} m exceeds 25mm conservative tolerance`)});
test('drop preserves aimed toy poses and matches server replay',()=>{const target={x:-.4,z:-.7},preview=createPhysics(R,12345),server=createPhysics(R,12345,target);const poses=s=>s.toys.map(t=>({position:{...t.body.translation()},rotation:{...t.body.rotation()}}));try{const before=poses(preview);preview.prepareDrop(target);assert.deepEqual(poses(preview),before,'starting a drop must not reposition toys');assert.deepEqual(poses(preview),poses(server));for(let step=0;step<STEPS;step++){stepPhysics(preview,step,target);stepPhysics(server,step,target);if(step===48)assert.deepEqual(poses(preview),before,'toys stay still before the claw reaches them');if(step===0||step===48||step===STEPS-1)assert.deepEqual(poses(preview),poses(server))}assert.deepEqual(captured(preview),captured(server))}finally{preview.world.free();server.world.free()}});

test('random fills vary by seed, preserve stock and leave the chute clear',()=>{
 for(let seed=0;seed<100;seed++){
  const layout=toyLayout(seed);assert.deepEqual(layout,toyLayout(seed));
  assert.notDeepEqual(layout,toyLayout(seed+1));
  assert.deepEqual(layout.map(t=>t.kind).sort(),['bear','bear','bear','bunny','bunny','bunny','cat','cat']);
  for(const [i,t] of layout.entries()){
   assert.ok(t.x<=-.16||t.z<=-.45);
   for(const other of layout.slice(i+1))assert.ok(Math.hypot(t.x-other.x,t.z-other.z)>=.65);
  }
 }
});
test('random fills settle without awarding prizes or moving when a drop begins',()=>{
 for(const seed of [0,1,4,10,13,29,12345]){
  const s=createPhysics(R,seed);try{
   assert.ok(s.toys.every(t=>t.body.isSleeping()&&t.body.translation().y>0));
   const before=s.toys.map(t=>({...t.body.translation()}));
   s.prepareDrop({x:0,z:0});for(let step=0;step<48;step++)stepPhysics(s,step,{x:0,z:0});
   assert.deepEqual(s.toys.map(t=>({...t.body.translation()})),before);assert.deepEqual(captured(s),[]);
  }finally{s.world.free()}
 }
});
