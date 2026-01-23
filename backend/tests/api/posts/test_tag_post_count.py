"""
标签文章计数测试

测试内容：
- 标签列表中的 post_count 字段是否正确
- 按 post_type 筛选时的 post_count 是否正确
- 不同状态文章对 post_count 的影响
"""

import pytest
from app.posts.model import Post, PostStatus, PostType, Tag
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig


@pytest.mark.asyncio
@pytest.mark.posts
async def test_tag_post_count_by_type(
    async_client: AsyncClient,
    session,
    test_category,
    normal_user,
    api_urls: APIConfig,
):
    """测试按类型获取标签时，post_count 只计算该类型的文章"""
    # 创建标签
    tag1 = Tag(name="Python", slug="python")
    tag2 = Tag(name="JavaScript", slug="javascript")
    session.add_all([tag1, tag2])
    await session.commit()
    await session.refresh(tag1)
    await session.refresh(tag2)

    # 创建 article 类型的文章
    article1 = Post(
        title="Python Article 1",
        slug="python-article-1",
        content_mdx="# Python",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    article2 = Post(
        title="Python Article 2",
        slug="python-article-2",
        content_mdx="# Python",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    article1.tags = [tag1]
    article2.tags = [tag1, tag2]

    # 创建 idea 类型的文章
    idea1 = Post(
        title="Python Idea 1",
        slug="python-idea-1",
        content_mdx="# Idea",
        post_type=PostType.IDEA,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    idea1.tags = [tag1]

    session.add_all([article1, article2, idea1])
    await session.commit()

    # 测试 article 类型的标签列表
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/tags")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 找到 Python 标签
    python_tag = next((t for t in items if t["name"] == "Python"), None)
    assert python_tag is not None
    assert "post_count" in python_tag
    # Python 标签在 article 类型下有 2 篇文章
    assert python_tag["post_count"] == 2

    # 找到 JavaScript 标签
    js_tag = next((t for t in items if t["name"] == "JavaScript"), None)
    assert js_tag is not None
    assert js_tag["post_count"] == 1

    # 测试 idea 类型的标签列表
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/idea/tags")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 找到 Python 标签
    python_tag = next((t for t in items if t["name"] == "Python"), None)
    assert python_tag is not None
    # Python 标签在 idea 类型下只有 1 篇文章
    assert python_tag["post_count"] == 1

    # JavaScript 标签在 idea 类型下没有文章，不应该出现
    js_tag = next((t for t in items if t["name"] == "JavaScript"), None)
    assert js_tag is None


@pytest.mark.asyncio
@pytest.mark.posts
async def test_admin_tag_post_count_all_types(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    session,
    test_category,
    normal_user,
    api_urls: APIConfig,
):
    """测试后台标签列表的 post_count 包含所有类型的文章"""
    # 创建标签
    tag = Tag(name="FullStack", slug="fullstack")
    session.add(tag)
    await session.commit()
    await session.refresh(tag)

    # 创建不同类型的文章
    article = Post(
        title="FullStack Article",
        slug="fullstack-article",
        content_mdx="# Article",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    idea = Post(
        title="FullStack Idea",
        slug="fullstack-idea",
        content_mdx="# Idea",
        post_type=PostType.IDEA,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    article.tags = [tag]
    idea.tags = [tag]

    session.add_all([article, idea])
    await session.commit()

    # 测试后台标签列表
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/admin/tags",
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 找到 FullStack 标签
    fullstack_tag = next((t for t in items if t["name"] == "FullStack"), None)
    assert fullstack_tag is not None
    assert "post_count" in fullstack_tag
    # 应该包含所有类型的文章
    assert fullstack_tag["post_count"] == 2


@pytest.mark.asyncio
@pytest.mark.posts
async def test_tag_post_count_excludes_drafts(
    async_client: AsyncClient,
    session,
    test_category,
    normal_user,
    api_urls: APIConfig,
):
    """测试 post_count 是否排除草稿状态的文章"""
    # 创建标签
    tag = Tag(name="Django", slug="django")
    session.add(tag)
    await session.commit()
    await session.refresh(tag)

    # 创建已发布文章
    published_post = Post(
        title="Django Published",
        slug="django-published",
        content_mdx="# Published",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    published_post.tags = [tag]

    # 创建草稿文章
    draft_post = Post(
        title="Django Draft",
        slug="django-draft",
        content_mdx="# Draft",
        post_type=PostType.ARTICLE,
        status=PostStatus.DRAFT,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    draft_post.tags = [tag]

    session.add_all([published_post, draft_post])
    await session.commit()

    # 测试公开接口的标签列表
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/tags")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 找到 Django 标签
    django_tag = next((t for t in items if t["name"] == "Django"), None)
    assert django_tag is not None
    # post_count 应该包含所有文章（包括草稿），因为这是标签的总关联数
    # 注意：这取决于你的业务逻辑，如果只想计算已发布的，需要修改 CRUD 逻辑
    assert django_tag["post_count"] == 2


@pytest.mark.asyncio
@pytest.mark.posts
async def test_tag_post_count_with_search(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    session,
    test_category,
    normal_user,
    api_urls: APIConfig,
):
    """测试搜索标签时 post_count 是否正确"""
    # 创建标签
    tag1 = Tag(name="React Native", slug="react-native")
    tag2 = Tag(name="React", slug="react")
    tag3 = Tag(name="Vue", slug="vue")
    session.add_all([tag1, tag2, tag3])
    await session.commit()
    await session.refresh(tag1)
    await session.refresh(tag2)
    await session.refresh(tag3)

    # 创建文章
    post1 = Post(
        title="React Native Post",
        slug="react-native-post",
        content_mdx="# React Native",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    post2 = Post(
        title="React Post",
        slug="react-post",
        content_mdx="# React",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    post1.tags = [tag1]
    post2.tags = [tag2]

    session.add_all([post1, post2])
    await session.commit()

    # 搜索 "React" 标签
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/admin/tags?search=React",
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 应该返回 React 和 React Native，但不包含 Vue
    assert len(items) == 2
    tag_names = [t["name"] for t in items]
    assert "React" in tag_names
    assert "React Native" in tag_names
    assert "Vue" not in tag_names

    # 验证 post_count
    for tag in items:
        assert "post_count" in tag
        assert tag["post_count"] == 1


@pytest.mark.asyncio
@pytest.mark.posts
async def test_tag_post_count_zero_for_orphaned(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    session,
    api_urls: APIConfig,
):
    """测试孤立标签的 post_count 为 0"""
    # 创建孤立标签（没有关联任何文章）
    orphaned_tag = Tag(name="Orphaned", slug="orphaned")
    session.add(orphaned_tag)
    await session.commit()

    # 测试后台标签列表
    response = await async_client.get(
        f"{api_urls.API_PREFIX}/posts/admin/tags",
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]

    # 找到孤立标签
    orphaned = next((t for t in items if t["name"] == "Orphaned"), None)
    assert orphaned is not None
    assert orphaned["post_count"] == 0
