"""
文章模块依赖项 (Dependencies)
"""

from typing import Annotated, Optional
from uuid import UUID

from app.core.db import get_async_session
from app.core.exceptions import InsufficientPermissionsError
from app.posts import crud
from app.posts.exceptions import PostNotFoundError
from app.posts.model import Post, PostType
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
    """文章列表过滤参数封装"""

    def __init__(
        self,
        post_type: Optional[PostType] = None,
        category_id: Optional[UUID] = None,
        tag_id: Optional[UUID] = None,
        author_id: Optional[UUID] = None,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = Query(20, ge=1, le=100),
        offset: int = Query(0, ge=0),
    ):
        self.post_type = post_type
        self.category_id = category_id
        self.tag_id = tag_id
        self.author_id = author_id
        self.is_featured = is_featured
        self.search = search
        self.limit = limit
        self.offset = offset
