# Git 同步机制与 Frontmatter 元数据规范

## 📖 概述

本文档详细说明了博客系统的 Git 同步机制，以及 MDX 文件的 Frontmatter 元数据字段规范。

---

## 🔄 Git 同步机制

### 工作原理

Git 同步功能允许你将 MDX 文件存储在 Git 仓库中，通过 API 触发同步，自动将文件内容导入到数据库。

```mermaid
graph LR
    A[Git 仓库] --> B[扫描 MDX 文件]
    B --> C[解析 Frontmatter]
    C --> D[映射到数据库字段]
    D --> E[创建/更新文章]
```

### 同步流程

1. **扫描文件** - 递归扫描 `content/` 目录下的所有 `.md` 和 `.mdx` 文件
2. **解析元数据** - 提取 Frontmatter 和正文内容
3. **解析引用** - 解析作者、封面图等关联数据
4. **对比差异** - 与数据库现有数据对比
5. **执行同步** - 创建新文章、更新已有文章、删除已删除的文章

### 触发同步

#### 方式一：通过 API（推荐）

```bash
POST /api/v1/ops/git/sync
Authorization: Bearer <admin_token>
```

#### 方式二：通过命令行

```bash
cd backend
python scripts/sync_git_content.py
```

### 同步规则

| 场景     | 数据库状态             | 文件系统状态 | 操作                      |
| -------- | ---------------------- | ------------ | ------------------------- |
| 新文件   | 不存在                 | 存在         | **CREATE** - 创建新文章   |
| 更新文件 | 存在                   | 存在         | **UPDATE** - 更新文章内容 |
| 删除文件 | 存在                   | 不存在       | **DELETE** - 删除文章     |
| 手动创建 | 存在（无 source_path） | -            | **忽略** - 不参与同步     |

### 文件追踪

- 每个通过 Git 同步的文章都有 `source_path` 字段，记录其源文件路径
- 手动创建的文章 `source_path` 为 `NULL`，不会被 Git 同步影响
- Slug 会自动添加随机后缀（如 `my-post-a3f2k8`），确保唯一性

---

## 📝 Frontmatter 元数据规范

### 完整示例

```yaml
---
# ========== 必填字段 ==========
title: "文章标题"
author: "username"  # 用户名或 UUID

# ========== 基础字段 ==========
slug: "custom-slug"  # 可选，不填则自动生成
type: "ARTICLE"  # 文章类型：ARTICLE（默认）或 IDEA
status: "PUBLISHED"  # 状态：PUBLISHED（默认）或 DRAFT
date: "2024-01-15"  # 发布日期，支持 YYYY-MM-DD 或 ISO 8601

# ========== 内容字段 ==========
excerpt: "文章摘要，显示在列表页"
summary: "同 excerpt，两者任选其一"
description: "同 excerpt，优先级最低"

# ========== 封面图 ==========
cover: "uploads/2025/12/image.png"  # 完整路径
# 或
cover: "image.png"  # 文件名（自动匹配）
# 或
image: "path/to/image.jpg"  # 兼容字段

# ========== 标签 ==========
# 方式一：YAML 数组
tags:
  - Python
  - FastAPI
  - 后端开发

# 方式二：逗号分隔字符串
tags: "Python, FastAPI, 后端开发"

# ========== 布尔字段 ==========
featured: true  # 是否推荐到首页
allow_comments: true  # 是否允许评论（默认 true）

# ========== SEO 字段 ==========
meta_title: "自定义 SEO 标题"
meta_description: "自定义 SEO 描述，用于搜索引擎"
meta_keywords: "关键词1, 关键词2, 关键词3"

# 或使用别名
seo_title: "同 meta_title"
seo_description: "同 meta_description"
keywords: "同 meta_keywords"
---

# 文章正文

这里是文章的 Markdown/MDX 内容...
```

---

## 📋 字段详细说明

### 1. 必填字段

#### `title` - 文章标题

- **类型**: 字符串
- **必填**: 是
- **说明**: 文章的主标题
- **示例**: `title: "深入理解 Python 异步编程"`

#### `author` - 作者

- **类型**: 字符串（用户名或 UUID）
- **必填**: 是
- **说明**: 指定文章作者，必须是系统中已存在的用户
- **示例**:
  ```yaml
  author: "admin"  # 使用用户名
  # 或
  author: "019baba9-aef8-7f0d-9558-966eafa18275"  # 使用 UUID
  ```

---

### 2. 基础字段

#### `slug` - URL 别名

- **类型**: 字符串
- **必填**: 否
- **默认值**: 自动从文件名生成
- **说明**: 文章的 URL 标识符，系统会自动添加随机后缀确保唯一性
- **示例**:
  ```yaml
  slug: "python-async"
  # 实际生成: python-async-a3f2k8
  ```

