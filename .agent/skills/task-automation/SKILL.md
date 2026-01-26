---
name: task-automation
description: 使用 blog_fr 项目中自动化脚本和维护工具的说明。在需要同步内容、迁移数据库或重建镜像，还有自动生成前端的api工具时使用此技能。
---

## 可用脚本

项目在 `scripts/` 目录下包含多个自动化脚本，以简化开发和运维流程。

### 内容同步

- **`./scripts/sync-posts.sh`**: 将 `content/` 目录下的 MDX 文件同步到数据库。
  - 在添加或修改 `content/` 文件夹中的 MDX 文件后运行此脚本。
  - 内部使用 `backend/scripts/sync_git_content.py` 实现。

### 数据库管理

- **`./scripts/db-migrate.sh`**: 运行 Alembic 迁移以更新数据库架构。
  - 用法:
    - 生成迁移: `./scripts/db-migrate.sh generate "描述信息"`
    - 执行迁移: `./scripts/db-migrate.sh upgrade`
  - 在修改后端任何 SQLModel 模型后使用此脚本。

### API 与类型生成

- **`./scripts/generate-api.sh`**: 从 FastAPI 后端导出 OpenAPI 架构并重新生成前端的 TypeScript SDK。
  - **关键**: 在更改后端 Schema 或 Router 后，务必运行此脚本以确保前端页面的类型安全。
  - 输出位置: `frontend/src/shared/api/generated/`。

### Docker 操作

- **`./scripts/docker-rebuild.sh`**: 重建所有 Docker 容器（完整重建）。
- **`./scripts/docker-rebuild-frontend.sh`**: 仅重建前端容器。

### 维护

- **`./scripts/cleanup_posts.py`**: 用于清理数据库中孤立或重复文章数据的工具脚本。

## 工作流集成

1. **架构变更**:
   - 修改 `model.py` -> 运行 `scripts/db-migrate.sh` -> 运行 `./scripts/generate-api.sh`。
2. **新增内容**:
   - 将 `.mdx` 文件放入 `content/` -> 运行 `./scripts/sync-posts.sh`。
3. **环境刷新**:
   - 如果容器状态不同步，请使用 `./scripts/docker-rebuild.sh`。
