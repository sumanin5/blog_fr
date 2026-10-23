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
│   └── renderers/
│       ├── tanstack-markdown-renderer.tsx  # 默认正文链路
│       ├── mdx-server-renderer.tsx         # JSX / 数学公式兼容
│       ├── mdx-client-renderer.tsx         # 管理端预览
│       └── ast-renderer.tsx                # 无 source 时兜底
└── components/         # 原子组件
    └── post-meta.tsx
```

## 🎯 架构原则

### 1. 默认一条 Markdown 真相

普通文章优先走 `@tanstack/markdown`：

- 服务端解析并直出
- 稳定 heading id
- 文档型 callout
- 标题收集用于右侧目录
- 代码高亮使用 `@tanstack/highlight`

### 2. MDX 是兼容边界

以下场景回退到 `next-mdx-remote`：

- `enable_jsx=true`
- TeX 数学公式
- 已有 MDX 内容

### 3. 入口组件只做路由

`post-content.tsx` 只负责判断和路由，不包含渲染逻辑。

## 🔄 使用流程

```typescript
import { PostDetailView } from "@/components/public/post/views/post-detail-view";

<PostDetailView post={post} />;
```

详情页会在服务端预解析 Markdown，并把同一份 document 同时用于正文与目录，避免重复解析。
