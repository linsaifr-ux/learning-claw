from pathlib import Path
import hashlib,json,tarfile,zipfile,shutil
root=Path(__file__).resolve().parents[1]
cache=root/'work/mac-runtime'
checks={line.split()[1]:line.split()[0] for line in (cache/'SHASUMS256.txt').read_text().splitlines()}
release=json.loads((cache/'cloudflare-release.json').read_text())
assert release['tag_name']=='2026.9.1'
checks.update({a['name']:a['digest'].removeprefix('sha256:') for a in release['assets'] if a['name'].startswith('cloudflared-darwin-')})
for arch,label,cfarch in [('arm64','Apple-Silicon','arm64'),('x64','Intel','amd64')]:
 out=root.parent/f'寶物教室-Mac-{label}試用版';out.mkdir(exist_ok=True)
 for folder in ['desktop','dist-desktop']:
  dest=out/folder
  if dest.exists():shutil.rmtree(dest)
  shutil.copytree(root/folder,dest)
 (out/'functions').mkdir(exist_ok=True)
 for name in ['ai-tasks.mjs','domain.mjs','views.mjs','gemini.mjs','student-credentials.mjs','physics.mjs','toy-hulls.mjs','machine.mjs']:shutil.copy2(root/'functions'/name,out/'functions'/name)
 rapier=out/'node_modules/@dimforge/rapier3d-compat'
 if rapier.exists():shutil.rmtree(rapier)
 shutil.copytree((root/'node_modules/@dimforge/rapier3d-compat').resolve(),rapier)
 runtime=out/'runtime';runtime.mkdir(exist_ok=True)
 names=[f'node-v24.21.0-darwin-{arch}.tar.gz',f'cloudflared-darwin-{cfarch}.tgz']
 for name in names:
  assert hashlib.sha256((cache/name).read_bytes()).hexdigest()==checks[name],f'Checksum mismatch: {name}'
  with tarfile.open(cache/name) as archive:
   for member in archive.getmembers():
    base=Path(member.name).name
    if member.isfile() and (member.name.endswith('/bin/node') or base in ['cloudflared','LICENSE']):
     dest=runtime/base;dest.write_bytes(archive.extractfile(member).read());dest.chmod(0o755 if base in ['node','cloudflared'] else 0o644)
 shutil.copy2(root/'work/windows-runtime/cloudflared-LICENSE',runtime/'cloudflared-LICENSE')
 (runtime/'verified.json').write_text(json.dumps({n:checks[n] for n in names},indent=2))
 (out/'package.json').write_text('{"type":"module","private":true}\n')
 common='''#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if [ "$(uname -m)" != "ARCH" ]; then
  echo "此包適用 ARCH，請下載符合這台 Mac 晶片的版本。"
  read -r -p "按 Enter 關閉…" reply
  exit 1
fi
echo "上課期間保留此視窗，請勿讓電腦休眠。"
echo "老師入口：http://127.0.0.1:${PORT:-4180}"
'''.replace('ARCH','arm64' if arch=='arm64' else 'x86_64')
 local=common+'''"./runtime/node" "desktop/start.mjs"
status=$?
if [ "$status" -ne 0 ]; then read -r -p "啟動失敗，按 Enter 關閉…" reply; fi
exit "$status"
'''
 trial=common+'''echo "Cloudflare Quick Tunnel 僅供外網測試，沒有穩定性或永久免費保證。"
echo "請閱讀 https://www.cloudflare.com/terms/ 與 https://www.cloudflare.com/privacypolicy/"
echo "這會把登入頁公開到網路，資料 API 仍需登入。"
read -r -p "同意並開始試用請輸入 YES：" reply
[ "$reply" = "YES" ] || exit 0
"./runtime/node" "desktop/trial-tunnel.mjs"
status=$?
if [ "$status" -ne 0 ]; then read -r -p "通道結束，按 Enter 關閉…" reply; fi
exit "$status"
'''
 for name,content in [('01-本機啟動.command',local),('02-外網試用.command',trial)]:
  p=out/name;p.write_text(content);p.chmod(0o755)
 shutil.copy2(root/'desktop/MAC-GUIDE.md',out/'使用說明.md')
 with zipfile.ZipFile(out.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(out.rglob('*')):
   if p.is_file():z.write(p,Path(out.name)/p.relative_to(out))
 print(f'{label} Mac archive ready')
