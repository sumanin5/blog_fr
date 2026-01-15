# 组件重构指南

## ✅ 重构完成！

所有文件已按照新的架构重新组织。

## 📋 已完成的工作

### ✅ 步骤 1：移动 post/ 目录的文件

- ✅ 移动视图组件到 `views/`
- ✅ 移动原子组件到 `components/`
- ✅ 移动内容渲染相关到 `content/`
- ✅ 删除旧的重复文件

### ✅ 步骤 2：移动 mdx/ 目录的文件

- ✅ 移动注册中心到 `registry/`
- ✅ 移动组件到 `components/`
- ✅ 移动工具到 `utils/`

### ✅ 步骤 3：更新导入路径

- ✅ 更新 `app/posts/[slug]/page.tsx`
- ✅ 更新 `app/posts/page.tsx`
- ✅ 更新 `post-detail-view.tsx`
- ✅ 更新 `html-renderer.tsx`
- ✅ 更新所有渲染器的导入

### ✅ 步骤 4：简化 mdx-components.tsx

- ✅ 移除业务逻辑
- ✅ 只保留组件映射
- ✅ 直接映射 `pre` 到 `CodeBlock`

### ✅ 步骤 5：更新 CodeBlock 组件

- ✅ 添加 Mermaid 判断逻辑
- ✅ 处理 `pre` 标签的 props
- ✅ 提取代码内容和语言
- ✅ 渲染对应的组件

### ✅ 步骤 6：创建 README 文档

- ✅ `frontend/src/components/post/README.md`
- ✅ `frontend/src/components/mdx/README.md`

### ✅ 步骤 7：验证

- ✅ 类型检查通过（无诊断错误）
- ✅ 所有导入路径正确
- ✅ 架构清晰，职责分明

### 步骤 1：移动 post/ 目录的文件

```bash
# 移动视图组件
mv frontend/src/components/post/post-detail-view.tsx frontend/src/components/post/views/
mv frontend/src/components/post/post-list-view.tsx frontend/src/components/post/views/
mv frontend/src/components/post/post-card.tsx frontend/src/components/post/views/

# 移动原子组件
mv frontend/src/components/post/post-meta.tsx frontend/src/components/post/components/

# 移动内容渲染相关
mv frontend/src/components/post/post-content.tsx frontend/src/components/post/content/
mv frontend/src/components/post/post-content-styles.ts frontend/src/components/post/content/

# 重命名并移动渲染器
mv frontend/src/components/post/post-content-server.tsx frontend/src/components/post/content/renderers/html-renderer.tsx
mv frontend/src/components/post/post-content-client.tsx frontend/src/components/post/content/renderers/mdx-client-renderer.tsx
```

### 步骤 2：移动 mdx/ 目录的文件

```bash
# 移动注册中心
mv frontend/src/components/mdx/mdx-components.tsx frontend/src/components/mdx/registry/

# 移动组件
mv frontend/src/components/mdx/code-block.tsx frontend/src/components/mdx/components/
mv frontend/src/components/mdx/mermaid-diagram.tsx frontend/src/components/mdx/components/
mv frontend/src/components/mdx/interactive-button.tsx frontend/src/components/mdx/components/
mv frontend/src/components/mdx/katex-math.tsx frontend/src/components/mdx/components/
mv frontend/src/components/mdx/custom-components.tsx frontend/src/components/mdx/components/

# 移动工具
mv frontend/src/components/mdx/copy-button.tsx frontend/src/components/mdx/utils/
mv frontend/src/components/mdx/table-of-contents.tsx frontend/src/components/mdx/utils/
```

### 步骤 3：更新导入路径

需要更新以下文件的导入路径：

#### 3.1 更新 post/ 相关导入

