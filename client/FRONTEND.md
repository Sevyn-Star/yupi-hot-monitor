# 前端目录说明

> **文档名：** `FRONTEND.md`  
> **路径：** `client/FRONTEND.md`

## 目录结构

```
client/src/
├── App.tsx                 # 路由入口 + ErrorBoundary
├── main.tsx
├── layouts/
│   └── AppLayout.tsx       # 壳层：背景、Header、Nav、Outlet、详情抽屉
├── pages/
│   ├── DashboardPage.tsx   # 热点雷达（/）
│   ├── KeywordsPage.tsx    # 监控词（/keywords）
│   ├── SearchPage.tsx      # 搜索（/search）
│   └── SettingsPage.tsx    # 设置（/settings）
├── components/
│   ├── HotspotCard.tsx     # 热点卡片（full / compact）
│   ├── StatsCards.tsx
│   ├── NotificationPanel.tsx
│   ├── AppHeader.tsx
│   ├── AppNav.tsx
│   ├── SettingsPanel.tsx
│   ├── SystemStatusPanel.tsx  # 扫描状态、源健康、AI 统计
│   ├── ScanStatusBar.tsx
│   ├── HotspotDetailDrawer.tsx
│   ├── FilterSortBar.tsx
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   ├── Toast.tsx
│   ├── ErrorBoundary.tsx
│   └── ui/                 # Aceternity 特效组件
├── context/
│   └── AppContext.tsx      # 全局：关键词、通知、扫描、Toast
├── hooks/
│   ├── useToast.ts
│   └── useHotspots.ts      # 仪表盘列表 + 筛选分页
├── services/
│   ├── api.ts
│   └── socket.ts
└── utils/
    ├── hotspotDisplay.tsx  # 热度分、来源图标等
    ├── sortHotspots.ts
    └── relativeTime.ts
```

## 路由

| 路径 | 页面 |
|------|------|
| `/` | 热点雷达 |
| `/keywords` | 监控词 |
| `/search` | 搜索 |
| `/settings` | 设置 |
| `/hotspots/:id` | 打开详情抽屉（深链，仍显示雷达页） |

## 修改指南

- 改 **列表卡片样式** → `components/HotspotCard.tsx`
- 改 **仪表盘筛选/分页** → `pages/DashboardPage.tsx` + `hooks/useHotspots.ts`
- 改 **监控词逻辑** → `pages/KeywordsPage.tsx` 或 `context/AppContext.tsx`
- 改 **搜索** → `pages/SearchPage.tsx`
- 改 **设置** → `components/SettingsPanel.tsx`
