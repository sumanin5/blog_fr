import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import frontmatter
from app.core.config import settings
from app.git_ops.exceptions import GitOpsSyncError
from app.git_ops.field_definitions import FIELD_DEFINITIONS
from app.git_ops.components.resolvers import (
    DateResolver,
    PostTypeResolver,
    StatusResolver,
    resolve_author_id,
    resolve_category_id,
    resolve_cover_media_id,
    resolve_tag_ids,
)
from app.git_ops.components.scanner import ScannedPost
from app.posts.model import Post
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


class PostSerializer:
    """Post 和 Frontmatter 的双向序列化器"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.post_type_resolver = PostTypeResolver()
        self.status_resolver = StatusResolver()
        self.date_resolver = DateResolver()

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
        result = {}

        # 1. 处理所有定义良好的字段 (Unified Schema)
        for field in FIELD_DEFINITIONS:
            value = meta.get(field.frontmatter_key)

            # Fallback 逻辑
            if value is None:
                if field.frontmatter_key == "excerpt":
                    value = meta.get("summary") or meta.get("description")
                elif field.frontmatter_key == "meta_title":
                    value = meta.get("seo_title")
                elif field.frontmatter_key == "meta_description":
                    value = meta.get("seo_description")
                elif field.frontmatter_key == "meta_keywords":
                    value = meta.get("keywords")

            # 默认值
            if value is None:
                value = field.default

            # 类型转换 (parse_fn)
            if field.parse_fn and value is not None:
                try:
                    value = field.parse_fn(value)
                except Exception as e:
                    logger.warning(
                        f"Failed to parse field {field.frontmatter_key} for {scanned.file_path}: {e}"
                    )
                    if field.model_attr in [
                        "author_id",
                        "category_id",
                        "cover_media_id",
                    ]:
                        raise GitOpsSyncError(
                            f"Invalid format for field {field.frontmatter_key}"
                        )

            if value is not None:
                result[field.model_attr] = value

        # 2. 复杂逻辑处理 (Resolvers)

        # Author (Required)
        if not result.get("author_id"):
            author_value = meta.get("author")
            if author_value:
                result["author_id"] = await resolve_author_id(
                    self.session, author_value
                )
            else:
                raise GitOpsSyncError(
                    f"Missing required field 'author' or 'author_id' in {scanned.file_path}",
                    detail="Every post must specify an author",
                )

        # Cover (Optional)
        if not result.get("cover_media_id"):
            cover_path = meta.get("cover") or meta.get("image")
            if cover_path:
                result["cover_media_id"] = await resolve_cover_media_id(
                    self.session,
                    cover_path,
                    mdx_file_path=scanned.file_path,
                    content_dir=Path(settings.CONTENT_DIR),
                )

        # Post Type
        result["post_type"] = await self.post_type_resolver.resolve(
            meta_type=meta.get("type") or meta.get("post_type"),
            derived_type=scanned.derived_post_type,
        )

        # Category
        if not result.get("category_id"):
            category_slug = (
                scanned.derived_category_slug
                or meta.get("category")
                or meta.get("category_slug")
            )
            result["category_id"] = await resolve_category_id(
                self.session,
                category_slug,
                result["post_type"],
                auto_create=settings.GIT_AUTO_CREATE_CATEGORIES
                if not dry_run
                else False,
                default_slug=settings.GIT_DEFAULT_CATEGORY,
            )

        # Status & Date
        result["status"] = await self.status_resolver.resolve(meta)
        result["published_at"] = await self.date_resolver.resolve(
            meta, result["status"]
        )

        # Content & Title Fallback
        result["content_mdx"] = scanned.content
        if not result.get("title"):
            result["title"] = Path(scanned.file_path).stem

        # Tags
        tags = meta.get("tags")
        if tags is not None:
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]
            result["tag_ids"] = await resolve_tag_ids(
                self.session, tags, auto_create=not dry_run
            )
            result["tags"] = tags

        return result

    def to_frontmatter(
        self,
        post: Post,
        tags: Optional[List[str]] = None,
        category_slug: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Post 对象 → Frontmatter 字典 (Dumper 功能)"""
        metadata = {}

        # 1. 自动处理所有定义好的字段 (Unified Schema)
        for field in FIELD_DEFINITIONS:
            # 从模型获取值
            value = getattr(post, field.model_attr, None)

            # 检查是否应该跳过默认值
            if field.skip_if_default and value == field.default:
                continue

            # 执行转换 (serialize_fn)
            if field.serialize_fn and value is not None:
                value = field.serialize_fn(value)

            # 放入结果 (如果不为 None)
            if value is not None:
                metadata[field.frontmatter_key] = value

        # 2. 处理动态传入或特殊覆盖参数
        if tags is not None:
            metadata["tags"] = tags

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
