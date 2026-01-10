# 🚀 Blog FR - 现代全栈博客系统

[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20Next.js%2016-blue.svg)](https://github.com/sumanin5/blog_fr)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13%2B-blue)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node-20%2B-green)](https://nodejs.org/)
[![Backend CI](https://github.com/sumanin5/blog_fr/workflows/Backend%20CI/badge.svg)](https://github.com/sumanin5/blog_fr/actions)
[![Frontend CI](https://github.com/sumanin5/blog_fr/workflows/Frontend%20CI/badge.svg)](https://github.com/sumanin5/blog_fr/actions)
[![codecov](https://codecov.io/gh/sumanin5/blog_fr/branch/main/graph/badge.svg)](https://codecov.io/gh/sumanin5/blog_fr)

**Blog FR** 是一个基于 **FastAPI** 和 **Next.js 16** 构建的现代全栈博客系统。它集成了高性能后端、React Server Components 以及丰富的 MDX 渲染能力，旨在提供极致的写作与阅读体验。

---

## ✨ 核心特性

- 🎨 **现代设计**: 基于 Tailwind CSS 4 和 Shadcn UI 的高级 UI 系统，支持深色/浅色模式切换与响应式布局。
- 📝 **增强型 MDX**: 支持 MDX 渲染，集成 Mermaid 图表、代码高亮、数学公式（KaTeX）以及幻灯片演示。
- ⚡ **混合渲染架构**:
  - **SSR (服务端渲染)**: 用于博客文章和内容页面，提供最佳 SEO 和首屏加载速度
  - **CSR (客户端渲染)**: 用于用户交互界面，提供流畅的 SPA 体验
  - **后端**: 使用 FastAPI + SQLModel (SQLAlchemy + Pydantic)，支持异步操作与高效并发
- 🔗 **OpenAPI 驱动**: 自动生成类型安全的前端 SDK，实现端到端类型安全
- 🖼️ **媒体管理**: 自动生成缩略图，支持多种图片格式，优化加载速度
- 🔍 **SEO 友好**: 语义化 HTML、动态元数据生成与 OpenGraph 标签优化
- 🐳 **容器化部署**: 完整的 Docker & Docker Compose 配置，一键启动开发与生产环境
- 🧪 **质量保证**: 集成 Pytest 和测试覆盖率工具

---

## 🛠️ 技术栈

### 后端 (Backend)

- **框架**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13+)
- **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **迁移**: [Alembic](https://alembic.sqlalchemy.org/)
- **数据库**: [PostgreSQL 17](https://www.postgresql.org/)
- **包管理**: [UV](https://github.com/astral-sh/uv) (极速 Python 包管理器)
- **API 文档**: [Scalar](https://scalar.com/) + OpenAPI 3.0

### 前端 (Frontend)

- **框架**: [Next.js 16](https://nextjs.org/) (React 19 + App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **状态管理**: [TanStack Query v5](https://tanstack.com/query)
- **数据获取**: [hey-api SDK](https://www.heypi.com/) (基于 OpenAPI 自动生成)
- **主题**: [next-themes](https://github.com/pacocoursey/next-themes)
- **内容渲染**: MDX + Mermaid + KaTeX + highlight.js

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

- 前端: `http://localhost:3000` (开发) 或 `http://localhost:80` (生产)
- API 文档: `http://localhost:8000/scalar`
- 后端健康检查: `http://localhost:8000/`

---

## 💻 本地开发

### 前端开发

```bash
cd frontend
npm install
npm run dev        # 启动开发服务器 (http://localhost:3000)
npm run build      # 构建生产版本
npm run api:generate  # 从 OpenAPI schema 生成类型安全的 SDK
```

### 后端开发

```bash
cd backend
uv sync            # 安装依赖
fastapi dev app/main.py  # 启动开发服务器 (http://localhost:8000)
pytest            # 运行测试
```

pytest # 运行测试

````

### 🔧 自动化开发脚本

项目在 `scripts/` 目录下提供了一系列脚本来简化日常开发任务：

| 脚本 | 描述 | 使用场景 |
|------|------|----------|
| `./scripts/generate-api.sh` | **全自动生成 API SDK** | 后端接口变更后，一键更新前端 TypeScript 类型定义 |
| `./scripts/db-migrate.sh` | 数据库迁移辅助 | 创建新表或修改模型后使用 |
| `./scripts/docker-rebuild.sh` | 重建所有 Docker 容器 | 修改了依赖或 Dockerfile 后使用 |

### API SDK 生成

项目使用 OpenAPI 规范实现前后端类型安全：

1. 后端自动生成 OpenAPI schema: `http://localhost:8000/openapi.json`
2. 前端使用 hey-api/openapi-ts 自动生成 TypeScript SDK
3. 修改后端 API 后运行 `npm run api:generate` 更新前端类型

---

## 🗂️ 项目结构

```text
blog_fr/
├── backend/                      # FastAPI 后端服务
│   ├── app/
│   │   ├── core/                # 核心配置和工具
│   │   ├── users/               # 用户认证和授权
│   │   ├── posts/               # 文章管理
│   │   ├── media/               # 媒体文件管理
│   │   └── middleware/          # 自定义中间件
│   ├── tests/                   # Pytest 测试
│   ├── alembic/                 # 数据库迁移
│   └── pyproject.toml           # Python 项目配置
├── frontend/                     # Next.js 前端应用
│   ├── src/
│   │   ├── app/                 # Next.js App Router 页面
│   │   ├── components/          # React 组件
│   │   ├── shared/api/          # 自动生成的 API SDK
│   │   └── config/              # 配置文件
│   ├── public/                  # 静态资源
│   └── package.json             # Node.js 项目配置
├── scripts/                     # 自动化脚本
├── docker-compose.yml           # 生产环境配置
├── docker-compose.dev.yml       # 开发环境配置
├── ARCHITECTURE.md              # 架构详细文档
└── README.md                    # 本文件
````

### 架构亮点

- **混合渲染**: Next.js App Router 支持 SSR 和 CSR，根据页面特性自动选择最佳渲染策略
- **类型安全**: OpenAPI schema 自动生成 TypeScript SDK，确保前后端接口类型一致
- **模块化设计**: 后端按功能模块划分（users、posts、media），前端按组件和功能组织
- **开发体验**: 支持 Hot Reload、TypeScript 检查、自动格式化

关于架构的详细说明，请参阅 [架构文档](./ARCHITECTURE.md)。

---

## 🧪 测试

### 后端测试

```bash
cd backend
# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app --cov-report=html

# 运行特定模块的测试
pytest tests/api/posts/
pytest tests/api/users/
pytest tests/api/media/
```

### 数据库迁移

```bash
cd backend
# 创建新的迁移
alembic revision --autogenerate -m "描述"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

---

## 🚀 部署

### 生产环境部署

```bash
# 构建并启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 环境变量配置

主要环境变量（参考 `.env.example`）：

- **数据库**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **后端**: `SECRET_KEY`, `ENVIRONMENT`, `API_PREFIX`
- **前端**: `NEXT_PUBLIC_API_URL`, `BACKEND_INTERNAL_URL`

### API 端点

后端提供的主要 API 接口：

- **用户认证**: `/api/v1/users/register`, `/api/v1/users/login`
- **文章管理**: `/api/v1/posts/`, `/api/v1/posts/article/{slug}`
- **媒体文件**: `/api/v1/media/upload`, `/api/v1/media/files/`
- **API 文档**: `/scalar` (交互式 API 文档)

---

## 📚 相关文档

- [架构设计文档](./ARCHITECTURE.md) - 混合渲染架构和数据流详解
- [后端 API 文档](./backend/README.md) - FastAPI 开发指南
- [前端开发指南](./frontend/SETUP.md) - Next.js 开发环境配置
- [API 集成指南](./docs/api/FRONTEND_API_INTEGRATION_GUIDE.md) - 前端如何使用后端 API

---

## 🤝 贡献指南

欢迎贡献！请随时提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证。

---

**Happy Coding!** 🍕
