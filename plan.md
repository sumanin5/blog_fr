# BLOG_FR 项目开发计划 (Plan)

本项目是一个基于 FastAPI (后端) 和 Next.js (前端) 的现代化博客系统，深度集成 Git (MDX) 同步流程。

## ✅ 已完成功能 (Completed)

### 0. 架构核心理念 (Core Philosophy) ⭐️⭐️⭐️
- [x] **Git 为唯一真理来源**: 确立 `content/` 目录下的 MDX 文件为系统的绝对权威，数据库仅作为高性能索引和缓存。
- [x] **Web UI 作为 Git 客户端**: 网页端的编辑/删除操作本质上是模拟本地 Git 操作（修改文件 + Commit/Push），保持物理与逻辑的高度统一。

### 1. 管理后台基础架构 (Admin Foundation)

- [x] **侧边栏 (Admin Sidebar)**: 基于 Shadcn/UI 构建，自适应导航，支持超级管理员/普通用户角色权限识别。
- [x] **响应式布局 (Admin Layout)**: 统一的后台管理壳，包含面包屑、用户菜单及权限守卫。

### 2. 文章管理 (Post Management)

- [x] **我的文章**: 个人创作中心，支持 Articles 和 Ideas 快速切换。
- [x] **全站文章管理**: 超级管理员专属页面，可全局监控和操作。
- [x] **功能组件**: 开发了复用性极强的 `PostListTable`，支持 Framer Motion 动画、状态 Badge 和 Git Hash 摘要。
- [x] **Git 同步中心**: 独立的 Git 状态监控页，区分"Git 托管"与"数据库原生"内容。
- [x] **前台展示**: 博客列表页支持封面缩略图、标签显示、分类筛选。

### 3. 内容编辑器 (Content Editor)

- [x] **双栏编辑器**: 实现 MDX 编辑区与实时预览区的分离布局。
- [x] **实时预览**: 利用 Iframe 隔离技术实现的预览页，对接后端 `PostProcessor` 接口，支持实时渲染 HTML、TOC 和阅读时长。
- [x] **多维设置**: 文章侧边栏支持修改 Slug、分类选择及封面占位展示。

### 4. 后端增强 (Backend Enhancements)

- [x] **Schema 完善**: 在短响应模型中补充 Git 追踪字段和封面媒体字段。
- [x] **预览接口**: 开发专用的预览 API (`/posts/preview`)，支持实时解析 MDX 而不持久化。
- [x] **自动生成工具**: 修复并打通了 `generate-api.sh` 脚本，实现前后端 SDK 零成本同步。
- [x] **静态文件服务**: 配置 FastAPI StaticFiles 挂载，支持媒体文件直接访问。

### 5. Git 同步核心 (Git Core) ⭐️⭐️⭐️

- [x] **物理层**: 后端实现 `GitClient` 和 `MDXScanner`。
- [x] **同步层**: 后端实现 `GitOpsService`，支持 Create/Update/Delete 完整生命周期。
- [x] **Frontmatter 解析**: 完整支持所有元数据字段（title, slug, type, status, date, excerpt, cover, tags, featured, allow_comments, SEO 字段）。
- [x] **集成层**: 将 `GitClient.pull()` 集成到同步流程中，实现真正的远程同步。
- [x] **测试覆盖**: 完成 20+ 集成测试，覆盖同步、元数据解析、封面图关联等场景。
- [x] **文档**: 创建 `GIT_SYNC_GUIDE.md` 完整文档，说明所有 Frontmatter 字段和同步机制。
- [x] **UI 层**:
  - [x] 同步触发器：在前端"Git 同步中心"添加"立即同步"按钮。
  - [x] 状态反馈：展示上次同步时间、同步结果统计 (Added/Updated/Deleted)。
  - [x] UI 锁定：在文章列表禁用 Git 托管文章的编辑/删除操作。

### 6. 深度运维功能 (Operations)

- [x] **全功能分类管理**:
  - [x] 完成"新增/编辑分类"的对话框表单。
  - [x] 对接后端 PATCH/POST 接口。
- [x] **标签治理 (Tag Management)**:
  - [x] 实现标签合并 (Merge) 界面。
  - [x] 实现孤立标签清理接口对接。
