# GitOps Services 架构

## 概述

将原来 481 行的 `service.py` 拆分为多个职责单一的服务类，使用**依赖注入容器**管理所有依赖，提高代码可维护性和可测试性。

## 架构设计

### 依赖注入容器模式

```
GitOpsContainer (容器)
├── 核心组件
│   ├── scanner (MDXScanner)
│   ├── serializer (PostSerializer)
│   ├── writer (FileWriter)
│   └── git_client (GitClient)
└── 服务层（延迟加载）
    ├── sync_service (SyncService)
    ├── preview_service (PreviewService)
    ├── resync_service (ResyncService)
    └── commit_service (CommitService)
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

## 目录结构

```
app/git_ops/
├── service.py                    # 主服务（门面模式）~70 行
├── container.py                  # 依赖注入容器 ~80 行
├── background_tasks.py           # 后台任务 ~40 行
└── services/
    ├── __init__.py              # 服务导出
    ├── base.py                  # 基类（共享逻辑）~50 行
    ├── sync_service.py          # 同步服务 ~280 行
    ├── preview_service.py       # 预览服务 ~80 行
    ├── resync_service.py        # 重新同步服务 ~80 行
    └── commit_service.py        # Git 提交服务 ~30 行
```

## 核心组件

### `GitOpsContainer` - 依赖注入容器

**职责**：管理所有 GitOps 相关的依赖和服务

**管理的核心组件**：

- `scanner` - MDX 文件扫描器
- `serializer` - Post 序列化器
- `writer` - 文件写入器
- `git_client` - Git 客户端

**管理的服务**（延迟加载，单例）：

- `sync_service` - 同步服务
- `preview_service` - 预览服务
- `resync_service` - 重新同步服务
- `commit_service` - 提交服务

**优点**：

- ✅ **单例模式**：每个服务在容器中只创建一次
- ✅ **延迟加载**：只在需要时才创建服务
- ✅ **依赖共享**：所有服务共享同一套核心组件
- ✅ **易于测试**：可以 mock 整个容器或单个组件

**示例**：

```python
# 创建容器
container = GitOpsContainer(session)

# 访问核心组件
scanner = container.scanner
serializer = container.serializer

# 访问服务（延迟加载）
sync_service = container.sync_service  # 第一次访问时创建
preview_service = container.preview_service
```

### `BaseGitOpsService` - 服务基类

**职责**：提供所有服务共享的依赖和辅助方法

**依赖注入**：

```python
def __init__(self, session: AsyncSession, container=None):
    # 如果提供容器，使用容器的依赖
    if container:
        self.container = container
        self.scanner = container.scanner
        # ...
    else:
        # 向后兼容：自己创建容器
        self.container = GitOpsContainer(session)
```

**共享方法**：

- `_get_operating_user()` - 获取操作用户

## 服务层

### `SyncService` - 同步服务

**职责**：负责全量和增量同步

**公开方法**：

- `sync_all()` - 全量同步
- `sync_incremental()` - 增量同步

**特性**：

- 使用 `asyncio.Lock` 防止并发同步
- 支持增量同步（基于 Git diff）
- 自动回退到全量同步（当增量失败时）

### `PreviewService` - 预览服务

**职责**：提供同步预览功能（Dry Run）

**公开方法**：

- `preview_sync()` - 预览同步变更

**返回**：

- `PreviewResult` - 包含待创建、更新、删除的文章列表

### `ResyncService` - 重新同步服务

**职责**：重新同步单个文章的元数据

**公开方法**：

- `resync_post_metadata()` - 重新同步指定文章

**用途**：

- 修复 frontmatter 错误
- 补全缺失的元数据
- 手动触发单篇文章同步

### `CommitService` - Git 提交服务

**职责**：自动提交和推送到 Git

**公开方法**：

- `auto_commit()` - 执行 git add/commit/push

### `GitOpsService` - 主服务（门面）

**职责**：协调各个子服务，提供统一的 API

**设计模式**：门面模式（Facade Pattern）

**实现**：

```python
class GitOpsService:
    def __init__(self, session: AsyncSession):
        # 创建容器
        self.container = GitOpsContainer(session)

    async def sync_all(self, default_user: User = None):
        # 委托给容器中的服务
        return await self.container.sync_service.sync_all(default_user)
```

**优点**：

- 向后兼容：保持原有 API 不变
- 简化接口：隐藏子服务的复杂性
- 统一入口：所有 GitOps 操作通过主服务

## 依赖注入的优势

### 1. 单一职责

每个服务只负责一个功能领域，容器负责管理依赖。

### 2. 依赖共享

所有服务共享同一套核心组件（scanner, serializer 等），避免重复创建。

### 3. 易于测试

```python
# 可以 mock 整个容器
mock_container = MagicMock()
service = SyncService(session, mock_container)

# 或者 mock 单个组件
container = GitOpsContainer(session)
container.scanner = mock_scanner
service = SyncService(session, container)
```

### 4. 延迟加载

服务只在第一次访问时创建，节省资源。

### 5. 向后兼容

如果不提供容器，服务会自己创建，保持向后兼容。

## 使用示例

### 基本使用

```python
from app.git_ops.service import GitOpsService

# 创建服务实例（内部创建容器）
service = GitOpsService(session)

# 全量同步
stats = await service.sync_all()

# 增量同步
stats = await service.sync_incremental()

# 预览同步
preview = await service.preview_sync()

# 重新同步单篇文章
await service.resync_post_metadata(post_id)

# 自动提交
await service.auto_commit("Update posts")
```

### 高级使用（直接使用容器）

```python
from app.git_ops.container import GitOpsContainer

# 创建容器
container = GitOpsContainer(session)

# 直接访问服务
stats = await container.sync_service.sync_all()
preview = await container.preview_service.preview_sync()

# 访问核心组件
scanned = await container.scanner.scan_file("test.mdx")
```

### 测试示例

```python
# Mock 容器
mock_container = MagicMock()
mock_container.scanner.scan_all.return_value = []
mock_container.serializer.match_post.return_value = (None, False)

# 创建服务
service = SyncService(session, mock_container)

# 测试
stats = await service.sync_all()
assert len(stats.added) == 0
```

## 迁移说明

### 向后兼容

所有现有代码无需修改，`GitOpsService` 的 API 保持不变。

### 导入变更

后台任务需要更新导入：

```python
# 旧的导入
from app.git_ops.service import run_background_sync, run_background_commit

# 新的导入
from app.git_ops.background_tasks import run_background_sync, run_background_commit
```

## 优点总结

1. ✅ **依赖注入**：通过容器管理所有依赖
2. ✅ **单一职责**：每个服务类只负责一个功能领域
3. ✅ **依赖共享**：避免重复创建核心组件
4. ✅ **延迟加载**：服务按需创建，节省资源
5. ✅ **易于测试**：可以 mock 容器或单个组件
6. ✅ **易于维护**：修改同步逻辑不影响预览逻辑
7. ✅ **向后兼容**：主服务保持相同的 API
8. ✅ **清晰结构**：代码组织更加清晰，易于理解
