# MDX 编辑器滚动同步实现

## 问题描述

原始编辑器存在以下问题：

1. 编辑器和预览区域没有固定高度，导致内容超出后产生大量留白
2. 滚动条在整个页面上，而不是在各自区域内
3. 左右两边滚动不同步，难以快速定位和修改

## 解决方案

### 1. 固定高度布局

使用 Flexbox 布局，确保编辑器和预览区域占满剩余空间：

```tsx
<div className="flex h-screen flex-col">
  {/* 顶部工具栏 - 固定高度 */}
  <div className="border-b">...</div>

  {/* 主编辑区域 - 占满剩余空间 */}
  <div className="flex flex-1 overflow-hidden">
    {/* 编辑器 */}
    <div className="flex flex-1 flex-col">
      <div className="shrink-0">标题栏</div>
      <textarea className="flex-1 overflow-auto" />
    </div>

    {/* 预览 */}
    <div className="flex flex-1 flex-col">
      <div className="shrink-0">标题栏</div>
      <div className="flex-1 overflow-auto">内容</div>
    </div>
  </div>

  {/* 底部状态栏 - 固定高度 */}
  <div className="border-t">...</div>
</div>
```

关键 CSS 类：

- `h-screen`：整个容器占满视口高度
- `flex-1`：编辑器和预览区域平分空间
- `overflow-hidden`：父容器隐藏溢出
- `overflow-auto`：子元素内部滚动
- `shrink-0`：标题栏不收缩

### 2. 同步滚动实现

使用 refs 和滚动事件监听器实现双向同步：

```tsx
const editorRef = useRef<HTMLTextAreaElement>(null);
const previewRef = useRef<HTMLDivElement>(null);
const syncingRef = useRef(false); // 防止循环触发

// 编辑器滚动 -> 预览滚动
const handleEditorScroll = () => {
  if (syncingRef.current || !editorRef.current || !previewRef.current) return;

  syncingRef.current = true;
  const editor = editorRef.current;
  const preview = previewRef.current;

  // 计算滚动百分比
  const scrollPercentage =
    editor.scrollTop / (editor.scrollHeight - editor.clientHeight);

  // 同步到预览区域
  preview.scrollTop =
    scrollPercentage * (preview.scrollHeight - preview.clientHeight);

  setTimeout(() => {
    syncingRef.current = false;
  }, 10);
};

// 预览滚动 -> 编辑器滚动（同理）
const handlePreviewScroll = () => {
  /* ... */
};
```

### 3. 防止循环触发

使用 `syncingRef` 标志位防止滚动事件相互触发：

```
用户滚动编辑器
  ↓
handleEditorScroll 触发
  ↓
设置 syncingRef = true
  ↓
同步预览区域滚动
  ↓
预览滚动触发 handlePreviewScroll
  ↓
检测到 syncingRef = true，直接返回（不处理）
  ↓
10ms 后重置 syncingRef = false
```

## 滚动百分比计算

```tsx
// 当前滚动位置 / 可滚动的总距离
const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

// scrollTop: 当前滚动位置
// scrollHeight: 内容总高度
// clientHeight: 可见区域高度
// scrollHeight - clientHeight: 可滚动的最大距离
```

## 优化建议

### 1. 节流优化

如果滚动事件触发过于频繁，可以添加节流：

```tsx
import { throttle } from "lodash";

const handleEditorScroll = throttle(() => {
  // 滚动同步逻辑
}, 16); // 约 60fps
```

### 2. 行号对齐

更精确的同步可以基于行号而不是百分比：

```tsx
// 计算编辑器当前行号
const lineHeight = 20; // 行高
const currentLine = Math.floor(editor.scrollTop / lineHeight);

// 找到预览中对应的元素
const targetElement = preview.querySelector(`[data-line="${currentLine}"]`);
if (targetElement) {
  targetElement.scrollIntoView({ block: "start", behavior: "smooth" });
}
```

### 3. 平滑滚动

添加 CSS 平滑滚动：

```css
.editor,
.preview {
  scroll-behavior: smooth;
}
```

或在 JavaScript 中使用：

```tsx
preview.scrollTo({
  top: targetScrollTop,
  behavior: "smooth",
});
```

## 注意事项

1. **性能**：滚动事件触发频繁，避免在处理函数中执行重计算
2. **边界情况**：处理内容为空或很短的情况
3. **移动端**：移动端可能需要禁用同步滚动，因为触摸滚动体验不同
4. **异步渲染**：预览内容异步渲染时，scrollHeight 可能不准确，需要等待渲染完成

## 相关文件

- `frontend/src/pages/MDXEditor.tsx` - 编辑器组件实现
