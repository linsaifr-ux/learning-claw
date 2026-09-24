"""Verify GUI archive structure and launch the packaged Apple Silicon smoke test."""
from pathlib import Path
import stat,subprocess,zipfile,tempfile,os
root=Path(__file__).resolve().parents[1]
for label in ['Apple-Silicon','Intel']:
 folder=root.parent/f'寶物教室-Mac-{label}試用版'
 with zipfile.ZipFile(folder.with_suffix('.zip')) as z:
  base=folder.name+'/學習有爪.app/Contents/'
  for name in ['MacOS/Electron','Resources/server/runtime/node','Resources/server/runtime/cloudflared']:
   assert (z.getinfo(base+name).external_attr>>16)&0o111
  assert any(stat.S_ISLNK(info.external_attr>>16) for info in z.infolist()),'Framework symlinks must survive packaging'
  assert base+'Resources/app/main.cjs' in z.namelist()
  assert not any(name.endswith('.command') for name in z.namelist())
 subprocess.run(['codesign','--verify','--deep','--strict',str(folder/'學習有爪.app')],check=True)
print('Both Mac GUI archives preserve executables and framework symlinks; local ad-hoc signatures verify',flush=True)
node=root.parent/'寶物教室-Mac-Apple-Silicon試用版/學習有爪.app/Contents/Resources/server/runtime/node'
for label in ['Apple-Silicon','Intel']:
 folder=root.parent/f'寶物教室-Mac-{label}試用版'
 with tempfile.TemporaryDirectory(prefix='claw-zip-check-') as temp:
  subprocess.run(['ditto','-x','-k',str(folder.with_suffix('.zip')),temp],check=True)
  app=Path(temp)/folder.name/'學習有爪.app'
  subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
  if label=='Apple-Silicon':
   subprocess.run([str(node),str(root/'scripts/check-launcher.mjs')],cwd=root,env={**os.environ,'CLASSROOM_LAUNCHER_APP':str(app/'Contents/MacOS/Electron')},check=True)
print('Both archived apps retain valid structure/signature after extraction; GUI tested from freshly extracted archive',flush=True)
