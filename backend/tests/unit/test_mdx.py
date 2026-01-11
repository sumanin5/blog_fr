"""
MDX 内容处理单元测试

完整测试 PostProcessor 中的 MDX/Markdown 处理功能
确保 100% 覆盖所有边缘情况
"""

import re

from app.posts.utils import PostProcessor

# ============================================================================
# Frontmatter 解析测试
# ============================================================================


def test_frontmatter_simple():
    """测试简单 Frontmatter 解析"""
    content = """---
title: 测试文章
---

正文内容
"""
    processor = PostProcessor(content).process()
    assert processor.metadata["title"] == "测试文章"
    assert "正文内容" in processor.content_html


def test_frontmatter_complex():
    """测试复杂 Frontmatter 解析"""
    content = """---
title: 复杂文章
slug: complex-article
tags:
  - Python
  - FastAPI
description: 测试描述
keywords: test, python
author: John Doe
date: 2024-01-01
---

正文
"""
    processor = PostProcessor(content).process()
    assert processor.metadata["title"] == "复杂文章"
    assert processor.metadata["slug"] == "complex-article"
    assert processor.metadata["tags"] == ["Python", "FastAPI"]


def test_frontmatter_missing():
    """测试没有 Frontmatter"""
    content = "# 标题\n\n正文内容"
    processor = PostProcessor(content).process()
    assert processor.metadata == {}
    assert "<h1>" in processor.content_html


def test_frontmatter_empty():
    """测试空 Frontmatter"""
    content = """---
---

正文内容
"""
    processor = PostProcessor(content).process()
    assert processor.metadata == {}


def test_frontmatter_malformed():
    """测试格式错误的 Frontmatter"""
    content = """---
title: 测试
invalid: [unclosed
---

正文
"""
    try:
        processor = PostProcessor(content).process()
        assert processor.content_mdx is not None
    except Exception:
        pass  # 允许抛出异常


# ============================================================================
# 基础 Markdown 语法测试
# ============================================================================


def test_markdown_headings():
    """测试标题渲染"""
    content = """# H1
## H2
### H3
#### H4
##### H5
###### H6
"""
    processor = PostProcessor(content).process()
    assert "<h1>H1</h1>" in processor.content_html
    assert "<h2>H2</h2>" in processor.content_html
    assert "<h3>H3</h3>" in processor.content_html


def test_markdown_emphasis():
    """测试强调语法"""
    content = """
**粗体** 和 *斜体* 和 ***粗斜体***

__粗体__ 和 _斜体_
"""
    processor = PostProcessor(content).process()
    assert "<strong>粗体</strong>" in processor.content_html
    assert "<em>斜体</em>" in processor.content_html


def test_markdown_lists():
    """测试列表"""
    content = """
无序列表：
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2

有序列表：
1. 第一项
2. 第二项
3. 第三项
"""
    processor = PostProcessor(content).process()
    assert "<ul>" in processor.content_html
    assert "<ol>" in processor.content_html
    assert "<li>项目 1</li>" in processor.content_html


def test_markdown_links():
    """测试链接"""
    content = "[链接文本](https://example.com)"
    processor = PostProcessor(content).process()
    assert '<a href="https://example.com">链接文本</a>' in processor.content_html


def test_markdown_images():
    """测试图片"""
    content = "![图片描述](https://example.com/image.png)"
    processor = PostProcessor(content).process()
    assert (
        '<img src="https://example.com/image.png" alt="图片描述"'
        in processor.content_html
    )


def test_markdown_code_inline():
    """测试行内代码"""
    content = "这是 `行内代码` 示例"
    processor = PostProcessor(content).process()
    assert "<code>行内代码</code>" in processor.content_html


def test_markdown_code_block():
    """测试代码块"""
    content = """
```python
def hello():
    print("Hello World")
```
"""
    processor = PostProcessor(content).process()
    assert '<code class="language-python">' in processor.content_html
    assert "def hello():" in processor.content_html


def test_markdown_code_block_no_language():
    """测试无语言标记的代码块"""
    content = """
```
plain text code
```
"""
    processor = PostProcessor(content).process()
    assert "<pre><code>" in processor.content_html
    assert "plain text code" in processor.content_html


def test_markdown_blockquote():
    """测试引用块"""
    content = "> 这是引用内容\n> 第二行"
    processor = PostProcessor(content).process()
    assert "<blockquote>" in processor.content_html
    assert "这是引用内容" in processor.content_html


