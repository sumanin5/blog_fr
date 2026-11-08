# ============================================================
# GitOps - Git 自动化同步
# ============================================================
GITOPS_TAG_METADATA = {
    "name": "GitOps (Admin Only)",
    "description": """
## GitOps 自动化同步模块 🚀

**⚠️ 权限要求：管理接口需要超级管理员权限；`/webhook` 使用 HMAC 签名验证**

实现 Git 仓库到数据库的单向内容导入。

### 核心理念

Git 仓库是文章、分类和 Frontmatter 的唯一内容来源；数据库是可重建的读模型。

```
Git 仓库 (Markdown 文件) → 数据库 (结构化数据) → 前端展示
```

### Git → 数据库

```
1. 扫描 content/ 目录下的所有 .md/.mdx 文件
2. 解析 Frontmatter 元数据（标题、分类、标签等）
3. 匹配数据库中的文章（通过 source_path）
4. 创建新文章 / 更新已有文章 / 删除不存在的文章
5. 刷新前端缓存
```

**支持的同步模式**：

- 全量同步：`POST /sync?force_full=true`，扫描所有文件，适合首次同步和数据修复。
- 增量同步：`POST /sync`（默认），只处理上次成功游标之后的变化，适合 webhook 和日常同步。
- 单篇重导：`POST /posts/{id}/resync-metadata`，重新读取一个 Git 文件。

### 单向边界

- 网站不会回写 Markdown/MDX、Frontmatter、图片链接或分类 index.md。
- 网站不会执行 `git add`、`commit` 或 `push`。
- 旧版 `POST /push` 固定返回 `409 GITOPS_READ_ONLY`。
- 后台文章/分类 CRUD 只修改数据库；Git 来源内容可能被后续同步覆盖。

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
cover: "assets/cover.jpg"
is_featured: true
---

# 文章内容

这里是 Markdown 内容...
```

**字段说明**：
- `title`: 文章标题（可选，缺省用文件名）
- `slug`: URL 标识（可选；显式值原样保留，缺省生成稳定路径哈希 slug）
- `date`: 发布日期（可选）
- `status`: 状态（draft/published；缺省 draft）
- `author`: 作者用户名（必填，必须是已存在用户）
- `category`: 分类名称（可选，按目录推导）
- `tags`: 标签列表（可选，不存在的标签会创建）
- `cover`: 封面相对路径或文件名（可选）
- `is_featured`: 是否推荐（可选，默认 false）

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

- **单文件错误不影响整体**：某个文件解析失败，其他文件继续处理，但游标不会推进
- **详细错误日志**：记录每个错误的上下文和堆栈
- **错误收集**：所有错误汇总在响应中返回
- **重试**：上次失败后，下一次增量同步会先执行全量对账；扫描不完整时跳过孤儿删除

### 🚀 性能优化

- ✅ **增量同步**：只处理变更文件，大幅提升速度
- ✅ **并发扫描**：使用 asyncio 并发扫描文件
- ✅ **数据库预加载**：一次性查询所有文章，避免 N+1 问题
- ✅ **哈希缓存**：记录文件哈希，避免重复处理
- ✅ **后台任务**：Webhook 触发的同步在后台执行

### 📚 相关文档

- [Git → 数据库单向同步](../../docs/ONE_WAY_SYNC.md)
- [Frontmatter 字段规范](../../../GIT_SYNC_GUIDE.md)
    """,
    "externalDocs": {
        "description": "查看 Git → 数据库单向同步说明",
        "url": "https://github.com/sumanin5/blog_fr/blob/main/backend/docs/ONE_WAY_SYNC.md",
    },
}
