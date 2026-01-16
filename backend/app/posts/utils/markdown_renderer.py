"""
Markdown 渲染器设置

配置 markdown-it 的自定义渲染规则
"""

import re


def setup_markdown_renderer(md):
    """设置 markdown-it 的自定义渲染规则

    Args:
        md: MarkdownIt 实例
    """
    _setup_fence_renderer(md)
    _setup_html_renderer(md)
    _setup_heading_renderer(md)


def _setup_fence_renderer(md):
    """设置代码块渲染规则"""
    # 保存原始的 fence 渲染器
    default_fence = md.renderer.rules.get("fence")

    def custom_fence(tokens, idx, options, env):
        token = tokens[idx]
        info = token.info.strip() if token.info else ""
        lang = info.split()[0] if info else ""

        # Mermaid 图表特殊处理
        if lang == "mermaid":
            code = token.content.strip()
            return f'<div class="mermaid">\n{code}\n</div>\n'

        # 其他代码块使用默认渲染
        if default_fence:
            return default_fence(tokens, idx, options, env)

        # 如果没有默认渲染器，手动渲染
        code = token.content
        escaped = (
            code.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;")
        )
        if lang:
            return f'<pre><code class="language-{lang}">{escaped}</code></pre>\n'
        return f"<pre><code>{escaped}</code></pre>\n"

    md.renderer.rules["fence"] = custom_fence


def _setup_html_renderer(md):
    """设置 HTML 块渲染规则"""

    def custom_html_block(tokens, idx, options, env):
        """处理块级 HTML/JSX - 检测到 JSX 就不处理，用标记包裹"""
        token = tokens[idx]
        content = token.content

        # 检测是否是 JSX/TSX 语法
        if _is_jsx_syntax(content):
            # 用 base64 编码保存原始内容，避免转义问题
            import base64

            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
            # 用特殊标记包裹，前端识别后用 MDX 处理
            return (
                f'<div data-mdx-component="true" data-mdx-content="{encoded}"></div>\n'
            )

        # 普通 HTML，正常输出
        return content

    def custom_html_inline(tokens, idx, options, env):
        """处理行内 HTML/JSX - 检测到 JSX 就不处理，用标记包裹"""
        token = tokens[idx]
        content = token.content

        # 检测是否是 JSX/TSX 语法
        if _is_jsx_syntax(content):
            # 用 base64 编码保存原始内容
            import base64

            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
            # 用特殊标记包裹
            return (
                f'<span data-mdx-component="true" data-mdx-content="{encoded}"></span>'
            )

        # 普通 HTML，正常输出
        return content

    md.renderer.rules["html_block"] = custom_html_block
    md.renderer.rules["html_inline"] = custom_html_inline


def _setup_heading_renderer(md):
    """设置标题渲染规则，添加 ID"""
    # 用于生成唯一 slug 的计数器
    slug_counter = {}

    def custom_heading_open(tokens, idx, options, env):
        token = tokens[idx]

        # 获取标题文本（从下一个 token）
        if idx + 1 < len(tokens):
            inline_token = tokens[idx + 1]
            if inline_token.type == "inline" and inline_token.content:
                title = inline_token.content
                # 生成 slug
                slug = _generate_unique_slug(title, slug_counter)
                # 添加 id 属性
                token.attrSet("id", slug)

        # 手动渲染标签
        tag = token.tag
        attrs_list = []
        if hasattr(token, "attrs") and token.attrs:
            # token.attrs 是字典格式 {'id': 'value', 'class': 'value'}
            for key, value in token.attrs.items():
                attrs_list.append(f'{key}="{value}"')

        attrs_str = " " + " ".join(attrs_list) if attrs_list else ""
        return f"<{tag}{attrs_str}>"

    md.renderer.rules["heading_open"] = custom_heading_open


def _is_jsx_syntax(content: str) -> bool:
    """检测是否是 JSX/TSX 语法"""
    jsx_patterns = [
        r"style=\{\{",  # style={{...}}
        r"onClick=\{",  # onClick={...}
        r"onChange=\{",  # onChange={...}
        r"onSubmit=\{",  # onSubmit={...}
        r"className=",  # className (JSX 特有，HTML 用 class)
        r"=\{[^}]+\}",  # 任何属性={...}
    ]
    return any(re.search(pattern, content) for pattern in jsx_patterns)


def _generate_unique_slug(title: str, slug_counter: dict) -> str:
    """生成唯一 slug"""
    base_slug = re.sub(r"[^\w\s-]", "", title).strip().lower().replace(" ", "-")
    base_slug = re.sub(r"-+", "-", base_slug).strip("-")

    if not base_slug:
        base_slug = "heading"

    if base_slug not in slug_counter:
        slug_counter[base_slug] = 1
        return base_slug
    else:
        count = slug_counter[base_slug]
        slug_counter[base_slug] += 1
        return f"{base_slug}-{count}"
