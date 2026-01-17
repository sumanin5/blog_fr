---
name: mdx-management
description: MDX 内容处理、渲染架构与 Git 同步规范。涵盖自定义组件扩展、双端渲染策略以及 Frontmatter 元数据标准。
---

## MDX 核心理念

本项目的核心是基于 MDX 的内容创作系统。为了保证内容在 SEO 和交互性之间的平衡，必须遵循以下处理原则。

### 1. 渲染策略 (SSR vs CSR)
- **页面级渲染 (SSR)**: 在 `frontend/src/app/posts/[slug]/` 中，优先使用 Server Components 进行数据获取和初步渲染，以确保 SEO 友好。
- **组件级交互 (CSR)**: 涉及代码高亮、复制按钮、Mermaid 图表等交互元素时，使用 `next-mdx-remote` 的客户端组件模式进行 Hydration。

### 2. 组件注册架构 (Registry Pattern)
代码路径：`frontend/src/components/mdx/`
- **注册层 (`registry/`)**: 仅负责 HTML 标签到 React 组件的映射（如 `pre` -> `CodeBlock`）。严禁在此层编写业务逻辑。
- **实现层 (`components/`)**: 处理具体逻辑。例如，`CodeBlock` 组件应内部判断内容是否为 `mermaid` 语言并分发渲染逻辑。
- **添加新组件**:
  1. 在 `components/` 创建实现。
  2. 在 `registry/mdx-components.tsx` 注册映射。

### 3. 内容同步与元数据 (Git Sync)
规范参考：`GIT_SYNC_GUIDE.md`
- **Frontmatter**: 必须包含 `title`, `author`, `tags` 等核心字段。
- **Slug 处理**: 后端同步时会自动调用 `generate_slug_with_random_suffix`。在 MDX 文件中仅定义逻辑 Slug（如 `my-post`），不要手动添加后缀。
- **图片路径**: 在 MDX 中引用图片时，优先使用媒体库相对路径。

### 4. 特殊内容处理
- **数学公式**: 使用 KaTeX 语法，确保前后端解析器一致。
- **流程图**: 使用 `mermaid` 语言块。
- **自定义交互**: 使用注册好的自定义组件（如 `<InteractiveButton />`），避免在 MDX 中编写原生内联 script。

## 维护原则
- 修改渲染逻辑时，必须同时考虑 Dark/Light 模式的样式兼容。
- 保证 MDX 的输出 AST 结构稳定，避免前端解析崩溃。
