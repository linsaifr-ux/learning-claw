import test from 'node:test';import assert from 'node:assert/strict';
import {applyAction,seedState,uid} from '../functions/domain.mjs';
const teacher={role:'teacher'},student={role:'student',studentId:'s1'};
const run=(s,a,actor=teacher)=>applyAction(s,{requestId:uid(),...a},actor);
test('batch grant, deduplication and undo retain ledger history',()=>{let s=seedState();const requestId=uid();s=run(s,{type:'grant',ids:['s1','s2','s1'],amount:3,reason:'積極參與',requestId});assert.equal(s.students[0].balance,21);assert.equal(s.students[1].balance,28);assert.equal(s.ledger.length,2);const same=run(s,{type:'grant',ids:['s1'],amount:3,reason:'積極參與',requestId});assert.deepEqual(same,s);s=run(s,{type:'undo',batch:requestId});assert.equal(s.students[0].balance,18);assert.equal(s.ledger.length,4);assert.throws(()=>run(s,{type:'undo',batch:requestId}),/撤銷/)});
test('failed batch is atomic and does not change original balances',()=>{const s=seedState();assert.throws(()=>run(s,{type:'grant',ids:['s1','s2'],amount:-20,reason:'修正'}),/不足/);assert.equal(s.students[0].balance,18);assert.equal(s.students[1].balance,25);assert.equal(s.ledger.length,0)});
test('student cannot issue tokens, edit another room, or forge prizes',()=>{const s=seedState();assert.throws(()=>run(s,{type:'grant',ids:['s1'],amount:99,reason:'test'},student),/老師/);assert.throws(()=>run(s,{type:'saveRoom',studentId:'s2',room:{}},student),/自己/);assert.throws(()=>run(s,{type:'finishGame',studentId:'s1'},student),/驗證/)});
test('room only accepts owned items once and validates coordinates',()=>{const s=seedState();const room={wall:'blue',theme:'moon',placements:[{itemId:'starter1',x:0,z:0,rotation:0}]};const next=run(s,{type:'saveRoom',studentId:'s1',room},student);assert.equal(next.rooms.s1.wall,'blue');assert.equal(next.inventory.length,3);assert.throws(()=>run(s,{type:'saveRoom',studentId:'s1',room:{...room,placements:[...room.placements,...room.placements]}},student),/自己/);assert.throws(()=>run(s,{type:'saveRoom',studentId:'s1',room:{...room,placements:[{...room.placements[0],x:99}]}},student),/超出/)});
test('game admission and result settlement are exactly once',()=>{let s=seedState();s=run(s,{type:'startGame',studentId:'s1',seed:123,sessionId:'game1'},student);assert.equal(s.students[0].balance,15);assert.throws(()=>run(s,{type:'startGame',studentId:'s1',seed:1},student),/目前/);s=run(s,{type:'finishGame',sessionId:'game1',studentId:'s1',prizes:['bear']},{...student,verifiedGame:true});assert.equal(s.inventory.length,4);assert.throws(()=>run(s,{type:'finishGame',sessionId:'game1',studentId:'s1',prizes:['bear']},{...student,verifiedGame:true}),/已結算/)});
test('submission and teacher-reviewed reward cannot be duplicated',()=>{let s=seedState();s=run(s,{type:'saveAssignment',classId:'c1',assignment:{id:'q1',title:'觀察自然',grade:'國小三年級',subject:'自然科學',unit:'植物',reward:5,status:'published',questions:[{type:'short',prompt:'葉片有什麼作用？',answer:'行光合作用',explanation:''}]}});s=run(s,{type:'submit',studentId:'s1',assignmentId:'q1',answers:['吸收陽光']},student);assert.throws(()=>run(s,{type:'submit',studentId:'s1',assignmentId:'q1',answers:['a']},student),/繳交/);const id=s.submissions[0].id;s=run(s,{type:'review',submissionId:id,score:80,feedback:'觀察得很好'});assert.equal(s.students[0].balance,23);assert.throws(()=>run(s,{type:'review',submissionId:id,score:80,feedback:'再次發放'}),/已批閱/)});

test('only teachers can open and close student registration',()=>{const s=seedState();const a={type:'registration',classId:'c1',open:true,requestId:'open-registration'};assert.throws(()=>applyAction(s,a,{role:'student',studentId:'s1'}));const opened=applyAction(s,a,{role:'teacher'});assert.equal(opened.classes[0].registrationOpen,true);const closed=applyAction(opened,{...a,open:false,requestId:'close-registration'},{role:'teacher'});assert.equal(closed.classes[0].registrationOpen,false)});

