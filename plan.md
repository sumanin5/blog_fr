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

---

## 🚀 即将进行 (In Progress / Short-term)

### 1. 媒体集成增强 (Media Integration) - **优先级：高** ⭐️⭐️

**目标**：完善文章封面上传和管理功能，提升内容创作体验。

**实现步骤**：

#### 后端任务

- [ ] **封面上传优化**:
  - [ ] 确保缩略图生成稳定（small/medium/large/xlarge）
  - [ ] 添加图片压缩和格式转换（WebP）
  - [ ] 支持封面图裁剪和尺寸调整

#### 前端任务

- [ ] **编辑器封面上传**:

  - [ ] 在文章编辑器侧边栏添加封面上传组件
  - [ ] 支持拖拽上传和点击上传
  - [ ] 实时预览上传的封面图
  - [ ] 支持替换和删除封面
  - [ ] 对接 `/api/v1/media/upload` 接口
  - [ ] 上传成功后自动关联 `cover_media_id`

- [ ] **媒体库选择器**:

  - [ ] 创建媒体库弹窗组件
  - [ ] 支持从已上传的媒体文件中选择封面
  - [ ] 支持搜索和筛选（按类型、标签、日期）
  - [ ] 支持分页加载

- [ ] **Git 同步封面支持**:
  - [ ] 在 Frontmatter 中支持 `cover` 字段（本地路径或 URL）
  - [ ] 同步时自动上传本地图片到媒体库
  - [ ] 或者支持外部 URL 直接引用

**技术细节**：

```typescript
// 封面上传组件接口
interface CoverUploadProps {
  currentCoverId?: string;
  onCoverChange: (mediaId: string | null) => void;
  onUploadSuccess?: (media: MediaFileResponse) => void;
}

// 媒体库选择器接口
interface MediaLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaFileResponse) => void;
  filter?: {
    mediaType?: "image" | "video" | "audio";
    usage?: "cover" | "avatar" | "general";
  };
}
```

---

### 2. 自动保存功能 (Auto-save) - **优先级：高** ⭐️⭐️

**目标**：防止内容丢失，提升编辑体验。

**实现步骤**：

#### 后端任务

- [ ] **草稿自动保存接口**:
  - [ ] 创建 `POST /api/v1/posts/draft/autosave` 接口
  - [ ] 支持部分字段更新（title, content_mdx, excerpt）
  - [ ] 返回保存时间戳和版本号
  - [ ] 添加防抖机制，避免频繁写入数据库

#### 前端任务

- [ ] **自动保存逻辑**:

  - [ ] 使用 `useDebounce` hook 监听编辑器内容变化
  - [ ] 内容变化后 3 秒自动触发保存
  - [ ] 或者每 30 秒定时保存
  - [ ] 显示保存状态："已保存" / "保存中..." / "保存失败"

- [ ] **本地备份**:

  - [ ] 使用 `localStorage` 存储草稿内容
  - [ ] 页面加载时检查是否有未保存的本地草稿
  - [ ] 提示用户恢复本地草稿或使用服务器版本

- [ ] **版本历史**:
  - [ ] 在编辑器中添加"版本历史"按钮
  - [ ] 展示最近 10 个自动保存的版本
  - [ ] 支持预览和恢复历史版本

**技术细节**：

```typescript
// 自动保存 Hook
function useAutoSave(postId: string, content: string, interval = 30000) {
  const debouncedContent = useDebounce(content, 3000);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );

  useEffect(() => {
    // 自动保存逻辑
    const save = async () => {
      setSaveStatus("saving");
      try {
        await autosavePost(postId, { content_mdx: debouncedContent });
        setSaveStatus("saved");
        localStorage.setItem(`draft-${postId}`, debouncedContent);
      } catch (error) {
        setSaveStatus("error");
      }
    };

    if (debouncedContent) {
      save();
    }
  }, [debouncedContent, postId]);

  return { saveStatus };
}
```

---

### 3. Git 同步增强 (Git Sync Enhancement) - **优先级：中** ⭐️

**目标**：提升 Git 同步的可控性和可见性。

**实现步骤**：

#### 后端任务

- [ ] **差异预览接口**:

  - [ ] 创建 `GET /api/v1/ops/git/preview` 接口（dry-run 模式）
  - [ ] 返回将要执行的操作列表：
    ```json
    {
      "to_create": [{ "file": "new-post.md", "title": "新文章" }],
      "to_update": [
        {
          "file": "old-post.md",
          "title": "旧文章",
          "changes": ["title", "content"]
        }
      ],
      "to_delete": [{ "file": "deleted.md", "title": "已删除" }]
    }
    ```
  - [ ] 不实际执行同步，仅分析差异

- [ ] **GitHub Webhook 支持**:
  - [ ] 创建 `POST /api/v1/ops/git/webhook` 接口
  - [ ] 验证 GitHub webhook 签名（HMAC-SHA256）
  - [ ] 接收 `push` 事件后触发后台同步任务
  - [ ] 支持配置 webhook secret

