"""Build a traceable planning index; never turn index entries into approved questions."""
import pathlib,json,hashlib,re,unicodedata,collections
root=pathlib.Path(__file__).resolve().parents[1];work=root/'work/curriculum';out=root/'desktop/library'
subjects={'chinese':('國語／國文','186497040'),'english':('英語／英文','138425665'),'math':('數學','212882526'),'social':('社會','139927001'),'science':('自然科學','928375926'),'arts':('藝術','1145215'),'integrated':('綜合活動','160774275'),'technology':('科技','909845282'),'health':('健康與體育','387440395')}
sources=[];standards=[]
for key,(subject,num) in subjects.items():
 text=unicodedata.normalize('NFKC',(work/(key+'.txt')).read_text());codes=set()
 # Index identifiers only. ODT tables may interleave columns, so don't guess text-code pairings.
 for m in re.finditer(r'(?<![\w])([A-Za-z\u4e00-\u9fff]{0,3}[A-Za-z0-9]{1,3})\s*[-－–]\s*(IV|III|II|[3-9])\s*[-－–]\s*(\d{1,2})(?!\d)',text):
  prefix,stage,n=m.groups();codes.add((prefix,stage,n))
 for prefix,stage,n in sorted(codes):
  grades={'II':[3,4],'III':[5,6],'IV':[7,8,9]}.get(stage,[int(stage)] if stage.isdigit() else [])
  if not grades:continue
  standards.append({'id':key+':'+prefix+'-'+stage+'-'+n,'subject':subject,'code':prefix+'-'+stage+'-'+n,'grades':grades,'sourceId':key,'mappingStatus':'official-code-index','note':'來源文件代碼索引，尚未人工確認逐項抽取完整性；不是題目或已完成的教學單元。'})
 sources.append({'id':key,'subject':subject,'url':'https://stv.naer.edu.tw/data/course_outline/'+num+'.odt','indexUrl':'https://stv.naer.edu.tw/teaching/course_outline.jsp','sha256':hashlib.sha256((work/(key+'.odt')).read_bytes()).hexdigest(),'publisher':'教育部／國家教育研究院愛學網','scope':'公開課綱代碼索引，保留來源，不收錄完整條文'})
rev=(work/'revision.txt').read_text().strip();raw=json.load(open(work/'topics.json'))
assert hashlib.sha256((work/'topics.json').read_bytes()).hexdigest()==json.load(open(work/'manifest.json'))['files']['topics.json']['sha256']
topics=[]
for t in raw['topics']:
 if t['gradeEnd']<3:continue
 topics.append({**{k:t[k] for k in ['id','name','description','domain','evidence','assessmentPrompt','differentiatedTasks','contentCodes','performanceCodes']},'subject':{'國語文':'國語／國文','英語文':'英語／英文'}.get(t['subject'],t['subject']),'grades':list(range(max(3,t['gradeStart']),min(9,t['gradeEnd'])+1)),'status':'planning-reference','sourceId':'tw-taxonomy','notice':'社群整理的建議主題與活動，不是官方逐題認證或已審核題庫。'})
sources.append({'id':'tw-taxonomy','publisher':'seyen37/tw-taxonomy','url':'https://github.com/seyen37/tw-taxonomy/tree/'+rev,'license':'CC BY 4.0（專案自撰主題與活動）','revision':rev,'sha256':hashlib.sha256((work/'topics.json').read_bytes()).hexdigest(),'changes':'篩選涵蓋三至六年級的主題，調整科目別名及欄位；未收錄第三方課綱條文資料集。'})
data={'format':'learning-claw-curriculum-v1','checkedAt':'2026-09-26','basis':'108課綱通用單元，跨版本','completeCoverage':False,'sources':sources,'standards':standards,'topics':topics}
(out/'curriculum-catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');(out/'TW-TAXONOMY-LICENSE.txt').write_text((work/'LICENSE').read_text()+'\nAttribution: seyen37/tw-taxonomy, revision '+rev+'\nhttps://github.com/seyen37/tw-taxonomy\n')
print(len(standards),'official code index entries;',len(topics),'community planning topics')
