# xhs-dash：xhs-title 数据看板

- 页面：GitHub Pages，`noindex`，只放汇总数字，不加载任何第三方资源。
- `.github/workflows/dashboard.yml`：每 15 分钟用 secret `GOATCOUNTER_TOKEN`（GoatCounter 只读 token）拉 API，读 `data/x.json`、`data/xhs.json`，生成 `public/` 并部署。token 只在 Actions 环境变量里，不写入任何文件（脚本会检查输出里不含 token）。
- `.github/workflows/snapshot.yml`：每天 09:05 北京时间把前一天数据写到 `snapshots/YYYY-MM-DD.{md,json}`。
- 空项（null / 空列表）自动隐藏；每块标注更新时间和频率。
- 口径：GoatCounter API 的数字是"访客"（同一会话内同一事件只算 1），不是点击总次数。
- 字段定义：`docs/xhs-json.md`、`docs/x-json.md`。

本地预览：`GOATCOUNTER_TOKEN=... node scripts/build.mjs && npx serve public`
