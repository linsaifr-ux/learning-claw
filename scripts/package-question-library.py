"""Package distributable library snapshots, never classroom data or credentials."""
from pathlib import Path
import shutil,zipfile,json
root=Path(__file__).resolve().parents[1]
folder=root/'question-banks/web-library'
for source in (root/'desktop/library').iterdir():
 if source.is_file():shutil.copy2(source,folder/source.name)
for name in ['curriculum-bank-audit.json','curriculum-bank-2026-10-03.md','curriculum-content-v0.1.54.md']:
 shutil.copy2(root/'docs/product'/name,folder/name)
version=json.loads((root/'package.json').read_text())['version']
output=root.parent/f'題庫資料庫-v{version}.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
 for source in sorted(folder.rglob('*')):
  if source.is_file() and source.name!='.DS_Store':archive.write(source,'question-library/'+str(source.relative_to(folder)))
print(output)
