import {parentPort} from 'node:worker_threads';
import R from '@dimforge/rapier3d-compat';
import {simulate} from '../functions/physics.mjs';
await R.init();
parentPort.on('message',({seed,target,poolId})=>{
 try{parentPort.postMessage({prizes:simulate(R,seed,target,poolId)})}
 catch{parentPort.postMessage({error:'遊戲驗證未完成，請重試'})}
});
