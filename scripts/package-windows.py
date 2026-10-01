from pathlib import Path
import sys,subprocess
import json,zipfile,shutil
root=Path(__file__).resolve().parents[1];out=root.parent/'寶物教室-Windows試用版';out.mkdir(exist_ok=True)
for folder in ['desktop','dist-desktop']:
 dest=out/folder
 if dest.exists():shutil.rmtree(dest)
 shutil.copytree(root/folder,dest)
(out/'functions').mkdir(exist_ok=True)
for name in ['question-history.mjs', 'choice-layout.mjs','creative-room.mjs','furniture.mjs','room-decorations.mjs','question-scope.mjs','question-review.mjs','answer-units.mjs','math-verification.mjs','arithmetic.mjs','ai-tasks.mjs','domain.mjs','views.mjs','gemini.mjs','student-credentials.mjs','physics.mjs','toy-hulls.mjs','machine.mjs']:
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
shutil.copy2(root/'desktop/WINDOWS-GUIDE.md',out/'使用說明.md')
print('Windows server files ready',flush=True)
if '--server-only' not in sys.argv:
 subprocess.run([sys.executable,str(root/'scripts/package-launcher.py'),'win32-x64'],check=True)
