# v0.1.70 機台整理與自訂機台

## 拿掉塑膠球
- 原本 `isCapsulePrize` 的收藏（配件 5 款、科技、海洋、博物館各 3 款）在機台中裝在透明球內，物理用半徑 0.29 的球。現在直接顯示模型，機台內比例 `machinePrizeScale` = 1.3（最長邊約 0.67，熊約 0.83 高）。
- 碰撞外形：`scripts/build-crafted-colliders.mjs` 以瀏覽器建立與機台相同的模型，取凸包後取樣 40 點，寫入 `functions/crafted-hulls.mjs`；皇冠、火山改用依實際底部與頂部半徑產生的平底截錐，否則圓底會一直搖晃而無法開局。
- 開局「掉進出獎口」的判斷由中心 y<0 改為 y<-0.15：傾斜的扁平收藏中心可能略低於地面。娃娃機台結果不變。
- 實測（每台 24 次開局）：配件、科技、海洋、博物館全部成功，每次約 0.09 秒（原本約 2.5 秒且多數失敗）。對準正上方的夾中率：森林郵局 4/12、星際 5/12、配件 3/13、海洋 5/13、科技 9/11、博物館 8/11（科技與博物館偏容易，可再調）。
- `public/machines/*.png` 大廳圖已重新產生。

## 自訂機台與上傳模型
- 資料：`customPrizes`（名稱、來源、權利確認、模型雜湊、碰撞點、預覽圖）、`customMachines`（名稱、說明、顏色、1–6 款收藏）。規則在 `functions/custom-machines.mjs`。
- 上傳 `POST /api/uploadCustomPrize`（12 MB 內）：`desktop/custom-models.mjs` 解析 GLB（只接受單檔 glTF 2.0、無外部檔案、無 Draco／meshopt、貼圖嵌入、20 萬頂點內、不能太扁），依瀏覽器相同規則正規化後取 64 個外緣點作碰撞外形；物理 worker 實際落下三種姿勢確認會靜止，不會則改用平底截錐，仍不行就拒絕。模型二進位存在 SQLite `custom_models` 表，隨備份與還原。
- 模型下載 `GET /custom-models/<sha256>.glb` 只給已登入的老師與學生，內容雜湊命名、可長期快取。
- 保存機台時物理 worker 以 4 個種子實際開局，無法穩定就拒絕保存。
- 開局 `startGame` 把自訂機台的收藏清單存進該局（`session.pool`），結算時伺服器用同一份清單與碰撞外形重播；老師修改或刪除機台不影響已付代幣的當局。
- 刪除限制：機台仍使用、已有學生收藏、或有進行中的當局使用的模型不能刪除；刪除後未使用的模型檔一併清除。
- 貼圖：GLTFLoader 以 `blob:` 網址讀取 GLB 內嵌貼圖並用 fetch 載入，原本 CSP `connect-src 'self'` 會擋下而讓模型全白；改為 `connect-src 'self' blob:`（blob 由頁面自己產生）。有骨架（skinned）的模型以 SkeletonUtils 複製，避免多份放進機台時變形。整合檢查改上傳內嵌 PNG 貼圖的測試模型並監看 CSP 違規。
- 大廳圖片：老師保存自訂機台時，瀏覽器在畫面外以大廳視角渲染實際 3D 機台（機身顏色、招牌、真實收藏）並截成 WebP（過大則縮半），隨保存送出；伺服器驗證格式與大小後存進 SQLite `custom_portraits`，工作區只記雜湊；`GET /custom-portraits/<hash>` 只給已登入者。修改或刪除機台時清掉不再使用的圖片。沒有圖片（示範模式或截圖逾時）時改用依顏色畫的機台圖。
- 學生端：大廳以機台顏色畫出機台卡；收藏小圖用上傳時產生的 PNG；3D 用 GLTFLoader 載入並以精確外框正規化（與伺服器一致）。自訂收藏不能用來換裝。
- 打包：新增 `functions/crafted-hulls.mjs`、`functions/custom-machines.mjs`、`desktop/custom-models.mjs`；`tests/package-files.test.mjs` 確認打包清單涵蓋伺服器所有 import；`update-exes.py` 新增 `--add-server-file`。

## 驗證
- 單元測試含 GLB 解析與拒絕情境、上傳到開局結算的完整流程、打包清單。
- `scripts/check-custom-machines.mjs`：瀏覽器上傳 GLB（預覽、小圖）、建立機台、刪除保護、開放班級、學生大廳機台卡、進入 3D 機台並由伺服器驗證結果，桌機與手機。
- 未以真實老師上傳的外部模型大量測試；複雜或極不規則的模型可能需要換模型或減面。
