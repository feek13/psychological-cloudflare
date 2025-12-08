# 心理测评系统 - 快速启动指南

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

## 快速启动（3步完成）

### 第1步：解压并安装依赖

```bash
# 解压项目
tar -xzf psychological-cloudflare.tar.gz
cd psychological-cloudflare

# 一键安装所有依赖
npm install --prefix frontend && \
npm install --prefix workers/scoring && \
npm install --prefix workers/api-proxy && \
npm install --prefix workers/ai-report
```

### 第2步：启动前端

```bash
cd frontend
npm run dev
```

前端将在 **http://localhost:5173** 运行

### 第3步：访问系统

打开浏览器访问 http://localhost:5173

**测试账号见 `测试账户密码.md` 文件**

---

## 项目架构

```
psychological-cloudflare/
├── frontend/          # React 前端 (Vite + TypeScript)
├── workers/           # Cloudflare Workers (已部署到云端)
│   ├── scoring/       # 评分计算
│   ├── api-proxy/     # API 代理
│   └── ai-report/     # AI 报告生成
└── supabase/          # 数据库配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS |
| 状态管理 | Zustand |
| HTTP | Axios |
| 路由 | React Router v6 |
| 后端 | Cloudflare Workers (Serverless) |
| 数据库 | Supabase (PostgreSQL) |

## 常见问题

### Vite 启动报错
```bash
rm -rf frontend/node_modules/.vite
cd frontend && npm run dev
```

### 端口被占用
修改 `frontend/vite.config.ts` 中的端口配置

---

**配置文件说明：**
- `frontend/.env` - 前端环境变量（已配置好）
- `workers/*/wrangler.toml` - Workers 配置（已配置好）
- `测试账户密码.md` - 测试账号信息