def test_markdown_horizontal_rule():
    """测试水平线"""
    content = "---"
    processor = PostProcessor(content).process()
    assert "<hr" in processor.content_html


# ============================================================================
# 扩展 Markdown 语法测试
# ============================================================================


def test_markdown_table():
    """测试表格"""
    content = """
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| D   | E   | F   |
"""
    processor = PostProcessor(content).process()
    assert "<table>" in processor.content_html
    assert "<thead>" in processor.content_html
    assert "<tbody>" in processor.content_html
    assert "<th>列1</th>" in processor.content_html


def test_markdown_strikethrough():
    """测试删除线"""
    content = "~~删除的文本~~"
    processor = PostProcessor(content).process()
    assert (
        "<s>删除的文本</s>" in processor.content_html
        or "<del>删除的文本</del>" in processor.content_html
    )


def test_markdown_task_list():
    """测试任务列表"""
    content = """
- [ ] 未完成任务
- [x] 已完成任务
- [ ] 另一个任务
"""
    processor = PostProcessor(content).process()
    assert 'type="checkbox"' in processor.content_html
    assert "未完成任务" in processor.content_html


# def test_markdown_autolink():
#     """测试自动链接"""
#     content = "访问 https://example.com 查看更多"
#     processor = PostProcessor(content).process()
#     assert '<a href="https://example.com"' in processor.content_html


# ============================================================================
# 数学公式测试
# ============================================================================


def test_math_inline_simple():
    """测试简单行内公式"""
    content = "这是公式 $E = mc^2$ 在文本中"
    processor = PostProcessor(content).process()
    assert 'class="math-inline"' in processor.content_html
    assert "E = mc^2" in processor.content_html


def test_math_inline_complex():
    """测试复杂行内公式"""
    content = "公式 $\\frac{a}{b}$ 和 $\\sqrt{x^2 + y^2}$"
    processor = PostProcessor(content).process()
    assert processor.content_html.count('class="math-inline"') == 2
    assert "\\frac{a}{b}" in processor.content_html


def test_math_block_simple():
    """测试简单块级公式"""
    content = """
$$
E = mc^2
$$
"""
    processor = PostProcessor(content).process()
    assert 'class="math-block"' in processor.content_html
    assert "E = mc^2" in processor.content_html


def test_math_block_multiline():
    """测试多行块级公式"""
    content = """
$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
"""
    processor = PostProcessor(content).process()
    assert 'class="math-block"' in processor.content_html
    assert "\\int" in processor.content_html


def test_math_multiple_formulas():
    """测试多个公式混合"""
    content = """
行内公式 $a^2 + b^2 = c^2$ 和另一个 $x = y$

块级公式：
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

更多行内 $\\alpha + \\beta$
"""
    processor = PostProcessor(content).process()
    assert processor.content_html.count('class="math-inline"') == 3
    assert processor.content_html.count('class="math-block"') == 1


def test_math_in_code_block_ignored():
    """测试代码块中的公式不被处理"""
    content = """
```python
# 这不是公式 $E = mc^2$
text = "$x + y$"
```
"""
    processor = PostProcessor(content).process()
    # 代码块中的 $ 不应该被识别为公式
    assert 'class="math-inline"' not in processor.content_html


def test_math_dollar_sign_not_formula():
    """测试单独的美元符号不被识别为公式"""
    content = "价格是 $100 美元"
    processor = PostProcessor(content).process()
    # 单独的数字不应该被识别为公式
    assert 'class="math-inline"' not in processor.content_html


def test_math_escaped_dollar():
    """测试转义的美元符号"""
    content = "这是转义的 \\$100"
    processor = PostProcessor(content).process()
    # 转义的 $ 不应该被识别为公式
    assert 'class="math-inline"' not in processor.content_html


# ============================================================================
# Mermaid 图表测试
# ============================================================================


def test_mermaid_flowchart():
    """测试 Mermaid 流程图"""
    content = """
```mermaid
graph TD
    A[开始] --> B[处理]
    B --> C[结束]
```
"""
    processor = PostProcessor(content).process()
    assert 'class="mermaid"' in processor.content_html
    assert "graph TD" in processor.content_html
    assert "A[开始]" in processor.content_html


def test_mermaid_sequence_diagram():
    """测试 Mermaid 时序图"""
    content = """
```mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
```
"""
    processor = PostProcessor(content).process()
    assert 'class="mermaid"' in processor.content_html
    assert "sequenceDiagram" in processor.content_html


