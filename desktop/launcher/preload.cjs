const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('classroom',{
 copySetup:()=>ipcRenderer.invoke('launcher:copySetup'),
 state:()=>ipcRenderer.invoke('launcher:state'),
 start:mode=>ipcRenderer.invoke('launcher:start',mode),stop:()=>ipcRenderer.invoke('launcher:stop'),
 openTeacher:()=>ipcRenderer.invoke('launcher:openTeacher'),openData:()=>ipcRenderer.invoke('launcher:openData'),openBackups:()=>ipcRenderer.invoke('launcher:openBackups'),
 terms:()=>ipcRenderer.invoke('launcher:terms'),privacy:()=>ipcRenderer.invoke('launcher:privacy'),
 onState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('launcher:state',listener);return()=>ipcRenderer.removeListener('launcher:state',listener)}
});
