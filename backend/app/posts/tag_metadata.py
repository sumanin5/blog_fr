# ============================================================
# Posts - 文章管理
# ============================================================
POSTS_TAG_METADATA = {
    "name": "posts",
    "description": """
## 文章管理模块

提供文章的创建、编辑、发布和查询功能，支持 Markdown/MDX 格式。

### 核心功能

#### ✍️ 文章创建与编辑
- **Markdown/MDX 支持**：完整支持 Markdown 和 MDX 语法
- **实时预览**：提供预览接口，实时渲染 Markdown
- **草稿功能**：支持保存草稿，稍后发布
- **分类和标签**：支持文章分类和多标签

#### 📊 文章类型
- **Article（文章）**：长篇内容，支持完整的 Markdown 功能
- **Idea（想法）**：短篇内容，快速记录灵感

#### 🎨 三种渲染模式

博客系统支持三种 Markdown/MDX 渲染模式，适应不同场景：

##### 1️⃣ 后端渲染（Backend Rendering）
```
Markdown → Python (markdown-it-py) → HTML → 前端显示
```
- **适用场景**：简单的 Markdown 文章，不需要交互
- **优点**：SEO 友好，首屏加载快
- **缺点**：不支持 React 组件

##### 2️⃣ 前端服务端渲染（Frontend SSR）
```
MDX → Next.js Server (next-mdx-remote) → HTML + Hydration → 前端交互
```
- **适用场景**：需要 React 组件的文章
- **优点**：SEO 友好 + 支持交互组件（需要自定义）
- **缺点**：服务器负载较高
- **配置**：`enable_jsx: true`

##### 3️⃣ 前端客户端渲染（Frontend CSR）
```
MDX → 浏览器 (@mdx-js/mdx) → React 组件 → 前端交互
```
- **适用场景**：高度交互的文章（图表、动画等）
- **优点**：最灵活，支持所有 React 特性
- **缺点**：SEO 较差，首屏加载慢
- **配置**：`enable_jsx: true && use_server_rendering: false`

#### 🔄 渲染模式选择

| 模式 | SEO | 交互性 | 性能 | 推荐场景 |
|------|-----|--------|------|----------|
| 后端渲染 | ⭐⭐⭐ | ❌ | ⭐⭐⭐ | 纯文本文章 |
| 前端 SSR | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 带组件的文章 |
| 前端 CSR | ⭐ | ⭐⭐⭐ | ⭐ | 交互式内容 |

### 文章状态

- **draft（草稿）**：仅作者和管理员可见
- **published（已发布）**：所有人可见
- **archived（归档）**：不在列表中显示，但可通过链接访问

### 权限控制

- **创建文章**：需要登录
- **编辑文章**：作者或管理员
- **删除文章**：作者或管理员
- **查看草稿**：作者或管理员
- **查看已发布文章**：所有人（包括游客）
    """,
}

POSTS_TAGS_METADATA = [
    {
        "name": "Posts - Public",
        "description": "公开接口（文章列表、详情）",
    },
    {
        "name": "Posts - Me",
        "description": "我的文章（管理自己的文章）",
    },
    {
        "name": "Posts - Editor",
        "description": "编辑器接口（创建、编辑、预览）",
    },
    {
        "name": "Posts - Interactions",
        "description": "互动接口（点赞、评论、收藏）",
    },
    {
        "name": "Posts - Admin",
        "description": "管理员接口（管理所有文章）",
    },
]
