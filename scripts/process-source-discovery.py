"""Deterministic source preparation; never treats permission as answer approval.
Run with the bundled Python (pypdf). PDF originals remain local. The conversion
cache is produced by macOS ICU; without it retain source Chinese unchanged.
"""
from pathlib import Path
import json,re,unicodedata,hashlib,collections
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'question-banks/source-discovery'
PDF=ROOT.parent/'題庫來源查核-2026-09-26'
OUT=ROOT/'work/source-processing';OUT.mkdir(exist_ok=True)
GRADE={3:'國小三年級',4:'國小四年級',5:'國小五年級',6:'國小六年級',7:'國中一年級',8:'國中二年級',9:'國中三年級'}
AUTH='使用者於2026-09-26確認本專案可授權使用；保留原作者、出處與原權利聲明。非官方課綱認證，內容仍須教師審核。'
RULES=[('資訊科技','資訊倫理與個資保護',['個資','隱私','個人資料','騷擾']),('資訊科技','網路安全與數位公民',['詐騙','網路','著作','創用','CC','病毒','言論']),('資訊科技','資料處理與程式設計',['試算表','程式','演算','資料']),('生活科技','材料與加工',['塑膠','金屬','鋼','材料','陶瓷','壓克力','鋸','混凝土']),('生活科技','動力與機械',['引擎','氣壓','動力','行程','活塞']),('藝術','表演藝術',['劇','舞','演出','舞臺','街舞']),('健康與體育','運動技能與規則',['球','運動','戰術']),('綜合活動','生涯探索',['生涯','職業','自我評估']),('綜合活動','人際互動與性別平等',['性別','騷擾','性侵','同意']),('綜合活動','戶外活動與安全',['登山','地圖','社區','踏查','露營','羅盤']),('綜合活動','飲食與消費生活',['食品','食物','飲食','食材','消費','有效日期']),('數學','分數與比例',['分數','幾分之','百分','%','比例','比值','折扣']),('數學','時間計算',['小時','分鐘','秒','時刻']),('數學','幾何與測量',['面積','體積','周長','三角','長方','圓','正方','公尺','厘米','釐米']),('數學','平均與統計',['平均','統計','圖表']),('數學','數量關係與四則應用',['元','本','個','台','輛','人','千克','公斤']),('自然科學','物質與化學變化',['燃燒','酸','鹼','化學','金屬','反應','石蕊']),('自然科學','生物與環境',['植物','動物','生態','生物']),('社會','公民與法律',['法律','法規','憲法','民法','刑','權利','法院']),('社會','區域地理',['南韓','日本','氣候','國家','地形','東南亞']),('社會','歷史與文化',['朝代','歷史','文化','日治']),('國語／國文','字音字形與詞義',['讀音','字音','字形','用字','詞語','成語']),('國語／國文','閱讀理解',['下列','文意','作者'])]
def classify(subject,prompt):
 for subj,unit,words in RULES:
  if subj==subject and any(x in prompt for x in words):return unit,[unit]+[x for x in words if x in prompt][:5]
 return subject+'綜合練習',[subject,'原卷拆題']
def norm(text):
 text=unicodedata.normalize('NFKC',text).replace('\u00ad','')
 # Remove standalone folios only; retain original source excerpts separately.
 text=re.sub(r'^\s*\d{1,2}\s*\n|\n\s*\d{1,2}\s*$','',text)
 return re.sub(r'[ \t]+',' ',text).strip()
def compact(text):
 text=re.sub(r'(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])','',text)
 return re.sub(r'\s+',' ',text).strip()
def infer_subject(title):
 for token,subject in [('國文','國語／國文'),('國語','國語／國文'),('英','英語'),('數學','數學'),('自然','自然科學'),('社會','社會'),('地理','社會'),('公民','社會'),('表演','藝術'),('體育','健康與體育'),('輔導','綜合活動'),('童軍','綜合活動'),('家政','綜合活動'),('生活科技','生活科技'),('資訊科技','資訊科技')]:
  if token in title:return subject
 return '校本課程'
