const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const initialRoomDraft=room=>({draft:room,dirty:false,revision:0,awaiting:null});
export function roomDraftReducer(state,action){
 switch(action.type){
  case 'edit':return {...state,draft:{...state.draft,...action.change},dirty:true,revision:state.revision+1};
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
