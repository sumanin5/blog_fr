---
name: project-workflow
description: 项目启动、环境搭建与日常开发工作流。涵盖 local 与 docker 两种模式下的启动指令。
---

# 项目工作流与启动规范

## 🏗️ 基础底座
本项目遵循以下通用开发标准：
- **Python 环境**: 遵循 [python-uv-web](~/.claude/skills/python-uv-web/SKILL.md) 规范。
- **前端环境**: 遵循 [nextjs-pnpm](~/.claude/skills/nextjs-pnpm/SKILL.md) 规范。

## 🚀 项目特定启动流程
在遵循通用规范的基础上，本项目有以下特有逻辑：

### 1. 本地开发模式 (推荐，响应最快)

#### 后端 (FastAPI)
- **目录**: `/backend`
- **前提**: 已安装 `uv`
- **启动**: `uv run fastapi dev app/main.py`
- **端口**: `8000`
- **文档**: `http://localhost:8000/docs`

#### 前端 (Next.js)
- **目录**: `/frontend`
- **前提**: 已安装 `pnpm`
- **启动**: `pnpm dev`
- **端口**: `3000`
- **注意**: 本地模式下，前端通过 `next.config.ts` 中的 `rewrites` 代理到 `127.0.0.1:8000`。

### 2. 容器开发模式 (环境一致性)
- **命令**: `docker compose -f docker-compose.dev.yml up`
- **特点**:
  - 支持热更新 (Hot Reload)。
  - 自动处理数据库、Redis 等基础设施。
  - 前端通过 Docker 网络连接后端 (`http://backend:8000`)。

---

## 🛠️ 初始化流程 (新环境)

如果是第一次克隆项目，请按此顺序执行：

1. **环境准备**:
   - 复制 `.env.example` -> `.env` (根据需要修改)。
   - 确保安装了 `uv`, `pnpm`, `docker`。

2. **后端初始化**:
   ```bash
   cd backend
   uv sync               # 安装依赖
   make db-migrate       # 初始化数据库表结构
   uv run app/initial_data.py  # 注入初始管理员数据
   ```

3. **前端初始化**:
   ```bash
   cd frontend
   pnpm install          # 安装依赖
   pnpm api:generate     # 生成 API SDK（强烈建议）
   ```

4. **内容同步**:
   ```bash
   ./scripts/sync-posts.sh            # 首次手动将 content/ 全量同步到数据库
   uv run scripts/watch_content.py    # 使用 uv 启动宿主机 OS 原生事件监听（零轮询），保存后直接 HTTP 推给后端预检入库
   ```

---

## 🔄 日常开发循环

1. **修改代码**:
   - 后端逻辑修改。
   - 前端 UI 修改。
2. **同步 API (如果后端 Schema 变了)**:
   - 执行 `./scripts/generate-api.sh`。
3. **验证**:
   - 运行测试: `cd backend && make test`。
   - 检查 lint: `make lint` (backend) / `pnpm lint` (frontend)。

---

## ⚠️ 常见问题启动检查项
- **数据库连接失败**: 检查 `.env` 中的 `DATABASE_URL` 是否正确（本地通常是 localhost，Docker 内通常是 db）。
- **前端 SSR 报错**: 检查 `BACKEND_INTERNAL_URL` 环境变量是否配置正确。
- **端口占用**: 确保 3000 和 8000 端口未被其他服务占用。
