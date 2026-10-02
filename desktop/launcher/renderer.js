const $=id=>document.getElementById(id);let current;
const names={stopped:'尚未啟動',starting:'啟動中',running:'服務已啟動',stopping:'停止中',error:'啟動遇到問題'};
function selected(){return document.querySelector('input[name=mode]:checked').value}
function render(state){
 current=state;$('backup-last').textContent=state.backupInfo?'上次加密匯出：'+new Date(state.backupInfo.at).toLocaleString('zh-TW')+' · '+Math.ceil(state.backupInfo.bytes/1024)+' KB':'尚無加密匯出紀錄';const busy=['starting','running','stopping'].includes(state.status);
 $('version').textContent='v'+state.version;$('status').textContent=names[state.status];$('status').className='status '+state.status;
 $('modes').disabled=busy;$('consent').disabled=busy;$('tunnel-note').hidden=selected()!=='online';
 $('start').hidden=busy;$('start').disabled=maintenanceRunning||(selected()==='online'&&!$('consent').checked);
 $('start').textContent=selected()==='online'?'啟動線上教室 →':'啟動本機備課 →';
 $('stop').hidden=!busy;$('stop').disabled=state.status==='stopping';$('stop').textContent=state.status==='starting'?'取消啟動':state.status==='stopping'?'正在安全停止…':'停止教室服務';
 $('open').disabled=state.status!=='running';$('local-url').textContent=state.localUrl;
 $('status-hint').textContent=state.status==='running'?(state.connection==='degraded'?'外網檢查未通過，本機服務仍執行中。請確認網路，通道恢復後會自動更新狀態。':state.connection==='reconnecting'?'外網中斷，正在自動重建。本機教室保留；重建後請重新分享學生入口。':state.mode==='online'?'外網通道已連線，新網址可能需稍候才生效。到教師網頁開始上課後，學生才能加入。':'本機備課已就緒。學生目前無法從外網連線。'):state.status==='starting'?'正在準備連線與教室資料，請稍候。':state.status==='stopping'?'正在關閉服務與外網通道…':'選擇左側模式，啟動今天的教室。';
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

let maintenanceRunning=false,restorePreview=null;
function maintenanceFields(){const operation=$('maintenance-operation').value;$('current-password-field').hidden=operation==='resetPassword';$('recovery-fields').hidden=operation!=='resetPassword';$('backup-password-field').hidden=!['exportBackup','previewRestore'].includes(operation);$('maintenance-repeat-field').hidden=!['exportBackup','resetPassword'].includes(operation);restorePreview=null;$('maintenance-restore').hidden=true;for(const id of ['maintenance-password','maintenance-code','maintenance-new-password','maintenance-backup-password','maintenance-repeat'])$(id).value='';$('recovery-result-code').textContent='';$('recovery-result').hidden=true;$('maintenance-message').textContent=''}
$('maintenance-operation').onchange=maintenanceFields;
async function manage(operation){if(maintenanceRunning)return;const data={operation,password:$('maintenance-password').value,code:$('maintenance-code').value,newPassword:$('maintenance-new-password').value,backupPassword:$('maintenance-backup-password').value,revision:restorePreview?.revision,confirmed:operation==='restoreBackup'};if(['resetPassword','exportBackup'].includes(operation)&&(operation==='resetPassword'?data.newPassword:data.backupPassword)!==$('maintenance-repeat').value){$('maintenance-message').textContent='兩次輸入的密碼不一致';return}maintenanceRunning=true;for(const input of document.querySelectorAll('#maintenance-panel input'))input.disabled=true;$('start').disabled=true;$('maintenance-run').disabled=true;$('maintenance-restore').disabled=true;$('maintenance-operation').disabled=true;$('maintenance-message').textContent='正在處理，請勿關閉程式…';try{const result=await window.classroom.maintenance(data);if(result.cancelled){$('maintenance-message').textContent='已取消';return}$('maintenance-message').textContent=result.message||'';if(operation==='previewRestore'){restorePreview=result;$('maintenance-restore').hidden=false;$('maintenance-message').textContent=`備份日期：${new Date(result.createdAt).toLocaleString('zh-TW')}\n${result.classes} 個班級、${result.students} 位學生\n${result.message}`}else{restorePreview=null;$('maintenance-restore').hidden=true;for(const id of ['maintenance-password','maintenance-code','maintenance-new-password','maintenance-backup-password','maintenance-repeat'])$(id).value=''}await window.classroom.state().then(render);if(result.recoveryCode){$('recovery-result-code').textContent=result.recoveryCode;$('recovery-result').hidden=false}}catch(error){$('maintenance-message').textContent=error.message||'操作未完成'}finally{maintenanceRunning=false;for(const input of document.querySelectorAll('#maintenance-panel input'))input.disabled=false;render(current);$('maintenance-run').disabled=false;$('maintenance-restore').disabled=false;$('maintenance-operation').disabled=false}}
$('maintenance-run').onclick=()=>manage($('maintenance-operation').value);$('maintenance-restore').onclick=()=>manage('restoreBackup');$('recovery-dismiss').onclick=()=>{$('recovery-result-code').textContent='';$('recovery-result').hidden=true};maintenanceFields();

$('maintenance-panel').addEventListener('toggle',()=>{if(!$('maintenance-panel').open&&!maintenanceRunning)maintenanceFields()});
