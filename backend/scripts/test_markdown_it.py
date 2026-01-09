#!/usr/bin/env python3
"""测试 markdown-it-py 渲染"""

from markdown_it import MarkdownIt
from mdit_py_plugins.deflist import deflist_plugin
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin

# 初始化渲染器
md = (
    MarkdownIt("commonmark", {"html": True, "linkify": True, "typographer": True})
    .enable(["table", "strikethrough"])
    .use(footnote_plugin)
    .use(deflist_plugin)
    .use(tasklists_plugin)
)

# 测试内容
test_md = """
# 测试标题

这是**粗体**和*斜体*。

## 表格

| 列1 | 列2 |
|-----|-----|
| A   | B   |

## 数学公式（保留原样）

行内公式：<span class="math-inline">$E=mc^2$</span>

块级公式：
<div class="math-block">
$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
</div>

## Mermaid（保留原样）

<div class="mermaid">
graph TD
A-->B
</div>

## JSX 组件（保留原样）

<div data-component="CustomButton" data-props='{"onClick": "alert"}'>
  点击我
</div>

## 代码块

```python
def hello():
    print("Hello, World!")
```
"""

# 渲染
html = md.render(test_md)

print("=" * 60)
print("渲染结果：")
print("=" * 60)
print(html)
print("=" * 60)

# 检查关键内容是否保留
checks = [
    ('<span class="math-inline">', "数学公式标记"),
    ('<div class="mermaid">', "Mermaid 容器"),
    ("<CustomButton", "JSX 组件"),
    ("<table>", "表格"),
    ('<code class="language-python">', "代码块"),
]

print("\n检查结果：")
for pattern, name in checks:
    if pattern in html:
        print(f"✅ {name}: 保留")
    else:
        print(f"❌ {name}: 丢失")
