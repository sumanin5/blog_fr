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

    if "icon" in scanned.frontmatter:
        # 简单处理：如果是 emoji 则存 icon_preset，如果是 ID 则存 media_id (暂不实现 media_id)
        icon_val = scanned.frontmatter["icon"]
        if icon_val and len(icon_val) < 10:  # Emoji heuristic
            category.icon_preset = icon_val

    if "sort" in scanned.frontmatter or "order" in scanned.frontmatter:
        category.sort_order = int(
            scanned.frontmatter.get("sort") or scanned.frontmatter.get("order") or 0
        )

    if "hidden" in scanned.frontmatter:
        category.is_active = not scanned.frontmatter.get("hidden", False)

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

    logger.info(f"Updated category metadata for {category.slug}")
    return category
