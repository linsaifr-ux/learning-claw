"""Download pinned official Electron runtimes; verify SHA-256 before publishing cache files."""
from pathlib import Path
import concurrent.futures,hashlib,json,urllib.request
VERSION='v44.4.5'
cache=Path(__file__).resolve().parents[1]/'work/electron-runtime';cache.mkdir(parents=True,exist_ok=True)
with urllib.request.urlopen(f'https://api.github.com/repos/electron/electron/releases/tags/{VERSION}',timeout=60) as response:release=json.load(response)
assert release['tag_name']==VERSION and not release['prerelease'] and not release['draft']
assets={asset['name']:asset for asset in release['assets']}
with urllib.request.urlopen(assets['SHASUMS256.txt']['browser_download_url'],timeout=60) as response:checks_text=response.read()
checks={line.split()[1].lstrip('*'):line.split()[0] for line in checks_text.decode().splitlines()}
def fetch(platform):
 name=f'electron-{VERSION}-{platform}.zip';dest=cache/name
 if not dest.exists() or hashlib.sha256(dest.read_bytes()).hexdigest()!=checks[name]:
  part=dest.with_suffix('.part');urllib.request.urlretrieve(assets[name]['browser_download_url'],part)
  assert hashlib.sha256(part.read_bytes()).hexdigest()==checks[name],f'Checksum mismatch: {name}'
  part.replace(dest)
 print('Verified:',name,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,['darwin-arm64','darwin-x64','win32-x64']))
(cache/'release.json').write_text(json.dumps(release));(cache/'SHASUMS256.txt').write_bytes(checks_text)