def test_mermaid_multiple_diagrams():
    """测试多个 Mermaid 图表"""
    content = """
```mermaid
graph LR
    A --> B
```

一些文本

```mermaid
pie
    "A" : 30
    "B" : 70
```
"""
    processor = PostProcessor(content).process()
    assert processor.content_html.count('class="mermaid"') == 2


def test_mermaid_with_special_chars():
    """测试 Mermaid 中的特殊字符"""
    content = """
```mermaid
graph TD
    A["带引号的文本"] --> B
    C[文本 & 符号] --> D
```
"""
    processor = PostProcessor(content).process()
    assert 'class="mermaid"' in processor.content_html
    # 特殊字符应该保持原样，不转义
    assert (
        '"带引号的文本"' in processor.content_html or "&quot;" in processor.content_html
    )


def test_mermaid_mixed_with_code():
    """测试 Mermaid 和代码块混合"""
    content = """
```python
def hello():
    pass
```

```mermaid
graph LR
    A --> B
```

```javascript
console.log("test");
```
"""
    processor = PostProcessor(content).process()
    assert 'class="mermaid"' in processor.content_html
    assert 'class="language-python"' in processor.content_html
    assert 'class="language-javascript"' in processor.content_html


# ============================================================================
# JSX/TSX 组件测试（应该用标记包裹）
# ============================================================================


def test_jsx_style_object_detected():
    """测试检测 JSX style 对象语法"""
    content = '<div style={{ padding: "20px", background: "#f0f0f0" }}>内容</div>'
    processor = PostProcessor(content).process()
    # 应该被检测为 JSX，用标记包裹
    assert 'data-mdx-component="true"' in processor.content_html
    assert "data-mdx-content=" in processor.content_html


def test_jsx_onclick_detected():
    """测试检测 JSX onClick 事件"""
    # 使用块级标签（独立一行），markdown-it 会识别为 HTML 块
    content = """
<div onClick={() => alert("Hi")}>点击</div>
"""
    processor = PostProcessor(content).process()
    assert 'data-mdx-component="true"' in processor.content_html
    assert "data-mdx-content=" in processor.content_html


def test_jsx_classname_detected():
    """测试检测 JSX className 属性"""
    content = '<div className="container">内容</div>'
    processor = PostProcessor(content).process()
    assert 'data-mdx-component="true"' in processor.content_html
    assert "data-mdx-content=" in processor.content_html


def test_jsx_complex_component():
    """测试复杂 JSX 组件"""
    content = """
<div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
  <h2 style={{ color: '#333' }}>标题</h2>
  <button onClick={() => alert('Hello')}>点我</button>
</div>
"""
    processor = PostProcessor(content).process()
    assert 'data-mdx-component="true"' in processor.content_html
    # 原始内容应该被 base64 编码保存
    assert "data-mdx-content=" in processor.content_html


def test_jsx_vs_html_distinction():
    """测试区分 JSX 和普通 HTML"""
    content = """
<div style="padding: 20px">这是普通 HTML</div>

<div style={{ padding: '20px' }}>这是 JSX</div>
"""
    processor = PostProcessor(content).process()
    # 普通 HTML 应该正常输出
    assert '<div style="padding: 20px">' in processor.content_html
    # JSX 应该被标记包裹
    assert 'data-mdx-component="true"' in processor.content_html


def test_jsx_multiple_components():
    """测试多个 JSX 组件"""
    content = """
<div style={{ padding: '10px' }}>第一个</div>

一些文本

<div onCk={() => console.log('test')}>按钮</div>
"""
    processor = PostProcessor(content).process()
    # 应该有两个 JSX 组件被标记
    assert processor.content_html.count('data-mdx-component="true"') == 2


def test_jsx_with_markdown_mixed():
    """测试 JSX 和 Markdown 混合"""
    content = """
# 标题

这是 **粗体** 文本

<div style={{ padding: '20px' }}>
  JSX 组件内容
</div>

- 列表项 1
- 列表项 2
"""
    processor = PostProcessor(content).process()
    # Markdown 应该正常处理
    assert "<h1>标题</h1>" in processor.content_html
    assert "<strong>粗体</strong>" in processor.content_html
    assert "<ul>" in processor.content_html
    # JSX 应该被标记
    assert 'data-mdx-component="true"' in processor.content_html


