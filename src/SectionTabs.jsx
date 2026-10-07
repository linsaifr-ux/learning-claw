import React from 'react';
import {confirmLeave} from './unsaved-changes.mjs';
export default function SectionTabs({label,value,items,onChange}){return <div className="section-tabs" role="group" aria-label={label}>{items.map(([id,title])=><button type="button" key={id} aria-pressed={id===value} onClick={()=>{if(id!==value&&confirmLeave())onChange(id)}}>{title}</button>)}</div>}
