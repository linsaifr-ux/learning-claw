"""Transcribe self-contained items from the downloaded public-domain-labelled exam.
Answer/explanation drafts are project-authored, NOT an official answer sheet.
"""
import json,hashlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path('/Users/lin/Downloads/99國卷三下期末.doc')
url='https://market.cloud.edu.tw/resources/web/1608307'
meta={'id':'market-1608307','title':'三下國語期末考試題','author':'張滄敏（新北市立海山國小）','url':url,'downloadUrl':'https://market.cloud.edu.tw/api/download/126818/45624827/doc','license':'原站標示公共領域','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'retrievedAt':'2026-09-26','note':'只摘錄可獨立作答的題目。原卷未附答案，參考答案與詳解由專案整理，待教師確認。未收錄依賴課文、字形標示或第三方閱讀篇章的題目。'}
rows=[]
def add(label,unit,prompt,answer,explanation,options=None):
 q={'type':'choice' if options else 'short','prompt':prompt,'answer':answer,'explanation':explanation}
 if options:q['options']=options
 rid='market-1608307-'+label
 record={'grade':'國小三年級','subject':'國語／國文','unit':unit,'textbook':'','semester':'','difficulty':'一般','tags':[unit,'國語','三年級'],'source':meta['author']+'／'+meta['title']+'／'+label,'url':url,'rights':'原站標示公共領域；保留作者與來源。原卷未附標準答案，本題參考答案及詳解為專案整理草稿，非官方答案，須教師確認。','question':q}
 rows.append({'id':rid,'status':'prepared','issue':'','record':record,'aiSuggestedAnswer':'','originalAnswer':'未提供','notice':'原卷題目；參考答案及詳解為專案整理草稿，尚未經教師審核','sourceLabel':label})
add('三-1','詞義辨析','下列何者較不同？','D','雪白、米白、銀白都表示白色的色澤；明白通常表示清楚或了解，詞義類別不同。',['雪白','米白','銀白','明白'])
add('三-2','字形辨析','下列何者有誤？','B','夏天的荷花應寫作「夏荷」，原選項「夏何」的「何」是錯字。春蘭、秋菊、冬梅的用字正確。',['春蘭','夏何','秋菊','冬梅'])
add('三-3','雙重否定','「小嘉不得不吃藥」意思是小嘉＿＿吃藥。','A','「不得不」表示沒有別的選擇，必須如此，是雙重否定表肯定的用法，故為必須吃藥。',['必須','不能','很想','不必'])
add('三-4','字形辨析','「烈火熄了」猜一字。','C','「烈」字下方的四點底表示火，將這個部分去掉，留下「列」。此題以拆字方式猜謎。',['水','例','列','息'])
add('三-5','字形辨析','「佐邊無人」猜一字。','A','把「佐」左側的人字旁去掉，就得到「左」；這是根據字形組成的拆字謎。',['左','佑','佐','右'])
add('三-6','字音辨析','下列何字讀音不同？','C','「耀」「要」「藥」在此組合的常用讀音都是ㄧㄠˋ，「躍」讀ㄩㄝˋ，故「躍」不同。',['耀','要','躍','藥'])
add('三-9','詞義辨析','下列何者與「雀躍」的意思相似？','A','「雀躍」形容高興得像雀鳥跳動一般，與「欣喜」的喜悅意思接近。其餘詞語不直接表示喜悅。',['欣喜','秀雅','沉靜','昂然'])
add('三-13','字形辨析','穿「　」鞋去逛夜市。','B','「拖鞋」的正確寫法是「拖」，指沒有鞋後幫、方便穿脫的鞋。「脫」「託」「托」不合這個詞的用字。',['脫','拖','託','托'])
add('三-14','詞義辨析','「難怪他會名落孫山」，意思是＿＿他會考不上。','A','「難怪」表示了解原因後覺得不足為奇，意思接近「怪不得」；「名落孫山」在此指考試沒有錄取。',['怪不得','奇怪','才怪','難過'])
for n,p,a,e in [(1,'天人菊熱情的向我們打招呼','1','把天人菊寫成像人一樣會熱情打招呼，是擬人。'),(2,'玄武岩張手迎接我們的到來','1','把岩石寫成像人一樣張手迎接，是擬人。'),(3,'海鳥在海上表演吃魚的特技','1','把海鳥捕食描寫成像人表演特技，賦予人的活動意義，是擬人。'),(4,'明亮的湖泊有如大地的眼睛','2','以大地的眼睛比喻明亮的湖泊，並用「有如」連結，是譬喻。'),(5,'碧綠的大草原像柔軟的地毯','2','把大草原比作柔軟的地毯，並用「像」連結，是譬喻。')]:add('四-'+str(n),'修辭',f'修辭：擬人填1、譬喻填2。\n{p}',a,e)
for n,word,answer,explanation in [(1,'迫不及待','示例：放學後，我迫不及待地打開期待已久的禮物。','表示急切得無法等待。造句須呈現急切期待或想立刻行動的情境，答案不限定示例。'),(2,'流連忘返','示例：這座美麗的花園讓我流連忘返，直到傍晚才離開。','表示留戀美好景物或事物，捨不得離開。造句須呈現留戀而不願離去，答案不限定示例。'),(3,'不得不','示例：因為外面下大雨，我們不得不取消野餐。','表示沒有其他選擇，必須如此。造句須呈現情況所迫與必須採取的行動，答案不限定示例。')]:add('七-'+str(n),'基礎成語' if n<3 else '雙重否定','造句：'+word,answer,explanation)
for n,sense,answer in [(2,'嗅覺','示例：剛出爐的麵包散發出香甜的奶油味。'),(3,'觸覺','示例：剛蒸好的饅頭摸起來溫熱又柔軟。'),(4,'味覺','示例：這顆橘子吃起來酸酸甜甜。')]:add('五-'+str(n),'感官摹寫',f'請以食物為主題完成摹寫：{sense}摹寫。',answer,f'內容須以食物為主題，並透過{sense}描述具體感受。符合題意且語句通順即可，答案不限定示例。')
out={'format':'learning-claw-elementary-v1','source':meta,'records':rows}
for folder in ['desktop/library','question-banks/web-library']:(root/folder/'elementary-questions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(len(rows),'elementary questions, pending teacher review')