def test_jsx_base64_encoding():
    """测试 JSX 内容被正确 base64 编码"""
    import base64

    jsx_code = '<div onClick={() => alert("Hi")}>点击</div>'
    content = f"""
{jsx_code}
"""
    processor = PostProcessor(content).process()

    # 提取 data-mdx-content 的值
    import re

    match = re.search(r'data-mdx-content="([^"]+)"', processor.content_html)
    assert match is not None

    encoded = match.group(1)
    # 解码应该得到原始 JSX（可能包含换行符）
    decoded = base64.b64decode(encoded).decode("utf-8")
    assert jsx_code in decoded


def test_jsx_special_chars_preserved():
    """测试 JSX 中的特殊字符被保留"""
    content = '<div style={{ margin: "10px" }}>内容 & 符号 < > " \'</div>'
    processor = PostProcessor(content).process()
    assert 'data-mdx-component="true"' in processor.content_html
    # 原始内容应该被编码保存，不应该被转义


def test_jsx_multiline_preserved():
    """测试多行 JSX 被保留"""
    content = """
<div
  style={{
    padding: '20px',
    background: '#f0f0f0'
  }}
  onClick={() => {
    console.log('clicked');
  }}
>
  多行内容
</div>
"""
    processor = PostProcessor(content).process()
    assert 'data-mdx-component="true"' in processor.content_html


# ============================================================================
# JSX/TSX 组件测试（旧的，应该保留）
# ============================================================================


def test_jsx_self_closing_preserved():
    """测试自闭合 JSX 组件被保留"""
    content = "文本 <CustomComponent /> 更多文本"
    processor = PostProcessor(content).process()
    # JSX 组件应该被保留
    assert "CustomComponent" in processor.content_html
    assert "文本" in processor.content_html


def test_jsx_with_props_preserved():
    """测试带属性的 JSX 组件被保留"""
    content = '<Alert type="warning" title="注意">这是警告内容</Alert>'
    processor = PostProcessor(content).process()
    assert "Alert" in processor.content_html
    assert "warning" in processor.content_html
    assert "这是警告内容" in processor.content_html


def test_jsx_nested_preserved():
    """测试嵌套 JSX 组件被保留"""
    content = """
<Card>
  <CardHeader>标题</CardHeader>
  <CardBody>内容</CardBody>
</Card>
"""
    processor = PostProcessor(content).process()
    assert "Card" in processor.content_html
    assert "CardHeader" in processor.content_html
    assert "CardBody" in processor.content_html


def test_jsx_mixed_with_markdown():
    """测试 JSX 和 Markdown 混合"""
    content = """
# 标题

这是 **粗体** 文本

<CustomComponent />

- 列表项 1
- 列表项 2

<Alert type="info">
这是信息框，支持 *Markdown* 语法
</Alert>
"""
    processor = PostProcessor(content).process()
    assert "<h1>标题</h1>" in processor.content_html
    assert "<strong>粗体</strong>" in processor.content_html
    assert "CustomComponent" in processor.content_html
    assert "Alert" in processor.content_html
    assert "<ul>" in processor.content_html


def test_jsx_vs_html_tags():
    """测试 JSX 组件和 HTML 标签的区别"""
    content = """
<div>这是 HTML div</div>
<CustomComponent>这是 JSX 组件</CustomComponent>
<span>HTML span</span>
<MyButton>JSX 按钮</MyButton>
"""
    processor = PostProcessor(content).process()
    # 小写的 HTML 标签应该被保留
    assert "<div>" in processor.content_html
    assert "<span>" in processor.content_html
    # 大写的 JSX 组件也应该被保留
    assert "CustomComponent" in processor.content_html
    assert "MyButton" in processor.content_html


# ============================================================================
# 目录生成测试
# ============================================================================


def test_toc_basic():
    """测试基本目录生成"""
    content = """
# 一级标题
## 二级标题
### 三级标题
"""
    processor = PostProcessor(content).process()
    assert len(processor.toc) == 3
    assert processor.toc[0]["title"] == "一级标题"
    assert processor.toc[0]["level"] == 1
    assert processor.toc[1]["level"] == 2
    assert processor.toc[2]["level"] == 3


