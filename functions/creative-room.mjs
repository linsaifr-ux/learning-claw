// Student-authored plans and opt-in, teacher-reviewed class exhibitions.
const fail=m=>{throw new Error(m)};
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('創作文字未填寫或超過長度限制');return v.trim()};
export const CREATIVE_THEMES=['自由創作','海洋觀察室','冬日郵局','機器人工作室','我的小博物館','讓新同學安心的角落'];
export function validatePlan(p,toys){if(!p||typeof p!=='object')fail('無效創作計畫');if(!Array.isArray(p.wishes)||p.wishes.length>6||new Set(p.wishes).size!==p.wishes.length||p.wishes.some(k=>!toys.some(t=>t.id===k)))fail('願望清單最多選六款收藏');return {title:text(p.title,40,true),description:text(p.description,200),goal:text(p.goal,120),wishes:[...p.wishes],completed:p.completed===true}}
export function creativeAction(s,a,actor,{now,id,toys}){
 const st=s.students.find(x=>x.id===a.studentId);
 const owner=()=>{if(actor.role!=='student'||actor.studentId!==a.studentId||!st)fail('僅能操作自己的創作')};
 s.exhibits||=[];
 if(a.type==='saveCreativePlan'){owner();st.creativePlan=validatePlan(a.plan,toys);return}
 if(a.type==='submitExhibit'){
  owner();const plan=st.creativePlan;if(!plan?.title)fail('請先保存房間名稱與創作計畫');const room=s.rooms[st.id];if(!room)fail('請先保存房間佈置');
  // Capture server-owned saved data, never accept a client-provided room or image.
  const ids=new Map(room.placements.map((p,i)=>[p.itemId,'piece-'+i]));
  const snapshot={...structuredClone(room),placements:room.placements.map(p=>({...p,itemId:ids.get(p.itemId)})),outfits:(room.outfits||[]).filter(o=>ids.has(o.itemId)).map(o=>({...o,itemId:ids.get(o.itemId)}))};
  const inventory=s.inventory.filter(i=>i.studentId===st.id&&ids.has(i.id)).map(i=>({id:ids.get(i.id),kind:i.kind}));
  s.exhibits=s.exhibits.filter(e=>e.studentId!==st.id);
  s.exhibits.push({id:id(),studentId:st.id,classId:st.classId,title:plan.title,description:plan.description,room:snapshot,inventory,status:'pending',submittedAt:now});return;
 }
 if(a.type==='withdrawExhibit'){owner();s.exhibits=s.exhibits.filter(e=>e.studentId!==st.id);return}
 if(a.type==='reviewExhibit'){
  if(actor.role!=='teacher')fail('需要老師權限');const e=s.exhibits.find(e=>e.id===a.exhibitId);if(!e||!s.classes.some(c=>c.id===e.classId))fail('作品已撤回或重新投稿，請重新查看');if(!['approved','changes'].includes(a.status))fail('無效審核狀態');if(a.status==='approved'&&e.status!=='pending')fail('請先確認待審核作品');e.status=a.status;e.note=text(a.note||'',200);e.reviewedAt=now;return;
 }
 fail('不支援的創作操作');
}
export function exhibitView(s,st){return(s.exhibits||[]).filter(e=>e.classId===st.classId&&(e.status==='approved'||e.studentId===st.id)).map(e=>{const mine=e.studentId===st.id;return{id:e.id,classId:e.classId,title:e.title,description:e.description,room:e.room,inventory:e.inventory,status:e.status,submittedAt:e.submittedAt,mine,authorLabel:mine?'我的作品':'創作者 '+(s.students.find(x=>x.id===e.studentId)?.number||'同學'),...(mine?{note:e.note||''}:{})}})}
