export function taskDraftKey(student,task){return 'claw-draft:'+JSON.stringify([student.id,student.classId,task.id])}
export function taskRevision(task){return JSON.stringify(task.questions.map(q=>[q.type,q.prompt,q.options]))}
export function readTaskDraft(storage,student,task){try{const key=taskDraftKey(student,task),draft=JSON.parse(storage.getItem(key));if(draft?.revision===taskRevision(task)&&Date.now()-draft.at<86400000&&Array.isArray(draft.answers)&&draft.answers.length===task.questions.length&&draft.answers.every(v=>typeof v==='string'&&v.length<=3000))return draft.answers;storage.removeItem(key)}catch{}return Array(task.questions.length).fill('')}
export function saveTaskDraft(storage,student,task,answers){try{storage.setItem(taskDraftKey(student,task),JSON.stringify({revision:taskRevision(task),at:Date.now(),answers}));return true}catch{return false}}
export function removeTaskDraft(storage,student,task){try{storage.removeItem(taskDraftKey(student,task))}catch{}}
