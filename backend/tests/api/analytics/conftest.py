import pytest
from app.analytics.model import AnalyticsEvent
from app.posts.model import Category, Post, PostStatus, PostType
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.fixture(scope="function")
async def test_category(session: AsyncSession) -> Category:
    """创建测试分类"""
    category = Category(
        name="测试分类",
        slug="test-category",
        post_type=PostType.ARTICLES,
        description="用于测试的分类",
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@pytest.fixture(scope="function")
async def test_post(
    session: AsyncSession,
    normal_user: User,
    test_category: Category,
) -> Post:
    """创建测试文章"""
    post = Post(
        title="测试文章",
        slug="test-post",
        excerpt="摘要",
        content_mdx="# 内容",
        post_type=PostType.ARTICLES,
        status=PostStatus.PUBLISHED,
        author_id=normal_user.id,
        category_id=test_category.id,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


@pytest.fixture(scope="function")
async def sample_events(session: AsyncSession, test_post: Post):
    """创建一些模拟数据用于测试聚合。"""
    events = [
        # 真实用户
        AnalyticsEvent(
            event_type="page_view",
            page_path="/",
            visitor_id="v1",
            session_id="s1",
            is_bot=False,
            browser_family="Chrome",
        ),
        AnalyticsEvent(
            event_type="page_view",
            page_path=f"/posts/articles/{test_post.slug}",
            post_id=test_post.id,
            visitor_id="v2",
            session_id="s2",
            is_bot=False,
            browser_family="Firefox",
        ),
        # 爬虫
        AnalyticsEvent(
            event_type="page_view",
            page_path="/",
            visitor_id="bot1",
            session_id="sb1",
            is_bot=True,
            browser_family="Googlebot",
        ),
    ]
    for e in events:
        session.add(e)
    await session.commit()
    return events
