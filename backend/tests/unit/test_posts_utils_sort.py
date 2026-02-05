import pytest
from app.posts.model import PostSortOrder
from app.posts.utils import build_posts_query


@pytest.mark.asyncio
async def test_build_posts_query_with_sort_by():
    """测试排序功能"""

    # 测试发布时间倒序
    query_pub_desc = build_posts_query(sort_by=PostSortOrder.PUBLISHED_AT_DESC)
    # 检查 SQL 中是否包含 ORDER BY
    assert "ORDER BY" in str(query_pub_desc)

    # 测试标题正序
    query_title_asc = build_posts_query(sort_by=PostSortOrder.TITLE_ASC)
    str_query = str(query_title_asc)
    # 检查 SQL 中是否包含 title 排序
    assert (
        "posts_post.title ASC" in str_query
        or "posts_post.title" in str_query
        and "ASC" in str_query
    )

    # 测试标题倒序
    query_title_desc = build_posts_query(sort_by=PostSortOrder.TITLE_DESC)
    str_query = str(query_title_desc)
    assert (
        "posts_post.title DESC" in str_query
        or "posts_post.title" in str_query
        and "DESC" in str_query
    )


@pytest.mark.asyncio
async def test_build_posts_query_include_scheduled():
    """测试定时发布包含"""
    # 默认不包含 (include_scheduled=False)
    query_default = build_posts_query()
    # 应该包含时间过滤
    assert "posts_post.published_at <=" in str(query_default)

    # 包含 (include_scheduled=True)
    query_include = build_posts_query(include_scheduled=True)
    # 不应该包含时间过滤
    assert "posts_post.published_at <=" not in str(query_include)
