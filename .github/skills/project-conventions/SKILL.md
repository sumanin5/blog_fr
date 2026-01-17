---
name: project-conventions
description: Blog FR 项目开发规范，包括技术栈（uv, pnpm, Next.js, shadcn）和架构模式。在添加功能或修改代码时使用此技能。
---

## 技术栈与工具

本项目遵循一套严格的技术选择。在管理依赖或创建新模块时，请务必遵守。

### 后端 (Python/FastAPI)
- **包管理器**: 所有的 Python 依赖管理必须使用 `uv`。
  - 通过 `uv run` 或 `uv pip` 运行命令。
  - 项目配置位于 `backend/pyproject.toml`。
- **框架**: 使用 FastAPI 配合 SQLModel。
- **环境**: 运行测试时需设置 `ENVIRONMENT=test`。

### 前端 (Next.js/React)
- **包管理器**: 仅限使用 `pnpm`。严禁使用 `npm` 或 `yarn`。
- **框架**: 使用 TypeScript 编写的 Next.js 16 (App Router)。
- **UI 组件**: 使用 **Shadcn UI** 组件。
  - 配置文件见 `frontend/components.json`。
  - 创建新 UI 元素时，优先通过 shadcn CLI 添加或遵循其设计模式。
- **状态管理**: 使用 TanStack Query (React Query) 处理服务端状态；使用 Zustand 处理客户端本地状态。

### 代码风格与语言
- **语言**: 所有注释、文档和 Git 提交信息 **必须** 使用 **简体中文**。
- **命名**: 文件名和目录名使用 kebab-case（短横线隔开）。React 组件使用 PascalCase。

## 架构模式

- **API 安全**: 始终使用两层权限检查（路由层进行粗粒度认证，服务层进行细粒度所有权检查）。
- **Slug 生成**: 所有文章必须使用后端 utils 中的 `generate_slug_with_random_suffix()`。
- **路由**: 在管理面板中使用动态路由（如 `[type]`），以支持不同的内容类型（文章 vs. 想法）。
