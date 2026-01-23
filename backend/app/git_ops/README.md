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
├── components/           # 核心业务组件
│   ├── handlers/         # 业务处理逻辑 (创建/更新/验证)
│   ├── processors/       # 字段处理器 (Pipeline 模式)
│   ├── scanner/          # 文件扫描器
│   ├── writer/           # 文件写入器
│   ├── metadata.py       # Frontmatter 数据模型 (Pydantic)
│   ├── serializer.py     # 统一序列化器
│   ├── cache.py          # Next.js 缓存失效
│   ├── comparator.py     # 文章对比器
│   └── webhook.py        # GitHub Webhook 验证
├── services/             # 服务层（职责单一）
│   ├── __init__.py       # 服务导出
│   ├── base.py           # 服务基类
│   ├── sync_service.py   # 同步服务
│   ├── preview_service.py # 预览服务
│   ├── resync_service.py # 重新同步服务
│   ├── commit_service.py # 提交服务
│   └── README.md         # 服务层文档
├── background_tasks.py   # 后台任务
├── container.py          # 依赖注入容器 ⭐
├── exceptions.py         # 自定义异常类
├── git_client.py         # Git 操作客户端
├── router.py             # FastAPI 路由定义
├── schema.py             # API 数据模型 (Pydantic)
├── service.py            # 主服务（门面模式）⭐
├── README.md             # 本文档
└── ARCHITECTURE.md       # 架构设计文档
```

---

## 📁 文件详解

### 1. `components/` - 核心组件

存放所有核心业务逻辑组件，按职责分离。

- **`scanner/`**: 负责扫描文件系统中的 MDX 文件，计算哈希值，推导 post_type 和 category。
- **`metadata.py`**: Frontmatter 数据模型，使用 Pydantic 定义字段结构、验证规则和序列化逻辑。
- **`serializer.py`**: 核心序列化器，协调 Frontmatter 和 Processor，实现 Post 模型与 Frontmatter 之间的双向转换。
- **`processors/`**: 字段处理器（Pipeline 模式），处理复杂的字段解析逻辑（author、cover、category、tags 等）。
- **`writer/`**: 负责将数据库变更写回文件系统（如回签 ID）。
- **`handlers/`**: 具体的业务处理逻辑，如 `handle_post_create`, `handle_post_update`, `validate_post_for_resync`。
- **`cache.py`**: Next.js 缓存失效逻辑。
- **`comparator.py`**: 文章对比器，检测文章变化。
- **`webhook.py`**: GitHub Webhook 签名验证。

### 2. `container.py` - 依赖注入容器 ⭐

**核心类**: `GitOpsContainer`

**职责**: 集中管理所有依赖关系，实现依赖注入容器模式。

**管理的核心组件**（立即创建）:

- `scanner`: MDXScanner - 文件扫描器
- `serializer`: PostSerializer - 序列化器
- `writer`: FileWriter - 文件写入器
- `git_client`: GitClient - Git 客户端

**管理的服务**（延迟加载 + 单例）:

- `sync_service`: SyncService - 同步服务
- `preview_service`: PreviewService - 预览服务
- `resync_service`: ResyncService - 重新同步服务
- `commit_service`: CommitService - 提交服务

**优势**:

- ✅ **依赖共享**: 所有服务共享同一套核心组件
- ✅ **单例模式**: 每个服务只创建一次
- ✅ **延迟加载**: 按需创建服务，节省资源
- ✅ **易于测试**: 可以 mock 整个容器或单个组件

**使用示例**:

```python
# 创建容器
container = GitOpsContainer(session)

# 访问核心组件
scanned = await container.scanner.scan_all()

# 访问服务（第一次访问时创建）
stats = await container.sync_service.sync_all()
```

### 3. `service.py` - 主服务（门面模式）⭐

**核心类**: `GitOpsService`

**职责**: 协调各个子服务，提供统一的 API 接口。

**设计模式**: 门面模式（Facade Pattern）

**实现**:

```python
class GitOpsService:
    def __init__(self, session: AsyncSession):
        # 创建容器
        self.container = GitOpsContainer(session)

    async def sync_all(self, default_user: User = None):
        # 委托给容器中的服务
        return await self.container.sync_service.sync_all(default_user)
