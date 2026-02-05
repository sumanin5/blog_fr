import logging
from pathlib import Path
from typing import Optional

from app.git_ops.components.processors.cover import CoverProcessor
from app.git_ops.components.scanner import ScannedPost
from app.posts.model import Category, PostType
from app.users.model import User
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def handle_category_sync(
    session: AsyncSession,
    scanned: ScannedPost,
    operating_user: User,
    content_dir: Path,
) -> Optional[Category]:
    """
    处理分类元数据同步 (index.md)
    """
    category_slug = scanned.derived_category_slug
    post_type_str = scanned.derived_post_type

    if not category_slug or not post_type_str:
        logger.warning(
            f"Category index file {scanned.file_path} has no derived category/type."
        )
        return None

    # 转换 PostType
    try:
        post_type = PostType(post_type_str)
    except ValueError:
        logger.warning(f"Invalid post type {post_type_str} for {scanned.file_path}")
        return None

    # 1. 查找或创建分类
    stmt = select(Category).where(
        Category.slug == category_slug, Category.post_type == post_type
    )
    result = await session.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        logger.info(f"Creating new category from index: {category_slug} ({post_type})")
        category = Category(
            name=scanned.frontmatter.get("title") or category_slug.title(),
            slug=category_slug,
            post_type=post_type,
            level=1,  # 默认为一级，暂时不支持多级推导
        )
        session.add(category)
        await session.flush()  # 获取 ID

    # 2. 更新元数据
    # Description (Body)
    if scanned.content:
        category.description = scanned.content

    # Frontmatter overrides
    if scanned.frontmatter.get("title"):
        category.name = scanned.frontmatter["title"]

    # Excerpt
    if scanned.frontmatter.get("excerpt"):
        category.excerpt = scanned.frontmatter["excerpt"]

    # 处理 Icon
    if "icon" in scanned.frontmatter:
        icon_val = scanned.frontmatter["icon"]
        if icon_val:
            # 如果是短字符串（emoji），存储为 icon_preset
            if len(icon_val) < 10:
                category.icon_preset = icon_val
                logger.info(f"✅ Using emoji icon: {icon_val}")
            # 如果是文件路径或 UUID，解析为 icon_id
            else:
                cover_processor = CoverProcessor()
                icon_id = await cover_processor._resolve_cover_media_id(
                    session,
                    icon_val,
                    mdx_file_path=scanned.file_path,
                    content_dir=content_dir,
                )
                if icon_id:
                    category.icon_id = icon_id
                    logger.info(f"✅ Resolved icon from path: {icon_val} -> {icon_id}")
                else:
                    logger.warning(
                        f"⚠️ Could not resolve icon: {icon_val}, will be ignored"
                    )

    if "sort" in scanned.frontmatter or "order" in scanned.frontmatter:
        category.sort_order = int(
            scanned.frontmatter.get("sort") or scanned.frontmatter.get("order") or 0
        )

    if "hidden" in scanned.frontmatter:
        category.is_active = not scanned.frontmatter.get("hidden", False)

    # 🆕 Post Sort Order
    post_sort_val = scanned.frontmatter.get("post_sort") or scanned.frontmatter.get(
        "post_sort_order"
    )
    if post_sort_val:
        from app.posts.model import PostSortOrder

        try:
            # 尝试直接匹配 Enum 值
            category.post_sort_order = PostSortOrder(post_sort_val)
            logger.info(f"✅ Set post sort order: {post_sort_val}")
        except ValueError:
            logger.warning(
                f"⚠️ Invalid post_sort_order: {post_sort_val}. Allowed: {[e.value for e in PostSortOrder]}"
            )

    # 3. 处理 Cover
    # 优先使用 cover_media_id（如果有效）
    if scanned.frontmatter.get("cover_media_id"):
        from uuid import UUID

        from app.media import crud as media_crud

        try:
            cover_media_id = UUID(str(scanned.frontmatter["cover_media_id"]))
            existing_media = await media_crud.get_media_file(session, cover_media_id)
            if existing_media:
                category.cover_media_id = cover_media_id
                logger.info(
                    f"✅ Using existing cover_media_id from frontmatter: {cover_media_id}"
                )
            else:
                logger.warning(
                    f"⚠️ cover_media_id {cover_media_id} not found in DB, will resolve from cover field"
                )
        except (ValueError, TypeError) as e:
            logger.warning(
                f"⚠️ Invalid cover_media_id format: {scanned.frontmatter['cover_media_id']}, error: {e}"
            )

    # 如果没有有效的 cover_media_id，尝试从 cover 字段解析（降级）
    if not category.cover_media_id:
        cover_val = scanned.frontmatter.get("cover") or scanned.frontmatter.get("image")
        if cover_val:
            cover_processor = CoverProcessor()
            cover_id = await cover_processor._resolve_cover_media_id(
                session,
                cover_val,
                mdx_file_path=scanned.file_path,
                content_dir=content_dir,
            )
            if cover_id:
                category.cover_media_id = cover_id
                logger.info(
                    f"✅ Resolved cover from filename: {cover_val} -> {cover_id}"
                )

    session.add(category)
    # 不提交，由调用方提交

    # 4. 回写 category_id 到 index.md
    await _write_category_metadata_back(
        session, content_dir, scanned.file_path, category
    )

    logger.info(f"Updated category metadata for {category.slug}")
    return category


async def _write_category_metadata_back(
    session: AsyncSession,
    content_dir: Path,
    file_path: str,
    category: Category,
):
    """回写分类 ID 到 index.md 的 frontmatter"""
    from app.git_ops.components.writer.file_operator import update_frontmatter_metadata

    metadata = {
        "category_id": str(category.id),
    }

    # 如果有 cover_media_id，也回写
    if category.cover_media_id:
        metadata["cover_media_id"] = str(category.cover_media_id)

    # 如果有 icon_id，也回写
    if category.icon_id:
        metadata["icon_id"] = str(category.icon_id)

    await update_frontmatter_metadata(content_dir, file_path, metadata)
    logger.info(f"Wrote category metadata back to {file_path}")
