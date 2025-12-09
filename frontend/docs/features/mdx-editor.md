# MDX 在线编辑器使用指南

## 🎯 访问编辑器

### 方式 1：直接访问

```
http://localhost:5173/mdx-editor
```

### 方式 2：从展示页面

1. 访问 `/mdx-showcase`
2. 点击顶部的"在线编辑器"按钮

---

## ✨ 功能特点

### 1. 实时预览

- 左侧编辑，右侧实时显示渲染效果
- 500ms 防抖，避免频繁编译
- 编译状态实时反馈

### 2. 分屏布局

- **桌面端**：左右分屏，同时显示编辑器和预览
- **移动端**：单屏切换，点击按钮在编辑和预览之间切换

### 3. 语法错误提示

- 实时检测 MDX 语法错误
- 详细的错误信息显示
- 错误位置提示

### 4. 导出功能

- **复制**：一键复制所有代码到剪贴板
- **下载**：导出为 `.mdx` 文件

### 5. 状态栏

- 字符数统计
- 行数统计
- 编译状态显示

---

## 🎨 界面布局

```
┌─────────────────────────────────────────────────────┐
│  ← 返回    MDX 在线编辑器    复制  下载  编辑/预览  │
├──────────────────┬──────────────────────────────────┤
│  📝 编辑器       │  👁️ 预览                         │
│                  │                                  │
│  # 标题          │  标题                            │
│                  │                                  │
│  **粗体**        │  粗体                            │
│                  │                                  │
│  <Button>        │  [按钮]                          │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│  字符数: 123  行数: 10        ✅ 编译成功           │
└─────────────────────────────────────────────────────┘
```

---

## 📝 使用示例

### 示例 1：基础 Markdown

在左侧输入：

```markdown
# 我的文章

这是一段**粗体**文本。

- 列表项 1
- 列表项 2
```

右侧实时显示渲染效果。

### 示例 2：使用 React 组件

```mdx
import { Button } from "@/components/ui/button";

# 按钮示例

<Button>点击我</Button>
<Button variant="outline">轮廓按钮</Button>
```

### 示例 3：交互式组件

```mdx
export function Counter() {
  const [count, setCount] = React.useState(0);

return (
<div className="flex gap-4">
<Button onClick={() => setCount(count - 1)}>-</Button>
<span>{count}</span>
<Button onClick={() => setCount(count + 1)}>+</Button>
</div>
);
}

<Counter />
```

### 示例 4：使用卡片组件

```mdx
import { Card, CardContent } from "@/components/ui/card";

<Card>
  <CardContent className="p-6">
    <h3>卡片标题</h3>
    <p>卡片内容</p>
  </CardContent>
</Card>
```

---

## 🔧 技术实现

### 核心技术

1. **@mdx-js/mdx**
   - 实时编译 MDX 代码
   - 支持 JSX 和 React 组件

2. **evaluate() 函数**
   - 动态编译和执行 MDX
   - 提供 React 运行时

3. **防抖机制**
   - 500ms 延迟编译
   - 避免频繁重新编译

### 代码结构

```tsx
// 编译 MDX
const compileMDX = async (code: string) => {
  const result = await evaluate(code, {
    ...runtime,
    useMDXComponents: () => ({
      Button,
      Card,
      // ... 其他组件
    }),
  });

  setCompiledMDX(result);
};

// 防抖
useEffect(() => {
  const timer = setTimeout(() => {
    compileMDX(mdxCode);
  }, 500);

  return () => clearTimeout(timer);
}, [mdxCode]);
```

---

## 🎯 可用组件

编辑器中可以直接使用以下组件（无需导入）：

### Button 组件

```mdx
<Button>默认按钮</Button>
<Button variant="outline">轮廓按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="destructive">危险按钮</Button>
```

### Card 组件

```mdx
<Card>
  <CardContent className="p-6">内容</CardContent>
</Card>
```

### Alert 组件

```mdx
<Alert>
  <div>提示信息</div>
</Alert>
```

---

## 📱 响应式设计

### 桌面端（≥ 768px）

- 左右分屏显示
- 编辑器和预览同时可见
- 拖拽调整分屏比例（未来功能）

### 移动端（< 768px）

- 单屏显示
- 通过按钮切换编辑/预览模式
- 全屏编辑体验

---

