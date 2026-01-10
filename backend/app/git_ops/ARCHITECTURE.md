# GitOps 架构设计文档

## 📐 系统架构

### 整体架构图

```mermaid
graph LR
    subgraph "外部触发源"
        A1[管理员手动触发]
        A2[定时任务 - 未实现]
        A3[Git Webhook - 未实现]
        A4[文件系统监听 - 未实现]
    end

    subgraph "API 层"
        B[GitOps Router<br>/ops/git/sync]
    end

    subgraph "业务逻辑层"
        C[GitOpsService<br>同步编排]
        D[MDXScanner<br>文件扫描]
        E[GitClient<br>Git操作 - 未完整实现]
    end

    subgraph "数据层"
        F[PostService<br>文章 CRUD]
        G[(PostgreSQL<br>数据库)]
        H[文件系统<br>content/]
    end

    A1 -->|HTTP POST| B
    A2 -.->|APScheduler| C
    A3 -.->|Webhook| C
    A4 -.->|watchdog| C

    B -->|认证授权| B
    B -->|调用| C

    C -->|扫描文件| D
    C -.->|Git Pull| E
    C -->|CRUD 操作| F

    D -->|读取| H
    E -.->|命令行| H
    F -->|SQL| G

    style A2 stroke-dasharray: 5 5
    style A3 stroke-dasharray: 5 5
    style A4 stroke-dasharray: 5 5
    style E stroke-dasharray: 5 5
```

---

## 🔄 核心流程设计

### 1. 完整同步流程

```mermaid
flowchart TD
    Start([开始同步]) --> Init[初始化 GitOpsService]
    Init --> ValidateConfig{验证 CONTENT_DIR}

    ValidateConfig -->|失败| ErrorConfig[抛出 GitOpsConfigurationError]
    ValidateConfig -->|成功| GetUser{获取操作用户}

    GetUser -->|已提供| UseProvided[使用 default_user]
    GetUser -->|未提供| QuerySuperAdmin[查询 Superadmin]

    UseProvided --> StartScan[开始扫描]
    QuerySuperAdmin -->|找到| StartScan
    QuerySuperAdmin -->|未找到| ErrorNoUser[抛出配置错误]

    StartScan --> ScanFiles[MDXScanner.scan_all]
    ScanFiles --> ParseLoop{遍历文件}

    ParseLoop -->|每个文件| ReadFile[读取文件内容]
    ReadFile --> ParseFrontmatter[解析 Frontmatter]
    ParseFrontmatter --> CalcHashes[计算双哈希]
    CalcHashes --> BuildScanned[构建 ScannedPost]
    BuildScanned --> ParseLoop

    ParseLoop -->|完成| QueryDB[查询数据库]
    QueryDB --> FilterSourcePath[过滤 source_path IS NOT NULL]
    FilterSourcePath --> BuildMaps[构建两个映射表]

    BuildMaps --> ProcessNew[处理新增/更新]
    ProcessNew --> FileLoop{遍历扫描文件}

    FileLoop -->|每个文件| CheckExists{数据库中存在?}

    CheckExists -->|是| MapToUpdate[映射为 PostUpdate]
    CheckExists -->|否| MapToCreate[映射为 PostCreate]

    MapToUpdate --> ValidateUpdate{Pydantic 验证}
    MapToCreate --> ValidateCreate{Pydantic 验证}

    ValidateUpdate -->|成功| CallUpdate[post_service.update_post]
    ValidateUpdate -->|失败| LogUpdateError[记录到 errors]

    ValidateCreate -->|成功| CallCreate[post_service.create_post]
    ValidateCreate -->|失败| LogCreateError[记录到 errors]

    CallUpdate --> RecordUpdated[stats.updated.append]
    CallCreate --> RecordAdded[stats.added.append]
    LogUpdateError --> FileLoop
    LogCreateError --> FileLoop
    RecordUpdated --> FileLoop
    RecordAdded --> FileLoop

    FileLoop -->|完成| ProcessDeleted[处理删除]
    ProcessDeleted --> DBLoop{遍历数据库文章}

    DBLoop -->|每个文章| CheckFileExists{文件存在?}

    CheckFileExists -->|否| CallDelete[post_service.delete_post]
    CheckFileExists -->|是| DBLoop

    CallDelete --> RecordDeleted[stats.deleted.append]
    RecordDeleted --> DBLoop

    DBLoop -->|完成| CalcDuration[计算总耗时]
    CalcDuration --> ReturnStats[返回 SyncStats]

    ReturnStats --> End([结束])
    ErrorConfig --> End
    ErrorNoUser --> End
```

