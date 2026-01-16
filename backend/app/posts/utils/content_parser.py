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


def calculate_reading_time(content: str) -> int:
    """估算阅读时间

    Args:
        content: Markdown 内容

    Returns:
        预计阅读时间（分钟）
    """
    chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", content))
    remaining_text = re.sub(r"[\u4e00-\u9fa5]", " ", content)
    english_words = len(re.findall(r"\b\w+\b", remaining_text))
    total_count = chinese_chars + english_words
    minutes = math.ceil(total_count / 300)
    return max(1, minutes)


def generate_excerpt(markdown_content: str, length: int = 200) -> str:
    """从 Markdown 提取摘要

    Args:
        markdown_content: Markdown 内容
        length: 摘要最大长度

    Returns:
        摘要文本
    """
    content = re.sub(r"```.*?```", "", markdown_content, flags=re.DOTALL)
    content = re.sub(r"^#+\s+", "", content, flags=re.MULTILINE)
    content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", content)
    content = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", "", content)
    content = re.sub(r"\$\$.*?\$\$", "", content, flags=re.DOTALL)
    content = re.sub(r"\$[^$]+\$", "", content)
    content = re.sub(r"[*_~`]", "", content)
    # 移除 HTML 标签
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
