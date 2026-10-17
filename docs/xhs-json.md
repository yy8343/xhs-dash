# data/xhs.json 字段定义（小红书人工录入）

- 录入方式：每天 1 次，在已登录小红书网页版的浏览器里打开创作者中心，按下表抄数，改完提交到本仓库 `main`（提交后看板几分钟内更新）。
- 规则：**后台没有的项不要填 0，直接删掉该字段或写 `null`**，看板会自动隐藏；数字填整数，不带"w""万"等单位（1.2万 → 12000）。
- 只录聚合数字，不录评论内容、用户昵称或任何个人信息。

```json
{
  "updated_at_bj": "2026-10-18 09:10 北京时间",
  "recorded_by": "COO",
  "account": {
    "name": "0粉起号日记",
    "followers": 47,
    "followers_delta": 12,
    "likes_and_collects": 130
  },
  "notes": [
    {
      "id": "可选，笔记链接里的 ID",
      "title": "Day3：0粉起号日记",
      "published_at": "2026-10-16",
      "views": 1240,
      "likes": 38,
      "collects": 21,
      "comments": 7,
      "shares": null,
      "new_followers": 12
    }
  ]
}
```
（以上数字为【示例数据】，不是真实统计。）

| 字段 | 类型 | 必填 | 含义 / 从哪抄 |
|---|---|---|---|
| updated_at_bj | string | 是 | 抄数的时间，格式 `YYYY-MM-DD HH:mm 北京时间` |
| recorded_by | string | 否 | 谁录的（如 COO） |
| account.name | string | 是 | 账号名 |
| account.followers | int\|null | 否 | 累计粉丝（主页/创作者中心） |
| account.followers_delta | int\|null | 否 | 较上次录入新增粉丝（后台若有"昨日新增"直接用；否则 = 今天累计 − 上次累计） |
| account.likes_and_collects | int\|null | 否 | 主页"获赞与收藏" |
| notes[] | array | 否 | 每篇笔记一项，建议只保留近 14 天内的 |
| notes[].id | string | 否 | 笔记 ID |
| notes[].title | string | 是 | 笔记标题（看板显示用） |
| notes[].published_at | string | 否 | 发布日期 `YYYY-MM-DD` |
| notes[].views | int\|null | 否 | 曝光/观看/阅读（以后台实际字段名为准，在 `field_notes` 里写明） |
| notes[].likes | int\|null | 否 | 点赞 |
| notes[].collects | int\|null | 否 | 收藏 |
| notes[].comments | int\|null | 否 | 评论 |
| notes[].shares | int\|null | 否 | 分享（后台有才填） |
| notes[].new_followers | int\|null | 否 | 该笔记带来的涨粉（后台有才填） |
| field_notes | string | 否 | 可选：说明口径，例如"views = 创作者中心'观看'" |

后台还有其他有用字段（如"粉丝/非粉占比""搜索来源占比"）时，先在 `field_notes` 记下，告诉 CTO 再加到看板。