test('task rewards default to one per question; custom review award is atomic and recorded',()=>{
 let s=seedState();const questions=Array.from({length:5},()=>({type:'short',prompt:'說明',answer:'例子'}));
 s=run(s,{type:'saveAssignment',classId:'c1',assignment:{id:'rewards',title:'練習',grade:'國小三年級',subject:'國語／國文',unit:'說明',status:'published',questions}});
 assert.equal(s.assignments[0].reward,5);assert.equal(s.assignments[0].rewardMode,'perQuestion');
 s=run(s,{type:'submit',studentId:'s1',assignmentId:'rewards',answers:questions.map(()=>'例子')},student);const submissionId=s.submissions[0].id,balance=s.students[0].balance;
 for(const reward of [-1,101,1.5,'5'])assert.throws(()=>run(s,{type:'review',submissionId,score:80,feedback:'完成',reward}));
 assert.throws(()=>run(s,{type:'review',submissionId,score:80,feedback:'完成',reward:99},student),/老師/);
 const reviewed=run(s,{type:'review',submissionId,score:80,feedback:'完成',reward:8});assert.equal(reviewed.students[0].balance,balance+8);assert.equal(reviewed.submissions[0].reward,8);assert.equal(reviewed.ledger[0].amount,8);
 assert.throws(()=>run(reviewed,{type:'review',submissionId,score:80,feedback:'再次',reward:20}),/已批閱/);
 const zero=run(s,{type:'review',submissionId,score:80,feedback:'完成',reward:0});assert.equal(zero.students[0].balance,balance);assert.equal(zero.submissions[0].reward,0);assert.equal(zero.ledger.length,s.ledger.length);
});
test('per-question mode follows question count and custom task reward is preserved',()=>{
 for(const [rewardMode,reward,expected] of [['perQuestion',3,7],['custom',9,9]]){const s=run(seedState(),{type:'saveAssignment',classId:'c1',assignment:{id:'q',title:'練習',grade:'國小三年級',subject:'數學',unit:'分數',rewardMode,reward,questions:Array.from({length:7},()=>({type:'short',prompt:'分數',answer:'等分'}))}});assert.equal(s.assignments[0].reward,expected)}
});

test('review validates and saves all question feedback without exposing AI drafts',()=>{
 let s=seedState();s=run(s,{type:'saveAssignment',classId:'c1',assignment:{id:'feedback',title:'練習',grade:'國小三年級',subject:'數學',unit:'分數',status:'published',questions:[{type:'choice',prompt:'選擇',options:['1','2','3','4'],answer:'B',explanation:'說明'},{type:'short',prompt:'解釋',answer:'等分'}]}});
 assert.throws(()=>run(s,{type:'submit',studentId:'s1',assignmentId:'feedback',answers:['Z','等分']},student));s=run(s,{type:'submit',studentId:'s1',assignmentId:'feedback',answers:['B','等分']},student);const submissionId=s.submissions[0].id;
 for(const itemFeedback of [['只有一題'],['','回饋'],['回饋',123]])assert.throws(()=>run(s,{type:'review',submissionId,score:90,reward:2,feedback:'完成',itemFeedback}));
 const next=run(s,{type:'review',submissionId,score:90,reward:2,feedback:'完成',itemFeedback:['答對了','補充例子']});assert.deepEqual(next.submissions[0].itemFeedback,['答對了','補充例子']);assert.equal(next.submissions[0].reward,2);
});

test('publishing analysis and updating reviewed feedback never awards tokens again',()=>{
 let s=seedState();s.assignments=[{id:'a',title:'練習',questions:[{type:'short'}],reward:5}];s.submissions=[{id:'sub',studentId:'s1',assignmentId:'a',status:'reviewed',answers:['例子'],reward:5,score:80,feedback:'原回饋',itemFeedback:['原逐題回饋']}];const balance=s.students[0].balance,ledger=structuredClone(s.ledger);
 assert.throws(()=>run(s,{type:'publishAnalysis',submissionId:'sub',analysis:'不允許'},student),/老師/);
 s=run(s,{type:'publishAnalysis',submissionId:'sub',analysis:'新版分析'});assert.equal(s.submissions[0].publishedAnalysis,'新版分析');
 s=run(s,{type:'publishAnalysis',submissionId:'sub',analysis:'再次分析'});assert.equal(s.submissions[0].publishedAnalysis,'再次分析');assert.equal(s.teacherAIResults.sub.analysis.value,'再次分析');
 assert.throws(()=>run(s,{type:'updateReview',submissionId:'sub',feedback:'學生修改',score:100,itemFeedback:['修改']},student),/老師/);
 s=run(s,{type:'updateReview',submissionId:'sub',feedback:'新回饋',score:90,itemFeedback:['新逐題回饋'],reward:99});assert.equal(s.submissions[0].score,90);assert.equal(s.submissions[0].reward,5);assert.equal(s.students[0].balance,balance);assert.deepEqual(s.ledger,ledger);
 assert.throws(()=>run(s,{type:'updateReview',submissionId:'sub',feedback:'錯誤',score:90,itemFeedback:[]}));
});
