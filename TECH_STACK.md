# Blog FR 技术栈概览

> 一个现代化的全栈博客系统，采用 FastAPI + Next.js 16 构建混合渲染架构

## 架构设计

### 核心模式
- **混合渲染架构**：结合 SSR（服务端渲染）和 CSR（客户端渲染）
- **API 优先设计**：OpenAPI 3.0 规范驱动，自动生成前端 SDK
- **GitOps 内容管理**：双向同步 Git 仓库与数据库
- **模块化设计**：按功能域划分的清晰代码结构

### 渲染策略
- **SSR**：博客文章页面（最佳 SEO 和首屏加载）
- **CSR**：管理后台（流畅的 SPA 体验）
- **后端 API**：FastAPI 异步高性能

---

## 后端技术栈

### 核心框架
- **FastAPI** - Python 3.13+ 现代异步 Web 框架
- **SQLModel** - SQLAlchemy + Pydantic 结合的 ORM
- **Alembic** - 数据库迁移工具

### 数据库
- **PostgreSQL 17** - 主数据库
- **异步驱动**：asyncpg, psycopg[binary]

### 认证与安全
- **PyJWT** - JWT Token 认证
- **bcrypt** - 密码加密
- **自定义中间件** - CORS、错误处理、监控

### 内容处理
- **markdown-it-py** - Markdown 渲染引擎
- **mdit-py-plugins** - Markdown 插件扩展
- **pygments** - 代码高亮
- **latex2mathml** - 数学公式转换
- **python-frontmatter** - Frontmatter 解析

### 媒体管理
- **Pillow** - 图像处理
- **多规格缩略图生成**
- **SVG 图标支持**

### 监控与追踪
- **Sentry SDK** - 错误追踪
- **OpenTelemetry** - 可观测性

### 开发工具
- **UV** - 极速 Python 包管理器
- **Pytest** - 测试框架（覆盖率 >70%）
- **Scalar** - 交互式 API 文档

---

## 前端技术栈

### 核心框架
- **Next.js 16** - React 19 + App Router
- **React 19.2.3** - 前端框架
- **TypeScript 5** - 类型安全

### UI 组件库
- **Tailwind CSS 4** - 原子化 CSS 框架
- **Shadcn UI** - 高质量组件库
- **Radix UI** - 无样式基础组件
- **Framer Motion** - 动画库

### 状态管理
- **TanStack Query v5** - 服务端状态管理
- **Zustand** - 客户端状态管理

### 内容渲染
- **next-mdx-remote** - MDX 远程渲染
- **Mermaid** - 图表渲染
- **KaTeX** - 数学公式渲染
- **highlight.js** - 代码高亮
- **rehype-katex, remark-math** - MDX 插件

### API 集成
- **hey-api SDK** - 自动生成类型安全 API 客户端
- **@hey-api/client-fetch** - HTTP 客户端

### 开发体验
- **pnpm 9+** - 高效包管理器
- **Vitest** - 单元测试
- **ESLint + TypeScript** - 代码质量检查
- **Turbopack** - 极速开发服务器

### 主题系统
- **next-themes** - 深色/浅色主题切换
- **系统主题自动跟随**
- **用户偏好自动保存**

---

## 部署与运维

### 容器化
- **Docker Compose** - 开发和生产环境
- **多阶段构建** - 优化镜像大小
- **网络隔离** - 独立容器网络

### CI/CD 流程
- **GitHub Actions** - 自动化部署
- **阿里云 ACR** - 容器镜像仓库
- **阿里云 ECS** - 应用服务器
- **自动数据库迁移**
- **健康检查**

### 反向代理
- **Caddy** - 自动 HTTPS

---

## 项目亮点

### 1. GitOps 内容管理
- **双向同步**：Git ↔ PostgreSQL
- **增量同步**：基于 Git Diff 的智能同步
- **依赖注入容器**：统一管理依赖关系
- **全链路追踪**：详细的日志和错误追踪

### 2. SEO 优化
- **语义化 HTML**
- **动态元数据**
- **OpenGraph 标签**
- **Schema.org 支持**

### 3. 现代化 UI
- **响应式设计**
- **深色/浅色主题**
- **平滑过渡动画**
- **无障碍访问**

### 4. 开发体验
- **类型安全**：端到端 TypeScript
- **热重载**：快速开发反馈
- **自动测试**：单元 + 集成测试
- **代码生成**：API SDK 自动生成

### 5. 性能优化
- **异步处理**：FastAPI + asyncpg
- **连接池**：数据库连接管理
- **Turbopack**：快速开发服务器
- **代码分割**：按需加载

---

## 快速启动

### 开发环境

```bash
# Docker 方式（推荐）
docker compose -f docker-compose.dev.yml up

# 后端开发
cd backend
uv sync
uv run fastapi dev app/main.py

# 前端开发
cd frontend
pnpm dev
```

### 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/scalar |
| 数据库 | localhost:5433 |

---

## 项目结构

```
blog_fr/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── core/           # 核心配置
│   │   ├── users/          # 用户认证
│   │   ├── posts/          # 文章管理
│   │   ├── media/          # 媒体管理
│   │   ├── git_ops/        # GitOps 同步
│   │   └── middleware/     # 中间件
│   ├── tests/              # 测试
│   └── alembic/           # 数据库迁移
├── frontend/               # Next.js 前端
│   ├── src/
│   │   ├── app/            # App Router 页面
│   │   ├── components/     # React 组件
│   │   └── shared/api/    # API SDK
│   └── public/            # 静态资源
├── scripts/                # 自动化脚本
└── docker-compose*.yml    # 容器配置
```

---

## 质量保证

### 测试覆盖
- **单元测试**：核心业务逻辑
- **集成测试**：API 端点
- **中间件测试**：认证、权限等
- **代码覆盖率**：>70%

### 错误处理
- **统一响应格式**
- **环境隔离**：开发/生产不同级别
- **全链路追踪**：每个请求唯一 ID
- **自动监控**：Sentry 集成
