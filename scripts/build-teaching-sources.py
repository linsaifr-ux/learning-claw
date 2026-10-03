"""Normalize official downloads to teaching evidence, never to pre-approved questions.
Usage: python scripts/build-teaching-sources.py /path/to/downloads
Inputs: <dataset>.json (data.gov.tw metadata), <dataset>.raw (official payload).
"""
from pathlib import Path
import csv,io,json,hashlib,sys,re,datetime
root=Path(__file__).resolve().parents[1];folder=Path(sys.argv[1]);sources=[];records=[];audit={}
def clean(v):
 s=str(v or '').strip();return '' if s.upper()=='NULL' else re.sub(r'<[^>]*>','',s)
def csvrows(b):
 for enc in ['utf-8-sig','cp950']:
  try:return list(csv.DictReader(io.StringIO(b.decode(enc))))
  except UnicodeDecodeError:pass
 raise ValueError('Unknown source encoding')
for ds in ['41559','41560','8658','6246']:
 if not (folder/(ds+'.raw')).exists():audit[ds]={'status':'download-unavailable'};continue
 meta=json.loads((folder/(ds+'.json')).read_bytes())['result'];b=(folder/(ds+'.raw')).read_bytes();sha=hashlib.sha256(b).hexdigest();url='https://data.gov.tw/dataset/'+ds
 assert meta['license']=='1'
 source=dict(id=ds,title=meta['title'],url=url,downloadUrl=meta['distribution'][0]['resourceDownloadUrl'],sha256=sha,checkedDate=datetime.date.today().isoformat(),license='政府資料開放授權條款第1版');sources.append(source)
 rows=json.loads(b) if ds=='6246' else csvrows(b);seen=set();skipped=0
 for n,r in enumerate(rows):
  kind='knowledge';grades=[];subjects=[];body='';tags=[];target=url;original=None
  if ds=='41559':
   title=clean(r['類別']);prompt=clean(r['題目']);opts=[clean(r['選項'+x]) for x in 'ABCD'];ans=clean(r['答案']).upper()
   if ans not in 'ABCD' or len(ans)!=1 or not prompt or any(not x for x in opts):skipped+=1;continue
   original=dict(type='choice',prompt=prompt,options=opts,answer=ans);kind='question';subjects=['資訊科技','科技','綜合','綜合活動'];tags=[title,'資訊素養'];body=prompt+'\n'+'\n'.join(x+'. '+v for x,v in zip('ABCD',opts))+'\n原資料答案：'+ans+'\n原資料未提供詳解；年份：'+clean(r['年度'])
  elif ds=='41560':
   stage=clean(r['學習階段']);title=clean(r['教材名稱']);target=clean(r['網址']);kind='link';subjects=['資訊科技','科技','綜合','綜合活動'];grades=list(range(3,7)) if stage=='國小' else [7,8,9] if stage=='國中' else []
   if not grades or not re.match(r'^https://(?:video\.cloud\.edu\.tw|eteacher\.edu\.tw|www\.eteacher\.edu\.tw)/',target):skipped+=1;continue
   tags=[clean(r['類別']),'資訊素養'];body='教材主題：'+tags[0]+'；來源學習階段：'+stage+'。此筆僅提供教材連結，不含全文。'
  elif ds=='8658':
   title=clean(r['物種名稱']);subjects=['自然'];tags=[clean(r.get(k)) for k in ['界中文名','門中文名','綱中文名','科中文名','俗名']];body='\n'.join(k+'：'+clean(r.get(k)) for k in ['物種名稱','物種學名','界中文名','門中文名','綱中文名','科中文名','形態特徵','生態習性','棲地類型','分布狀況','參考圖鑑'] if clean(r.get(k)))
   if not clean(r.get('形態特徵')) and not clean(r.get('生態習性')):skipped+=1;continue
  else:
   title=clean(r.get('caseName'));subjects=['社會'];tags=['古蹟','文化資產'];body='\n'.join(k+'：'+clean(r.get(k)) for k in ['caseName','pastHistory','buildingFeatures','registerReason'] if isinstance(r.get(k),str) and clean(r.get(k)))
   if len(body)<80:skipped+=1;continue
  fp=hashlib.sha256((title+'\n'+body if kind!='question' else json.dumps(original,ensure_ascii=False)).encode()).hexdigest()
  if fp in seen:skipped+=1;continue
  seen.add(fp);rec=dict(id=f'{ds}:{sha[:16]}:{n+1}',datasetId=ds,snapshot=sha,title=title,kind=kind,subjects=subjects,grades=grades,tags=[x for x in tags if x],body=body,url=target,source=meta['title'],license=source['license'],locator=f'原始資料第{n+1}筆',gradeBasis='source-stage' if grades else 'not-provided',reviewStatus='unreviewed')
  if original:rec['original']=original
  records.append(rec)
 audit[ds]={'rawRows':len(rows),'accepted':len(seen),'excludedOrDuplicate':skipped,'sha256':sha}
# PDF is catalogued but withheld from generation: older edition and diagram-dependent extraction need content review.
if (folder/'174282.raw').exists():
 audit['174282']={'status':'withheld-content-review','reason':'PDF為109年3月版本，含舊統計及圖表，未將抽取文字直接當成已核對知識。','sha256':hashlib.sha256((folder/'174282.raw').read_bytes()).hexdigest()}
(root/'desktop/library/teaching-sources.json').write_text(json.dumps(dict(version=1,sources=sources,records=records,audit=audit),ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps(audit,ensure_ascii=False,indent=2))
