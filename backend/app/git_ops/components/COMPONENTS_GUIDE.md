# GitOps Components 组件清单

## 📋 概览

这个文档列出 `backend/app/git_ops/components/` 下所有组件的用途，帮助你了解哪些工具是真正需要的。

---

## 🔧 核心组件（必须）

### 1. Scanner（扫描器）

**目录**: `scanner/`

| 文件             | 用途                                 | 是否必须 |
| ---------------- | ------------------------------------ | -------- |
| `core.py`        | 扫描文件系统，读取 MDX 文件          | ✅ 必须  |
| `models.py`      | 定义 `ScannedPost` 数据模型          | ✅ 必须  |
| `path_parser.py` | 从文件路径推导 post_type 和 category | ✅ 必须  |
| `utils.py`       | 辅助函数（文件哈希等）               | ✅ 必须  |

**作用**：

- 扫描 `content/` 目录下的所有 `.md` 和 `.mdx` 文件
- 解析 frontmatter（YAML 元数据）
- 从路径推导分类和类型（如 `content/ideas/post.md` → `post_type=ideas`）

**使用场景**：全量同步和增量同步都需要

---

### 2. Serializer（序列化器）

**文件**: `serializer.py`

**作用**：

- **MDX → Post**：将 frontmatter 转换为 Post 数据库对象
- **Post → MDX**：将 Post 对象转换回 frontmatter
- 协调 Processors 处理复杂字段

**使用场景**：

- 同步时：MDX → Post
- 导出时：Post → MDX

**是否必须**：✅ 必须

---

### 3. Metadata（元数据模型）

**文件**: `metadata.py`

**作用**：

- 定义 `Frontmatter` Pydantic 模型
- 处理字段验证和类型转换
- 统一 frontmatter 字段映射规则

**使用场景**：Serializer 内部使用

**是否必须**：✅ 必须

---

### 4. Processors（处理器）

**目录**: `processors/`

| 文件           | 处理字段               | 是否必须 |
| -------------- | ---------------------- | -------- |
| `base.py`      | 基类                   | ✅ 必须  |
| `content.py`   | `content_mdx`, `title` | ✅ 必须  |
| `post_type.py` | `post_type`            | ✅ 必须  |
| `author.py`    | `author_id`            | ✅ 必须  |
| `category.py`  | `category_id`          | ✅ 必须  |
| `cover.py`     | `cover_media_id`       | ✅ 必须  |
| `tags.py`      | `tag_ids`              | ✅ 必须  |

**作用**：

- Pipeline 模式处理复杂字段
- 每个 Processor 负责一个字段的解析
- 支持数据库查询、自动创建等

**使用场景**：Serializer 内部使用

**是否必须**：✅ 必须（这些是核心业务逻辑）

---

### 5. Handlers（处理器）

**目录**: `handlers/`

| 文件               | 用途                 | 是否必须 |
| ------------------ | -------------------- | -------- |
| `post_create.py`   | 创建文章到数据库     | ✅ 必须  |
| `post_update.py`   | 更新文章到数据库     | ✅ 必须  |
| `category_sync.py` | 同步分类（index.md） | ✅ 必须  |

**作用**：

- 封装文章和分类的创建/更新逻辑
- 处理关联关系（标签、分类等）
- 回写 ID 到 frontmatter

**使用场景**：SyncService 调用

**是否必须**：✅ 必须

---

### 6. Writer（写入器）

**目录**: `writer/`

| 文件                 | 用途                           | 是否必须 |
| -------------------- | ------------------------------ | -------- |
| `writer.py`          | 写入 Post/Category 到 MDX 文件 | ✅ 必须  |
| `path_calculator.py` | 计算文件路径                   | ✅ 必须  |
| `file_operator.py`   | 文件操作（移动、重命名）       | ✅ 必须  |

**作用**：

- 将数据库的 Post 对象写回 MDX 文件
- 处理文件移动和重命名
- 为分类创建 `index.md`

**使用场景**：

- 导出服务（DB → Git）
- 回写元数据（写入 ID）

**是否必须**：✅ 必须

---

## 🤔 可选/可删除组件

### 7. Comparator（对比器）

**文件**: `comparator.py`

**作用**：

- 对比 Post 对象和新数据，返回变更字段列表
- 用于判断文章是否真的需要更新

**问题**：

- ❌ **Git 已经告诉我们文件变了，不需要再对比**
- ❌ 增加了复杂度

**是否必须**：❌ 可以删除

**替代方案**：直接更新，让数据库的 `updated_at` 自动更新

---

### 8. Cache（缓存）

**文件**: `cache.py`

**作用**：

- 刷新 Next.js 缓存
- 调用 `/api/revalidate` 端点

**是否必须**：⚠️ 看需求

- 如果需要自动刷新前端缓存 → 保留
- 如果手动刷新或不需要 → 删除

---

### 9. Webhook（Webhook）

**文件**: `webhook.py`

**作用**：

- 处理 GitHub Webhook 请求
- 验证签名

**是否必须**：⚠️ 看需求

- 如果需要 GitHub 自动触发同步 → 保留
- 如果只手动同步 → 删除

---

## 📊 总结

### 必须保留（核心功能）

```
scanner/          # 扫描文件
  ├── core.py
  ├── models.py
  ├── path_parser.py
  └── utils.py

serializer.py     # 数据转换
metadata.py       # 数据模型

processors/       # 字段处理
  ├── base.py
  ├── content.py
  ├── post_type.py
  ├── author.py
  ├── category.py
  ├── cover.py
  └── tags.py

handlers/         # 业务逻辑
  ├── post_create.py
  ├── post_update.py
  └── category_sync.py

writer/           # 文件写入
  ├── writer.py
  ├── path_calculator.py
  └── file_operator.py
```

### 可以删除（不必要）

```
comparator.py     # Git 已经告诉我们文件变了
```

### 看需求（可选）

```
cache.py          # 缓存刷新
webhook.py        # GitHub Webhook
```

---

## 🎯 使用流程

### 同步流程（Git → DB）

```
1. Scanner 扫描文件
   ↓
2. Serializer 转换数据（调用 Processors）
   ↓
3. Handlers 创建/更新数据库
   ↓
4. Writer 回写 ID 到文件
```

### 导出流程（DB → Git）

```
1. 查询数据库
   ↓
2. Serializer 转换数据
   ↓
3. Writer 写入 MDX 文件
```

---

**最后更新**: 2026-02-01
