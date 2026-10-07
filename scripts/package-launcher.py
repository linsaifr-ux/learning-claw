"""Wrap the portable server with a verified Electron desktop launcher.
Run after package-mac.py / package-windows.py. Mac archives preserve framework symlinks.
"""
from pathlib import Path
import hashlib,json,shutil,subprocess,zipfile,plistlib,sys,os
root=Path(__file__).resolve().parents[1]
cache=root/'work/electron-runtime'
release=json.loads((cache/'release.json').read_text());version=release['tag_name']
checks={line.split()[1].lstrip('*'):line.split()[0] for line in (cache/'SHASUMS256.txt').read_text().splitlines()}
app_version=json.loads((root/'package.json').read_text())['version']
def sync_launcher_version(resources):
 manifest=resources/'app/package.json'
 data=json.loads(manifest.read_text());data['version']=app_version
 manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 assert json.loads(manifest.read_text())['version']==app_version

for platform,label in [('darwin-arm64','Mac-Apple-Silicon'),('darwin-x64','Mac-Intel'),('win32-x64','Windows')]:
 if len(sys.argv)>1 and platform not in sys.argv[1:]:continue
 archive=cache/f'electron-{version}-{platform}.zip'
 assert hashlib.sha256(archive.read_bytes()).hexdigest()==checks[archive.name]
 out=root.parent/f'寶物教室-{label}試用版'
 if platform.startswith('darwin'):
  extracted=cache/platform
  if extracted.exists():shutil.rmtree(extracted)
  subprocess.run(['ditto','-x','-k',str(archive),str(extracted)],check=True)
  app=out/'學習有爪.app'
  if app.exists():shutil.rmtree(app)
  shutil.move(extracted/'Electron.app',app)
  resources=app/'Contents/Resources'
  (resources/'default_app.asar').unlink(missing_ok=True)
  target=resources/'server';target.mkdir()
  for folder in ['desktop','dist-desktop','functions','runtime','node_modules']:
   shutil.copytree(out/folder,target/folder,symlinks=True)
  shutil.copy2(out/'package.json',target/'package.json')
  shutil.copytree(root/'desktop/launcher',resources/'app')
  sync_launcher_version(resources)
  shutil.copy2(root/'desktop/launcher/icon.icns',resources/'learning-claw.icns')
  info=app/'Contents/Info.plist'
  data=plistlib.loads(info.read_bytes());data.update(CFBundleDisplayName='學習有爪',CFBundleName='學習有爪',CFBundleIdentifier='tw.learningclaw.teacher',CFBundleShortVersionString=app_version,CFBundleVersion=app_version,CFBundleIconFile='learning-claw.icns')
  info.write_bytes(plistlib.dumps(data))
  for name in ['LICENSE','LICENSES.chromium.html']:
   if (extracted/name).exists():shutil.copy2(extracted/name,resources/name)
  (resources/'electron-verified.json').write_text(json.dumps({'version':version,'archive':archive.name,'sha256':checks[archive.name]},indent=2))
  # Local ad-hoc signing repairs the modified bundle; this is NOT Developer ID signing or notarization.
  subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True,capture_output=True)
  subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
  for legacy in ['01-本機啟動.command','02-外網試用.command']:(out/legacy).unlink(missing_ok=True)
  # Only ship the self-contained app and instructions. Existing sibling server files are left
  # in the user's extracted folder for an already-running old server, not included in this ZIP.
  with zipfile.ZipFile(out.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
   for p in [out/'使用說明.md',app,*sorted(app.rglob('*'))]:
    name=str(Path(out.name)/p.relative_to(out))
    if p.is_symlink():
     info=zipfile.ZipInfo(name);info.create_system=3;info.external_attr=p.lstat().st_mode<<16
     z.writestr(info,os.readlink(p).encode('utf-8'))
    else:z.write(p,name)

 else:
  with zipfile.ZipFile(archive) as z:z.extractall(out)
  (out/'electron.exe').replace(out/'學習有爪.exe')
  resources=out/'resources';(resources/'default_app.asar').unlink(missing_ok=True)
  if (resources/'app').exists():shutil.rmtree(resources/'app')
  shutil.copytree(root/'desktop/launcher',resources/'app')
  sync_launcher_version(resources)
  (resources/'electron-verified.json').write_text(json.dumps({'version':version,'archive':archive.name,'sha256':checks[archive.name]},indent=2))
  for legacy in ['01-本機啟動.cmd','02-外網試用.cmd']:(out/legacy).unlink(missing_ok=True)
  with zipfile.ZipFile(out.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as z:
   for p in sorted(out.rglob('*')):
    if p.is_file():z.write(p,Path(out.name)/p.relative_to(out))
 print(f'{label}: graphical launcher packaged ({version})',flush=True)
