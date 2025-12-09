# MDX 中的 Import 与组件注入

## Import 的作用

在标准 MDX 文件中，`import` 用于引入外部组件：

```mdx
import { Button } from "@/components/ui/button";
import { Chart } from "@/components/Chart";
import userData from "./data.json";

# 我的文章

<Button>点击我</Button>

<Chart data={userData} />
```

## 为什么在线编辑器不支持 Import？

浏览器端的 `evaluate` 函数无法处理 `import` 语句，原因：

1. **没有文件系统**：浏览器无法访问本地文件
2. **没有打包器**：无法解析模块路径和依赖
3. **安全限制**：无法动态执行任意代码

```tsx
// 这会报错
await evaluate(`
  import { Button } from './Button';
  <Button />
`);
// Error: Cannot use import statement
```

## 解决方案

### 方案1：预置组件（推荐）

在 `useMDXComponents` 中提前提供所有可用组件：

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

await evaluate(code, {
  useMDXComponents: () => ({
    // 这些组件可以在 MDX 中直接使用，无需 import
    Button,
    Card,
    CardContent,
    Alert,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  }),
});
```

MDX 中直接使用：

```mdx
# 无需 import！

<Button>点击我</Button>

<Card>
  <CardContent>卡片内容</CardContent>
</Card>
```

### 方案2：组件注册系统

创建一个组件注册表，让用户选择要使用的组件：

```tsx
// componentRegistry.ts
export const componentRegistry = {
  // UI 组件
  Button: () => import("@/components/ui/button").then((m) => m.Button),
  Card: () => import("@/components/ui/card").then((m) => m.Card),

  // 自定义组件
  CodeBlock: () => import("@/components/CodeBlock"),
  Chart: () => import("@/components/Chart"),
  YouTube: () => import("@/components/YouTube"),
};

// 动态加载选中的组件
async function loadComponents(names: string[]) {
  const components = {};
  for (const name of names) {
    if (componentRegistry[name]) {
      components[name] = await componentRegistry[name]();
    }
  }
  return components;
}
```

```tsx
// 编辑器中使用
const [selectedComponents, setSelectedComponents] = useState([
  "Button",
  "Card",
]);

const compileMDX = async (code) => {
  const components = await loadComponents(selectedComponents);

  await evaluate(code, {
    useMDXComponents: () => components,
  });
};
```

### 方案3：服务端编译

使用 `mdx-bundler` 在服务端编译 MDX，支持完整的 import：

```tsx
// 后端 API
import { bundleMDX } from "mdx-bundler";

app.post("/api/compile-mdx", async (req, res) => {
  const { code } = req.body;

  const result = await bundleMDX({
    source: code,
    // 可以指定允许 import 的模块
    globals: {
      "@/components/ui/button": "Button",
    },
  });

  res.json({ code: result.code });
});
```

```tsx
// 前端调用
const compileMDX = async (code) => {
  const res = await fetch("/api/compile-mdx", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const { code: compiledCode } = await res.json();

  // 执行编译后的代码
  const Component = new Function("React", compiledCode)(React);
  return Component;
};
```

### 方案4：使用 Next.js

Next.js 内置 MDX 支持，可以完整使用 import：

```tsx
// next.config.js
const withMDX = require("@next/mdx")();

module.exports = withMDX({
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
});
```

```mdx
// pages/blog/my-post.mdx
import { Button } from '@/components/ui/button';

# 我的文章

<Button>这里可以正常 import！</Button>
```

## 预置组件最佳实践

### 1. 创建组件包

```tsx
// src/components/mdx/index.ts
export { Button } from "@/components/ui/button";
export { Card, CardContent, CardHeader } from "@/components/ui/card";
export { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 自定义 MDX 组件
export { Callout } from "./Callout";
export { CodeBlock } from "./CodeBlock";
export { YouTube } from "./YouTube";
```

### 2. 统一导入

```tsx
import * as MDXComponents from "@/components/mdx";

await evaluate(code, {
  useMDXComponents: () => ({
    ...markdownComponents,
    ...MDXComponents,
  }),
});
```

### 3. 提供组件文档

在编辑器中显示可用组件列表：

```tsx
const availableComponents = [
  { name: "Button", usage: "<Button>文字</Button>" },
  { name: "Card", usage: "<Card><CardContent>内容</CardContent></Card>" },
  { name: "Alert", usage: "<Alert>提示信息</Alert>" },
  { name: "Callout", usage: '<Callout type="info">提示</Callout>' },
];

// 在编辑器侧边栏显示
<ComponentPalette components={availableComponents} />;
```

## 自定义组件示例

### Callout 提示框

```tsx
// src/components/mdx/Callout.tsx
interface CalloutProps {
  type?: "info" | "warning" | "error" | "success";
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = "info", title, children }: CalloutProps) {
  const styles = {
    info: "bg-blue-50 border-blue-500 text-blue-900",
    warning: "bg-yellow-50 border-yellow-500 text-yellow-900",
    error: "bg-red-50 border-red-500 text-red-900",
    success: "bg-green-50 border-green-500 text-green-900",
  };

  return (
    <div className={`my-4 border-l-4 p-4 ${styles[type]}`}>
      {title && <div className="mb-2 font-bold">{title}</div>}
      {children}
    </div>
  );
}
```

MDX 中使用：

```mdx
<Callout type="warning" title="注意">
  这是一个警告提示框
</Callout>
```

### YouTube 嵌入

```tsx
// src/components/mdx/YouTube.tsx
export function YouTube({ id }: { id: string }) {
  return (
    <div className="my-4 aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        className="h-full w-full rounded-lg"
        allowFullScreen
      />
    </div>
  );
}
```

MDX 中使用：

```mdx
<YouTube id="dQw4w9WgXcQ" />
```
