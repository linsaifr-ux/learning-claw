import React from 'react';
// React escapes all text; AI output never becomes executable HTML.
function inline(text){return text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g).map((part,i)=>part.startsWith('**')||part.startsWith('__')?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith('`')?<code key={i}>{part.slice(1,-1)}</code>:part.startsWith('*')?<em key={i}>{part.slice(1,-1)}</em>:part)}
export default function MarkdownText({text=''}){
 const lines=String(text).replace(/\r/g,'').split('\n'),blocks=[];let i=0;
 while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue}
 if(/^```/.test(line)){const code=[];i++;while(i<lines.length&&!/^```/.test(lines[i]))code.push(lines[i++]);i++;blocks.push(<pre key={i}><code>{code.join('\n')}</code></pre>);continue}
 if(/^\s*#{1,6}\s+/.test(line)){blocks.push(<h4 key={i}>{inline(line.replace(/^\s*#{1,6}\s+/,''))}</h4>);i++;continue}
 if(/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)){blocks.push(<hr key={i++}/>);continue}
 if(/^\s*(?:[-*+] |\d+[.)] )/.test(line)){const ordered=/^\s*\d/.test(line),items=[];while(i<lines.length&&(ordered?/^\s*\d+[.)] /:/^\s*[-*+] /).test(lines[i]))items.push(<li key={i}>{inline(lines[i++].replace(/^\s*(?:[-*+] |\d+[.)] )/,''))}</li>);blocks.push(ordered?<ol key={i}>{items}</ol>:<ul key={i}>{items}</ul>);continue}
 if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()),head=cells(line),rows=[];i+=2;while(i<lines.length&&lines[i].includes('|'))rows.push(cells(lines[i++]));blocks.push(<div className="table-wrap" key={i}><table><thead><tr>{head.map((c,k)=><th key={k}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((c,k)=><td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>);continue}
 blocks.push(/^>\s?/.test(line)?<blockquote key={i}>{inline(line.replace(/^>\s?/,''))}</blockquote>:<p key={i}>{inline(line)}</p>);i++;
 }return <div className="ai-markdown">{blocks}</div>
}
