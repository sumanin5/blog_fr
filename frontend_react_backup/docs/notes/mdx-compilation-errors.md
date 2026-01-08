# MDX 编译错误排查

## 🐛 常见错误

### 错误 1：options.baseUrl 缺失

#### 症状

```
Unexpected missing `options.baseUrl` needed to support `export … from`, `import.meta.url`
```

#### 原因

Vite 的 MDX 插件配置不完整，缺少必要的选项。

#### 解决方案

在 `vite.config.ts` 中添加配置：

```typescript
export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react", // 添加这一行
    }),
    react({
      include: /\.(jsx|js|mdx|md|tsx|ts)$/, // 包含 MDX 文件
    }),
    tailwindcss(),
  ],
});
```

---

### 错误 2：MDX 文件无法导入

#### 症状

```
Failed to resolve import "*.mdx"
```

#### 原因

1. 类型声明文件缺失
2. Vite 配置不正确

#### 解决方案

**步骤 1：** 确保类型声明文件存在

`src/types/mdx.d.ts`:

```typescript
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
```

**步骤 2：** 检查 Vite 配置

```typescript
// vite.config.ts
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
    }),
    react({
      include: /\.(jsx|js|mdx|md|tsx|ts)$/,
    }),
  ],
});
```

**步骤 3：** 重启开发服务器

```bash
# 停止服务器 (Ctrl+C)
# 重新启动
npm run dev
```

---

### 错误 3：React 组件在 MDX 中不可用

#### 症状

```
ReferenceError: Button is not defined
```

#### 原因

MDX 文件中使用的组件没有导入或没有在 MDXProvider 中提供。

#### 解决方案

**方案 1：在 MDX 文件中导入**

```mdx
import { Button } from "@/components/ui/button";

<Button>点击我</Button>
```

**方案 2：在 MDXProvider 中全局提供**

```tsx
// MDXProvider.tsx
const components = {
  Button,
  Card,
  // ... 其他组件
};

export function MDXProvider({ children }) {
  return <BaseMDXProvider components={components}>{children}</BaseMDXProvider>;
}
```

**方案 3：在编辑器中提供（MDXEditor）**

```tsx
const result = await evaluate(code, {
  ...runtime,
  useMDXComponents: () => ({
    Button,
    Card,
    Alert,
  }),
});
```

---

### 错误 4：编译时内存溢出

#### 症状

```
JavaScript heap out of memory
```

#### 原因

MDX 文件过大或包含复杂的嵌套组件。

#### 解决方案

**方案 1：增加 Node.js 内存限制**

```json
// package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' vite",
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

**方案 2：拆分大型 MDX 文件**

将大文件拆分为多个小文件，然后组合使用。

**方案 3：优化 MDX 内容**

- 减少嵌套层级
- 避免过于复杂的组件
- 使用懒加载

---

### 错误 5：样式不生效

#### 症状

MDX 中的 Tailwind 类名不生效。

#### 原因

1. MDXProvider 没有正确包裹
2. Tailwind 配置不完整

#### 解决方案

**步骤 1：** 确保用 MDXProvider 包裹

```tsx
<MDXProvider>
  <YourMDXContent />
</MDXProvider>
```

**步骤 2：** 检查 Tailwind 配置

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // 包含 .mdx
  ],
};
```

---

### 错误 6：热更新不工作

#### 症状

修改 MDX 文件后，页面不自动刷新。

#### 原因

Vite 的 HMR（热模块替换）配置问题。

#### 解决方案

**步骤 1：** 检查 Vite 配置

```typescript
export default defineConfig({
  server: {
    watch: {
      usePolling: true, // Docker 环境需要
    },
  },
});
```

**步骤 2：** 手动刷新

如果自动刷新不工作，手动刷新浏览器（F5）。

---

## 🔧 调试技巧

### 1. 查看编译后的代码

在浏览器开发者工具中：

1. 打开 Sources 标签
2. 找到 MDX 文件
3. 查看编译后的 JavaScript 代码

### 2. 使用 console.log

在 MDX 文件中：

```mdx
export const debug = console.log("MDX 文件已加载");

{console.log("当前渲染")}
```

### 3. 检查网络请求

在 Network 标签中查看 MDX 文件的加载情况。

### 4. 清除缓存

```bash
# 删除 node_modules 和缓存
rm -rf node_modules .vite
npm install
npm run dev
```

---

## 📋 检查清单

遇到 MDX 问题时，按顺序检查：

- [ ] `@mdx-js/mdx` 和 `@mdx-js/react` 已安装
- [ ] `@mdx-js/rollup` 已安装
- [ ] `vite.config.ts` 配置正确
- [ ] `src/types/mdx.d.ts` 类型声明存在
- [ ] MDX 文件语法正确
- [ ] 组件已正确导入或提供
- [ ] MDXProvider 正确包裹
- [ ] 开发服务器已重启

---

## 🚀 完整配置示例

### package.json

```json
{
  "dependencies": {
    "@mdx-js/mdx": "^3.x",
    "@mdx-js/react": "^3.x",
    "@mdx-js/rollup": "^3.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

### vite.config.ts

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
    }),
    react({
      include: /\.(jsx|js|mdx|md|tsx|ts)$/,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### src/types/mdx.d.ts

```typescript
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
```

### src/components/mdx/MDXProvider.tsx

```tsx
import { MDXProvider as BaseMDXProvider } from "@mdx-js/react";

const components = {
  h1: ({ children }) => <h1 className="text-4xl font-bold">{children}</h1>,
  // ... 其他组件
};

export function MDXProvider({ children }) {
  return <BaseMDXProvider components={components}>{children}</BaseMDXProvider>;
}
```

---

## 🔗 相关资源

- [MDX 官方文档](https://mdxjs.com/)
- [Vite MDX 插件](https://mdxjs.com/packages/rollup/)
- [MDX 故障排查](https://mdxjs.com/docs/troubleshooting/)

---

## 💡 预防措施

### 1. 使用 ESLint

安装 MDX ESLint 插件：

```bash
npm install eslint-plugin-mdx --save-dev
```

### 2. 使用 TypeScript

确保 MDX 文件有类型支持。

### 3. 定期更新依赖

```bash
npm update @mdx-js/mdx @mdx-js/react @mdx-js/rollup
```

### 4. 编写测试

为 MDX 组件编写单元测试。

---

**最后更新：** 2024-12-08

**相关问题：** MDX 编译错误、Vite 配置、React 组件集成
