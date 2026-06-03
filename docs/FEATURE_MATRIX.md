# 功能矩阵（FEATURE_MATRIX）

> **文件名：** `docs/FEATURE_MATRIX.md`  
> **维护说明：** 功能或 API 变更时同步更新本表与 `README.md`「实现状态说明」  
> **最后对齐：** 2026-06-02（阶段 0～6：含平台发现、AI 洞察、搜索增强）

本表对照 **文档描述、后端实现、前端 UI、测试** 四项，作为仓库的单一事实来源。

**状态图例：**

| 标记 | 含义 |
|------|------|
| ✅ | 可用且与文档一致 |
| ⚠️ | 核心可用，有已知限制 |
| ❌ | 未实现 |
| N/A | 不适用（如 Skills 无 Web UI） |

---

## 一、六大核心能力对照

| # | README 宣传能力 | 后端 | 前端 | 总体 | 备注 |
|---|----------------|------|------|------|------|
| 1 | 配置监控关键词，激活/暂停 | ✅ | ✅ | ✅ | 增删改、分类、模板、JSON 导入导出 |
| 2 | 8+ 数据源 + AI 分析 | ✅ | ✅ | ✅ | Web **10 源** + 账号检测；设置页可开关 |
| 3 | 多维度筛选与排序 | ✅ | ✅ | ✅ | 仪表盘与搜索 Tab 共用 `FilterSortBar` |
| 4 | 全网即时搜索 | ✅ | ✅ | ✅ | `aggregateSearch`；支持**一键入库** |
| 5 | 实时通知 | ✅ | ✅ | ✅ | WebSocket、站内、邮件、Webhook、可选每日日报 |
| 6 | Agent Skills | ✅ | N/A | ✅ | `skills/hot-monitor/`；见 [SKILLS_VS_WEB.md](./SKILLS_VS_WEB.md) |

---

## 二、功能明细矩阵

### 2.1 关键词与监控

| 功能 | 后端 | 前端 UI | 测试 | 状态 |
|------|------|---------|------|------|
| 添加关键词 | `POST /api/keywords` | 监控词 Tab | - | ✅ |
| 删除关键词 | `DELETE /api/keywords/:id` | 监控词 Tab | - | ✅ |
| 更新关键词（文案/分类） | `PUT /api/keywords/:id` | `KeywordEditModal` | - | ✅ |
| 激活/暂停 | `PATCH /api/keywords/:id/toggle` | 开关 | - | ✅ |
| 关键词分类 `category` | Prisma 字段 | 添加/编辑下拉 | - | ✅ |
| 预设模板一键导入 | `GET /templates` + `POST /import` | 模板卡片 | `api.test` | ✅ |
| JSON 导出/导入 | `GET /export` + `POST /import` | 导出/导入按钮 | `api.test` | ✅ |
| 上次扫描时间 | `Keyword.lastScannedAt` | 监控词列表展示 | - | ✅ |
| 定时扫描 | `cron.ts` → `hotspotChecker` | 设置页间隔 + 状态栏 | - | ✅ |
| 手动立即扫描 | `POST /api/check-hotspots` | 顶栏按钮 | - | ✅ |
| 扫描进度/锁/统计 | `GET /api/scan/status` | `ScanStatusBar`、`SystemStatusPanel` | `api.test` | ✅ |
| WebSocket 按词订阅 | `keyword:*` room | `socket.ts` | - | ✅ |
| 演示数据 | `prisma/seed.ts` | 空状态引导 | - | ✅ `npm run demo` |

### 2.2 数据源与抓取（Web 默认可用 10 源）

| 数据源 | 定时监控 | 即时搜索 | 实现 | 依赖/说明 |
|--------|----------|----------|------|-----------|
| Twitter/X | ✅ | ✅ | `twitter.ts` | `TWITTER_API_KEY` 可选 |
| Bing | ✅ | ✅ | `search.ts` | 无 |
| Google | ✅ | ✅ | `search.ts` | HTML 抓取，可能限流 |
| DuckDuckGo | ✅ | ✅ | `search.ts` | HTML 抓取 |
| Hacker News | ✅ | ✅ | `search.ts` | Algolia API |
| GitHub | ✅ | ✅ | `communitySearch.ts` | 可选 `GITHUB_TOKEN` |
| Hugging Face | ✅ | ✅ | `communitySearch.ts` | Hub Models API |
| 搜狗 | ✅ | ✅ | `chinaSearch.ts` | 无 |
| Bilibili | ✅ | ✅ | `chinaSearch.ts` | 无 |
| 微博热搜 | ✅ | ✅ | `chinaSearch.ts` | 无 |
| 平台账号检测 | ✅ | ✅ | `detectAndFetchAccount` | 随聚合搜索 |

