# data/x.json 字段定义（X 公开指标，占位）

由 agent 用 X 只读连接器每天 09:00、21:00（北京时间）采集公开指标后提交。连接器拿不到的非公开指标（链接点击、主页点击）不写。

| 字段 | 含义 |
|---|---|
| account | 账号，如 `@Nick_8343` |
| updated_at_bj | 采集时间（北京时间） |
| freq | 采集频率说明 |
| followers | followers_count |
| followers_delta | 较上次采集的变化 |
| posts[] | `{id, label, created_at, impressions, likes, bookmarks, replies, reposts, quotes}`，对应 public_metrics 的 impression_count / like_count / bookmark_count / reply_count / retweet_count / quote_count |