```typescript
// frontend/src/app/posts/[slug]/page.tsx
- import { PostDetailView } from "@/components/post/post-detail-view";
+ import { PostDetailView } from "@/components/post/views/post-detail-view";

// frontend/src/app/posts/page.tsx
- import { PostListView } from "@/components/post/post-list-view";
+ import { PostListView } from "@/components/post/views/post-list-view";

// frontend/src/components/post/views/post-detail-view.tsx
- import { PostContent } from "@/components/post/post-content";
- import { PostMeta } from "@/components/post/post-meta";
+ import { PostContent } from "@/components/post/content/post-content";
+ import { PostMeta } from "@/components/post/components/post-meta";
- import { TableOfContents } from "@/components/mdx/table-of-contents";
+ import { TableOfContents } from "@/components/mdx/utils/table-of-contents";

// frontend/src/components/post/views/post-list-view.tsx
- import { PostCard } from "./post-card";
+ import { PostCard } from "./post-card";  // 同目录，不需要改

// frontend/src/components/post/content/post-content.tsx
- import { PostContentServer } from "./post-content-server";
- import { PostContentClient } from "./post-content-client";
- import { getArticleClassName } from "./post-content-styles";
+ import { HtmlRenderer } from "./renderers/html-renderer";
+ import { MdxClientRenderer } from "./renderers/mdx-client-renderer";
+ import { getArticleClassName } from "./post-content-styles";
```

#### 3.2 更新 mdx/ 相关导入

```typescript
// frontend/src/components/post/content/post-content.tsx
- import { createMdxComponents } from "@/components/mdx/mdx-components";
+ import { createMdxComponents } from "@/components/mdx/registry/mdx-components";

// frontend/src/components/post/content/renderers/html-renderer.tsx
- import { MermaidDiagram } from "@/components/mdx/mermaid-diagram";
- import { CodeBlock } from "@/components/mdx/code-block";
- import { KatexMath } from "@/components/mdx/katex-math";
- import { InteractiveButton } from "@/components/mdx/interactive-button";
+ import { MermaidDiagram } from "@/components/mdx/components/mermaid-diagram";
+ import { CodeBlock } from "@/components/mdx/components/code-block";
+ import { KatexMath } from "@/components/mdx/components/katex-math";
+ import { InteractiveButton } from "@/components/mdx/components/interactive-button";

// frontend/src/components/mdx/registry/mdx-components.tsx
- import { MermaidDiagram } from "./mermaid-diagram";
- import { CodeBlock } from "./code-block";
- import { InteractiveButton } from "./interactive-button";
+ import { MermaidDiagram } from "../components/mermaid-diagram";
+ import { CodeBlock } from "../components/code-block";
+ import { InteractiveButton } from "../components/interactive-button";

// frontend/src/components/mdx/components/code-block.tsx
- import { CopyButton } from "./copy-button";
+ import { CopyButton } from "../utils/copy-button";
```

### 步骤 4：重命名文件内的组件名

```typescript
// frontend/src/components/post/content/renderers/html-renderer.tsx
- export function PostContentServer({ html, articleClassName }) {
+ export function HtmlRenderer({ html, articleClassName }) {

// frontend/src/components/post/content/renderers/mdx-client-renderer.tsx
- export function PostContentClient({ mdx, articleClassName }) {
+ export function MdxClientRenderer({ mdx, articleClassName }) {
```

### 步骤 5：创建 mdx-server-renderer.tsx

```typescript
// frontend/src/components/post/content/renderers/mdx-server-renderer.tsx
import { MDXRemote } from "next-mdx-remote/rsc";
import { createMdxComponents } from "@/components/mdx/registry/mdx-components";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MdxServerRendererProps {
  mdx: string;
  articleClassName: string;
}

export async function MdxServerRenderer({
  mdx,
  articleClassName,
}: MdxServerRendererProps) {
  return (
    <article className={articleClassName}>
      <MDXRemote
        source={mdx}
        components={createMdxComponents()}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        }}
      />
    </article>
  );
}
```

### 步骤 6：简化 post-content.tsx

