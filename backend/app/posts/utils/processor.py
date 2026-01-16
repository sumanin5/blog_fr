"""
文章处理器

负责处理 Markdown 内容，生成 HTML、AST、TOC 等
"""

import re
from typing import Any, Dict, List

import frontmatter
from markdown_it import MarkdownIt
from mdit_py_plugins.deflist import deflist_plugin
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin

from .ast_generator import ASTGenerator
from .content_parser import calculate_reading_time, generate_excerpt, generate_toc
from .markdown_renderer import setup_markdown_renderer


class PostProcessor:
    """MDX 文章处理器"""

    def __init__(self, raw_content: str):
        self.raw_content = raw_content
        self.metadata: Dict[str, Any] = {}
        self.content_mdx: str = ""
        self.content_ast: Dict[str, Any] = {}  # AST 结构
        self.toc: List[Dict[str, Any]] = []
        self.reading_time: int = 0
        self.excerpt: str = ""

        # 初始化 markdown-it
        self.md = (
            MarkdownIt(
                "commonmark", {"html": True, "linkify": True, "typographer": True}
            )
            .enable(["table", "strikethrough"])
            .use(footnote_plugin)
            .use(deflist_plugin)
            .use(tasklists_plugin)
        )

        # 设置自定义渲染规则（用于 AST 生成）
        setup_markdown_renderer(self.md)

        # 初始化 AST 生成器
        self.ast_generator = ASTGenerator()

    def has_jsx_components(self) -> bool:
        """检测整个文档是否包含 JSX/TSX 组件"""
        return self._is_jsx_syntax(self.content_mdx)

    def process(self) -> "PostProcessor":
        """执行完整处理流水线"""
        # 1. 拆分 Frontmatter 和正文
        post_data = frontmatter.loads(self.raw_content)
        self.metadata = post_data.metadata
        self.content_mdx = post_data.content

        # 2. 生成目录（在处理前，基于原始 Markdown）
        self.toc = generate_toc(self.content_mdx)

        # 3. 计算阅读时间（在处理前，基于原始 Markdown）
        self.reading_time = calculate_reading_time(self.content_mdx)

        # 4. 预处理数学公式
        processed_md = self._preprocess_math(self.content_mdx)

        # 5. 生成 AST（基于处理后的 Markdown）
        tokens = self.md.parse(processed_md)
        self.content_ast = self.ast_generator.generate(tokens)

        # 6. 生成摘要（基于原始 Markdown）
        self.excerpt = generate_excerpt(self.content_mdx)

        return self

    def _preprocess_math(self, content: str) -> str:
        """预处理数学公式：包裹在 HTML 标签中"""
        # 保护代码块
        code_blocks = []

        def save_code(match):
            code_blocks.append(match.group(0))
            return f"<!--CODE_BLOCK_{len(code_blocks) - 1}-->"

        content = re.sub(r"```.*?```", save_code, content, flags=re.DOTALL)

        # 块级公式
        content = re.sub(
            r"\$\$(.*?)\$\$",
            r'<div class="math-block">\1</div>',
            content,
            flags=re.DOTALL,
        )

        # 行内公式（移除 $ 符号）
        def replace_inline(match):
            latex = match.group(1)
            if not re.search(r"[a-zA-Z\\]", latex):
                return match.group(0)
            return f'<span class="math-inline">{latex}</span>'

        content = re.sub(r"(?<!\\)\$(\S[^$\n]*?\S)\$", replace_inline, content)

        # 还原代码块
        for i, block in enumerate(code_blocks):
            content = content.replace(f"<!--CODE_BLOCK_{i}-->", block)

        return content

    def _is_jsx_syntax(self, content: str) -> bool:
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