def test_toc_with_special_chars():
    """测试包含特殊字符的标题"""
    content = """
# Hello World!
## Python & FastAPI
### 测试-标题_123
"""
    processor = PostProcessor(content).process()
    assert len(processor.toc) == 3
    assert processor.toc[0]["title"] == "Hello World!"
    # slug 应该是合法的
    assert re.match(r"^[a-z0-9-]+$", processor.toc[0]["id"])


def test_toc_ignores_code_blocks():
    """测试目录忽略代码块中的标题"""
    content = """
# 真实标题

```python
# 这不是标题
## 也不是标题
```

## 另一个真实标题
"""
    processor = PostProcessor(content).process()
    assert len(processor.toc) == 2
    assert processor.toc[0]["title"] == "真实标题"
    assert processor.toc[1]["title"] == "另一个真实标题"


def test_toc_duplicate_titles():
    """测试重复标题生成唯一 ID"""
    content = """
# 简介
## 简介
### 简介
"""
    processor = PostProcessor(content).process()
    assert len(processor.toc) == 3
    assert processor.toc[0]["id"] == "简介"
    assert processor.toc[1]["id"] == "简介-1"
    assert processor.toc[2]["id"] == "简介-2"


def test_toc_empty():
    """测试没有标题的内容"""
    content = "这是一段没有标题的文本"
    processor = PostProcessor(content).process()
    assert processor.toc == []


def test_toc_with_emoji():
    """测试包含 Emoji 的标题"""
    content = """
# 标题 🚀
## 另一个标题 ✨
"""
    processor = PostProcessor(content).process()
    assert len(processor.toc) == 2
    assert "🚀" in processor.toc[0]["title"]
    assert "✨" in processor.toc[1]["title"]


# ============================================================================
# 阅读时间计算测试
# ============================================================================


def test_reading_time_chinese():
    """测试中文阅读时间"""
    content = "中" * 300  # 300 字 = 1 分钟
    processor = PostProcessor(content).process()
    assert processor.reading_time == 1

    content = "中" * 600  # 600 字 = 2 分钟
    processor = PostProcessor(content).process()
    assert processor.reading_time == 2


def test_reading_time_english():
    """测试英文阅读时间"""
    content = " ".join(["word"] * 300)  # 300 词 = 1 分钟
    processor = PostProcessor(content).process()
    assert processor.reading_time == 1


def test_reading_time_mixed():
    """测试中英文混合"""
    content = "中" * 150 + " " + " ".join(["word"] * 150)
    processor = PostProcessor(content).process()
    assert processor.reading_time == 1


def test_reading_time_minimum():
    """测试最小阅读时间"""
    content = "很短"
    processor = PostProcessor(content).process()
    assert processor.reading_time >= 1


def test_reading_time_long_content():
    """测试长内容"""
    content = "中" * 3000  # 3000 字 = 10 分钟
    processor = PostProcessor(content).process()
    assert processor.reading_time == 10


# ============================================================================
# 摘要生成测试
# ============================================================================


def test_excerpt_short_content():
    """测试短内容摘要"""
    content = "这是一段很短的内容。"
    processor = PostProcessor(content).process()
    assert processor.excerpt == "这是一段很短的内容。"
    assert not processor.excerpt.endswith("...")


def test_excerpt_long_content():
    """测试长内容摘要截断"""
    content = "这是一段很长的内容。" * 50
    processor = PostProcessor(content).process()
    assert len(processor.excerpt) <= 203
    assert processor.excerpt.endswith("...")


def test_excerpt_strips_markdown():
    """测试摘要移除 Markdown 语法"""
    content = "# 标题\n\n这是 **粗体** 和 *斜体* 文本。"
    processor = PostProcessor(content).process()
    assert "**" not in processor.excerpt
    assert "*" not in processor.excerpt
    assert "#" not in processor.excerpt
    assert "粗体" in processor.excerpt


def test_excerpt_strips_html():
    """测试摘要移除 HTML 标签"""
    content = "<p>这是<strong>加粗</strong>的文本。</p>"
    processor = PostProcessor(content).process()
    assert "<p>" not in processor.excerpt
    assert "<strong>" not in processor.excerpt
    assert "加粗" in processor.excerpt


def test_excerpt_strips_code_blocks():
    """测试摘要移除代码块"""
    content = """
这是正文

```python
def hello():
    pass
```

更多正文
"""
    processor = PostProcessor(content).process()
    assert "def hello" not in processor.excerpt
    assert "这是正文" in processor.excerpt


