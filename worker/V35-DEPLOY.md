# V3.5 家庭試用與驗收

## 先輪替舊 Worker 的 Secret

1. 在 Cloudflare 的 **Workers & Pages** 開啟 `junior-ai-tutor-v35`，進入 **Settings → Variables and Secrets**。
2. 用密碼管理器產生至少 32 個隨機字元。編輯或重新新增 `FAMILY_ACCESS_TOKEN`，類型選 **Secret**，貼到 Cloudflare 後按 **Deploy**。在 **Deployments** 確認新版本承接全部流量。新值只用於既有的受信任測試端。
3. 從原本受信任的測試端使用同一份合成題目與原本允許的 Origin 驗證。舊值應回傳 **401**，新值應回傳 **200** 且有中文 `answer`。只回報狀態碼與是否有中文提示。避免把 token 放進網址、聊天、截圖、GitHub 或公開網頁。
4. 如果既有消費端已確認全數退役，可以停用舊 Worker 的公開路由。日後需要回滾時，選用已輪替後的版本。

[Cloudflare Worker Secrets 說明](https://developers.cloudflare.com/workers/configuration/secrets/)

## 部署獨立 V3.5 Worker

1. 在有權限的 Cloudflare 帳號內，從這個分支根目錄執行 `npx wrangler login`，完成瀏覽器授權後執行 `npx wrangler deploy --config worker/wrangler.toml`。Wrangler 會部署 `junior-ai-schoolbag-v35`、兩個 V3.5 頁面與用量計數。首次部署時 AI API 會拒絕尚未設定驗證的請求。
2. 在新 Worker 的 **Access** 頁籤選擇保護所有流量。啟用 Cloudflare Zero Trust，使用只允許指定家長信箱的 Allow 規則，選用 One-Time PIN 或既有登入方式。確認無痕視窗打開 V3.5 頁面時會進入登入畫面。
3. 在 Zero Trust 的 Access 應用程式設定取得 Application Audience (AUD) Tag。於新 Worker 的 **Variables and Secrets** 加入兩個變數 `ACCESS_TEAM_DOMAIN`（格式為 `團隊名稱.cloudflareaccess.com`，不含協定或斜線）、`ACCESS_AUD`。再加入類型為 Secret 的 `OPENAI_API_KEY`，可使用此試用專用的 OpenAI 專案金鑰。儲存並部署。兩個 V3.5 頁面以同一來源的 `POST /api/tutor` 取得提示，使用 Access 登入憑證。
4. 開啟 Wrangler 回報的網址，哥哥加上 `/brother-v35.html`，妹妹加上 `/sister-v35.html`。家長可在平板完成登入。新 Worker 的家庭總額為每分鐘 4 次、每天 40 次 AI 請求，依台北日期重置。已送出模型的請求即使用量，包含上游失敗。超額時保留題庫提示和答題流程。

[Worker Access 設定](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [取得 AUD](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

## 搬移與驗收

- 在原本有紀錄的平板和瀏覽器打開哥哥 V3.4（`test-v34.html`）或妹妹 V3.4（`sister-v34.html`），各自匯出自訂題庫與學習紀錄 JSON。到對應的 V3.5 先匯入題庫，再匯入學習紀錄，核對題數、歷史及兩人的資料。瀏覽器按網站分開儲存資料。原頁面上的資料保留，V3.5 的後續練習保存在新網址。
- 用一題非個人資料的題目測試。答錯應立即顯示題庫提示，再顯示繁體中文 AI 引導；答對應可繼續下一題。切題後，上一題的 AI 回覆不應出現在當前題目。
- 同一天可從「今日錯題」重練。跨過台北午夜後，仍待驗收的題目出現在「隔日複習」。隔天或之後無提示答對才移出複習清單，舊紀錄若缺少提示標記則仍需重新驗收。
- 用測試題在同一分鐘觸發 5 次 AI 請求，第 5 次應顯示用量上限，題庫提示仍可使用。用未登入的瀏覽器確認 V3.5 受保護。正式 GitHub Pages 首頁和兩個 V3.4 入口仍應可開啟。
