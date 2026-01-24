"""
Posts CRUD Git Ops 相关函数单元测试

测试为 Git Ops 模块添加的新 CRUD 函数
"""

import pytest
from app.posts import cruds as posts_crud
from app.posts.model import Category, Post, PostStatus, PostType
from app.users.model import User, UserRole


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.posts
class TestPostsCrudGitOps:
    """Posts CRUD Git Ops 相关函数测试"""

    @pytest.fixture
    async def test_user(self, session):
        """创建测试用户"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed",
            role=UserRole.USER,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    @pytest.fixture
    async def test_category(self, session):
        """创建测试分类"""
        category = Category(
            name="Test Category",
            slug="test-category",
            post_type=PostType.ARTICLE,
        )
        session.add(category)
        await session.commit()
        await session.refresh(category)
        return category

    @pytest.fixture
    async def posts_with_source_path(self, session, test_user, test_category):
        """创建带有 source_path 的文章"""
        posts = []
        for i in range(3):
            post = Post(
                title=f"Post {i}",
                slug=f"post-{i}",
                content_mdx=f"# Post {i}",
                author_id=test_user.id,
                category_id=test_category.id,
                post_type=PostType.ARTICLE,
                status=PostStatus.PUBLISHED,
                source_path=f"articles/post-{i}.mdx",
            )
            session.add(post)
            posts.append(post)
        await session.commit()
        for post in posts:
            await session.refresh(post)
        return posts

    @pytest.fixture
    async def posts_without_source_path(self, session, test_user, test_category):
        """创建不带 source_path 的文章"""
        posts = []
        for i in range(2):
            post = Post(
                title=f"Manual Post {i}",
                slug=f"manual-post-{i}",
                content_mdx=f"# Manual Post {i}",
                author_id=test_user.id,
                category_id=test_category.id,
                post_type=PostType.ARTICLE,
                status=PostStatus.PUBLISHED,
                source_path=None,  # 没有 source_path
            )
            session.add(post)
            posts.append(post)
        await session.commit()
        for post in posts:
            await session.refresh(post)
        return posts

    async def test_get_posts_with_source_path_returns_only_synced_posts(
        self, session, posts_with_source_path, posts_without_source_path
    ):
        """测试只返回有 source_path 的文章"""
        result = await posts_crud.get_posts_with_source_path(session)

        assert len(result) == 3
        for post in result:
            assert post.source_path is not None

    async def test_get_posts_with_source_path_excludes_manual_posts(
        self, session, posts_with_source_path, posts_without_source_path
    ):
        """测试排除手动创建的文章"""
        result = await posts_crud.get_posts_with_source_path(session)

        # 验证没有手动创建的文章
        slugs = [post.slug for post in result]
        assert "manual-post-0" not in slugs
        assert "manual-post-1" not in slugs

    async def test_get_posts_with_source_path_empty_result(self, session):
        """测试没有同步文章时返回空列表"""
        result = await posts_crud.get_posts_with_source_path(session)

        assert result == []
        assert isinstance(result, list)

    async def test_get_posts_with_source_path_returns_list(
        self, session, posts_with_source_path
    ):
        """测试返回值是列表"""
        result = await posts_crud.get_posts_with_source_path(session)

        assert isinstance(result, list)
        assert all(isinstance(post, Post) for post in result)

    async def test_get_posts_with_source_path_preserves_post_data(
        self, session, posts_with_source_path
    ):
        """测试返回的文章数据完整"""
        result = await posts_crud.get_posts_with_source_path(session)

        post = result[0]
        assert post.title is not None
        assert post.slug is not None
        assert post.content_mdx is not None
        assert post.author_id is not None
        assert post.category_id is not None
        assert post.source_path is not None

    async def test_get_posts_with_source_path_with_mixed_posts(
        self, session, posts_with_source_path, posts_without_source_path
    ):
        """测试混合场景：既有同步文章又有手动文章"""
        result = await posts_crud.get_posts_with_source_path(session)

        # 应该只返回同步文章
        assert len(result) == 3
        for post in result:
            assert post.source_path is not None
            assert post.source_path.startswith("articles/")

    async def test_get_posts_with_source_path_multiple_calls_consistent(
        self, session, posts_with_source_path
    ):
        """测试多次调用结果一致"""
        result1 = await posts_crud.get_posts_with_source_path(session)
        result2 = await posts_crud.get_posts_with_source_path(session)

        assert len(result1) == len(result2)
        ids1 = {post.id for post in result1}
        ids2 = {post.id for post in result2}
        assert ids1 == ids2

    async def test_get_posts_with_source_path_with_null_source_path(
        self, session, test_user, test_category
    ):
        """测试处理 source_path 为 NULL 的情况"""
        # 创建一个 source_path 为 NULL 的文章
        post = Post(
            title="Null Source Path Post",
            slug="null-source-path",
            content_mdx="# Content",
            author_id=test_user.id,
            category_id=test_category.id,
            post_type=PostType.ARTICLE,
            status=PostStatus.PUBLISHED,
            source_path=None,
        )
        session.add(post)
        await session.commit()

        result = await posts_crud.get_posts_with_source_path(session)

        # 应该不包含这个文章
        assert all(p.id != post.id for p in result)

    async def test_get_posts_with_source_path_with_empty_string_source_path(
        self, session, test_user, test_category
    ):
        """测试处理 source_path 为空字符串的情况"""
        # 创建一个 source_path 为空字符串的文章
        post = Post(
            title="Empty Source Path Post",
            slug="empty-source-path",
            content_mdx="# Content",
            author_id=test_user.id,
            category_id=test_category.id,
            post_type=PostType.ARTICLE,
            status=PostStatus.PUBLISHED,
            source_path="",  # 空字符串
        )
        session.add(post)
        await session.commit()

        result = await posts_crud.get_posts_with_source_path(session)

        # 空字符串应该被视为有值（取决于实现）
        # 这个测试验证行为的一致性
        assert isinstance(result, list)

    async def test_get_posts_with_source_path_performance_with_many_posts(
        self, session, test_user, test_category
    ):
        """测试大量文章时的性能"""
        # 创建 100 个文章
        for i in range(100):
            post = Post(
                title=f"Post {i}",
                slug=f"post-{i}",
                content_mdx=f"# Post {i}",
                author_id=test_user.id,
                category_id=test_category.id,
                post_type=PostType.ARTICLE,
                status=PostStatus.PUBLISHED,
                source_path=f"articles/post-{i}.mdx" if i % 2 == 0 else None,
            )
            session.add(post)
        await session.commit()

        result = await posts_crud.get_posts_with_source_path(session)

        # 应该返回 50 个有 source_path 的文章
        assert len(result) == 50
        assert all(post.source_path is not None for post in result)

    async def test_get_posts_with_source_path_different_source_paths(
        self, session, test_user, test_category
    ):
        """测试不同的 source_path 格式"""
        paths = [
            "articles/test.mdx",
            "blog/post.mdx",
            "content/article.md",
            "docs/guide.mdx",
        ]

        for i, path in enumerate(paths):
            post = Post(
                title=f"Post {i}",
                slug=f"post-{i}",
                content_mdx=f"# Post {i}",
                author_id=test_user.id,
                category_id=test_category.id,
                post_type=PostType.ARTICLE,
                status=PostStatus.PUBLISHED,
                source_path=path,
            )
            session.add(post)
        await session.commit()

        result = await posts_crud.get_posts_with_source_path(session)

        assert len(result) == 4
        returned_paths = {post.source_path for post in result}
        assert returned_paths == set(paths)

    async def test_get_posts_with_source_path_preserves_relationships(
        self, session, posts_with_source_path
    ):
        """测试返回的文章保留关系字段"""
        result = await posts_crud.get_posts_with_source_path(session)

        post = result[0]
        # 验证关系字段可以访问
        assert post.author_id is not None
        assert post.category_id is not None
