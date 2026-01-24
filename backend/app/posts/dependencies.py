"""
文章模块依赖项 (Dependencies)
"""

from typing import Annotated, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.core.exceptions import InsufficientPermissionsError
from app.posts import cruds as crud
from app.posts.exceptions import PostNotFoundError
from app.posts.model import Post, PostStatus
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession


async def get_post_by_id_dep(
    post_id: UUID, session: Annotated[AsyncSession, Depends(get_async_session)]
) -> Post:
    """获取文章依赖项，如果不存在抛出 404"""
    post = await crud.get_post_by_id(session, post_id)
    if not post:
        raise PostNotFoundError()
    return post


async def get_post_by_slug_dep(
    slug: str, session: Annotated[AsyncSession, Depends(get_async_session)]
) -> Post:
    """按 Slug 获取文章依赖项"""
    post = await crud.get_post_by_slug(session, slug)
    if not post:
        raise PostNotFoundError()
    return post


async def check_post_owner_or_admin(
    post: Annotated[Post, Depends(get_post_by_id_dep)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Post:
    """校验是否是文章作者或管理员"""
    if not current_user.is_admin and post.author_id != current_user.id:
        raise InsufficientPermissionsError()
    return post


class PostFilterParams:
    """文章列表过滤参数封装

    注意：不包含 post_type，因为它在不同路由中可能是路径参数或查询参数
    """

    def __init__(
        self,
        status: Annotated[
            Optional[PostStatus],
            Query(description="文章状态（draft/published/archived）"),
        ] = None,
        category_id: Annotated[Optional[UUID], Query(description="分类ID")] = None,
        tag_id: Annotated[Optional[UUID], Query(description="标签ID")] = None,
        author_id: Annotated[Optional[UUID], Query(description="作者ID")] = None,
        is_featured: Annotated[
            Optional[bool], Query(description="是否为推荐文章")
        ] = None,
        search: Annotated[
            Optional[str], Query(description="搜索关键词（标题、内容）")
        ] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="每页数量")] = 20,
        offset: Annotated[int, Query(ge=0, description="偏移量")] = 0,
    ):
        self.status = status
        self.category_id = category_id
        self.tag_id = tag_id
        self.author_id = author_id
        self.is_featured = is_featured
        self.search = search
        self.limit = limit
        self.offset = offset