#### 前端任务

- [ ] **差异预览页面**:

  - [ ] 在 Git 同步中心添加"预览变更"按钮
  - [ ] 展示差异对比界面（新增/更新/删除）
  - [ ] 支持展开查看具体变更内容
  - [ ] 用户确认后再执行实际同步

- [ ] **Webhook 配置界面**:
  - [ ] 在设置页面添加 Webhook 配置
  - [ ] 显示 Webhook URL 和 Secret
  - [ ] 提供 GitHub 配置指南
  - [ ] 显示最近的 Webhook 触发记录

**技术细节**：

```python
# GitHub Webhook 验证
def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

# Webhook 路由
@router.post("/webhook")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(...),
    background_tasks: BackgroundTasks
):
    payload = await request.body()
    if not verify_github_signature(payload, x_hub_signature_256, settings.WEBHOOK_SECRET):
        raise HTTPException(401, "Invalid signature")

    background_tasks.add_task(sync_from_git)
    return {"status": "triggered"}
```

---

## 🔮 长期愿景 (Future / Long-term)

### 1. 搜索增强 (Search Enhancement) ⭐️⭐️⭐️

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

### 4. 多语言支持 (i18n) ⭐️⭐️

**目标**：支持多语言内容管理和展示。

**实现方案**：

#### 后端任务

- [ ] **数据模型扩展**:

  - [ ] 为 Post 添加 `language` 字段（zh-CN, en-US, ja-JP）
  - [ ] 添加 `translation_group_id` 关联翻译版本
  - [ ] 支持每种语言独立的 slug

- [ ] **API 增强**:
  - [ ] 支持按语言筛选文章
  - [ ] 返回文章的可用翻译列表
  - [ ] 支持语言回退（zh-CN → zh → en）

#### 前端任务

- [ ] **语言切换**:

  - [ ] 在导航栏添加语言选择器
  - [ ] 使用 next-intl 或 i18next
  - [ ] 支持 URL 路由（/zh/posts, /en/posts）

- [ ] **翻译管理**:
  - [ ] 在编辑器中添加"添加翻译"功能
  - [ ] 显示文章的所有翻译版本
  - [ ] 支持翻译状态（未翻译/翻译中/已完成）

---

### 5. 评论系统 (Comment System) ⭐️⭐️

**目标**：增强用户互动，建立社区氛围。

**功能列表**：

- [ ] **基础评论**:

  - [ ] 支持 Markdown 格式评论
  - [ ] 支持回复和嵌套评论
  - [ ] 支持点赞和举报
  - [ ] 支持匿名评论（可配置）

- [ ] **评论审核**:

  - [ ] 后台评论管理界面
  - [ ] 支持批量审核/删除
  - [ ] 垃圾评论过滤（Akismet）
  - [ ] 敏感词过滤

- [ ] **通知系统**:
  - [ ] 新评论邮件通知
  - [ ] @提及通知
  - [ ] 站内消息通知

**技术选型**：

- 自建评论系统（完全控制）
- 或集成第三方（Disqus, Giscus, Utterances）

---

### 6. 性能优化 (Performance Optimization) ⭐️

**优化方向**：

- [ ] **缓存策略**:

  - [ ] Redis 缓存热门文章
  - [ ] CDN 加速静态资源
  - [ ] 浏览器缓存优化

- [ ] **数据库优化**:

  - [ ] 添加必要的索引
  - [ ] 查询优化（N+1 问题）
  - [ ] 数据库连接池调优

- [ ] **前端优化**:
  - [ ] 图片懒加载和响应式图片
  - [ ] 代码分割和按需加载
  - [ ] 使用 Next.js ISR（增量静态再生成）

---

### 7. 安全增强 (Security Enhancement) ⭐️⭐️

**安全措施**：

- [ ] **认证增强**:

  - [ ] 支持 OAuth2（GitHub, Google）
  - [ ] 双因素认证（2FA）
  - [ ] 登录日志和异常检测

- [ ] **权限细化**:

  - [ ] 基于角色的访问控制（RBAC）
  - [ ] 文章协作权限（编辑/查看）
  - [ ] API 访问限流

- [ ] **内容安全**:
  - [ ] XSS 防护（内容过滤）
  - [ ] CSRF 防护
  - [ ] SQL 注入防护
  - [ ] 文件上传安全检查

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
- ✅ 分类和标签管理
- 🚧 媒体集成
- 🚧 自动保存

### v1.1 - 用户体验提升

- 搜索功能
- 仪表盘统计
- SEO 工具
- Git 同步增强

### v1.2 - 社区功能

- 评论系统
- 用户互动
- 通知系统

### v2.0 - 国际化和扩展

- 多语言支持
- 插件系统
- 主题定制
- API 开放平台

---

_上次更新: 2026-01-11_
_下次审查: 2026-01-18_
