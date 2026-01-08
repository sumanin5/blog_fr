# MDX 使用指南

## 🎯 快速访问

访问 MDX 功能展示页面：

```
http://localhost:5173/mdx-showcase
```

或者从首页点击 "MDX 展示" 按钮。

---

## 📝 创建 MDX 文件

### 1. 基础 MDX 文件

在 `src/content/` 目录下创建 `.mdx` 文件：

```mdx
# 我的第一篇 MDX 文章

这是一段普通的 Markdown 文本。

## 使用 React 组件

import { Button } from "@/components/ui/button";

<Button>点击我</Button>
```

### 2. 带元数据的 MDX 文件

```mdx
export const metadata = {
  title: "文章标题",
  author: "作者名",
  date: "2024-12-08",
};

# {metadata.title}

作者：{metadata.author}
```

---

## 🎨 支持的 Markdown 语法

### 标题（H1-H6）

```markdown
# 一级标题

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题
```

### 文本样式

```markdown
**粗体**
_斜体_
**_粗斜体_**
~~删除线~~
`内联代码`
```

### 列表

```markdown
- 无序列表项 1
- 无序列表项 2
  - 嵌套项

1. 有序列表项 1
2. 有序列表项 2

- [ ] 待办事项
- [x] 已完成事项
```

### 链接和图片

```markdown
[链接文本](https://example.com)
![图片描述](image-url.jpg)
```

### 代码块

````markdown
```javascript
const hello = "world";
console.log(hello);
```
````

### 引用

```markdown
> 这是一段引用文本
> 可以有多行
```

### 表格

```markdown
| 列1   | 列2   | 列3   |
| ----- | ----- | ----- |
| 数据1 | 数据2 | 数据3 |
```

### 分隔线

```markdown
---
```

---

## 🧩 使用 React 组件

### 导入组件

```mdx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
```

### 使用组件

```mdx
<Button>默认按钮</Button>
<Button variant="outline">轮廓按钮</Button>

<Card>
  <CardContent className="p-6">
    <h3>卡片标题</h3>
    <p>卡片内容</p>
  </CardContent>
</Card>
```

### 组件中使用 Markdown

```mdx
<Card>
  <CardContent className="p-6">

    ## 这是 Markdown 标题

    这是 **粗体** 文本。

  </CardContent>
</Card>
```

---

## 🔧 高级功能

### 1. 定义和使用变量

```mdx
export const siteName = "我的博客";
export const version = "1.0.0";

欢迎来到 {siteName}，当前版本：{version}
```

### 2. 定义和使用组件

```mdx
export function Greeting({ name }) {
  return <div>你好，{name}！</div>;
}

<Greeting name="张三" />
<Greeting name="李四" />
```

### 3. 条件渲染

```mdx
export const showWarning = true;

{showWarning && (

  <Alert>
    <div>⚠️ 这是一个警告信息</div>
  </Alert>
)}
```

### 4. 循环渲染

```mdx
export const items = ["项目1", "项目2", "项目3"];

<ul>
  {items.map((item, index) => (
    <li key={index}>{item}</li>
  ))}
</ul>
```

### 5. 使用 JavaScript 表达式

```mdx
当前时间：{new Date().toLocaleString()}

随机数：{Math.random().toFixed(2)}

计算结果：{2 + 2}
```

---

## 📦 创建 MDX 页面

### 1. 创建 MDX 文件

`src/content/my-article.mdx`

```mdx
# 我的文章

这是文章内容。
```

### 2. 创建页面组件

`src/pages/MyArticle.tsx`

```tsx
import { MDXProvider } from "@/components/mdx";
import Content from "@/content/my-article.mdx";

export default function MyArticle() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MDXProvider>
        <Content />
      </MDXProvider>
    </div>
  );
}
```

### 3. 添加路由

`src/routes/AppRoutes.tsx`

```tsx
import MyArticle from "@/pages/MyArticle";

<Route path="my-article" element={<MyArticle />} />;
```

---

## 🎨 自定义样式

### 修改 MDX 组件样式

编辑 `src/components/mdx/MDXProvider.tsx`：

```tsx
const components = {
  h1: ({ children }) => (
    <h1 className="text-primary text-5xl font-bold">{children}</h1>
  ),
  // ... 其他组件
};
```

### 使用 Tailwind 类名

```mdx
<div className="bg-primary rounded-lg p-4 text-white">自定义样式的内容</div>
```

### 使用内联样式

```mdx
<div
  style={{
    background: "linear-gradient(to right, #667eea, #764ba2)",
    padding: "20px",
    borderRadius: "8px",
  }}
>
  渐变背景
</div>
```

---

## 🔍 调试技巧

### 1. 查看编译后的代码

在浏览器开发者工具中查看 MDX 文件编译后的 JavaScript 代码。

### 2. 使用 console.log

```mdx
export const debug = console.log("MDX 文件已加载");

{console.log("渲染时执行")}
```

### 3. 检查导入路径

确保组件导入路径正确：

```mdx
// ✅ 正确
import { Button } from "@/components/ui/button";

// ❌ 错误
import { Button } from "components/ui/button";
```

---

## 📚 实用示例

### 示例 1：文档页面

```mdx
import { Alert } from "@/components/ui/alert";

# API 文档

## 安装

\`\`\`bash
npm install my-package
\`\`\`

<Alert className="my-4">
  <div>💡 提示：需要 Node.js 18+</div>
</Alert>

## 使用方法

\`\`\`javascript
import { myFunction } from 'my-package';

myFunction();
\`\`\`
```

### 示例 2：博客文章

```mdx
export const metadata = {
  title: "React 19 新特性",
  date: "2024-12-08",
  tags: ["React", "JavaScript"],
};

# {metadata.title}

发布于 {metadata.date}

标签：{metadata.tags.join(", ")}

## 简介

React 19 带来了许多激动人心的新特性...
```

### 示例 3：交互式教程

```mdx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

# 交互式教程

export function Counter() {
  const [count, setCount] = React.useState(0);

return (
<Card className="p-4">
<div className="flex items-center gap-4">
<Button onClick={() => setCount(count - 1)}>-</Button>
<span className="text-2xl font-bold">{count}</span>
<Button onClick={() => setCount(count + 1)}>+</Button>
</div>
</Card>
);
}

试试这个计数器：

<Counter />
```

---

## 🚨 常见问题

### Q: MDX 文件导入报错？

**A:** 确保：

1. `vite.config.ts` 中配置了 MDX 插件
2. `src/types/mdx.d.ts` 类型声明文件存在
3. 重启开发服务器

### Q: 组件样式不生效？

**A:** 确保用 `<MDXProvider>` 包裹 MDX 内容。

### Q: 无法使用 import？

**A:** MDX 支持 ES6 import，确保路径正确。

### Q: 如何添加代码高亮？

**A:** 安装 `rehype-highlight` 插件：

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

---

## 🔗 相关资源

- [MDX 官方文档](https://mdxjs.com/)
- [MDX Playground](https://mdxjs.com/playground/)
- [Remark 插件](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [Rehype 插件](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)

---

## 🎯 最佳实践

1. **文件组织**
   - 将 MDX 文件放在 `src/content/` 目录
   - 按类型分类（blog、docs、pages 等）

2. **组件复用**
   - 创建可复用的 MDX 组件
   - 使用 export 导出供其他文件使用

3. **性能优化**
   - 避免在 MDX 中进行复杂计算
   - 大型组件考虑懒加载

4. **可维护性**
   - 添加清晰的注释
   - 使用有意义的变量名
   - 保持 MDX 文件简洁

---

**最后更新：** 2024-12-08
