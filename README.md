# Jev Pixel Lab

繁體中文像素創作實驗室，部署於 Cloudflare Workers。舊版 Decision Lab、客服分流／內容審核／購買意圖 UI 與 `/api/evaluate` 均已移除。

## 創作流程

1. 輸入描述，選擇三組 16 色調色盤之一。
2. 預設啟用「構圖引導」：Jev 先回答 65 個 Choice 問題，選擇背景、一般幾何圖層的形狀、顏色、位置、尺寸與相對連接關係。程式計算各像素與這些形狀的交集，提供給後續判斷。沒有硬編碼的物件圖樣或預繪素材。
3. 四個並行 API 請求，各詢問 64 個像素的顏色，合計 256 次 Choice 判斷。NDJSON 串流在每批真實模型結果抵達時更新畫布。
4. 可追加 0–3 輪自動修正，或修改描述後手動追加一輪。修正會提供每格上一輪的顏色與 3×3 鄰域。
5. 點選像素查看前五名候選色、全部 16 色的原始機率與信心。可切換信心熱圖、格線、版本快照，下載 1024×1024 PNG（16×16 最近鄰放大）。

「構圖引導」可以關閉，以比較純逐像素分類。直接讓像素各自想像，容易產生色塊或缺少細節；幾何引導能改善簡單物件，但不是通用擴散模型，也不保證複雜場景的品質。信心代表候選分布集中度，不是畫作正確率。

所有色彩結果都使用實際 Jev API；未完成的一輪不會保存成作品。停止或失敗會保留已完成版本。快照僅保留在目前分頁記憶體，關閉或重新整理即消失。

## 技術

- 原生 HTML / CSS / JavaScript ES modules，CSS Grid 像素畫布，Canvas PNG 匯出。
- Cloudflare Workers + Static Assets。
- TypeSafe HTTP API `jev-latest`，伺服器固定題目與調色盤；金鑰存在 Cloudflare Secret。
- 每 IP 每分鐘 12 個生成輪次的 Cloudflare rate-limit binding。限制依 Cloudflare 位置計算，是近似流量保護，不是全域費用上限；引導輪次包含 5 個 upstream requests，純像素輪次包含 4 個。
- 每次請求最多 600 字描述、16×16 合法顏色索引、12 KB body，並有逾時與串流取消處理。模型暫時忙碌時最多重試一次。
- 本站不把描述寫入資料庫；描述送到 TypeSafe 進行推論。不要在描述輸入敏感資訊。

## 本機執行

```sh
npm ci
# 建立被 Git 忽略的 .dev.vars，設定 TYPESAFE_API_KEY
npm run dev
npm run check
npm test
```

## 發布

依專案要求先 `git add -A`、commit、push，再使用官方 Wrangler。

```sh
# 第一次設定，或更新 API key 時
npx wrangler secret put TYPESAFE_API_KEY
npm run deploy
```

保留 Worker 名稱 `jev-decision-lab` 以沿用原公開網址及已設定的 secret；站內內容已完整替換為 Pixel Lab。

## 參考與致謝

概念參考 [Wizhill05/typesafe-image-diffusion](https://github.com/Wizhill05/typesafe-image-diffusion)。本專案自行實作 Cloudflare 代理、串流、介面、通用幾何構圖引導及測試。

- [TypeSafe API](https://docs.typesafe.ai/api.md)
- [TypeSafe Models and limits](https://docs.typesafe.ai/models.md)
- [Cloudflare rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
