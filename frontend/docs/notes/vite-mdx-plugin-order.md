# Vite MDX 插件顺序问题

## 🐛 问题描述

### 错误信息

```
[plugin:vite:react-babel] Unexpected token (12:0)
# MDX 功能完整展示
^
```

### 原因分析

Vite 的插件是按顺序执行的。如果 React 插件在 MDX 插件之前处理了 `.mdx` 文件，Babel 会尝试将 Markdown 语法当作 JavaScript 解析，导致语法错误。

**错误的执行流程：**

```
.mdx 文件 → React 插件 (Babel) → ❌ 语法错误
            ↓
            尝试解析 "# 标题" 为 JavaScript
```

**正确的执行流程：**

```
.mdx 文件 → MDX 插件 → JSX 代码 → React 插件 → ✅ 成功
```

---

## ✅ 解决方案

### 方案 1：排除 MDX 文件（推荐）

让 React 插件忽略 `.mdx` 文件：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
    }),
    react({
      exclude: /\.mdx$/, // ✅ 排除 MDX 文件
    }),
    tailwindcss(),
  ],
});
```

### 方案 2：明确指定 React 插件处理的文件

```typescript
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
    }),
    react({
      include: /\.(jsx|js|tsx|ts)$/, // ✅ 只处理这些文件
    }),
    tailwindcss(),
  ],
});
```

---

## 🔍 插件顺序原理

### Vite 插件执行顺序

Vite 插件按照数组顺序执行：

```typescript
plugins: [
  plugin1, // 第一个执行
  plugin2, // 第二个执行
  plugin3, // 第三个执行
];
```

### MDX 处理流程

```
1. MDX 插件接收 .mdx 文件
   ↓
2. 将 Markdown 转换为 JSX
   ↓
3. React 插件接收 JSX 代码
   ↓
4. Babel 编译 JSX 为 JavaScript
   ↓
5. 输出最终代码
```

### 为什么顺序重要？

**正确顺序：**

```typescript
plugins: [
  mdx(), // 先处理 MDX → JSX
  react(), // 再处理 JSX → JS
];
```

**错误顺序：**

```typescript
plugins: [
  react(), // React 先处理，遇到 Markdown 语法报错
  mdx(), // MDX 永远收不到文件
];
```

---

## 📝 完整配置示例

### 基础配置

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    // 1. MDX 插件（第一个）
    mdx({
      providerImportSource: "@mdx-js/react",
    }),

    // 2. React 插件（第二个，排除 MDX）
    react({
      exclude: /\.mdx$/,
    }),

    // 3. Tailwind 插件（最后）
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 高级配置（带插件）

```typescript
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm], // Markdown 插件
      rehypePlugins: [rehypeHighlight], // HTML 插件
    }),
    react({
      exclude: /\.mdx$/,
    }),
    tailwindcss(),
  ],
});
```

---

## 🚨 常见错误

### 错误 1：React 插件包含了 MDX

```typescript
// ❌ 错误
react({
  include: /\.(jsx|js|mdx|md|tsx|ts)$/, // 包含了 .mdx
});
```

**结果：** React 插件会处理 MDX 文件，导致语法错误。

**修复：**

```typescript
// ✅ 正确
react({
  exclude: /\.mdx$/, // 排除 MDX
});
```

### 错误 2：插件顺序错误

```typescript
// ❌ 错误
plugins: [
  react(), // React 在前
  mdx(), // MDX 在后
];
```

**修复：**

```typescript
// ✅ 正确
plugins: [
  mdx(), // MDX 在前
  react(), // React 在后
];
```

### 错误 3：缺少 providerImportSource

```typescript
// ❌ 错误
mdx({
  // 缺少 providerImportSource
});
```

**结果：** MDX 不知道使用哪个 React 运行时。

**修复：**

```typescript
// ✅ 正确
mdx({
  providerImportSource: "@mdx-js/react",
});
```

---

## 🔧 调试技巧

### 1. 查看插件执行顺序

在 `vite.config.ts` 中添加日志：

```typescript
export default defineConfig({
  plugins: [
    {
      name: "debug-mdx",
      transform(code, id) {
        if (id.endsWith(".mdx")) {
          console.log("MDX 插件处理:", id);
        }
      },
    },
    mdx({
      providerImportSource: "@mdx-js/react",
    }),
    react({
      exclude: /\.mdx$/,
    }),
  ],
});
```

### 2. 检查文件扩展名

确保 MDX 文件使用 `.mdx` 扩展名，不是 `.md`。

### 3. 清除缓存

```bash
rm -rf node_modules/.vite
npm run dev
```

---

## 📊 插件配置对比

| 配置                                  | MDX 处理      | React 处理  | 结果      |
| ------------------------------------- | ------------- | ----------- | --------- |
| `react({ exclude: /\.mdx$/ })`        | ✅ MDX 插件   | ❌ 跳过     | ✅ 正确   |
| `react({ include: /\.(jsx\|tsx)$/ })` | ✅ MDX 插件   | ❌ 跳过     | ✅ 正确   |
| `react({ include: /\.mdx$/ })`        | ❌ React 插件 | ✅ 处理     | ❌ 错误   |
| 无配置                                | ⚠️ 可能冲突   | ⚠️ 可能冲突 | ⚠️ 不确定 |

---

## 🎯 最佳实践

### 1. 明确排除 MDX

始终在 React 插件中排除 MDX 文件：

```typescript
react({
  exclude: /\.mdx$/,
});
```

### 2. MDX 插件在前

确保 MDX 插件在 React 插件之前：

```typescript
plugins: [
  mdx(), // 第一
  react(), // 第二
];
```

### 3. 使用 TypeScript

添加类型声明确保类型安全：

```typescript
// src/types/mdx.d.ts
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
```

### 4. 测试配置

创建一个简单的 MDX 文件测试：

```mdx
# 测试

这是一个测试文件。
```

如果能正常加载，说明配置正确。

---

## 🔗 相关资源

- [Vite 插件 API](https://vitejs.dev/guide/api-plugin.html)
- [MDX Rollup 插件](https://mdxjs.com/packages/rollup/)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)

---

## ✅ 检查清单

遇到 MDX 插件顺序问题时：

- [ ] MDX 插件在 React 插件之前
- [ ] React 插件排除了 `.mdx` 文件
- [ ] 添加了 `providerImportSource`
- [ ] MDX 文件使用 `.mdx` 扩展名
- [ ] 清除了 Vite 缓存
- [ ] 重启了开发服务器

---

**最后更新：** 2024-12-08

**相关问题：** Vite 插件顺序、MDX 编译错误、Babel 语法错误
