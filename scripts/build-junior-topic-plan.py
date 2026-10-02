"""Editorial cross-edition planning, not official grade-by-grade certification."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
plans={
'國語／國文':{7:'字音字形與詞義|成語與語境|記敘文的敘事順序|文章主旨與證據|譬喻與擬人|基礎文言閱讀',8:'說明文的組織|議論文的論點與論據|詩歌意象與情感|文言詞義與句意|語句銜接與段落|閱讀比較與推論',9:'多文本觀點比較|論證有效性|文言篇章理解|修辭效果辨析|寫作構思與修訂|媒體文本與訊息判讀'},
'英語／英文':{7:'人稱代名詞與be動詞|一般動詞現在式|疑問句與否定句|名詞單複數與數量|時間與日常活動|短文主旨與細節',8:'過去式與事件順序|未來表達與計畫|比較級與最高級|動名詞與不定詞|連接詞與因果|情境對話與閱讀推論',9:'現在完成式|被動語態|關係子句|間接問句|篇章銜接與摘要|多文本資訊整合'},
'數學':{7:'正負數與數線|整數四則運算|因數倍數與質因數|分數四則運算|一元一次方程式|二元一次聯立方程式|比例與正反比|一元一次不等式|統計圖表',8:'乘法公式與多項式|平方根與根式|畢氏定理|因式分解|一元二次方程式|等差數列與級數|一次函數與圖形|三角形全等|四邊形性質',9:'相似形與比例線段|圓與切線|圓周角與弦|幾何證明|二次函數與圖形|統計量與資料判讀|機率|立體圖形與空間概念'},
'自然科學':{7:'生命的基本單位與細胞|植物的運輸與光合作用|動物消化循環與呼吸|刺激與反應|恆定與調節|生殖與遺傳|生物分類與演化|生態系與環境',8:'物質性質與密度|聲音與波動|光的反射與折射|溫度熱量與熱傳播|原子分子與化學式|化學反應與質量守恆|酸鹼鹽|力與運動|壓力與浮力',9:'功與能|電流電壓與電阻|電功率與用電|磁場與電磁感應|岩石與板塊運動|天氣與氣候|水循環與海洋|地球運動與天體'},
'社會':{7:'臺灣地形與水文|臺灣氣候與自然環境|臺灣人口與聚落|臺灣歷史的時序與史料|清領與日治時期的臺灣|戰後臺灣的社會變遷|自我家庭與學校生活|社群參與與權利責任',8:'中國與東亞地理|亞洲區域與生活方式|中國歷史的時序與變遷|東亞歷史交流|國家與民主政治|政府組織與公共參與|法律生活與權利救濟|社會文化與多元尊重',9:'世界區域地理|全球環境與資源|世界歷史的變遷|近代國際交流與衝突|全球化與公民責任|市場交易與選擇|勞動消費與經濟生活|科技媒體與公共議題'},
'藝術':{7:'視覺元素與構圖|色彩與情緒表達|節奏與旋律|聲音與音樂欣賞|肢體表達與空間|合作展演',8:'媒材探索與創作|影像與視覺傳達|音樂形式與文化|節奏編創|角色與情節|表演設計與回饋',9:'主題創作與作品說明|藝術與生活環境|音樂創作與表達|音樂賞析與比較|劇場與跨域展演|策展與反思'},
'健康與體育':{7:'生活作息與健康管理|情緒辨識與求助|人際互動與尊重|安全活動與運動準備|球類基本技能與合作|體適能紀錄與目標',8:'營養資訊與飲食選擇|媒體訊息與健康識讀|界線尊重與人際溝通|運動規則與公平參與|運動技能分析|休閒活動與安全規劃',9:'自主健康計畫|壓力調適與支持資源|健康決策與環境|個人運動計畫|戰術合作與賽後反思|終身運動與公民責任'},
'綜合活動':{7:'自我探索與優勢|學習方法與時間管理|情緒與人際溝通|團隊合作與責任|生活整理與資源使用|戶外活動與風險辨識',8:'生涯興趣與探索|同理傾聽與衝突處理|家庭互動與生活管理|消費選擇與需求|服務學習與反思|活動規劃與分工',9:'生涯資料蒐集與選擇|升學轉銜與目標設定|價值澄清與決策|生活技能與自主實踐|永續行動方案|成果檢視與調整'},
'資訊科技':{7:'資料表示與數位資訊|運算思維與問題分解|演算法與流程圖|程式的循序與選擇|數位公民與隱私',8:'迴圈與變數|資料處理與圖表|程式除錯與測試|網路運作與資訊安全|協作與著作權',9:'程式專題設計|資料與人工智慧識讀|資訊科技的社會影響|專題測試與改進|數位工具與問題解決'},
'生活科技':{7:'需求觀察與設計表達|材料特性與工具選擇|結構與穩定|製作程序與安全',8:'機構與運動傳遞|能源與動力|產品設計與測試|材料加工與連接',9:'電與控制的應用|系統整合與設計|科技產品與環境|專題迭代與成果溝通'}
}
source_ids={'國語／國文':'chinese','英語／英文':'english','數學':'math','自然科學':'science','社會':'social','藝術':'arts','健康與體育':'health','綜合活動':'integrated','資訊科技':'technology','生活科技':'technology'}
topics=[]
for subject,years in plans.items():
 for grade,names in years.items():
  for name in names.split('|'):
   id='lc-junior-'+hashlib.sha256(f'{subject}:{grade}:{name}'.encode()).hexdigest()[:12]
   topics.append({'id':id,'name':name,'subject':subject,'grades':[grade],'description':f'跨版本編輯規劃：{name}。年級配置供備課選用，須依實際教材與學生先備能力調整。','domain':subject,'evidence':[],'assessmentPrompt':'','differentiatedTasks':{},'contentCodes':[],'performanceCodes':[],'sourceId':'learning-claw-editorial','referenceSourceId':source_ids[subject],'status':'editorial-plan','notice':'專案編輯的通用單元規劃；不是官方逐年級分派，也不是已核准題目。'})
# Language variants require a teacher's actual language/dialect; no generic Chinese task masquerades as language coverage.
for subject in ['本土語文（閩南語文）','本土語文（客語文）','本土語文（原住民族語文）','本土語文（閩東語文）','臺灣手語','新住民語文']:
 topics.append({'id':'lc-language-'+hashlib.sha256(subject.encode()).hexdigest()[:12],'name':subject+('：腔調、聽說教材與評量待補' if subject=='本土語文（閩南語文）' else '：指定語種、腔調與教材後建立單元'),'subject':subject,'grades':[7,8,9],'description':'臺灣台語已列優先文字詞義題；腔調、聽辨與口說教材仍待補。' if subject=='本土語文（閩南語文）' else '需由授課老師提供實際語種／腔調、教材及學習目標；此項僅記錄缺口。','domain':'語文','evidence':[],'assessmentPrompt':'','differentiatedTasks':{},'contentCodes':[],'performanceCodes':[],'sourceId':'learning-claw-editorial','status':'needs-language-scope','notice':'尚無可用語料與語種審閱，不計為已完成的語文單元。'})
for g in [3,4]:
 topics.append({'id':f'lc-idioms-{g}','name':'基礎成語與生活情境','subject':'國語／國文','grades':[g],'description':'專案編輯的基礎成語辨義與生活情境練習，非官方逐年級指定。','domain':'語文','evidence':['能依情境辨認成語意義'],'assessmentPrompt':'','differentiatedTasks':{},'contentCodes':[],'performanceCodes':[],'sourceId':'learning-claw-editorial','status':'editorial-plan','notice':'專案補充單元，需教師確認適齡性。'})
for g in range(3,10):
 name='臺灣台語生活詞義' if g<5 else '臺灣台語情境用語' if g<7 else '臺灣台語語境與多義詞'
 topics.append({'id':f'lc-taiwanese-{g}','name':name,'subject':'本土語文（閩南語文）','grades':[g],'description':'教育部辭典核對詞義的專案補充範圍，僅為文字理解，不涵蓋完整聽說讀寫。','domain':'本土語文','evidence':['能依情境辨認詞義並說明線索'],'assessmentPrompt':'','differentiatedTasks':{},'contentCodes':[],'performanceCodes':[],'sourceId':'learning-claw-editorial','status':'editorial-plan','notice':'臺灣台語優先範圍；年級為編輯建議，腔調與聽說能力需另行評量。'})
data={'version':1,'date':'2026-10-02','source':{'id':'learning-claw-editorial','publisher':'學習有爪專案','url':'https://stv.naer.edu.tw/teaching/course_outline.jsp','scope':'參考官方領域架構的專案編輯規劃；單元與年級分配不是官方認證','license':'專案原創規劃，可供本平台教學使用'},'topics':topics}
(root/'desktop/library/junior-topic-plan.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(len(topics),'editorial topic/coverage entries')
