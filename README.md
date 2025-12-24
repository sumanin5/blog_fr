# 🚀 Blog FR - 现代全栈博客系统

[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%2019-blue.svg)](https://github.com/sumanin5/blog_fr)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13%2B-blue)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node-20%2B-green)](https://nodejs.org/)

**Blog FR** 是一个基于 **FastAPI** 和 **React 19** 构建的现代全栈博客系统。它集成了高性能后端、动态前端以及丰富的 MDX 渲染能力，旨在提供极致的写作与阅读体验。

---

## ✨ 核心特性

- 🎨 **极致设计**: 基于 Tailwind CSS 4 和 Shadcn UI 的高级 UI 系统，支持深色/浅色模式切换与玻璃拟态效果。
- 📝 **增强型 MDX**: 支持 MDX 渲染，集成 Mermaid 图表、代码高亮、数学公式（KaTeX）以及幻灯片演示。
- ⚡ **高性能架构**:
  - **后端**: 使用 FastAPI + SQLModel (SQLAlchemy + Pydantic)，支持异步操作与高效并发。
  - **前端**: 基于 Vite 6 + React 19，使用 TanStack Router 实现精细化路由管理，TanStack Query 处理数据流。
- 🖼️ **媒体管理**: 自动生成缩略图，支持多种图片格式，优化加载速度。
- 🔍 **SEO 友好**: 语义化 HTML、动态 Title 标签与 Meta 描述优化。
- 🐳 **容器化部署**: 完整的 Docker & Docker Compose 配置，一键启动开发与生产环境。
- 🧪 **质量保证**: 集成 Vitest、Playwright 和 Pytest，覆盖单元测试与 E2E 测试。

---

## 🛠️ 技术栈

### 后端 (Backend)

- **框架**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13+)
- **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **迁移**: [Alembic](https://alembic.sqlalchemy.org/)
- **数据库**: [PostgreSQL 17](https://www.postgresql.org/)
- **包管理**: [UV](https://github.com/astral-sh/uv) (极速 Python 包管理器)

### 前端 (Frontend)

- **基础**: [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **路由**: [TanStack Router](https://tanstack.com/router)
- **状态管理**: [TanStack Query v5](https://tanstack.com/query)
- **动画**: [Framer Motion](https://www.framer.com/motion/)

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/sumanin5/blog_fr.git
cd blog_fr
```

### 2. 环境配置

复制环境变量模板并根据需要修改：

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### 3. 一键启动 (Docker)

这是最快的方式，将同时启动数据库、后端、前端和管理工具：

```bash
# 开发环境（支持热重载）
docker compose -f docker-compose.dev.yml up

# 生产环境
docker compose up -d
```

访问：

- 前端: `http://localhost:5173` (开发) 或 `http://localhost:80` (生产)
- API 文档: `http://localhost:8000/docs`
- 数据库管理 (Adminer): `http://localhost:8080`

---

## 💻 本地开发

如果你希望在本地运行而不使用容器，请参考以下指南：

- **后端开发指南**: [backend/README.md](./backend/README.md)
- **前端开发指南**: [frontend/QUICK_START.md](./frontend/QUICK_START.md)

### 快速概览：

- **后端**: `cd backend && uv sync && fastapi run app/main.py --reload`
- **前端**: `cd frontend && npm install && npm run dev`

---

## 🗂️ 项目结构

```text
blog_fr/
├── backend/            # FastAPI 后端服务
│   ├── app/            # 业务逻辑
│   ├── tests/          # pytest 测试
│   └── alembic/        # 数据库迁移
├── frontend/           # React 前端应用
│   ├── src/            # 源代码
│   ├── tests/          # Vitest & Playwright 测试
│   └── docs/           # 前端详细文档
├── scripts/            # 通用自动化脚本
├── docker-compose.yml  # 生产环境配置
└── README.md           # 本文件
```

关于前端架构的详细说明，请参阅 [前端架构文档](./frontend/PROJECT_STRUCTURE.md)。

---

## 🧪 测试

### 后端测试

```bash
cd backend
pytest
```

### 前端测试

```bash
cd frontend
npm run test        # 单元测试
npm run test:e2e    # E2E 测试
```

---

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证。

---

**Happy Coding!** 🍕
