import {useDesktop} from './desktop';
// The classroom runs on the teacher's computer (desktop build). Any other build is a browser-only demo with no backend.
export const desktopMode=import.meta.env.VITE_DESKTOP==='true';
export const configured=desktopMode;
const demo={user:null,role:null,state:null,loading:false,error:''};
const useDemo=()=>demo;
export const useBackend=desktopMode?useDesktop:useDemo;
