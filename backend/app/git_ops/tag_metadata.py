# ============================================================
# GitOps - Git 自动化同步
# ============================================================
GITOPS_TAG_METADATA = {
    "name": "GitOps (Admin Only)",
    "description": """
## GitOps 自动化同步模块 🚀

**⚠️ 权限要求：所有接口都需要超级管理员权限**

实现 Git 仓库与数据库的双向自动化同步，让内容管理更加高效。

### 核心理念

**Git-First 策略**：Git 仓库是内容的唯一真实来源（Single Source of Truth）

```
Git 仓库 (Markdown 文件) ⟷ 数据库 (结构化数据) ⟷ 前端展示
```

### 🔄 双向同步机制

#### 📥 Git → 数据库（同步）

将 Git 仓库中的 Markdown 文件同步到数据库：

```
1. 扫描 content/ 目录下的所有 .md/.mdx 文件
2. 解析 Frontmatter 元数据（标题、分类、标签等）
3. 匹配数据库中的文章（通过 source_path 或 slug）
4. 创建新文章 / 更新已有文章 / 删除不存在的文章
5. 刷新前端缓存
```

**支持的同步模式**：

##### 1️⃣ 全量同步（Full Sync）
- **触发**：`POST /sync?force_full=true`
- **行为**：扫描所有文件，完整对比
- **耗时**：较长（取决于文件数量）
- **适用**：首次同步、数据修复

##### 2️⃣ 增量同步（Incremental Sync）⚡
- **触发**：`POST /sync`（默认）
- **行为**：只处理变更的文件（基于 Git diff）
- **耗时**：很快（只处理变更）
- **适用**：日常同步、Webhook 触发

**增量同步原理**：
```bash
# 1. 记录上次同步的 commit hash
echo "abc123" > content/.gitops_last_sync

# 2. 获取变更文件
git diff --name-only abc123..HEAD

# 3. 只处理变更的文件
- 新增文件 → 创建文章
- 修改文件 → 更新文章
- 删除文件 → 删除文章
```

#### 📤 数据库 → Git（回写）

将数据库变更自动提交到 Git：

```
1. 用户在后台创建/编辑文章
2. 后台任务自动将文章写入 Markdown 文件
3. 自动执行 git add, commit, push
4. 保持 Git 仓库与数据库同步
```

**回写时机**：
- ✅ 创建文章：写入新文件 + 回签 UUID
- ✅ 更新文章：更新文件内容和 Frontmatter
- ✅ 删除文章：删除对应文件
- ✅ 移动文章：重命名文件路径

### 🔍 预览模式（Dry Run）

在实际同步前预览变更：

```
GET /preview
```

**返回内容**：
- 待创建的文章列表
- 待更新的文章列表
- 待删除的文章列表
- 潜在的错误和警告

### 🔗 Webhook 集成

支持 GitHub Webhook，实现自动化同步：

```
GitHub Push Event → Webhook → 后台同步任务 → 数据库更新
```

**配置步骤**：
1. 在 GitHub 仓库设置中添加 Webhook
2. URL: `https://your-api.com/api/v1/ops/git/webhook`
3. Content type: `application/json`
4. Secret: 配置 `WEBHOOK_SECRET` 环境变量
5. Events: 选择 `Push events`

**安全验证**：
- ✅ HMAC-SHA256 签名验证
- ✅ 防止重放攻击
- ✅ 后台异步处理，不阻塞响应

### 📝 Frontmatter 元数据

文章的元数据存储在 Markdown 文件的 Frontmatter 中：

```yaml
---
title: "文章标题"
slug: "article-slug"
date: "2026-01-23"
status: "published"
author: "username"
category: "技术"
tags: ["Python", "FastAPI"]
cover: "cover.jpg"
featured: true
---

# 文章内容

这里是 Markdown 内容...
```

**字段说明**：
- `title`: 文章标题（必填）
- `slug`: URL 标识（必填，唯一）
- `date`: 发布日期（可选，默认当前时间）
- `status`: 状态（draft/published/archived）
- `author`: 作者用户名（可选，默认 superadmin）
- `category`: 分类名称（可选，自动创建）
- `tags`: 标签列表（可选，自动创建）
- `cover`: 封面图片文件名（可选）
- `featured`: 是否推荐（可选，默认 false）

### 🗂️ 文件组织结构

```
content/
├── articles/          # 文章类型
│   ├── tech/         # 技术分类
│   │   └── python-tutorial.mdx
│   └── life/         # 生活分类
│       └── travel-notes.md
└── ideas/            # 想法类型
    └── quick-thought.md
```

**路径推导规则**：
- `post_type`: 从第一级目录推导（articles/ideas）
- `category`: 从第二级目录推导（tech/life）
- `slug`: 从文件名推导（去除扩展名）

### 🔧 重新同步元数据

修复单篇文章的元数据错误：

```
POST /posts/{post_id}/resync-metadata
```

**使用场景**：
- Frontmatter 格式错误
- 元数据缺失或不完整
- 手动修改了文件需要重新读取

### 📊 同步统计

每次同步返回详细的统计信息：

```json
{
  "added": ["article1.mdx", "article2.mdx"],
  "updated": ["article3.mdx"],
  "deleted": ["article4.mdx"],
  "errors": [],
  "duration": 1.23
}
```

### 🛡️ 错误处理

- **单文件错误不影响整体**：某个文件解析失败，其他文件继续处理
- **详细错误日志**：记录每个错误的上下文和堆栈
- **错误收集**：所有错误汇总在响应中返回
- **自动回退**：增量同步失败自动回退到全量同步

### 🚀 性能优化

- ✅ **增量同步**：只处理变更文件，大幅提升速度
- ✅ **并发扫描**：使用 asyncio 并发扫描文件
- ✅ **数据库预加载**：一次性查询所有文章，避免 N+1 问题
- ✅ **哈希缓存**：记录文件哈希，避免重复处理
- ✅ **后台任务**：Webhook 触发的同步在后台执行

### 📚 相关文档

- [GitOps 架构设计](./ARCHITECTURE.md)
- [增量同步原理](./docs/incremental-sync.md)
- [Frontmatter 规范](./docs/frontmatter-spec.md)
    """,
    "externalDocs": {
        "description": "查看 GitOps 完整架构文档",
        "url": "https://github.com/your-repo/blob/main/backend/app/git_ops/ARCHITECTURE.md",
    },
}
