const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const initialRoomDraft=room=>({draft:room,dirty:false,revision:0,awaiting:null,history:[]});
export function roomDraftReducer(state,action){
 switch(action.type){
  case 'undo':return state.history?.length?{...state,draft:state.history.at(-1),history:state.history.slice(0,-1),dirty:true,revision:state.revision+1}:state;
  case 'edit':return {...state,history:[...(state.history||[]),state.draft].slice(-20),draft:{...state.draft,...action.change},dirty:true,revision:state.revision+1};
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
