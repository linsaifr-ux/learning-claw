import test from 'node:test';import assert from 'node:assert/strict';import {applyAction,seedState} from '../functions/domain.mjs';import {studentView} from '../functions/views.mjs';
const actor={role:'student',studentId:'s1'},act=(s,a)=>applyAction(s,{studentId:'s1',requestId:crypto.randomUUID(),...a},actor);
test('outfits and room materials persist independently of placements, without spending coins',()=>{
 const s=seedState();s.inventory.push({id:'crown',studentId:'s1',kind:'accessory-crown'},{id:'scarf',studentId:'s1',kind:'accessory-scarf'});const room={...s.rooms.s1,style:'observatory',floor:'walnut',rug:'cloud',outfits:[{itemId:'starter1',head:'crown',neck:'scarf'}]};
 const saved=act(s,{type:'saveRoom',room});assert.equal(saved.students[0].balance,s.students[0].balance);assert.equal(saved.rooms.s1.outfits[0].head,'crown');
 const stored=act(saved,{type:'saveRoom',room:{...saved.rooms.s1,placements:[]}});assert.deepEqual(stored.rooms.s1.outfits,room.outfits);assert.deepEqual(studentView(stored,'s1').rooms.s1,stored.rooms.s1);assert.equal(studentView(stored,'s2').rooms.s1,undefined);
});
test('rejects foreign inventory, duplicate outfits and unknown catalog entries atomically',()=>{
 const s=seedState();for(const outfits of [[{itemId:'foreign',head:'crown',neck:'none'}],[{itemId:'starter1',head:'hack',neck:'none'}],[{itemId:'starter1',head:'none',neck:'none'},{itemId:'starter1',head:'star',neck:'bow'}]])assert.throws(()=>act(s,{type:'saveRoom',room:{...s.rooms.s1,outfits}}));
 for(const field of ['style','floor','rug'])assert.throws(()=>act(s,{type:'saveRoom',room:{...s.rooms.s1,[field]:'unknown'}}));
 assert.equal(s.rooms.s1.outfits,undefined);
});
test('selected machine is recorded at admission; invalid choice cannot spend coins',()=>{
 const s=seedState();assert.throws(()=>act(s,{type:'startGame',machineId:'unknown',seed:12}));
 const next=act(s,{type:'startGame',machineId:'cosmic',seed:12});assert.equal(next.sessions[0].machineId,'cosmic');assert.equal(next.students[0].balance,s.students[0].balance-s.classes[0].cost);assert.throws(()=>act(next,{type:'startGame',machineId:'classic',seed:13}));
 assert.equal(act(s,{type:'startGame',seed:12}).sessions[0].machineId,'classic');
});
