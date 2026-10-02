"""Reproducible candidate content. No record is approved by this script."""
from pathlib import Path
import json,hashlib,math
from fractions import Fraction
root=Path(__file__).resolve().parents[1]
cat=json.loads((root/'desktop/library/curriculum-catalog.json').read_text());junior=json.loads((root/'desktop/library/junior-topic-plan.json').read_text())
topics=cat['topics']+junior['topics'];records=[]
grades=['國小三年級','國小四年級','國小五年級','國小六年級','國中一年級','國中二年級','國中三年級']
def topic(grade,subject,name):
 return next((t for t in topics if grade in t['grades'] and t['subject']==subject and t['name']==name),None)
def add(grade,subject,unit,q,origin,check=None,status='prepared',mapping=None):
 id='lc-seed-'+hashlib.sha256(json.dumps([grade,subject,unit,q],ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:20]
 t=mapping or topic(grade,subject,unit)
 record={'grade':grades[grade-3],'subject':subject,'unit':unit,'textbook':'','semester':'','difficulty':'一般','tags':([unit[:40],'成語','基礎成語'] if '成語' in unit else [unit[:40]]),'source':'學習有爪／'+origin,'url':'','rights':'本專案新編或依所列授權改編；內容為待核對草稿，不代表官方答案或教師已核准。','originLibraryId':id,'question':q}
 if t:record['curriculumTopicIds']=[t['id']]
 records.append({'id':id,'status':status,'issue':'需老師核對題意、適齡性與評分規準' if status=='draft' else '', 'record':record,'originalAnswer':q['answer'],'answerOrigin':'專案新編參考答案；不是原卷官方答案','notice':'待教師確認，未自動核准。','sourceMeta':{'kind':'curriculum-seed','version':1,'authoredAt':'2026-10-03','origin':origin,'curriculumVerified':False,**({'calculation':check} if check else {})}})
def mathq(g,u,p,a,e,check,unit=''):
 q={'type':'short','prompt':p,'answer':str(a),'explanation':e}
 if unit:q['answerUnit']=unit;q['format']='application'
 add(g,'數學',u,q,'受限數學模板第1版',check)
for i in range(36):
 a=1248+i*17;b=1125+i*9
 mathq(3,'多次進退位的加減直式',f'計算 {a} + {b} 的結果。',a+b,f'依位值相加，{a}+{b}={a+b}。可用 {a+b}−{b}={a} 驗算。',{'op':'add','a':a,'b':b})
 a=203+i*3;b=2+i%7
 mathq(3,'乘以一位數的直式計算',f'計算 {a} × {b} 的結果。',a*b,f'{a}×{b}={a*b}；乘法表示 {b} 個 {a} 相加。',{'op':'mul','a':a,'b':b})
 b=2+i%8;c=12+i;a=b*c
 mathq(3,'除法的意義與算式',f'把 {a} 本書平均分給 {b} 位同學，每位同學分到幾本書？',c,f'總數除以人數：{a}÷{b}={c}，每位分到 {c} 本書。',{'op':'div','a':a,'b':b},'本')
 a=121+i*7;b=12+i
 mathq(4,'多位數乘法直式',f'計算 {a} × {b} 的結果。',a*b,f'{a}×{b}={a*b}；可分成 {a}×{b//10*10}+{a}×{b%10}。',{'op':'mul','a':a,'b':b})
 a=12+i;b=5+i%8
 mathq(4,'正方形與長方形的面積周長公式',f'長方形長 {a} 公分、寬 {b} 公分，面積是多少平方公分？',a*b,f'面積＝長×寬＝{a}×{b}={a*b} 平方公分。',{'op':'mul','a':a,'b':b},'平方公分')
 a=23+i;b=3+i%9;c=a*b
 mathq(4,'多位數除法直式',f'計算 {c} ÷ {a} 的結果。',b,f'{a}×{b}={c}，所以 {c}÷{a}={b}。',{'op':'div','a':c,'b':a})
 a=10+2*i;b=3+i%9
 mathq(5,'三角形的面積公式',f'三角形底為 {a} 公分，對應的高為 {b} 公分，面積是多少平方公分？',a*b//2,f'底×對應高÷2＝{a}×{b}÷2={a*b//2} 平方公分。',{'op':'triangle','a':a,'b':b},'平方公分')
 a=4+i;b=5+i%7;c=3+i%5
 mathq(5,'正方體與長方體的體積與表面積',f'長方體長 {a} 公分、寬 {b} 公分、高 {c} 公分，體積是多少立方公分？',a*b*c,f'體積＝長×寬×高＝{a}×{b}×{c}={a*b*c} 立方公分。',{'op':'volume','a':a,'b':b,'c':c},'立方公分')
 a=12+i;b=2+i%5;c=a+b;answer=Fraction(a,c)
 mathq(5,'整數相除的分數表示',f'將 {a} 公升果汁平均分裝成 {c} 瓶，每瓶有多少公升？請用最簡分數表示。',str(answer),f'{a}÷{c}={a}/{c}={answer}，每瓶為 {answer} 公升。',{'op':'fraction','a':a,'b':c},'公升')
 a=35+i;b=2+i%5
 mathq(6,'速度',f'一輛車以固定速率行駛 {b} 小時，共行駛 {a*b} 公里，平均速率是多少公里／小時？',a,f'平均速率＝路程÷時間＝{a*b}÷{b}={a} 公里／小時。',{'op':'div','a':a*b,'b':b},'公里／小時')
 a=3+i;b=5+i%9;f=Fraction(a,b)
 mathq(6,'比與比值',f'求比 {a}：{b} 的比值，以最簡分數或整數表示。',str(f),f'比值為前項除以後項：{a}÷{b}={f}。',{'op':'fraction','a':a,'b':b})
 a=18+i;b=24+i
 mathq(6,'短除法求最大公因數與最小公倍數',f'求 {a} 與 {b} 的最大公因數。',math.gcd(a,b),f'{a} 與 {b} 共同因數中最大的是 {math.gcd(a,b)}；两數分別可寫成 {math.gcd(a,b)}×{a//math.gcd(a,b)} 與 {math.gcd(a,b)}×{b//math.gcd(a,b)}。',{'op':'gcd','a':a,'b':b})
 a=-7-i;b=15+2*i
 mathq(7,'整數四則運算',f'計算 ({a}) + {b} 的結果。',a+b,f'正數的絕對值較大，{b}−{abs(a)}={a+b}，因此答案為 {a+b}。',{'op':'add','a':a,'b':b})
 a=2+i%7;x=3+i;b=5+i%6;c=a*x+b
 mathq(7,'一元一次方程式',f'解方程式 {a}x + {b} = {c}，求 x。',x,f'兩邊減去 {b}，得 {a}x={c-b}；再除以 {a}，得 x={x}。代回左邊為 {a}×{x}+{b}={c}。',{'op':'linear','a':a,'b':b,'c':c})
 a=3+i;b=5+i%4;k=2+i%5
 mathq(7,'比例與正反比',f'已知 x 與 y 成正比。當 x={a} 時，y={a*k}；當 x={b} 時，y 是多少？',b*k,f'正比常數 y/x={a*k}/{a}={k}，所以 y={k}×{b}={b*k}。',{'op':'proportion','a':a,'b':b,'c':k})
 k=i+1
 mathq(8,'畢氏定理',f'一直角三角形兩股長分別為 {3*k} 公分及 {4*k} 公分，斜邊長多少公分？',5*k,f'斜邊平方＝({3*k})²+({4*k})²={25*k*k}，取正平方根得 {5*k} 公分。',{'op':'hypotenuse','a':3*k,'b':4*k},'公分')
 a=2+i;d=2+i%5;n=5+i%7;v=a+(n-1)*d
 mathq(8,'等差數列與級數',f'等差數列首項為 {a}，公差為 {d}，第 {n} 項是多少？',v,f'第n項＝首項+(n−1)×公差，代入得 {a}+({n}−1)×{d}={v}。',{'op':'sequence','a':a,'b':d,'c':n})
 a=2+i%5;b=-8+i;x=3+i
 mathq(8,'一次函數與圖形',f'一次函數 y={a}x+({b})，當 x={x} 時，y 是多少？',a*x+b,f'代入 x={x}，y={a}×{x}+({b})={a*x+b}。',{'op':'linearValue','a':a,'b':b,'c':x})
 a=3+i;b=2+i%5
 mathq(9,'相似形與比例線段',f'兩個相似三角形的大、小對應邊長比為 {b}：1。小三角形一邊長 {a} 公分，大三角形的對應邊長多少公分？',a*b,f'對應邊長按相同比例放大，大三角形對應邊長為 {a}×{b}={a*b} 公分。',{'op':'mul','a':a,'b':b},'公分')
 a=i+1;b=4+i%5;f=Fraction(a,a+b)
 mathq(9,'機率',f'袋中有 {a} 顆紅球與 {b} 顆藍球，每顆球被抽中的機會相同。隨機抽一顆，抽到紅球的機率是多少？用最簡分數表示。',str(f),f'全部有 {a+b} 顆球，有利結果 {a} 顆，機率={a}/{a+b}={f}。',{'op':'fraction','a':a,'b':a+b})
 a=1+i%4;x=i-8;c=2+i
 mathq(9,'二次函數與圖形',f'二次函數 y={a}x²+{c}，當 x={x} 時，y 是多少？',a*x*x+c,f'先平方再乘係數：y={a}×({x})²+{c}={a*x*x+c}。',{'op':'quadraticValue','a':a,'b':x,'c':c})
# Adapt existing CC BY activities as teacher-led drafts. They are not self-contained quiz items.
for t in cat['topics']:
 if t['subject'].startswith('本土語文') or t['subject'] in ['新住民語文','臺灣手語']:continue
 if not t['assessmentPrompt'] or not t['evidence']:continue
 for g in t['grades']:
  evidence='；'.join(t['evidence'])
  prompt=f'教師帶領活動：{t["name"]}。\n{t["assessmentPrompt"].replace("{{name}}","學生")}\n完成後以文字記錄做法、觀察結果與理由。老師須先提供活動所需教材；口說、聽辨與操作由老師課堂觀察。'
  answer=f'非唯一答案。評量目標：{evidence}。以目標達成與可觀察證據評分；不可僅憑文字自述認定口說、聽辨或操作正確。'
  explanation=f'規準草案（100分）：學習目標的達成與證據60分、方法與理由的說明30分、檢視與修正10分。目標：{evidence}。老師須先確認教材、活動條件及目標是否適齡，必要時調整分項規準。'
  add(g,t['subject'],t['name'],{'type':'work','prompt':prompt,'answer':answer,'explanation':explanation},'tw-taxonomy CC BY 4.0 活動改編；需教師準備教材',status='draft',mapping=t)
  r=records[-1];r['record']['source']='seyen37/tw-taxonomy／'+t['id']+'／活動改編';r['record']['url']=next(s['url'] for s in cat['sources'] if s['id']=='tw-taxonomy');r['record']['rights']='原活動 CC BY 4.0，保留來源固定版本；本專案改為課堂任務並新增規準草案。需補教材與教師審閱，不是可獨立完成的測驗題。';r['sourceMeta']['delivery']='teacher-led';r['sourceMeta']['issueCodes']=['materials','rubric-review'];r['issue']='需老師提供教材／工具並確認規準，不應直接當作獨立測驗題。'
# Self-contained language drafts; grade placement remains editorial and reviewable.
vocab=[('apple','蘋果',['香蕉','桌子','鉛筆']),('book','書',['窗戶','椅子','手錶']),('cat','貓',['狗','鳥','魚']),('dog','狗',['貓','馬','牛']),('red','紅色',['藍色','黃色','綠色']),('blue','藍色',['紅色','黑色','白色']),('green','綠色',['紅色','黃色','紫色']),('yellow','黃色',['綠色','藍色','灰色']),('three','三',['二','四','五']),('five','五',['三','六','八']),('eight','八',['六','七','九']),('ten','十',['一','五','九']),('pencil','鉛筆',['橡皮擦','尺','課桌']),('chair','椅子',['書','背包','門']),('door','門',['窗戶','地板','天花板']),('water','水',['牛奶','果汁','茶']),('milk','牛奶',['水','湯','果汁']),('fish','魚',['兔子','鳥','狗']),('bird','鳥',['魚','貓','熊']),('rabbit','兔子',['狗','貓','馬']),('teacher','老師',['學生','醫師','廚師']),('student','學生',['老師','司機','農夫']),('happy','快樂的',['悲傷的','疲倦的','飢餓的']),('small','小的',['大的','高的','長的'])]
def choice(g,s,u,p,correct,wrong,explanation,origin='原創語文補充第1版'):
 n=len(records)%4;opts=list(wrong);opts.insert(n,correct);add(g,s,u,{'type':'choice','prompt':p,'options':opts,'answer':'ABCD'[n],'explanation':explanation},origin)
for g in [3,4]:
 for word,meaning,wrong in vocab:choice(g,'英語／英文','常見字詞與句子的認讀',f'英文單字「{word}」在一般用法中對應下列哪個中文意思？',meaning,wrong,f'{word} 的一般詞義是「{meaning}」。本題檢查常見字詞辨識。')
for g in [5,6]:
 for i,(place,item) in enumerate([('park','ball'),('library','book'),('classroom','pencil'),('kitchen','cup'),('garden','hat'),('bedroom','bag'),('school','notebook'),('museum','map'),('station','ticket'),('shop','apple'),('playground','kite'),('office','pen')]):
  name=['Amy','Ben','Cindy','David'][i%4];p=f'Read: "{name} is at the {place}. {name} has a {item}." Where is {name}?'
  locations=[x for x in ['park','library','classroom','kitchen','garden','bedroom'] if x!=place][:3]
  choice(g,'英語／英文','句子對話與短文的閱讀',p,'At the '+place+'.',['At the '+x+'.' for x in locations],f'第一句明確說明 {name} is at the {place}，因此地點是 {place}；第二句描述物品，不能代替地點。')
patterns={
7:[('人稱代名詞與be動詞','I ___ a student.','am',['is','are','be'],'主詞 I 在現在式搭配 am。'),('人稱代名詞與be動詞','They ___ in the classroom.','are',['am','is','be'],'主詞 They 為複數，現在式搭配 are。'),('一般動詞現在式','Tom ___ to school every day.','walks',['walk','walking','to walk'],'every day 表示規律行為，第三人稱單數 Tom 的一般動詞用 walks。'),('一般動詞現在式','We ___ English on Mondays.','study',['studies','studying','to study'],'主詞 We 搭配原形動詞 study，表示例行活動。'),('疑問句與否定句','___ she like music?','Does',['Do','Is','Are'],'一般動詞 like 的現在式問句，第三人稱單數用 Does。'),('疑問句與否定句','I do not ___ coffee.','drink',['drinks','drinking','drank'],'助動詞 do 後使用原形動詞 drink。'),('名詞單複數與數量','There are two ___ on the desk.','books',['book','a book','an book'],'two 後搭配可數名詞複數 books。'),('名詞單複數與數量','I have ___ apple.','an',['a','many','two'],'單數 apple 起首為母音音素，使用 an。'),('時間與日常活動','Read: "The class starts at nine." What time does the class start?','At nine.',['At seven.','At eight.','At ten.'],'文本直接提供 at nine，答案為九點。'),('短文主旨與細節','Read: "Leo has a dog. Its name is Lucky." What animal does Leo have?','A dog.',['A cat.','A bird.','A fish.'],'第一句指出 Leo has a dog；Lucky 是名字。')],
8:[('過去式與事件順序','Yesterday, Tina ___ a letter.','wrote',['writes','write','writing'],'Yesterday 表示過去時間，write 的過去式為 wrote。'),('過去式與事件順序','Did you ___ the movie last night?','watch',['watched','watches','watching'],'Did 後接原形動詞 watch。'),('未來表達與計畫','We are going to ___ a museum tomorrow.','visit',['visited','visits','visiting'],'be going to 後接原形動詞 visit。'),('比較級與最高級','This box is ___ than that one.','heavier',['heavy','heaviest','more heavyer'],'than 表示比較，heavy 的比較級為 heavier。'),('比較級與最高級','Of the three runners, Mei is the ___.','fastest',['faster','fast','more fast'],'三者中最快使用最高級 fastest。'),('動名詞與不定詞','I enjoy ___ books.','reading',['read','to read','reads'],'enjoy 後接動名詞 reading。'),('動名詞與不定詞','She wants ___ a doctor.','to be',['being','be','is'],'want 後接 to 不定詞，故為 to be。'),('連接詞與因果','It was raining, ___ we stayed inside.','so',['but','or','although'],'下雨是原因，留在室內是結果，以 so 連接。'),('情境對話與閱讀推論','Read: "Nina took an umbrella because it was raining." Why did Nina take an umbrella?','Because it was raining.',['Because it was sunny.','Because she lost her bag.','Because she was hungry.'],'because 子句明確指出原因是下雨。')],
9:[('現在完成式','She has ___ her homework.','finished',['finish','finishes','finishing'],'has 後接過去分詞，finish 的過去分詞是 finished。'),('現在完成式','They have lived here ___ 2020.','since',['for','during','by'],'明確的起始年份搭配 since。'),('被動語態','The windows are ___ every week.','cleaned',['clean','cleaning','cleans'],'被動語態 be 加過去分詞，表示窗戶被清潔。'),('被動語態','This book was ___ by a young writer.','written',['write','wrote','writing'],'was 加過去分詞 written 構成被動語態。'),('關係子句','The girl ___ is wearing a blue hat is my sister.','who',['which','where','when'],'先行詞為人 the girl，關係代名詞 who 在子句中作主詞。'),('關係子句','This is the book ___ I bought yesterday.','that',['who','where','when'],'book 是物，that 可作關係代名詞並作 bought 的受詞。'),('間接問句','Do you know where ___?','he lives',['does he live','is he live','he live'],'間接問句使用主詞在前的直述句語序 he lives。'),('篇章銜接與摘要','Read: "The road was closed. As a result, we took another route." What happened because the road was closed?','They took another route.',['They closed a shop.','They stayed on the same road.','They bought a car.'],'As a result 引出結果：改走另一條路。')]
}
for g,rows in patterns.items():
 for unit,p,c,w,e in rows:choice(g,'英語／英文',unit,p,c,w,e)
idioms=[('一心一意','專心一致，不分心','小安關掉電視，專心完成一件事',['三心二意','虎頭蛇尾','半途而廢']),('半途而廢','事情還没完成就停止，不再繼續','小明拼模型拼到一半就放棄，以後也不再做',['持之以恆','一心一意','全力以赴']),('持之以恆','長久保持，不中斷','小晴每天練字，持續了半年',['半途而廢','三心二意','虎頭蛇尾']),('虎頭蛇尾','開始聲勢很大，結尾卻草率無力','活動起初準備得很熱烈，最後卻草草收場',['有始有終','持之以恆','一心一意']),('亡羊補牢','出了問題後及時補救，避免再受損失','發現羊從破洞逃走後，牧人立刻把羊圈修好',['守株待兔','刻舟求劍','畫蛇添足']),('守株待兔','拘泥偶然的機會，不肯主動努力','偶然撿到錢後，小偉天天坐在原地等著再撿到',['腳踏實地','全力以赴','勤能補拙']),('畫蛇添足','多做不必要的事，反而壞事','海報原本清楚，增加許多無關裝飾後反而看不懂',['恰到好處','實事求是','雪中送炭']),('雪中送炭','在別人急需幫助時給予幫助','同學忘帶午餐又沒有錢時，小美及時提供一份午餐',['落井下石','冷眼旁觀','袖手旁觀']),('同心協力','共同一心，一起努力','大家分工合作，把班級打掃乾淨',['各行其是','袖手旁觀','三心二意']),('井底之蛙','見識狹小的人','小華只知道自己的小圈子，卻認為已了解全世界',['見多識廣','博學多聞','集思廣益']),('胸有成竹','做事前已經有完整的把握或計畫','小安事先充分準備，報告前已有清楚的計畫',['手足無措','不知所措','心慌意亂']),('手足無措','慌亂得不知道怎麼辦','突然被要求上台，小明慌得不知道手腳怎麼擺',['胸有成竹','從容不迫','有條不紊']),('興高采烈','興致高昂，情緒熱烈','得知可以參加期待已久的活動，大家開心地歡呼',['垂頭喪氣','悶悶不樂','憂心忡忡']),('垂頭喪氣','失意沮喪的樣子','比賽失利後，小偉低著頭，顯得十分沮喪',['興高采烈','歡天喜地','喜氣洋洋']),('刻舟求劍','拘泥舊方法，不懂得因情況改變而調整','環境已經不同，小安仍照搬不適用的舊方法',['隨機應變','因地制宜','見機行事']),('自相矛盾','自己的說法或行為前後互相抵觸','小明先說自己從未到過那裡，後來又說上週去過',['言行一致','一諾千金','實事求是']),('拔苗助長','急著求成而使用不當方法，反而造成傷害','為了讓植物快長大而用力往上拉，結果使它枯死',['循序漸進','水到渠成','順其自然']),('對牛彈琴','對不懂道理或不合適的對象談論深奧內容，難以奏效','向完全沒有相關背景的人堆砌專門術語，對方聽不懂',['深入淺出','循循善誘','通俗易懂']),('一舉兩得','做一件事同時獲得兩種好處','步行去附近學校，既活動身體，也減少搭車排放',['得不償失','顧此失彼','徒勞無功']),('三心二意','意志不堅定，心意不專一','小安一會儿想做這個，一會兒又想做那個，總定不下來',['一心一意','專心致志','全神貫注'])]
for g in [3,4]:
 unit='基礎成語與生活情境'
 for idiom,meaning,context,wrong in idioms:
  choice(g,'國語／國文',unit,f'「{context}。」哪個成語最適合形容這個情境？',idiom,wrong,f'「{idiom}」指{meaning}。題幹描述的行為與此意義相符；應依完整情境判斷，不只看單一字詞。')

for g in [3,4]:
 for idiom,meaning,context,wrong in idioms:
  add(g,'國語／國文','基礎成語與生活情境',{'type':'short','format':'application','prompt':f'情境：{context}。請用「{idiom}」寫一句符合這個情境的話，再用自己的話說明這個成語的意思。','answer':f'接受多種合理句子；須符合情境並正確運用「{idiom}」，意思為{meaning}。不得只因句中出現指定成語就給分。','explanation':f'評分規準：成語在完整句子中的用法與情境相符60分，說明核心意思40分。核心意思：{meaning}。不以唯一範例措辭為標準；合理同義表達可接受。'},'原創成語應用與規準第1版')

# Original scenario tasks for the previously thin junior non-exam subjects.
practical=[
(7,'藝術','視覺元素與構圖','你要設計「校園閱讀日」海報，版面只能放標題、日期地點、一本書的圖案。請描述三者的大小與位置，並說明你如何讓觀眾先看見標題，再找到活動資訊。','須交代三類資訊的位置與大小，並以視覺層次、留白或對比說明閱讀順序；沒有唯一構圖。','資訊完整30分、構圖及閱讀順序理由50分、可辨識性與留白20分。'),
(8,'藝術','影像與視覺傳達','同一張操場照片，甲版只裁出一位跌倒的學生，乙版保留旁邊正在協助的同學。請說明兩種裁切可能造成的不同印象，並提出一項避免誤導觀眾的做法。','指出裁切改變可見脈絡，甲可能突出孤立或危險，乙呈現協助情境；可採完整說明、保留關鍵脈絡等。合理不同解讀亦可。','比較兩種視覺效果40分、依畫面資訊說理40分、具體改善20分。'),
(9,'藝術','策展與反思','你有三件作品：描繪河流的畫、錄下水聲的聲音作品、以回收材料製作的橋。請為它們設計共同展覽主題、參觀順序及一段不超過80字的導覽文字。','共同主題需能連結三件作品；順序與導覽須說明作品之間的關係，接受多種合理方案。','三件作品的主題連結40分、順序理由30分、清楚導覽30分。'),
(7,'健康與體育','球類基本技能與合作','合作傳球活動規則是每位隊員至少接球一次才可得分。甲隊總是只傳給兩位較熟練的人。請指出這個做法與規則的衝突，並提出可讓全隊參與的兩項調整。','指出未讓每位隊員接球；可事先安排接球順序、用口頭提醒、調整傳球速度或距離等。不得以羞辱能力較弱者為方法。','依規則判斷30分、兩項可執行調整50分、尊重與合作20分。'),
(8,'健康與體育','運動規則與公平參與','班級友誼賽中，裁判沒看見球碰到自己的手後出界。你知道若隱瞞，自己的隊伍可能得利。請提出一個處理方式，並從公平參與及團隊信任說明理由。','可主動向裁判說明看到的事實，尊重正式判定；理由涉及公平規則與長期信任，不以勝負合理化欺瞞。','具體處理30分、公平理由35分、團隊信任理由35分。'),
(9,'健康與體育','戰術合作與賽後反思','某隊在合作遊戲中前半場常因兩人同時搶同一個位置而失誤。下半場先約定角色後，重複失誤減少。請以「觀察—原因假設—調整—檢查」四步驟寫出反思，並指出還需要蒐集什麼紀錄。','將重複搶位與角色協調連結，但不把單場結果當作必然因果；可記錄不同場次、失誤次數或角色執行情形。','四步驟完整40分、對應情境證據40分、後續紀錄20分。'),
(7,'綜合活動','學習方法與時間管理','週三晚上有60分鐘可安排，要完成20分鐘閱讀、25分鐘數學與10分鐘整理書包。請排出時間表、算出剩餘時間，並說明若數學多花10分鐘會如何調整。','原任務共55分鐘，剩5分鐘；數學多10分鐘時總需65分鐘，至少須調整5分鐘或另安排時間，不能宣稱仍可全數塞進60分鐘。','時間核算40分、可行調整40分、說明優先順序20分。'),
(8,'綜合活動','活動規劃與分工','四人要準備一場10分鐘的班級分享。工作包括找資料、查核來源、整理投影片及口頭報告。請提出分工表及至少兩個共同檢查點，避免到報告當天才發現內容重複。','分工涵蓋四項工作且有協作檢查，例如先確認大綱、製作中比對資料、報告前排練。接受合理輪替與共同承擔。','工作涵蓋30分、角色安排30分、兩個檢查點40分。'),
(9,'綜合活動','生涯資料蒐集與選擇','小禾對兩種升學方向有興趣，手上只有同學的傳聞。請列出三種需要查證的資訊，以及各自合適的資料取得方式，再說明為何不能只用單一排名做決定。','可查課程、入學條件、學習環境、支持資源或發展路徑等，從學校公開資料、輔導教師或實地了解取得；選擇需結合自身興趣與條件。','三項資訊及取得方法60分、說明自身需求20分、避免單一指標20分。'),
(7,'資訊科技','演算法與流程圖','請用有順序的步驟描述：輸入一個整數，若能被2整除就顯示「偶數」，否則顯示「奇數」。再用0、7、12檢查流程結果。','流程需讀取整數、檢查除以2的餘數是否為0，並依條件輸出；0是偶數、7是奇數、12是偶數。','輸入與順序20分、條件及分支40分、三筆測試40分。'),
(8,'資訊科技','程式除錯與測試','某程式想把1到5相加，卻只重複加入1到4而得到10。請指出邊界錯誤、修正範圍，並寫出修正後的總和以及一筆更小的測試案例。','迴圈漏掉上界5；加入1到5總和15。可用1到1應得1、1到2應得3等檢查是否包含上界。','定位邊界30分、修正及總和40分、小案例30分。'),
(9,'資訊科技','資料與人工智慧識讀','甲模型只看過白天拍攝的自行車照片，老師想用它辨識夜間照片。請說明這種資料差異可能造成的問題，並規劃如何蒐集及分開使用訓練、驗證資料。','白天與夜間影像條件不同，表現可能下降；需有代表性的夜間資料，保留未參與訓練的測試資料，不能以训练樣本結果當泛化表現。','指出資料差異30分、蒐集代表性資料30分、訓練與驗收分離40分。'),
(7,'生活科技','結構與穩定','兩座同材質、同高度的紙塔，甲底部寬6公分、乙底部寬2公分。若要比較底部寬度對穩定性的影響，請列出要控制的条件、觀察方式及不能直接由一次結果下的結論。','應控制材料用量、塔高、施力方式等，重複觀察傾倒情況；不能由一次結果推論所有形狀或材料都必然相同。','控制變因40分、可重複測試30分、合理限制30分。'),
(8,'生活科技','產品設計與測試','你要設計能放三枝筆的桌上筆架。請列出兩項可量測的需求，提出材料與連接方式，並設計測試來確認筆架不會在放入三枝筆後倒下。','需求需具體可測，例如容量、尺寸或穩定；材料與連接有合理理由，測試需實際對應三枝筆的擺放並可重複。','需求30分、材料與連接理由30分、對應測試40分。'),
(9,'生活科技','專題迭代與成果溝通','第一次紙橋測試只能承載4枚相同硬幣，第二次增加摺痕後可承載7枚。請提出下一輪只改變一項設計因素的測試計畫，並列出要留下的紀錄。','一次只改變如摺痕數量等一項因素，控制紙張、跨度、加重位置；記錄版本、失效位置、承載數與重複測試結果。','單一變因30分、控制條件30分、紀錄及比較40分。'),
(7,'自然科學','生態系與環境','某草地食物關係為草被蚱蜢吃，蚱蜢被青蛙吃。若青蛙突然減少，僅依這條食物鏈，推測短期內蚱蜢數量可能如何改變，並說明為何實際結果仍需觀察。','捕食壓力減少時蚱蜢可能增加；仍受食物、疾病、其他天敵等因素影響，不能保證必然增加。','食物鏈推論40分、因果理由30分、限制與觀察30分。'),
(8,'自然科學','物質性質與密度','甲物體質量60公克、體積20立方公分；乙物體質量80公克、體積40立方公分。請算出密度，判斷誰較大，並說明為何不能只看質量判斷密度。','甲密度3公克／立方公分，乙密度2公克／立方公分，甲較大。密度是質量與體積的比值，質量較大不必然密度較大。','兩項計算含單位50分、比較20分、比值說明30分。'),
(9,'自然科學','天氣與氣候','某地連續三天午後下雨，小安因此說「這裡全年每天都下雨」。請指出推論的问题，並說明若要了解長期氣候，需要哪一類資料。','短期天氣不能直接代表全年或長期氣候；應蒐集多年、不同月份的降水與氣溫紀錄，描述長期統計特徵。','區別時間尺度40分、指出過度推論30分、合適資料30分。'),
(7,'社會','臺灣歷史的時序與史料','你要研究某條街道的變遷，取得一張50年前的照片、一份當年的地圖與今天居民的回憶。請說明三種資料各能提供什麼，以及如何互相比對，避免把回憶直接當成精確日期。','照片提供可見景象，地圖提供當時位置與配置，回憶提供生活經驗但可能有時間誤差；應交叉核對日期、地點與來源。','資料用途45分、交叉比對35分、限制20分。'),
(8,'社會','亞洲區域與生活方式','甲村鄰近河流與平原，乙村位於坡陡的山區。僅根據這些條件，提出交通或聚落布局可能不同的兩個假設，並列出還需要查證的資料。','可提出平原交通路線較易配置、山地受坡度限制等有条件假設；仍需人口、技術、道路、歷史等資料，不能把地形當成唯一原因。','兩個合理假設40分、條件與理由30分、待查資料30分。'),
(9,'社會','市場交易與選擇','班級有600元预算，可以選擇買每本100元的書或每盒150元的桌遊。提出兩種不超過預算且至少各有一種物品的方案，並說明選擇其中一案時放棄了什麼。','例如3本書加2盒桌遊共600元；4本書加1盒桌遊共550元。其他符合整數、至少各一種與預算限制的方案亦可。須具體描述取捨。','兩種可行方案50分、金額核對30分、取捨說明20分。')]
for g,s,u,p,a,e in practical:add(g,s,u,{'type':'work','prompt':p,'answer':a,'explanation':e},'原創情境與實作規準第1版')

# First Taiwanese lexical set: original tasks, factual meanings checked against MOE entries.
taiwanese=[
('多謝','表達感謝',['請人離開','表示飢餓','詢問時間'],'朋友幫忙撿起散落的文具，你想向他致謝','https://sutian.moe.edu.tw/und-hani/su/2415/'),
('歹勢','表示抱歉或不好意思',['表示時間很早','表示天氣很熱','表示肚子很餓'],'不小心擋住別人的路，你先向對方致歉','https://sutian.moe.edu.tw/zh-hant/su/1093/'),
('鬥陣','一起或結伴',['獨自一人','完全分開','停止行動'],'你邀請同學一起去圖書館','https://sutian.moe.edu.tw/und-hani/su/6855/'),
('歡喜','感到高興',['非常生氣','十分害怕','身體疲累'],'期待的活動終於開始，大家感到開心','https://sutian.moe.edu.tw/und-hani/su/13206/'),
('囡仔','小孩子',['成年老師','一間房子','一本書'],'長輩談到正在遊戲的小孩子','https://sutian.moe.edu.tw/und-hani/su/2142/'),
('日頭','太陽',['月亮','星星','雨水'],'在談論晴天天空中的太陽與陽光','https://sutian.moe.edu.tw/zh-hant/su/1168/')]
for g in [3,4,5,6]:
 unit='臺灣台語生活詞義' if g<5 else '臺灣台語情境用語'
 for word,meaning,wrong,context,url in taiwanese:
  prompt=f'在「{context}」的情境中，台語詞語「{word}」表達哪個意思？'
  choice(g,'本土語文（閩南語文）',unit,prompt,meaning,wrong,f'本情境中的「{word}」對應「{meaning}」。本題只核對文字詞義；不以此判定發音或聽力能力。','臺灣台語原創詞義練習第1版')
  r=records[-1];r['record']['url']=url;r['record']['source']='學習有爪新編／教育部臺灣台語常用詞辭典「'+word+'」詞義核對';r['record']['rights']='題幹、選項及詳解為專案新編；僅參照公開詞義並連結原站，不重製辭典例句或音檔。適齡性與語用須經教師審閱。';r['sourceMeta'].update({'language':'臺灣台語','dialect':'未指定；本題不評發音','referenceCheckedAt':'2026-10-03','referenceUrl':url})
for g in [7,8,9]:
 for word,url,prompt,answer in [
 ('歹勢',taiwanese[1][4],'「歹勢」在致歉時與受到稱讚而害羞時，可能指不同的心理狀態。請各寫一個適當情境（可用華語描述情境），說明如何從上下文判斷。','須區分做錯事致歉與難為情／害羞兩種語用；情境應提供判斷線索，不只重複同一解釋。'),
 ('鬥陣',taiwanese[2][4],'「鬥陣」可談一起行動，也可談人際往來。請各提供一個情境描述，並解釋兩種用法的共同點與差異。','共同點是人與人相伴或互動；差異可說明某次一起行動與較持續的交際往來。接受有語境支持的合理說明。'),
 ('日頭',taiwanese[5][4],'辭典列出「日頭」可指太陽，也可出現在通知婚期的民俗用語。為何讀到一個詞時不能永遠只套用第一個詞義？請提出查核步驟。','須結合上下文、主題與辭典用法選擇詞義，可先看語境、再比對義項；不得宣稱所有使用者或所有地方都有完全相同的婚俗用語。')]:
  add(g,'本土語文（閩南語文）','臺灣台語語境與多義詞',{'type':'short','format':'application','prompt':prompt,'answer':answer,'explanation':'規準：語境線索40分、區分詞義或語用40分、清楚說明20分。這是詞義分析，不能據此評定發音或聽力。'},'臺灣台語原創語用分析第1版')
  r=records[-1];r['record']['url']=url;r['record']['source']='學習有爪新編／教育部臺灣台語常用詞辭典「'+word+'」詞義核對';r['record']['rights']='原創情境分析題，公開詞義僅作查核參考；未重製辭典例句或音檔。適齡性及語用待教師審閱。';r['sourceMeta'].update({'language':'臺灣台語','dialect':'未指定；不評發音','referenceCheckedAt':'2026-10-03','referenceUrl':url})

# Remove accidental exact duplicate grade-scoped bodies.
assert len({r['id'] for r in records})==len(records)
data={'format':'learning-claw-curriculum-seeds-v1','version':1,'date':'2026-10-03','approved':0,'completeCoverage':False,'records':records}
(root/'desktop/library/curriculum-seeds.json').write_text(json.dumps(data,ensure_ascii=False,indent=2).replace('两數','兩數').replace('還没','還沒').replace('一會儿','一會兒').replace('训练','訓練').replace('条件','條件').replace('的问题','的問題').replace('预算','預算')+'\n')
print(len(records),'candidates:',sum(r['status']=='prepared' for r in records),'data-complete candidates (including 756 calculated math drafts);',sum(r['status']=='draft' for r in records),'teacher-led activity drafts')