```typescript
// frontend/src/components/post/content/post-content.tsx
import { HtmlRenderer } from "./renderers/html-renderer";
import { MdxServerRenderer } from "./renderers/mdx-server-renderer";
import { MdxClientRenderer } from "./renderers/mdx-client-renderer";
import { getArticleClassName } from "./post-content-styles";

interface PostContentProps {
  html?: string;
  mdx?: string;
  enableJsx?: boolean;
  useServerRendering?: boolean;
  className?: string;
}

export async function PostContent({
  html,
  mdx,
  enableJsx = false,
  useServerRendering = true,
  className = "",
}: PostContentProps) {
  const articleClassName = getArticleClassName(className);

  // 模式 1：MDX 服务端渲染
  if (enableJsx && useServerRendering && mdx) {
    return <MdxServerRenderer mdx={mdx} articleClassName={articleClassName} />;
  }

  // 模式 2：MDX 客户端渲染
  if (enableJsx && !useServerRendering && mdx) {
    return <MdxClientRenderer mdx={mdx} articleClassName={articleClassName} />;
  }

  // 模式 3：后端 HTML 渲染
  if (html) {
    return <HtmlRenderer html={html} articleClassName={articleClassName} />;
  }

  return <div>无内容</div>;
}
```

### 步骤 7：简化 mdx-components.tsx

```typescript
// frontend/src/components/mdx/registry/mdx-components.tsx
import React from "react";
import { MermaidDiagram } from "../components/mermaid-diagram";
import { CodeBlock } from "../components/code-block";
import { InteractiveButton } from "../components/interactive-button";
import {
  createHeadingSlugger,
  extractTextFromReactNode,
} from "@/lib/heading-slug";

type ComponentProps = Record<string, unknown>;
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & { id?: string };

function createHeadingComponent(
  tag: string,
  slugger: (title: string) => string
) {
  return function Heading(props: HeadingProps) {
    const text = extractTextFromReactNode(props.children);
    const id = props.id || slugger(text);

    return React.createElement(
      tag,
      {
        ...props,
        id,
        className: ["scroll-mt-24", props.className].filter(Boolean).join(" "),
      },
      props.children
    );
  };
}

export function createMdxComponents(): Record<
  string,
  React.ComponentType<ComponentProps>
> {
  const slugger = createHeadingSlugger();

  return {
    // 代码块：直接映射到 CodeBlock（内部处理 Mermaid 判断）
    pre: CodeBlock as React.ComponentType<ComponentProps>,

    // 标题：添加 ID 和锚点
    h1: createHeadingComponent(
      "h1",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h2: createHeadingComponent(
      "h2",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h3: createHeadingComponent(
      "h3",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h4: createHeadingComponent(
      "h4",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h5: createHeadingComponent(
      "h5",
      slugger
    ) as React.ComponentType<ComponentProps>,
    h6: createHeadingComponent(
      "h6",
      slugger
    ) as React.ComponentType<ComponentProps>,

    // 自定义组件
    InteractiveButton: InteractiveButton as React.ComponentType<ComponentProps>,
  };
}
```

### 步骤 8：更新 CodeBlock 组件

```typescript
// frontend/src/components/mdx/components/code-block.tsx
// 在组件内部处理 Mermaid 判断逻辑

import React from "react";
import { MermaidDiagram } from "./mermaid-diagram";
import { CopyButton } from "../utils/copy-button";
// ... 其他导入

export function CodeBlock(props: React.ComponentPropsWithoutRef<"pre">) {
  // 提取 code 标签
  const childrenArray = React.Children.toArray(props.children);
  const child = childrenArray[0];

  if (React.isValidElement(child) && child.type === "code") {
    const code = child.props.children;
    const className = child.props.className || "";
    const lang = className.replace("language-", "");

    // 判断是 Mermaid 还是普通代码
    if (lang === "mermaid") {
      return <MermaidDiagram code={code} />;
    }

    // 普通代码高亮
    return (
      <div className="relative">
        <pre className={className}>
          <code>{code}</code>
        </pre>
        <CopyButton code={code} />
      </div>
    );
  }

  return <pre {...props} />;
}
```

## ✅ 重构后的目录结构

