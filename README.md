# AI 热点监控工具

> **个人作品**：在 [程序员鱼皮](https://yuyuanweb.feishu.cn/wiki/Abldw5WkjidySxkKxU2cQdAtnah) 原版教学项目基础上二次开发与功能完善。
>
> 原项目为 AI 编程实战教程，本仓库为本人学习后的独立实现与扩展版本。




## 一、项目介绍

这是一套以 **AI 编程实战** 为核心的项目教程，基于 Express 5 + React 19 + OpenRouter + Socket.io，用 AI 编程的方式从 0 到 1 开发一个《AI 热点监控工具》，带你亲身体验 AI Vibe Coding 的完整工作流，学会用 AI 快速做出实用的提效工具！

📺 项目介绍视频，快速查看成品效果：https://bilibili.com/video/BV1g8d8B6ENk

![](https://pic.yupi.icu/1/image-20260304102630302.png)

输入要监控的关键词，系统自动从 Twitter、Bing、HackerNews、搜狗、B 站等 **8+** 个信息源聚合抓取内容，利用 AI 进行真假识别和相关性分析，并通过 WebSocket 实时推送和邮件通知用户。此外，还将热点监控能力封装为 **Agent Skills 技能包**，让 Cursor、VSCode Copilot、Claude Code 等 AI 编程工具也能直接使用。



### 为什么做这个项目？

鱼皮作为 AI 编程博主，要利用工具第一时间自动发现最新的热点（比如 AI 大模型的更新），并且及时给我发送通知，让我能够走在吃瓜第一线。

既然如此，**不如做一个更通用的工具**。

这就是 AI 热点监控工具的起点：让 AI 帮你盯热点，第一时间获取优质信息！

![](https://pic.yupi.icu/1/AI%E7%83%AD%E7%82%B9%E7%9B%91%E6%8E%A7%E5%AF%B9%E8%AF%9D%E6%A1%86.jpg)



### 6 大核心能力

1）配置监控关键词，支持激活 / 暂停。

![](https://pic.yupi.icu/1/image-20260304102804249.png)



2）AI 自动从 8+ 数据源抓取和分析热点，利用 AI 进行查询扩展、真假识别、相关性分析和智能摘要。

![](https://pic.yupi.icu/1/image-20260304103025682.png)



3）多维度筛选和排序，按来源、重要性、时间范围筛选，按热度、相关性、时间排序。

![](https://pic.yupi.icu/1/image-20260304103219366.png)



4）全网搜索，输入关键词从多个数据源聚合搜索。

![](https://pic.yupi.icu/1/image-20260304103824666.png)



5）实时通知，WebSocket 实时推送 + 邮件通知。

![](https://pic.yupi.icu/1/image-20260304104139285.png)



6）Agent Skills 技能包，安装后在 Cursor、VSCode Copilot、Claude Code 中都能直接使用。

![](https://pic.yupi.icu/1/1772099941189-4fb78679-12ac-4b92-a7b4-b5b4645b09d4.png)

### 实现状态说明（与代码一致）

> 详细对照表见 **[docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md)**。以下为当前 Web 版要点，避免宣传与实现不符。

| 能力 | 实现情况 | 说明 |
|------|----------|------|
| 1）关键词监控 | ✅ 已完成 | 增删、激活/暂停、「监控词」Tab |
| 2）多源抓取 + AI | ✅ 已完成 | **10 源**（含 Google / GitHub / Hugging Face / DuckDuckGo），设置页可开关 |
| 3）筛选排序 | ✅ 已完成 | 来源、重要性、时间、真假、热度等 |
| 4）全网搜索 | ✅ 已完成 | 与监控同源；支持**一键入库** |
| 5）实时通知 | ✅ 已完成 | WebSocket + 站内 + 邮件/Webhook + 可选每日日报 |
| 6）Agent Skills | ✅ 已完成 | `skills/hot-monitor/`，见 [SKILLS_VS_WEB.md](docs/SKILLS_VS_WEB.md) |

**其它说明：** 单用户本地工具；扫描间隔在设置页配置；变更见 [CHANGELOG.md](CHANGELOG.md)。



## 二、项目优势

本项目选题新颖，紧跟 AI 编程时代，以 **实用工具开发** 为导向，区别于增删改查的烂大街项目。项目内容精炼，**不到一周就能学完**，带你掌握 AI 编程的完整工作流，给你的简历和求职大幅增加竞争力！

技术丰富，覆盖 AI 编程全链路：

![](https://pic.yupi.icu/1/image-20260304101227060.png)

从这个项目中你可以学到：

- 如何用 AI 编程从 0 到 1 开发一个完整的工具？
- 如何安装和使用 MCP 增强 AI 能力？
- 如何安装和使用 Agent Skills 提升 AI 编程质量？
- 如何从多个信息源（Twitter、Bing、HN、B 站等）聚合抓取内容？
- 如何通过 OpenRouter 接入 AI 大模型，实现智能内容审核？
- 如何实现查询扩展（Query Expansion），提高信息检索的召回率？
- 如何基于 Socket.io 实现 WebSocket 实时推送？
- 如何使用 Aceternity UI 打造炫酷的科技感前端界面？
- 如何开发标准化的 Agent Skills 技能包，并在多种 AI 工具中验证？
- 如何在 AI 编程中进行人工确认、版本控制和迭代优化？



## 三、更多介绍

📄 **[功能与实现说明（docs/PROJECT_OVERVIEW.md）](docs/PROJECT_OVERVIEW.md)** — 完整架构、六大功能实现细节与代码索引

📊 **[功能矩阵（docs/FEATURE_MATRIX.md）](docs/FEATURE_MATRIX.md)** — 功能 × 后端 × 前端 × 测试对照与已知限制

📋 **[项目完善规划（docs/项目完善规划.md）](docs/项目完善规划.md)** — 现状评估、分阶段完善路线与验收清单

📂 **[前端目录说明（client/FRONTEND.md）](client/FRONTEND.md)** — pages / components / hooks 结构与路由

🚢 **[部署指南（docs/DEPLOY.md）](docs/DEPLOY.md)** — 一键 dev、Docker、Nginx 生产配置

🔗 **[Web 版 vs Skills（docs/SKILLS_VS_WEB.md）](docs/SKILLS_VS_WEB.md)** — 数据源、报告与使用场景对比

📸 **[截图目录（docs/screenshots/）](docs/screenshots/)** — 本地截图存放说明

📜 **[CHANGELOG.md](CHANGELOG.md)** — 版本变更记录

📖 **[使用说明（docs/使用说明.md）](docs/使用说明.md)** — 安装、配置与各页面操作全流程

功能模块：

![](https://pic.yupi.icu/1/image-20260304101313199.png)

架构设计：

![](https://pic.yupi.icu/1/image-20260304101440202.png)



## 四、快速运行

> 详细的保姆级教程请参考 [本地运行指南](docs/LOCAL_SETUP.md)

### Quick Start（3 分钟演示）

```bash
git clone https://github.com/liyupi/yupi-hot-monitor.git
cd yupi-hot-monitor
npm run install:all
cp server/.env.example server/.env   # 填入 OPENROUTER_API_KEY
npm run demo                          # 迁移数据库 + 演示数据
npm run dev                           # 前端 :5173  后端 :3001
```

浏览器打开 http://localhost:5173 → 热点雷达可见示例数据；**监控词** 页可改词；**设置** 页可开关数据源。

### 前置条件

- Node.js ≥ 18（推荐 20 LTS）
- 一个 [OpenRouter API Key](https://openrouter.ai/settings/keys)（必需，用于 AI 分析）

### 1. 克隆并安装依赖

```bash
git clone https://github.com/liyupi/yupi-hot-monitor.git
cd yupi-hot-monitor

# 后端
cd server
npm install
npx prisma generate
npx prisma db push

# 前端
cd ../client
npm install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，至少填入 OpenRouter API Key：

```bash
OPENROUTER_API_KEY=sk-or-v1-你的key
# Twitter API Key（可选）
TWITTER_API_KEY=你的key
```

### 3. 启动服务（两个终端）

```bash
# 终端 1：启动后端（端口 3001）
cd server && npm run dev

# 终端 2：启动前端（端口 5173）
cd client && npm run dev
```

访问 **http://localhost:5173** ，输入关键词即可开始监控热点 🔥

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| 数据库管理 | `cd server && npx prisma studio`（可选） |

更多细节请查看 [保姆级本地运行指南](docs/LOCAL_SETUP.md)。

### 一键启动（根目录）

```bash
npm install && npm run install:all
cd server && cp .env.example .env && npx prisma generate && npx prisma db push && cd ..
npm run dev
```

生产部署与 Docker 见 **[docs/DEPLOY.md](docs/DEPLOY.md)**。