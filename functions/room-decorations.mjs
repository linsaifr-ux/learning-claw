import {roomSize,wallPlacement,WALLS,architecture} from './room-space.mjs';
import {FURNITURE} from './furniture.mjs';
export const DECORATIONS=[
 {id:'moon',festival:'moon',name:'月牙壁飾',surface:'wall',icon:'☾'}, {id:'star',festival:'moon',name:'金色星星',surface:'wall',icon:'★'},
 {id:'pumpkin',festival:'halloween',name:'小南瓜',surface:'floor',icon:'🎃'}, {id:'bat',festival:'halloween',name:'蝙蝠壁飾',surface:'wall',icon:'🦇'},
 {id:'tree',festival:'christmas',name:'迷你聖誕樹',surface:'floor',icon:'🎄'}, {id:'gift',festival:'christmas',name:'緞帶禮物盒',surface:'floor',icon:'🎁'},
 {id:'lantern',festival:'spring',name:'紅燈籠',surface:'wall',icon:'🏮'}, {id:'fortune',festival:'spring',name:'新春福字',surface:'wall',icon:'福'}
];
// A kit mixes focal pieces, wall decorations and small props for open-ended composition.
for(const [festival,entries] of Object.entries({
 moon:[['rabbit-lamp','玉兔小夜燈','floor','🐇'],['mooncake','雕花月餅盤','floor','🥮'],['round-lantern','團圓兔影燈','floor','◉'],['osmanthus','桂花小盆景','floor','✿'],['cloud','流雲壁飾','wall','☁'],['tea-set','賞月茶具','floor','🍵']],
 halloween:[['ghost','害羞小幽靈','floor','👻'],['witch-hat','星紋巫師帽','floor','▲'],['cauldron','魔法泡泡鍋','floor','◒'],['web','星光蜘蛛網','wall','🕸'],['potion','魔法藥水瓶','floor','⚗'],['fence','南瓜花園圍欄','floor','▥']],
 christmas:[['bells','冬日雙鈴鐺','wall','🔔'],['wreath','松枝聖誕花圈','wall','◉'],['ribbon','聖誕蝴蝶緞帶','wall','🎀'],['stocking','毛絨聖誕襪','wall','🧦'],['snowflake','六角雪花吊飾','wall','❄'],['candy-cane','拐杖糖擺件','floor','🍭']],
 spring:[['knot','吉祥中國結','wall','◇'],['ingot','福氣金元寶','floor','◆'],['blossom','迎春梅花盆景','floor','🌸'],['fan','金邊摺扇壁飾','wall','◔'],['firecracker','喜氣鞭炮串','wall','🧨'],['lion','醒獅小擺件','floor','🦁']]
}))for(const [id,name,surface,icon]of entries)DECORATIONS.push({id,festival,name,surface,icon});
export const DECOR_VARIANTS=[{id:'classic',name:'經典原色',colors:['#b65040','#3b7254','#e3b963']},{id:'frost',name:'冰霜藍銀',colors:['#739cb9','#497f83','#c3d5df']},{id:'berry',name:'莓果奶霜',colors:['#bf7e9c','#82749d','#ebccad']}];
export const DECOR_IDEAS={moon:[{title:'窗邊賞月角',text:'把月牙和流雲掛高，茶具與月餅擺在低處，留一個位置給喜歡的娃娃。'},{title:'玉兔小花園',text:'用玉兔燈、桂花盆景和星星組成小花園；改變大小，試試前低後高的層次。'}],halloween:[{title:'魔法研究桌',text:'藥水瓶搭配泡泡鍋，巫師帽放旁邊；在背牆加蜘蛛網，做自己的魔法研究室。'},{title:'友善南瓜村',text:'用圍欄分出小角落，南瓜與小幽靈住一起，試試不用左右對稱的排法。'}],christmas:[{title:'聖誕禮物角',text:'用樹作主角，禮物盒分大小擺放；後方搭花圈、鈴鐺或緞帶，留些空白更有層次。'},{title:'冰雪小屋',text:'選冰霜藍銀配色，用雪花、聖誕襪與拐杖糖做一間冬日小屋。'}],spring:[{title:'迎春小客廳',text:'福字、摺扇或中國結選一個當中心，梅花盆景與金元寶放在展示台。'},{title:'醒獅遊園',text:'讓小醒獅站前面，燈籠與鞭炮在後面，試著搭配不同高度。'}]};
export const kitFor=festival=>DECORATIONS.filter(d=>d.festival===festival).map(d=>d.id);
export function legacyDecorations(theme){
 const item=(id,kind,x,y,z)=>({id:'legacy-'+id,kind,x,y,z,rotation:0,scale:1});
 if(theme==='moon')return [item('moon','moon',1.55,2.03,-1.83),...Array.from({length:6},(_,i)=>item('star-'+i,'star',-1.7+i*.54,2.25+(i%2)*.15,-1.88))];
 if(theme==='halloween')return[item('pumpkin','pumpkin',-1.85,.54,-1.4)];
 if(theme==='christmas')return[item('tree','tree',-1.8,.13,-1.25)];
 if(theme==='spring')return[-1.8,1.8].map((x,i)=>item('lantern-'+i,'lantern',x,2.08,-1.7));
 return [];
}
export function decorationRoom(room){const base={...architecture(room||{}),...room};return room?.decorationVersion===1?base:{...base,theme:'none',decorationVersion:1,decorations:legacyDecorations(room?.theme)}}
export function migrateDecorations(s){
 for(const [id,room] of Object.entries(s.rooms||{})){if(room.decorationVersion===1)continue;const converted=decorationRoom(room),st=s.students?.find(x=>x.id===id);if(st)st.decorationKinds=[...new Set([...(st.decorationKinds||[]),...converted.decorations.map(d=>d.kind)])];s.rooms[id]=converted}
 s.decorationVersion=1;return s;
}
export function validateDecorations(items,owned=[],room={}){
 const {width,depth}=roomSize(room);
 const fail=message=>{throw new Error(message)};
 if(!Array.isArray(items)||items.length>32)fail('家具與節慶物件合計最多擺放 32 件');const ids=new Set(),counts={};
 return items.map(d=>{const def=[...DECORATIONS,...FURNITURE].find(x=>x.id===d.kind);if(!def||(!FURNITURE.some(f=>f.id===d.kind)&&!owned.includes(d.kind)))fail('請先領取老師開放的節慶物件');if(typeof d.id!=='string'||!d.id||d.id.length>80||ids.has(d.id))fail('佈置物件識別碼無效');ids.add(d.id);counts[d.kind]=(counts[d.kind]||0)+1;if(counts[d.kind]>8)fail('每種節慶物件最多擺放 8 件');if(![d.x,d.y,d.z,d.rotation,d.scale].every(Number.isFinite)||Math.abs(d.x)>width/2-.1||d.y<.05||d.y>2.65||Math.abs(d.z)>depth/2-.1||Math.abs(d.rotation)>Math.PI*20||d.scale<.6||d.scale>1.4)fail('佈置物件位置或大小超出範圍');if(d.wall!==undefined&&(!WALLS.includes(d.wall)||def.surface!=='wall'))fail('壁飾牆面無效');if(def.surface==='wall'){if(d.wall){const expected=wallPlacement(room,d.wall,['back','front'].includes(d.wall)?d.x:d.z,d.y);if(Math.abs(d.x-expected.x)>.05||Math.abs(d.z-expected.z)>.05)fail('壁飾請貼齊指定牆面')}else if(d.z> -1.6)fail('壁飾請放在後方牆面')}if(d.supportId!=null&&(typeof d.supportId!=='string'||d.supportId.length>80))fail('承載家具識別碼無效');if(d.variant!==undefined&&!DECOR_VARIANTS.some(v=>v.id===d.variant))fail('無效物件配色');return {id:d.id,kind:d.kind,...(d.wall?{wall:d.wall}:{}),...(d.supportId!==undefined?{supportId:d.supportId}:{}),...(d.variant!==undefined?{variant:d.variant}:{}),x:d.x,y:d.y,z:d.z,rotation:d.rotation,scale:d.scale}});
}