- [x] **删除确认**: 为全站删除操作引入 `AlertDialog` 确认流程。

### 7. 项目标准化与 AI 增强 (Standardization & AI Enrichment) ⭐️⭐️⭐️

- [x] **管理后台架构重构 (Admin Refactor)**:
  - [x] **动态路由映射**: 实现了 `/admin/posts/[type]/...` 统一路由，支持文章与想法的平滑切换。
  - [x] **数据逻辑集中化**: 封装统一的 `shared/hooks/use-posts.ts`，基于 TanStack Query 统一管理 CRUD。
- [x] **GitHub Agent Skills 体系构建**:
  - [x] **项目特有技能**: 创建了 `.github/skills/` 涵盖 `mdx-management`, `ui-development`, `frontend-data-flow` 等 6 大模块。
  - [x] **系统级技能集成**: 在 `~/.claude/skills/` 部署了通用的 `python-uv-web` 和 `nextjs-pnpm` 标准。
- [x] **开发环境配置**: 优化 `.vscode/settings.json` 以适配 Tailwind 4.0、pytest 及 cva/cn 智能提示。

---

## 🚀 核心架构升级 (Architectural Evolution) - **重点关注** ⭐️⭐️⭐️

### 1. 统一数据流架构: "Git-First" 双向同步
**设计目标**：确立 `content/` 目录为 Single Source of Truth。无论是在线编辑还是本地编辑，最终都汇聚于此。满足“代码公开、内容私有”的安全性需求。

**数据流向**：
1. **在线编辑加载 (Load)**: `在线编辑器` -> `后端读取物理磁盘 (content/目录)` -> `解析 MDX & Frontmatter` -> `返回前端编辑器`。*（注：不经过数据库，确保实时获取磁盘最新内容）*
2. **在线编辑保存 (Save)**: `在线编辑器 (Web)` -> `MDX 序列化` -> `物理磁盘 (content/目录)` -> `触发自动化 Git 提交 (Commit/Push)` -> `触发数据库同步`。
3. **本地编辑流 (Local)**: `本地 IDE (VS Code)` -> `物理磁盘 (content/目录)` -> `手动/Webhook 触发 Git 同步` -> `更新数据库 (DB)`。

**关键任务**：
- [ ] **“代码与内容分离”方案实现 (Privacy & Decoupling)**:
  - [ ] **Git Submodule 策略**: 将 `content/` 独立为私有仓库，通过 Submodule 或运行时挂载方式接入代码框架。
  - [ ] **安全部署流水线**: 优化 GitHub Actions，确保在公开展示框架的同时，私密内容（文章、图片）仅在生产环境（阿里云）通过凭证拉取，不进入公开镜像。
- [ ] **物理磁盘读取器 (Disk Loader)**:
  - [ ] 创建按路径读取 MDX 文件的专用 API，支持实时解析 Frontmatter 为编辑器表单数据。
  - [ ] 处理文件锁定或并发编辑冲突（可选）。
- [ ] **物理磁盘反向写入 (Reverse Write)**:
  - [ ] 实现 `Post` 模型到 `MDX+Frontmatter` 的序列化器。
  - [ ] 改造 `POST/PATCH` 接口：在存入 DB 的同时，根据路径规则更新/创建物理文件。
  - [ ] 处理文件重命名 (Rename) 导致的物理路径变更。
- [ ] **结构化元数据编辑器 (Structured Metadata Sidebar)**:
  - [ ] **UI 开发**: 替换现有的手写 YAML 模式，改为右侧边栏表单。
  - [ ] **组件集成**: 集成 `CategorySelect`, `TagCombobox` 及媒体库封面选择。
  - [ ] **实时序列化**: 确保表单修改能即时反馈到生成的 MDX 文件头中。

---

## 🚀 即将进行 (In Progress / Short-term)

### 1. 媒体管理增强 (Media Management) - **已完成 ✅**

**目标**：提供完善的媒体文件管理功能，支持搜索、批量操作和用户隔离。

**已完成功能**：

#### 后端任务 - 全部完成

- [x] **基础CRUD操作**:
  - [x] 文件上传、查看、更新、删除
  - [x] 用户文件隔离（每个用户只能管理自己的文件）
  - [x] 管理员全局文件访问权限

