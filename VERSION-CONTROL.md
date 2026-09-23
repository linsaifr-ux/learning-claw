# 版本紀錄

本專案於 2026-09-23 開始使用 Git。第一個提交保存當日既有程式快照，不代表先前開發步驟的 Git 歷史；《驗證紀錄.md》保留既有文字紀錄。

## 後續修改

每次完成一項功能或修正，先執行適當驗證，再檢查與提交：

```sh
git status
git diff
git add <本次修改的檔案>
git diff --cached
git commit -m "說明本次修改的目的"
```

使用 `git log --oneline` 查看版本。功能變更可用 `git switch -c feature/功能名稱` 建立分支。

環境設定、API 金鑰、SQLite 資料、備份、工作紀錄產物、依賴套件與建置結果不納入版本。`.env.example` 僅放設定範例。新增檔案時仍須檢查是否含學生個資或憑證，不能只依賴忽略規則。

目前為本機儲存庫；尚未連接 GitHub，本機 Git 不等於異地備份。
