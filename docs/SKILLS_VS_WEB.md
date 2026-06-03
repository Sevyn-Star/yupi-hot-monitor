# HotPulse：Web 版 vs Agent Skills 对比

| 维度 | Web 版（本仓库） | Agent Skills（`skills/hot-monitor/`） |
|------|------------------|--------------------------------------|
| 运行方式 | 浏览器 + Node 后端，SQLite 持久化 | Claude/Cursor 中按需调用脚本 |
| 关键词 | 仪表盘管理，支持分类与模板一键导入 | 对话中指定，无内置数据库 |
| 数据源（监控/搜索） | Twitter、Bing、HN、搜狗、B站、微博（设置可开关） | 另含 Google、DuckDuckGo 等脚本 |
| 定时扫描 | Cron + 可配置间隔 | 无，由用户或外部调度触发 |
| AI 分析 | OpenRouter，入库时 analyze | 由 Agent 阅读报告后分析 |
| 通知 | 站内、邮件（SMTP）、Webhook（钉钉/飞书/通用） | 无内置推送 |
| 报告 | `GET /api/hotspots/report` 导出 Markdown | `generate_report.py` 从 JSON 生成 |
| 适用场景 | 长期监控、团队演示、Docker 部署 | 临时调研、与对话深度结合 |

## 数据源对齐说明

Web 版定时任务与「全网搜索」默认使用 **6 源**（与 `server/src/services/settings.ts` 中 `SOURCE_IDS` 一致）。Skills 目录下另有 `search_google.py`、`search_duckduckgo.py`，可在 Agent 会话中手动组合，尚未并入 Web 定时扫描。

## 报告格式

两者均输出 **按来源分组的 Markdown**，含标题、链接与互动数据（Skills 含热度标签）。Web 版报告基于 **已入库且经 AI 筛选** 的热点；Skills 报告基于 **单次搜索原始结果**，需 Agent 再做重要性判断。

## 推荐使用方式

- **7×24 监控**：Web 版 + 配置关键词模板 + 邮件/Webhook。
- **一次性深度调研**：Skills 多源搜索 + `generate_report.py` + Agent 解读。
- **两者结合**：Web 入库长期趋势，Skills 补充 Google/DDG 等即时检索。
