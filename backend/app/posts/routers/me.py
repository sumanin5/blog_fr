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
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
):
    """获取当前用户的所有文章（包括草稿）

    权限：
    - 需要登录
    - 只能查看自己的文章

    支持筛选：
    - status: 文章状态（draft/published/archived）
    - category_id: 分类ID
    - tag_id: 标签ID
    - is_featured: 是否推荐
    - search: 搜索关键词

    分页参数：
    - page: 页码（默认1）
    - size: 每页数量（默认20，最大100）

    示例：
    - GET /posts/me - 我的所有文章（所有板块）
    - GET /posts/me?status=draft - 我的草稿
    - GET /posts/me?status=published&page=2&size=10 - 我的已发布文章（第2页）
    - GET /posts/me?search=Python - 搜索我的文章

    返回：
    - items: 文章列表
    - total: 总数
    - page: 当前页
    - size: 每页数量
    - pages: 总页数

    注意：
    - 此接口返回所有板块（article + idea）的文章
    - 如果需要按板块筛选，请使用管理后台接口
    """
    query = utils.build_posts_query(
        post_type=None,  # 不筛选类型，显示所有板块的文章
        status=filters.status,  # 可以筛选状态
        author_id=current_user.id,  # 只显示当前用户的
        category_id=filters.category_id,
        tag_id=filters.tag_id,
        is_featured=filters.is_featured,
        search_query=filters.search,
    )
    return await crud.paginate_query(session, query, params)
