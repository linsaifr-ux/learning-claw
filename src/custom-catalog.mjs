// Built-in plus teacher-made machines and prizes for the current classroom state. App refreshes it on every
// render, so lobby cards, portraits and the 3D scene all read the same list.
import {MACHINES,TOYS} from '../functions/domain.mjs';
import {prizePool} from '../functions/machine.mjs';
import {customMachineList,customPrizeInfo,customCatalog} from '../functions/custom-machines.mjs';
let current={customMachines:[],customPrizes:[]};
export function setCustomCatalog(state){current={customMachines:state?.customMachines||[],customPrizes:state?.customPrizes||[]}}
export const allMachines=()=>[...MACHINES,...customMachineList(current,MACHINES)];
export const findMachine=id=>allMachines().find(m=>m.id===id);
export const machinePrizes=id=>current.customMachines.find(m=>m.id===id)?.prizes||prizePool(id);
export const customPrize=kind=>current.customPrizes.find(p=>p.id===kind);
export const customPrizes=()=>current.customPrizes;
export const toyInfo=kind=>TOYS.find(t=>t.id===kind)||customPrizeInfo(current,kind)||{id:kind,name:'已移除的收藏',rarity:'common',note:'',color:'#9a9282',icon:'?'};
// Physics data for a custom machine (a paid game passes its own snapshot instead).
export const machinePhysics=(id,pool)=>{const machine=current.customMachines.find(m=>m.id===id);if(!machine&&!pool)return null;try{return customCatalog(current,pool||machine.prizes)}catch{return null}};
