import logging
from typing import Any, Dict, List, Optional, Tuple

import frontmatter
from app.git_ops.components.metadata import Frontmatter
from app.git_ops.components.processors import (
    AuthorProcessor,
    CategoryProcessor,
    ContentProcessor,
    CoverProcessor,
    PostTypeProcessor,
    TagsProcessor,
)
from app.git_ops.components.scanner import ScannedPost
from app.posts.model import Post
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class PostSerializer:
    """Post 和 Frontmatter 的双向序列化器"""

    def __init__(self, session: AsyncSession):
        self.session = session
        # 初始化 processor pipeline
        self.processors = [
            ContentProcessor(),  # 1. 先处理内容和 title
            PostTypeProcessor(),  # 2. 确定 post_type
            AuthorProcessor(),  # 3. 解析 author
            CoverProcessor(),  # 4. 解析 cover
            CategoryProcessor(),  # 5. 解析 category（依赖 post_type）
            TagsProcessor(),  # 6. 解析 tags
        ]

    async def match_post(
        self, scanned: ScannedPost, existing_posts: list
    ) -> Tuple[Optional[Post], bool]:
        """匹配文件到对应的 Post (Mapper 功能)"""
        # 构建索引
        existing_map = {p.source_path: p for p in existing_posts if p.source_path}
        existing_by_slug = {p.slug: p for p in existing_posts}

        # 1. 先按 source_path 匹配
        if scanned.file_path in existing_map:
            return existing_map[scanned.file_path], False

        # 2. 再按 slug 匹配（检测移动）
        fm_slug = scanned.frontmatter.get("slug")
        if fm_slug and fm_slug in existing_by_slug:
            return existing_by_slug[fm_slug], True

        # 3. 都没找到 → 新增
        return None, False

    async def from_frontmatter(
        self, scanned: ScannedPost, dry_run: bool = False
    ) -> Dict[str, Any]:
        """Frontmatter → Post 字典 (Mapper 功能)"""
        meta = scanned.frontmatter

        # 0. Pydantic 验证 + 基础映射
        validated = Frontmatter(**meta)

        # 1. 转成 dict（Pydantic 已处理类型转换）
        result = validated.model_dump(exclude_none=True)

        # 2. 执行 processor pipeline
        for processor in self.processors:
            await processor.process(result, meta, scanned, self.session, dry_run)

        return result

    def to_frontmatter(
        self,
        post: Post,
        tags: Optional[List[str]] = None,
        category_slug: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Post 对象 → Frontmatter 字典 (Dumper 功能)"""
        # 直接使用统一映射逻辑
        metadata = Frontmatter.to_dict(post, tags=tags)

        logger.debug(f"Generated metadata: {metadata}")
        return metadata

    def dump_to_string(
        self,
        post: Post,
        tags: Optional[List[str]] = None,
        category_slug: Optional[str] = None,
    ) -> str:
        """Post 对象 → MDX 字符串 (Dumper 功能)"""
        metadata = self.to_frontmatter(post, tags, category_slug)
        post_obj = frontmatter.Post(post.content_mdx or "", **metadata)
        return frontmatter.dumps(post_obj)
