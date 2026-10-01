import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoomDraft,roomDraftReducer as reduce} from '../src/room-draft.mjs';
const room={wall:'mint',theme:'none',placements:[]};
const placed={...room,placements:[{itemId:'toy1',x:1,z:0,rotation:0}]};
test('polling never removes unsaved placements or a failed save draft',()=>{
 let s=reduce(initialRoomDraft(room),{type:'edit',change:placed});
 for(let i=0;i<4;i++)s=reduce(s,{type:'sync',room:structuredClone(room)});
 assert.deepEqual(s.draft,placed);assert.equal(s.dirty,true);
});
test('save acknowledgement ignores old snapshots and preserves edits made during save',()=>{
 let s=reduce(initialRoomDraft(room),{type:'edit',change:placed});const revision=s.revision;
 s=reduce(s,{type:'edit',change:{wall:'pink'}});
 s=reduce(s,{type:'saved',room:placed,revision});
 s=reduce(s,{type:'sync',room});s=reduce(s,{type:'sync',room:placed});
 assert.equal(s.dirty,true);assert.equal(s.draft.wall,'pink');assert.deepEqual(s.draft.placements,placed.placements);
});
test('saved room survives old polling response, then accepts future remote changes',()=>{
 let s=reduce(initialRoomDraft(room),{type:'edit',change:placed});
 s=reduce(s,{type:'saved',room:placed,revision:s.revision});
 s=reduce(s,{type:'sync',room});assert.deepEqual(s.draft,placed);assert.equal(s.dirty,false);
 s=reduce(s,{type:'sync',room:structuredClone(placed)});assert.equal(s.awaiting,null);
 s=reduce(s,{type:'sync',room:{...placed,wall:'blue'}});assert.equal(s.draft.wall,'blue');
 assert.deepEqual(initialRoomDraft(room).draft,room);
});
test('continuous slider gesture records one undo step, preserves redo and separates subsequent gestures',()=>{let s=initialRoomDraft({...room,angle:0});s=reduce(s,{type:'beginGesture'});for(let i=1;i<=60;i++){s=reduce(s,{type:'beginGesture'});s=reduce(s,{type:'edit',change:{angle:i}})}s=reduce(s,{type:'endGesture'});assert.equal(s.history.length,1);s=reduce(s,{type:'undo'});assert.equal(s.draft.angle,0);s=reduce(s,{type:'redo'});assert.equal(s.draft.angle,60);s=reduce(s,{type:'beginGesture'});s=reduce(s,{type:'edit',change:{angle:90}});s=reduce(s,{type:'endGesture'});s=reduce(s,{type:'undo'});assert.equal(s.draft.angle,60)});
