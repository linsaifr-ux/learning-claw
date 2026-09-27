import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {applyPolarPalette,POLAR_PALETTE} from '../src/toy-palette.mjs';
test('actual GLB paired limbs, patches and stitching use the complete polar palette without changing the bear',async()=>{
 const b=readFileSync(new URL('../public/models/bear.glb',import.meta.url));const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const before=[];scene.traverse(o=>{if(o.isMesh)before.push([o.name,o.material.color.getHexString()])});
 assert(before.some(([name])=>name==='arm_1'));
 const polar=applyPolarPalette(scene.clone(true));const after=[];polar.traverse(o=>{if(o.isMesh)after.push([o.name,o.material.color.getHexString()])});
 assert.deepEqual(after,before.map(([name,color])=>[name,POLAR_PALETTE[color]?.slice(1)||color]));
 const unchanged=[];scene.traverse(o=>{if(o.isMesh)unchanged.push([o.name,o.material.color.getHexString()])});assert.deepEqual(unchanged,before);
 for(const name of ['arm','arm_1','foot','foot_1','ear','ear_1'])assert.equal(polar.getObjectByName(name).material.color.getHexString(),'d6e5ee');
 assert.equal(polar.getObjectByName('belly_patch').material.color.getHexString(),'f0f4f5');assert.equal(polar.getObjectByName('eye').material.color.getHexString(),'293744');
});
