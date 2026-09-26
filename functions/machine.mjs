// Shared visible and physical cabinet geometry. All sizes are metres, full extents.
export const LIMIT={x:1.05,z:.70};
export const CABINET_GROUND_Y=-1.08;
export const EXIT={x:.945,z:.65,minX:.32,maxX:1.57,minZ:.03,maxZ:1.27};
export const SOLIDS=[
 ['floor',- .765,-.08,0,2.17,.16,3],['floor',1.71,-.08,0,.28,.16,3],
 ['floor',.945,-.08,-.735,1.25,.16,1.53],['floor',.945,-.08,1.385,1.25,.16,.23],
 ['glass',-1.89,1.85,0,.08,3.7,3.08],['glass',1.89,1.85,0,.08,3.7,3.08],['glass',0,1.85,-1.54,3.7,3.7,.08],['glass',0,1.85,1.54,3.7,3.7,.08],
 ['roof',0,3.8,0,3.86,.2,3.16],
 // Start below the 0.16 m floor slab: overlapping inner faces cause z-fighting.
 ['chute',.28,-.54,.79,.08,.76,1.60],['chute',1.61,-.54,.79,.08,.76,1.60],['chute',.945,-.54,-.01,1.25,.76,.08],
 // The lip starts at the tray top (-0.92), without overlapping its front face.
 ['tray',.945,-.98,.92,1.41,.12,1.94],['lip',.945,-.835,1.85,1.41,.17,.08],
 ['rim',.28,.06,.65,.08,.12,1.32],['rim',1.61,.06,.65,.08,.12,1.32],['rim',.945,.06,-.01,1.25,.12,.08],['rim',.945,.06,1.31,1.25,.12,.08]
];
export const FINGER_POINTS=[[0,0,0],[.12,-.40,0],[-.18,-.68,0]];
export function segment(a,b){const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};const len=Math.hypot(d.x,d.y,d.z);let q={x:d.z/len,y:0,z:-d.x/len,w:1+d.y/len};const n=Math.hypot(q.x,q.z,q.w);q=n<1e-6?{x:1,y:0,z:0,w:0}:{x:q.x/n,y:0,z:q.z/n,w:q.w/n};return{p:{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2},q,len}}
// Stable pool IDs are saved with each game; legacy games keep their old replay.
export const PRIZE_POOLS={legacy:['bear','bunny','cat'],classic:['bear','cat'],cosmic:['bunny','polar'],patisserie:['accessory-crown','accessory-beret','accessory-star','accessory-scarf','accessory-bow']};
export function prizePool(id='legacy'){if(!Object.hasOwn(PRIZE_POOLS,id))throw new Error('無效機台獎品池');return PRIZE_POOLS[id]}
