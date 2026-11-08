> **已过时**：本文档包含旧的回写、导出和提交流程。当前单向同步说明见 [ONE_WAY_SYNC.md](../../docs/ONE_WAY_SYNC.md)。

# GitOps 架构设计文档（历史）

## 📐 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "触发层"
        A1[管理员手动触发]
        A2[定时任务 - 可选]
        A3[Git Webhook]
    end

    subgraph "API 层"
        B[GitOps Router<br>/ops/git/*]
    end

    subgraph "业务编排层 (Service)"
        C[GitOpsService<br>门面模式 - 统一入口]
        Container[GitOpsContainer<br>依赖注入容器]
    end

    subgraph "服务层 (Services)"
        S1[SyncService<br>同步服务]
        S2[PreviewService<br>预览服务]
        S3[ResyncService<br>重新同步服务]
        S4[CommitService<br>提交服务]
        S5[ExportService<br>导出服务]
    end

    subgraph "核心组件层 (Components)"
        D[Scanner<br>文件扫描 & 路径推导]
        E[Metadata<br>Pydantic 模型]
        F[Serializer<br>双向转换协调]
        G[Processors<br>Pipeline 处理]
        H[Handlers<br>业务逻辑]
        I[Writer<br>文件回写]
        J[GitClient<br>Git操作]
    end

    subgraph "数据层"
        K[PostService<br>文章 CRUD]
        L[(PostgreSQL)]
        M[文件系统<br>content/]
    end

    A1 -->|HTTP POST| B
    A3 -.->|Webhook| B

    B -->|创建| C
    C -->|创建| Container
    Container -->|延迟加载| S1 & S2 & S3 & S4 & S5

    C -->|委托| S1 & S2 & S3 & S4 & S5

    Container -->|提供| D & F & I & J

    S1 -->|使用| D & F & J
    S1 -->|调用| H
    S5 -->|使用| I & J

    H -->|序列化/反序列化| F
    F -->|验证| E
    F -->|Pipeline 处理| G
    H -->|CRUD| K
    H -->|回写ID| I

    K -->|SQL| L
    D -->|读取| M
    I -->|写入| M
    J -->|命令行| M

    style Container fill:#e1f5ff,stroke:#0077cc
    style S1 fill:#e8f5e9,stroke:#2e7d32
    style S2 fill:#e8f5e9,stroke:#2e7d32
    style S3 fill:#e8f5e9,stroke:#2e7d32
    style S4 fill:#e8f5e9,stroke:#2e7d32
    style S5 fill:#e8f5e9,stroke:#2e7d32
```

### API 端点概览

| 端点                                  | 方法 | 服务             | 说明                    |
| ------------------------------------- | ---- | ---------------- | ----------------------- |
| `/ops/git/sync`                       | POST | `SyncService`    | 触发同步（默认增量）    |
| `/ops/git/sync?force_full=true`       | POST | `SyncService`    | 强制全量同步            |
| `/ops/git/push`                       | POST | `ExportService`  | 导出数据库文章到 Git    |
| `/ops/git/preview`                    | GET  | `PreviewService` | 预览同步变更（Dry Run） |
| `/ops/git/posts/{id}/resync-metadata` | POST | `ResyncService`  | 重新同步单篇文章元数据  |
| `/ops/git/webhook`                    | POST | `SyncService`    | GitHub Webhook 入口     |

---

## 🔄 同步流程详解

### 文章同步流程 (Posts)

#### 完整同步流程图

```mermaid
flowchart TB
    Start([开始同步]) --> Pull[Git Pull]
    Pull --> Scan[扫描 MDX 文件]
    Scan --> Loop{遍历文件}

    Loop -->|文章文件| Match[匹配策略]
    Loop -->|index.md| CategorySync[分类同步]
    Loop -->|完成| Cleanup[清理孤儿记录]

    Match --> MatchResult{匹配结果}
    MatchResult -->|新增| Create[handle_post_create]
    MatchResult -->|更新| Update[handle_post_update]

    Create --> ProcessCreate[Processor Pipeline]
    Update --> ProcessUpdate[Processor Pipeline]

    ProcessCreate --> SaveCreate[保存到数据库]
    ProcessUpdate --> SaveUpdate[更新数据库]

    SaveCreate --> WriteBack[write_post_ids_to_frontmatter]
    SaveUpdate --> WriteBack

    WriteBack --> AddStats[添加到 stats]
    CategorySync --> AddStats
    AddStats --> Loop

    Cleanup --> WriteCategoryIndex[_write_category_indexes]
    WriteCategoryIndex --> CommitMeta[_commit_metadata_changes]
    CommitMeta --> Cache[刷新缓存]
    Cache --> End([返回 SyncStats])

    style Create fill:#d4edda
    style Update fill:#fff3cd
    style CategorySync fill:#e1f5ff
    style WriteBack fill:#ffe6e6
    style WriteCategoryIndex fill:#e1f5ff
    style CommitMeta fill:#ffe6e6
```

#### 文章元数据回写流程

```mermaid
flowchart LR
    A[文章同步完成] --> B[write_post_ids_to_frontmatter]
    B --> C[生成完整元数据]
    C --> D{包含哪些字段?}

    D --> E[基础字段<br>title, slug, date, status]
    D --> F[关系 ID<br>author_id, category_id, cover_media_id]
    D --> G[人类可读字段<br>author, category, cover, tags]

    E --> H[写入 frontmatter]
    F --> H
    G --> H

    H --> I[保存到文件]

    style B fill:#ffe6e6
    style C fill:#fff4e6
    style H fill:#e8f5e9
```

**回写的字段**：

- **基础字段**：`title`, `slug`, `date`, `status`, `featured`, `allow_comments`, 等
- **关系 ID**：`author_id`, `category_id`, `cover_media_id`, `tag_ids`（UUID 格式）
- **人类可读**：`author`（用户名）, `category`（slug）, `cover`（文件名）, `tags`（名称列表）

### 分类同步流程 (Categories)

#### 分类 index.md 解析流程

```mermaid
flowchart TB
    Start([扫描到 index.md]) --> Check{是分类索引?}
    Check -->|是| Parse[解析 frontmatter]
    Check -->|否| Skip[跳过]

    Parse --> Extract[提取字段]
    Extract --> Fields{解析哪些字段?}

    Fields --> F1[title → name]
    Fields --> F2[icon → icon_preset]
    Fields --> F3[order/sort → sort_order]
    Fields --> F4[hidden → is_active<br>反转]
    Fields --> F5[cover/image → cover_media_id]

    F1 --> Process
    F2 --> Process
    F3 --> Process
    F4 --> Process
    F5 --> CoverProcess[封面处理]

    CoverProcess --> CoverPriority{优先级}
    CoverPriority -->|1. cover_media_id| ValidateID[验证 UUID]
    CoverPriority -->|2. cover 字段| ResolveFile[解析文件名]

    ValidateID -->|有效| UseID[使用 ID]
    ValidateID -->|无效| ResolveFile
    ResolveFile --> UseID

    UseID --> Process[更新数据库]
    Process --> End([完成])

    style Parse fill:#e1f5ff
    style CoverProcess fill:#fff4e6
    style Process fill:#e8f5e9
```

#### 分类 index.md 回写流程

```mermaid
flowchart TB
    Start([同步完成]) --> Check[_write_category_indexes]
    Check --> Query[查询所有分类]
    Query --> Loop{遍历分类}

    Loop -->|下一个| Exists{index.md 存在?}
    Exists -->|是| Loop
    Exists -->|否| Create[创建 index.md]

    Create --> Generate[生成 frontmatter]
    Generate --> Fields{包含哪些字段?}

    Fields --> F1[title: name]
    Fields --> F2[icon: icon_preset]
    Fields --> F3[order: sort_order]
    Fields --> F4[hidden: !is_active]
    Fields --> F5[cover_media_id: UUID]
    Fields --> F6[cover: filename]

    F1 --> Write[写入文件]
    F2 --> Write
    F3 --> Write
    F4 --> Write
    F5 --> Write
    F6 --> Write

    Write --> AddStats[添加到 stats.added]
    AddStats --> Loop

    Loop -->|完成| Commit[_commit_metadata_changes]
    Commit --> End([提交到 GitHub])

    style Create fill:#d4edda
    style Generate fill:#fff4e6
    style Write fill:#e8f5e9
    style Commit fill:#ffe6e6
```

**回写的字段**：

- `title`: 分类名称
- `icon`: 图标（emoji）
- `order`: 排序顺序
- `hidden`: 是否隐藏（反转 `is_active`）
- `cover_media_id`: 封面 UUID
- `cover`: 封面文件名（人类可读）
- **Body**: 分类描述

### 封面处理优先级

#### 文章封面（Posts）

```mermaid
flowchart LR
    A[解析 frontmatter] --> B{有 cover_media_id?}
    B -->|是| C[验证 UUID]
    C -->|有效| D[✅ 使用 ID<br>1 次查询]
    C -->|无效| E[降级到 cover 字段]

    B -->|否| E
    E --> F{有 cover 字段?}
    F -->|是| G[解析文件名/路径]
    G --> H[查找媒体库]
    H --> I{找到?}
    I -->|是| J[✅ 使用找到的 ID]
    I -->|否| K[自动上传]
    K --> J

    F -->|否| L[❌ 无封面]

    style D fill:#d4edda
    style J fill:#d4edda
    style E fill:#fff3cd
    style L fill:#f8d7da
```

#### 分类封面（Categories）

```mermaid
flowchart LR
    A[解析 index.md] --> B{有 cover_media_id?}
    B -->|是| C[验证 UUID]
    C -->|有效| D[✅ 使用 ID<br>1 次查询]
    C -->|无效| E[降级到 cover 字段]

    B -->|否| E
    E --> F{有 cover 或 image?}
    F -->|是| G[解析文件名/路径]
    G --> H[查找媒体库]
    H --> I{找到?}
    I -->|是| J[✅ 使用找到的 ID]
    I -->|否| K[自动上传]
    K --> J

    F -->|否| L[❌ 无封面]

    style D fill:#d4edda
    style J fill:#d4edda
    style E fill:#fff3cd
    style L fill:#f8d7da
```

**优化效果**：

- **快速路径**：如果有 `cover_media_id`，只需 1 次数据库查询（主键查询）
- **降级路径**：如果没有或无效，才解析文件名（可能需要多次查询）
- **性能提升**：大部分情况下（回写后的文件）只需 1 次查询

### 全量同步流程 (`sync_all`)

```mermaid
flowchart TB
    Start([开始]) --> Init[创建 GitOpsService]
    Init --> Container[创建 GitOpsContainer]
    Container --> Delegate[委托给 SyncService]

    subgraph SyncService["SyncService.sync_all()"]
        Lock{获取同步锁} -->|已锁定| Wait[等待锁释放]
        Wait --> Lock
        Lock -->|获取成功| Pull[Git Pull]

        Pull -->|失败| LogWarn[记录警告<br>继续同步]
        Pull -->|成功| Scan
        LogWarn --> Scan

        Scan[扫描所有 MDX 文件] --> Query[查询数据库<br>已同步文章]
        Query --> Loop{遍历文件}

        Loop -->|下一个| Match[匹配策略]
        Match --> MatchResult{匹配结果}

        MatchResult -->|未找到| Create[handle_post_create]
        MatchResult -->|找到| Update[handle_post_update]
        MatchResult -->|分类索引| CategorySync[handle_category_sync]

        Create --> WriteBack[回写 ID 到文件]
        Update --> WriteBack
        CategorySync --> Loop
        WriteBack --> Loop

        Loop -->|完成| Delete[检测删除]
        Delete --> Cleanup[清理孤儿记录]
        Cleanup --> WriteCategoryIndex[写入缺失的 index.md]
        WriteCategoryIndex --> CommitMeta[提交元数据变更]
        CommitMeta --> Cache[刷新 Next.js 缓存]
        Cache --> SaveHash[保存 Commit Hash]
    end

    SaveHash --> Return([返回 SyncStats])

    style Container fill:#e1f5ff
    style Create fill:#d4edda
    style Update fill:#fff3cd
    style Delete fill:#f8d7da
    style WriteCategoryIndex fill:#e1f5ff
    style CommitMeta fill:#ffe6e6
```

### 增量同步流程 (`sync_incremental`)

```mermaid
flowchart TB
    Start([开始]) --> LoadHash[读取上次同步 Hash]
    LoadHash --> HasHash{存在记录?}

    HasHash -->|否| Fallback[回退到全量同步]
    Fallback --> End

    HasHash -->|是| Pull[Git Pull]
    Pull --> GetCurrent[获取当前 Hash]
    GetCurrent --> Compare{Hash 相同?}

    Compare -->|是| CheckUnsynced[检查未同步文件]
    CheckUnsynced --> HasUnsynced{有未同步?}
    HasUnsynced -->|否| NoChange[无变更，跳过]
    HasUnsynced -->|是| Fallback

    Compare -->|否| GetDiff[获取变更文件列表]
    GetDiff -->|失败| Fallback

    GetDiff -->|成功| Process[处理变更文件]

    subgraph Process["处理变更"]
        Loop{遍历变更} -->|下一个| Check{文件状态}
        Check -->|删除| DoDelete[删除对应文章]
        Check -->|新增/修改| DoSync[同步文章]
        DoDelete --> Loop
        DoSync --> Loop
        Loop -->|完成| Done[处理完成]
    end

    Done --> Cleanup[清理孤儿记录]
    Cleanup --> WriteCategoryIndex[写入缺失的 index.md]
    WriteCategoryIndex --> CommitMeta[提交元数据变更]
    CommitMeta --> SaveHash[保存当前 Hash]
    SaveHash --> Cache[刷新缓存]
    Cache --> End([返回 SyncStats])

    NoChange --> End

    style Fallback fill:#fff3cd
    style NoChange fill:#d4edda
    style WriteCategoryIndex fill:#e1f5ff
    style CommitMeta fill:#ffe6e6
```

### 导出同步流程 (`export_to_git`)

```mermaid
flowchart TB
    Start([开始]) --> Query[查询数据库文章]
    Query --> Filter{过滤条件}

    Filter -->|指定 ID| Single[单篇导出]
    Filter -->|无 source_path| NoPath[新文章导出]
    Filter -->|force_export| All[全部导出]

    Single --> Process
    NoPath --> Process
    All --> Process

    subgraph Process["处理导出"]
        Loop{遍历文章} -->|下一个| Write[FileWriter.write_post]
        Write --> UpdateDB[更新 source_path]
        UpdateDB --> Loop
        Loop -->|完成| Done[导出完成]
    end

    Done --> Commit[Git Add + Commit]
    Commit --> Push[Git Push]
    Push --> End([返回 SyncStats])

    style Write fill:#d4edda
    style Commit fill:#e1f5ff
```

### 完整同步步骤说明

#### 全量同步 (sync_all)

1. **初始化**: `GitOpsService` 创建 `GitOpsContainer`，容器初始化所有核心组件。
2. **委托**: `GitOpsService.sync_all()` 委托给 `container.sync_service.sync_all()`。
3. **Git Pull**: `SyncService` 使用 `container.git_client` 尝试更新本地仓库。如果失败（如网络问题），记录警告并继续（降级为仅同步本地文件）。
4. **全量扫描**: 使用 `container.scanner` 遍历 content 目录，生成 `ScannedPost` 列表。
5. **数据库对比**: 一次性查询所有已同步的文章 (`source_path is not null`)。
6. **处理循环**:
   - 遍历扫描到的文件。
   - **匹配策略**: 使用 `container.serializer` 匹配，优先通过 `source_path` 匹配，其次通过 `slug` 匹配（检测文件重命名/移动）。
   - **更新/创建**: 根据匹配结果调用 `handle_post_update` 或 `handle_post_create`。
   - **分类同步**: 如果是 `index.md`，调用 `handle_category_sync`。
   - **元数据回写**: 调用 `write_post_ids_to_frontmatter` 回写 ID 和关系。
   - **错误处理**: 使用 `collect_errors` 上下文管理器捕获错误。
7. **删除检测**: 遍历数据库中的文章，如果在本次扫描中未找到对应的文件，则执行删除。
8. **分类 index.md 回写**: 调用 `_write_category_indexes` 为数据库中的分类创建缺失的 `index.md` 文件。
9. **提交元数据变更**: 调用 `_commit_metadata_changes` 将回写的元数据提交到 GitHub。
10. **刷新缓存**: 调用 `revalidate_nextjs_cache` 刷新前端缓存。
11. **统计与响应**: 返回包含新增、更新、删除、错误列表的 `SyncStats` 对象。

#### 增量同步 (sync_incremental)

1. **读取状态**: 从 `.gitops_last_sync` 读取上次同步的 Commit Hash。
2. **Git Pull**: 拉取最新代码。
3. **差异计算**: 使用 `git diff` 获取变更文件列表。
4. **智能回退**:
   - 如果没有上次同步记录 → 回退到全量同步
   - 如果 Hash 相同但有未同步文件 → 回退到全量同步
   - 如果 `git diff` 失败 → 回退到全量同步
5. **增量处理**: 只处理变更的文件（新增/修改/删除）。
6. **清理孤儿**: 调用 `_cleanup_orphaned_posts` 清理数据库中有但文件系统中没有的记录。
7. **分类 index.md 回写**: 调用 `_write_category_indexes` 为数据库中的分类创建缺失的 `index.md` 文件。
8. **提交元数据变更**: 调用 `_commit_metadata_changes` 将回写的元数据提交到 GitHub。
9. **保存状态**: 保存当前 Commit Hash 到 `.gitops_last_sync`。
10. **刷新缓存**: 调用 `revalidate_nextjs_cache` 刷新前端缓存。

#### 导出同步 (export_to_git)

1. **查询数据库**: 获取需要导出的文章（无 `source_path` 的新文章或指定 ID）。
2. **生成 MDX**: 使用 `FileWriter.write_post` 生成 MDX 文件。
3. **更新关联**: 更新数据库的 `source_path` 字段。
4. **Git 提交**: 执行 `git add`, `git commit`, `git push`。
5. **返回统计**: 返回 `SyncStats` 对象。

### 1. 组件化设计 (Component-based)

GitOps 模块采用了组件化设计，将复杂的功能拆分为独立的、可测试的单元：

- **Components (`app.git_ops.components`)**:
  - **Scanner**: 负责文件系统的遍历和哈希计算，支持并发扫描，从文件路径推导 post_type 和 category。
  - **Metadata**: 使用 Pydantic 定义 Frontmatter 数据模型，处理字段验证、类型转换和序列化。
  - **Serializer**: 核心转换器，协调 Metadata 和 Processor，实现 Post 模型和 Frontmatter 字典之间的双向转换。
  - **Processors**: 采用 Pipeline 模式，处理复杂的字段解析逻辑（author、cover、category、tags 等），每个 Processor 负责一个字段的处理。
  - **Writer**: 负责物理文件的写入操作，包括处理文件重命名和移动。

### 2. 依赖注入容器 (Dependency Injection Container)

采用**依赖注入容器模式**，通过 `GitOpsContainer` 类集中管理所有依赖关系：

#### 容器职责

- **对象工厂**: 负责创建所有核心组件和服务
- **依赖管理**: 管理组件之间的依赖关系
- **单例管理**: 确保每个服务只创建一次
- **延迟加载**: 服务按需创建，节省资源

#### 两层架构

```python
GitOpsContainer
├── 核心组件层（立即创建）
│   ├── scanner: MDXScanner          # 文件扫描器
│   ├── serializer: PostSerializer   # 序列化器
│   ├── writer: FileWriter           # 文件写入器
│   └── git_client: GitClient        # Git 客户端
└── 服务层（延迟加载 + 单例）
    ├── sync_service: SyncService       # 同步服务 (Git → DB)
    ├── preview_service: PreviewService # 预览服务
    ├── resync_service: ResyncService   # 重新同步服务
    ├── commit_service: CommitService   # 提交服务
    └── export_service: ExportService   # 导出服务 (DB → Git)
```

#### 容器初始化流程

```mermaid
sequenceDiagram
    participant Router
    participant Facade as GitOpsService
    participant Container as GitOpsContainer
    participant Components as 核心组件

    Router->>Facade: 创建 GitOpsService(session)
    activate Facade
    Facade->>Container: 创建 GitOpsContainer(session)
    activate Container
    Container->>Components: 立即创建 scanner
    Container->>Components: 立即创建 serializer
    Container->>Components: 立即创建 writer
    Container->>Components: 立即创建 git_client
    Container-->>Facade: 容器就绪
    deactivate Container

    Note over Container: 服务层尚未创建<br>（延迟加载）
    deactivate Facade
```

#### 优势

- ✅ **依赖共享**: 所有服务共享同一套核心组件，避免重复创建
- ✅ **单例模式**: 每个服务在容器中只创建一次
- ✅ **延迟加载**: 只在第一次访问时才创建服务
- ✅ **易于测试**: 可以 mock 整个容器或单个组件
- ✅ **集中管理**: 修改依赖关系只需改一处

#### 使用示例

```python
# 创建容器
container = GitOpsContainer(session)

# 访问核心组件（立即可用）
scanned = await container.scanner.scan_all()

# 访问服务（第一次访问时创建）
stats = await container.sync_service.sync_all()  # 创建 SyncService
preview = await container.preview_service.preview_sync()  # 创建 PreviewService

# 再次访问（返回已创建的实例）
stats2 = await container.sync_service.sync_all()  # 复用同一个 SyncService
```

### 3. 显式错误处理

移除了隐式的 `error_handler` 封装，采用显式的 `try...except` 块：

- **业务逻辑错误 (`GitOpsSyncError`)**: 如必填字段缺失，记录为 Error 并跳过当前文件，但不中断整体同步。
- **配置错误 (`GitOpsConfigurationError`)**: 如目录不存在，直接中断流程。
- **系统错误**: 捕获所有 Exception，记录堆栈信息，确保单个文件的崩溃不会影响其他文件。

### 4. Processor Pipeline 模式

采用 Pipeline 模式处理字段解析，每个 Processor 负责一个字段的处理：

- **ContentProcessor**: 处理 content_mdx 和 title fallback
- **PostTypeProcessor**: 解析 post_type（优先使用路径推导）
- **AuthorProcessor**: 解析 author_id（支持用户名或 UUID）
- **CoverProcessor**: 解析 cover_media_id（支持路径或文件名）
- **CategoryProcessor**: 解析 category_id（优先使用路径推导，支持自动创建）
- **TagsProcessor**: 解析 tag_ids（支持自动创建）

Pipeline 按顺序执行，后续 Processor 可以依赖前面 Processor 的结果。

### 5. 统一 Schema 定义

通过 `schema.py` 和 `metadata.py` 统一管理数据结构：

- `schema.py`: 定义 API 接口模型 (Pydantic)。
- `metadata.py`: 定义 Frontmatter 数据模型，使用 Pydantic 的 validator 和 serializer 处理字段验证和转换。

### 6. 服务拆分与职责单一

将原来的 `service.py` 拆分为多个职责单一的服务类：

| 服务             | 行数 | 职责                            |
| ---------------- | ---- | ------------------------------- |
| `SyncService`    | ~300 | 全量和增量同步 (Git → DB)       |
| `PreviewService` | ~80  | 同步预览（Dry Run）             |
| `ResyncService`  | ~80  | 重新同步单个文章的元数据        |
| `CommitService`  | ~30  | Git 提交和推送                  |
| `ExportService`  | ~120 | 导出数据库文章到 Git (DB → Git) |
| `GitOpsService`  | ~70  | 门面模式，协调各个子服务        |

每个服务继承自 `BaseGitOpsService`，通过容器获取依赖。

### 7. 并发控制与一致性安全

- **并发锁 (Mutex Lock)**: `SyncService` 内部实现了基于 `asyncio.Lock` 的进程级互斥锁。这有效防止了 Webhook 频繁触发或与管理员手动操作冲突时可能引发的竞态条件 (Race Condition)。
- **统一入口 (Unified Entrypoint)**: 所有 Git 操作（包括后台自动提交）被强制收敛通过 `GitOpsService` 执行，确保所有操作都经过 `GitOpsContainer` 的统一配置和状态管理，消除了因绕过容器而产生的配置不一致风险。

---

## 🔄 同步流程详解

### 全量同步流程图 (`sync_all`)

```mermaid
flowchart TB
    Start([开始]) --> Init[创建 GitOpsService]
    Init --> Container[创建 GitOpsContainer]
    Container --> Delegate[委托给 SyncService]

    subgraph SyncService["SyncService.sync_all()"]
        Lock{获取同步锁} -->|已锁定| Wait[等待锁释放]
        Wait --> Lock
        Lock -->|获取成功| Pull[Git Pull]

        Pull -->|失败| LogWarn[记录警告<br>继续同步]
        Pull -->|成功| Scan
        LogWarn --> Scan

        Scan[扫描所有 MDX 文件] --> Query[查询数据库<br>已同步文章]
        Query --> Loop{遍历文件}

        Loop -->|下一个| Match[匹配策略]
        Match --> MatchResult{匹配结果}

        MatchResult -->|未找到| Create[handle_post_create]
        MatchResult -->|找到| Update[handle_post_update]
        MatchResult -->|分类索引| CategorySync[handle_category_sync]

        Create --> WriteBack[回写 ID 到文件]
        Update --> WriteBack
        CategorySync --> Loop
        WriteBack --> Loop

        Loop -->|完成| Delete[检测删除]
        Delete --> Cache[刷新 Next.js 缓存]
        Cache --> SaveHash[保存 Commit Hash]
    end

    SaveHash --> Return([返回 SyncStats])

    style Container fill:#e1f5ff
    style Create fill:#d4edda
    style Update fill:#fff3cd
    style Delete fill:#f8d7da
```

### 增量同步流程图 (`sync_incremental`)

```mermaid
flowchart TB
    Start([开始]) --> LoadHash[读取上次同步 Hash]
    LoadHash --> HasHash{存在记录?}

    HasHash -->|否| Fallback[回退到全量同步]
    Fallback --> End

    HasHash -->|是| Pull[Git Pull]
    Pull --> GetCurrent[获取当前 Hash]
    GetCurrent --> Compare{Hash 相同?}

    Compare -->|是| NoChange[无变更，跳过]
    NoChange --> End

    Compare -->|否| GetDiff[获取变更文件列表]
    GetDiff -->|失败| Fallback

    GetDiff -->|成功| Process[处理变更文件]

    subgraph Process["处理变更"]
        Loop{遍历变更} -->|下一个| Check{文件状态}
        Check -->|删除| DoDelete[删除对应文章]
        Check -->|新增/修改| DoSync[同步文章]
        DoDelete --> Loop
        DoSync --> Loop
        Loop -->|完成| Done[处理完成]
    end

    Done --> SaveHash[保存当前 Hash]
    SaveHash --> Cache[刷新缓存]
    Cache --> End([返回 SyncStats])

    style Fallback fill:#fff3cd
    style NoChange fill:#d4edda
```

### 导出同步流程图 (`export_to_git`)

```mermaid
flowchart TB
    Start([开始]) --> Query[查询数据库文章]
    Query --> Filter{过滤条件}

    Filter -->|指定 ID| Single[单篇导出]
    Filter -->|无 source_path| NoPath[新文章导出]
    Filter -->|force_export| All[全部导出]

    Single --> Process
    NoPath --> Process
    All --> Process

    subgraph Process["处理导出"]
        Loop{遍历文章} -->|下一个| Write[FileWriter.write_post]
        Write --> UpdateDB[更新 source_path]
        UpdateDB --> Loop
        Loop -->|完成| Done[导出完成]
    end

    Done --> Commit[Git Add + Commit]
    Commit --> Push[Git Push]
    Push --> End([返回 SyncStats])

    style Write fill:#d4edda
    style Commit fill:#e1f5ff
```

### 完整同步步骤说明

1. **初始化**: `GitOpsService` 创建 `GitOpsContainer`，容器初始化所有核心组件。
2. **委托**: `GitOpsService.sync_all()` 委托给 `container.sync_service.sync_all()`。
3. **Git Pull**: `SyncService` 使用 `container.git_client` 尝试更新本地仓库。如果失败（如网络问题），记录警告并继续（降级为仅同步本地文件）。
4. **全量扫描**: 使用 `container.scanner` 遍历 content 目录，生成 `ScannedPost` 列表。
5. **数据库对比**: 一次性查询所有已同步的文章 (`source_path is not null`)。
6. **处理循环**:
   - 遍历扫描到的文件。
   - **匹配策略**: 使用 `container.serializer` 匹配，优先通过 `source_path` 匹配，其次通过 `slug` 匹配（检测文件重命名/移动）。
   - **更新/创建**: 根据匹配结果调用 `handle_post_update` 或 `handle_post_create`。
   - **错误处理**: 使用 `collect_errors` 上下文管理器捕获错误。
7. **删除检测**: 遍历数据库中的文章，如果在本次扫描中未找到对应的文件，则执行删除。
8. **统计与响应**: 返回包含新增、更新、删除、错误列表的 `SyncStats` 对象。

---

## 📊 数据模型

### Frontmatter 字段映射 (`metadata.py`)

| Frontmatter Key  | Post Model Attr  | 类型转换        | 说明                    |
| ---------------- | ---------------- | --------------- | ----------------------- |
| `title`          | `title`          | -               | 标题                    |
| `slug`           | `slug`           | -               | URL 标识                |
| `date`           | `published_at`   | str -> DateTime | 发布日期                |
| `status`         | `status`         | str -> Enum     | 状态 (published/draft)  |
| `post_type`      | `post_type`      | str -> Enum     | 内容类型 (优先路径推导) |
| `author_id`      | `author_id`      | str -> UUID     | 作者引用                |
| `cover_media_id` | `cover_media_id` | str -> UUID     | 封面引用                |
| `category_id`    | `category_id`    | str -> UUID     | 分类引用 (优先路径推导) |
| `featured`       | `is_featured`    | bool            | 是否推荐                |
| `tags`           | `tags`           | str/list        | 标签列表                |

### 字段处理优先级

1. **路径推导优先**: `post_type` 和 `category` 优先使用从文件路径推导的值
2. **Frontmatter 次之**: 如果路径没有推导出来，使用 frontmatter 中的值
3. **默认值兜底**: 如果都没有，使用默认值

### Processor Pipeline 执行顺序

```mermaid
flowchart LR
    Input[Frontmatter 原始数据] --> P1

    subgraph Pipeline["Processor Pipeline"]
        P1[ContentProcessor<br>处理 content 和 title] --> P2
        P2[PostTypeProcessor<br>确定 post_type] --> P3
        P3[AuthorProcessor<br>解析 author] --> P4
        P4[CoverProcessor<br>解析 cover] --> P5
        P5[CategoryProcessor<br>解析 category] --> P6
        P6[TagsProcessor<br>解析 tags]
    end

    P6 --> Output[Post 字典]

    style P1 fill:#fff4e6
    style P2 fill:#fff4e6
    style P3 fill:#e1f5ff
    style P4 fill:#e1f5ff
    style P5 fill:#e1f5ff
    style P6 fill:#e1f5ff
```

| 序号 | Processor           | 职责                                    | 依赖      |
| ---- | ------------------- | --------------------------------------- | --------- |
| 1    | `ContentProcessor`  | 处理 content_mdx 和 title fallback      | -         |
| 2    | `PostTypeProcessor` | 确定 post_type（路径优先）              | -         |
| 3    | `AuthorProcessor`   | 解析 author_id（数据库查询）            | -         |
| 4    | `CoverProcessor`    | 解析 cover_media_id（数据库查询）       | -         |
| 5    | `CategoryProcessor` | 解析 category_id（路径优先 + 自动创建） | post_type |
| 6    | `TagsProcessor`     | 解析 tag_ids（数据库查询 + 自动创建）   | -         |

---

## 🏛️ 依赖注入容器详解

### 容器模式的核心价值

**依赖注入容器 = 对象工厂 + 依赖管理器 + 单例管理器**

#### 问题场景（重构前）

```python
# ❌ 每个服务都要自己创建依赖
class GitOpsService:
    def __init__(self, session):
        # 重复创建
        self.scanner = MDXScanner(content_dir)
        self.serializer = PostSerializer(session)
        self.git_client = GitClient(content_dir)

    async def sync_all(self):
        scanned = await self.scanner.scan_all()

    async def preview_sync(self):
        # 又要创建一遍？
        scanner = MDXScanner(content_dir)  # 重复！
```

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
        self._preview_service = None

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

### 测试优势

```python
# 可以 mock 整个容器
mock_container = MagicMock()
mock_container.scanner.scan_all.return_value = []
service = SyncService(session, mock_container)

# 或者只 mock 某个组件
container = GitOpsContainer(session)
container.scanner = mock_scanner
service = SyncService(session, container)
```

---

## 🛡️ 错误处理模式

### 错误处理架构图

```mermaid
flowchart TB
    subgraph "业务层错误"
        E1[GitOpsConfigurationError<br>配置错误]
        E2[GitOpsSyncError<br>同步错误]
        E3[ScanError<br>扫描错误]
        E4[FrontmatterValidationError<br>验证错误]
        E5[GitError<br>Git 操作错误]
    end

    subgraph "处理策略"
        H1[直接抛出<br>中断流程]
        H2[collect_errors<br>记录并继续]
        H3[记录日志<br>跳过文件]
    end

    subgraph "结果"
        R1[HTTP 500 响应]
        R2[SyncStats.errors]
        R3[继续处理下一个]
    end

    E1 --> H1 --> R1
    E2 --> H2 --> R2
    E3 --> H2 --> R2
    E4 --> H2 --> R2
    E5 --> H3 --> R3

    style E1 fill:#f8d7da
    style H1 fill:#f8d7da
    style H2 fill:#fff3cd
    style H3 fill:#d4edda
```

### `collect_errors` 上下文管理器

项目使用 `collect_errors` 上下文管理器统一处理同步过程中的错误：

```python
@asynccontextmanager
async def collect_errors(stats: ErrorCollector, context: str):
    """捕获并记录 GitOps 操作中的错误"""
    try:
        yield
    except GitOpsError as e:
        # 业务预期内的错误
        error_record = SyncError(
            context=context,
            code=e.error_code,
            message=e.message,
            details=e.details,
            timestamp=datetime.now(),
        )
        stats.errors.append(error_record)
        logger.warning(f"GitOps Error: [{context}] {e.message}")
    except Exception as e:
        # 未预期的系统错误
        error_record = SyncError(
            context=context,
            code="INTERNAL_ERROR",
            message=f"Unexpected error: {e}",
            details={"traceback": traceback.format_exc()[-500:]},
            timestamp=datetime.now(),
        )
        stats.errors.append(error_record)
        logger.exception(f"Unexpected Error: [{context}]")

# 使用示例
for scanned in scanned_posts:
    async with collect_errors(stats, f"Syncing {scanned.file_path}"):
        await process_file(scanned)  # 错误会被捕获，不会中断循环
```

### 显式错误处理策略

GitOps 模块采用**显式的 try-except 块**进行错误处理，移除了过度封装的 `error_handler` 装饰器。这种方式更加 Pythonic，控制流更清晰。

#### 错误分类

1. **配置错误** (`GitOpsConfigurationError`)

   - **场景**: content 目录不存在、Git 仓库未初始化
   - **处理**: 直接抛出，中断流程
   - **原因**: 无法继续执行，需要管理员介入

2. **业务逻辑错误** (`GitOpsSyncError`)

   - **场景**: 必填字段缺失、author 不存在、category 创建失败
   - **处理**: 记录错误日志，跳过当前文件，继续处理其他文件
   - **原因**: 单个文件的错误不应影响整体同步

3. **系统错误** (`Exception`)
   - **场景**: 数据库连接失败、文件读取权限问题、未预期的异常
   - **处理**: 记录完整堆栈信息，跳过当前文件
   - **原因**: 确保单个文件的崩溃不会影响其他文件

#### 错误处理代码示例

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

#### 优势

- ✅ **控制流清晰**: 开发者能直观地看到错误是如何被捕获和处理的
- ✅ **灵活性**: 可以针对不同的错误类型采取不同的处理策略
- ✅ **可维护性**: 不需要理解复杂的装饰器逻辑
- ✅ **Pythonic**: 符合 Python 社区的最佳实践

### 全局异常处理（FastAPI 层）

项目在 FastAPI 层实现了统一的全局异常处理器（`app/core/error_handlers.py`），这是一个**标准且优秀**的模式：

#### 核心特点

1. **统一响应结构**

   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable message",
       "details": { ... },
       "timestamp": "2026-01-24T10:00:00Z",
       "request_id": "uuid"
     }
   }
   ```

2. **集中式处理**

   - 在 `main.py` 中使用 `app.add_exception_handler` 注册
   - 业务代码只需 `raise` 异常，不需要关心如何返回 JSON

3. **环境隔离**

   - **开发环境**: 返回详细的报错信息和 Traceback
   - **生产环境**: 隐藏敏感信息，只返回通用错误消息

4. **全链路追踪**
   - 所有错误响应都包含 `request_id`
   - 可以通过 ID 在日志系统中追踪完整请求链路

#### 异常处理器类型

| 处理器                         | 捕获异常                 | HTTP 状态码 | 说明             |
| ------------------------------ | ------------------------ | ----------- | ---------------- |
| `app_exception_handler`        | `BaseAppException`       | 自定义      | 业务逻辑异常     |
| `validation_exception_handler` | `RequestValidationError` | 422         | 请求参数验证失败 |
| `database_exception_handler`   | `SQLAlchemyError`        | 500         | 数据库操作异常   |
| `unexpected_exception_handler` | `Exception`              | 500         | 未预期的系统异常 |

#### 为什么这是标准模式？

这套错误处理模式在 FastAPI 和现代 Python Web 开发中非常通用，它：

- ✅ **解耦**: 业务逻辑与错误响应格式分离
- ✅ **安全**: 生产环境隐藏敏感信息
- ✅ **可观测**: 通过 request_id 实现全链路追踪
- ✅ **前端友好**: 统一的响应格式降低前端处理复杂度
- ✅ **可扩展**: 易于添加新的异常类型和处理器

---

**最后更新**: 2026-01-31
**版本**: 3.5.0 (完善双向同步流程 + 分类和文章独立流程图)
