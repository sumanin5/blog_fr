import pytest
from app.posts.model import Post, PostTagLink, PostType, Tag
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.fixture
async def tags_with_posts(session: AsyncSession, normal_user):
    """
    预置数据：
    Tag: "Popular" (关联 3 篇)
    Tag: "Normal" (关联 1 篇)
    Tag: "Empty" (关联 0 篇)
    """
    # 1. Create Tags
    tag_popular = Tag(name="Popular", slug="popular")
    tag_normal = Tag(name="Normal", slug="normal")
    tag_empty = Tag(name="Empty", slug="empty")
    session.add_all([tag_popular, tag_normal, tag_empty])
    await session.flush()

    # 2. Create Posts
    posts = [
        Post(
            title=f"Post {i}",
            slug=f"post-{i}",
            content_mdx="Content",
            post_type=PostType.ARTICLES,
            author_id=normal_user.id,
        )
        for i in range(4)
    ]
    session.add_all(posts)
    await session.flush()

    # 3. Create Links
    # Popular -> 3 posts
    session.add(PostTagLink(post_id=posts[0].id, tag_id=tag_popular.id))
    session.add(PostTagLink(post_id=posts[1].id, tag_id=tag_popular.id))
    session.add(PostTagLink(post_id=posts[2].id, tag_id=tag_popular.id))

    # Normal -> 1 post
    session.add(PostTagLink(post_id=posts[3].id, tag_id=tag_normal.id))

    await session.commit()

    return {"popular": tag_popular, "normal": tag_normal, "empty": tag_empty}


@pytest.mark.asyncio
async def test_list_tags_sorted_by_usage(
    async_client: AsyncClient, tags_with_posts: dict
):
    """测试按使用频率排序"""
    response = await async_client.get(
        "/api/v1/posts/articles/tags", params={"sort": "usage", "size": 10}
    )
    assert response.status_code == 200
    data = response.json()
    items = data["items"]

    # 验证排序: Popular(3) -> Normal(1)
    # Empty 标签因为没有关联文章，会被 INNER JOIN 过滤掉
    assert len(items) == 2

    # items[0] 应该是 Popular
    assert items[0]["slug"] == "popular"
    assert items[0]["post_count"] == 3

    # items[1] 应该是 Normal
    assert items[1]["slug"] == "normal"
    assert items[1]["post_count"] == 1


@pytest.mark.asyncio
async def test_list_tags_default_sort(async_client: AsyncClient, tags_with_posts: dict):
    """测试默认排序（按名称）"""
    # 明确请求 name 排序 (或默认)
    # Normal (N) -> Popular (P)
    # Empty (E) 被过滤
    response = await async_client.get(
        "/api/v1/posts/articles/tags", params={"sort": "name", "size": 10}
    )
    data = response.json()
    items = data["items"]

    assert len(items) == 2
    assert items[0]["slug"] == "normal"
    assert items[1]["slug"] == "popular"