## 🚀 快捷操作

### 复制代码

1. 点击顶部"复制"按钮
2. 代码已复制到剪贴板
3. 可以粘贴到其他地方

### 下载文件

1. 点击顶部"下载"按钮
2. 自动下载为 `document.mdx`
3. 可以在本地编辑器中打开

### 切换视图（移动端）

1. 点击"编辑"按钮 → 显示编辑器
2. 点击"预览"按钮 → 显示预览

---

## 🐛 错误处理

### 语法错误

当 MDX 代码有语法错误时：

```
┌─────────────────────────────┐
│  ⚠️ 编译错误                │
│                             │
│  Unexpected token (3:5)     │
│  Expected closing tag       │
└─────────────────────────────┘
```

### 常见错误

1. **未闭合的标签**

   ```mdx
   <Button>点击 // ❌ 缺少 </Button>
   ```

2. **导入路径错误**

   ```mdx
   import { Button } from "wrong-path"; // ❌
   ```

3. **JSX 语法错误**
   ```mdx
   <Button onClick={handleClick>  // ❌ 缺少 }
   ```

---

## 💡 使用技巧

### 1. 快速测试组件

编辑器是测试 MDX 组件的完美工具：

```mdx
// 快速测试不同的按钮样式

<div className="flex gap-2">
  <Button>默认</Button>
  <Button variant="outline">轮廓</Button>
  <Button variant="ghost">幽灵</Button>
</div>
```

### 2. 原型设计

快速设计页面布局：

```mdx
<div className="grid grid-cols-2 gap-4">
  <Card>
    <CardContent className="p-6">
      <h3>功能 1</h3>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="p-6">
      <h3>功能 2</h3>
    </CardContent>
  </Card>
</div>
```

### 3. 文档编写

编写技术文档：

```mdx
# API 文档

## 安装

\`\`\`bash
npm install my-package
\`\`\`

## 使用

\`\`\`javascript
import { myFunction } from 'my-package';
\`\`\`
```

### 4. 教程创建

创建交互式教程：

```mdx
# React Hooks 教程

## useState 示例

export function Example() {
  const [count, setCount] = React.useState(0);
  return <Button onClick={() => setCount(count + 1)}>点击次数: {count}</Button>;
}

<Example />
```

---

## 🔮 未来功能

### 计划中的功能

- [ ] 代码高亮
- [ ] 自动保存到 localStorage
- [ ] 导入/导出多个文件
- [ ] 分享功能（生成链接）
- [ ] 主题切换（编辑器主题）
- [ ] 快捷键支持
- [ ] 代码格式化
- [ ] 拖拽调整分屏比例
- [ ] 全屏模式
- [ ] 历史记录

---

## 🎓 学习资源

### MDX 语法

- [MDX 官方文档](https://mdxjs.com/)
- [MDX Playground](https://mdxjs.com/playground/)

### React 组件

- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🚨 注意事项

### 1. 性能考虑

- 大型文档可能编译较慢
- 建议分段编写和测试
- 避免过于复杂的嵌套组件

### 2. 浏览器兼容性

- 需要现代浏览器支持
- 推荐使用 Chrome、Firefox、Safari 最新版

### 3. 数据安全

- 编辑器不会自动保存
- 记得及时下载或复制代码
- 刷新页面会丢失未保存的内容

---

## 📊 对比其他方案

| 特性     | 本编辑器 | CodeSandbox | StackBlitz | Next.js |
| -------- | -------- | ----------- | ---------- | ------- |
| 实时预览 | ✅       | ✅          | ✅         | ✅      |
| 纯前端   | ✅       | ❌          | ❌         | ❌      |
| 离线使用 | ✅       | ❌          | ❌         | ❌      |
| 组件集成 | ✅       | ✅          | ✅         | ✅      |
| 无需配置 | ✅       | ❌          | ❌         | ❌      |

---

## ✅ 总结

MDX 在线编辑器是一个：

- 🚀 **纯前端**的实时编辑器
- 💻 **无需后端**，完全在浏览器中运行
- 🎨 **所见即所得**，实时预览效果
- 📱 **响应式**设计，支持移动端
- 🔧 **易于使用**，无需配置

**立即体验：** [http://localhost:5173/mdx-editor](http://localhost:5173/mdx-editor)

---

**最后更新：** 2024-12-08
