from typing import Optional
from uuid import UUID

from app.posts.model import PostType, Tag
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession


async def paginate_query(
    session: AsyncSession, query: select, params: Params = None
) -> Page:
    """通用分页查询"""
    return await paginate(session, query, params)


async def get_tag_by_slug(session: AsyncSession, slug: str) -> Optional[Tag]:
    """根据 Slug 获取标签"""
    stmt = select(Tag).where(Tag.slug == slug)
    result = await session.exec(stmt)
    return result.one_or_none()


async def list_tags_with_count(
    session: AsyncSession,
    params: Params,
    search: str = None,
    post_type: Optional[PostType] = None,
) -> Page[Tag]:
    """获取标签列表并附加文章关联数"""
    from app.posts.model import Post, PostTagLink

    # 1. 基础查询
    stmt = select(Tag)
    if post_type:
        stmt = stmt.join(Tag.posts).where(Post.post_type == post_type).distinct()
    if search:
        stmt = stmt.where(Tag.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(Tag.name)

    # 2. 分页
    page = await paginate_query(session, stmt, params)

    if not page.items:
        return page

    # 3. 聚合查询计数
    tag_ids = [tag.id for tag in page.items]
    count_stmt = select(PostTagLink.tag_id, func.count(PostTagLink.post_id)).where(
        PostTagLink.tag_id.in_(tag_ids)
    )
    if post_type:
        count_stmt = count_stmt.join(Post, PostTagLink.post_id == Post.id).where(
            Post.post_type == post_type
        )
    count_stmt = count_stmt.group_by(PostTagLink.tag_id)
    count_result = await session.exec(count_stmt)
    count_map = {row[0]: row[1] for row in count_result.all()}

    # 4. 填充计数
    for tag in page.items:
        setattr(tag, "post_count", count_map.get(tag.id, 0))

    return page


async def get_tag_by_id(session: AsyncSession, tag_id: UUID) -> Optional[Tag]:
    """根据 ID 获取标签"""
    stmt = select(Tag).where(Tag.id == tag_id)
    result = await session.exec(stmt)
    return result.one_or_none()


async def get_or_create_tag(session: AsyncSession, name: str, slug: str) -> Tag:
    """获取或创建标签 (用于同步 MDX 标签)"""
    stmt = select(Tag).where(Tag.name == name)
    result = await session.exec(stmt)
    tag = result.one_or_none()

    if not tag:
        tag = Tag(name=name, slug=slug)
        session.add(tag)
        await session.flush()  # 获取 ID 但不提交事务
    return tag


async def get_orphaned_tags(session: AsyncSession) -> list[Tag]:
    """获取孤立标签（没有任何文章关联）"""
    from app.posts.model import PostTagLink
    from sqlalchemy import not_

    # 查找不在 PostTagLink 中的标签
    stmt = (
        select(Tag)
        .where(not_(Tag.id.in_(select(PostTagLink.tag_id))))
        .order_by(Tag.name)
    )
    result = await session.exec(stmt)
    return list(result.all())


async def update_tag(session: AsyncSession, tag: Tag, update_data: dict) -> Tag:
    """更新标签"""
    for field, value in update_data.items():
        setattr(tag, field, value)
    session.add(tag)
    await session.flush()
    await session.refresh(tag)
    return tag


async def delete_tag(session: AsyncSession, tag: Tag) -> None:
    """删除标签"""
    await session.delete(tag)
    await session.flush()


async def merge_tags(
    session: AsyncSession, source_tag_id: UUID, target_tag_id: UUID
) -> Tag:
    """合并标签：将 source_tag 的所有文章关联转移到 target_tag，然后删除 source_tag"""
    from app.posts.model import PostTagLink
    from sqlalchemy import delete, update

    # 1. 处理冲突：如果文章已经有了 target_tag，直接删除 source_tag 的关联
    # 避免 UPDATE 时产生 (post_id, target_tag_id) 的重复键
    stmt_conflict = (
        delete(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)
        .where(
            PostTagLink.post_id.in_(
                select(PostTagLink.post_id).where(PostTagLink.tag_id == target_tag_id)
            )
        )
    )
    await session.exec(stmt_conflict)

    # 2. 更新剩余的关联：source_tag → target_tag
    stmt = (
        update(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)
        .values(tag_id=target_tag_id)
    )
    await session.exec(stmt)

    # 删除源标签
    source_tag = await get_tag_by_id(session, source_tag_id)
    if source_tag:
        await session.delete(source_tag)

    # 返回目标标签
    target_tag = await get_tag_by_id(session, target_tag_id)
    await session.flush()
    return target_tag