```

**优点**:

- 向后兼容：保持原有 API 不变
- 简化接口：隐藏子服务的复杂性
- 统一入口：所有 GitOps 操作通过主服务

### 4. `services/` - 服务层

将原来 481 行的 `service.py` 拆分为多个职责单一的服务类：

- **`base.py`**: 服务基类，提供共享逻辑（如 `_get_operating_user`）
- **`sync_service.py`** (~280 行): 负责全量和增量同步
- **`preview_service.py`** (~80 行): 负责同步预览（Dry Run）
- **`resync_service.py`** (~80 行): 负责重新同步单个文章
- **`commit_service.py`** (~30 行): 负责 Git 提交和推送

每个服务继承自 `BaseGitOpsService`，通过容器获取依赖。

### 5. `schema.py` & `metadata.py`

- **`schema.py`**: 定义 API 交互的数据模型，如 `SyncStats` (同步统计) 和 `PreviewResult` (预览结果)。
- **`metadata.py`**: **单一真实来源**，使用 Pydantic 定义 Frontmatter 字段结构、验证规则、类型转换和序列化逻辑。

### 6. `git_client.py` - Git 操作客户端

封装了 Git 命令行操作，提供异步接口用于与 Git 仓库交互。

- `pull()`: 拉取最新代码。
- `get_current_hash()`: 获取当前 Commit Hash。
- `get_changed_files()`: 获取两个 commit 之间的变更文件。
- `add()`, `commit()`, `push()`: 支持回写操作。

### 7. `exceptions.py` - 异常定义

定义了 `GitOpsError`, `GitOpsConfigurationError`, `GitOpsSyncError` 等异常类。

### 8. `background_tasks.py` - 后台任务

定义了后台任务函数：

- `run_background_sync()`: 后台执行同步
- `run_background_commit()`: 后台执行 Git 提交

---

## 🔄 核心流程

### 全量同步流程 (sync_all)

1. **触发**: 管理员调用 API `/ops/git/sync?force_full=true` 或 Webhook 触发。
2. **门面**: `GitOpsService.sync_all()` 创建 `GitOpsContainer`。
3. **委托**: 委托给 `container.sync_service.sync_all()`。
4. **准备**: `SyncService` 确定操作用户（默认 Superadmin）。
5. **Pull**: 使用 `container.git_client` 尝试 `git pull` 更新本地文件（失败则警告，不中断）。
6. **扫描**: 使用 `container.scanner` 扫描所有 `.md`/`.mdx` 文件，计算哈希。
7. **对比**: 查询数据库中 `source_path` 不为空的文章。
8. **处理**:
   - **新增**: 文件存在但数据库无记录 -> `handle_post_create`
   - **更新**: 文件与数据库均存在 -> `handle_post_update`
   - **删除**: 数据库有记录但文件不存在 -> `post_service.delete_post`
9. **回写 (可选)**: 如果是新创建的文章，使用 `container.writer` 将生成的 UUID 回写到文件的 Frontmatter。
10. **缓存**: 刷新 Next.js 前端缓存。

### 增量同步流程 (sync_incremental)

1. **触发**: 管理员调用 API `/ops/git/sync` (默认) 或 Webhook 触发。
2. **门面**: `GitOpsService.sync_incremental()` 创建 `GitOpsContainer`。
3. **委托**: 委托给 `container.sync_service.sync_incremental()`。
4. **状态检查**: 读取 `content/.gitops_last_sync` 文件获取上次同步的 Commit Hash。
5. **差异获取**: 使用 `container.git_client.get_changed_files()` 获取变更文件列表。
6. **增量处理**: 仅处理变更列表中的文件（新增/修改/删除）。
7. **智能回退**: 如果没有 Hash 记录或获取 Diff 失败，自动降级为全量同步。
8. **更新状态**: 保存当前 Commit Hash 到 `.gitops_last_sync`。

### 预览流程 (preview_sync)

1. **触发**: 管理员调用 API `/ops/git/preview`。
2. **门面**: `GitOpsService.preview_sync()` 创建 `GitOpsContainer`。
3. **委托**: 委托给 `container.preview_service.preview_sync()`。
4. **Dry Run**: 扫描文件并对比数据库，但不执行任何写操作。
5. **返回预览**: 返回 `PreviewResult`，包含待创建、更新、删除的文章列表。

### 重新同步流程 (resync_post_metadata)

1. **触发**: 管理员调用 API `/ops/git/posts/{post_id}/resync-metadata`。
2. **门面**: `GitOpsService.resync_post_metadata()` 创建 `GitOpsContainer`。
3. **委托**: 委托给 `container.resync_service.resync_post_metadata()`。
4. **单篇同步**: 重新读取指定文章的 Frontmatter，更新数据库。
5. **用途**: 修复 frontmatter 错误、补全缺失的元数据。

---

## 🏛️ 依赖注入容器详解

### 为什么需要容器？

#### 问题场景（重构前）

```python
# ❌ 每个服务都要自己创建依赖
class GitOpsService:
    def __init__(self, session):
        # 重复创建
        self.scanner = MDXScanner(content_dir)
        self.serializer = PostSerializer(session)
        self.git_client = GitClient(content_dir)
