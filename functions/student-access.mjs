import {randomUUID,createHash} from 'node:crypto';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {HttpsError} from 'firebase-functions/v2/https';
import {studentInput,credentialId,birthdayHash,birthdayMatches} from './student-credentials.mjs';
import {applyAction} from './domain.mjs';
import {studentView} from './views.mjs';
export async function rateLimit(key,max,windowMs){const db=getFirestore(),ref=db.doc('loginLimits/'+createHash('sha256').update(key).digest('hex'));await db.runTransaction(async tx=>{const snap=await tx.get(ref),old=snap.data(),now=Date.now(),count=old&&now-old.at<windowMs?old.count:0;if(count>=max)throw new HttpsError('resource-exhausted','嘗試次數過多，請 15 分鐘後再試或聯絡老師');tx.set(ref,{at:count?old.at:now,count:count+1})})}
export async function studentAccess(data,ip){let input;try{input=studentInput(data)}catch(e){throw new HttpsError('invalid-argument',e.message)}const pepper=process.env.STUDENT_LOGIN_PEPPER;if(!pepper||pepper.length<32)throw new HttpsError('failed-precondition','學生登入尚未完成設定');const{code,name,birthday}=input,db=getFirestore(),id=credentialId(code,name,pepper),ref=db.doc('studentCredentials/'+id);
 await rateLimit('ip:'+ip,60,15*60*1000);await rateLimit('identity:'+id,5,15*60*1000);
 let uid;
 if(data.register===true){const password=await birthdayHash(birthday,pepper);uid=randomUUID();await db.runTransaction(async tx=>{const invite=await tx.get(db.doc('classCodes/'+code)),existing=await tx.get(ref);if(!invite.exists||invite.data().registrationOpen!==true)throw new HttpsError('failed-precondition','老師尚未開放註冊，請確認班級連結');if(existing.exists)throw new HttpsError('already-exists','此姓名已註冊，請直接登入；同名請向老師取得辨識名稱');const{teacherUid,classId}=invite.data(),workspace=await tx.get(db.doc('workspaces/'+teacherUid)),state=workspace.data()?.state;if(!state||state.students.length>=100)throw new HttpsError('resource-exhausted','班級暫時無法加入');const next=applyAction(state,{type:'addStudent',studentId:uid,name,classId,requestId:randomUUID()},{role:'teacher'});next.students.find(s=>s.id===uid).authenticated=true;if(Buffer.byteLength(JSON.stringify(next))>700000)throw new HttpsError('resource-exhausted','教室紀錄容量已滿');tx.create(ref,{uid,teacherUid,classId,...password});tx.create(db.doc('members/'+uid),{teacherUid,classId});tx.set(db.doc('workspaces/'+teacherUid),{state:next});tx.set(db.doc('studentViews/'+uid),{state:studentView(next,uid)})}
 else{const snap=await ref.get();if(!snap.exists){await birthdayHash(birthday,pepper,'00000000000000000000000000000000');throw new HttpsError('unauthenticated','姓名、生日月日或班級連結不正確')}if(!await birthdayMatches(birthday,pepper,snap.data()))throw new HttpsError('unauthenticated','姓名、生日月日或班級連結不正確');uid=snap.data().uid}
 return{token:await getAuth().createCustomToken(uid,{student:true})};
}
