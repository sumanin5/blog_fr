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

    def __init__(self, raw_content: str, mdx_path: str | None = None, session=None):
        self.raw_content = raw_content
        self.mdx_path = mdx_path
        self.session = session
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

    async def process(self) -> "PostProcessor":
        """执行完整处理流水线"""
        # 1. 拆分 Frontmatter 和正文
        post_data = frontmatter.loads(self.raw_content)
        self.metadata = post_data.metadata
        self.content_mdx = post_data.content

        # 1.5 处理正文中的本地图片并上传 (仅在提供 session 和 mdx_path 时)
        if self.session and self.mdx_path:
            self.content_mdx = await self._process_images(self.content_mdx)

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

    async def _process_images(self, content: str) -> str:
        """解析并替换正文中的本地图片"""
        import asyncio
        from pathlib import Path

        from app.core.config import settings
        from app.media import service as media_service
        from app.posts.exceptions import PostProcessingError
        from app.users import crud as user_crud

        # 参数检查：只有同时提供 session 和 mdx_path 才能处理图片
        if not self.session or not self.mdx_path:
            return content

        # 匹配 Markdown 图片: ![alt](path)
        img_pattern = r"!\[(.*?)\]\((.*?)\)"

        # 记录已处理的图片映射，避免同一篇文章重复处理同路径
        processed_map = {}

        matches = re.findall(img_pattern, content)
        if not matches:
            return content

        for alt, img_path in matches:
            # 过滤网络链接
            if img_path.startswith(("http://", "https://", "/media/")):
                continue

            # 如果已经处理过这个路径，直接替换
            if img_path in processed_map:
                content = content.replace(
                    f"({img_path})", f"({processed_map[img_path]})"
                )
                continue

            try:
                # 定位物理文件
                content_root = Path(settings.CONTENT_DIR)
                mdx_abs_path = content_root / self.mdx_path
                img_abs_path = (mdx_abs_path.parent / img_path).resolve()

                # 安全检查：确保文件在内容根目录下且存在
                if (
                    img_abs_path.exists()
                    and img_abs_path.is_file()
                    and str(img_abs_path).startswith(str(content_root))
                ):
                    admin = await user_crud.get_superuser(self.session)
                    if not admin:
                        raise PostProcessingError(
                            f"Failed to process image {img_path}: no superuser found"
                        )

                    # 读取内容
                    file_bytes = await asyncio.to_thread(img_abs_path.read_bytes)

                    # 使用 media_service 自动去重上传
                    media = await media_service.create_media_file(
                        file_content=file_bytes,
                        filename=img_abs_path.name,
                        uploader_id=admin.id,
                        session=self.session,
                        usage="attachment",
                        is_public=True,
                        description=f"Auto-ingested from post: {self.mdx_path}",
                    )

                    # 生成服务器 URL（这里我们不使用 ID 方案，直接用 file_path 方案保证预览一致性）
                    new_url = f"{settings.MEDIA_URL}{media.file_path}"
                    processed_map[img_path] = new_url

                    # 替换正文中的链
                    content = content.replace(f"({img_path})", f"({new_url})")

            except PostProcessingError:
                raise
            except Exception as e:
                raise PostProcessingError(
                    f"Failed to process inline image {img_path}: {e}"
                )

        return content
