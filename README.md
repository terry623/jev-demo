# Jev 像素畫室

手機優先的像素畫室。輸入停頓 1 秒即生成；中文輸入法組字期間不啟動。後續輸入立即取消舊請求，只接受最新版本的串流。小世界已移除。

## 畫作

- 原生 32 / 48 / 64 像素，預設 64 × 64（4,096 像素，為舊 16 × 16 的 16 倍）。
- 三組各 32 色的調色盤。
- Jev 兩階段規劃最多 16 個通用幾何部件，選擇輪廓、位置、顏色、材質與照明；程式維持部件連接和尺寸約束，並進行原生解析度光柵化。
- Jev 再批次判斷較大主體的內部像素是否保留、柔化或加深已有光影。背景、輪廓與小型扁平細節直接沿用構圖，並非每一像素皆單獨呼叫模型。
- 128 題一批、最多 4 個同時進行，64px 最多 32 批；兩次構圖加上全流程最多 4 次重試，不超過 38 次上游請求。
- 構圖預覽與細化結果逐步串流顯示；失敗或中止保留預覽，但不假裝生成完成。
- 這是 Jev 結構化決策的像素繪畫實驗，複雜場景、文字與精確位置不保證能準確呈現。

## 手機體驗

使用 Visual Viewport 調整可視高度，鍵盤展開時保留畫布與輸入，收起次要選項。輸入字級 16px 避免 iOS 聚焦自動縮放；安全區適配、觸控色盘、可捲動靈感列、放大檢視、沒有外部字型下載。

儲存輸出為原生尺寸 × 16 的整數放大 PNG（預設 1024 × 1024），關閉平滑處理。支援檔案分享的觸控裝置開啟系統分享選單；其餘使用下載。最多 6 張完成作品保存於本機瀏覽器，草稿、細緻度和色盤一起保存。切換到背景時取消待處理生成。

## 架構

原生 HTML / CSS / ES Modules、Canvas、Cloudflare Worker + Static Assets。

- `src/art.js`：TypeSafe Choice 構圖、光柵化、逐像素光影與回應驗證。
- `src/worker.js`：輸入驗證、IP 限速、有限併發、串流、取消、逾時與退避重試。
- `public/autodraw.js`：可測試的防抖、IME 與取消排程。
- `public/app.js`：手機畫室、串流更新、版本隔離、PNG 匯出與歷史。

TypeSafe API 金鑰只放在忽略的 `.dev.vars` / Cloudflare `TYPESAFE_API_KEY` secret，不進入公開資產。

```sh
npm install
npm run dev
npm run check
npm test
```

## 部署

依專案規則先 `git add -A` → commit → push 目前分支，成功後使用 Cloudflare 官方 Wrangler：`npm run deploy`。

https://jev-decision-lab.terry9251623.workers.dev

`/api/pixels` 為唯一模型端點。舊小世界 `/api/step`、`/api/intervene` 返回 404。

官方參考：[API](https://docs.typesafe.ai/api)、[Choice](https://docs.typesafe.ai/primitives/choice)、[Function calling](https://docs.typesafe.ai/cookbooks/function_calling)。
