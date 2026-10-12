import {parentPort} from 'node:worker_threads';
import R from '@dimforge/rapier3d-compat';
import {simulate,createPhysics} from '../functions/physics.mjs';
await R.init();
// Drop one collider on a floor in a few poses; a prize must come to rest like the built-in ones.
function settles(hull){for(const tilt of [0,.6,1.4]){const world=new R.World({x:0,y:-9.81,z:0});try{world.timestep=1/240;world.createCollider(R.ColliderDesc.cuboid(3,.08,3).setTranslation(0,-.08,0).setFriction(.7));
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.65,0).setRotation({x:Math.sin(tilt/2),y:0,z:0,w:Math.cos(tilt/2)}).setLinearDamping(.4).setAngularDamping(.7).setCcdEnabled(true));
 for(const v of hull){const desc=R.ColliderDesc.convexHull(new Float32Array(v));if(!desc)return false;world.createCollider(desc.setDensity(.7).setFriction(1.25).setRestitution(0).setContactSkin(.003),body)}
 let slept=false;for(let i=0;i<2400&&!slept;i++){world.step();slept=i>=479&&body.isSleeping()}if(!slept)return false}finally{world.free()}}return true}
parentPort.on('message',message=>{
 try{
  if(message.type==='settle')return parentPort.postMessage({settles:settles(message.hull)});
  // A machine is usable when several fills settle (each fill already retries internally).
  if(message.type==='fill'){for(const seed of message.seeds)createPhysics(R,seed,{x:0,z:0},0,message.machineId,message.custom).world.free();return parentPort.postMessage({fills:true})}
  const {seed,target,poolId,custom}=message;parentPort.postMessage({prizes:simulate(R,seed,target,poolId,custom||null)})
 }catch{parentPort.postMessage({error:message.type==='fill'?'這組收藏在機台中無法穩定擺放':'遊戲驗證未完成，請重試'})}
});