def issue_reason(prompt,options):
 text=prompt+' '.join(options)
 if re.search('[\ue000-\uf8ff\ufffd]',text):return '字型符號或公式抽取不完整，需核對原頁'
 if re.search(r'附圖|下圖|右圖|左圖|圖中|圖片|圖示|看圖|如圖|下表|附表|上表|表中|圖表|各圖|張圖|根據圖|[甲乙丙丁]圖|聆聽|聽力|Listen|Listening',text,re.I):return '依賴圖表或聲音，須保留完整素材後再拆題'
 if re.search(r'上述|上文|本文|這篇|文中|作者|根據文章|依據文章|根據短文|閱讀下文|根據課文|課文中|本文中|下列文章',prompt):return '依賴閱讀篇章或課文，須配對上下文'
 if len(prompt)<8:return '題幹過短或抽取不完整'
 if any(len(o)<1 for o in options):return '選項可能缺圖或抽取不完整'
 if len(set(options))!=len(options):return '原卷選項重複，需教師判定'
 return ''
rows=[];audits=[]
# CMATH: source-grade labels are suggestions only, never verified Taiwan mapping.
original=json.loads((SRC/'cmath/grade3-6-candidates.json').read_text())
converted=SRC/'cmath/traditional-prompts.json'
translations=json.loads(converted.read_text()) if converted.exists() else {}
for s in original:
 prompt=translations.get(s['id'],s['prompt']);unit,tags=classify('數學',prompt)
 notice='來源年級僅供建議，尚未對應臺灣108課綱；原資料有數值答案但未附詳解或獨立答案單位，需核對題意、單位及臺灣用語。'
 record={'grade':GRADE[s['sourceGrade']],'subject':'數學','unit':unit,'textbook':'','semester':'','difficulty':'一般','tags':tags,'source':f"CMATH／{s['id']}（原來源年級；適齡待審核）",'url':'https://github.com/XiaoMi/cmath/blob/9fa13ef0b2d03f5a18c1ace7001248d3981d65ea/datasets/cmath_dev.jsonl','rights':'CMATH：Tianwen Wei等（2023），資料集CC BY 4.0。保留歸屬與原題；字體經繁體轉換，分類為程式建議，年級、臺灣用語、答案單位及詳解須教師核對。','question':{'type':'short','format':'application','prompt':prompt,'answer':s['sourceAnswer'],'explanation':''}}
 rows.append({'id':s['id'],'status':'draft','issue':notice,'record':record,'originalAnswer':s['sourceAnswer'],'aiSuggestedAnswer':'尚未使用AI核對','notice':notice,'answerOrigin':'CMATH來源數值答案（單位及詳解待核）','originalRange':f"原來源小學{s['sourceGrade']}年級，非臺灣課綱認證",'sourceMeta':{'kind':'cmath','originalPrompt':s['prompt'],'originalGrade':s['sourceGrade'],'curriculumVerified':False,'license':'CC BY 4.0'}})