#### `type` - 文章类型

- **类型**: 枚举字符串
- **必填**: 否
- **默认值**: `ARTICLE`
- **可选值**:
  - `ARTICLE` - 普通文章
  - `IDEA` - 想法/笔记
- **示例**: `type: "ARTICLE"`

#### `status` - 发布状态

- **类型**: 枚举字符串
- **必填**: 否
- **默认值**: `PUBLISHED`
- **可选值**:
  - `PUBLISHED` - 已发布
  - `DRAFT` - 草稿
- **兼容字段**: `published` (布尔值)
- **示例**:
  ```yaml
  status: "PUBLISHED"
  # 或向后兼容
  published: true  # 等同于 PUBLISHED
  published: false  # 等同于 DRAFT
  ```

#### `date` - 发布日期

- **类型**: 日期字符串或 datetime 对象
- **必填**: 否
- **默认值**:
  - 已发布文章：当前时间
  - 草稿：`null`
- **支持格式**:
  - `YYYY-MM-DD`: `"2024-01-15"`
  - ISO 8601: `"2024-01-15T10:30:00"`
  - YAML datetime: `2024-01-15 10:30:00`
- **兼容字段**: `published_at`

---

### 3. 内容字段

#### `excerpt` - 文章摘要

- **类型**: 字符串
- **必填**: 否
- **默认值**: 空字符串
- **说明**: 显示在文章列表页的摘要文本
- **兼容字段**: `summary`, `description`（优先级递减）
- **示例**: `excerpt: "本文介绍 Python 异步编程的核心概念"`

---

### 4. 封面图

#### `cover` - 封面图路径

- **类型**: 字符串
- **必填**: 否
- **默认值**: `null`
- **说明**: 封面图的路径或文件名，系统会自动在媒体库中查找匹配的文件
- **兼容字段**: `image`
- **匹配规则**（按优先级）:
  1. **精确路径匹配**: `file_path` 完全匹配
  2. **原始文件名匹配**: `original_filename` 匹配
  3. **路径后缀匹配**: `file_path` 以文件名结尾
  4. **文件名等于路径**: `file_path` 等于文件名

**示例**:

```yaml
# 方式 1: 完整路径（推荐）
cover: "uploads/2025/12/24_121337_1c16cdf6500844a.png"

# 方式 2: 原始文件名
cover: "【哲风壁纸】冰桌-千.jpg"

# 方式 3: 只用文件名（会匹配路径后缀）
cover: "24_121337_1c16cdf6500844a.png"

# 方式 4: 使用 image 字段
image: "path/to/cover.jpg"
```

**注意事项**:

- 如果封面图不存在，文章仍会创建成功，只是 `cover_media_id` 为 `null`
- 建议先上传图片到媒体库，再在 Frontmatter 中引用

---

### 5. 标签

#### `tags` - 文章标签

- **类型**: 数组或逗号分隔字符串
- **必填**: 否
- **默认值**: 空数组
- **说明**: 文章的分类标签，不存在的标签会自动创建

**示例**:

```yaml
# 方式 1: YAML 数组（推荐）
tags:
  - Python
  - FastAPI
  - 异步编程

# 方式 2: 逗号分隔字符串
tags: "Python, FastAPI, 异步编程"
```

---

### 6. 布尔字段

#### `featured` - 是否推荐

- **类型**: 布尔值
- **必填**: 否
- **默认值**: `false`
- **说明**: 标记为推荐文章，可在首页展示
- **兼容字段**: `is_featured`
- **示例**: `featured: true`

#### `allow_comments` - 允许评论

- **类型**: 布尔值
- **必填**: 否
- **默认值**: `true`
- **说明**: 是否允许用户评论
- **兼容字段**: `comments`
- **示例**: `allow_comments: false`

---

### 7. SEO 字段

#### `meta_title` - SEO 标题

- **类型**: 字符串
- **必填**: 否
- **默认值**: 空字符串
- **说明**: 用于搜索引擎的自定义标题
- **兼容字段**: `seo_title`
- **示例**: `meta_title: "Python 异步编程完全指南 | 我的博客"`

#### `meta_description` - SEO 描述

- **类型**: 字符串
- **必填**: 否
- **默认值**: 空字符串
- **说明**: 用于搜索引擎的描述文本
- **兼容字段**: `seo_description`
- **示例**: `meta_description: "深入浅出讲解 Python 异步编程，包含 asyncio、协程等核心概念"`

#### `meta_keywords` - SEO 关键词

