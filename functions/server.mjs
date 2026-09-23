import {createServer} from 'node:http';
import {getAuth} from 'firebase-admin/auth';
import {getAppCheck} from 'firebase-admin/app-check';
import * as handlers from './index.mjs';
import {studentAccess} from './student-access.mjs';
const allowed=new Set(['classroomAction','saveTeacherKey','deleteTeacherKey','teacherKeyStatus','testTeacherKey','teacherAI']);
const origins=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
if(!origins.size)throw new Error('ALLOWED_ORIGINS must list your website origins');
const status={unauthenticated:401,'permission-denied':403,'invalid-argument':400,'not-found':404,'resource-exhausted':429,'failed-precondition':409,'already-exists':409,unavailable:503};
// Authentication and App Check are verified here before invoking reusable handlers.
createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};if(req.url==='/health'&&req.method==='GET')return send(200,{ok:true});const origin=req.headers.origin;if(!origins.has(origin))return send(403,{error:{message:'不允許的網站來源'}});res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,X-Firebase-AppCheck');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}if(req.method!=='POST')return send(405,{error:{message:'不支援的請求'}});const name=req.url.slice(1);if(!allowed.has(name)&&name!=='studentAccess')return send(404,{error:{message:'找不到此操作'}});
 try{try{await getAppCheck().verifyToken(req.headers['x-firebase-appcheck']||'')}catch{return send(403,{error:{code:'permission-denied',message:'網站驗證未完成，請重新整理或聯絡老師'}})}let auth;if(name!=='studentAccess'){try{const token=await getAuth().verifyIdToken((req.headers.authorization||'').replace(/^Bearer /,''),true);auth={uid:token.uid,token}}catch{return send(401,{error:{code:'unauthenticated',message:'請重新登入'}})}}let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>100000)return send(413,{error:{message:'內容太大'}})}let data;try{data=JSON.parse(body)}catch{return send(400,{error:{message:'請求格式無效'}})}
 const result=name==='studentAccess'?await studentAccess(data,req.socket.remoteAddress||'unknown'):await handlers[name].run({data,auth});send(200,{data:result});
 }catch(e){send(status[e.code]||500,{error:{code:status[e.code]?e.code:'internal',message:status[e.code]?e.message:'服務暫時無法完成，請稍後重試'}})}
}).listen(Number(process.env.PORT)||10000,'0.0.0.0');
