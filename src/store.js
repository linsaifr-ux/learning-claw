import {applyAction,seedState,uid,migrateCollection} from '../functions/domain.mjs';
const KEY='treasure-classroom-demo-v1';
export function readDemo(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===1&&Array.isArray(s.students))return migrateCollection(s)}catch{}return seedState()}
export function demoAction(state,action,actor){const next=applyAction(state,{requestId:uid(),...action},actor);localStorage.setItem(KEY,JSON.stringify(next));return next}
export function resetDemo(){const s=seedState();localStorage.setItem(KEY,JSON.stringify(s));return s}
