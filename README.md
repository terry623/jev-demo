# Jev Decision Lab

繁體中文互動展示，使用 TypeSafe `jev-latest` 一次執行 Choice、Noul、Score 三個獨立判斷。提供客服分流、內容審核、購買意圖情境，展示原始機率、信心、等級、API 耗時及 token 用量。

## 開發

```sh
npm ci
# 建立 .dev.vars，加入 TYPESAFE_API_KEY（此檔案已被 gitignore）
npm run dev
npm test
npm run check
```

前端為原生 ES modules；Cloudflare Worker 代理 API，金鑰只存在伺服器環境。問題定義固定在 scenarios.js，使用者只能提交情境及最多 2000 字的訊息。每 IP 每分鐘 12 次請求的 Cloudflare rate-limit binding 是近似、依位置計算的流量控制，不是全域費用上限。網站不保存使用者輸入；執行分析會將輸入送到 TypeSafe。

## 部署

依專案規則先 `git add -A`、commit、push，再以官方 Wrangler 發布：

```sh
npx wrangler secret put TYPESAFE_API_KEY
npm run deploy
```

勿把金鑰放入 public、原始碼、README 或 Git。`.dev.vars` 僅供本機。

## 判讀結果

- Choice：選項機率總和為 1；confidence 表示分布集中程度，不等於正確率。
- Noul：0–1 是條件成立的機率，0.5 代表不確定，不代表中等強度。
- Score：四個具體等級的加權平均，範圍 0–3，保留每級機率。
- 結果來自實際 API；初始介面沒有假資料。更改輸入會清除舊結果。
- 本 demo 展示模型訊號，不會自動寄信、封鎖帳號或執行業務動作。

## 官方參考

- https://docs.typesafe.ai/api.md
- https://docs.typesafe.ai/primitives/score.md
- https://docs.typesafe.ai/cookbooks/function_calling.md
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
