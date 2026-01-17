"""
Posts 测试配置和 Fixtures
"""

from typing import List

import pytest
from app.posts.model import Category, Post, PostStatus, PostType, Tag
from app.users.model import User
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

# ============================================================
# 测试数据配置
# ============================================================


class PostTestData:
    """Posts 测试数据"""

    # 有效的文章创建数据
    VALID_POST_DATA = {
        "title": "测试文章标题",
        "slug": "test-article-slug",
        "excerpt": "这是文章摘要",
        "content_mdx": "# 标题\n\n这是文章内容",
        "post_type": "article",
        "status": "published",
    }

    # 有效的分类创建数据
    VALID_CATEGORY_DATA = {
        "name": "技术分享",
        "slug": "tech-share",
        "post_type": "article",
        "description": "技术相关的文章",
    }

    # 有效的标签数据
    VALID_TAG_DATA = {
        "name": "Python",
        "slug": "python",
        "color": "#3776AB",
    }


@pytest.fixture(scope="function")
def post_test_data() -> PostTestData:
    """返回 Posts 测试数据"""
    return PostTestData()


# ============================================================
# Category Fixtures
# ============================================================


@pytest.fixture(scope="function")
async def test_category(session: AsyncSession) -> Category:
    """创建测试分类"""
    category = Category(
        name="测试分类",
        slug="test-category",
        post_type=PostType.ARTICLE,  # 使用 Enum 值
        description="用于测试的分类",
        order=1,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@pytest.fixture(scope="function")
async def idea_category(session: AsyncSession) -> Category:
    """创建想法类型的分类"""
    category = Category(
        name="想法分类",
        slug="idea-category",
        post_type=PostType.IDEA,
        description="用于测试的想法分类",
        order=1,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@pytest.fixture(scope="function")
async def multiple_categories(session: AsyncSession) -> List[Category]:
    """创建多个分类用于列表测试"""
    categories = []
    for i in range(3):
        category = Category(
            name=f"分类 {i}",
            slug=f"category-{i}",
            post_type=PostType.ARTICLE,
            order=i,
            description=f"分类 {i} 的描述",
        )
        session.add(category)
        categories.append(category)

    await session.commit()
    for cat in categories:
        await session.refresh(cat)
    return categories


# ============================================================
# Tag Fixtures
# ============================================================


@pytest.fixture(scope="function")
async def test_tag(session: AsyncSession) -> Tag:
    """创建测试标签"""
    tag = Tag(
        name="Python",
        slug="python",
        color="#3776AB",
    )
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return tag


@pytest.fixture(scope="function")
async def multiple_tags(session: AsyncSession) -> List[Tag]:
    """创建多个标签"""
    tags = []
    tag_data = [
        ("Python", "python", "#3776AB"),
        ("FastAPI", "fastapi", "#009688"),
        ("React", "react", "#61DAFB"),
    ]
    for name, slug, color in tag_data:
        tag = Tag(name=name, slug=slug, color=color)
        session.add(tag)
        tags.append(tag)

    await session.commit()
    for tag in tags:
        await session.refresh(tag)
    return tags


# ============================================================
# Post Fixtures
# ============================================================


@pytest.fixture(scope="function")
async def test_post(
    session: AsyncSession,
    normal_user: User,
    test_category: Category,
) -> Post:
    """创建测试文章（已发布）"""
    post = Post(
        title="测试文章",
        slug="test-post",
        excerpt="这是测试文章的摘要",
        content_mdx="# 测试\n\n这是内容",
        content_ast={
            "type": "root",
            "children": [
                {
                    "type": "heading",
                    "level": 1,
                    "children": [{"type": "text", "value": "测试"}],
                }
            ],
        },
        toc=[{"id": "ce-shi", "title": "测试", "level": 1}],
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


@pytest.fixture(scope="function")
async def draft_post(
    session: AsyncSession,
    normal_user: User,
) -> Post:
    """创建草稿文章"""
    post = Post(
        title="草稿文章",
        slug="draft-post",
        excerpt="草稿摘要",
        content_mdx="# 草稿\n\n草稿内容",
        content_ast={
            "type": "root",
            "children": [
                {
                    "type": "heading",
                    "level": 1,
                    "children": [{"type": "text", "value": "草稿"}],
                }
            ],
        },
        toc=[{"id": "cao-gao", "title": "草稿", "level": 1}],
        post_type=PostType.ARTICLE,
        status=PostStatus.DRAFT,
        author_id=normal_user.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


@pytest.fixture(scope="function")
async def admin_post(
    session: AsyncSession,
    admin_user: User,
    test_category: Category,
) -> Post:
    """创建管理员的文章"""
    post = Post(
        title="管理员文章",
        slug="admin-post",
        excerpt="管理员的文章",
        content_mdx="# 管理员\n\n内容",
        content_html="<h1>管理员</h1><p>内容</p>",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=admin_user.id,
        category_id=test_category.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


@pytest.fixture(scope="function")
async def multiple_posts(
    session: AsyncSession,
    normal_user: User,
    admin_user: User,
    test_category: Category,
) -> List[Post]:
    """创建多篇文章（不同作者、不同状态）"""
    posts = []

    # 普通用户的已发布文章
    for i in range(3):
        post = Post(
            title=f"文章 {i}",
            slug=f"post-{i}",
            excerpt=f"摘要 {i}",
            content_mdx=f"# 标题 {i}\n\n内容",
            content_html=f"<h1>标题 {i}</h1><p>内容</p>",
            post_type=PostType.ARTICLE,
            status=PostStatus.PUBLISHED,
            author_id=normal_user.id,
            category_id=test_category.id,
        )
        session.add(post)
        posts.append(post)

    # 管理员的文章
    admin_post = Post(
        title="管理员文章",
        slug="admin-post-list",
        excerpt="管理员的文章",
        content_mdx="# 管理员\n\n内容",
        content_html="<h1>管理员</h1><p>内容</p>",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=admin_user.id,
        category_id=test_category.id,
    )
    session.add(admin_post)
    posts.append(admin_post)

    await session.commit()
    for post in posts:
        await session.refresh(post)
    return posts


@pytest.fixture(scope="function")
async def post_with_tags(
    session: AsyncSession,
    normal_user: User,
    test_category: Category,
    multiple_tags: List[Tag],
) -> Post:
    """创建带标签的文章"""
    post = Post(
        title="带标签的文章",
        slug="post-with-tags",
        excerpt="这篇文章有标签",
        content_mdx="# 标题\n\n内容",
        content_html="<h1>标题</h1><p>内容</p>",
        post_type=PostType.ARTICLE,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
        tags=multiple_tags,  # 关联标签
    )
    session.add(post)
    await session.commit()
    # 预加载 tags，避免懒加载
    stmt = select(Post).where(Post.id == post.id).options(selectinload(Post.tags))
    result = await session.exec(stmt)
    post = result.one()
    return post


# ============================================================
# 辅助工具函数
# ============================================================


def assert_post_response(data: dict):
    """断言文章响应格式"""
    assert "id" in data
    assert "title" in data
    assert "slug" in data
    assert "excerpt" in data
    assert "post_type" in data
    assert "status" in data
    assert "author" in data
    assert "created_at" in data
    assert "updated_at" in data


def assert_post_list_item(data: dict):
    """断言文章列表项格式（不包含正文）"""
    assert "id" in data
    assert "title" in data
    assert "slug" in data
    assert "excerpt" in data
    # 列表查询不应该包含正文
    assert "content_mdx" not in data
    assert "content_html" not in data
    assert "toc" not in data


def assert_post_detail(data: dict):
    """断言文章详情格式（包含正文）"""
    assert_post_response(data)
    # 详情查询应该包含正文（content_mdx 或 content_ast，取决于 enable_jsx）
    assert "toc" in data
    # 至少有一个内容字段
    assert data.get("content_mdx") is not None or data.get("content_ast") is not None


def assert_category_response(data: dict):
    """断言分类响应格式"""
    assert "id" in data
    assert "name" in data
    assert "slug" in data
    assert "post_type" in data
    assert "description" in data
    assert "sort_order" in data  # 正确的字段名


def assert_tag_response(data: dict):
    """断言标签响应格式"""
    assert "id" in data
    assert "name" in data
    assert "slug" in data