# PDF parser accepts only independently structured questions, retaining every
# raw block and reasons for rejected/unsupported content in the processing audit.
start=re.compile(r'(?m)^\s*(?:\([ ABCD]*\)\s*)?(\d{1,3})\s*[.、]\s*(?:\(\s*([ABCD]?)\s*\))?\s*')
answer_re=re.compile(r'(?:《答案》|答案\s*[:：])\s*\(?\s*([A-F○╳×OX])\s*\)?')
for source in json.loads((SRC/'download-verification.json').read_text()):
 filename=source['filename'];doc=PdfReader(PDF/filename);pages=[p.extract_text() or '' for p in doc.pages]
 subject=infer_subject(source['title']);grade=8 if re.search(r'八|8',source['title']) else 7 if re.search(r'七|7',source['title']) else None
 audit={'file':filename,'title':source['title'],'url':source['url'],'sha256':source['sha256'],'pages':len(pages),'rights':AUTH,'candidateIds':[],'blocks':[],'status':'needs-layout-review'}
 if not filename.startswith('junior-multisubject'):
  audit['reason']='教材／混合題型試卷需人工配對作答區、篇章、聽力或答案；本輪保留全卷及逐頁文字，不猜標準答案。'
  (OUT/(filename+'.pages.json')).write_text(json.dumps(pages,ensure_ascii=False,indent=2))
  audits.append(audit);continue
 full='\n'.join(norm(p) for p in pages);matches=list(start.finditer(full))
 # One observed range answer sheet is parsed only when all 25 positions match.
 sheet={}
 if filename=='junior-multisubject-4cc5e266289f.pdf':
  for a,b,answers in re.findall(r'(\d+)~(\d+)\s+([ABCD]{5})',full):
   if int(b)-int(a)==4:sheet.update({int(a)+i:v for i,v in enumerate(answers)})
  if set(sheet)!=set(range(1,26)):sheet={}
 for index,m in enumerate(matches):
  block=full[m.end():matches[index+1].start() if index+1<len(matches) else len(full)].strip();number=int(m[1]);rid=f"school-{source['sha256'][:12]}-{index+1:03d}"
  found=answer_re.search(block);answer=found[1] if found else m[2] or sheet.get(number,'')
  body=block[:found.start()] if found else block
  body=re.split(r'解答\s*[:：]|答案欄|[-]{3,}\(試題結束\)',body)[0]
  explanation=''
  exp=re.search(r'(?:詳解|解析|題幹解析)\s*[:：](.*)',block,re.S)
  if exp:explanation=compact(re.split(r'出處\s*[:：]|答案\s*[:：]|《答案》',exp[1])[0])
  body=re.split(r'(?:詳解|解析|題幹解析)\s*[:：]',body)[0]
  opts=list(re.finditer(r'\(([A-F])\)',body))
  reason=''; options=[];prompt=compact(body)
  if [x[1] for x in opts]==list('ABCD'):
   prompt=compact(body[:opts[0].start()]);options=[compact(body[x.end():opts[i+1].start() if i+1<len(opts) else len(body)]) for i,x in enumerate(opts)]
   if answer not in 'ABCD' or not answer:reason='未能可靠配對來源答案'
  else:reason='非四選一、選項符號不完整或題組；需人工拆題'
  reason=reason or issue_reason(prompt,options)
  if subject=='數學':reason='數學PDF含公式或直式，需逐頁核對數學版面後再匯入'
  if subject=='英語':reason='英語PDF的空格、底線或題組需逐頁配對，暫不採用純文字自動拆題'
  if len(prompt)>2000 or any(len(o)>500 for o in options):reason='題幹或選項過長，疑似跨題或混入頁面內容'
  entry={'id':rid,'number':number,'rawText':m[0]+block,'reason':reason,'sourceAnswer':answer}
  audit['blocks'].append(entry)
  if reason:continue
  unit,tags=classify(subject,prompt)
  record={'grade':GRADE[grade],'subject':subject,'unit':unit,'textbook':'','semester':'下學期','difficulty':'一般','tags':tags,'source':f"臺中市立公明國中／{source['title']}／第{number}題",'url':source['url'],'rights':AUTH,'question':{'type':'choice','prompt':prompt,'options':options,'answer':answer,'explanation':explanation}}
  rows.append({'id':rid,'status':'prepared' if explanation else 'draft','issue':'' if explanation else '原卷已附答案，尚缺可獨立使用的詳解。','record':record,'originalAnswer':answer,'aiSuggestedAnswer':'未使用AI更改原卷答案','notice':'原卷拆題，尚未經教師核對題意、詳解與適用範圍；單元為程式關鍵字建議。','answerOrigin':'原卷答案','originalRange':GRADE[grade],'sourceMeta':{'kind':'school-pdf','filename':filename,'sha256':source['sha256'],'sourceNumber':number,'curriculumVerified':False,'permissionBasis':'使用者於2026-09-26確認本專案可授權使用','permissionVerifiedByPublisher':False}})
  audit['candidateIds'].append(rid)
 audit['status']='parsed-partially' if audit['candidateIds'] else 'needs-layout-review';audits.append(audit)
assert len({r['id'] for r in rows})==len(rows)
(OUT/'source-drafts.json').write_text(json.dumps({'format':'learning-claw-supplement-v1','permissionRecordedAt':'2026-09-26','records':rows},ensure_ascii=False,indent=2)+'\n')
(OUT/'pdf-processing-audit.json').write_text(json.dumps(audits,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'candidates':len(rows),'status':dict(collections.Counter(r['status'] for r in rows)),'subjects':dict(collections.Counter(r['record']['subject'] for r in rows)),'pdfsProcessed':len(audits),'pdfBlocks':sum(len(a['blocks']) for a in audits),'pdfHeldBlocks':sum(bool(b['reason']) for a in audits for b in a['blocks'])},ensure_ascii=False))
