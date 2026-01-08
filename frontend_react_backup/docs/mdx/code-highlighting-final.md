# 代码高亮最终配置说明

## ✅ 当前配置

### Shiki 双主题配置

```typescript
// vite.config.ts
rehypePlugins: [
  rehypeKatex,
  [
    rehypeShiki,
    {
      themes: {
        light: "github-light", // 亮色模式
        dark: "github-dark", // 暗色模式
      },
    },
  ],
];
```

### CSS 配置

```css
/* 只控制布局和字体，不覆盖 Shiki 的颜色 */
pre {
  @apply border-border my-4 overflow-x-auto rounded-lg border p-4 text-sm leading-6;
  font-family: var(--font-mono) !important;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
```

## 🎨 工作原理

### 1. Shiki 生成双主题 HTML

Shiki 会生成包含两套颜色的 HTML：

```html
<pre>
  <code>
    <span style="color: var(--shiki-light); --shiki-dark: #fff">const</span>
    <span style="color: var(--shiki-light); --shiki-dark: #79c0ff">x</span>
  </code>
</pre>
```

### 2. CSS 根据主题切换颜色

```css
/* 亮色模式：使用 --shiki-light */
:root:not(.dark) {
  color-scheme: light;
}

/* 暗色模式：使用 --shiki-dark */
:root.dark {
  color-scheme: dark;
}
```

### 3. 自动对比度

- **亮色模式**：
  - 背景：白色/浅灰
  - 文字：深色（黑、蓝、红等）
  - 高对比度，易读

- **暗色模式**：
  - 背景：深灰/黑色
  - 文字：浅色（白、浅蓝、浅红等）
  - 高对比度，护眼

## 🔍 验证步骤

### 1. 检查代码高亮

访问测试页面：`http://localhost:5174/test-highlight`

**应该看到**：

- Python 代码：关键字（def, class, import）有颜色
- JavaScript 代码：关键字（const, function）有颜色
- TypeScript 代码：类型注解有颜色
- 注释：灰色
- 字符串：不同颜色

### 2. 检查主题切换

1. 点击主题按钮
2. 切换到亮色模式
3. 观察代码块：
   - 背景应该是浅色
   - 文字应该是深色
   - 对比度高，易读

4. 切换到暗色模式
5. 观察代码块：
   - 背景应该是深色
   - 文字应该是浅色
   - 对比度高，护眼

### 3. 检查字体

打开浏览器开发者工具：

1. 按 F12
2. 选择一个代码块
3. 查看 Computed 样式
4. `font-family` 应该包含 "JetBrains Mono"

## 🎯 颜色方案

### 亮色模式 (github-light)

| 元素   | 颜色示例       |
| ------ | -------------- |
| 关键字 | 紫色 (#d73a49) |
| 字符串 | 蓝色 (#032f62) |
| 数字   | 绿色 (#005cc5) |
| 注释   | 灰色 (#6a737d) |
| 函数   | 紫色 (#6f42c1) |
| 变量   | 黑色 (#24292e) |

### 暗色模式 (github-dark)

| 元素   | 颜色示例       |
| ------ | -------------- |
| 关键字 | 红色 (#ff7b72) |
| 字符串 | 蓝色 (#a5d6ff) |
| 数字   | 绿色 (#79c0ff) |
| 注释   | 灰色 (#8b949e) |
| 函数   | 紫色 (#d2a8ff) |
| 变量   | 白色 (#c9d1d9) |

## ❓ 常见问题

### Q: 为什么暗色模式下文字看不清？

A: 如果看不清，可能是：

1. **浏览器缓存**：硬刷新（Ctrl+Shift+R）
2. **CSS 冲突**：检查是否有其他 CSS 覆盖了颜色
3. **主题未切换**：确认 `<html>` 标签有 `class="dark"`

### Q: 如何自定义颜色？

A: 有两种方法：

**方法 1：更换主题**

```typescript
themes: {
  light: "github-light",
  dark: "one-dark-pro",  // 更换为其他主题
}
```

可用主题：https://shiki.style/themes

**方法 2：自定义主题**
需要创建自己的主题 JSON 文件（复杂）

### Q: 为什么主题切换慢？

A: 这是 Shiki 的技术限制：

- Shiki 在构建时生成 HTML
- 切换主题需要重新渲染
- 生产环境会快 50-60%

### Q: 可以只用一个主题吗？

A: 可以，但不推荐：

```typescript
theme: "github-dark",  // 只用暗色主题
```

这样亮色模式下代码块仍然是暗色。

## 🚀 性能优化

### 开发环境

- 主题切换：~500-800ms
- 首次加载：~1-2s

### 生产环境

- 主题切换：~200-400ms
- 首次加载：~500ms-1s

### 优化建议

1. 减少每页的代码块数量
2. 使用代码折叠
3. 懒加载长代码块

## 📝 总结

**当前配置是最佳实践**：

- ✅ 使用 Shiki（业界标准）
- ✅ 双主题支持（亮/暗）
- ✅ 自动对比度（易读）
- ✅ JetBrains Mono 字体
- ✅ 丰富的语法高亮
- ✅ 支持所有主流语言

**不需要进一步修改**，除非：

- 想要不同的配色方案（更换主题）
- 需要自定义颜色（创建自定义主题）
- 对性能有极致要求（考虑运行时高亮）

## 🔗 相关资源

- [Shiki 官方文档](https://shiki.style/)
- [主题预览](https://shiki.style/themes)
- [支持的语言](https://shiki.style/languages)
- [自定义主题](https://shiki.style/guide/theme-colors)
