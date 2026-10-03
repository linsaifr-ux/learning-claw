"""Build deterministic public metadata snapshots; inputs must be official downloaded files."""
import csv,io,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
sources=[];schools=[];resources=[]
for ds,path,url,stage in [('6087','/tmp/eduod-elementary.json','https://stats.moe.gov.tw/files/school/115/e1_new.json','primary'),('6088','/tmp/eduod-junior.json','https://stats.moe.gov.tw/files/opendata/j1_new.json','junior'),('6318','/tmp/eduod-stv.csv','https://opendata.naer.edu.tw/stvlist20251226.csv','media')]:
 b=pathlib.Path(path).read_bytes(); sha=hashlib.sha256(b).hexdigest();sources.append(dict(id=ds,url='https://data.gov.tw/dataset/'+ds,downloadUrl=url,sha256=sha,checkedDate='2026-10-03',license='政府資料開放授權條款第1版'))
 if stage!='media':
  for r in json.loads(b.decode('utf-8-sig')):
   schools.append(dict(id=ds+':'+str(r['學年度'])+':'+r['代碼'],datasetId=ds,year=int(r['學年度']),code=r['代碼'],name=r['學校名稱'],county=r['縣市名稱'].split(']')[-1],stage=stage,snapshot=sha))
 else:
  for r in csv.DictReader(io.StringIO(b.decode('utf-8-sig'))):
   u=r['影片網址'].strip()
   if not u.startswith('https://stv.naer.edu.tw/watch/'):continue
   resources.append(dict(id='6318:'+u.rsplit('/',1)[-1],title=r['標題'].strip(),description=r['描述說明'].strip(),keywords=r['關鍵字'].strip(),subjects=r['學習領域'].split(),stages=r['學習階段'].split(),content=r['學習內容'].strip(),performance=r['學習表現'].strip(),duration=r['影片長度'].strip(),license=r['授權方式'].strip(),url=u,snapshot=sha))
p=root/'desktop/library/open-data.json';p.write_text(json.dumps(dict(version=1,sources=sources,schools=schools,resources=resources),ensure_ascii=False,separators=(',',':'))+'\n')
print(len(schools),'school-year rows;',len(resources),'resources')
