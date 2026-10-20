import React from 'react';
import {mainlandTermNotes} from '../functions/taiwan-terms.mjs';
// Words that may be mainland usage but are sometimes right in Taiwan too; the teacher decides.
export default function TermNotes({text}){const notes=mainlandTermNotes(text);if(!notes.length)return null;return <p className="notice term-notes" role="note"><b>用語提醒</b>{notes.map(n=><span key={n.term}>「{n.term}」→ 建議{n.suggestion}</span>)}</p>}
