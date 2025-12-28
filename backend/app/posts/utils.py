"""
文章处理器工具类

负责 MDX 内容的解析、预处理、HTML 转换、TOC 生成等“脏活累活”
"""

import math
import re
from typing import Any, Dict, List

import frontmatter
import latex2mathml.converter
import mistune


class PostProcessor:
    """
    MDX 文章处理器

    功能：
    1. 解析 Frontmatter (YAML)
    2. 生成 TOC (目录)
    3. 估计阅读时间
    4. 将 LaTeX 公式转换为 MathML (用于 content_html)
    5. 生成摘要 (Excerpt)
    """

    def __init__(self, raw_content: str):
        self.raw_content = raw_content
        self.metadata: Dict[str, Any] = {}
        self.content_mdx: str = ""
        self.content_html: str = ""
        self.toc: List[Dict[str, Any]] = []
        self.reading_time: int = 0
        self.excerpt: str = ""

        # 初始化 mistune 渲染器 (纯净模式，不产生复杂 class)
        self.markdown_renderer = mistune.create_markdown(escape=False)

    def process(self) -> "PostProcessor":
        """执行完整处理流水线"""
        # 1. 拆分 Frontmatter 和正文
        post_data = frontmatter.loads(self.raw_content)
        self.metadata = post_data.metadata
        self.content_mdx = post_data.content

        # 2. 生成目录 (基于原始正文，避免处理 HTML 后的干扰)
        self.toc = self._generate_toc(self.content_mdx)

        # 3. 计算阅读时间
        self.reading_time = self._calculate_reading_time(self.content_mdx)

        # 4. 生成 content_html (包含公式转换)
        # 注意：这里我们先处理公式，再过 Markdown 渲染器
        processed_md = self._convert_latex_to_mathml(self.content_mdx)
        # 过滤掉常见的 JSX 标签，防止 HTML 渲染错乱 (简单正则过滤)
        processed_md = self._strip_jsx_tags(processed_md)
        self.content_html = self.markdown_renderer(processed_md)

        # 5. 生成摘要
        self.excerpt = self._generate_excerpt(self.content_html)

        return self

    def _generate_toc(self, content: str) -> List[Dict[str, Any]]:
        """
        生成目录树
        只识别 #, ##, ### (h1, h2, h3)
        """
        toc = []
        # 匹配以 # 开头的行，过滤掉代码块内的内容
        lines = content.split("\n")
        in_code_block = False

        for line in lines:
            if line.startswith("```"):
                in_code_block = not in_code_block
                continue

            if not in_code_block:
                match = re.match(r"^(#{1,3})\s+(.+)$", line)
                if match:
                    level = len(match.group(1))
                    title = match.group(2).strip()
                    # 简单生成 slug
                    slug = (
                        re.sub(r"[^\w\s-]", "", title).strip().lower().replace(" ", "-")
                    )
                    toc.append({"id": slug, "title": title, "level": level})
        return toc

    def _calculate_reading_time(self, content: str) -> int:
        """
        估算阅读时间
        中文字符算 1 个字，英文单词算 1 个字
        平均阅读速度 300/min
        """
        # 匹配中文字符
        chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", content))
        # 匹配英文单词 (去掉中文后)
        remaining_text = re.sub(r"[\u4e00-\u9fa5]", " ", content)
        english_words = len(re.findall(r"\b\w+\b", remaining_text))

        total_count = chinese_chars + english_words
        minutes = math.ceil(total_count / 300)
        return max(1, minutes)

    def _convert_latex_to_mathml(self, content: str) -> str:
        """
        将 LaTeX 公式 ($...$ 和 $$...$$) 转换为 MathML
        从而前端不需要加载 KaTeX 即可预览公式
        """

        # 1. 处理块级公式 $$ ... $$
        def replace_block(match):
            latex = match.group(1).strip()
            try:
                # 添加 display=block 样式
                mathml = latex2mathml.converter.convert(latex)
                return f'<div class="math-block">{mathml}</div>'
            except:
                return f"$$\n{latex}\n$$"

        content = re.sub(r"\$\$(.*?)\$\$", replace_block, content, flags=re.DOTALL)

        # 2. 处理行内公式 $ ... $
        def replace_inline(match):
            latex = match.group(1).strip()
            try:
                return latex2mathml.converter.convert(latex)
            except:
                return f"${latex}$"

        # 注意：行内公式正则要小心不要误匹配普通美元符号
        content = re.sub(r"(?<!\\)\$([^$\n]+?)\$", replace_inline, content)

        return content

    def _strip_jsx_tags(self, content: str) -> str:
        """
        简单移除 MDX 中的自定义组件标签，例如 <CustomComponent />
        只保留内容，确保 content_html 的纯净度用于 SEO
        """
        # 移除自闭合标签 <Tag />
        content = re.sub(r"<[A-Z][a-zA-Z0-9]*\s*[^>]*?/>", "", content)
        # 移除成对标签 <Tag>...</Tag> (暂不移除内容，只移除标签)
        content = re.sub(r"</?[A-Z][a-zA-Z0-9]*\s*[^>]*?>", "", content)
        return content

    def _generate_excerpt(self, html_content: str, length: int = 200) -> str:
        """
        从生成的 HTML 中剥离标签并截取摘要
        """
        # 简单剥离 HTML 标签
        plain_text = re.sub(r"<[^>]+>", "", html_content)
        plain_text = re.sub(r"\s+", " ", plain_text).strip()

        if len(plain_text) <= length:
            return plain_text
        return plain_text[:length] + "..."
