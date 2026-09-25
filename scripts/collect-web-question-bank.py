"""Collect public source metadata and pinned, explicitly licensed junior-level data.
No login, OCR, paid services, teacher approval or live classroom DB writes.
"""
from pathlib import Path
import concurrent.futures,csv,hashlib,html,io,json,re,time,urllib.request
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'work/web-bank';OUT=ROOT/'question-banks/web-library'
CACHE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
DATE='2026-09-26';REV='639a64db464b4661feb91817b9edfe43932bdf18'
def dump(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def fetch(url):
 name=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.cache')
 if name.exists():return name.read_bytes()
 req=urllib.request.Request(url,headers={'User-Agent':'LearningClaw-QuestionLibrary/1.0 (public educational resource indexing)'})
 with urllib.request.urlopen(req,timeout=25) as response:data=response.read(8_000_000)
 name.write_bytes(data);return data

def plain(s):return html.unescape(re.sub('<[^>]*>',' ',s)).strip()
def compact(s):return re.sub(r'\s+',' ',plain(s)).strip()
index=fetch('https://market.cloud.edu.tw/list/exampaper.jsp').decode()
categories=[]
for url,label in re.findall(r'href="([^"]*exampaper_detail[^\"]*)"[^>]*>([^<]+)',index):
 grade=int(re.search(r'grade=(\d+)',url)[1])
 if 3<=grade<=9:categories.append({'grade':grade,'label':compact(label),'url':'https://market.cloud.edu.tw/list/'+html.unescape(url)})
def category(row):
 try:
  body=fetch(row['url']).decode();refs={}
  for rid,title in re.findall(r'<a\b[^>]*href="/resources/web/(\d+)"[^>]*>(.*?)</a>',body,re.S):
   if compact(title):refs[rid]=compact(title)
  return {**row,'resourceIds':list(refs),'resources':refs,'status':'indexed'}
 except Exception as e:return {**row,'status':'unavailable','error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:categories=list(pool.map(category,categories))
byid={}
for row in categories:
 for rid,title in row.get('resources',{}).items():
  entry=byid.setdefault(rid,{'id':'market-'+rid,'title':title,'url':'https://market.cloud.edu.tw/resources/web/'+rid,'listings':[]})
  entry['listings'].append({'grade':row['grade'],'label':row['label']})
print('Official grade/subject categories:',len(categories),'unique resource links:',len(byid),flush=True)
def details(pair):
 rid,row=pair
 try:
  body=fetch(row['url']).decode();text=compact(body)
  license_match=re.search(r'授權資訊\s*(.*?)\s*上傳時間',text)
  license_text=license_match[1][:200] if license_match else '未能辨識，須查閱來源'
  file_names=list(dict.fromkeys(html.unescape(x) for x in re.findall(r"filename=['\"]([^'\"]+)",body)))
  return {**row,'license':license_text,'files':file_names,'status':'source-only','note':'來源連結，非已匯入題目；須核對逐題答案、年級、附件及授權。','checkedAt':DATE,'requiresLogin':('請先登入' in body)}
 except Exception as e:return {**row,'status':'unavailable','error':type(e).__name__,'checkedAt':DATE}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 resources=[]
 for i,r in enumerate(pool.map(details,byid.items())):
  resources.append(r)
  if (i+1)%50==0:print('Resource metadata checked:',i+1,flush=True)
# Sources that are useful but are not assumed to grant republication or AI adaptation.
portals=[
 {'id':'cap','title':'國中教育會考歷屆試題','url':'https://cap.rcpet.edu.tw/examination.html','grades':[7,8,9],'subjects':['國語／國文','英語／英文','數學','自然科學','社會'],'status':'source-only','note':'國中綜合範圍，含圖片、閱讀與聽力；須配對官方答案及素材權利。'},
 {'id':'priori','title':'學習扶助教學及學習教材','url':'https://exam.tcte.edu.tw/tbt_html/index.php?mod=EbookNoSignIn/ebooklist_public','grades':[3,4,5,6,7,8,9],'subjects':['國語／國文','英語／英文','數學'],'status':'source-only','note':'頁面標示版權為國教署所有；可查閱教材，不逕自當成開放授權RAG題庫。'},
 {'id':'market','title':'教育大市集考試卷','url':'https://market.cloud.edu.tw/list/exampaper.jsp','grades':list(range(3,10)),'status':'indexed','note':'依逐筆授權；目錄年級科目可能有誤，不能代替題目檢查。'},
 {'id':'tmmluplus','title':'iKala TMMLU+ 國中相關子集','url':'https://huggingface.co/datasets/ikala/tmmluplus','revision':REV,'status':'downloaded','note':'發布者聲明MIT。原資料未提供逐題學年、單元與詳解，保留原始題幹與答案，分開待整理，不冒充完成課綱對應。'}]
dump(OUT/'sources.json',{'checkedAt':DATE,'portals':portals,'categories':[{k:v for k,v in r.items() if k!='resources'} for r in categories],'resources':resources})
base='https://huggingface.co/datasets/ikala/tmmluplus/resolve/'+REV+'/'
readme=fetch(base+'README.md');(OUT/'TMMLUplus-README.md').write_bytes(readme)
assert 'MIT License' in readme.decode(),'Stop: publisher license needs rechecking'
subjects={'junior_chinese_exam':'國語／國文','junior_math_exam':'數學','junior_science_exam':'自然科學','junior_social_studies':'社會','junior_chemistry':'自然科學'}
rows=[];excluded=[];downloads=[];seen=set()
for subset,subject in subjects.items():
 for split in ['dev','train','val','test']:
  path=f'data/{subset}_{split}.csv';url=base+path
  try:data=fetch(url)
  except Exception as e:downloads.append({'path':path,'error':type(e).__name__});continue
  downloads.append({'path':path,'url':url,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
  for line,raw in enumerate(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))),2):
   q={k:str(raw.get(k,'')).strip() for k in ['question','A','B','C','D','answer']};key=hashlib.sha256(json.dumps(q,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
   if key in seen:continue
   seen.add(key);reasons=[]
   if not all(q.values()) or q['answer'] not in 'ABCD' or len(q['answer'])!=1:reasons.append('missing-fields-or-answer')
   if len(set(q[k] for k in 'ABCD'))!=4:reasons.append('duplicate-options')
   if len(q['question'])>2000 or any(len(q[k])>500 for k in 'ABCD'):reasons.append('field-too-long')
   if re.search(r'如圖|下圖|附圖|右圖|左圖|圖中|圖\s*[一二三四甲乙丙丁\d]|圖\(|圖（|下表|附表|右表|上表|表中|畫線|劃線|底線|圖片|圖示',q['question']):reasons.append('figure-table-or-format-review')
   if subset=='junior_math_exam' and re.search(r'(?:[a-zA-Z]|[）)])\s*[2-9](?![0-9])',q['question']+' '+ ' '.join(q[k] for k in 'ABCD')):reasons.append('possible-flattened-exponent')
   if subset=='junior_chinese_exam' and (len(q['question'])>500 or re.search(r'改寫自|改編自|摘自|選自|龍應台',q['question'])):reasons.append('third-party-passage-review')
   metadata={'id':key[:20],'dataset':'ikala/tmmluplus','subset':subset,'split':split,'row':line,'revision':REV,'sourceUrl':url,'subject':subject,'originalScope':'junior；未標逐題年級、單元','status':'pending-curriculum-review','question':{'type':'choice','prompt':q['question'],'options':[q[k] for k in 'ABCD'],'answer':q['answer'],'explanation':''}}
   if reasons:excluded.append({**metadata,'reasons':reasons});continue
   rows.append(metadata)
 print(subset,'downloaded',flush=True)
dump(OUT/'staging-questions.json',{'format':'learning-claw-staging-v1','checkedAt':DATE,'notice':'尚未配對年級單元、補詳解或教師審核；不可直接當已審核題庫。','records':rows})
# Excluded question bodies stay local to avoid redistributing third-party reading passages.
dump(CACHE/'excluded-questions.json',excluded)
dump(OUT/'quarantine-index.json',[{k:v for k,v in r.items() if k not in ['question']} for r in excluded])
dump(OUT/'download-manifest.json',downloads)
from collections import Counter
summary={'checkedAt':DATE,'officialCategories':len(categories),'officialResources':len(resources),'resourceFetchFailures':sum(r['status']=='unavailable' for r in resources),'stagedQuestions':len(rows),'excludedQuestions':len(excluded),'stagedBySubject':dict(Counter(r['subject'] for r in rows)),'approvedQuestions':0,'curriculumMappedQuestions':0,'completeCoverage':False}
dump(OUT/'summary.json',summary)
import shutil
package=ROOT/'desktop/library';package.mkdir(exist_ok=True)
for file in ['sources.json','staging-questions.json','summary.json','TMMLUplus-README.md','download-manifest.json','quarantine-index.json']:
 shutil.copy2(OUT/file,package/file)
print(json.dumps(summary,ensure_ascii=False),flush=True)
