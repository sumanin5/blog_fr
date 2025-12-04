# ShadCN UI 使用手册

本手册介绍 shadcn/ui 的工作原理、使用方法和最佳实践。

---

## 什么是 shadcn/ui？

shadcn/ui **不是一个组件库**，而是一组可复制粘贴的组件代码。

### 核心理念

> "这不是一个你安装的组件库，而是一组可重用的组件，你可以复制并粘贴到你的应用中。"

传统组件库 vs shadcn/ui：

| 对比       | 传统组件库 | shadcn/ui      |
| ---------- | ---------- | -------------- |
| 安装方式   | npm 包依赖 | 复制代码到项目 |
| 更新方式   | npm update | 重新复制       |
| 自定义难度 | 受限于 API | 完全控制       |
| 代码所有权 | 属于库作者 | 属于你         |
| 包体积     | 整个库     | 仅使用的组件   |

---

## 工作原理

### 1. CLI 工具原理

```bash
npx shadcn@latest add button
```

执行此命令时，CLI 会：

1. **读取配置**: 从 `components.json` 读取项目设置
2. **下载组件**: 从 shadcn 仓库获取组件源码
3. **处理依赖**: 安装组件依赖的 npm 包
4. **生成文件**: 在 `@/components/ui/` 目录创建组件文件
5. **应用风格**: 根据配置的 style 生成对应风格的代码

### 2. 组件结构

每个 shadcn 组件通常包含：

```typescript
// button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 1. 使用 cva 定义变体
const buttonVariants = cva(
  "inline-flex items-center justify-center ...", // 基础样式
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ...",
        destructive: "bg-destructive text-destructive-foreground ...",
        outline: "border border-input bg-background ...",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 2. 组件定义
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

---

## 使用方法

### 安装组件

```bash
# 安装单个组件
npx shadcn@latest add button

# 安装多个组件
npx shadcn@latest add button card dialog

# 查看所有可用组件
npx shadcn@latest add
```

### 组件使用示例

```tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
  return (
    <div className="space-x-4">
      {/* 默认按钮 */}
      <Button>Click me</Button>

      {/* 变体 */}
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>

      {/* 尺寸 */}
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>

      {/* 禁用 */}
      <Button disabled>Disabled</Button>

      {/* 自定义类名 */}
      <Button className="bg-blue-500 hover:bg-blue-600">Custom</Button>
    </div>
  );
}
```

### 使用 asChild 属性

`asChild` 允许将样式应用到子元素（常用于路由链接）：

```tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// 将 Button 样式应用到 Link 组件
<Button asChild>
  <Link to="/about">About Page</Link>
</Button>;
```

---

## 组件分类

### 基础组件

| 组件        | 用途     |
| ----------- | -------- |
| Button      | 按钮     |
| Input       | 输入框   |
| Label       | 标签     |
| Textarea    | 多行文本 |
| Checkbox    | 复选框   |
| Radio Group | 单选组   |
| Select      | 下拉选择 |
| Switch      | 开关     |
| Slider      | 滑块     |

### 布局组件

| 组件         | 用途           |
| ------------ | -------------- |
| Card         | 卡片容器       |
| Separator    | 分隔线         |
| Aspect Ratio | 宽高比容器     |
| Scroll Area  | 滚动区域       |
| Resizable    | 可调整大小面板 |

### 反馈组件

| 组件         | 用途       |
| ------------ | ---------- |
| Alert        | 警告提示   |
| Alert Dialog | 确认对话框 |
| Dialog       | 对话框     |
| Toast        | 轻提示     |
| Tooltip      | 工具提示   |
| Progress     | 进度条     |
| Skeleton     | 骨架屏     |

### 导航组件

| 组件            | 用途     |
| --------------- | -------- |
| Tabs            | 标签页   |
| Navigation Menu | 导航菜单 |
| Breadcrumb      | 面包屑   |
| Pagination      | 分页     |
| Dropdown Menu   | 下拉菜单 |
| Context Menu    | 右键菜单 |
| Menubar         | 菜单栏   |

### 数据展示

| 组件       | 用途     |
| ---------- | -------- |
| Table      | 表格     |
| Data Table | 数据表格 |
| Avatar     | 头像     |
| Badge      | 徽章     |
| Calendar   | 日历     |
| Chart      | 图表     |
| Carousel   | 轮播     |

---

## 自定义组件

### 修改样式

组件代码在你的项目中，可以直接修改：

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // 添加自定义变体
      brand: "bg-brand text-white hover:bg-brand-dark",
    },
  },
});
```

### 修改主题

在 `src/index.css` 中修改 CSS 变量：

```css
:root {
  /* 修改主色调 */
  --primary: oklch(0.6 0.25 250);
  --primary-foreground: oklch(1 0 0);

  /* 修改圆角 */
  --radius: 1rem;
}
```

### 添加新变体

```tsx
// 扩展 buttonVariants
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // ... 原有变体
      gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    },
    // 添加新的变体维度
    rounded: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    },
  },
});
```

---

## 最佳实践

### 1. 组件组织

```
src/
├── components/
│   ├── ui/              # shadcn 原始组件 (不要修改)
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── common/          # 基于 ui 的封装组件
│   │   ├── SubmitButton.tsx
│   │   └── StatusCard.tsx
│   └── features/        # 业务组件
│       └── UserProfile.tsx
```

### 2. 避免直接修改 ui/ 组件

建议创建封装组件：

```tsx
// components/common/SubmitButton.tsx
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function SubmitButton({
  isLoading,
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

### 3. 使用 cn() 合并类名

```tsx
import { cn } from "@/lib/utils";

function MyComponent({ className, isActive }) {
  return (
    <div className={cn("base-styles", isActive && "active-styles", className)}>
      Content
    </div>
  );
}
```

### 4. 利用 CSS 变量实现主题切换

```tsx
function ThemeToggle() {
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return <Button onClick={toggleTheme}>Toggle Theme</Button>;
}
```

---

## 常见问题

### Q: 如何更新组件？

A: 重新运行 `npx shadcn@latest add <component>` 会覆盖现有组件。如果你修改过组件，建议先备份。

### Q: 组件依赖 Radix UI 是什么？

A: Radix UI 是一个无样式的 headless 组件库，shadcn 使用它来处理复杂的交互逻辑（如对话框、下拉菜单的键盘导航和可访问性）。

### Q: 为什么使用 cva？

A: class-variance-authority (cva) 用于管理组件变体，使样式组合更清晰、类型安全：

```tsx
const variants = cva("base", {
  variants: {
    color: { red: "text-red", blue: "text-blue" },
    size: { sm: "text-sm", lg: "text-lg" },
  },
});

// 自动类型推断
variants({ color: "red", size: "sm" }); // "base text-red text-sm"
```

### Q: 如何处理表单验证？

A: shadcn 的 Form 组件基于 react-hook-form 和 zod，安装时会提示安装依赖：

```bash
npx shadcn@latest add form
# 自动安装: react-hook-form, @hookform/resolvers, zod
```

---

## 资源链接

- [shadcn/ui 官方文档](https://ui.shadcn.com/)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [Radix UI 文档](https://www.radix-ui.com/)
- [class-variance-authority 文档](https://cva.style/)
- [Lucide 图标库](https://lucide.dev/)
