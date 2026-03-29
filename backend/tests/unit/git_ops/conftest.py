"""
Git Ops 测试的公共 fixtures

提供可复用的 mock 对象，减少测试代码重复
"""

from pathlib import Path

import pytest

# ============================================================================
# Mock 容器和依赖
# ============================================================================


@pytest.fixture
def mock_session(mocker):
    """创建 mock 数据库会话"""
    session = mocker.MagicMock()

    # 常用的数据库操作 mock
    mock_result = mocker.MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalars.return_value.all.return_value = []

    session.execute = mocker.AsyncMock(return_value=mock_result)
    session.add = mocker.MagicMock()
    session.flush = mocker.AsyncMock()
    session.commit = mocker.AsyncMock()
    session.refresh = mocker.AsyncMock()

    return session


@pytest.fixture
def mock_user(mocker):
    """创建 mock 用户"""
    user = mocker.MagicMock()
    user.id = mocker.MagicMock()
    user.username = "test_user"
    return user


@pytest.fixture
def mock_user_with_id(mocker):
    """创建 mock 用户（包含真实的 UUID id）"""
    from uuid import uuid4
    user = mocker.MagicMock()
    user.id = uuid4()
    user.username = "test_user"
    return user


@pytest.fixture
def mock_content_dir():
    """创建 mock content 目录"""
    return Path("/fake/content")


@pytest.fixture
def mock_git_client(mocker):
    """创建 mock Git 客户端"""
    client = mocker.MagicMock()
    client.get_current_hash = mocker.AsyncMock(return_value="abc123")
    client.get_changed_files_with_status = mocker.AsyncMock(return_value=[])
    client.get_file_status = mocker.AsyncMock(return_value=[])  # Critical fix
    client.add = mocker.AsyncMock()
    client.commit = mocker.AsyncMock()
    client.push = mocker.AsyncMock()
    client.pull = mocker.AsyncMock(return_value="Already up to date.")
    client.run = mocker.AsyncMock(return_value=(0, "ok", ""))
    return client


@pytest.fixture
def mock_container(mocker, mock_session, mock_git_client, mock_content_dir):
    """创建 mock DI 容器

    包含所有常用的依赖：session, git_client, content_dir, scanner, serializer, github, hash_manager, sync_processor
    """
    container = mocker.MagicMock()
    container.session = mock_session
    container.git_client = mock_git_client
    container.content_dir = mock_content_dir

    # Mock scanner
    container.scanner = mocker.MagicMock()
    container.scanner.scan_all = mocker.AsyncMock(return_value=[])
    container.scanner.scan_file = mocker.AsyncMock()

    # Mock serializer
    container.serializer = mocker.MagicMock()
    container.serializer.from_frontmatter = mocker.AsyncMock(return_value={})
    container.serializer.match_post = mocker.AsyncMock(return_value=(None, False))

    # Mock GitHubComponent
    container.github = mocker.MagicMock()
    container.github.pull = mocker.AsyncMock(
        return_value=("pull output", "old_hash_abc", "new_hash_def")
    )
    container.github.commit_and_push = mocker.AsyncMock(return_value=True)
    container.github.auto_commit_metadata = mocker.AsyncMock(return_value=True)

    # Mock HashManager
    container.hash_manager = mocker.MagicMock()
    container.hash_manager.get_last_hash = mocker.MagicMock(return_value="abc123")
    container.hash_manager.save_current_hash = mocker.AsyncMock(return_value="abc123")
    container.hash_manager.has_new_commits = mocker.AsyncMock(return_value=True)
    container.hash_manager.get_changed_files_since_last_sync = mocker.AsyncMock(
        return_value=[]
    )

    # Mock SyncProcessor
    container.sync_processor = mocker.MagicMock()
    container.sync_processor.process_file_change = mocker.AsyncMock()
    container.sync_processor.process_scanned_file = mocker.AsyncMock()

    return container


# ============================================================================
# Mock 服务
# ============================================================================


@pytest.fixture
def mock_commit_service(mocker):
    """创建 mock CommitService"""
    mock_service = mocker.MagicMock()
    mock_service.auto_commit = mocker.AsyncMock()

    # Mock CommitService 类
    mocker.patch(
        "app.git_ops.services.commit_service.CommitService", return_value=mock_service
    )

    return mock_service


@pytest.fixture
def mock_file_writer(mocker):
    """创建 mock FileWriter"""
    mock_writer = mocker.MagicMock()
    mock_writer.write_category = mocker.AsyncMock()
    mock_writer.write_post = mocker.AsyncMock()

    mocker.patch(
        "app.git_ops.components.writer.writer.FileWriter", return_value=mock_writer
    )

    return mock_writer


# ============================================================================
# Mock 处理器
# ============================================================================


@pytest.fixture
def mock_cover_processor(mocker):
    """创建 mock CoverProcessor"""
    mock_processor = mocker.MagicMock()
    mock_processor._resolve_cover_media_id = mocker.AsyncMock(return_value=None)

    mocker.patch(
        "app.git_ops.components.handlers.category_sync.CoverProcessor",
        return_value=mock_processor,
    )

    return mock_processor


# ============================================================================
# Mock 数据模型
# ============================================================================


@pytest.fixture
def mock_scanned_post(mocker):
    """创建 mock ScannedPost"""
    scanned = mocker.MagicMock()
    scanned.file_path = "articles/test/post.md"
    scanned.derived_category_slug = "test"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {"title": "Test Post"}
    scanned.content = "Test content"
    scanned.is_category_index = False
    scanned.content_hash = "abc123"
    scanned.meta_hash = "def456"
    return scanned


@pytest.fixture
def mock_category_index(mocker):
    """创建 mock 分类 index.md 的 ScannedPost"""
    scanned = mocker.MagicMock()
    scanned.file_path = "articles/test/index.md"
    scanned.derived_category_slug = "test"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {"title": "Test Category", "icon": "📁"}
    scanned.content = "Category description"
    scanned.is_category_index = True
    return scanned


@pytest.fixture
def mock_get_media_file(mocker):
    """创建 mock get_media_file 函数

    默认返回 None，可以在测试中通过 return_value 自定义返回值
    """
    return mocker.patch(
        "app.media.crud.get_media_file",
        new_callable=mocker.AsyncMock,
        return_value=None,
    )


@pytest.fixture
def mock_cover_processor_factory(mocker):
    """创建 mock CoverProcessor 工厂函数

    返回一个函数，可以自定义 _resolve_cover_media_id 的返回值
    使用方式：mock_cover_processor_factory(media_id)
    """

    def _create_mock(return_value=None):
        mock_processor = mocker.MagicMock()
        mock_processor._resolve_cover_media_id = mocker.AsyncMock(
            return_value=return_value
        )

        mocker.patch(
            "app.git_ops.components.handlers.category_sync.CoverProcessor",
            return_value=mock_processor,
        )

        return mock_processor

    return _create_mock
