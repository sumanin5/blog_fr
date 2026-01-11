# BLOG_FR 项目开发计划 (Plan)

本项目是一个基于 FastAPI (后端) 和 Next.js (前端) 的现代化博客系统，深度集成 Git (MDX) 同步流程。

## ✅ 已完成功能 (Completed)

### 1. 管理后台基础架构 (Admin Foundation)

- [x] **侧边栏 (Admin Sidebar)**: 基于 Shadcn/UI 构建，自适应导航，支持超级管理员/普通用户角色权限识别。
- [x] **响应式布局 (Admin Layout)**: 统一的后台管理壳，包含面包屑、用户菜单及权限守卫。

### 2. 文章管理 (Post Management)

- [x] **我的文章**: 个人创作中心，支持 Articles 和 Ideas 快速切换。
- [x] **全站文章管理**: 超级管理员专属页面，可全局监控和操作。
- [x] **功能组件**: 开发了复用性极强的 `PostListTable`，支持 Framer Motion 动画、状态 Badge 和 Git Hash 摘要。
- [x] **Git 同步中心**: 独立的 Git 状态监控页，区分“Git 托管”与“数据库原生”内容。

### 3. 内容编辑器 (Content Editor)

- [x] **双栏编辑器**: 实现 MDX 编辑区与实时预览区的分离布局。
- [x] **实时预览**: 利用 Iframe 隔离技术实现的预览页，对接后端 `PostProcessor` 接口，支持实时渲染 HTML、TOC 和阅读时长。
- [x] **多维设置**: 文章侧边栏支持修改 Slug、分类选择及封面占位展示。

### 4. 后端增强 (Backend Enhancements)

- [x] **Schema 完善**: 在短响应模型中补充 Git 追踪字段。
- [x] **预览接口**: 开发专用的预览 API (`/posts/preview`)，支持实时解析 MDX 而不持久化。
- [x] **自动生成工具**: 修复并打通了 `generate-api.sh` 脚本，实现前后端 SDK 零成本同步。
- [x] **GitOps 核心服务**: 完成了后端 `GitOpsService`，实现了基于文件扫描的全量同步逻辑 (Sync All)，支持 Create/Update/Delete 完整生命周期，并包含完善的集成测试。

---

## 🚀 即将进行 (In Progress / Short-term)

### 1. 深度运维功能 (Operations)

- [x] **全功能分类管理**:
  - [x] 完成“新增/编辑分类”的对话框表单。
  - [x] 对接后端 PATCH/POST 接口。
- [x] **标签治理 (Tag Management)**:
  - [x] 实现标签合并 (Merge) 界面。
  - [x] 实现孤立标签清理接口对接。
- [ ] **删除确认**: 为全站删除操作引入 `AlertDialog` 确认流程。

### 2. Git 同步核心 (Git Core)

### 2. Git 同步核心 (Git Core) - **High Complexity** ⭐️⭐️⭐️

**目标**：实现 "Git as Source of Truth" 的博客工作流。允许用户通过 push git 仓库来管理文章，而非仅依赖后台编辑器。

**核心挑战与性能要求**：

- **增量同步 (Incremental Sync)**：
  - 避免全量扫描和全量数据库写入。
  - **策略**：构建 `file_path -> content_hash (sha256)` 的映射。每次同步仅处理 `git diff` 产生变更的文件。
- **Frontmatter 解析**：
  - 高效解析 MDX 头部元数据（title, slug, date, tags），将其映射到数据库字段。
- **双向冲突处理**：
  - **原则**：Git 仓库具有最高优先级。
  - 当发生冲突时，Git 版本强制覆盖数据库版本（但可以保留一个数据库版本快照 `PostVersion` 以防万一）。
- **任务队列**：
  - 由于 `git pull` 和文件扫描属 IO 密集型且耗时较长，建议设计为异步任务（Background Task）。

**细分任务**：

- [x] **物理层**: 后端实现 `GitClient` 和 `MDXScanner`。
- [x] **同步层**: 后端实现 `SyncManager` (即 GitOpsService) 及其 CRUD 映射。
- [x] **集成层**: 将 `GitClient.pull()` 集成到同步流程中，实现真正的远程同步。
- [ ] **UI 层**:
  - [ ] 同步触发器：在前端“Git 同步中心”添加“立即同步”按钮。
  - [ ] 状态反馈：展示上次同步时间、同步结果统计 (Added/Updated/Deleted)。
  - [ ] (可选) 差异预览页：在执行同步前，展示“即将新增 3 篇，更新 2 篇，删除 1 篇”。
- [ ] **Webhook**: (可选) 支持 GitHub Webhook 自动触发同步。

### 3. 内容创作增强 (Editor Extra)

- [ ] **媒体集成**: 完善文章封面上传，对接现有的 Media 模块。
- [ ] **自动保存**: 增加本地/服务端草稿自动保存逻辑，防止内容丢失。

---

## 🔮 长期愿景 (Future / Long-term)

- [ ] **搜索增强**: 集成全文搜索（向量检索或传统搜索）。
- [ ] **仪表盘统计**: 完成“工作台”页面的数据图表（阅读趋势、用户活跃）。
- [ ] **SEO 工具**: 在后台提供静态页面预览及 SEO 指标打分。
- [ ] **多语言支持**: 完善国际化 (i18n) 流程。

---

_上次更新: 2026-01-11_
