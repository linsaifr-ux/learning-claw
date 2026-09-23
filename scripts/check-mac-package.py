from pathlib import Path
import subprocess,tempfile,os,time,urllib.request,signal,zipfile
root=Path(__file__).resolve().parents[1]
out=root.parent/'寶物教室-Mac-Apple-Silicon試用版'
for label in ['Apple-Silicon','Intel']:
 folder=root.parent/f'寶物教室-Mac-{label}試用版'
 for name in ['01-本機啟動.command','02-外網試用.command']:subprocess.run(['bash','-n',str(folder/name)],check=True)
 with zipfile.ZipFile(folder.with_suffix('.zip')) as z:
  for name in ['01-本機啟動.command','02-外網試用.command','runtime/node','runtime/cloudflared']:
   assert (z.getinfo(folder.name+'/'+name).external_attr>>16)&0o111
print('Both archives preserve executable permissions; launchers parse')
subprocess.run([str(out/'runtime/node'),'--version'],check=True)
subprocess.run([str(out/'runtime/cloudflared'),'--version'],check=True)
with tempfile.TemporaryDirectory(prefix='treasure-mac-check-') as temp:
 for run in range(2):
  with tempfile.TemporaryFile() as log:
   proc=subprocess.Popen([str(out/'01-本機啟動.command')],env={**os.environ,'CLASSROOM_DATA_DIR':temp,'PORT':'4184'},stdout=log,stderr=log,start_new_session=True)
   try:
    for i in range(100):
     if proc.poll() is not None:raise RuntimeError('Packaged launcher stopped early')
     try:
      with urllib.request.urlopen('http://127.0.0.1:4184/',timeout=1) as response:
       assert response.status==200 and b'<html' in response.read();break
     except OSError:time.sleep(.1)
    else:raise RuntimeError('Server did not become ready')
    assert (Path(temp)/'classroom.sqlite').exists()
    assert (Path(temp)/'server.key').exists()
   finally:
    os.killpg(proc.pid,signal.SIGINT);proc.wait(timeout=10)
   assert not (Path(temp)/'server.lock').exists()
 assert len(list((Path(temp)/'backups').glob('*/classroom.sqlite')))==2
 assert len(list((Path(temp)/'backups').glob('*/server.key')))==2
print('Apple Silicon packaged launcher: HTTP, SQLite, restart, paired backups and shutdown passed')