| 能力 | 后端 | 状态 |
|------|------|------|
| 多源并行 `Promise.allSettled` | `aggregateSearch.ts` | ✅ |
| 去重 / 新鲜度 / 来源优先级 | `hotspotFilters.ts` | ✅ |
| 配额 Twitter 15 + 其他 10 | `hotspotChecker.ts` | ✅ |
| 数据源健康检查 | `GET /api/health/sources` | ✅ |
| CLI 调试 | `test-sources.ts` | ✅ |

**设置：** `enabledSources` 存 DB，默认 10 源；旧版 6 源全选配置会自动合并 Google/GitHub/HF/DDG。

### 2.2.1 平台发现（Phase 1～2）

| 功能 | 后端 | 前端 | 测试 | 状态 |
|------|------|------|------|------|
| 纯榜单（无关键词） | `POST /api/discover` | 「平台发现」Tab | `discover.test` | ✅ |
| GitHub 日/周/月趋势 | `githubAdapter` Trending + Search API | 时间范围选择 | - | ✅ |
| 微博实时热搜榜 | `weiboAdapter` | 平台选择 | - | ✅ |
| Hacker News 热点 | `hackernewsAdapter` Algolia | 平台选择 | - | ✅ Phase 2 |
| Bilibili 热门/排行榜 | `bilibiliAdapter` popular + ranking | 播放量等排序 | - | ✅ Phase 2 |
| Hugging Face 热门模型 | `huggingfaceAdapter` Hub API | 下载量/趋势分 | - | ✅ Phase 2 |
| 指标排序（Star/播放量等） | `sortBy` 参数 | 可点击排序芯片 | - | ✅ |
| Top 5 AI 分析 | `discoveryAi.ts` | 卡片 AI 标记 | - | ✅ |
| 榜单快照 `PlatformSnapshot` | `snapshots.ts` | 趋势条 | - | ✅ |
| 快照历史 / 趋势曲线 | `GET /api/discover/snapshots`、`/trends` | 近 7 天柱状图 | - | ✅ |
| Google/Bing 榜单模式 | 未接入 | 说明文案 | - | ❌ 故意排除 |

### 2.2.2 搜索页增强（Phase 3）

| 功能 | 后端 | 前端 | 测试 | 状态 |
|------|------|------|------|------|
| 单平台搜索 | `sources[]` on `POST /search` | `SearchOptionsPanel` | `api.test` | ✅ |
| 时间范围下传 | `timeWindow` → discovery/后处理 | 今天/7天/30天 | `searchPostProcess.test` | ✅ |
| 指标排序下传 | `sortBy` → discovery/后处理 | 可点击排序芯片 | `searchPostProcess.test` | ✅ |
| 多源合并排序 | `sortSearchResults` | - | - | ✅ |
| 单源跳过账号检测 | `includeAccountDetection` | - | - | ✅ |

### 2.2.3 AI 热点洞察（平台发现页）

| 功能 | 后端 | 前端 | 测试 | 状态 |
|------|------|------|------|------|
| 关键词规则抽取 | `keywordExtract.ts` | 条形图 + 点击筛选 | `keywordExtract.test` | ✅ |
| 跨快照聚合 | `insightSnapshots.ts` | - | - | ✅ |
| AI 主题/总结/周对比 | `insightAi.ts` | 洞察面板 | - | ✅ |
| 洞察缓存 `DiscoveryInsight` | `insightService.ts` | 今日/7天/30天 Tab | `discover.test` | ✅ |
| `GET/POST insight` API | `/api/discover/insight` | `DiscoveryInsightPanel` | - | ✅ |

### 2.3 AI 分析

| 功能 | 后端 | 前端 | 测试 | 状态 |
|------|------|------|------|------|
| 查询扩展 | `expandKeyword` | - | - | ✅ |
| 内容分析 | `analyzeContent` | 摘要/可信度/理由 | `aiRelevance.test` | ✅ |
| 预匹配 | `preMatchKeyword` | - | - | ✅ |
| 入库过滤 | `hotspotChecker` + `hotspotFilters` | - | `hotspotFilters.test` | ✅ |
| 无 Key 降级 | `ai.ts` fallback | - | `aiRelevance.test` | ✅ |
| 调用统计 | `GET /api/health/ai-stats` | 设置页 | - | ✅ |

