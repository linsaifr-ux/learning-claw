import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLIDS,CABINET_GROUND_Y} from '../functions/machine.mjs';
const bounds=s=>[0,1,2].map(a=>({min:s[1+a]-s[4+a]/2,max:s[1+a]+s[4+a]/2}));
test('outlet surfaces have no overlapping coplanar outward faces',()=>{
 const outlet=SOLIDS.filter(s=>['floor','chute','tray','lip','rim'].includes(s[0]));
 for(let i=0;i<outlet.length;i++)for(let j=i+1;j<outlet.length;j++){
  const a=bounds(outlet[i]),b=bounds(outlet[j]);
  for(let axis=0;axis<3;axis++)for(const side of ['min','max']){
   if(Math.abs(a[axis][side]-b[axis][side])>1e-9)continue;
   const overlap=[0,1,2].filter(n=>n!==axis).every(n=>Math.min(a[n].max,b[n].max)-Math.max(a[n].min,b[n].min)>1e-9);
   assert.equal(overlap,false,`${outlet[i][0]} / ${outlet[j][0]} overlap on ${axis}:${side}`);
  }
 }
});
test('outlet lip joins tray continuously and showroom ground clears tray underside',()=>{
 const tray=bounds(SOLIDS.find(s=>s[0]==='tray')),lip=bounds(SOLIDS.find(s=>s[0]==='lip'));
 assert.ok(Math.abs(lip[1].min-tray[1].max)<1e-9);
 assert.ok(CABINET_GROUND_Y<tray[1].min-.02);
});