### 2. 文件扫描流程

```mermaid
flowchart LR
    A[开始扫描] --> B[glob **/*.md<br>**/*.mdx]
    B --> C{遍历匹配文件}

    C --> D[计算相对路径]
    D --> E[异步读取文件]
    E --> F[python-frontmatter<br>解析]
    F --> G[提取 metadata]
    F --> H[提取 content]

    G --> I[JSON 序列化]
    I --> J[SHA256 meta_hash]

    E --> K[原始内容]
    K --> L[SHA256 content_hash]

    J --> M[构建 ScannedPost]
    L --> M
    H --> M
    D --> M

    M --> N[获取文件 mtime]
    N --> O[加入结果列表]

    O --> C
    C -->|结束| P([返回 List])
```

### 3. Frontmatter 映射流程

```mermaid
flowchart TD
    A[ScannedPost] --> B{读取 frontmatter}

    B --> C[title]
    B --> D[slug]
    B --> E[summary/excerpt]
    B --> F[published]
    B --> G[cover/image]

    C -->|存在| C1[使用字段值]
    C -->|缺失| C2[使用文件名]

    D -->|存在| D1[使用字段值]
    D -->|缺失| D2[使用文件名.stem]

    E -->|存在| E1[使用字段值]
    E -->|缺失| E2[设为空字符串]

    F -->|存在| F1[使用布尔值]
    F -->|缺失| F2[默认 True]

    G -->|存在| G1[使用 URL]
    G -->|缺失| G2[设为 None]

    C1 --> H{CREATE 或 UPDATE?}
    C2 --> H
    D1 --> H
    D2 --> H
    E1 --> H
    E2 --> H
    F1 --> I[转换为 is_published]
    F2 --> I
    G1 --> H
    G2 --> H

    I --> H

    H -->|CREATE| J[添加 source_path]
    H -->|UPDATE| K[不修改 source_path]

    J --> L[PostCreate Schema]
    K --> M[PostUpdate Schema]

    L --> N[Pydantic 验证]
    M --> N

    N -->|成功| O[传递给 PostService]
    N -->|失败| P[抛出 ValidationError]
```

---

## 🗂️ 模块职责划分

### 1. `router.py` - API 入口层

**职责：**
- 定义 HTTP 端点
- 权限认证（需要管理员）
- 依赖注入（Session、User）
- 调用 Service 层

**关键代码：**
```python
@router.post("/sync", response_model=SyncStats)
async def trigger_sync(
    current_user: User = Depends(get_current_adminuser),
    session: AsyncSession = Depends(get_async_session),
):
    service = GitOpsService(session)
    return await service.sync_all(default_user=current_user)
```

---

### 2. `service.py` - 业务逻辑层

**职责：**
- 同步流程编排
- 增删改查决策
- 错误处理与统计
- 调用 Scanner 和 PostService

**核心方法：**

| 方法 | 功能 |
|------|------|
| `sync_all()` | 主同步流程 |
| `_sync_single_file()` | 单文件同步逻辑 |
| `_map_frontmatter_to_post()` | 字段映射转换 |

**数据结构：**
```python
class SyncStats(BaseModel):
    added: List[str]      # 新增文件路径
    updated: List[str]    # 更新文件路径
    deleted: List[str]    # 删除文件路径
    skipped: int          # 跳过数量
    errors: List[str]     # 错误信息
    duration: float       # 总耗时（秒）
```

---

### 3. `scanner.py` - 文件扫描层

**职责：**
- 文件系统遍历
- Frontmatter 解析
- 哈希计算
- 异步 I/O 处理

**核心类：**
```python
class ScannedPost(BaseModel):
    file_path: str         # 相对路径
    content_hash: str      # 全文 SHA256
    meta_hash: str         # Frontmatter SHA256
    frontmatter: Dict      # 元数据
    content: str           # 正文
    updated_at: float      # 文件 mtime
```

**关键实现：**
- 使用 `asyncio.to_thread()` 避免阻塞
- `python-frontmatter` 库解析
- SHA256 哈希保证唯一性

---

### 4. `git_client.py` - Git 操作层（预留）

**职责：**
- 执行 Git 命令
- 非阻塞异步调用
- 错误处理

**已实现方法：**

| 方法 | 功能 | 状态 |
|------|------|------|
| `pull()` | 拉取最新代码 | ✅ 已实现 |
| `get_current_hash()` | 获取当前 commit | ✅ 已实现 |
| `get_changed_files()` | 获取变更文件列表 | ✅ 已实现 |
| `get_file_status()` | 工作区状态 | ✅ 已实现 |