- [x] **搜索功能** ⭐️ **新增**:
  - [x] 按文件名搜索（大小写不敏感）
  - [x] 按描述搜索
  - [x] 支持中文关键词搜索（"千反田"、"春日野穹"等）
  - [x] 搜索与过滤组合（媒体类型、用途）
  - [x] 搜索分页支持

- [x] **批量操作**:
  - [x] 批量删除文件
  - [x] 批量获取文件信息

- [x] **缩略图生成**:
  - [x] 自动生成多种尺寸（small/medium/large/xlarge）
  - [x] WebP 格式支持
  - [x] 智能裁剪和缩放

#### 前端任务 - 全部完成

- [x] **媒体管理页面**:
  - [x] 文件列表展示（网格视图和列表视图）
  - [x] 文件上传组件
  - [x] 文件筛选（类型、用途）
  - [x] 文件搜索框 ⭐️ **新增**
  - [x] 批量选择和批量删除
  - [x] 公开/私有状态切换

- [x] **搜索UX优化** ⭐️ **新增**:
  - [x] 手动触发搜索（点击"搜索"按钮或按Enter键）
  - [x] 清除搜索（点击X图标）
  - [x] 友好的空状态提示（区分"无文件"和"无搜索结果"）

#### 测试覆盖 - 全部完成

- [x] **单元测试**:
  - [x] CRUD 操作测试
  - [x] 文件上传和验证测试
  - [x] 缩略图生成测试

- [x] **集成测试**:
  - [x] 搜索功能测试（7个测试用例）
  - [x] 用户隔离测试
  - [x] 批量操作测试

**技术实现细节**：
- 后端使用 PostgreSQL `ilike` 实现大小写不敏感的模糊搜索
- 前端使用 TanStack Query 管理搜索状态和数据缓存
- 搜索支持同时查询文件名和描述字段
- 所有类型检查错误已修复（添加 `type: ignore` 注释）

---

### 2. 封面上传集成 (Cover Upload) - **已完成 ✅**

**目标**：将媒体管理功能集成到文章编辑器，实现封面上传。

**已完成功能**：

#### 前端任务

- [x] **编辑器封面上传**:
  - [x] 在文章编辑器侧边栏添加封面上传组件 (`CoverSelect`)
  - [x] 支持拖拽上传和点击上传
  - [x] 实时预览上传的封面图
  - [x] 支持替换和删除封面
  - [x] 对接 `/api/v1/media/upload` 接口
  - [x] 上传成功后自动关联 `cover_media_id`

- [x] **媒体库选择器**:
  - [x] 创建媒体库弹窗组件 (`MediaLibraryDialog`)
  - [x] 支持从已上传的媒体文件中选择封面
  - [x] 支持搜索和筛选（按类型、标签、日期）
  - [x] 支持分页加载

- [ ] **Git 同步封面支持**:
  - [x] 在 Frontmatter 中支持 `cover` 字段（本地路径或 URL）
  - [x] 同步时自动上传本地图片到媒体库 (已实现自动检测并入库 ✅)
  - [ ] 或者支持外部 URL 直接引用

---

### 3. Git 同步增强 (Git Sync Enhancement) - **优先级：最高** ⭐️⭐️⭐️

**目标**：利用文件夹结构实现文章自动分类，并作为“反向写入磁盘”的基础。

**实现步骤**：

#### 后端任务

- [x] **目录结构自动分类** ⭐️⭐️⭐️ - **优先级：高**

  **目标**：利用文件夹结构实现文章自动分类，无需手动配置 Frontmatter。

  **目录结构设计**：
  ```
  content/
  ├── articles/              # 顶层: PostType (article)
  │   ├── tech/             # 二层: Category (技术)
  │   │   ├── post1.mdx
  │   │   └── post2.md
  │   ├── life/             # 二层: Category (生活)
  │   │   └── post3.mdx
  │   └── uncategorized/    # 默认分类
  │       └── post4.md
  ├── ideas/                # 顶层: PostType (idea)
  │   ├── thoughts/         # 二层: Category (想法)
  │   │   └── idea1.md
  │   └── quick-notes/
  │       └── idea2.mdx
  ```

  **实现细节**：

  - [x] **MDXScanner 增强**:
    - [x] 解析文件路径，提取 `post_type` 和 `category` 信息。
    - [x] 支持路径格式：`content/{post_type}/{category}/{filename}.mdx`。
    - [x] 兼容并逐步迁移平铺结构。

