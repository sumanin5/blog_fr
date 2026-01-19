# GitOps 模块 - 完整文档

## 📖 概述

GitOps 模块是一个**内容同步引擎**，实现了从文件系统（Git 仓库）到数据库的自动化内容管理流程。它允许博客内容以 Markdown/MDX 文件的形式存储在 Git 中，通过扫描和解析这些文件，自动同步到数据库中。

### 核心理念

- **Infrastructure as Code (IaC)** - 内容即代码
- **Single Source of Truth** - Git 仓库作为内容的唯一真实来源
- **声明式管理** - 文件系统状态决定数据库状态
- **版本控制友好** - 所有内容变更可追溯、可回滚

---

## 🏗️ 模块结构

```
git_ops/
├── __init__.py           # 模块入口
├── components/           # 核心业务组件（扫描、序列化、写入、处理）
│   ├── handlers/         # 业务处理逻辑 (创建/更新)
│   ├── resolvers/        # 字段解析器 (作者/分类/封面)
│   ├── scanner/          # 文件扫描器
│   ├── writer/           # 文件写入器
│   └── serializer.py     # 统一序列化器
├── container.py          # 依赖注入容器
├── exceptions.py         # 自定义异常类
├── field_definitions.py  # Frontmatter 字段定义
├── git_client.py         # Git 操作客户端
├── mapper.py             # Frontmatter 字段映射 (即将废弃，部分功能移至 components)
├── router.py             # FastAPI 路由定义
├── schema.py             # 数据模型 (Pydantic)
├── service.py            # 同步业务逻辑编排
├── README.md             # 本文档
└── ARCHITECTURE.md       # 架构设计文档
```

---

## 📁 文件详解

### 1. `components/` - 核心组件

存放所有核心业务逻辑组件，按职责分离。

- **`scanner/`**: 负责扫描文件系统中的 MDX 文件，计算哈希值。
- **`serializer.py`**: 核心序列化器，负责 Post 模型与 Frontmatter 之间的双向转换。
- **`resolvers/`**: 包含各种字段解析器（如 AuthorResolver, CategoryResolver），处理引用关系。
- **`writer/`**: 负责将数据库变更写回文件系统（如回签 ID）。
- **`handlers/`**: 具体的业务处理逻辑，如 `handle_post_create`, `handle_post_update`。

### 2. `service.py` - 业务编排层

核心服务类 `GitOpsService`，负责编排整个同步流程。

- 初始化依赖容器 `GitOpsContainer`。
- 执行 `sync_all` 全量同步流程：
  1. 调用 `GitClient` 拉取最新代码。
  2. 调用 `scanner` 扫描本地文件。
  3. 获取数据库现有文章。
  4. 遍历文件，调用 `serializer` 和 `handlers` 处理新增/更新。
  5. 处理已删除的文件。
- 所有的错误处理逻辑直接在此层实现，不再使用额外的 error_handler 封装。

### 3. `schema.py` & `field_definitions.py`

- **`schema.py`**: 定义 API 交互的数据模型，如 `SyncStats` (同步统计) 和 `PreviewResult` (预览结果)。
- **`field_definitions.py`**: **单一真实来源**，定义 Frontmatter 字段与 Post 模型字段的映射关系、默认值和转换函数。

### 4. `git_client.py` - Git 操作客户端

封装了 Git 命令行操作，提供异步接口用于与 Git 仓库交互。

- `pull()`: 拉取最新代码。
- `get_current_hash()`: 获取当前 Commit Hash。
- `add()`, `commit()`, `push()`: 支持回写操作。

### 5. `exceptions.py` - 异常定义

定义了 `GitOpsError`, `GitOpsConfigurationError`, `GitOpsSyncError` 等异常类。

### 6. `container.py` - 依赖容器

实现了简单的依赖注入容器 `GitOpsContainer`，用于管理 `session`, `content_dir`, `scanner`, `serializer` 等组件的生命周期。

---

## 🔄 核心流程

### 同步流程 (Sync)

1. **触发**: 管理员调用 API `/ops/git/sync` 或 Webhook 触发。
2. **准备**: 确定操作用户（默认 Superadmin），初始化 Service。
3. **Pull**: 尝试 `git pull` 更新本地文件（失败则警告，不中断）。
4. **扫描**: `MDXScanner` 扫描所有 `.md`/`.mdx` 文件，计算哈希。
5. **对比**: 查询数据库中 `source_path` 不为空的文章。
6. **处理**:
   - **新增**: 文件存在但数据库无记录 -> `handle_post_create`
   - **更新**: 文件与数据库均存在 -> `handle_post_update`
   - **删除**: 数据库有记录但文件不存在 -> `post_service.delete_post`
7. **回写 (可选)**: 如果是新创建的文章，自动将生成的 UUID 回写到文件的 Frontmatter。
8. **缓存**: 刷新 Next.js 前端缓存。

---

## 🔧 常见问题

### 为什么删除了 `error_handler.py`?

为了保持代码的 Pythonic 和简洁性，我们移除了过度封装的 `safe_operation` 和 `handle_sync_error` 函数。现在的错误处理直接在 `service.py` 中使用原生的 `try...except` 块，这样控制流更加清晰，开发者能直观地看到错误是如何被捕获、记录日志并添加到统计信息中的。

---

**最后更新**: 2026-01-19
**文档版本**: 2.1.0