**未集成原因：**
当前 `sync_all()` 为全量同步，未调用 GitClient。
计划在增量同步时集成：
```python
# 未来代码示例
before_hash = await git_client.get_current_hash()
await git_client.pull()
after_hash = await git_client.get_current_hash()
changed_files = await git_client.get_changed_files(before_hash)
```

---

### 5. `exceptions.py` - 异常定义

**异常层次结构：**

```mermaid
classDiagram
    BaseAppException <|-- GitOpsError
    GitOpsError <|-- GitOpsConfigurationError
    GitOpsError <|-- GitOpsSyncError

    class BaseAppException {
        +message: str
        +status_code: int
        +error_code: str
    }

    class GitOpsError {
        <<abstract>>
    }

    class GitOpsConfigurationError {
        +status_code: 500
        +error_code: GITOPS_CONFIG_ERROR
    }

    class GitOpsSyncError {
        +status_code: 400
        +error_code: GITOPS_SYNC_ERROR
        +details: dict
    }
```

---

## 🔗 与其他模块的交互

### 依赖关系图

```mermaid
graph TD
    GitOps[git_ops] --> Posts[posts]
    GitOps --> Users[users]
    GitOps --> Core[core]

    Posts --> DB[(Database)]
    Users --> DB
    Core --> Settings[settings]

    GitOps -.->|未来集成| Git[Git Repository]

    subgraph "posts 模块"
        Posts --> PostService[service.py]
        PostService --> PostCRUD[crud.py]
        PostService --> PostSchema[schema.py]
    end

    subgraph "users 模块"
        Users --> UserDeps[dependencies.py]
        UserDeps --> Auth[认证]
    end

    subgraph "core 模块"
        Core --> Config[config.py]
        Core --> Exceptions[exceptions.py]
        Core --> DBSession[db.py]
    end
```

### 调用链分析

```
HTTP Request
    ↓
FastAPI Router (router.py)
    ↓ Depends(get_current_adminuser) ← users.dependencies
    ↓ Depends(get_async_session) ← core.db
    ↓
GitOpsService.sync_all() (service.py)
    ↓
MDXScanner.scan_all() (scanner.py)
    ↓ 遍历文件系统
    ↓
[对比数据库] ← Post 查询 (posts.model)
    ↓
post_service.create_post() ← posts.service
post_service.update_post() ← posts.service
post_service.delete_post() ← posts.service
    ↓
PostCRUD 操作 ← posts.crud
    ↓
SQLModel ORM → PostgreSQL
    ↓
返回 SyncStats
```

---

## 📊 数据模型关系

### Post 模型关键字段

```mermaid
erDiagram
    POST {
        int id PK
        string title
        string slug UK
        string content_mdx
        string excerpt
        bool is_published
        string cover_image
        string source_path UK "GitOps 关键字段"
        int author_id FK
        datetime created_at
        datetime updated_at
    }

    USER {
        int id PK
        string username
        enum role
    }

    POST ||--o{ USER : "author"

    note "source_path: 标识文件系统来源<br>唯一约束防止重复同步"
```

### 同步状态判断

| 场景 | source_path (DB) | file_path (FS) | 操作 |
|------|------------------|----------------|------|
| 新文件 | NULL / 不存在 | 存在 | CREATE |
| 更新文件 | 存在 | 存在 | UPDATE |
| 删除文件 | 存在 | 不存在 | DELETE |
| 手动创建 | NULL | - | 忽略（不参与 GitOps）|

---

## ⚡ 性能优化策略

### 当前实现

1. **异步 I/O**
   - `asyncio.to_thread()` 文件读取
   - `AsyncSession` 数据库操作

2. **单次数据库查询**
   - 一次查询获取所有 GitOps 文章
   - 内存中构建映射表

### 优化建议

#### 1. 增量同步（重要）

```python
# 伪代码
before_hash = await git_client.get_current_hash()
await git_client.pull()
changed_files = await git_client.get_changed_files(before_hash)

# 只处理变更文件
for file in changed_files:
    await sync_single_file(file)
```

**预期收益：**
- 🚀 减少 95% 文件扫描时间
- 💾 降低 CPU 和内存占用

#### 2. 并发处理

```python
# 并发扫描文件
tasks = [scanner.scan_file(f) for f in files]
results = await asyncio.gather(*tasks)

# 并发创建/更新
tasks = [process_file(f) for f in to_process]
await asyncio.gather(*tasks, return_exceptions=True)
```

**预期收益：**
- ⚡ I/O 密集型任务提速 3-5 倍

#### 3. 缓存优化

