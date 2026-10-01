const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export const initialRoomDraft=room=>({draft:room,dirty:false,revision:0,awaiting:null,history:[],future:[]});
export function roomDraftReducer(state,action){
 switch(action.type){
  case 'beginGesture':return state.gesture?state:{...state,gesture:true,gestureRecorded:false};
  case 'endGesture':return {...state,gesture:false,gestureRecorded:false};
  case 'redo':return state.future?.length?{...state,draft:state.future[0],future:state.future.slice(1),history:[...state.history,state.draft].slice(-20),dirty:true,revision:state.revision+1}:state;
  case 'undo':return state.history?.length?{...state,future:[state.draft,...(state.future||[])],draft:state.history.at(-1),history:state.history.slice(0,-1),dirty:true,revision:state.revision+1}:state;
  case 'edit':return {...state,gestureRecorded:!!state.gesture,future:[],history:state.gesture&&state.gestureRecorded?state.history:[...(state.history||[]),state.draft].slice(-20),draft:{...state.draft,...action.change},dirty:true,revision:state.revision+1};
  case 'saved':return {...state,dirty:state.revision!==action.revision,awaiting:action.room};
  case 'sync':
   // Ignore polling snapshots while editing or awaiting the saved snapshot.
   if(state.awaiting&&!same(action.room,state.awaiting))return state;
   if(state.dirty)return {...state,awaiting:null};
   if(same(state.draft,action.room)&&!state.awaiting)return state;
   return {...state,draft:action.room,awaiting:null};
  default:return state;
 }
}
