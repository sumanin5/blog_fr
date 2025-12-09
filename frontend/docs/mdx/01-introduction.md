# MDX 介绍

## 什么是 MDX？

MDX 是 Markdown 的超集，允许你在 Markdown 文档中直接使用 JSX（React 组件）。

```mdx
# 我的文章

这是普通的 Markdown 文本。

<Button onClick={() => alert("Hello!")}>点击我</Button>

继续写 Markdown...
```

## 为什么要用 MDX？

### 1. 内容与交互的完美结合

传统 Markdown 只能展示静态内容，而 MDX 可以：

```mdx
## 交互式代码演示

<CodePlayground code="console.log('Hello')" />

## 实时数据展示

<LiveChart data={stockData} />
```

### 2. 组件复用

在多篇文章中复用相同的 UI 组件：

```mdx
<Callout type="warning">这是一个警告提示框，可以在任何文章中使用</Callout>

<AuthorCard name="张三" avatar="/avatar.jpg" />
```

### 3. 类型安全

MDX 支持 TypeScript，组件的 props 有类型检查：

```tsx
// 定义组件
interface CalloutProps {
  type: "info" | "warning" | "error";
  children: React.ReactNode;
}

// 在 MDX 中使用时会有类型提示
<Callout type="info">提示内容</Callout>;
```

### 4. 适用场景

| 场景     | 说明                 |
| -------- | -------------------- |
| 技术博客 | 嵌入可运行的代码示例 |
| 产品文档 | 交互式 API 演示      |
| 教程     | 步骤引导、进度追踪   |
| 作品集   | 动态展示项目         |
| 营销页面 | 动画、表单、CTA 按钮 |

## MDX vs 其他方案

| 方案                 | 优点       | 缺点                |
| -------------------- | ---------- | ------------------- |
| **纯 Markdown**      | 简单、通用 | 无法交互            |
| **HTML in Markdown** | 灵活       | 无法使用 React 状态 |
| **纯 React**         | 完全控制   | 写文章太繁琐        |
| **MDX**              | 两全其美   | 学习成本稍高        |

## 核心概念

### 1. 组件映射

可以自定义 Markdown 元素的渲染方式：

```tsx
const components = {
  h1: (props) => <h1 className="text-4xl font-bold" {...props} />,
  code: (props) => <SyntaxHighlighter {...props} />,
  a: (props) => <Link {...props} />,
};
```

### 2. 布局组件

为所有 MDX 页面提供统一布局：

```tsx
// 在 MDX 文件中
export default function Layout({ children }) {
  return <article className="prose">{children}</article>;
}
```

### 3. 导出数据

MDX 文件可以导出元数据：

```mdx
export const meta = {
  title: "我的文章",
  date: "2024-01-01",
  tags: ["React", "MDX"],
};

# {meta.title}

发布于 {meta.date}
```

## 在本项目中的使用

本项目已配置好 MDX 支持：

1. **静态 MDX 文件**：放在 `src/content/` 目录，通过 Vite 插件编译
2. **在线编辑器**：访问 `/mdx-editor`，实时编辑和预览
3. **组件映射**：在 `src/components/mdx/MDXProvider.tsx` 中定义

## 相关资源

- [MDX 官方文档](https://mdxjs.com/)
- [MDX Playground](https://mdxjs.com/playground/)
- [@mdx-js/react](https://www.npmjs.com/package/@mdx-js/react)