```python
# 内存缓存文件哈希
cache = {
    "file.mdx": {
        "hash": "abc123...",
        "mtime": 1234567890.0
    }
}

# 跳过未修改文件
if file_mtime == cache[file]["mtime"]:
    skip_processing()
```

#### 4. 批量操作

```python
# 批量插入（未来优化）
await session.execute(
    insert(Post),
    [{"title": p.title, ...} for p in new_posts]
)
```

---

## 🧩 扩展点设计

### 1. 自定义字段映射

```python
class CustomMapper:
    def map_frontmatter(self, scanned: ScannedPost) -> Dict:
        # 自定义映射逻辑
        return {
            "title": scanned.frontmatter.get("heading"),
            "tags": self.parse_tags(scanned.frontmatter["keywords"]),
            ...
        }

# 在 Service 中注入
service = GitOpsService(session, mapper=CustomMapper())
```

### 2. 同步钩子（Hooks）

```python
class SyncHooks:
    async def before_sync(self, files: List[str]):
        # 同步前验证
        pass

    async def after_create(self, post: Post):
        # 创建后通知
        await send_webhook(post)

    async def after_sync(self, stats: SyncStats):
        # 同步完成后清理缓存
        await cache.clear()
```

### 3. 多仓库支持

```python
repos = [
    {"path": "content/blog", "category": "blog"},
    {"path": "content/docs", "category": "documentation"},
]

for repo in repos:
    service = GitOpsService(session, content_dir=repo["path"])
    await service.sync_all()
```

---

## 🔐 安全性设计

### 威胁模型

| 威胁 | 缓解措施 | 状态 |
|------|---------|------|
| 路径遍历攻击 | 限制在 CONTENT_DIR 内 | ✅ |
| 恶意 Frontmatter | Pydantic 验证 | ✅ |
| SQL 注入 | SQLModel ORM | ✅ |
| 权限提升 | 管理员认证 | ✅ |
| DDoS 同步 | 未实现速率限制 | ⚠️ |
| 敏感信息泄露 | 日志脱敏 | ⚠️ |

### 权限矩阵

| 操作 | 匿名 | 普通用户 | 管理员 | 超级管理员 |
|------|-----|---------|--------|-----------|
| 触发同步 | ❌ | ❌ | ✅ | ✅ |
| 查看同步历史 | ❌ | ❌ | ✅ | ✅ |
| 配置 CONTENT_DIR | ❌ | ❌ | ❌ | ✅ |

---

## 📈 监控与可观测性

### 建议添加的指标

```python
# Prometheus 指标示例
gitops_sync_duration_seconds = Histogram(...)
gitops_files_processed_total = Counter(...)
gitops_errors_total = Counter(...)
gitops_last_sync_timestamp = Gauge(...)
```

### 日志级别

| 事件 | 级别 | 示例 |
|------|-----|------|
| 同步开始 | INFO | `Starting GitOps sync...` |
| 文件扫描完成 | INFO | `Scanned 42 files.` |
| 文件处理失败 | WARNING | `Failed to sync file.mdx: ValidationError` |
| 配置错误 | ERROR | `CONTENT_DIR not found` |
| 同步完成 | INFO | `Sync completed in 1.23s` |

---

## 🔄 部署建议

### 方式一：定时任务

```python
# 使用 APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(
    sync_task,
    'cron',
    hour='*/1',  # 每小时
)
scheduler.start()
```

### 方式二：Webhook

```python
@router.post("/webhook/github")
async def github_webhook(payload: GitHubWebhookPayload):
    # 验证签名
    verify_github_signature(payload)

    # 触发同步
    service = GitOpsService(session)
    await service.sync_all()
```

### 方式三：文件监听

```python
from watchdog.observers import Observer

observer = Observer()
observer.schedule(
    SyncHandler(),
    path='content/',
    recursive=True
)
observer.start()
```

---

## 📝 总结

### 架构亮点

✅ **关注点分离** - 清晰的分层架构
✅ **异步优先** - 全异步 I/O 设计
✅ **错误隔离** - 单文件失败不影响整体
✅ **可扩展性** - 预留多个扩展点

### 待改进点

🚧 **增量同步** - 当前为全量扫描
🚧 **并发处理** - 文件处理串行
🚧 **测试覆盖** - 缺少自动化测试
🚧 **监控指标** - 缺少可观测性

### 技术栈

- **语言**: Python 3.9+
- **框架**: FastAPI + SQLModel
- **解析**: python-frontmatter
- **数据库**: PostgreSQL
- **异步**: asyncio

---

**最后更新**: 2026-01-10
**文档版本**: 1.0.0
