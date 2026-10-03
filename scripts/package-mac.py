from pathlib import Path
import sys,subprocess
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
 for name in ['open-data.mjs','question-history.mjs', 'choice-layout.mjs','creative-room.mjs','furniture.mjs','room-decorations.mjs', 'room-space.mjs','question-scope.mjs','question-review.mjs','answer-units.mjs','math-verification.mjs','arithmetic.mjs','ai-tasks.mjs','domain.mjs','views.mjs','gemini.mjs','student-credentials.mjs','physics.mjs','toy-hulls.mjs','machine.mjs']:shutil.copy2(root/'functions'/name,out/'functions'/name)
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
 shutil.copy2(root/'desktop/MAC-GUIDE.md',out/'使用說明.md')
 print(f'{label} Mac server files ready',flush=True)
if '--server-only' not in sys.argv:
 subprocess.run([sys.executable,str(root/'scripts/package-launcher.py'),'darwin-arm64','darwin-x64'],check=True)