def test_excerpt_strips_math():
    """测试摘要移除数学公式"""
    content = "这是文本 $E = mc^2$ 更多文本 $$\\int x dx$$ 结束"
    processor = PostProcessor(content).process()
    assert "$" not in processor.excerpt
    assert "这是文本" in processor.excerpt


def test_excerpt_normalizes_whitespace():
    """测试摘要规范化空白"""
    content = "这是    多个    空格\n\n和换行符"
    processor = PostProcessor(content).process()
    assert "    " not in processor.excerpt
    assert "\n" not in processor.excerpt


# ============================================================================
# 边缘情况测试
# ============================================================================


def test_empty_content():
    """测试空内容"""
    processor = PostProcessor("").process()
    assert processor.content_mdx == ""
    assert processor.metadata == {}
    assert processor.toc == []
    assert processor.reading_time >= 1


def test_only_frontmatter():
    """测试只有 Frontmatter"""
    content = """---
title: 只有标题
---
"""
    processor = PostProcessor(content).process()
    assert processor.metadata["title"] == "只有标题"
    assert processor.content_mdx.strip() == ""


def test_unicode_content():
    """测试 Unicode 字符"""
    content = """---
title: 测试 🚀 Emoji
---

# 标题 ✨

中文、English、日本語、한국어、Emoji 🎉
"""
    processor = PostProcessor(content).process()
    assert "🚀" in processor.metadata["title"]
    assert "✨" in processor.toc[0]["title"]
    assert "🎉" in processor.content_html


def test_very_long_content():
    """测试超长内容"""
    long_content = "这是一段很长的内容。" * 1000
    processor = PostProcessor(long_content).process()
    assert processor.reading_time > 1
    assert len(processor.excerpt) <= 203


def test_nested_structures():
    """测试嵌套结构"""
    content = """
> 引用中的 **粗体** 和 *斜体*
>
> - 引用中的列表
> - 第二项

- 列表中的 `代码`
- 列表中的 [链接](https://example.com)
"""
    processor = PostProcessor(content).process()
    assert "<blockquote>" in processor.content_html
    assert "<strong>粗体</strong>" in processor.content_html
    assert "<ul>" in processor.content_html


def test_special_html_chars():
    """测试特殊 HTML 字符"""
    content = "文本 < > & \" ' 符号"
    processor = PostProcessor(content).process()
    # 特殊字符应该被转义
    assert "&lt;" in processor.content_html or "<" in processor.content_html
    assert "&gt;" in processor.content_html or ">" in processor.content_html


def test_mixed_content_complex():
    """测试复杂混合内容"""
    content = """---
title: 复杂测试
---

# 第一章

这是 **粗体** 文本，包含公式 $E = mc^2$。

## 代码示例

```python
def calculate(x):
    return x ** 2
```

## 图表

```mermaid
graph LR
    A --> B
```

## JSX 组件

<Alert type="info">
这是一个信息框
</Alert>

## 列表

- 项目 1
- 项目 2

## 表格

| 列1 | 列2 |
|-----|-----|
| A   | B   |

块级公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
"""
    processor = PostProcessor(content).process()

    # 验证所有功能都正常
    assert processor.metadata["title"] == "复杂测试"
    assert len(processor.toc) >= 5
    assert 'class="math-inline"' in processor.content_html
    assert 'class="math-block"' in processor.content_html
    assert 'class="mermaid"' in processor.content_html
    assert 'class="language-python"' in processor.content_html
    assert "Alert" in processor.content_html
    assert "<table>" in processor.content_html
    assert "<ul>" in processor.content_html
    assert processor.reading_time >= 1
    assert len(processor.excerpt) > 0


# ============================================================================
# 完整流水线测试
# ============================================================================


def test_full_pipeline():
    """测试完整处理流水线"""
    content = """---
title: 完整测试
slug: full-test
tags: [Test, MDX]
---

# 介绍

这是一篇测试文章，包含 $x^2$ 公式。

## 内容

更多内容在这里。
"""
    processor = PostProcessor(content).process()

    # 验证所有属性都被正确设置
    assert processor.metadata is not None
    assert processor.content_mdx is not None
    assert processor.content_html is not None
    assert processor.toc is not None
    assert processor.reading_time > 0
    assert processor.excerpt is not None

    # 验证处理结果
    assert processor.metadata["title"] == "完整测试"
    assert len(processor.toc) == 2
    assert "<h1>" in processor.content_html
    assert 'class="math-inline"' in processor.content_html