```
components/
├── post/
│   ├── views/
│   │   ├── post-detail-view.tsx
│   │   ├── post-list-view.tsx
│   │   └── post-card.tsx
│   ├── content/
│   │   ├── post-content.tsx
│   │   ├── post-content-styles.ts
│   │   └── renderers/
│   │       ├── html-renderer.tsx
│   │       ├── mdx-server-renderer.tsx
│   │       └── mdx-client-renderer.tsx
│   └── components/
│       └── post-meta.tsx
│
└── mdx/
    ├── registry/
    │   └── mdx-components.tsx
    ├── components/
    │   ├── code-block.tsx
    │   ├── mermaid-diagram.tsx
    │   ├── interactive-button.tsx
    │   ├── katex-math.tsx
    │   └── custom-components.tsx
    └── utils/
        ├── copy-button.tsx
        └── table-of-contents.tsx
```

## 🎯 核心改进

1. **post/ 模块**：按职责分层（views/content/components）
2. **mdx/ 模块**：按职责分离（registry/components/utils）
3. **命名清晰**：html-renderer 而不是 post-content-server
4. **职责单一**：注册层只做映射，组件层处理逻辑

## 📝 验证步骤

重构完成后，运行以下命令验证：

```bash
# 检查类型错误
npm run type-check

# 运行开发服务器
npm run dev

# 访问文章页面，确保渲染正常
```

## ⚠️ 注意事项

1. 一次只移动一个文件，立即更新导入路径
2. 移动后立即测试，确保没有破坏功能
3. 使用 IDE 的"查找所有引用"功能，确保没有遗漏
4. 提交前运行完整的测试套件

## 🎯 核心改进总结

### 1. 清晰的目录结构

**post/ 模块**：

```
views/      → 页面级组件（组合）
content/    → 内容渲染（路由 + 渲染器）
components/ → 原子组件（复用）
```

**mdx/ 模块**：

```
registry/   → 组件注册（只做映射）
components/ → MDX 组件（业务逻辑）
utils/      → 工具组件（辅助功能）
```

### 2. 职责单一原则

- **注册层**：只做组件映射，不包含业务逻辑
- **组件层**：处理具体的渲染逻辑和判断
- **入口层**：只做路由判断，不包含渲染逻辑

### 3. 命名准确

- `html-renderer.tsx` 而不是 `post-content-server.tsx`
- `mdx-server-renderer.tsx` 明确表示 MDX 服务端渲染
- `mdx-client-renderer.tsx` 明确表示 MDX 客户端渲染

### 4. 避免代码重复

- 提取 `post-content-styles.ts` 统一管理样式
- `CodeBlock` 内部处理 Mermaid 判断，避免在注册层重复

## 📝 后续维护建议

### 添加新功能

1. **添加新的 MDX 组件**：

   - 在 `mdx/components/` 创建组件
   - 在 `mdx/registry/mdx-components.tsx` 注册
   - 保持注册层简洁（一行代码）

2. **添加新的渲染器**：

   - 在 `post/content/renderers/` 创建渲染器
   - 在 `post/content/post-content.tsx` 添加路由逻辑
   - 更新 README 文档

3. **添加新的视图组件**：
   - 在 `post/views/` 创建组件
   - 组合现有的原子组件
   - 在页面中使用

### 修改现有功能

1. **修改渲染逻辑**：

   - 只修改对应的渲染器文件
   - 不要在入口文件中添加逻辑

2. **修改组件行为**：

   - 在组件内部修改
   - 不要在注册层添加逻辑

3. **修改样式**：
   - 修改 `post-content-styles.ts`
   - 或在具体组件中修改

## ⚠️ 注意事项

1. **保持注册层简洁**：`mdx-components.tsx` 只做映射
2. **职责单一**：每个文件只做一件事
3. **命名准确**：文件名要准确反映其职责
4. **避免重复**：提取共享逻辑和样式
5. **文档同步**：修改后更新 README

---

**重构完成时间**：2025-01-15
**架构版本**：v2.0
