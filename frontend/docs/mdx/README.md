# MDX 文档

本目录包含 MDX 相关的完整文档，帮助你理解和使用 MDX。

## 文档目录

| 文件                                                         | 内容                               |
| ------------------------------------------------------------ | ---------------------------------- |
| [01-introduction.md](./01-introduction.md)                   | MDX 介绍、为什么使用 MDX、核心概念 |
| [02-rendering-and-styling.md](./02-rendering-and-styling.md) | 常见渲染错误、样式配置、组件映射   |
| [03-editor-component.md](./03-editor-component.md)           | 在线编辑器组件实现、架构设计       |
| [04-math-formulas.md](./04-math-formulas.md)                 | 数学公式支持、KaTeX 配置、常用公式 |
| [05-import-and-components.md](./05-import-and-components.md) | Import 问题、组件注入、预置组件    |
| [06-interactive-features.md](./06-interactive-features.md)   | 交互式功能、动画效果、实用组件     |

## 快速开始

### 1. 访问在线编辑器

```
http://localhost:5173/mdx-editor
```

### 2. 查看 MDX 展示页面

```
http://localhost:5173/mdx-showcase
```

### 3. 创建静态 MDX 文件

在 `src/content/` 目录下创建 `.mdx` 文件：

```mdx
# 我的文章

这是 **MDX** 内容！

<Button>点击我</Button>
```

## 相关文件

- `src/pages/MDXEditor.tsx` - 在线编辑器组件
- `src/pages/MDXShowcase.tsx` - MDX 展示页面
- `src/components/mdx/MDXProvider.tsx` - 组件映射配置
- `src/content/mdx-showcase.mdx` - 示例 MDX 文件
- `vite.config.ts` - MDX 插件配置

## 依赖包

```json
{
  "@mdx-js/mdx": "^3.x",
  "@mdx-js/react": "^3.x",
  "@mdx-js/rollup": "^3.x",
  "remark-gfm": "^4.x",
  "remark-math": "^6.x",
  "rehype-katex": "^7.x",
  "katex": "^0.16.x"
}
```