**必需：** `OPENROUTER_API_KEY`

### 2.4 热点列表、搜索与报告

| 功能 | 后端 | 前端 | 测试 | 状态 |
|------|------|------|------|------|
| 列表分页/筛选/排序 | `GET /api/hotspots` | 热点雷达 + `FilterSortBar` | `sortHotspots.test` | ✅ |
| 统计卡片 | `GET /api/hotspots/stats` | `StatsCards` | `api.test` | ✅ |
| 近 7 天趋势 | `GET /api/hotspots/trends` | `TrendPanel` | `api.test` | ✅ |
| 详情抽屉 | `GET /api/hotspots/:id` | `HotspotDetailDrawer`、路由 `/hotspots/:id` | - | ✅ |
| 删除热点 | `DELETE /api/hotspots/:id` | 卡片/抽屉 | - | ✅ |
| 即时搜索 | `POST /api/hotspots/search` | 搜索 Tab | - | ✅ |
| 搜索入库 | `POST /api/hotspots/save` | 全部/单条入库 | `api.test` | ✅ |
| Markdown 报告 | `GET /api/hotspots/report` | `ReportExportButton` | `api.test` | ✅ |
| 热度综合分 | - | `calcHeatScore`（前端） | - | ✅ |

### 2.5 通知

| 功能 | 后端 | 前端 | 状态 |
|------|------|------|------|
| 入库/手动保存写通知 | `hotspotChecker` / `persistHotspot` | - | ✅ |
| 站内列表 | `GET /api/notifications` | 铃铛面板 | ✅ |
| 已读 / 全部已读 | `PATCH` | 面板 | ✅ |
| 删除单条通知 | `DELETE /api/notifications/:id` | 面板删除 | ✅ |
| WebSocket 推送 | `hotspot:new`、`notification` | Toast + 刷新 | ✅ |
| 点击通知打开详情 | - | `handleNotificationClick` | ✅ |
| 高优先级邮件 | `email.ts` | 设置开关 | ⚠️ 需 `.env` SMTP |
| Webhook（钉钉/飞书/通用） | `webhook.ts` | 设置 + 测试发送 | ✅ |
| 每日邮件日报 08:00 | `dailyReport.ts` + cron | 设置开关 | ⚠️ 需 SMTP |

### 2.6 系统设置与健康

| 功能 | 后端 | 前端 | 状态 |
|------|------|------|------|
| 扫描间隔 5–1440 分钟 | `PUT /api/settings` | `NumberStepperInput` | ✅ |
| 数据源开关（10 源） | DB `enabledSources` | 设置页网格 | ✅ |
| 邮件/Webhook/日报开关 | DB | `SettingsPanel` | ✅ |
| 启动自检 | `GET /api/health/startup` | `StartupBanner` | ✅ |
| 数据源检测 | `GET /api/health/sources` | `SystemStatusPanel` | ✅ |

### 2.7 Agent Skills（独立于 Web）

| 功能 | 路径 | 状态 |
|------|------|------|
| Skill 元数据 | `skills/hot-monitor/SKILL.md` | ✅ |
| 国际源脚本 | `scripts/search_web.py` | ✅ |
| 国内源脚本 | `scripts/search_china.py` | ✅ |
| Twitter 脚本 | `scripts/search_twitter.py` | ✅ |
| 报告生成 | `scripts/generate_report.py` | ✅ |
| Web vs Skills 对比 | `docs/SKILLS_VS_WEB.md` | ✅ |

### 2.8 工程化

| 功能 | 状态 | 备注 |
|------|------|------|
| 服务端单元/集成测试 | ✅ | Vitest：`api`、`sortHotspots`、`aiRelevance`、`hotspotFilters`、`aggregateSearch` |
| Playwright E2E | ✅ | `e2e/smoke.spec.ts`；`npm run test:e2e` |
| CI | ✅ | `.github/workflows/ci.yml` |
| Docker Compose | ✅ | `docker-compose.yml` |
| 部署文档 | ✅ | [DEPLOY.md](./DEPLOY.md) |
| 根目录脚本 | ✅ | `dev`、`demo`、`build`、`test` |
| 前端路由拆分 | ✅ | [client/FRONTEND.md](../client/FRONTEND.md) |

---

## 三、REST API 一览

