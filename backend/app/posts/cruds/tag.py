from typing import Any, Optional
from uuid import UUID

from app.posts.model import PostType, Tag
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession


async def paginate_query(
    session: AsyncSession, query: Any, params: Params | None = None
) -> Page:
    """通用分页查询"""
    return await paginate(session, query, params)


async def get_tag_by_slug(session: AsyncSession, slug: str) -> Tag | None:
    """根据 Slug 获取标签（可以返回 None）"""
    stmt = select(Tag).where(Tag.slug == slug)
    result = await session.exec(stmt)
    return result.one_or_none()


async def list_tags_with_count(
    session: AsyncSession,
    params: Params,
    search: str | None = None,
    post_type: Optional[PostType] = None,
    sort_by_usage: bool = False,
) -> Page[Tag]:
    """获取标签列表并附加文章关联数"""
    from app.posts.model import Post, PostTagLink

    # 1. 基础查询
    stmt = select(Tag)

    if post_type:
        # 如果指定了 post_type，必须 join PostTagLink 和 Post
        stmt = stmt.join(Tag.posts).where(Post.post_type == post_type)

    if search:
        stmt = stmt.where(Tag.name.ilike(f"%{search}%"))  # type: ignore

    # 使用 GROUP BY 代替 DISTINCT，以支持在 ORDER BY 中使用聚合/子查询
    stmt = stmt.group_by(Tag.id)

    if sort_by_usage:
        # 按使用频率排序（热门标签）
        from sqlalchemy import desc

        # 构建子查询计算每个标签的文章数
        # 注意：必须使用 scalar_subquery() 才能在 order_by 中使用
        count_sub = select(func.count(PostTagLink.post_id)).where(
            PostTagLink.tag_id == Tag.id
        )  # type: ignore

        if post_type:
            count_sub = count_sub.join(Post, PostTagLink.post_id == Post.id).where(
                Post.post_type == post_type
            )

        stmt = stmt.order_by(desc(count_sub.scalar_subquery()), Tag.name)
    else:
        # 默认按名称排序
        stmt = stmt.order_by(Tag.name)

    # 2. 分页
    page = await paginate_query(session, stmt, params)

    if not page.items:
        return page

    # 3. 聚合查询计数 (填充当前页的计数)
    # 虽然如果是 sort_by_usage，我们在排序时已经算过一次，但为了保持返回结构一致且避免 N+1 问题，
    # 我们还是对当前页的 item 进行一次批量 count 查询来填充 post_count 字段。
    tag_ids = [tag.id for tag in page.items]
    count_stmt = select(PostTagLink.tag_id, func.count(PostTagLink.post_id)).where(  # type: ignore
        PostTagLink.tag_id.in_(tag_ids)  # type: ignore
    )
    if post_type:
        count_stmt = count_stmt.join(Post, PostTagLink.post_id == Post.id).where(  # type: ignore
            Post.post_type == post_type
        )
    count_stmt = count_stmt.group_by(PostTagLink.tag_id)  # type: ignore
    count_result = await session.exec(count_stmt)
    count_map = {row[0]: row[1] for row in count_result.all()}

    # 4. 填充计数
    for tag in page.items:
        setattr(tag, "post_count", count_map.get(tag.id, 0))

    return page


async def get_tag_by_id(session: AsyncSession, tag_id: UUID) -> Tag:
    """根据 ID 获取标签

    Raises:
        TagNotFoundError: 标签不存在
    """
    from app.posts.exceptions import TagNotFoundError

    stmt = select(Tag).where(Tag.id == tag_id)
    result = await session.exec(stmt)
    tag = result.one_or_none()
    if not tag:
        raise TagNotFoundError()
    return tag


async def get_or_create_tag(session: AsyncSession, name: str, slug: str) -> Tag:
    """获取或创建标签 (用于同步 MDX 标签)"""
    from sqlalchemy import or_

    # 1. 优先通过 Slug 或 Name 寻找现有标签
    # 这是关键：必须同时检查两者，特别是 Slug，因为它是唯一索引且由 Name 生成
    stmt = select(Tag).where(or_(Tag.slug == slug, Tag.name == name))
    result = await session.exec(stmt)
    tag = result.one_or_none()

    if not tag:
        tag = Tag(name=name, slug=slug)
        session.add(tag)
        try:
            await session.flush()
        except Exception as e:
            # 防御性处理：如果在并发或极端情况下 flush 失败，回退并重新查询
            await session.rollback()
            stmt = select(Tag).where(or_(Tag.slug == slug, Tag.name == name))
            result = await session.exec(stmt)
            tag = result.one_or_none()

            if not tag:
                from app.core.exceptions import DatabaseError

                raise DatabaseError(
                    message=f"无法创建或获取标签: '{name}' (slug: {slug})。可能是由于数据库约束冲突或数据非法。",
                ) from e
    return tag


async def get_orphaned_tags(session: AsyncSession) -> list[Tag]:
    """获取孤立标签（没有任何文章关联）"""
    from app.posts.model import PostTagLink
    from sqlalchemy import not_

    # 查找不在 PostTagLink 中的标签
    subquery = select(PostTagLink.tag_id)
    stmt = (
        select(Tag)
        .where(not_(Tag.id.in_(subquery)))  # type: ignore
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
    """合并标签：将 source_tag 的所有文章关联转移到 target_tag，然后删除 source_tag

    Raises:
        TagNotFoundError: source_tag_id 或 target_tag_id 不存在
    """
    from app.posts.model import PostTagLink
    from sqlalchemy import delete, update

    # 1. 处理冲突：如果文章已经有了 target_tag，直接删除 source_tag 的关联
    # 避免 UPDATE 时产生 (post_id, target_tag_id) 的重复键
    stmt_conflict = (
        delete(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)  # type: ignore
        .where(
            PostTagLink.post_id.in_(  # type: ignore
                select(PostTagLink.post_id).where(PostTagLink.tag_id == target_tag_id)
            )
        )
    )
    await session.exec(stmt_conflict)

    # 2. 更新剩余的关联：source_tag → target_tag
    stmt = (
        update(PostTagLink)
        .where(PostTagLink.tag_id == source_tag_id)  # type: ignore
        .values(tag_id=target_tag_id)
    )
    await session.exec(stmt)

    # 3. 删除源标签（会抛异常如果不存在）
    source_tag = await get_tag_by_id(session, source_tag_id)
    await session.delete(source_tag)

    # 4. 返回目标标签（会抛异常如果不存在）
    target_tag = await get_tag_by_id(session, target_tag_id)
    await session.flush()
    return target_tag
