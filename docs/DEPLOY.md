# 部署指南（DEPLOY）

> **文档名：** `DEPLOY.md`  
> **路径：** `docs/DEPLOY.md`

本文说明如何在本地一键启动、使用 Docker 部署后端，以及用 Nginx 托管前端并反代 API / WebSocket。

---

## 一、本地开发（推荐）

### 前置

- Node.js ≥ 18（推荐 20 LTS）
- 已配置 `server/.env`（至少 `OPENROUTER_API_KEY`）

### 一键启动前后端

```bash
# 根目录
npm install          # 安装 concurrently
npm run install:all  # 安装 server + client 依赖

cd server && npx prisma generate && npx prisma db push && cd ..

npm run dev
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| 健康检查 | http://localhost:3001/api/health |

### 演示数据（可选）

```bash
npm run db:seed
```

---

## 二、Docker 部署（仅后端）

适合先跑通 API + 定时任务，前端仍用 `npm run dev` 或静态托管。

### 1. 准备环境变量

```bash
cp server/.env.example server/.env
# 编辑 server/.env
```

### 2. 启动

```bash
docker compose up -d --build
```

- API：`http://localhost:3001`
- SQLite 数据持久化在 Docker volume `hotmonitor-data`

### 3. 查看日志

```bash
docker compose logs -f server
```

---

## 三、生产部署：Nginx + 后端 + 前端静态资源

### 架构

```
浏览器
   │
   ▼
Nginx (443)
   ├── /           → client/dist 静态文件
   ├── /api        → proxy → Node :3001
   └── /socket.io  → proxy (WebSocket) → Node :3001
```

### 1. 构建前端

```bash
cd client
npm ci
npm run build
# 产物在 client/dist
```

### 2. 构建并运行后端

```bash
cd server
npm ci
npx prisma generate
npx prisma db push
npm run build
NODE_ENV=production node dist/index.js
```

或使用 **PM2**：

```bash
pm2 start dist/index.js --name hotpulse-api
```

### 3. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/hotpulse/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 4. 环境变量（生产）

| 变量 | 说明 |
|------|------|
| `OPENROUTER_API_KEY` | 必需 |
| `DATABASE_URL` | 如 `file:/var/lib/hotpulse/prod.db` |
| `PORT` | 默认 3001 |
| `CLIENT_URL` | 前端公网地址，如 `https://your-domain.com` |

---

## 四、CI

推送至 `main` / `master` 或 PR 时，GitHub Actions 会执行：

- `server`：`npm test`（含 API 集成测试）
- `server`：`npm run build`
- `client`：`npm run build`

工作流文件：`.github/workflows/ci.yml`

---

## 五、常见问题

### WebSocket 连不上

- 确认 Nginx 已配置 `/socket.io` 的 `Upgrade` 头
- `CLIENT_URL` 与浏览器访问域名一致

### 数据库路径

- Docker 使用 `DATABASE_URL=file:/app/data/prod.db`
- 本地默认 `file:./dev.db`（相对 `server/prisma` 或 `server` 工作目录，以 `.env` 为准）

### 扫描任务不运行

- 检查日志是否有 `scan.start`
- 设置页查看扫描间隔与数据源开关

---

## 六、相关文档

- [本地运行指南](./LOCAL_SETUP.md)
- [功能与实现说明](./PROJECT_OVERVIEW.md)
- [前端目录说明](../client/FRONTEND.md)
