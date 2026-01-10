"use client";

import { PostContent } from "@/components/post/post-content";
import { TableOfContents } from "@/components/mdx/table-of-contents";

// 模拟一段后端返回的 HTML 内容
// 这里包含了：
// 1. H1, H2 标题（用于测试目录生成）
// 2. 一个 TSX 代码块（被 highlight.js 处理后的 HTML 结构）
// 3. 一个 React 组件风格的交互演示（实际上是 HTML 结构，看 PostContent 是否能处理）
const mockHtmlContent = `
<h1 id="tsx-rendering-test">TSX 渲染与代码高亮测试</h1>

<p>本文用于测试 <code>PostContent</code> 组件对 TSX 代码块的处理能力。</p>

<h2 id="tsx-code-block">1. TSX 代码块高亮</h2>

<p>下面是一个标准的 React 组件代码：</p>

<pre><code class="language-tsx">import React, { useState } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const CustomButton: React.FC<ButtonProps> = ({ label, onClick }) => {
  const [count, setCount] = useState(0);

  return (
    <button
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      onClick={() => {
        setCount(c => c + 1);
        onClick();
      }}
    >
      {label} - Clicks: {count}
    </button>
  );
};
</code></pre>

<h2 id="complex-structure">2. 复杂结构测试</h2>

<p>测试包含泛型的 TypeScript 代码：</p>

<pre><code class="language-typescript">function identity<T>(arg: T): T {
    console.log("Type is generic");
    return arg;
}
</code></pre>

<h2 id="component-mock">3. 模拟组件渲染</h2>
<p>如果后端支持 MDX 编译，这里可能会出现自定义组件。但目前我们是 HTML 解析模式。</p>
<div class="p-4 border border-dashed rounded bg-muted/50">
  <p class="text-center text-muted-foreground">这里是一个普通的 Div 容器</p>
</div>
`;

// 手动构造 TOC 数据
const mockToc = [
  { id: "tsx-rendering-test", title: "TSX 渲染与代码高亮测试", level: 1 },
  { id: "tsx-code-block", title: "1. TSX 代码块高亮", level: 2 },
  { id: "complex-structure", title: "2. 复杂结构测试", level: 2 },
  { id: "component-mock", title: "3. 模拟组件渲染", level: 2 },
];

export default function TestMdxPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 目录组件 */}
      <TableOfContents toc={mockToc} />

      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">TSX & MDX 测试实验室</h1>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          {/* 核心测试对象 */}
          <PostContent html={mockHtmlContent} />
        </div>
      </div>
    </div>
  );
}
