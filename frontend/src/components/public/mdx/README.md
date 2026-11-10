# MDX 组件模块

MDX 内容渲染的组件和工具集合。

## 📁 目录结构

```
mdx/
├── registry/           # 组件注册中心
│   └── mdx-components.tsx
├── components/         # MDX 组件实现
│   ├── code-block.tsx
│   ├── mermaid-diagram.tsx
│   ├── interactive-button.tsx
│   ├── tanstack-chart.tsx
│   ├── katex-math.tsx
│   └── custom-components.tsx
└── utils/              # 工具组件
    ├── copy-button.tsx
    └── table-of-contents.tsx
```

## 🎯 架构原则

### 1. 注册层只做映射

`registry/mdx-components.tsx` 只负责：

- 将 HTML 标签映射到 React 组件
- 不包含业务逻辑
- 保持简洁清晰

```typescript
// ✅ 正确：只做映射
pre: CodeBlock as React.ComponentType<ComponentProps>;

// ❌ 错误：包含业务逻辑
pre: (props) => {
  // 判断 Mermaid...
  // 提取代码...
};
```

### 2. 组件层处理逻辑

`components/` 中的组件负责：

- 处理具体的渲染逻辑
- 判断不同的渲染模式
- 管理组件状态

```typescript
// CodeBlock 内部处理 Mermaid 判断
export function CodeBlock(props) {
  const { code, language } = extractCodeInfo(props.children);

  if (language === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  // 普通代码高亮...
}
```

### 3. 工具层提供辅助

`utils/` 中的组件：

- 提供可复用的 UI 组件
- 不依赖 MDX 特定逻辑
- 可以在其他地方使用

## 📦 组件说明

### registry/mdx-components.tsx

MDX 组件注册中心，为 `next-mdx-remote` 提供组件映射。

**导出**：

- `createMdxComponents()` - 创建组件映射表

**使用**：

```typescript
import { createMdxComponents } from "@/components/mdx/registry/mdx-components";

<MDXRemote source={mdx} components={createMdxComponents()} />;
```

### components/code-block.tsx

代码块渲染组件，自动判断 Mermaid 图表和普通代码。

**功能**：

- 提取 `pre > code` 的内容和语言
- 判断是否为 Mermaid 图表
- 使用 `@tanstack/highlight` 渲染语法高亮
- 集成复制按钮

> MDX 只是兼容链路；普通文章正文由 `@tanstack/markdown` 渲染，两者共用同一套代码高亮 tokenizer。

### components/mermaid-diagram.tsx

Mermaid 图表渲染组件（客户端组件）。

**Props**：

- `code: string` - Mermaid 图表代码

### components/interactive-button.tsx

交互式按钮组件（客户端组件）。

**Props**：

- `message?: string` - 点击后显示的消息
- `children: React.ReactNode` - 按钮文本

### components/tanstack-chart.tsx

TanStack Charts 示例组件（客户端组件）。

**Props**：

- `initialDataset?: "pipeline" | "reading"` - 初始数据集
- `className?: string` - 外层样式

**MDX 用法**：

```mdx
<TanStackChart />

<TanStackChart initialDataset="reading" />
```

图表支持 tooltip、点击选中和数据集切换，用于验证 MDX 自定义组件的 hydration 与交互。

### components/katex-math.tsx

数学公式渲染组件。

**Props**：

- `latex: string` - LaTeX 公式
- `isBlock?: boolean` - 是否为块级公式

### utils/copy-button.tsx

代码复制按钮（客户端组件）。

**Props**：

- `code: string` - 要复制的代码

### utils/table-of-contents.tsx

文章目录组件（客户端组件）。

**Props**：

- `toc: TocItem[]` - 目录项数组

## 🔄 使用流程

### 服务端渲染

```typescript
import { MDXRemote } from "next-mdx-remote/rsc";
import { createMdxComponents } from "@/components/mdx/registry/mdx-components";

export async function MdxServerRenderer({ mdx }) {
  return <MDXRemote source={mdx} components={createMdxComponents()} />;
}
```

### 客户端渲染

```typescript
"use client";
import { MDXRemote } from "next-mdx-remote";
import { createMdxComponents } from "@/components/mdx/registry/mdx-components";

export function MdxClientRenderer({ mdxSource }) {
  return <MDXRemote {...mdxSource} components={createMdxComponents()} />;
}
```

## 🎨 自定义组件

### 添加新组件

1. 在 `components/` 创建组件文件
2. 在 `registry/mdx-components.tsx` 注册
3. 更新此 README

### 示例：添加 Alert 组件

```typescript
// 1. 创建 components/alert.tsx
export function Alert({ type, children }) {
  return <div className={`alert-${type}`}>{children}</div>;
}

// 2. 在 registry/mdx-components.tsx 注册
import { Alert } from "../components/alert";

export function createMdxComponents() {
  return {
    // ...
    Alert: Alert as React.ComponentType<ComponentProps>,
  };
}

// 3. 在 MDX 中使用
<Alert type="info">这是一条提示</Alert>;
```

## 🔧 维护指南

### 修改组件逻辑

- 只修改 `components/` 中的文件
- 不要在 `registry/` 中添加业务逻辑

### 修改组件映射

- 只修改 `registry/mdx-components.tsx`
- 保持映射简洁（一行代码）

### 添加工具组件

- 在 `utils/` 创建新文件
- 确保组件可复用
- 更新此 README
