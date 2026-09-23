import {createHmac,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export function studentInput(input){const code=String(input?.code||'').trim().toUpperCase(),name=String(input?.name||'').normalize('NFKC').trim().replace(/\s+/g,' '),birthday=String(input?.birthday||'');const month=Number(birthday.slice(0,2)),day=Number(birthday.slice(2));if(!/^[A-F0-9]{16}$/.test(code)||!name||name.length>20||!/^\d{4}$/.test(birthday)||month<1||month>12||day<1||day>[31,29,31,30,31,30,31,31,30,31,30,31][month-1])throw new Error('請使用老師的班級連結，填寫姓名及有效的四位生日月日');return{code,name,birthday}}
export function credentialId(code,name,pepper){return createHmac('sha256',pepper).update(JSON.stringify([code,name])).digest('hex')}
export async function birthdayHash(birthday,pepper,salt=randomBytes(16).toString('hex')){const input=createHmac('sha256',pepper).update(birthday).digest('hex');return{salt,hash:(await scrypt(input,salt,32)).toString('hex')}}
export async function birthdayMatches(birthday,pepper,stored){const result=await birthdayHash(birthday,pepper,stored.salt);const actual=Buffer.from(result.hash,'hex'),expected=Buffer.from(stored.hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)}
