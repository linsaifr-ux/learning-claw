import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const [projectId,uid]=process.argv.slice(2);if(!projectId||!uid)throw new Error('Usage: node grant-teacher.mjs PROJECT_ID FIREBASE_AUTH_UID');
initializeApp({credential:applicationDefault(),projectId});const user=await getAuth().getUser(uid);await getAuth().setCustomUserClaims(uid,{...user.customClaims,teacher:true});console.log('Teacher role granted. Sign out and sign in again.');
