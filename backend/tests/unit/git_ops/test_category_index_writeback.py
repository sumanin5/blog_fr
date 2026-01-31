"""
测试分类 index.md 回写逻辑
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.git_ops.schema import SyncStats
from app.git_ops.services.sync_service import SyncService
from app.posts.model import Category, PostType


@pytest.mark.unit
@pytest.mark.asyncio
class TestCategoryIndexWriteback:
    """测试同步时为缺失的分类创建 index.md"""

    async def test_write_missing_category_indexes(self):
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

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        # 创建 SyncService 实例
        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询（返回两个分类）
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [category1, category2]
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # Mock Path.exists（两个 index.md 都不存在）
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = False

            # Mock FileWriter
            with patch(
                "app.git_ops.components.writer.writer.FileWriter"
            ) as MockFileWriter:
                mock_writer = MagicMock()
                mock_writer.write_category = AsyncMock()
                MockFileWriter.return_value = mock_writer

                # 执行测试
                await sync_service._write_category_indexes(stats)

                # 验证
                # 应该为两个分类都创建了 index.md
                assert mock_writer.write_category.call_count == 2
                mock_writer.write_category.assert_any_call(category1)
                mock_writer.write_category.assert_any_call(category2)

                # 验证 stats 中添加了两个文件
                assert len(stats.added) == 2
                assert "articles/tech/index.md" in stats.added
                assert "articles/life/index.md" in stats.added

    async def test_skip_existing_category_indexes(self):
        """测试跳过已存在 index.md 的分类"""
        # 准备测试数据
        category = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # Mock Path.exists（index.md 已存在）
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = True

            # Mock FileWriter
            with patch(
                "app.git_ops.components.writer.writer.FileWriter"
            ) as MockFileWriter:
                mock_writer = MagicMock()
                mock_writer.write_category = AsyncMock()
                MockFileWriter.return_value = mock_writer

                # 执行测试
                await sync_service._write_category_indexes(stats)

                # 验证
                # 不应该调用 write_category
                mock_writer.write_category.assert_not_called()

                # stats 中不应该有新增文件
                assert len(stats.added) == 0

    async def test_mixed_existing_and_missing_indexes(self):
        """测试混合场景：部分分类有 index.md，部分没有"""
        # 准备测试数据
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

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [category1, category2]
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # Mock Path.exists（tech 存在，life 不存在）
        with patch.object(Path, "exists", lambda self: "tech" in str(self)):
            # Mock FileWriter
            with patch(
                "app.git_ops.components.writer.writer.FileWriter"
            ) as MockFileWriter:
                mock_writer = MagicMock()
                mock_writer.write_category = AsyncMock()
                MockFileWriter.return_value = mock_writer

                # 执行测试
                await sync_service._write_category_indexes(stats)

                # 验证
                # 只应该为 life 创建 index.md
                mock_writer.write_category.assert_called_once_with(category2)

                # stats 中只有一个新增文件
                assert len(stats.added) == 1
                assert "articles/life/index.md" in stats.added

    async def test_no_categories_in_database(self):
        """测试数据库中没有分类的情况"""
        stats = SyncStats()

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询（返回空列表）
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # 执行测试
        await sync_service._write_category_indexes(stats)

        # 验证
        # stats 应该为空
        assert len(stats.added) == 0

    async def test_write_category_with_cover(self):
        """测试为有封面的分类创建 index.md"""
        # 准备测试数据
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
        mock_cover = MagicMock()
        mock_cover.id = media_id
        mock_cover.original_filename = "tech-banner.jpg"
        category.cover_media = mock_cover

        stats = SyncStats()

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # Mock Path.exists（index.md 不存在）
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = False

            # Mock FileWriter
            with patch(
                "app.git_ops.components.writer.writer.FileWriter"
            ) as MockFileWriter:
                mock_writer = MagicMock()
                mock_writer.write_category = AsyncMock()
                MockFileWriter.return_value = mock_writer

                # 执行测试
                await sync_service._write_category_indexes(stats)

                # 验证
                # 应该调用 write_category，并且 category 有 cover_media
                mock_writer.write_category.assert_called_once_with(category)
                assert category.cover_media_id == media_id
                assert category.cover_media.original_filename == "tech-banner.jpg"

    async def test_handle_write_error_gracefully(self):
        """测试写入失败时的错误处理"""
        # 准备测试数据
        category = Category(
            id=uuid4(),
            name="技术文章",
            slug="tech",
            post_type=PostType.ARTICLES,
            is_active=True,
        )

        stats = SyncStats()

        # Mock 依赖
        mock_session = MagicMock()
        mock_content_dir = Path("/fake/content")

        # 创建 mock 容器
        mock_container = MagicMock()
        mock_container.session = mock_session
        mock_container.content_dir = mock_content_dir
        mock_container.git_client = MagicMock()

        sync_service = SyncService(
            session=mock_session,
            container=mock_container,
        )

        # Mock 数据库查询
        mock_execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [category]
        mock_execute.return_value = mock_result
        mock_session.execute = mock_execute

        # Mock Path.exists（index.md 不存在）
        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = False

            # Mock FileWriter（抛出异常）
            with patch(
                "app.git_ops.components.writer.writer.FileWriter"
            ) as MockFileWriter:
                mock_writer = MagicMock()
                mock_writer.write_category = AsyncMock(
                    side_effect=Exception("Write failed")
                )
                MockFileWriter.return_value = mock_writer

                # 执行测试（不应该抛出异常）
                await sync_service._write_category_indexes(stats)

                # 验证
                # 尝试了写入
                mock_writer.write_category.assert_called_once()

                # stats 中不应该有新增文件（因为写入失败）
                assert len(stats.added) == 0
