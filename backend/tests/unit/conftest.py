"""
单元测试公共 fixtures

提供单元测试中常用的 mock 对象和工具函数
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest


@pytest.fixture
def mock_session() -> AsyncMock:
    """提供 mock 的数据库 session

    用于不需要真实数据库的单元测试
    """
    session = AsyncMock()
    session.exec = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_user() -> MagicMock:
    """提供 mock 的用户对象

    用于需要用户但不需要真实数据库的测试
    """
    from app.users.model import UserRole

    user = MagicMock()
    user.id = uuid4()
    user.username = "testuser"
    user.email = "test@example.com"
    user.role = UserRole.USER
    return user


@pytest.fixture
def mock_admin_user() -> MagicMock:
    """提供 mock 的管理员用户对象"""
    from app.users.model import UserRole

    user = MagicMock()
    user.id = uuid4()
    user.username = "admin"
    user.email = "admin@example.com"
    user.role = UserRole.SUPERADMIN
    return user


@pytest.fixture
def mock_post() -> MagicMock:
    """提供 mock 的文章对象"""
    from app.posts.model import PostStatus, PostType

    post = MagicMock()
    post.id = uuid4()
    post.title = "Test Post"
    post.slug = "test-post"
    post.post_type = PostType.ARTICLE
    post.status = PostStatus.PUBLISHED
    post.author_id = uuid4()
    post.category_id = None
    post.cover_media_id = None
    return post


@pytest.fixture
def mock_media_file() -> MagicMock:
    """提供 mock 的媒体文件对象"""
    from app.media.model import MediaType

    media = MagicMock()
    media.id = uuid4()
    media.original_filename = "test.jpg"
    media.file_path = "uploads/test.jpg"
    media.mime_type = "image/jpeg"
    media.file_size = 1024
    media.media_type = MediaType.IMAGE
    return media


@pytest.fixture
def mock_category() -> MagicMock:
    """提供 mock 的分类对象"""
    category = MagicMock()
    category.id = uuid4()
    category.name = "Test Category"
    category.slug = "test-category"
    category.post_type = "article"
    return category
