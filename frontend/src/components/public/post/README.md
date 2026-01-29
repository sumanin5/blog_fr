# Post 组件模块

文章展示相关的组件集合。

## 📁 目录结构

```
post/
├── views/              # 页面级组件
│   ├── post-detail-view.tsx
│   ├── post-list-view.tsx
│   └── post-card.tsx
├── content/            # 内容渲染
│   ├── post-content.tsx
│   ├── post-content-styles.ts
│   └── renderers/      # 三种渲染器
│       ├── html-renderer.tsx
│       ├── mdx-server-renderer.tsx
│       └── mdx-client-renderer.tsx
└── components/         # 原子组件
    └── post-meta.tsx
```

## 🎯 架构原则

### 1. 按职责分层

- **views/**：页面级组件，组合多个组件
- **content/**：内容渲染逻辑
- **components/**：可复用的原子组件

### 2. 渲染器职责单一

每个渲染器只负责一种渲染模式

### 3. 入口组件只做路由

`post-content.tsx` 只负责判断和路由，不包含渲染逻辑

## 🔄 使用流程

```typescript
import { PostDetailView } from "@/components/post/views/post-detail-view";
import { PostContent } from "@/components/post/content/post-content";

// 在页面中使用
<PostDetailView post={post} />

// 直接渲染内容
<PostContent
  html={post.content_html}
  mdx={post.content_mdx}
  enableJsx={post.enable_jsx}
  useServerRendering={post.use_server_rendering}
/>
```
