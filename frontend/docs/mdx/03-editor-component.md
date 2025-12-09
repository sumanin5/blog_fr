# MDX 编辑器组件实现

## 架构概述

MDX 在线编辑器采用左右分屏布局：

- 左侧：代码编辑区（textarea）
- 右侧：实时预览区（编译后的 React 组件）

```
┌─────────────────────────────────────────────┐
│                  工具栏                      │
├─────────────────────┬───────────────────────┤
│                     │                       │
│     📝 编辑器       │      👁️ 预览          │
│                     │                       │
│   (textarea)        │   (React 组件)        │
│                     │                       │
├─────────────────────┴───────────────────────┤
│                  状态栏                      │
└─────────────────────────────────────────────┘
```

## 核心实现

### 1. 状态管理

```tsx
const [mdxCode, setMdxCode] = useState(DEFAULT_MDX); // 源代码
const [compiledMDX, setCompiledMDX] = useState(null); // 编译结果
const [error, setError] = useState<string | null>(null); // 错误信息
const [isCompiling, setIsCompiling] = useState(false); // 编译状态
```

### 2. MDX 编译函数

使用 `@mdx-js/mdx` 的 `evaluate` 函数在浏览器端编译 MDX：

```tsx
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const compileMDX = async (code: string) => {
  try {
    const result = await evaluate(code, {
      // JSX 运行时（React 18+）
      ...runtime,

      // 开发模式关闭以提高性能
      development: false,

      // remark 插件：处理 Markdown 扩展语法
      remarkPlugins: [
        remarkGfm, // GFM：表格、删除线、任务列表
        remarkMath, // 数学公式语法
      ],

      // rehype 插件：处理 HTML 转换
      rehypePlugins: [
        rehypeKatex, // 数学公式渲染
      ],

      // 组件映射：提供可用的组件
      useMDXComponents: () => ({
        // Markdown 元素组件
        h1: ({ children }) => <h1 className="...">{children}</h1>,
        // ...

        // UI 组件
        Button,
        Card,
        Alert,
      }),
    });

    return result;
  } catch (err) {
    throw err;
  }
};
```

### 3. 防抖处理

避免每次按键都触发编译，使用防抖优化性能：

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    compileMDX(mdxCode);
  }, 500); // 500ms 防抖

  return () => clearTimeout(timer);
}, [mdxCode]);
```

### 4. 渲染编译结果

```tsx
{
  compiledMDX ? (
    <article className="max-w-none">
      <compiledMDX.default />
    </article>
  ) : (
    <LoadingSpinner />
  );
}
```

## 完整组件代码

```tsx
import { useState, useEffect, useCallback } from "react";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Markdown 元素组件映射
const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-4xl font-bold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-4 text-3xl font-bold">{children}</h2>
  ),
  p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
  // ... 更多组件
};

// 默认模板
const DEFAULT_MDX = String.raw`# Hello MDX

这是一个 **MDX** 编辑器！

<Button>点击我</Button>
`;

export default function MDXEditor() {
  const [mdxCode, setMdxCode] = useState(DEFAULT_MDX);
  const [compiledMDX, setCompiledMDX] = useState(null);
  const [error, setError] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const compileMDX = useCallback(async (code) => {
    setIsCompiling(true);
    setError(null);

    try {
      const result = await evaluate(code, {
        ...runtime,
        development: false,
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
        useMDXComponents: () => ({
          ...markdownComponents,
          Button,
          Card,
          Alert,
        }),
      });
      setCompiledMDX(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // 防抖编译
  useEffect(() => {
    const timer = setTimeout(() => compileMDX(mdxCode), 500);
    return () => clearTimeout(timer);
  }, [mdxCode, compileMDX]);

  return (
    <div className="flex h-screen">
      {/* 编辑器 */}
      <div className="flex-1 border-r">
        <textarea
          value={mdxCode}
          onChange={(e) => setMdxCode(e.target.value)}
          className="h-full w-full resize-none p-4 font-mono"
        />
      </div>

      {/* 预览 */}
      <div className="flex-1 overflow-auto p-8">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : compiledMDX ? (
          <compiledMDX.default />
        ) : (
          <div>编译中...</div>
        )}
      </div>
    </div>
  );
}
```

## 功能扩展

### 1. 添加语法高亮编辑器

使用 CodeMirror 或 Monaco Editor 替代 textarea：

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

<CodeMirror
  value={mdxCode}
  onChange={setMdxCode}
  extensions={[markdown()]}
  theme="dark"
/>;
```

### 2. 添加工具栏

```tsx
const insertText = (text: string) => {
  // 在光标位置插入文本
};

<div className="toolbar">
  <button onClick={() => insertText("**粗体**")}>B</button>
  <button onClick={() => insertText("*斜体*")}>I</button>
  <button onClick={() => insertText("`代码`")}>Code</button>
  <button onClick={() => insertText("$$\n公式\n$$")}>Math</button>
</div>;
```

### 3. 保存到本地存储

```tsx
// 自动保存
useEffect(() => {
  localStorage.setItem("mdx-draft", mdxCode);
}, [mdxCode]);

// 恢复草稿
useEffect(() => {
  const draft = localStorage.getItem("mdx-draft");
  if (draft) setMdxCode(draft);
}, []);
```

### 4. 导出功能

```tsx
const handleExport = (format: "mdx" | "html") => {
  if (format === "mdx") {
    downloadFile(mdxCode, "document.mdx", "text/markdown");
  } else {
    // 导出渲染后的 HTML
    const html = document.querySelector(".preview").innerHTML;
    downloadFile(html, "document.html", "text/html");
  }
};
```
