# Gemini Project Context & Overview

## 1. 项目简介 (Project Overview)

`blog_fr` 是一个现代化的全栈博客平台，采用前后端分离的架构设计。

- **核心目标**：提供高性能、SEO 友好且具备优秀交互体验的博客系统。
- **架构特点**：
  - **Frontend**: 使用 **Next.js 16** (React 19) 构建，利用 Server Components 实现高效的 SSR (针对文章详情页等 SEO 关键页面) 和 CSR (针对交互密集型页面)。
  - **Backend**: 使用 **FastAPI** 构建高性能 RESTful API，负责业务逻辑、数据持久化和权限管理。
  - **Type Safety**: 通过 OpenAPI 规范和 `hey-api` 自动生成前端 TypeScript SDK，实现前后端端到端的类型安全。
  - **Infrastructure**: 使用 Docker Compose 进行容器化部署和本地开发环境编排。

## 2. 技术栈 (Tech Stack)

### 前端 (Frontend)

- **Framework**: Next.js 16.1 (App Router)
- **Core**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, Tailwind Merge, CLSX
- **UI Components**: shadcn/ui (based on Radix UI), Lucide React (Icons)
- **Animation**: Framer Motion
- **State/Data Management**: TanStack Query (React Query)
- **API Client**: @hey-api/client-fetch (Auto-generated SDK)
- **Utilities**: Zod (Validation), highlight.js (Code highlighting), Katex (Math)

### 后端 (Backend)

- **Framework**: FastAPI
- **Language**: Python
- **Database ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Database**: PostgreSQL 15+
- **Migrations**: Alembic

### 开发与运维 (DevOps & Tools)

- **Containerization**: Docker, Docker Compose
- **Package Manager**: pnpm (Frontend), uv/pip (Backend implied)
- **API Spec**: OpenAPI (Swagger)
- **Linting/Formatting**: ESLint, Prettier (implied)

## 3. 关键目录结构 (Key Directory Structure)

- **`/frontend`**: Next.js 前端项目
  - `src/app`: App Router 页面路由
  - `src/components`: UI 组件 (Atomic design implied)
  - `src/shared/api/generated`: 自动生成的 API SDK
  - `src/hooks`: 自定义 Hooks (如 `useAuth`)
- **`/backend`**: FastAPI 后端项目
  - `app`: 应用核心代码
  - `alembic`: 数据库迁移脚本
  - `tests`: 测试用例
- **`/scripts`**: 辅助脚本 (API 生成, Docker 重建等)
- **`.env.*`**: 环境变量配置

## 4. 开发规范摘要 (Development Standards)

- **API 交互**: 禁止在前端手动写 `fetch`，必须使用 `npm run api:generate` 生成的 SDK。
- **样式**: 优先通过 `tailwind.config` 和 CSS Variables 统一设计系统，使用 Mobile-First 策略。
- **数据流**: 服务端组件优先获取数据 (SSR)，客户端组件通过 React Query 获取数据 (CSR)。
- **提交信息**: 遵循 Conventional Commits 规范。

---

_Last Updated: 2026-01-10_
