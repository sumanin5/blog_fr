# MDX 配置指南

## 📦 已安装的依赖

```json
{
  "@mdx-js/react": "^3.x",
  "@mdx-js/rollup": "^3.x"
}
```

## 🔧 配置说明

### Vite 配置

MDX 插件已在 `vite.config.ts` 中配置：

```typescript
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    mdx(), // 必须在 react() 之前
    react(),
    tailwindcss(),
  ],
});
```

### TypeScript 支持

类型声明文件位于 `src/types/mdx.d.ts`：

```typescript
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
```

---

## 📝 使用方法

### 1. 创建 MDX 文件

在 `src/content/` 目录下创建 `.mdx` 文件：

```mdx
# 我的文章

这是一段 **Markdown** 内容。

import { Button } from "@/components/ui/button";

<Button>点击我</Button>
```

### 2. 导入并使用

```tsx
import MyArticle from "@/content/my-article.mdx";
import { MDXProvider } from "@/components/mdx";

function ArticlePage() {
  return (
    <MDXProvider>
      <MyArticle />
    </MDXProvider>
  );
}
```

### 3. 自定义组件样式

编辑 `src/components/mdx/MDXProvider.tsx` 来自定义 Markdown 元素的样式：

```tsx
const components = {
  h1: ({ children }) => <h1 className="text-4xl font-bold">{children}</h1>,
  // ... 其他元素
};
```

---

## 🎨 在 MDX 中使用 React 组件

### 导入组件

```mdx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

# 我的文章

<Card className="my-4 p-4">
  <p>这是一个卡片组件！</p>
  <Button>点击</Button>
</Card>
```

### 导出变量

```mdx
export const metadata = {
  title: "我的文章",
  date: "2024-01-01",
  author: "作者名",
};

# {metadata.title}

发布于 {metadata.date}
```

### 使用导出的变量

```tsx
import Article, { metadata } from "@/content/article.mdx";

function Page() {
  return (
    <div>
      <h1>{metadata.title}</h1>
      <Article />
    </div>
  );
}
```

---

## 📁 推荐的目录结构

```
src/
├── content/           # MDX 内容文件
│   ├── blog/          # 博客文章
│   │   ├── post-1.mdx
│   │   └── post-2.mdx
│   └── docs/          # 文档
│       └── guide.mdx
├── components/
│   └── mdx/           # MDX 相关组件
│       ├── MDXProvider.tsx
│       └── index.ts
└── types/
    └── mdx.d.ts       # 类型声明
```

---

## 🔌 可选插件

### 代码高亮 (推荐)

```bash
npm install rehype-highlight
```

```typescript
// vite.config.ts
import rehypeHighlight from "rehype-highlight";

mdx({
  rehypePlugins: [rehypeHighlight],
});
```

### 自动生成目录

```bash
npm install remark-toc
```

```typescript
import remarkToc from "remark-toc";

mdx({
  remarkPlugins: [remarkToc],
});
```

### Frontmatter 支持

```bash
npm install remark-frontmatter remark-mdx-frontmatter
```

```typescript
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

mdx({
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
});
```

---

## 🚀 示例页面

查看示例：`src/pages/MDXExample.tsx`

添加路由后访问：`/mdx-example`

---

## 📚 相关资源

- [MDX 官方文档](https://mdxjs.com/)
- [@mdx-js/rollup](https://mdxjs.com/packages/rollup/)
- [Vite 插件配置](https://vitejs.dev/guide/using-plugins.html)

---

## ❓ 常见问题

### Q: MDX 文件导入报错？

确保：

1. `vite.config.ts` 中 MDX 插件在 React 插件之前
2. `src/types/mdx.d.ts` 类型声明文件存在
3. 重启开发服务器

### Q: 样式不生效？

确保用 `<MDXProvider>` 包裹 MDX 内容：

```tsx
<MDXProvider>
  <YourMDXContent />
</MDXProvider>
```

### Q: 如何添加代码高亮？

安装 `rehype-highlight` 并在 vite.config.ts 中配置。
