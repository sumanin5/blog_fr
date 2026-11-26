"""
内容解析器

提供 TOC 生成、阅读时间计算、摘要提取等功能
"""

import math
import re
from typing import Any, Dict, List


def generate_toc(content: str) -> List[Dict[str, Any]]:
    """生成目录

    Args:
        content: Markdown 内容

    Returns:
        目录列表，每项包含 id、title、level
    """
    toc = []
    slug_counter = {}
    lines = content.split("\n")
    in_code_block = False

    for line in lines:
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue

        if not in_code_block:
            match = re.match(r"^(#{1,6})\s+(.+)$", line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                slug = _generate_unique_slug(title, slug_counter)
                toc.append({"id": slug, "title": title, "level": level})

    return toc


_FRONTMATTER_RE = re.compile(r"^\ufeff?---\r?\n[\s\S]*?\r?\n---\r?\n?")
_FENCE_LINE_RE = re.compile(r"^\s*(```|~~~)")
_ESM_LINE_RE = re.compile(
    r"^(import\s.+\sfrom\s|import\s+[\"']|export\s+(?:const|let|var|function|default)\b)"
)
_CLOSING_TAG_RE = re.compile(r"</([A-Za-z][A-Za-z0-9_.]*)\s*>")
_OPENING_TAG_RE = re.compile(r"<([A-Za-z][A-Za-z0-9_.]*)(?=[\s/>])")
_INLINE_TAG_PREFIX_RE = re.compile(r"[A-Za-z0-9_$]")
_IMAGE_SYNTAX_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK_SYNTAX_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")


def _find_tag_end(text: str, start: int) -> int:
    """从 '<' 位置向后扫描匹配的 '>'，跳过引号字符串与 {...} 表达式括号。"""
    n = len(text)
    j = start + 1
    brace_depth = 0
    quote: str | None = None

    while j < n:
        ch = text[j]
        if quote:
            if ch == "\\" and j + 1 < n:
                j += 2
                continue
            if ch == quote:
                quote = None
            j += 1
            continue
        if ch in ('"', "'", "`"):
            quote = ch
            j += 1
            continue
        if ch == "{":
            brace_depth += 1
            j += 1
            continue
        if ch == "}" and brace_depth > 0:
            brace_depth -= 1
            j += 1
            continue
        if ch == ">" and brace_depth == 0:
            return j + 1
        j += 1

    return -1


def _find_matching_closing_tag(text: str, tag_name: str, start: int) -> int:
    """从开标签结束位置起查找对应的 `</tag_name>`，尊重围栏代码、行内代码、注释与同名嵌套。"""
    n = len(text)
    i = start
    depth = 1
    in_fence = False
    fence_marker = ""

    while i < n:
        if i == 0 or text[i - 1] == "\n":
            line_end = text.find("\n", i)
            if line_end == -1:
                line_end = n
            line = text[i:line_end]
            m_fence = _FENCE_LINE_RE.match(line)
            if m_fence:
                marker = m_fence.group(1)
                if not in_fence:
                    in_fence = True
                    fence_marker = marker
                elif marker == fence_marker:
                    in_fence = False
                    fence_marker = ""
                i = line_end + 1
                continue

        if in_fence:
            i += 1
            continue

        if text[i] == "`":
            tick_end = i
            while tick_end < n and text[tick_end] == "`":
                tick_end += 1
            ticks = text[i:tick_end]
            close_tick = text.find(ticks, tick_end)
            if close_tick != -1:
                i = close_tick + len(ticks)
                continue
            i = tick_end
            continue

        if text.startswith("<!--", i):
            end_comment = text.find("-->", i + 4)
            if end_comment != -1:
                i = end_comment + 3
                continue
        if text.startswith("{/*", i):
            end_comment = text.find("*/}", i + 3)
            if end_comment != -1:
                i = end_comment + 3
                continue

        if text[i] == "<":
            if i > 0 and _INLINE_TAG_PREFIX_RE.match(text[i - 1]):
                i += 1
                continue

            m_close = _CLOSING_TAG_RE.match(text, i)
            if m_close:
                if m_close.group(1) == tag_name:
                    depth -= 1
                    if depth == 0:
                        return m_close.end()
                i = m_close.end()
                continue

            m_open = _OPENING_TAG_RE.match(text, i)
            if m_open:
                tag_end = _find_tag_end(text, i)
                if tag_end != -1:
                    if (
                        m_open.group(1) == tag_name
                        and not text[i:tag_end].rstrip().endswith("/>")
                    ):
                        depth += 1
                    i = tag_end
                    continue

        i += 1

    return -1


def strip_mdx_components(content: str) -> str:
    """剥离 MDX 大写 JSX 组件、ESM import/export 及 HTML 标签壳，保留正文与围栏代码块。

    - 大写 JSX 组件（自闭合如 `<LayerStepper ... />` 与成对如 `<Tabs>...</Tabs>`）：整块忽略
    - 小写 HTML 容器标签（如 `<div className="...">` / `<p>`）：仅去掉标签与属性，保留内部正文
    - 代码围栏、行内代码与泛型写法（如 `Promise<User>`）：原样保留
    """
    if not content:
        return ""

    n = len(content)
    out: List[str] = []
    i = 0
    in_fence = False
    fence_marker = ""

    while i < n:
        if i == 0 or content[i - 1] == "\n":
            line_end = content.find("\n", i)
            if line_end == -1:
                line_end = n
            line = content[i:line_end]

            m_fence = _FENCE_LINE_RE.match(line)
            if m_fence:
                marker = m_fence.group(1)
                if not in_fence:
                    in_fence = True
                    fence_marker = marker
                elif marker == fence_marker:
                    in_fence = False
                    fence_marker = ""
                out.append(line)
                i = line_end
                if i < n:
                    out.append("\n")
                    i += 1
                continue

            if not in_fence and _ESM_LINE_RE.match(line):
                i = line_end + 1 if line_end < n else n
                continue

        if in_fence:
            out.append(content[i])
            i += 1
            continue

        if content[i] == "`":
            tick_end = i
            while tick_end < n and content[tick_end] == "`":
                tick_end += 1
            ticks = content[i:tick_end]
            close_tick = content.find(ticks, tick_end)
            if close_tick != -1:
                out.append(content[i : close_tick + len(ticks)])
                i = close_tick + len(ticks)
                continue
            out.append(ticks)
            i = tick_end
            continue

        if content.startswith("<!--", i):
            end_comment = content.find("-->", i + 4)
            if end_comment != -1:
                i = end_comment + 3
                continue
        if content.startswith("{/*", i):
            end_comment = content.find("*/}", i + 3)
            if end_comment != -1:
                i = end_comment + 3
                continue

        if content[i] == "<":
            if i > 0 and _INLINE_TAG_PREFIX_RE.match(content[i - 1]):
                out.append(content[i])
                i += 1
                continue

            m_close = _CLOSING_TAG_RE.match(content, i)
            if m_close:
                out.append(" ")
                i = m_close.end()
                continue

            m_open = _OPENING_TAG_RE.match(content, i)
            if m_open:
                tag_name = m_open.group(1)
                tag_end = _find_tag_end(content, i)
                if tag_end != -1:
                    self_closing = content[i:tag_end].rstrip().endswith("/>")
                    if tag_name[0].isupper():
                        if self_closing:
                            out.append("\n")
                            i = tag_end
                            continue
                        close_end = _find_matching_closing_tag(
                            content, tag_name, tag_end
                        )
                        if close_end != -1:
                            out.append("\n")
                            i = close_end
                            continue
                        # 未闭合的大写标识（如裸 <T>），按普通文本保留以免吞掉后续正文
                        out.append(content[i])
                        i += 1
                        continue

                    out.append(" ")
                    i = tag_end
                    continue

        out.append(content[i])
        i += 1

    return "".join(out)


def calculate_reading_time(content: str) -> int:
    """估算阅读时间（剥离 Frontmatter、MDX 组件、HTML 标签壳及图片/链接 URL 噪音）

    Args:
        content: Markdown 内容

    Returns:
        预计阅读时间（分钟）
    """
    cleaned = _FRONTMATTER_RE.sub("", content or "")
    cleaned = strip_mdx_components(cleaned)
    cleaned = _IMAGE_SYNTAX_RE.sub(" ", cleaned)
    cleaned = _LINK_SYNTAX_RE.sub(r"\1", cleaned)

    chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", cleaned))
    remaining_text = re.sub(r"[\u4e00-\u9fa5]", " ", cleaned)
    english_words = len(re.findall(r"\b\w+\b", remaining_text))
    total_count = chinese_chars + english_words
    minutes = math.ceil(total_count / 300)
    return max(1, minutes)


def generate_excerpt(markdown_content: str, length: int = 200) -> str:
    """从 Markdown 提取摘要（忽略代码围栏、MDX 组件与公式/标签噪音）

    Args:
        markdown_content: Markdown 内容
        length: 摘要最大长度

    Returns:
        摘要文本
    """
    content = _FRONTMATTER_RE.sub("", markdown_content or "")
    content = strip_mdx_components(content)
    content = re.sub(r"```.*?```", "", content, flags=re.DOTALL)
    content = re.sub(r"^#+\s+", "", content, flags=re.MULTILINE)
    content = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", "", content)
    content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", content)
    content = re.sub(r"\$\$.*?\$\$", "", content, flags=re.DOTALL)
    content = re.sub(r"\$[^$]+\$", "", content)
    content = re.sub(r"[*_~`]", "", content)
    # 兜底移除残留尖括号标签
    content = re.sub(r"<[^>]+>", "", content)
    content = re.sub(r"\s+", " ", content).strip()

    if len(content) <= length:
        return content
    return content[:length] + "..."


def _generate_unique_slug(title: str, slug_counter: dict) -> str:
    """生成唯一 slug

    Args:
        title: 标题文本
        slug_counter: slug 计数器

    Returns:
        唯一的 slug
    """
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
