# MDX Import 的真相：构建时 vs 运行时

## 核心误解

很多人认为：

- ❌ "在 Nginx 部署的纯前端项目中不能使用 `import`"
- ❌ "只有 Next.js 或有 Node.js 服务器才能用 `import`"
- ❌ "浏览器不支持 `import`，所以前端不能用"

**真相是：在我们的项目中完全可以使用 `import`！**

## 关键概念：构建时 vs 运行时

### 构建时（Build Time）

**发生在：** 你的开发机器或 CI/CD 服务器上

**工具：** Vite、Webpack、Rollup 等打包工具（运行在 Node.js 上）

**过程：**

```bash
# 你运行这个命令
npm run build

# Vite 做了什么？
1. 读取所有源代码文件
2. 解析所有 import 语句
3. 找到对应的文件
4. 合并、转换、压缩代码
5. 输出静态文件到 dist/ 目录
```

**输入（源代码）：**

```tsx
// src/App.tsx
import React from "react";
import Header from "./Header";
import "./App.css";

function App() {
  return <Header />;
}
```

**输出（构建产物）：**

```javascript
// dist/assets/index-abc123.js
// 所有代码已经合并，没有 import 语句了！
(function () {
  // React 代码
  // Header 代码
  // App 代码
  // 全部打包在一起
})();
```

### 运行时（Runtime）

**发生在：** 用户的浏览器中

**环境：** Nginx 提供静态文件，浏览器执行 JavaScript

**过程：**

```
用户访问 -> Nginx 返回 index.html
         -> 浏览器下载 index-abc123.js
         -> 浏览器执行（已经没有 import 了）
```

## 两种 MDX 使用场景

### 场景 A：静态 MDX 文件（✅ 完全支持 import）

**文件位置：** `src/content/my-post.mdx`

**使用方式：**

```mdx
---
title: 我的文章
---

import { Button } from "@/components/ui/button";
import Chart from "@/components/Chart";

# 我的文章

<Button>点击我</Button>

<Chart data={[1, 2, 3]} />
```

**构建过程：**

```
构建时：
  my-post.mdx
    ↓ (Vite MDX 插件处理)
  转换为 React 组件
    ↓ (Vite 打包)
  合并到 bundle.js

运行时：
  浏览器执行 bundle.js
  ✅ 所有 import 已经被解析
  ✅ 所有组件已经打包进去
```

**在我们的项目中：**

```tsx
// src/pages/BlogPost.tsx
import MyPost from "@/content/my-post.mdx"; // ✅ 可以这样 import

export default function BlogPost() {
  return <MyPost />; // ✅ 直接使用
}
```

**部署到 Nginx：**

- ✅ 完全没问题
- ✅ 不需要 Node.js 服务器
- ✅ 纯静态文件

### 场景 B：动态 MDX 内容（❌ 不支持 import）

**内容来源：** 后端 API、数据库、CMS

**使用方式：**

```tsx
// 从 API 获取 MDX 字符串
const mdxString = await fetch("/api/posts/123").then((r) => r.text());

// mdxString 内容：
// "# 标题\nimport Chart from './Chart'\n<Chart />"
```

**问题：**

```
运行时（浏览器中）：
  收到 MDX 字符串
    ↓ (需要编译)
  使用 @mdx-js/mdx 的 evaluate 函数
    ↓ (遇到 import 语句)
  ❌ 浏览器不知道 './Chart' 在哪里
  ❌ 没有文件系统访问权限
  ❌ 无法动态加载模块
```

**解决方案：组件预注册**

```tsx
import { evaluate } from "@mdx-js/mdx";
import Chart from "@/components/Chart"; // ✅ 在 React 代码中 import

// MDX 字符串中不能有 import
const mdxString = `
# 标题
<Chart data={[1, 2, 3]} />
`;

// 通过 useMDXComponents 提供组件
const result = await evaluate(mdxString, {
  useMDXComponents: () => ({
    Chart, // ✅ 预先提供组件
  }),
});
```

## 在我们项目中的应用

### 1. 静态 MDX 文件（推荐）