```

**问题**:

1. 依赖创建逻辑分散在各处
2. 重复创建相同的对象（浪费资源）
3. 难以测试（无法轻松 mock 依赖）
4. 修改依赖关系时要改很多地方

#### 容器解决方案（重构后）

```python
# ✅ 容器统一管理依赖
class GitOpsContainer:
    def __init__(self, session, content_dir):
        # 核心组件：容器创建并持有
        self.scanner = MDXScanner(content_dir)
        self.serializer = PostSerializer(session)
        self.git_client = GitClient(content_dir)

        # 服务层：延迟加载
        self._sync_service = None

    @property
    def sync_service(self):
        """单例模式：只创建一次"""
        if self._sync_service is None:
            self._sync_service = SyncService(self.session, self)
        return self._sync_service
```

### 调用流程

```
用户代码
    ↓
GitOpsService (门面)
    ↓
GitOpsContainer (容器)
    ↓
具体服务 (SyncService, PreviewService, etc.)
    ↓
核心组件 (Scanner, Serializer, GitClient)
```

### 核心优势

1. **依赖共享**: 所有服务共享同一套核心组件，避免重复创建
2. **单例模式**: 每个服务在容器中只创建一次
3. **延迟加载**: 只在第一次访问时才创建服务
4. **易于测试**: 可以 mock 整个容器或单个组件
5. **集中管理**: 修改依赖关系只需改一处

### 测试示例

```python
# Mock 整个容器
mock_container = MagicMock()
mock_container.scanner.scan_all.return_value = []
service = SyncService(session, mock_container)

# 或者只 mock 某个组件
container = GitOpsContainer(session)
container.scanner = mock_scanner
service = SyncService(session, container)
```

---

## 🔧 常见问题

### 为什么删除了 `error_handler.py`?

为了保持代码的 Pythonic 和简洁性，我们移除了过度封装的 `safe_operation` 和 `handle_sync_error` 函数。现在的错误处理直接在各个服务中使用原生的 `try...except` 块，这样控制流更加清晰，开发者能直观地看到错误是如何被捕获、记录日志并添加到统计信息中的。

### 为什么要拆分服务？

原来的 `service.py` 有 481 行，包含了同步、预览、重新同步、提交等多个功能。拆分后：

- 每个服务类只负责一个功能领域（单一职责原则）
- 代码更易于理解和维护
- 测试更加聚焦
- 修改一个功能不影响其他功能

### 如何向后兼容？

`GitOpsService` 保持了原有的 API 不变，所有现有代码无需修改。内部实现改为委托给容器中的服务，对外部调用者完全透明。

---

**最后更新**: 2026-01-23
**文档版本**: 3.3.0 (依赖注入容器重构)