- **类型**: 字符串（逗号分隔）
- **必填**: 否
- **默认值**: 空字符串
- **说明**: 用于搜索引擎的关键词
- **兼容字段**: `keywords`
- **示例**: `meta_keywords: "Python, 异步编程, asyncio, 协程"`

---

## 🎯 使用场景示例

### 场景 1: 发布一篇普通文章

```yaml
---
title: "Python 装饰器详解"
author: "admin"
excerpt: "深入理解 Python 装饰器的原理和应用"
tags:
  - Python
  - 编程技巧
cover: "python-decorator.png"
---
# Python 装饰器详解

装饰器是 Python 中的一个强大特性...
```

### 场景 2: 创建草稿

```yaml
---
title: "待完成的文章"
author: "admin"
status: "DRAFT"
---
这是一篇还在编写中的文章...
```

### 场景 3: 发布想法/笔记

```yaml
---
title: "关于代码重构的思考"
author: "admin"
type: "IDEA"
tags: "重构, 思考"
---
今天在重构代码时发现...
```

### 场景 4: 完整的 SEO 优化文章

```yaml
---
title: "2024 年 Python Web 开发最佳实践"
author: "admin"
slug: "python-web-best-practices-2024"
date: "2024-01-15"
excerpt: "总结 2024 年 Python Web 开发的最佳实践和推荐工具"
cover: "python-web-2024.jpg"
tags:
  - Python
  - Web 开发
  - 最佳实践
featured: true
meta_title: "2024 年 Python Web 开发最佳实践完全指南"
meta_description: "深入探讨 FastAPI、Django、Flask 等框架的最佳实践，包含性能优化、安全性、测试等方面"
meta_keywords: "Python, Web 开发, FastAPI, Django, 最佳实践, 2024"
---
# 2024 年 Python Web 开发最佳实践

在 2024 年，Python Web 开发领域出现了许多新的工具和实践...
```

---

## ⚠️ 注意事项

### 1. 作者字段

- ✅ **必须指定** - 每篇文章都必须有作者
- ✅ **必须存在** - 作者必须是系统中已存在的用户
- ❌ **不存在会失败** - 如果作者不存在，文章同步会失败并记录错误

### 2. Slug 唯一性

- 系统会自动为所有 slug 添加随机后缀（6 位字符）
- 即使指定了 slug，也会添加后缀，如 `my-post` → `my-post-a3f2k8`
- 这确保了即使有重名文件也不会冲突

### 3. 封面图

- 封面图不存在不会导致同步失败
- 建议先上传图片到媒体库，再在 Frontmatter 中引用
- 支持多种匹配方式，灵活性高

### 4. 标签

- 不存在的标签会自动创建
- 支持中文标签
- 建议使用 YAML 数组格式，更清晰

### 5. 日期处理

- 如果不指定日期，已发布文章会使用当前时间
- 草稿文章的 `published_at` 为 `null`
- 支持多种日期格式，推荐使用 `YYYY-MM-DD`

### 6. 布尔值

- 必须使用 `true`/`false`，不要用 `yes`/`no` 或 `1`/`0`
- 注意 YAML 的布尔值是小写的

---

## 🔍 故障排查

### 同步失败常见原因

#### 1. 作者不存在

```
错误: Author not found: username
解决: 确保用户名或 UUID 正确，且用户已在系统中创建
```

#### 2. 缺少必填字段

```
错误: Missing required field 'author'
解决: 在 Frontmatter 中添加 author 字段
```

#### 3. Frontmatter 格式错误

```
错误: Invalid frontmatter
解决: 检查 YAML 语法，确保三个短横线包裹，缩进正确
```

#### 4. 文件编码问题

```
错误: UnicodeDecodeError
解决: 确保文件使用 UTF-8 编码保存
```

### 查看同步日志

同步完成后会返回详细的统计信息：

```json
{
  "added": ["new-post.mdx"],
  "updated": ["existing-post.mdx"],
  "deleted": ["removed-post.mdx"],
  "skipped": 0,
  "errors": [],
  "duration": 1.23
}
```

---

## 📚 相关文档

- [Git 同步架构设计](backend/app/git_ops/ARCHITECTURE.md)
- [Git 同步模块 README](backend/app/git_ops/README.md)
- [API 文档](docs/api/)

---

## 🔄 更新日志

### 2024-01-11

- ✅ 添加完整的元数据字段支持
- ✅ 支持标签（数组和逗号分隔）
- ✅ 支持 SEO 字段
- ✅ 支持布尔字段（featured, allow_comments）
- ✅ 优化封面图匹配逻辑
- ✅ 完善日期解析逻辑

### 2024-01-10

- ✅ 初始版本
- ✅ 基础同步功能
- ✅ 作者和封面图解析

---

**最后更新**: 2024-01-11
**维护者**: Blog Platform Team
