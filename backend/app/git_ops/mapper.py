"""
Git 同步的映射器模块

负责将 MDX frontmatter 映射为 Post 模型字段
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID

from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.resolvers import (
    DateResolver,
    PostTypeResolver,
    StatusResolver,
)
from app.git_ops.scanner import ScannedPost
from app.posts.model import Post
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class FrontmatterMapper:
    """Frontmatter 映射器"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.post_type_resolver = PostTypeResolver()
        self.status_resolver = StatusResolver()
        self.date_resolver = DateResolver()

    async def match_post(
        self, scanned: ScannedPost, existing_posts: list
    ) -> tuple[Optional[Post], bool]:
        """匹配文件到对应的 Post

        Args:
            scanned: 扫描到的文件
            existing_posts: 数据库中的所有 Post

        Returns:
            (matched_post, is_move) - 匹配到的 Post 和是否是移动操作
        """
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

    async def map_to_post(
        self, scanned: ScannedPost, dry_run: bool = False
    ) -> Dict[str, Any]:
        """将 Frontmatter 转换为 Post 模型字段

        Args:
            scanned: 扫描到的文章数据
            dry_run: 是否为 dry-run 模式 (不创建关联数据)

        Returns:
            Post 模型字段的字典

        Raises:
            GitOpsSyncError: 如果必填字段缺失或无效
        """
        from app.core.config import settings
        from app.git_ops.utils import (
            resolve_author_id,
            resolve_category_id,
            resolve_cover_media_id,
        )

        meta = scanned.frontmatter

        # ========== 解析作者 ID ==========
        # 优先使用回签的 author_id，如果没有则查询 author 字段
        author_id = None
        if meta.get("author_id"):
            try:
                author_id = UUID(meta.get("author_id"))
            except ValueError:
                raise GitOpsSyncError(
                    f"Invalid author_id format in {scanned.file_path}",
                    detail="author_id must be a valid UUID",
                )
        else:
            # 没有 author_id，查询 author 字段
            author_value = meta.get("author")
            if not author_value:
                raise GitOpsSyncError(
                    f"Missing required field 'author' or 'author_id' in {scanned.file_path}",
                    detail="Every post must specify an author",
                )
            author_id = await resolve_author_id(self.session, author_value)

        # ========== 解析封面图 ID ==========
        # 优先使用回签的 cover_media_id，如果没有则查询 cover 字段
        cover_media_id = None
        if meta.get("cover_media_id"):
            try:
                cover_media_id = UUID(meta.get("cover_media_id"))
            except ValueError:
                raise GitOpsSyncError(
                    f"Invalid cover_media_id format in {scanned.file_path}",
                    detail="cover_media_id must be a valid UUID",
                )
        else:
            # 没有 cover_media_id，查询 cover 字段
            cover_path = meta.get("cover") or meta.get("image")
            if cover_path:
                cover_media_id = await resolve_cover_media_id(
                    self.session,
                    cover_path,
                    mdx_file_path=scanned.file_path,
                    content_dir=Path(settings.CONTENT_DIR),
                )

        # ========== 解析文章类型 ==========
        post_type = await self.post_type_resolver.resolve(
            meta_type=meta.get("type") or meta.get("post_type"),
            derived_type=scanned.derived_post_type,
        )

        # ========== 解析分类 ID ==========
        # 优先级：
        # 1. 回签的 category_id (UUID) - 具有最高权威，忽略路径和字符串
        # 2. 物理目录推断的 derived_category_slug - Git-First 核心逻辑
        # 3. Frontmatter 中的 category 字段 - 平铺结构或手动覆盖的兜底
        category_id = None
        if meta.get("category_id"):
            try:
                category_id = UUID(meta.get("category_id"))
            except ValueError:
                raise GitOpsSyncError(
                    f"Invalid category_id format in {scanned.file_path}",
                    detail="category_id must be a valid UUID",
                )
        else:
            # 强化路径优先原则
            category_slug = (
                scanned.derived_category_slug
                or meta.get("category")
                or meta.get("category_slug")
            )
            category_id = await resolve_category_id(
                self.session,
                category_slug,
                post_type,
                auto_create=settings.GIT_AUTO_CREATE_CATEGORIES,
                default_slug=settings.GIT_DEFAULT_CATEGORY,
            )

        # 构建基础字段映射
        result = {
            "title": meta.get("title", Path(scanned.file_path).stem),
            "slug": meta.get("slug"),  # 返回 frontmatter 的 slug，可能是 None
            "excerpt": meta.get("summary")
            or meta.get("excerpt")
            or meta.get("description")
            or "",
            "content_mdx": scanned.content,
            "status": await self.status_resolver.resolve(meta),
            "published_at": await self.date_resolver.resolve(
                meta, await self.status_resolver.resolve(meta)
            ),
            "cover_media_id": cover_media_id,
            "author_id": author_id,
            "category_id": category_id,
            "post_type": post_type,
            # 布尔字段（注意：False 值需要特殊处理）
            "is_featured": meta.get("featured", False)
            if "featured" in meta
            else meta.get("is_featured", False),
            "allow_comments": meta.get("allow_comments", True)
            if "allow_comments" in meta
            else meta.get("comments", True),
            "enable_jsx": meta.get("enable_jsx", False)
            if "enable_jsx" in meta
            else False,
            "use_server_rendering": meta.get("use_server_rendering", True)
            if "use_server_rendering" in meta
            else True,
            # SEO 字段
            "meta_title": meta.get("meta_title") or meta.get("seo_title") or "",
            "meta_description": meta.get("meta_description")
            or meta.get("seo_description")
            or "",
            "meta_keywords": meta.get("meta_keywords") or meta.get("keywords") or "",
        }

        # 解析标签（如果有）
        tags = meta.get("tags", [])
        tag_ids = []
        if tags:
            # 确保是列表格式
            if isinstance(tags, str):
                # 支持逗号分隔的字符串: "tag1, tag2, tag3"
                tags = [t.strip() for t in tags.split(",")]

            # 查询或创建标签，获取 ID 列表
            from app.git_ops.utils import resolve_tag_ids

            tag_ids = await resolve_tag_ids(self.session, tags)
            result["tag_ids"] = tag_ids
            result["tags"] = tags

        return result
