"""
文章模块业务逻辑 (Service)

负责协调工具类、数据库操作和复杂的业务规则
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.posts import crud
from app.posts.exceptions import (
    CategoryNotFoundError,
    CategoryTypeMismatchError,
)
from app.posts.model import Post, PostStatus, PostVersion
from app.posts.schema import PostCreate, PostUpdate
from app.posts.utils import PostProcessor
from slugify import slugify as python_slugify
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def generate_unique_slug(
    session: AsyncSession, title: str, post_id: Optional[UUID] = None
) -> str:
    """生成唯一的文章 Slug"""
    base_slug = python_slugify(title)
    if not base_slug:
        base_slug = "post"

    slug = base_slug
    counter = 1

    while True:
        existing = await crud.get_post_by_slug(session, slug)
        if not existing or (post_id and existing.id == post_id):
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


async def sync_post_tags(session: AsyncSession, post: Post, tag_names: List[str]):
    """同步文章标签：自动创建新标签并关联"""
    tags = []
    for name in tag_names:
        tag_slug = python_slugify(name)
        tag = await crud.get_or_create_tag(session, name, tag_slug)
        tags.append(tag)

    post.tags = tags
    session.add(post)


async def save_post_version(
    session: AsyncSession, post: Post, commit_message: Optional[str] = None
):
    """为文章创建一个历史版本快照"""
    # 计算新的版本号
    from sqlmodel import func, select

    stmt = select(func.max(PostVersion.version_num)).where(
        PostVersion.post_id == post.id
    )
    result = await session.execute(stmt)
    max_version = result.scalar() or 0

    version = PostVersion(
        post_id=post.id,
        version_num=max_version + 1,
        title=post.title,
        content_mdx=post.content_mdx,
        git_hash=post.git_hash,
        commit_message=commit_message or f"Auto-snapshot (v{max_version + 1})",
    )
    session.add(version)
    logger.debug(f"已保存文章版本快照: {post.title} v{version.version_num}")


async def delete_post(
    session: AsyncSession, post_id: UUID, current_user: "User"
) -> None:
    """删除文章（带细粒度权限检查）

    Args:
        session: 数据库会话
        post_id: 文章ID
        current_user: 当前用户

    Raises:
        PostNotFoundError: 文章不存在
        InsufficientPermissionsError: 权限不足（非作者且非超级管理员）
    """
    from app.core.exceptions import InsufficientPermissionsError
    from app.posts.exceptions import PostNotFoundError

    post = await crud.get_post_by_id(session, post_id)
    if not post:
        raise PostNotFoundError()

    # 细粒度权限检查：超级管理员可以删除任何文章，普通用户只能删除自己的
    if not current_user.is_superadmin and post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能删除自己的文章")

    await session.delete(post)
    await session.commit()
    logger.info(f"文章已删除: {post.id} by user {current_user.id}")


async def create_post(
    session: AsyncSession, post_in: PostCreate, author_id: UUID
) -> Post:
    """
    创建文章流水线
    1. 校验分类与板块匹配性
    2. 解析 MDX (Frontmatter, TOC, MathML, Reading Time)
    3. 如果 Frontmatter 中有元数据，优先覆盖请求数据
    4. 生成唯一 Slug
    5. 保存核心数据
    6. 自动同步标签
    """
    # 1. 校验分类与板块逻辑隔离
    if post_in.category_id:
        category = await crud.get_category_by_id(session, post_in.category_id)
        if not category:
            raise CategoryNotFoundError()
        if category.post_type != post_in.post_type:
            raise CategoryTypeMismatchError(
                f"分类 '{category.name}' (类型:{category.post_type}) 与文章类型 '{post_in.post_type}' 不匹配"
            )

    # 2. 解析 MDX 内容
    processor = PostProcessor(post_in.content_mdx).process()

    # 3. 合并元数据与请求数据
    metadata = processor.metadata
    title = metadata.get("title", post_in.title)

    # 4. 处理 Slug
    slug = post_in.slug or metadata.get("slug")
    if not slug:
        slug = await generate_unique_slug(session, title)
    else:
        # 如果手动指定了 slug，也要确保唯一
        slug = await generate_unique_slug(session, slug)

    # 5. 组装对象
    db_post = Post(
        **post_in.model_dump(exclude={"content_mdx", "slug", "tags", "commit_message"}),
        title=title,
        slug=slug,
        author_id=author_id,
        content_mdx=processor.content_mdx,
        content_html=processor.content_html,
        excerpt=processor.excerpt or metadata.get("excerpt", ""),
        toc=processor.toc,
        reading_time=processor.reading_time,
        published_at=datetime.now() if post_in.status == PostStatus.PUBLISHED else None,
    )

    # 如果 MDX 里指定了关键词或描述，覆盖它
    if "description" in metadata:
        db_post.meta_description = metadata["description"]
    if "keywords" in metadata:
        db_post.meta_keywords = metadata["keywords"]

    session.add(db_post)
    await session.flush()  # 拿到 ID 以便处理标签

    # 6. 同步标签
    tags_to_sync = metadata.get("tags", [])
    if tags_to_sync:
        await sync_post_tags(session, db_post, tags_to_sync)

    await session.commit()
    await session.refresh(db_post)
    logger.info(f"文章创建成功: {db_post.title} (ID: {db_post.id})")
    return db_post


async def update_post(
    session: AsyncSession, post_id: UUID, post_in: PostUpdate, current_user: "User"
) -> Post:
    """更新文章（带细粒度权限检查）

    Args:
        session: 数据库会话
        post_id: 文章ID
        post_in: 更新数据
        current_user: 当前用户

    Raises:
        PostNotFoundError: 文章不存在
        InsufficientPermissionsError: 权限不足（非作者且非超级管理员）
    """
    from app.core.exceptions import InsufficientPermissionsError
    from app.posts.exceptions import PostNotFoundError

    db_post = await crud.get_post_by_id(session, post_id)
    if not db_post:
        raise PostNotFoundError()

    # 细粒度权限检查：超级管理员可以修改任何文章，普通用户只能修改自己的
    if not current_user.is_superadmin and db_post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能修改自己的文章")

    update_data = post_in.model_dump(exclude_unset=True)

    # 0. 在更新前保存当前版本作为快照
    await save_post_version(
        session, db_post, commit_message=update_data.get("commit_message")
    )

    # 1. 校验分类与板块逻辑隔离 (如果更新了分类或板块)
    new_category_id = update_data.get("category_id", db_post.category_id)
    new_post_type = update_data.get("post_type", db_post.post_type)

    if "category_id" in update_data or "post_type" in update_data:
        if new_category_id:
            category = await crud.get_category_by_id(session, new_category_id)
            if not category:
                raise CategoryNotFoundError()
            if category.post_type != new_post_type:
                raise CategoryTypeMismatchError(
                    f"分类 '{category.name}' (类型:{category.post_type}) 与文章类型 '{new_post_type}' 不匹配"
                )

    # 2. 如果更新了内容，重新解析 MDX
    if "content_mdx" in update_data:
        processor = PostProcessor(update_data["content_mdx"]).process()
        db_post.content_mdx = processor.content_mdx
        db_post.content_html = processor.content_html
        db_post.toc = processor.toc
        db_post.reading_time = processor.reading_time
        # 即使 MDX 里没写摘要，如果正文变了且 db 里摘要是自动生成的，也重刷一下
        db_post.excerpt = processor.excerpt or processor.metadata.get(
            "excerpt", db_post.excerpt
        )

        # 同步标签
        if "tags" in processor.metadata:
            await sync_post_tags(session, db_post, processor.metadata["tags"])

    # 3. 处理发布时间
    if update_data.get("status") == PostStatus.PUBLISHED and not db_post.published_at:
        db_post.published_at = datetime.now()

    # 4. 应用其他字段更新
    for field, value in update_data.items():
        if field not in ["content_mdx", "commit_message"]:
            setattr(db_post, field, value)

    session.add(db_post)
    await session.commit()
    await session.refresh(db_post)
    logger.info(f"文章更新成功: {db_post.title}")
    return db_post


def format_post_short(post: Post):
    """格式化精简文章响应 (带统计逻辑)"""
    from app.posts.schema import PostShortResponse

    # 这里可以计算评论数 (如果未来有评论模块)
    comment_count = 0

    return PostShortResponse.model_validate(post)
