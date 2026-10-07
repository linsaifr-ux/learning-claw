import {detectiveAction,detectiveView} from '../functions/detective.mjs';
export function createDetectivePreview(task,story,character){
 const student={id:'preview-student',classId:task.classId,name:'預覽探員'};
 return {students:[student],assignments:[{...structuredClone(task),targetStudentId:undefined,status:'published'}],submissions:[],characters:[],detectiveCases:[{...structuredClone(story),id:'preview-case',classId:task.classId,status:'published',character:structuredClone(character)}],caseProgress:{},badges:[],badgeDisplays:{}};
}
export function actDetectivePreview(state,action){
 if(!['caseAnswer','finishCase','claimBadge'].includes(action.type))throw Error('預覽不支援此操作');
 const next=structuredClone(state);detectiveAction(next,{...action,studentId:'preview-student',caseId:'preview-case'},{role:'student',studentId:'preview-student'},{now:Date.now(),id:()=>crypto.randomUUID()});return next;
}
export function viewDetectivePreview(state){return {...state,...detectiveView(state,state.students[0])}};
