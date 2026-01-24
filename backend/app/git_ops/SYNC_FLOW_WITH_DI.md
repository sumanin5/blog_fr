# GitOps 同步流程详解（含依赖注入）

本文档详细说明了 GitOps 模块的完整同步流程，重点展示依赖注入容器如何在实际业务中发挥作用。

---

## 🔄 完整同步流程图

```mermaid
sequenceDiagram
    participant User as 管理员/Webhook
    participant Router as GitOps Router
    participant Facade as GitOpsService<br/>(门面)
    participant Container as GitOpsContainer<br/>(容器)
    participant SyncSvc as SyncService
    participant Scanner as MDXScanner
    participant GitClient as GitClient
    participant Serializer as PostSerializer
    participant Handler as Handlers
    participant PostSvc as PostService
    participant DB as PostgreSQL

    User->>Router: POST /ops/git/sync
    Router->>Facade: 创建 GitOpsService(session)
    Facade->>Container: 创建 GitOpsContainer(session)

    Note over Container: 立即创建核心组件
    Container->>Scanner: 创建 MDXScanner
    Container->>Serializer: 创建 PostSerializer
    Container->>GitClient: 创建 GitClient

    Router->>Facade: sync_all()
    Facade->>Container: container.sync_service.sync_all()

    Note over Container: 延迟创建服务（第一次访问）
    Container->>SyncSvc: 创建 SyncService(session, container)

    SyncSvc->>GitClient: pull() - 拉取最新代码
    GitClient-->>SyncSvc: 成功/失败（失败仅警告）

    SyncSvc->>Scanner: scan_all() - 扫描所有 MDX 文件
    Scanner->>Scanner: 并发扫描文件系统
    Scanner->>Scanner: 计算文件哈希
    Scanner->>Scanner: 推导 post_type 和 category
    Scanner-->>SyncSvc: List[ScannedPost]

    SyncSvc->>DB: 查询所有已同步文章<br/>(source_path IS NOT NULL)
    DB-->>SyncSvc: List[Post]

    loop 遍历扫描到的文件
        SyncSvc->>Serializer: match_post(scanned, db_posts)
        Serializer-->>SyncSvc: (matched_post, is_renamed)

        alt 文章不存在（新增）
            SyncSvc->>Handler: handle_post_create()
            Handler->>Serializer: from_frontmatter()
            Serializer->>Serializer: Pipeline 处理<br/>(Processors)
            Serializer-->>Handler: post_dict
            Handler->>PostSvc: create_post()
            PostSvc->>DB: INSERT
            DB-->>PostSvc: new_post
            PostSvc-->>Handler: new_post
            Handler-->>SyncSvc: 添加到 stats.added
        else 文章存在（更新）
            SyncSvc->>Handler: handle_post_update()
            Handler->>Serializer: from_frontmatter()
            Serializer-->>Handler: post_dict
            Handler->>PostSvc: update_post()
            PostSvc->>DB: UPDATE
            DB-->>PostSvc: updated_post
            PostSvc-->>Handler: updated_post
            Handler-->>SyncSvc: 添加到 stats.updated
        end

        Note over SyncSvc: 每个文件的处理都在<br/>独立的 try-except 块中<br/>错误不会中断整体流程
    end

    loop 检测删除的文章
        SyncSvc->>SyncSvc: 数据库中存在但扫描中未找到
        SyncSvc->>PostSvc: delete_post()
        PostSvc->>DB: DELETE
        DB-->>PostSvc: 成功
        PostSvc-->>SyncSvc: 添加到 stats.deleted
    end

    SyncSvc-->>Facade: SyncStats
    Facade-->>Router: SyncStats
    Router-->>User: JSON Response
```

---

## 📦 依赖注入在流程中的体现

### 阶段 1: 容器初始化

```python
# 在 GitOpsService.__init__ 中
class GitOpsService:
    def __init__(self, session: AsyncSession):
        # 创建容器，立即初始化核心组件
        self.container = GitOpsContainer(session)
        # 此时已创建:
        # - self.container.scanner
        # - self.container.serializer
        # - self.container.git_client
        # - self.container.writer
```

