"""
测试分类 index.md 回写逻辑

注意：这些测试使用旧的类式 API，已重构为使用 pytest 和 conftest fixture
TODO: 重写这些测试以适配新的函数式 API
"""

from pathlib import Path
from uuid import uuid4

import pytest
from app.git_ops.schema import SyncStats
from app.posts.model import Category, PostType


@pytest.mark.skip(reason="需要重写以适配函数式 API")
@pytest.mark.unit
@pytest.mark.asyncio
class TestCategoryIndexWriteback:
    """测试同步时为缺失的分类创建 index.md"""

    async def test_write_missing_category_indexes(
        self, mock_session, mock_content_dir, mock_file_writer, mocker
    ):
        """测试为没有 index.md 的分类创建文件"""
        # 准备测试数据
        category1 = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            icon_preset="💻",
            sort_order=1,
            is_active=True,
            description="技术分类描述",
        )

        category2 = Category(
            id=uuid4(),
            name="生活随笔",
            slug="life",
            post_type=PostType.ARTICLES,
            icon_preset="📝",
            sort_order=2,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 数据库查询（返回两个分类）
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = [category1, category2]
        mock_session.execute.return_value = mock_result

        # Mock Path.exists（两个 index.md 都不存在）
        mocker.patch("pathlib.Path.exists", return_value=False)

        # TODO: 使用新的函数式 API
        # await write_category_indexes(session, content_dir, stats)

        # 验证
        assert mock_file_writer.write_category.call_count == 2
        mock_file_writer.write_category.assert_any_call(category1)
        mock_file_writer.write_category.assert_any_call(category2)
        assert len(stats.added) == 2
        assert "articles/tech/index.md" in stats.added
        assert "articles/life/index.md" in stats.added

    async def test_skip_existing_category_indexes(
        self, mock_session, mock_content_dir, mock_file_writer, mocker
    ):
        """测试跳过已存在 index.md 的分类"""
        category = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 数据库查询
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_session.execute.return_value = mock_result

        # Mock Path.exists（index.md 已存在）
        mocker.patch("pathlib.Path.exists", return_value=True)

        # TODO: 使用新的函数式 API

        # 验证
        mock_file_writer.write_category.assert_not_called()
        assert len(stats.added) == 0

    async def test_mixed_existing_and_missing_indexes(
        self, mock_session, mock_content_dir, mock_file_writer, mocker
    ):
        """测试混合场景：部分分类有 index.md，部分没有"""
        category1 = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        category2 = Category(
            id=uuid4(),
            name="生活随笔",
            slug="life",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 数据库查询
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = [category1, category2]
        mock_session.execute.return_value = mock_result

        # Mock Path.exists（tech 存在，life 不存在）
        mocker.patch.object(Path, "exists", lambda self: "tech" in str(self))

        # TODO: 使用新的函数式 API

        # 验证
        mock_file_writer.write_category.assert_called_once_with(category2)
        assert len(stats.added) == 1
        assert "articles/life/index.md" in stats.added

    async def test_no_categories_in_database(
        self, mock_session, mock_content_dir, mocker
    ):
        """测试数据库中没有分类的情况"""
        stats = SyncStats()

        # Mock 数据库查询（返回空列表）
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = mock_result

        # TODO: 使用新的函数式 API

        # 验证
        assert len(stats.added) == 0

    async def test_write_category_with_cover(
        self, mock_session, mock_content_dir, mock_file_writer, mocker
    ):
        """测试为有封面的分类创建 index.md"""
        media_id = uuid4()
        category = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            cover_media_id=media_id,
            is_active=True,
        )

        # Mock cover_media 关系
        mock_cover = mocker.MagicMock()
        mock_cover.id = media_id
        mock_cover.original_filename = "tech-banner.jpg"
        category.cover_media = mock_cover

        stats = SyncStats()

        # Mock 数据库查询
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_session.execute.return_value = mock_result

        # Mock Path.exists（index.md 不存在）
        mocker.patch("pathlib.Path.exists", return_value=False)

        # TODO: 使用新的函数式 API

        # 验证
        mock_file_writer.write_category.assert_called_once_with(category)
        assert category.cover_media_id == media_id
        assert category.cover_media.original_filename == "tech-banner.jpg"

    async def test_handle_write_error_gracefully(
        self, mock_session, mock_content_dir, mocker
    ):
        """测试写入失败时的错误处理"""
        category = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 数据库查询
        mock_result = mocker.MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_session.execute.return_value = mock_result

        # Mock Path.exists（index.md 不存在）
        mocker.patch("pathlib.Path.exists", return_value=False)

        # Mock FileWriter（抛出异常）
        mock_writer = mocker.MagicMock()
        mock_writer.write_category = mocker.AsyncMock(
            side_effect=Exception("Write failed")
        )
        mocker.patch(
            "app.git_ops.components.writer.writer.FileWriter", return_value=mock_writer
        )

        # TODO: 使用新的函数式 API
        # 执行测试（不应该抛出异常）

        # 验证
        mock_writer.write_category.assert_called_once()
        assert len(stats.added) == 0