| 方法 | 路径 | 前端 | 状态 |
|------|------|------|------|
| GET | `/api/health` | 间接 | ✅ |
| GET | `/api/health/startup` | `StartupBanner` | ✅ |
| GET | `/api/health/sources` | 设置页 | ✅ |
| GET | `/api/health/ai-stats` | 设置页 | ✅ |
| POST | `/api/check-hotspots` | 顶栏 | ✅ |
| GET | `/api/scan/status` | 状态栏 | ✅ |
| GET | `/api/keywords` | 监控词 | ✅ |
| GET | `/api/keywords/templates` | 模板 | ✅ |
| GET | `/api/keywords/export` | 导出 | ✅ |
| POST | `/api/keywords/import` | 模板/JSON | ✅ |
| POST | `/api/keywords` | 添加 | ✅ |
| PUT | `/api/keywords/:id` | 编辑 | ✅ |
| PATCH | `/api/keywords/:id/toggle` | 开关 | ✅ |
| DELETE | `/api/keywords/:id` | 删除 | ✅ |
| GET | `/api/hotspots` | 热点雷达 | ✅ |
| GET | `/api/hotspots/stats` | 统计卡 | ✅ |
| GET | `/api/hotspots/trends` | 趋势图 | ✅ |
| GET | `/api/hotspots/report` | 导出报告 | ✅ |
| GET | `/api/hotspots/:id` | 详情抽屉 | ✅ |
| POST | `/api/hotspots/search` | 搜索 Tab | ✅ |
| POST | `/api/hotspots/save` | 搜索入库 | ✅ |
| DELETE | `/api/hotspots/:id` | 删除 | ✅ |
| GET/PUT | `/api/settings` | 设置 Tab | ✅ |
| POST | `/api/settings/webhook/test` | 测试 Webhook | ✅ |
| GET | `/api/notifications` | 铃铛 | ✅ |
| PATCH | `/api/notifications/:id/read` | 已读 | ✅ |
| PATCH | `/api/notifications/read-all` | 全部已读 | ✅ |
| DELETE | `/api/notifications/:id` | 删除 | ✅ |
| GET | `/api/discover/capabilities` | 发现/搜索选项 | ✅ |
| POST | `/api/discover` | 平台发现 Tab | ✅ |
| GET | `/api/discover/trends` | 快照趋势柱图 | ✅ |
| GET | `/api/discover/snapshots` | 快照历史 | ✅ |
| GET | `/api/discover/snapshots/:id` | 单条快照详情 | ✅ |
| GET | `/api/discover/insight` | 洞察缓存 | ✅ |
| POST | `/api/discover/insight/generate` | 生成洞察 | ✅ |

---

## 四、已知限制（对外说明）

1. **Google / 部分源**：依赖 HTML 或公开 API，可能被限流或返回空结果；可在设置中关闭。  
2. **SMTP**：邮件账号密码仅在 `server/.env`；设置页控制开关与日报，不存密钥。  
3. **GitHub API**：未配置 `GITHUB_TOKEN` 时限额较低（约 60 次/小时）。  
4. **单用户**：无登录与多租户；SQLite 本地存储。  
5. **生产部署**：需 Nginx 反代 `/api` 与 `/socket.io`（见 [DEPLOY.md](./DEPLOY.md)）。  
6. **本地开发**：须同时启动后端 `:3001` 与前端 `:5173`；仅开前端会出现 `ECONNREFUSED` 代理错误 → 使用根目录 `npm run dev`。  
7. **发现页快照趋势**：每根柱 = 一次刷新，非按日聚合；与热点雷达「近 7 天趋势」含义不同。

---

## 五、完成阶段索引

| 阶段 | 内容 | 状态 |
|------|------|------|
| 0 | 功能矩阵、文档对齐 | ✅ |
| 1 | 设置页、聚合搜索、扫描状态、通知详情 | ✅ |
| 2 | 前端拆分、路由 | ✅ |
| 3 | 日志、健康检查、AI 统计 | ✅ |
| 4 | CI、Docker、测试、一键 dev | ✅ |
| 5 | 报告、模板、Webhook、Skills 对比 | ✅ |
| A～E | 入库、趋势、demo、E2E、DDG、日报等 | ✅ |
| 6 | 平台发现、快照、AI 洞察、搜索增强 | ✅ |
| — | 多用户登录 | ⏸️ 按需 |

---

## 六、修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-01 | 阶段 0 初版 |
| v1.1 | 2026-06-01 | 阶段 1 |
| v1.2 | 2026-06-01 | 阶段 4 |
| v1.3 | 2026-06-01 | 阶段 5 |
| **v2.0** | **2026-06-01** | **全文重写：10 源、产品化 A～E、API 表与限制说明** |
| v2.1 | 2026-06-02 | 阶段 6 API、发现趋势限制说明 |