**关键点**:

- 容器在门面服务创建时立即初始化
- 核心组件在容器构造函数中立即创建
- 服务层尚未创建（延迟加载）

### 阶段 2: 服务延迟创建

```python
# 在 GitOpsService.sync_all 中
async def sync_all(self, default_user: User = None):
    # 第一次访问 sync_service 时才创建
    return await self.container.sync_service.sync_all(default_user)
    #                          ^^^^^^^^^^^^
    #                          触发 @property 延迟加载
```

**容器内部**:

```python
@property
def sync_service(self):
    if self._sync_service is None:
        # 创建服务，注入 session 和容器自己
        self._sync_service = SyncService(self.session, self)
        #                                               ^^^^
        #                                        把容器传进去！
    return self._sync_service
```

**关键点**:

- 服务只在第一次访问时创建（延迟加载）
- 服务创建时注入容器引用
- 后续访问返回同一个实例（单例）

### 阶段 3: 服务使用注入的组件

```python
# 在 SyncService.sync_all 中
class SyncService(BaseGitOpsService):
    async def sync_all(self, default_user: User = None):
        # 使用注入的 git_client
        await self.git_client.pull()
        #         ^^^^^^^^^^^^
        #         从容器注入的

        # 使用注入的 scanner
        scanned_posts = await self.scanner.scan_all()
        #                         ^^^^^^^^
        #                         从容器注入的

        # 使用注入的 serializer
        for scanned in scanned_posts:
            matched_post, is_renamed = await self.serializer.match_post(
                #                                  ^^^^^^^^^^
                #                                  从容器注入的
                scanned, db_posts
            )
```

**关键点**:

- 服务不需要自己创建依赖
- 所有依赖都从容器获取
- 多个服务共享同一套组件

---

## 🎯 增量同步流程（v3.2.0+）

```mermaid
sequenceDiagram
    participant User as 管理员/Webhook
    participant SyncSvc as SyncService
    participant GitClient as GitClient
    participant Scanner as MDXScanner
    participant FS as 文件系统
    participant DB as PostgreSQL

    User->>SyncSvc: sync_incremental()

    SyncSvc->>FS: 读取 .gitops_last_sync
    alt 有上次同步记录
        FS-->>SyncSvc: last_commit_hash

        SyncSvc->>GitClient: pull()
        GitClient-->>SyncSvc: 成功

        SyncSvc->>GitClient: get_current_hash()
        GitClient-->>SyncSvc: current_hash

        SyncSvc->>GitClient: get_changed_files(last, current)
        GitClient-->>SyncSvc: List[changed_files]

        Note over SyncSvc: 只处理变更的文件
        loop 遍历变更文件
            alt 文件被删除
                SyncSvc->>DB: 删除对应文章
            else 文件新增/修改
                SyncSvc->>Scanner: scan_single(file_path)
                Scanner-->>SyncSvc: ScannedPost
                SyncSvc->>SyncSvc: 处理新增/更新
            end
        end

        SyncSvc->>FS: 保存 current_hash 到 .gitops_last_sync
        SyncSvc-->>User: SyncStats (增量)

    else 无上次同步记录
        Note over SyncSvc: 降级为全量同步
        SyncSvc->>SyncSvc: sync_all()
        SyncSvc-->>User: SyncStats (全量)
    end
```

---

## 🔍 错误处理流程

```mermaid
flowchart TB
    Start[开始同步] --> Pull{Git Pull}
    Pull -->|成功| Scan[扫描文件]
    Pull -->|失败| LogWarn[记录警告] --> Scan

    Scan --> Loop{遍历文件}
    Loop -->|下一个文件| Process[处理文件]

    Process --> Try{try-except}
    Try -->|成功| AddStats[添加到统计]
    Try -->|GitOpsSyncError| LogError1[记录错误] --> AddError1[添加到 errors]
    Try -->|Exception| LogError2[记录堆栈] --> AddError2[添加到 errors]

    AddStats --> Loop
    AddError1 --> Loop
    AddError2 --> Loop

    Loop -->|完成| Delete[检测删除]
    Delete --> Return[返回 SyncStats]

    style Try fill:#fff4e6
    style LogError1 fill:#ffe6e6
    style LogError2 fill:#ffe6e6
```

