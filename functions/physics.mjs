import hulls from './toy-hulls.mjs';
import {SOLIDS,EXIT,LIMIT,FINGER_POINTS,segment} from './machine.mjs';
export const DT=1/240,STEPS=3840,KINDS=['bear','bunny','cat'];
export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const lerp=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
// Shared seeded layout keeps the teacher server and browser replay identical.
export function toyLayout(seed){
 const rng=random(seed),kinds=Array.from({length:8},(_,i)=>KINDS[i%3]);
 for(let i=kinds.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]]}
 let spots=[];
 for(let restart=0;restart<128;restart++){
  spots=[];
  for(let attempt=0;attempt<1200&&spots.length<8;attempt++){
   const x=-1.4+rng()*2.75,z=-1.04+rng()*2.08;
   // Leave a full toy radius around the outlet and cabinet walls.
   if(x>-.16&&z>-.45)continue;
   if(spots.some(p=>Math.hypot(p.x-x,p.z-z)<.65))continue;
   spots.push({x,z});
  }
  if(spots.length===8)break;
 }
 if(spots.length!==8)throw new Error('無法建立安全的娃娃排列');
 return spots.map((p,i)=>{
  const yaw=rng()*Math.PI*2,tilt=(rng()-.5)*.24;
  return {...p,kind:kinds[i],rotation:{x:Math.cos(yaw/2)*Math.sin(tilt/2),y:Math.sin(yaw/2)*Math.cos(tilt/2),z:-Math.sin(yaw/2)*Math.sin(tilt/2),w:Math.cos(yaw/2)*Math.cos(tilt/2)}};
 });
}
export function createPhysics(R,seed,start={x:0,z:0},layoutAttempt=0){
 const target=validateTarget(start);start={x:0,z:0};
 const world=new R.World({x:0,y:-9.81,z:0});world.timestep=DT;world.numSolverIterations=24;world.numInternalPgsIterations=4;
 const solids=SOLIDS.map(([type,x,y,z,w,h,d])=>({type,collider:world.createCollider(R.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z).setFriction(.7))}));
 const sensor=world.createCollider(R.ColliderDesc.cuboid(.59,.12,.58).setTranslation(EXIT.x,-.58,EXIT.z).setSensor(true));
 const toys=[],layout=toyLayout(seed);
 for(let i=0;i<layout.length;i++){const {kind,x,z,rotation}=layout[i];const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,.65,z).setRotation(rotation).setLinearDamping(.4).setAngularDamping(.7).setCcdEnabled(true));const colliders=hulls[kind].map(v=>world.createCollider(R.ColliderDesc.convexHull(new Float32Array(v)).setDensity(.7).setFriction(1.25).setRestitution(0).setContactSkin(.003),body));toys.push({body,kind,index:i,colliders})}
 const head=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,3.3,start.z));const headCollider=world.createCollider(R.ColliderDesc.cylinder(.10,.21),head);
 const parts=[];
 for(let arm=0;arm<3;arm++){
 const a=arm*Math.PI*2/3,c=Math.cos(a),s=Math.sin(a),axis={x:-s,y:0,z:c},angle=.85;
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(start.x+.2*c,3.27,start.z+.2*s).setRotation({x:axis.x*Math.sin(angle/2),y:0,z:axis.z*Math.sin(angle/2),w:Math.cos(angle/2)}).setCcdEnabled(true).setAngularDamping(1));
 const links=[];for(let i=0;i<2;i++){const point=p=>({x:p[0]*c,y:p[1],z:p[0]*s});const g=segment(point(FINGER_POINTS[i]),point(FINGER_POINTS[i+1]));const collider=world.createCollider(R.ColliderDesc.capsule(g.len/2,.035).setTranslation(g.p.x,g.p.y,g.p.z).setRotation(g.q).setDensity(8).setFriction(1.6).setContactSkin(.002),body);links.push({...g,collider})}
 const joint=world.createImpulseJoint(R.JointData.revolute({x:.2*c,y:-.03,z:.2*s},{x:0,y:0,z:0},axis),head,body,true);joint.setContactsEnabled(false);joint.setLimits(.10,.88);joint.configureMotorModel(R.MotorModel.ForceBased);joint.configureMotorPosition(.85,5,1);parts.push({body,joint,links,arm});
 }
 const received=new Set();let last={x:start.x,z:start.z,y:3.3},stopHeight=null;
 function position(x,z,y,open){
 // A real winch stops lowering when the claw rests on the prize pile.
 if(y<last.y&&stopHeight===null){let blocked=false;for(const collider of [headCollider,...parts.flatMap(p=>p.links.map(l=>l.collider))])world.contactPairsWith(collider,o=>{if(o.parent()?.handle===head.handle||parts.some(p=>p.body.handle===o.parent()?.handle)||o.isSensor())return;world.contactPair(collider,o,m=>{for(let i=0;i<m.numContacts();i++)if(m.contactDist(i)<.003)blocked=true})});if(blocked)stopHeight=last.y}
 if(stopHeight!==null)y=Math.max(y,stopHeight);
 x=lerp(last.x,x,Math.min(1,.9*DT/Math.max(1e-9,Math.abs(x-last.x))));z=lerp(last.z,z,Math.min(1,.9*DT/Math.max(1e-9,Math.abs(z-last.z))));head.setNextKinematicTranslation({x,y,z});for(const p of parts)p.joint.configureMotorPosition(lerp(.12,.85,open),5,1);last={x,y,z}}
 for(let i=0;i<2400;i++){world.step();if(i>=479&&toys.every(t=>t.body.isSleeping()))break}
 // Reject a fill that toppled into the outlet or never settled before play.
 // Retrying with a derived seed is deterministic on both browser and server.
 if(toys.some(t=>t.body.translation().y<0||!t.body.isSleeping())){
  world.free();
  if(layoutAttempt>=15)throw new Error('娃娃尚未擺放穩定，請重新開局');
  return createPhysics(R,(seed+0x9E3779B9)|0,target,layoutAttempt+1);
 }
 function collect(){for(const t of toys)if(t.body.translation().y<-.48&&t.colliders.some(c=>world.intersectionPair(sensor,c)))received.add(t.index)}
 // Aiming is a visual translation of this settled scene. Starting a drop only
 // relocates the claw; toy poses and solver state must never be reset.
 function prepareDrop(target){validateTarget(target);const origin=head.translation(),dx=target.x-origin.x,dz=target.z-origin.z;
 for(const body of [head,...parts.map(p=>p.body)]){const p=body.translation();body.setTranslation({x:p.x+dx,y:p.y,z:p.z+dz},true)}
 head.setNextKinematicTranslation(head.translation());last={x:target.x,y:3.3,z:target.z};stopHeight=null;
 }
 prepareDrop(target);
 return{world,toys,parts,head,position,prepareDrop,received,collect,solids,sensor};
}
export function phase(step,target){const t=step*DT;let x=target.x,z=target.z,y=3.3,open=1,label='下降中';if(t<3)y=lerp(3.3,.96,t/3);else if(t<4.5){y=.96;open=lerp(1,0,(t-3)/1.5);label='合爪中'}else if(t<8){y=lerp(.96,3.3,(t-4.5)/3.5);open=0;label='提起中'}else if(t<10.5){x=lerp(target.x,EXIT.x,(t-8)/2.5);z=lerp(target.z,EXIT.z,(t-8)/2.5);open=0;label='移往出口'}else{x=EXIT.x;z=EXIT.z;open=lerp(0,1,(t-10.5));label=t<12?'放開爪子':'確認寶物通過出獎口'}return{x,z,y,open,label}}
export function validateTarget(t){if(!t||!Number.isFinite(t.x)||!Number.isFinite(t.z)||Math.abs(t.x)>LIMIT.x||Math.abs(t.z)>LIMIT.z)throw new Error('爪子位置超出範圍');return{x:t.x,z:t.z}}
export function stepPhysics(sim,step,target){const p=phase(step,target);sim.position(p.x,p.z,p.y,p.open);sim.world.step();sim.collect();return p}
export function captured(sim){return [...sim.received]}
export function simulate(R,seed,target){validateTarget(target);const sim=createPhysics(R,seed,target);try{for(let i=0;i<STEPS;i++)stepPhysics(sim,i,target);return captured(sim).map(i=>sim.toys[i].kind)}finally{sim.world.free()}}
