export const DECORATIONS=[
 {id:'moon',festival:'moon',name:'月牙壁飾',surface:'wall',icon:'☾'}, {id:'star',festival:'moon',name:'金色星星',surface:'wall',icon:'★'},
 {id:'pumpkin',festival:'halloween',name:'小南瓜',surface:'floor',icon:'🎃'}, {id:'bat',festival:'halloween',name:'蝙蝠壁飾',surface:'wall',icon:'🦇'},
 {id:'tree',festival:'christmas',name:'迷你聖誕樹',surface:'floor',icon:'🎄'}, {id:'gift',festival:'christmas',name:'緞帶禮物盒',surface:'floor',icon:'🎁'},
 {id:'lantern',festival:'spring',name:'紅燈籠',surface:'wall',icon:'🏮'}, {id:'fortune',festival:'spring',name:'新春福字',surface:'wall',icon:'福'}
];
export const kitFor=festival=>DECORATIONS.filter(d=>d.festival===festival).map(d=>d.id);
export function legacyDecorations(theme){
 const item=(id,kind,x,y,z)=>({id:'legacy-'+id,kind,x,y,z,rotation:0,scale:1});
 if(theme==='moon')return [item('moon','moon',1.55,2.03,-1.83),...Array.from({length:6},(_,i)=>item('star-'+i,'star',-1.7+i*.54,2.25+(i%2)*.15,-1.88))];
 if(theme==='halloween')return[item('pumpkin','pumpkin',-1.85,.54,-1.4)];
 if(theme==='christmas')return[item('tree','tree',-1.8,.13,-1.25)];
 if(theme==='spring')return[-1.8,1.8].map((x,i)=>item('lantern-'+i,'lantern',x,2.08,-1.7));
 return [];
}
export function decorationRoom(room){return room?.decorationVersion===1?room:{...room,theme:'none',decorationVersion:1,decorations:legacyDecorations(room?.theme)}}
export function migrateDecorations(s){
 for(const [id,room] of Object.entries(s.rooms||{})){if(room.decorationVersion===1)continue;const converted=decorationRoom(room),st=s.students?.find(x=>x.id===id);if(st)st.decorationKinds=[...new Set([...(st.decorationKinds||[]),...converted.decorations.map(d=>d.kind)])];s.rooms[id]=converted}
 s.decorationVersion=1;return s;
}
export function validateDecorations(items,owned=[]){
 const fail=message=>{throw new Error(message)};
 if(!Array.isArray(items)||items.length>32)fail('節慶物件最多擺放 32 件');const ids=new Set(),counts={};
 return items.map(d=>{const def=DECORATIONS.find(x=>x.id===d.kind);if(!def||!owned.includes(d.kind))fail('請先領取老師開放的節慶物件');if(typeof d.id!=='string'||!d.id||d.id.length>80||ids.has(d.id))fail('佈置物件識別碼無效');ids.add(d.id);counts[d.kind]=(counts[d.kind]||0)+1;if(counts[d.kind]>8)fail('每種節慶物件最多擺放 8 件');if(![d.x,d.y,d.z,d.rotation,d.scale].every(Number.isFinite)||Math.abs(d.x)>2.1||d.y<.05||d.y>2.65||d.z<-1.95||d.z>1.6||Math.abs(d.rotation)>Math.PI*20||d.scale<.6||d.scale>1.4)fail('佈置物件位置或大小超出範圍');if(def.surface==='wall'&&d.z> -1.6)fail('壁飾請放在後方牆面');return {id:d.id,kind:d.kind,x:d.x,y:d.y,z:d.z,rotation:d.rotation,scale:d.scale}});
}