### 错误处理策略

1. **配置错误** (`GitOpsConfigurationError`)

   - 示例: content 目录不存在
   - 处理: 直接抛出，中断流程
   - 原因: 无法继续执行

2. **业务逻辑错误** (`GitOpsSyncError`)

   - 示例: 必填字段缺失、author 不存在
   - 处理: 记录错误，跳过当前文件，继续处理其他文件
   - 原因: 单个文件的错误不应影响整体同步

3. **系统错误** (`Exception`)
   - 示例: 数据库连接失败、文件读取权限问题
   - 处理: 记录完整堆栈，跳过当前文件
   - 原因: 确保单个文件的崩溃不会影响其他文件

### 错误处理代码示例

```python
# 在 SyncService.sync_all 中
for scanned in scanned_posts:
    try:
        # 处理文件
        matched_post, is_renamed = await self.serializer.match_post(...)

        if matched_post:
            await handle_post_update(...)
        else:
            await handle_post_create(...)

    except GitOpsSyncError as e:
        # 业务逻辑错误：记录并继续
        logger.error(f"同步文件失败: {scanned.file_path} - {e}")
        stats.errors.append({
            "file": str(scanned.file_path),
            "error": str(e),
            "type": "sync_error"
        })

    except Exception as e:
        # 系统错误：记录堆栈并继续
        logger.exception(f"处理文件时发生未预期错误: {scanned.file_path}")
        stats.errors.append({
            "file": str(scanned.file_path),
            "error": str(e),
            "type": "unexpected_error",
            "traceback": traceback.format_exc()
        })
```

---

## 🧪 测试中的依赖注入

### Mock 整个容器

```python
from unittest.mock import MagicMock, AsyncMock

async def test_sync_all_with_mock_container():
    # 创建 mock 容器
    mock_container = MagicMock()
    mock_container.scanner.scan_all = AsyncMock(return_value=[])
    mock_container.git_client.pull = AsyncMock()

    # 创建服务（注入 mock 容器）
    service = SyncService(session, mock_container)

    # 执行测试
    stats = await service.sync_all()

    # 验证调用
    mock_container.git_client.pull.assert_called_once()
    mock_container.scanner.scan_all.assert_called_once()
```

### Mock 单个组件

```python
async def test_sync_all_with_partial_mock():
    # 创建真实容器
    container = GitOpsContainer(session)

    # 只 mock scanner
    mock_scanner = AsyncMock()
    mock_scanner.scan_all.return_value = [
        ScannedPost(file_path="test.mdx", frontmatter={...})
    ]
    container.scanner = mock_scanner

    # 创建服务（使用部分 mock 的容器）
    service = SyncService(session, container)

    # 测试
    stats = await service.sync_all()
    # scanner 是 mock 的，但 serializer 是真实的
```

---

## 📊 性能优化

### 并发扫描

```python
# Scanner 内部使用 asyncio.gather 并发扫描
async def scan_all(self) -> List[ScannedPost]:
    tasks = [self._scan_file(file_path) for file_path in all_files]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, ScannedPost)]
```

### 增量同步优势

| 指标       | 全量同步           | 增量同步          |
| ---------- | ------------------ | ----------------- |
| 扫描文件数 | 所有文件 (~100+)   | 仅变更文件 (~5)   |
| 数据库查询 | 查询所有文章       | 仅查询变更文章    |
| 处理时间   | ~10s               | ~1s               |
| 适用场景   | 首次同步、修复数据 | 日常 Webhook 触发 |

---

## 🔗 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 整体架构设计
- [DEPENDENCY_INJECTION_EXPLAINED.md](./DEPENDENCY_INJECTION_EXPLAINED.md) - 依赖注入详解
- [README.md](./README.md) - 模块使用指南

---

**最后更新**: 2026-01-24
**文档版本**: 1.0.0