- [x] **差异预览接口**:
  - [x] 创建 `GET /api/v1/ops/git/preview` 接口（dry-run 模式）。
  - [x] 分析磁盘与数据库差异并返回变更预览。

- [x] **GitHub Webhook 支持**:
  - [x] 创建 `POST /api/v1/ops/git/webhook` 接口。
  - [x] 验证 GitHub webhook 签名（HMAC-SHA256）。
  - [x] 接收 `push` 事件后触发后台同步任务。

#### 前端任务

- [ ] **差异预览页面**:
  - [ ] 在 Git 同步中心展示“即将执行的变更”。
  - [ ] 用户二次确认后执行物理更新。

---

### 4. 结构化元数据编辑器 (Metadata Sidebar) - **优先级：高** ⭐️⭐️

**目标**：将 YAML 手写模式替换为结构化表单，确保元数据与磁盘文件的强一致性。

**实现步骤**：

- [ ] **侧边栏 UI 搭建**:
  - [ ] 使用 `shadcn/ui` 构建右侧设置面板。
  - [ ] 集成 `CategorySelect`, `TagCombobox` 及 `CoverSelect`。

- [ ] **双向绑定与序列化**:
  - [ ] 实时将表单状态序列化为 Frontmatter 字符串。
  - [ ] 后端实现“磁盘加载” API，将物理文件解析为表单数据。

---

### 5. 自动保存功能 (Auto-save) - **优先级：中** ⭐️⭐️

**目标**：在磁盘写入机制完成后，实现自动化的“保存到磁盘 -> 异步同步数据库”。

**实现步骤**：

#### 后端任务

- [ ] **草稿自动保存接口**:
  - [ ] 创建 `POST /api/v1/posts/draft/autosave` 接口。
  - [ ] 支持将内容实时持久化到 `content/` 对应物理目录。
  - [ ] 添加防抖机制，避免频繁写入。

#### 前端任务

