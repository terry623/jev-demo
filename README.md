# Jev 小世界 · 微光島

八位不同個性的居民生活在一座可干預的小島。文字公告、天氣、停電、共享食物、物品和島規會影響下一輪 Jev 決策。

## 技術

原生 HTML / CSS / JavaScript、SVG 小島、Cloudflare Workers + Static Assets。伺服器透過 TypeSafe System One HTTP API 使用 `jev-latest`，金鑰僅存在 Worker secret / 本機 `.dev.vars`。

- `public/world.js`：固定人物、世界狀態、需求、資源與行動結算。
- `src/decisions.js`：批次 Choice 問題與完整機率驗證。
- `src/worker.js`：輸入驗證、來源檢查、速率限制、逾時與 API 路由。
- `public/app.js`：觀察控制、SVG 角色、角色面板、本機儲存。

每回合 8 個行動 Choice，加上 8 個社交對象 Choice，在同一份狀態上批次推論。社交對象只在分享／求助時使用。程式依輪替優先順序結算競爭，同時保留模型意圖和實際結果。記憶保留最近 6 則，世界日誌最近 70 則。沒有假造模型推論或背景離線模擬。

自然語言干預會解析天氣、電力、食物、派對、島規與物品 6 個維度。支援兩份／歸零／增加 8 份食物、食物箱（4份）、雨傘（3把）、發電機、音箱與神祕物件；未支援的物理效果不會自動生成新程式，公告仍提供角色理解。相同類型的物品使用固定名稱。果樹每 3 回合補充最多 4 份。自動模式每次完成後等待 12 秒，最多連跑 12 回合，隱藏分頁即暫停。

世界由瀏覽器保存；此為可修改本機狀態的單人沙盒，並非防作弊的多人伺服器。API 不存取私人資源。Choice 機率代表可用行動的相對傾向，並非客觀真實心理。

## 開發與測試

```sh
npm install
# 將 TYPESAFE_API_KEY 設定於忽略的 .dev.vars；勿放進 public/
npm run dev
npm run check
npm test
```

## 部署

使用 Cloudflare 官方 Wrangler。先 `git add -A`、commit、push 目前分支，成功後才執行 `npm run deploy`。已有 `TYPESAFE_API_KEY` Worker secret 與每分鐘 12 次的 IP rate limiter。

部署網址：https://jev-decision-lab.terry9251623.workers.dev

舊 Pixel Lab 與 `/api/pixels` 已移除（404）。

官方文件：[HTTP API](https://docs.typesafe.ai/api)、[Choice](https://docs.typesafe.ai/primitives/choice)、[Function calling](https://docs.typesafe.ai/cookbooks/function_calling)。
