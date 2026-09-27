// Recolor cloned model materials, including GLTFLoader-renamed paired parts.
// Never mutate the shared caramel bear asset used by other scenes.
export const POLAR_PALETTE={b98452:'#d6e5ee',f4e4c7:'#f0f4f5','905644':'#789cc0','38281e':'#293744',db9790:'#d6b5c1',fffdef:'#ffffff'};
export function applyPolarPalette(root){
 const copies=new Map();
 const recolor=source=>{const color=POLAR_PALETTE[source.color?.getHexString()];if(!color)return source;if(!copies.has(source)){const copy=source.clone();copy.color.set(color);copies.set(source,copy)}return copies.get(source)};
 root.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material)});
 return root;
}