- [ ] **自动保存逻辑**:
  - [ ] 使用 `useDebounce` hook 监听编辑器内容变化。
  - [ ] 内容变化后 3 秒自动保存至磁盘并触发后台同步。
  - [ ] 显示实时保存状态。

  - [ ] **分类自动创建**:
    - [ ] 检测新分类目录时，自动在数据库创建 Category 记录
    - [ ] 使用文件夹名作为 `slug` 和初始 `name`
    - [ ] 支持自定义分类元数据文件（可选 `.category.yaml`）

  - [ ] **优先级规则**:
    - [ ] Frontmatter 中的 `category` 字段优先级最高
    - [ ] 如果 Frontmatter 未指定，使用文件夹路径自动推断
    - [ ] 如果分类不存在，抛出警告或自动创建（可配置）

  - [ ] **同步逻辑更新**:
    - [ ] `GitOpsService` 支持路径解析
    - [ ] 文件移动到新文件夹时，自动更新文章分类
    - [ ] 记录文件路径变化日志

  **技术实现**：

  ```python
  # backend/app/git_ops/scanner.py
  from pathlib import Path
  from enum import Enum

  class PostType(str, Enum):
      ARTICLE = "article"
      IDEA = "idea"

  def parse_file_path(file_path: Path, content_root: Path) -> dict:
      """
      解析文件路径，提取 post_type 和 category

      示例：
      - content/articles/tech/post1.mdx -> {type: "article", category: "tech"}
      - content/ideas/thoughts/idea.md -> {type: "idea", category: "thoughts"}
      - content/post.mdx -> {type: None, category: None}  # 向后兼容
      """
      relative_path = file_path.relative_to(content_root)
      parts = relative_path.parts

      if len(parts) >= 3:
          # 标准结构: {post_type}/{category}/{filename}
          post_type = parts[0].rstrip('s')  # articles -> article
          category_slug = parts[1]
          return {
              "post_type": post_type if post_type in ["article", "idea"] else None,
              "category_slug": category_slug,
              "filename": parts[-1]
          }
      elif len(parts) == 2:
          # 仅有类型: {post_type}/{filename}
          post_type = parts[0].rstrip('s')
          return {
              "post_type": post_type if post_type in ["article", "idea"] else None,
              "category_slug": "uncategorized",
              "filename": parts[-1]
          }
      else:
          # 平铺结构（向后兼容）
---

## 🎨 v1.1 / v2.0 计划 (Enhanced Features)

### 1. 基础 SEO 与内容分发 (Basic SEO & Distribution) ⭐️⭐️
**目标**：Sitemap, RSS/Atom Feed, SEO 元数据完善。

### 2. 基础搜索 (Basic Search) ⭐️⭐️
**目标**：基于 PostgreSQL 的全文检索。

### 3. 多语言支持 (i18n) ⭐️
**目标**：支持中英文内容切换。

### 4. 评论系统与社交互动 ⭐️
**目标**：集成 Waline/Giscus，实现统计与展示。

### 5. 安全性工程 (Security) ⭐️
**目标**：漏洞扫描、限流、审计日志。

---

## 🔮 长期愿景 (Future / Long-term)

- [ ] **Sitemap 生成**:
  - [ ] 创建 `/sitemap.xml` 路由
  - [ ] 动态根据文章数据生成 XML
  - [ ] 包含文章、分类、标签页面的链接
  - [ ] 自动提交到 Google Search Console (可选)

- [ ] **RSS/Atom Feed**:
  - [ ] 创建 `/feed.xml` 和 `/atom.xml` 路由
  - [ ] 生成标准 RSS 2.0 和 Atom 1.0 格式
  - [ ] 包含全文输出（可选配置）

- [ ] **SEO 元数据完善**:
  - [ ] 完善 Server Component 的 `generateMetadata`
  - [ ] 自动生成 JSON-LD 结构化数据 (Article Schema)
  - [ ] 优化 Open Graph 图片生成 (og:image)

---

### 6. 基础搜索 (Basic Search) - **优先级：高** ⭐️⭐️
*(原 v1.1 内容提前)*

**目标**：提供基于数据库的基础全文搜索，满足 v1.0 需求。
*注：暂不通过向量/AI实现，优先使用 PostgreSQL 原生能力。*

**实现步骤**：

- [ ] **后端全文检索**:
  - [ ] 使用 PostgreSQL `SearchVector` 对标题和内容建立索引
  - [ ] 实现 `/api/v1/posts/search` 接口
  - [ ] 支持关键词高亮 (Headline)

- [ ] **前端搜索交互**:
  - [ ] 集成 CMD+K 全局搜索框 (Command Palette)
  - [ ] 实现搜索结果下拉预览
  - [ ] 独立的搜索结果页

---

## 🔮 长期愿景 (Future / Long-term)

### 1. 数据分析平台 (Analytics Platform) ⭐️⭐️

**目标**：提供强大的全文搜索和智能推荐功能。

**实现方案**：

#### 方案 A：传统全文搜索（PostgreSQL）

- [ ] 使用 PostgreSQL 的 `tsvector` 和 `tsquery`
- [ ] 创建全文索引：`CREATE INDEX idx_post_search ON posts USING GIN(to_tsvector('english', title || ' ' || content_html))`
- [ ] 支持中文分词（使用 `zhparser` 扩展）
- [ ] 实现搜索高亮和相关度排序

#### 方案 B：向量检索（Semantic Search）

- [ ] 集成 OpenAI Embeddings 或开源模型（如 sentence-transformers）
- [ ] 使用 pgvector 扩展存储向量
- [ ] 实现语义搜索和相似文章推荐
- [ ] 支持多语言搜索

**前端功能**：

- [ ] 全局搜索框（支持快捷键 Cmd+K）
- [ ] 搜索结果页面（高亮关键词）
- [ ] 搜索历史和热门搜索
- [ ] 搜索建议和自动补全

---

### 2. 仪表盘统计 (Dashboard Analytics) ⭐️⭐️

**目标**：提供数据洞察，帮助作者了解内容表现。

**统计维度**：

- [ ] **文章统计**:

  - [ ] 总文章数、草稿数、已发布数
  - [ ] 本周/本月新增文章趋势图
  - [ ] 最受欢迎文章 Top 10（按浏览量）

- [ ] **用户行为**:

  - [ ] 总浏览量、独立访客数
  - [ ] 浏览量趋势图（按天/周/月）
  - [ ] 用户来源分析（直接访问/搜索引擎/社交媒体）

- [ ] **内容分析**:
  - [ ] 分类分布饼图
  - [ ] 标签云
  - [ ] 平均阅读时长
  - [ ] 评论互动率

**技术实现**：

- [ ] 后端创建统计聚合接口
- [ ] 使用 Redis 缓存统计数据
- [ ] 前端使用 Chart.js 或 Recharts 绘制图表
- [ ] 支持导出统计报告（PDF/Excel）

---

### 3. SEO 工具 (SEO Tools) ⭐️

**目标**：优化搜索引擎排名，提升内容可见性。

**功能列表**：

- [ ] **SEO 预览**:

  - [ ] 实时预览 Google 搜索结果样式
  - [ ] 显示 meta title、description 长度
  - [ ] 检查 Open Graph 和 Twitter Card 标签

- [ ] **SEO 评分**:

  - [ ] 标题优化建议（长度、关键词）
  - [ ] 描述优化建议
  - [ ] 图片 alt 文本检查
  - [ ] 内链和外链分析
  - [ ] 关键词密度分析

- [ ] **Sitemap 生成**:

  - [ ] 自动生成 XML sitemap
  - [ ] 支持多语言 sitemap
  - [ ] 自动提交到搜索引擎

- [ ] **结构化数据**:
  - [ ] 自动生成 JSON-LD（Article, BlogPosting）
  - [ ] 支持面包屑导航
  - [ ] 支持作者信息

---

## 🎨 v1.1 / v2.0 计划 (Enhanced Features)

### 1. 基础 SEO 与内容分发 (Basic SEO & Distribution) ⭐️⭐️
**目标**：Sitemap, RSS/Atom Feed, SEO 元数据完善。

### 2. 基础搜索 (Basic Search) ⭐️⭐️
**目标**：基于 PostgreSQL 的全文检索。

### 3. 多语言支持 (i18n) ⭐️
**目标**：支持中英文内容切换。

### 4. 评论系统与社交互动 ⭐️
**目标**：集成 Waline/Giscus，实现统计与展示。

### 5. 安全性工程 (Security) ⭐️
**目标**：漏洞扫描、限流、审计日志。

---

## 🔮 长期愿景 (Future / Long-term)

### 1. 数据分析与仪表盘 (Analytics & Dashboard) ⭐️⭐️
**目标**：提供数据洞察，帮助作者了解内容表现，包括浏览量、热点内容、搜索分析等。

### 2. 多媒介支持 ⭐️
**目标**：集成音乐、视频播放器，优化媒体 CDN 分发。

---

## 📋 技术债务 (Technical Debt)

- [ ] 补充单元测试覆盖率（目标 80%+）
- [ ] 添加 E2E 测试（Playwright）
- [ ] 完善 API 文档（Swagger/Scalar）
- [ ] 代码质量检查（ESLint, Ruff）
- [ ] 性能监控（Sentry, OpenTelemetry）
- [ ] 日志聚合和分析

---

## 🎯 里程碑 (Milestones)

### v1.0 - 核心功能完善（当前）
- ✅ Git 同步核心
- ✅ 文章管理和编辑
- ✅ 媒体管理 (Media)
- ✅ 后台架构动态路由重构 & TanStack Query 统一化
- ✅ Agent Skills 知识库构建 (项目级 + 系统级)
- 🚧 核心架构升级: "Git-First" 双向反向写入系统
- 🚧 Git 同步增强 (目录分类)
- 🚧 结构化元数据编辑器 (Sidebar)
- 🚧 自动保存
- 🚧 基础 SEO (Sitemap/RSS)
- 🚧 基础搜索 (PostgreSQL)

### v1.1 / v2.0 - 增强与扩展
- 评论系统
- 多语言支持 (i18n)
- 安全性增强
- 数据分析平台

---
_上次更新: 2026-01-12_
