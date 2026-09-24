const $=id=>document.getElementById(id);let current;
const names={stopped:'尚未啟動',starting:'啟動中',running:'服務已啟動',stopping:'停止中',error:'啟動遇到問題'};
function selected(){return document.querySelector('input[name=mode]:checked').value}
function render(state){
 current=state;const busy=['starting','running','stopping'].includes(state.status);
 $('version').textContent='v'+state.version;$('status').textContent=names[state.status];$('status').className='status '+state.status;
 $('modes').disabled=busy;$('consent').disabled=busy;$('tunnel-note').hidden=selected()!=='online';
 $('start').hidden=busy;$('start').disabled=selected()==='online'&&!$('consent').checked;
 $('start').textContent=selected()==='online'?'啟動線上教室 →':'啟動本機備課 →';
 $('stop').hidden=!busy;$('stop').disabled=state.status==='stopping';$('stop').textContent=state.status==='starting'?'取消啟動':state.status==='stopping'?'正在安全停止…':'停止教室服務';
 $('open').disabled=state.status!=='running';$('local-url').textContent=state.localUrl;
 $('status-hint').textContent=state.status==='running'?(state.mode==='online'?'外網通道已連線，新網址可能需稍候才生效。到教師網頁開始上課後，學生才能加入。':'本機備課已就緒。學生目前無法從外網連線。'):state.status==='starting'?'正在準備連線與教室資料，請稍候。':state.status==='stopping'?'正在關閉服務與外網通道…':'選擇左側模式，啟動今天的教室。';
 $('error').hidden=!state.error;$('error').textContent=state.error;
 $('setup').hidden=!(state.status==='running'&&state.setupCode);$('setup-code').textContent=state.setupCode;
 $('logs').replaceChildren(...state.logs.map(item=>{const li=document.createElement('li');li.textContent=item.time+'　'+item.message;return li}));
}
async function act(action){try{await action()}catch(error){$('error').hidden=false;$('error').textContent=error.message||'操作失敗，請重試。'}}
$('start').onclick=()=>act(()=>window.classroom.start(selected()));
$('stop').onclick=()=>{if(current.status==='starting'||window.confirm('停止會中斷學生連線，確定結束教室服務嗎？'))act(()=>window.classroom.stop())};
for(const [id,method] of Object.entries({open:'openTeacher',data:'openData',backups:'openBackups',terms:'terms',privacy:'privacy'}))$(id).onclick=()=>act(()=>window.classroom[method]());
$('copy-setup').onclick=()=>act(async()=>{await window.classroom.copySetup();$('copy-setup').textContent='已複製設定碼';setTimeout(()=>$('copy-setup').textContent='複製設定碼',2000)});
$('consent').onchange=()=>render(current);document.querySelectorAll('input[name=mode]').forEach(input=>input.onchange=()=>render(current));
window.classroom.onState(render);window.classroom.state().then(render);