**适用场景：**

- 博客文章
- 文档页面
- 固定内容页面

**实现方式：**

```tsx
// vite.config.ts
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  ],
});
```

```mdx
<!-- src/content/blog/my-post.mdx -->

import { Button } from "@/components/ui/button";

# 我的文章

<Button>点击我</Button>
```

```tsx
// src/pages/BlogPost.tsx
import MyPost from "@/content/blog/my-post.mdx";

export default function BlogPost() {
  return <MyPost />;
}
```

**部署：**

- `npm run build` 生成静态文件
- 上传到 Nginx
- ✅ 完美运行

### 2. 在线编辑器（动态编译）

**适用场景：**

- MDX 在线编辑器
- 用户生成内容
- 实时预览

**实现方式：**

```tsx
// src/pages/MDXEditor.tsx
import { evaluate } from "@mdx-js/mdx";
import { Button } from "@/components/ui/button";
import { Chart } from "@/components/Chart";

const compileMDX = async (code: string) => {
  const result = await evaluate(code, {
    useMDXComponents: () => ({
      // ✅ 预先 import 并提供组件
      Button,
      Chart,
      // 不能在 MDX 字符串中 import
    }),
  });
  return result;
};
```

**限制：**

- ❌ MDX 字符串中不能写 `import` 语句
- ✅ 但可以直接使用预注册的组件

## 常见问题

### Q1: 为什么静态 MDX 可以用 import？

**A:** 因为构建时 Vite 会处理所有 import：

```
开发时：
  你写 import Chart from './Chart'
    ↓
构建时：
  Vite 找到 Chart.tsx
  编译并打包到一起
    ↓
运行时：
  浏览器执行打包后的代码
  没有 import 语句了
```

### Q2: 为什么动态 MDX 不能用 import？

**A:** 因为浏览器没有文件系统：

```
运行时：
  浏览器收到字符串 "import Chart from './Chart'"
  浏览器：我去哪里找 './Chart'？
  浏览器：我没有文件系统访问权限！
  ❌ 失败
```

### Q3: Next.js 有什么特殊的？

**A:** Next.js 的特殊之处在于 SSR（服务端渲染）：

```
传统 React (SPA):
  构建时：所有代码打包
  运行时：浏览器执行
  部署：Nginx 静态文件

Next.js (SSR):
  构建时：生成服务端代码
  运行时：Node.js 服务器执行
  部署：需要 Node.js 服务器
```

但是！Next.js 也可以导出静态站点（`next export`），这时候和普通 React 一样，可以部署到 Nginx。

### Q4: 我们的项目能用 import 吗？

**A:** 完全可以！

**静态 MDX 文件：**

```mdx
<!-- ✅ 可以 -->

import { Button } from '@/components/ui/button';
<Button>点击</Button>
```

**在线编辑器：**

```tsx
// ✅ 在 React 代码中 import
import { Button } from "@/components/ui/button";

// ❌ 在 MDX 字符串中不能 import
const mdx = "import Button from './Button'"; // 不行

// ✅ 通过组件映射提供
useMDXComponents: () => ({ Button });
```

## 总结

| 场景            | Import 支持 | 原因           | 部署方式            |
| --------------- | ----------- | -------------- | ------------------- |
| 静态 MDX 文件   | ✅ 完全支持 | 构建时处理     | Nginx 静态部署      |
| 动态 MDX 字符串 | ❌ 不支持   | 运行时无法解析 | Nginx 静态部署      |
| Next.js SSR     | ✅ 完全支持 | 服务端处理     | 需要 Node.js 服务器 |

**关键理解：**

1. **构建时的 import** = 打包工具处理 = ✅ Nginx 可以部署
2. **运行时的 import** = 浏览器处理 = ❌ 需要特殊处理
3. **我们的项目** = 构建时处理 = ✅ 完全支持 import

**实践建议：**

- 博客文章、文档 → 使用静态 MDX 文件（支持 import）
- 在线编辑器 → 使用组件预注册（不支持 import）
- 两种方式都可以部署到 Nginx，不需要 Node.js 服务器
