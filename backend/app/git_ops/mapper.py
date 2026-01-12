"""
Git 同步的映射器模块

负责将 MDX frontmatter 映射为 Post 模型字段
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.resolvers import AuthorResolver, CoverResolver
from app.git_ops.scanner import ScannedPost
from app.posts.model import PostStatus
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class FrontmatterMapper:
    """Frontmatter 映射器"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.author_resolver = AuthorResolver(session)
        self.cover_resolver = CoverResolver(session)

    async def map_to_post(self, scanned: ScannedPost) -> Dict[str, Any]:
        """将 Frontmatter 转换为 Post 模型字段

        Args:
            scanned: 扫描到的文章数据

        Returns:
            Post 模型字段的字典

        Raises:
            GitOpsSyncError: 如果必填字段缺失或无效
        """
        meta = scanned.frontmatter

        # 解析作者（必填）
        author_value = meta.get("author")
        if not author_value:
            raise GitOpsSyncError(
                f"Missing required field 'author' in {scanned.file_path}",
                detail="Every post must specify an author in frontmatter",
            )

        # 查询作者（如果不存在会抛出 GitOpsSyncError）
        author_id = await self.author_resolver.resolve(author_value)

        # 解析封面图
        cover_path = meta.get("cover") or meta.get("image")
        cover_media_id = None
        if cover_path:
            cover_media_id = await self.cover_resolver.resolve(cover_path)

        # 解析文章类型
        post_type = self._resolve_post_type(meta)

        # 构建基础字段映射
        result = {
            "title": meta.get("title", Path(scanned.file_path).stem),
            "slug": meta.get("slug"),  # 返回 frontmatter 的 slug，可能是 None
            "excerpt": meta.get("summary")
            or meta.get("excerpt")
            or meta.get("description")
            or "",
            "content_mdx": scanned.content,
            "status": self._resolve_status(meta),
            "published_at": self._resolve_date(meta),
            "cover_media_id": cover_media_id,
            "author_id": author_id,
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
        if tags:
            # 确保是列表格式
            if isinstance(tags, str):
                # 支持逗号分隔的字符串: "tag1, tag2, tag3"
                tags = [t.strip() for t in tags.split(",")]
            result["tags"] = tags

        return result

    def _resolve_post_type(self, meta: Dict[str, Any]) -> str:
        """解析文章类型

        支持的类型：
        - article (默认)
        - idea
        """
        from app.posts.model import PostType

        post_type = meta.get("type") or meta.get("post_type")
        if not post_type:
            return PostType.ARTICLE

        # 标准化类型名称（转为小写）
        post_type = post_type.lower()

        # 验证类型是否有效（比较枚举的值）
        if post_type == PostType.ARTICLE:
            return PostType.ARTICLE
        elif post_type == PostType.IDEA:
            return PostType.IDEA

        logger.warning(f"Invalid post_type '{post_type}', defaulting to ARTICLE")
        return PostType.ARTICLE

    def _resolve_status(self, meta: Dict[str, Any]) -> str:
        """解析文章状态

        优先级：
        1. status 字段（直接指定状态）
        2. published 字段（布尔值，向后兼容）
        3. 默认为 PUBLISHED（Git 文件通常是已发布内容）
        """
        status = meta.get("status")
        if status:
            # 验证状态值是否有效
            if status.upper() in [PostStatus.DRAFT, PostStatus.PUBLISHED]:
                return status.upper()
            logger.warning(f"Invalid status '{status}', defaulting to PUBLISHED")

        # 向后兼容：published 布尔字段
        published = meta.get("published")
        if published is False:
            return PostStatus.DRAFT
        if published is True:
            return PostStatus.PUBLISHED

        # 默认为已发布（Git 文件通常是已发布内容）
        return PostStatus.PUBLISHED

    def _resolve_date(self, meta: Dict[str, Any]) -> Optional[datetime]:
        """解析发布日期

        优先级：
        1. date 字段
        2. published_at 字段
        3. 如果都没有且状态为 PUBLISHED，使用当前时间
        4. 如果状态为 DRAFT，返回 None

        支持的日期格式：
        - ISO 8601: "2024-01-15T10:30:00"
        - 日期字符串: "2024-01-15"
        - datetime 对象（YAML 自动解析）
        """
        date_value = meta.get("date") or meta.get("published_at")

        # 如果已经是 datetime 对象（YAML 解析器可能自动转换）
        if isinstance(date_value, datetime):
            return date_value

        # 如果是字符串，尝试解析
        if isinstance(date_value, str):
            try:
                # 尝试 ISO 格式解析
                return datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            except ValueError:
                try:
                    # 尝试只有日期的格式 (YYYY-MM-DD)
                    return datetime.strptime(date_value, "%Y-%m-%d")
                except ValueError:
                    logger.warning(
                        f"Failed to parse date '{date_value}', using current time"
                    )

        # 如果没有指定日期
        # - 已发布状态：使用当前时间
        # - 草稿状态：返回 None
        status = self._resolve_status(meta)
        if status == PostStatus.PUBLISHED:
            return datetime.now()

        return None
