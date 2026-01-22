from typing import Annotated

from app.core.db import get_async_session
from app.posts import crud, utils
from app.posts.dependencies import PostFilterParams
from app.posts.schema import PostShortResponse
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, Depends
from fastapi_pagination import Page, Params
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.get(
    "/me",
    response_model=Page[PostShortResponse],
    summary="获取当前用户的文章列表",
)
async def get_my_posts(
    current_user: Annotated[User, Depends(get_current_active_user)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取当前用户的所有文章（包括草稿）

    示例：
    - GET /posts/me - 我的所有文章
    - GET /posts/me?status=draft - 我的草稿
    - GET /posts/me?status=published - 我的已发布文章

    注意：需要登录才能访问
    """
    query = utils.build_posts_query(
        post_type=filters.post_type,  # 可以筛选类型
        status=filters.status,  # 可以筛选状态
        author_id=current_user.id,  # 只显示当前用户的
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await crud.paginate_query(session, query, params)
