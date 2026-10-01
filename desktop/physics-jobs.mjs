import {Worker} from 'node:worker_threads';
// Bounded CPU work; HTTP, lesson submission and room saves keep running.
export function createPhysicsJobs({size=2,capacity=100}={}){
 const workers=[],queue=[];let closed=false;
 const fail=()=>Object.assign(Error('遊戲驗證暫時繁忙，請稍後重試'),{status:503});
 function dispatch(){
  if(closed)return;
  while(queue.length){let slot=workers.find(w=>!w.job);
   if(!slot){if(workers.length>=size)return;const worker=new Worker(new URL('./physics-worker.mjs',import.meta.url));slot={worker,job:null};workers.push(slot);
    worker.on('message',result=>{const job=slot.job;slot.job=null;if(job){if(result.error)job.reject(fail());else job.resolve(result.prizes)}dispatch()});
    const lost=()=>{const index=workers.indexOf(slot);if(index<0)return;workers.splice(index,1);slot.job?.reject(fail());slot.job=null;dispatch()};
    worker.on('error',lost);worker.on('exit',lost);
   }
   slot.job=queue.shift();slot.worker.postMessage(slot.job.data);
  }
 }
 return {run(data){if(closed||queue.length+workers.filter(w=>w.job).length>=capacity)return Promise.reject(fail());return new Promise((resolve,reject)=>{queue.push({data,resolve,reject});dispatch()})},close(){closed=true;for(const job of queue.splice(0))job.reject(fail());for(const slot of workers.splice(0)){slot.job?.reject(fail());slot.worker.terminate()}}};
}
