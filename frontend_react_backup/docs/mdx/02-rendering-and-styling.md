# MDX 渲染错误与样式配置

## 常见渲染错误

### 1. Markdown 元素没有样式

**问题现象**：标题、代码块、表格等只显示纯文本，没有样式。

**原因**：在使用 `evaluate` 动态编译 MDX 时，`useMDXComponents` 中没有提供 Markdown 元素的组件映射。

**错误示例**：

```tsx
// ❌ 只提供了 UI 组件，没有 Markdown 元素
useMDXComponents: () => ({
  Button,
  Card,
});
```

**正确示例**：

```tsx
// ✅ 同时提供 Markdown 元素组件和 UI 组件
const markdownComponents = {
  h1: ({ children }) => <h1 className="text-4xl font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="text-3xl font-bold">{children}</h2>,
  p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
  code: ({ children }) => (
    <code className="bg-muted rounded px-1">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted rounded-lg p-4">{children}</pre>
  ),
  table: ({ children }) => (
    <table className="border-collapse border">{children}</table>
  ),
  th: ({ children }) => (
    <th className="bg-muted border px-4 py-2">{children}</th>
  ),
  td: ({ children }) => <td className="border px-4 py-2">{children}</td>,
  // ... 更多元素
};

useMDXComponents: () => ({
  ...markdownComponents, // Markdown 元素
  Button,
  Card, // UI 组件
});
```

### 2. 表格不渲染

**问题现象**：表格语法 `| a | b |` 显示为纯文本。

**原因**：没有启用 GFM（GitHub Flavored Markdown）插件。

**解决方案**：

```tsx
import remarkGfm from "remark-gfm";

await evaluate(code, {
  remarkPlugins: [remarkGfm], // 添加 GFM 支持
  // ...
});
```

### 3. `=` 字符报错

**错误信息**：

```
Unexpected character `=` (U+003D) in name
```

**原因**：数学公式中的 `=` 被 MDX 解析器误认为是 JSX 属性语法。

**解决方案**：安装数学公式插件，让它在 MDX 解析之前处理公式：

```bash
npm install remark-math rehype-katex katex
```

```tsx
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

await evaluate(code, {
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [rehypeKatex],
});
```

### 4. MDX 插件顺序错误

**问题现象**：MDX 文件无法正确编译。

**原因**：在 Vite 配置中，MDX 插件必须在 React 插件之前。

**错误示例**：

```ts
// ❌ 错误顺序
plugins: [
  react(),
  mdx(), // MDX 在后面，无法正确处理
];
```

**正确示例**：

```ts
// ✅ 正确顺序
plugins: [
  mdx({
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
  }),
  react({ exclude: /\.mdx$/ }), // 排除 MDX 文件
];
```

## 样式配置

### 完整的组件映射

```tsx
const markdownComponents = {
  // 标题
  h1: ({ children }) => (
    <h1 className="text-foreground mt-8 mb-4 text-4xl font-bold tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-8 mb-4 border-b pb-2 text-3xl font-bold">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-foreground mt-6 mb-3 text-2xl font-semibold">
      {children}
    </h3>
  ),

  // 段落和文本
  p: ({ children }) => (
    <p className="text-foreground/90 mb-4 leading-7">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // 链接
  a: ({ children, ...props }) => (
    <a className="text-primary hover:text-primary/80 underline" {...props}>
      {children}
    </a>
  ),

  // 列表
  ul: ({ children }) => (
    <ul className="mb-4 list-inside list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-inside list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,

  // 引用
  blockquote: ({ children }) => (
    <blockquote className="border-primary/50 text-muted-foreground border-l-4 pl-4 italic">
      {children}
    </blockquote>
  ),

  // 代码
  code: ({ children }) => (
    <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-sm">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted my-4 overflow-x-auto rounded-lg p-4 font-mono text-sm">
      {children}
    </pre>
  ),

  // 表格
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="border-border w-full border-collapse border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-border border-b">{children}</tr>,
  th: ({ children }) => (
    <th className="border-border bg-muted border px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border border px-4 py-2">{children}</td>
  ),

  // 分隔线
  hr: () => <hr className="border-border my-8" />,

  // 图片
  img: (props) => (
    <img className="my-4 h-auto max-w-full rounded-lg" {...props} />
  ),
};
```

### 使用 Tailwind Typography 插件

另一种方案是使用 `@tailwindcss/typography` 插件：

```bash
npm install @tailwindcss/typography
```

```tsx
// 在渲染时添加 prose 类
<article className="prose prose-neutral dark:prose-invert max-w-none">
  <MDXContent />
</article>
```

这样可以自动为所有 Markdown 元素添加样式，无需手动定义每个组件。
