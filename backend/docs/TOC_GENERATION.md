# 目录（TOC）生成优化说明

## 优化内容

### 1. ✅ 支持完整的 6 级标题

**原来**：只支持 h1-h3
**现在**：支持 h1-h6

```markdown
# H1 标题

## H2 标题

### H3 标题

#### H4 标题

##### H5 标题

###### H6 标题
```

---

### 2. ✅ 处理重复标题（避免 ID 冲突）

**问题**：多个相同标题会生成相同的 slug，导致 HTML ID 冲突

**解决方案**：自动添加数字后缀

```markdown
# 简介 → id: "简介"

## 简介 → id: "简介-1"

### 简介 → id: "简介-2"
```

**实现逻辑**：

```python
slug_counter = {}  # 记录每个 slug 出现次数

if base_slug not in slug_counter:
    slug_counter[base_slug] = 1
    return base_slug
else:
    count = slug_counter[base_slug]
    slug_counter[base_slug] += 1
    return f"{base_slug}-{count}"
```

---

### 3. ✅ 支持 Setext 风格标题

**ATX 风格**（原本支持）：

```markdown
# H1 标题

## H2 标题
```

**Setext 风格**（新增支持）：

```markdown
# H1 标题

## H2 标题
```

**兼容性**：两种风格可以混用

---

### 4. ✅ 优化 Slug 生成规则

#### 处理特殊字符

```markdown
# Hello World! → hello-world

# Python & FastAPI → python--fastapi

# 测试-标题\_123 → 测试-标题\_123
```

#### 处理多余连字符

```markdown
# 多个---连字符 → 多个-连字符

# ---开头和结尾--- → 开头和结尾
```

#### 处理多个空格

```markdown
# 空格 很多 空格 → 空格-很多-空格
```

#### 处理空标题

```markdown
# → heading (默认值)
```

---

## 完整示例

### 输入 MDX

```markdown
# 简介

这是第一个简介。

## 简介

这是第二个简介。

### 简介

这是第三个简介。

# H1 标题

## H2 标题

# Hello World!

## Python & FastAPI

### 测试-标题\_123
```

### 输出 TOC

```json
[
  { "id": "简介", "title": "简介", "level": 1 },
  { "id": "简介-1", "title": "简介", "level": 2 },
  { "id": "简介-2", "title": "简介", "level": 3 },
  { "id": "h1-标题", "title": "H1 标题", "level": 1 },
  { "id": "h2-标题", "title": "H2 标题", "level": 2 },
  { "id": "hello-world", "title": "Hello World!", "level": 1 },
  { "id": "python--fastapi", "title": "Python & FastAPI", "level": 2 },
  { "id": "测试-标题_123", "title": "测试-标题_123", "level": 3 }
]
```

---

## 前端使用建议

### 1. 渲染目录（支持嵌套）

```tsx
interface TocItem {
  id: string;
  title: string;
  level: number;
}

function TableOfContents({ toc }: { toc: TocItem[] }) {
  return (
    <nav className="toc">
      <ul>
        {toc.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 20}px` }}
          >
            <a href={`#${item.id}`}>{item.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### 2. 只显示前 3 级

```tsx
const filteredToc = toc.filter((item) => item.level <= 3);
```

### 3. 转换为树状结构

```tsx
function buildTocTree(toc: TocItem[]): TocNode[] {
  const tree: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const item of toc) {
    const node: TocNode = { ...item, children: [] };

    // 找到父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      tree.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return tree;
}
```

### 4. 高亮当前章节

```tsx
"use client";

import { useEffect, useState } from "react";

function TableOfContents({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -80% 0px" }
    );

    // 观察所有标题
    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <nav>
      {toc.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={activeId === item.id ? "active" : ""}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
```

---

## 性能考虑

### 时间复杂度

- **O(n)**：只遍历一次文本
- **O(1)**：slug 去重使用字典

### 空间复杂度

- **O(m)**：m 为标题数量
- **O(k)**：k 为不同 slug 数量

### 优化建议

1. 对于超长文档（>10000 行），考虑限制 TOC 条目数量
2. 前端可以懒加载深层级的目录
3. 使用虚拟滚动渲染大量目录项

---

## 已知限制

### 1. 不支持的 Markdown 语法

**内联 HTML 标题**：

```html
<h1>HTML 标题</h1>
<!-- ❌ 不会被识别 -->
```

**解决方案**：使用标准 Markdown 语法

### 2. 中文 Slug 的 URL 编码

中文 slug 在 URL 中会被编码：

```
#简介 → #%E7%AE%80%E4%BB%8B
```

**解决方案**：

- 前端使用 `decodeURIComponent()` 解码
- 或者在后端生成拼音 slug（需要额外库）

### 3. Emoji 处理

```markdown
# 🚀 快速开始 → 🚀-快速开始
```

Emoji 会被保留在 slug 中，可能导致兼容性问题。

**解决方案**：

```python
import emoji

def remove_emoji(text: str) -> str:
    return emoji.replace_emoji(text, replace='')
```

---

## 总结

### 优化前后对比

| 功能            | 优化前   | 优化后          |
| --------------- | -------- | --------------- |
| **标题级别**    | h1-h3    | h1-h6 ✅        |
| **重复标题**    | ID 冲突  | 自动添加后缀 ✅ |
| **Setext 风格** | ❌       | ✅              |
| **特殊字符**    | 简单处理 | 完善处理 ✅     |
| **空标题**      | 空 slug  | 默认值 ✅       |

### 剩余可优化项

1. **树状结构**：目前返回平面列表，前端需要自己转换
2. **拼音 Slug**：中文标题可以生成拼音 slug（需要 `pypinyin` 库）
3. **Emoji 处理**：可以选择移除或保留 emoji
4. **自定义 ID**：支持 `{#custom-id}` 语法自定义 slug

这些可以根据实际需求逐步添加。
