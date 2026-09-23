# 免費試行部署：Firebase Spark + Node.js 免費主機

此方案不使用 Firebase Cloud Functions、不升級 Blaze。前端、Firestore、Email 登入保留 Firebase Spark；`functions/server.mjs` 可部署在 Render Free，或學校已提供的 Node.js 22 主機。不能保證第三方永遠維持免費，亦不能保證免費額度足以支撐全校；不加入付款方式，超額停止服務，不自動升級。

## 現況

Firebase `edu-claw-project` 已建立「寶物教室 Web」，已啟用 Email/Password，未啟用 Google 登入。程式和建置已備妥，**Node 後端尚未部署，學生登入與 AI 尚未完成雲端端到端測試**。

## 部署步驟

1. 建立 Firestore 正式模式資料庫，建議 asia-east1；部署 `firestore.rules`，客戶端不得直接寫餘額、金鑰與登入憑證。
2. 在 Firebase App Check 註冊網頁應用程式，設定 reCAPTCHA 網站金鑰與實際網站網域。學生公開登入端點也會驗證 App Check；不可為了上線刪掉驗證。
3. Node 主機需要 Firebase Admin 憑證。由專案擁有者建立專用服務帳戶，只授予此專案所需的 Firebase Authentication Admin 與 Cloud Datastore User 權限；保管私鑰，不放 GitHub、不貼對話。這是把專案後端存取權交給所選主機，部署前須由擁有者明確核准。
4. Render 選 Free，使用 `render.yaml`；程式所在 repo 的根目錄須為此專案。新增 Secret File `firebase-service-account.json`，其路徑是 `/etc/secrets/firebase-service-account.json`。如改用学校主機，以該主機檔案路徑設定 GOOGLE_APPLICATION_CREDENTIALS。
5. 環境變數：
   - `GOOGLE_CLOUD_PROJECT=edu-claw-project`
   - `ALLOWED_ORIGINS=https://edu-claw-project.web.app,https://edu-claw-project.firebaseapp.com`
   - `KEY_ENCRYPTION_KEY`：隨機 32 bytes 的 Base64；用於教師金鑰加密。
   - `STUDENT_LOGIN_PEPPER`：另一個獨立且至少 32 字元的隨機秘密；用於學生生日雜湊及帳號識別。更換它會使舊學生登入失效，必須先做資料遷移。
   - `AI_ENABLED=false`：確認 Google 服務條件後再設定 true。
   - `GEMINI_MODEL=gemini-2.5-flash`，部署時確認仍可用與專案額度。
6. 在 `.env.firebase.local` 填上 `VITE_RECAPTCHA_SITE_KEY`、`VITE_BACKEND_URL=https://你的服務.onrender.com`。其他 Firebase Web 設定已填妥；這裡不可放私鑰或 Gemini Key。
7. 執行 `pnpm exec vite build --mode firebase`，再執行 `firebase deploy --only firestore:rules,hosting --project edu-claw-project`。**不要部署 functions。** CLI 登入仍需專案擁有者完成。
8. 老師以 Email／密碼註冊並驗證 Email。管理者在可信電腦用 `node functions/grant-teacher.mjs edu-claw-project 教師UID` 授權；教師登出再登入。註冊帳號不會自行取得教師權限。
9. 老師建立班級，按「上課開放註冊」，複製班級連結給學生。學生以姓名與四位生日月日註冊。註冊關閉後，已有帳號仍能登入。相同班級的同名學生須使用老師指定的不同辨識名稱。
10. 用兩個不同帳號完成測試：教師發幣、學生登入、扣幣、伺服器物理驗證、收藏、任務及教師 AI。確認學生無法存取教師金鑰及其他學生資料。

## 費用與運作界線

- Firebase 維持 Spark，不綁計費帳戶；達免費配額可能拒絕請求。
- Render 免費服務不加入付款方式；15 分鐘閒置會休眠，喚醒約需一分鐘。用量達限可能暫停，官方不建議用於正式生產服務。上課可先由老師開啟服務。
- 老師 Gemini 專案也必須自行確認免費層級，本站無法用 API 保證該專案沒開計費；系統不自動切模型、不重試消耗額度。
- 所有持久資料保存在 Firestore，不能依賴 Render 本機檔案。加密主金鑰及服務帳戶私鑰需由管理者備份，不能把 Firebase 資料庫備份當作秘密備份。
- 生日月日只有很少組合，即使加上伺服器雜湊與嘗試限制，也不是強密碼。班級連結僅限班內分享，不存敏感學生資料；遺忘、同名處理及防冒名仍需老師協助。
- API 每次會檢查 App Check 與登入 token；學生登入另限制每個姓名每 15 分鐘 5 次，以及伺服器連線來源每 15 分鐘 60 次。反向代理下來源限制可能由整班共用；正式擴大使用前需針對受信任代理設定來源辨識。

官方資料：https://firebase.google.com/pricing 、https://render.com/docs/free
