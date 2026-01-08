# 首页设计优化说明

## 📋 优化对比

### Lumina 原版 vs 优化版

| 方面            | Lumina 原版             | 优化版                                  | 优势                    |
| --------------- | ----------------------- | --------------------------------------- | ----------------------- |
| **Button 组件** | 自定义 `Button`         | shadcn/ui `Button`                      | ✅ 统一设计系统         |
| **Card 组件**   | 自定义 `FeatureCard`    | shadcn/ui `Card`                        | ✅ 可复用，易维护       |
| **动画类名**    | `animate-in` 等自定义类 | Tailwind 标准类 + `tailwindcss-animate` | ✅ 标准化，无需额外配置 |
| **代码组织**    | 单文件组件              | 拆分子组件                              | ✅ 更清晰的结构         |
| **中文化**      | 英文内容                | 中文内容                                | ✅ 本地化               |
| **注释**        | 无注释                  | 详细中文注释                            | ✅ 易于理解             |

---

## 🎨 设计特点

### 1. 科技感背景渐变

```tsx
{/* 两个模糊的圆形光晕营造科技氛围 */}
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10" />
<div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/10 rounded-full blur-[100px] -z-10" />
```

**原理**：

- 使用绝对定位的大圆形
- 应用主题色的 10% 透明度
- 添加 120px 的模糊效果
- 设置 `-z-10` 确保在内容下方

### 2. 入场动画

```tsx
<h1 className="animate-in fade-in slide-in-from-bottom-4 duration-700">标题</h1>
```

**动画类说明**：

- `animate-in` - 触发入场动画
- `fade-in` - 淡入效果
- `slide-in-from-bottom-4` - 从下方 16px (4 \* 4px) 滑入
- `duration-700` - 动画持续 700ms
- `delay-150` - 延迟 150ms 开始（可选）

**依赖**：需要安装 `tailwindcss-animate` 插件（已安装）

### 3. 悬停效果

```tsx
<Card className="transition-all hover:-translate-y-1 hover:shadow-lg">
  内容
</Card>
```

**效果**：

- 鼠标悬停时卡片上移 4px
- 阴影增强
- 边框颜色变为主题色
- 所有变化都有平滑过渡

### 4. 毛玻璃效果

```tsx
<div className="bg-background/50 backdrop-blur-sm">内容</div>
```

**原理**：

- `bg-background/50` - 背景色 50% 透明度
- `backdrop-blur-sm` - 背景模糊效果（毛玻璃）

---

## 🧩 组件拆分

### StatCard - 统计数据卡片

```tsx
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="group cursor-default space-y-2">
      <h3 className="group-hover:text-primary font-mono text-3xl font-bold transition-colors">
        {number}
      </h3>
      <p className="text-muted-foreground text-sm tracking-widest uppercase">
        {label}
      </p>
    </div>
  );
}
```

**特点**：

- 使用 `font-mono` 等宽字体显示数字（科技感）
- `group` + `group-hover:` 实现整体悬停效果
- `uppercase tracking-widest` 让标签更有设计感

### FeatureCard - 特性卡片

```tsx
function FeatureCard({ icon, title, description }) {
  return (
    <Card className="group hover:-translate-y-1">
      <CardContent className="p-8">
        <div className="bg-primary/10 group-hover:bg-primary/20">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </CardContent>
    </Card>
  );
}
```

**优势**：

- 使用 shadcn/ui 的 `Card` 组件
- 统一的样式和行为
- 易于在其他页面复用

---

## 🎯 使用方法

### 1. 在路由中使用

```tsx
// App.tsx 或路由配置
import HomePage from "@/pages/HomePage";

<Route path="/" element={<HomePage />} />;
```

### 2. 自定义内容

修改 `HomePage.tsx` 中的内容：

```tsx
// 修改统计数据
<StatCard number="10K+" label="开发者" />

// 修改特性卡片
<FeatureCard
  icon={<Sparkles className="h-10 w-10" />}
  title="你的标题"
  description="你的描述"
/>
```

### 3. 调整样式

```tsx
// 修改渐变颜色
<div className="bg-primary/10" />  // 改为 bg-blue-500/10

// 修改动画时长
<h1 className="duration-700" />  // 改为 duration-1000

// 修改卡片间距
<div className="grid gap-6" />  // 改为 gap-8
```

---

## 🔧 依赖检查

确保已安装以下依赖：

```json
{
  "dependencies": {
    "lucide-react": "^0.555.0", // 图标库
    "react-router-dom": "^7.10.0" // 路由
  },
  "devDependencies": {
    "tailwindcss-animate": "^1.0.7" // 动画插件
  }
}
```

---

## 📱 响应式设计

### 断点说明

- **移动端** (`< 768px`)
  - 单列布局
  - 较小的标题字号
  - 按钮垂直排列

- **平板** (`768px - 1024px`)
  - 2 列特性卡片
  - 中等标题字号

- **桌面** (`> 1024px`)
  - 3 列特性卡片
  - 大标题字号
  - 按钮水平排列

### 响应式类名示例

```tsx
<h1 className="text-4xl md:text-6xl lg:text-7xl">
  {/* 移动端 4xl, 平板 6xl, 桌面 7xl */}
</h1>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 移动端 1 列, 平板 2 列, 桌面 3 列 */}
</div>
```

---

## 🎨 主题适配

所有颜色都使用 CSS 变量，自动适配深色/浅色模式：

```tsx
{
  /* 这些类会自动适配主题 */
}
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">次要文字</p>
  <span className="text-primary">主题色</span>
</div>;
```

**CSS 变量定义**（在 `index.css` 中）：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --muted-foreground: 0 0% 45.1%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --muted-foreground: 0 0% 63.9%;
}
```

---

## 🚀 性能优化建议

### 1. 图片懒加载

如果添加图片，使用懒加载：

```tsx
<img loading="lazy" src="..." alt="..." />
```

### 2. 动画性能

使用 `transform` 和 `opacity` 实现动画（GPU 加速）：

```tsx
{
  /* ✅ 好 - GPU 加速 */
}
<div className="hover:-translate-y-1 hover:opacity-80" />;

{
  /* ❌ 避免 - 触发重排 */
}
<div className="hover:top-[-4px]" />;
```

### 3. 减少重渲染

使用 `React.memo` 包裹静态组件：

```tsx
const FeatureCard = React.memo(function FeatureCard({
  icon,
  title,
  description,
}) {
  // ...
});
```

---

## 📚 相关文档

- [shadcn/ui Card 组件](https://ui.shadcn.com/docs/components/card)
- [shadcn/ui Button 组件](https://ui.shadcn.com/docs/components/button)
- [Tailwind CSS 动画](https://tailwindcss.com/docs/animation)
- [tailwindcss-animate 插件](https://github.com/jamiebuilds/tailwindcss-animate)

---

## 🎯 下一步

1. ✅ 复制 `HomePage.tsx` 到你的项目
2. ✅ 修改内容和样式
3. ✅ 在路由中配置
4. ✅ 测试响应式布局
5. ✅ 根据需求调整动画效果

**提示**：这个设计可以作为其他页面的模板，复用相同的设计语言和组件。
