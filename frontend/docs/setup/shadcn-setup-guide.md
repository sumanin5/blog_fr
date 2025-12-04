# ShadCN UI + Tailwind CSS v4 环境搭建指南

本指南记录了在 React + Vite 项目中配置 shadcn/ui 和 Tailwind CSS v4 的完整过程。

---

## 遇到的问题与原因分析

### 错误信息

```bash
❯ npx tailwindcss init -p
npm error could not determine executable to run
```

### 错误原因

> **核心原因**: `tailwindcss init` 命令在 Tailwind CSS v4 中已被**完全移除**！

Tailwind CSS v4 是一次重大架构升级，与 v3 有本质区别：

| 特性         | Tailwind CSS v3            | Tailwind CSS v4                    |
| ------------ | -------------------------- | ---------------------------------- |
| 配置文件     | 需要 `tailwind.config.js`  | **不需要**                         |
| PostCSS 插件 | 使用 `postcss-tailwindcss` | 使用 Vite 插件 `@tailwindcss/vite` |
| 初始化命令   | `npx tailwindcss init -p`  | **已移除**                         |
| CSS 配置     | 在 JS 配置文件中           | 直接在 CSS 中使用 `@theme` 指令    |
| 主题扩展     | `theme.extend` 对象        | 使用 CSS 变量                      |

---

## 环境搭建步骤

### 1. 项目环境要求

- Node.js >= 18
- React 18+ 或 React 19
- Vite 5+ 或 Rolldown-Vite

### 2. 安装 Tailwind CSS v4 (已完成)

项目已正确安装 Tailwind CSS v4：

```bash
npm install tailwindcss @tailwindcss/vite
```

并在 `vite.config.ts` 中配置了 Vite 插件：

```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 Vite 插件
  ],
});
```

### 3. 配置 TypeScript 路径别名

为了让 shadcn/ui 的 `@/` 导入工作，需要配置路径别名。

#### 3.1 更新 tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

#### 3.2 更新 tsconfig.app.json

在 `compilerOptions` 中添加：

```json
{
  "compilerOptions": {
    // ... 其他配置

    /* Path alias */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }

    // ... 其他配置
  }
}
```

#### 3.3 更新 vite.config.ts

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 4. 安装 shadcn/ui 依赖

```bash
npm install clsx tailwind-merge class-variance-authority lucide-react
```

各依赖作用：

- **clsx**: 条件类名工具
- **tailwind-merge**: 智能合并 Tailwind 类名，解决类冲突
- **class-variance-authority (cva)**: 组件变体管理
- **lucide-react**: 图标库

### 5. 创建工具函数

创建 `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### `cn()` 函数说明

**作用：智能合并 CSS 类名**

它结合了两个强大的库来解决两个具体问题：
clsx: 解决 “条件判断” 问题。比如 isActive ? 'text-red-500' : ''，它可以让你写得更优雅。
tailwind-merge (twMerge): 解决 “样式冲突” 问题。这是最关键的。

**为什么要使用它**

主要是为了在同一个组件中，可以同时使用条件判断和 Tailwind 类名，而不需要写成多个条件判断。

**使用示例**

```typescript
const isActive = true;
const className = cn("text-red-500", isActive && "bg-blue-500", className);
```

**为什么要用它？（主要作用）**

想象一下你写了一个通用的按钮组件 `<Button className="bg-blue-500" />`。 现在你想在某个特殊页面把它的背景改成红色：`<Button className="bg-red-500" />`。

如果不使用 cn，简单的字符串拼接会得到："bg-blue-500 bg-red-500"。 在 CSS 中，这两个类都会存在，浏览器到底听谁的？ 这取决于 CSS 文件里谁定义的顺序在后面，**而不是你写的顺序**。这会导致非常难以调试的 Bug（比如你明明写了红色，它还是显示蓝色）。

cn 函数的作用就是： 它能识别出 bg-blue-500 和 bg-red-500 都是控制背景色的，**并且后面的会覆盖前面的**。所以 cn("bg-blue-500", "bg-red-500")的结果是 "bg-red-500"。它帮你清理了冲突。

### 6. 创建 shadcn 配置文件

#### 创建 `components.json`

使用 `npx shadcn@latest init` 命令创建 `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

配置说明：

- `style`: 组件风格，可选 `default` 或 `new-york`
- `rsc`: 是否使用 React Server Components (Vite 项目设为 false)
- `tailwind.config`: v4 不需要配置文件，留空
- `aliases`: 路径别名配置

手动调整说明：

- `tailwind.config`：v4 不需要配置文件，留空
- `css`：vite 项目中，css 文件路径为 `src/index.css`

### 7. 配置 CSS 变量

在 `src/index.css` 中添加完整的主题配置：

