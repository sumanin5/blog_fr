"""
文章处理器工具类 - 使用 markdown-it-py
"""

import math
import random
import re
import string
from typing import Any, Dict, List, Optional
from uuid import UUID

import frontmatter
from app.posts.model import Post, PostStatus, PostType, Tag
from markdown_it import MarkdownIt
from mdit_py_plugins.deflist import deflist_plugin
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin
from slugify import slugify as python_slugify
from sqlalchemy import delete
from sqlalchemy.orm import load_only, selectinload
from sqlmodel import desc, select
from sqlmodel.ext.asyncio.session import AsyncSession


def generate_slug_with_random_suffix(title: str, random_length: int = 6) -> str:
    """生成带随机后缀的 slug"""
    base_slug = python_slugify(title)
    if not base_slug:
        base_slug = "post"
    random_suffix = "".join(
        random.choices(string.ascii_lowercase + string.digits, k=random_length)
    )
    return f"{base_slug}-{random_suffix}"


async def sync_post_tags(
    session: AsyncSession, post: Post, tag_names: List[str]
) -> None:
    """同步文章标签"""
    from app.posts import crud
    from app.posts.model import PostTagLink

    if post.id is None:
        raise ValueError("Post must be persisted (have an ID) before syncing tags")

    tag_ids = []
    for name in tag_names:
        tag_slug = python_slugify(name)
        tag = await crud.get_or_create_tag(session, name, tag_slug)
        tag_ids.append(tag.id)

    stmt = delete(PostTagLink).where(PostTagLink.post_id == post.id)
    await session.exec(stmt)

    for tag_id in tag_ids:
        link = PostTagLink(post_id=post.id, tag_id=tag_id)
        session.add(link)


class PostProcessor:
    """MDX 文章处理器"""

    def __init__(self, raw_content: str):
        self.raw_content = raw_content
        self.metadata: Dict[str, Any] = {}
        self.content_mdx: str = ""
        self.content_html: str = ""
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

        # 自定义 fence 渲染规则（代码块）
        self._setup_custom_renderers()

    def _setup_custom_renderers(self):
        """设置自定义渲染规则"""
        # 保存原始的 fence 渲染器
        default_fence = self.md.renderer.rules.get("fence")

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

        self.md.renderer.rules["fence"] = custom_fence

    def process(self) -> "PostProcessor":
        """执行完整处理流水线"""
        # 1. 拆分 Frontmatter 和正文
        post_data = frontmatter.loads(self.raw_content)
        self.metadata = post_data.metadata
        self.content_mdx = post_data.content

        # 2. 生成目录（在处理前，基于原始 Markdown）
        self.toc = self._generate_toc(self.content_mdx)

        # 3. 计算阅读时间（在处理前，基于原始 Markdown）
        self.reading_time = self._calculate_reading_time(self.content_mdx)

        # 4. 预处理数学公式
        processed_md = self._preprocess_math(self.content_mdx)

        # 5. 渲染 Markdown → HTML（自定义渲染器会处理 Mermaid）
        self.content_html = self.md.render(processed_md)

        # 6. 生成摘要（基于原始 Markdown）
        self.excerpt = self._generate_excerpt(self.content_mdx)

        return self

    def _generate_toc(self, content: str) -> List[Dict[str, Any]]:
        """生成目录"""
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
                    slug = self._generate_unique_slug(title, slug_counter)
                    toc.append({"id": slug, "title": title, "level": level})

        return toc

    def _generate_unique_slug(self, title: str, slug_counter: dict) -> str:
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

    def _calculate_reading_time(self, content: str) -> int:
        """估算阅读时间"""
        chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", content))
        remaining_text = re.sub(r"[\u4e00-\u9fa5]", " ", content)
        english_words = len(re.findall(r"\b\w+\b", remaining_text))
        total_count = chinese_chars + english_words
        minutes = math.ceil(total_count / 300)
        return max(1, minutes)

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

    def _generate_excerpt(self, markdown_content: str, length: int = 200) -> str:
        """从 Markdown 提取摘要"""
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


# 查询辅助函数
def build_posts_query(
    *,
    post_type: Optional[PostType] = None,
    status: Optional[PostStatus] = PostStatus.PUBLISHED,
    category_id: Optional[UUID] = None,
    tag_id: Optional[UUID] = None,
    author_id: Optional[UUID] = None,
    is_featured: Optional[bool] = None,
    search_query: Optional[str] = None,
):
    """构建文章查询"""
    stmt = select(Post).options(
        load_only(
            Post.id,
            Post.slug,
            Post.title,
            Post.excerpt,
            Post.post_type,
            Post.status,
            Post.is_featured,
            Post.allow_comments,
            Post.reading_time,
            Post.view_count,
            Post.like_count,
            Post.bookmark_count,
            Post.created_at,
            Post.updated_at,
            Post.published_at,
            Post.author_id,
            Post.category_id,
            Post.cover_media_id,
            Post.meta_title,
            Post.meta_description,
            Post.meta_keywords,
            Post.git_hash,
            Post.source_path,
        ),
        selectinload(Post.category),
        selectinload(Post.author),
        selectinload(Post.tags),
        selectinload(Post.cover_media),
    )

    if post_type:
        stmt = stmt.where(Post.post_type == post_type)
    if status:
        stmt = stmt.where(Post.status == status)
    if author_id:
        stmt = stmt.where(Post.author_id == author_id)
    if is_featured is not None:
        stmt = stmt.where(Post.is_featured == is_featured)
    if category_id:
        stmt = stmt.where(Post.category_id == category_id)
    if tag_id:
        stmt = stmt.join(Post.tags).where(Tag.id == tag_id)
    if search_query:
        search_pattern = f"%{search_query}%"
        stmt = stmt.where(
            (Post.title.ilike(search_pattern)) | (Post.excerpt.ilike(search_pattern))
        )

    stmt = stmt.order_by(desc(Post.published_at), desc(Post.created_at))
    return stmt


def build_categories_query(post_type: PostType):
    """构建分类查询"""
    from app.posts.model import Category

    stmt = (
        select(Category)
        .where(Category.post_type == post_type)
        .where(Category.is_active)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .options(selectinload(Category.parent), selectinload(Category.icon))
    )
    return stmt


def build_tags_query(post_type: PostType):
    """构建标签查询"""
    stmt = (
        select(Tag)
        .join(Tag.posts)
        .where(Post.post_type == post_type)
        .distinct()
        .order_by(Tag.name.asc())
    )
    return stmt
