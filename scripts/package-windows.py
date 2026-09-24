from pathlib import Path
import json,zipfile,shutil
root=Path.cwd();out=root.parent/'寶物教室-Windows試用版';out.mkdir(exist_ok=True)
for folder in ['desktop','dist-desktop']:
 dest=out/folder
 if dest.exists():shutil.rmtree(dest)
 shutil.copytree(root/folder,dest)
(out/'functions').mkdir(exist_ok=True)
for name in ['math-verification.mjs','arithmetic.mjs','ai-tasks.mjs','domain.mjs','views.mjs','gemini.mjs','student-credentials.mjs','physics.mjs','toy-hulls.mjs','machine.mjs']:
 shutil.copy2(root/'functions'/name,out/'functions'/name)
rapier=out/'node_modules/@dimforge/rapier3d-compat'
if rapier.exists():shutil.rmtree(rapier)
shutil.copytree((root/'node_modules/@dimforge/rapier3d-compat').resolve(),rapier)
runtime=out/'runtime';runtime.mkdir(exist_ok=True);meta=json.loads((root/'work/windows-runtime/verified.json').read_text())
with zipfile.ZipFile(root/'work/windows-runtime'/meta['file']) as archive:
 for member in archive.namelist():
  if member.endswith('/node.exe') or member.endswith('/LICENSE'):
   (runtime/Path(member).name).write_bytes(archive.read(member))
for name in ['cloudflared.exe','cloudflared-LICENSE','verified.json','cloudflared-verified.json']:shutil.copy2(root/'work/windows-runtime'/name,runtime/name)
(out/'package.json').write_text('{"type":"module","private":true}\n')
local='''@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 開啟瀏覽器：http://127.0.0.1:4180
echo 保留此視窗，上課期間不要讓電腦休眠。
"runtime\\node.exe" "desktop\\start.mjs"
pause
'''
trial='''@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 此為 Cloudflare Quick Tunnel 外網測試，不保證穩定或永久免費。
echo 請先閱讀「使用說明.md」與下列條款：
echo https://www.cloudflare.com/terms/
echo https://www.cloudflare.com/privacypolicy/
echo 這會把寶物教室登入頁公開到網路，資料 API 仍需登入。
set /p "TC_ACCEPT=同意並開始試用，請輸入 YES："
if /I not "%TC_ACCEPT%"=="YES" exit /b
"runtime\\node.exe" "desktop\\trial-tunnel.mjs"
pause
'''
(out/'01-本機啟動.cmd').write_bytes(local.replace('\n','\r\n').encode('utf-8'))
(out/'02-外網試用.cmd').write_bytes(trial.replace('\n','\r\n').encode('utf-8'))
shutil.copy2(root/'desktop/WINDOWS-GUIDE.md',out/'使用說明.md')
with zipfile.ZipFile(root.parent/'寶物教室-Windows試用版.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in out.rglob('*'):
  if p.is_file():z.write(p,Path(out.name)/p.relative_to(out))
print('Windows portable archive ready')