```css
@import "tailwindcss";

@theme inline {
  /* 将 CSS 变量映射到 Tailwind 颜色 */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... 更多颜色映射 */
}

:root {
  /* 浅色主题 */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  /* ... 更多颜色变量 */
}

.dark {
  /* 深色主题 */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... 更多颜色变量 */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**配置说明**：

这个文件也是通过`npx shadcn@latest init`生成的，其中某些参数具有特定的含义

- `--primary--`： 主色调，对应 Tailwind 的 `primary` 颜色
- `--background--`： 背景色，对应 Tailwind 的 `background` 颜色
- `--foreground--`： 前景色，对应 Tailwind 的 `foreground` 颜色
- `--destructive--`： 错误色，对应 Tailwind 的 `destructive` 颜色
- `--muted--`： 柔和色，对应 Tailwind 的 `muted` 颜色
- `--accent--`： 亮色，对应 Tailwind 的 `accent` 颜色
- `--ring--`： 环形色，对应 Tailwind 的 `ring` 颜色
- `--card--`： 卡片色，对应 Tailwind 的 `card` 颜色
- `--card-foreground--`： 卡片前景色，对应 Tailwind 的 `card-foreground` 颜色
- `--sidebar--`： 侧边栏色，对应 Tailwind 的 `sidebar` 颜色
- `--sidebar-foreground--`： 侧边栏前景色，对应 Tailwind 的 `sidebar-foreground` 颜色
- `--sidebar-primary--`： 侧边栏主色调，对应 Tailwind 的 `sidebar-primary` 颜色
- `--sidebar-primary-foreground--`： 侧边栏主色调前景色，对应 Tailwind 的 `sidebar-primary-foreground` 颜色
- `--sidebar-accent--`： 侧边栏强调色，对应 Tailwind 的 `sidebar-accent` 颜色
- `--sidebar-accent-foreground--`： 侧边栏强调色前景色，对应 Tailwind 的 `sidebar-accent-foreground` 颜色
- `--sidebar-border--`： 侧边栏边框色，对应 Tailwind 的 `sidebar-border` 颜色
- `--sidebar-ring--`： 侧边栏环形色，对应 Tailwind 的 `sidebar-ring` 颜色
- `--radius--`： 半径，对应 Tailwind 的 `radius` 颜色
- `--radius-sm--`： 小半径，对应 Tailwind 的 `radius-sm` 颜色
- `--radius-md--`： 中等半径，对应 Tailwind 的 `radius-md` 颜色
- `--radius-lg--`： 大半径，对应 Tailwind 的 `radius-lg` 颜色
- `--radius-xl--`： 超大半径，对应 Tailwind 的 `radius-xl` 颜色。

**模式说明**：

当你切换模式时，Tailwind 会自动读取对应的变量，所以你不需要写两套代码（比如不需要写 bg-white dark:bg-black，只需要写 bg-background）。

- `:root`： 浅色主题
- `.dark`： 深色主题

这些内容也是自动生成的，cli 工具会询问你一些问题，根据你的回答生成对应的配置。如果你选了"Zinc"，那么它就会将 zinc 色系的颜色值（用 oklch 表示）写入到`:root`和`.dark`选择器中。

### 8. 验证安装

```bash
# 启动开发服务器
npm run dev

# 安装测试组件
npx shadcn@latest add button
```

---

## Tailwind CSS v4 新特性总结

### CSS-first 配置

v4 将配置移到 CSS 文件中，使用 `@theme` 指令：

```css
@theme {
  --color-brand: #ff5500;
  --font-display: "Inter", sans-serif;
}
```

### 性能提升

- 使用 Rust 重写的 Oxide 引擎
- 构建速度提升 10 倍以上
- 更小的 CSS 输出

### 原生 CSS 嵌套

v4 支持原生 CSS 嵌套语法：

```css
.card {
  background: white;

  &:hover {
    background: gray;
  }

  .title {
    font-size: 1.5rem;
  }
}
```

---

## 常见问题

### Q: 为什么 `@theme` 和 `@apply` 在 IDE 中显示警告？

A: 这是 IDE 的 CSS lint 规则不认识 Tailwind 语法，实际编译不受影响。可以在 VS Code 中安装 Tailwind CSS IntelliSense 扩展来解决。

### Q: 如何自定义主题颜色？

A: 在 `:root` 和 `.dark` 选择器中修改对应的 CSS 变量值。

### Q: 为什么使用 oklch 色彩空间？

A: oklch 是一种感知均匀的色彩空间，可以生成更一致、更自然的颜色过渡。

---

## 项目文件结构

完成配置后的项目结构：

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/          # shadcn 组件目录
│   ├── lib/
│   │   └── utils.ts     # cn() 工具函数
│   ├── index.css        # 主题配置
│   └── ...
├── components.json      # shadcn 配置
├── vite.config.ts       # Vite + 路径别名
├── tsconfig.json        # TypeScript 配置
└── tsconfig.app.json    # 应用 TypeScript 配置
```
