"""
测试分类封面同步逻辑
"""

import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.scanner import ScannedPost


@pytest.mark.unit
@pytest.mark.asyncio
class TestCategoryCoverSync:
    """测试分类封面同步的优先级逻辑"""

    async def test_cover_media_id_priority_valid(self):
        """测试优先使用有效的 cover_media_id"""
        # 准备测试数据
        media_id = uuid4()
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover_media_id": str(media_id),
                "cover": "tech-banner.jpg",  # 这个应该被忽略
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # 分类不存在
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # Mock media_crud.get_media_file（验证 ID 有效）
        with patch(
            "app.media.crud.get_media_file", new_callable=AsyncMock
        ) as mock_get_media_file:
            mock_media = MagicMock()
            mock_media.id = media_id
            mock_get_media_file.return_value = mock_media

            # 执行测试
            category = await handle_category_sync(
                mock_session, scanned, mock_user, content_dir
            )

            # 验证
            assert category is not None
            assert category.cover_media_id == media_id
            # 验证只调用了一次 get_media_file（验证 ID）
            mock_get_media_file.assert_called_once_with(mock_session, media_id)

    async def test_cover_media_id_invalid_fallback_to_cover(self):
        """测试 cover_media_id 无效时降级到 cover 字段"""
        # 准备测试数据
        invalid_media_id = uuid4()
        valid_media_id = uuid4()
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover_media_id": str(invalid_media_id),  # 无效的 ID
                "cover": "tech-banner.jpg",  # 应该降级到这个
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # Mock media_crud.get_media_file（ID 无效）
        with patch(
            "app.media.crud.get_media_file", new_callable=AsyncMock
        ) as mock_get_media_file:
            mock_get_media_file.return_value = None  # ID 不存在

            # Mock CoverProcessor._resolve_cover_media_id（从文件名解析）
            with patch(
                "app.git_ops.components.handlers.category_sync.CoverProcessor"
            ) as MockCoverProcessor:
                mock_processor = MagicMock()
                mock_processor._resolve_cover_media_id = AsyncMock(
                    return_value=valid_media_id
                )
                MockCoverProcessor.return_value = mock_processor

                # 执行测试
                category = await handle_category_sync(
                    mock_session, scanned, mock_user, content_dir
                )

                # 验证
                assert category is not None
                assert category.cover_media_id == valid_media_id
                # 验证先尝试了 ID，然后降级到文件名
                mock_get_media_file.assert_called_once()
                mock_processor._resolve_cover_media_id.assert_called_once()

    async def test_cover_only_no_media_id(self):
        """测试只有 cover 字段，没有 cover_media_id"""
        # 准备测试数据
        media_id = uuid4()
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover": "tech-banner.jpg",  # 只有 cover
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # Mock CoverProcessor._resolve_cover_media_id
        with patch(
            "app.git_ops.components.handlers.category_sync.CoverProcessor"
        ) as MockCoverProcessor:
            mock_processor = MagicMock()
            mock_processor._resolve_cover_media_id = AsyncMock(return_value=media_id)
            MockCoverProcessor.return_value = mock_processor

            # 执行测试
            category = await handle_category_sync(
                mock_session, scanned, mock_user, content_dir
            )

            # 验证
            assert category is not None
            assert category.cover_media_id == media_id
            # 验证直接调用了文件名解析
            mock_processor._resolve_cover_media_id.assert_called_once_with(
                mock_session,
                "tech-banner.jpg",
                mdx_file_path="articles/tech/index.md",
                content_dir=content_dir,
            )

    async def test_no_cover_fields(self):
        """测试没有任何封面字段"""
        # 准备测试数据
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                # 没有 cover_media_id 和 cover
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned, mock_user, content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id is None

    async def test_cover_media_id_invalid_format(self):
        """测试 cover_media_id 格式错误时的处理"""
        # 准备测试数据
        media_id = uuid4()
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover_media_id": "not-a-valid-uuid",  # 无效格式
                "cover": "tech-banner.jpg",
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # Mock CoverProcessor._resolve_cover_media_id
        with patch(
            "app.git_ops.components.handlers.category_sync.CoverProcessor"
        ) as MockCoverProcessor:
            mock_processor = MagicMock()
            mock_processor._resolve_cover_media_id = AsyncMock(return_value=media_id)
            MockCoverProcessor.return_value = mock_processor

            # 执行测试
            category = await handle_category_sync(
                mock_session, scanned, mock_user, content_dir
            )

            # 验证
            assert category is not None
            assert category.cover_media_id == media_id
            # 验证降级到了文件名解析
            mock_processor._resolve_cover_media_id.assert_called_once()

    async def test_image_field_as_fallback(self):
        """测试使用 image 字段作为 cover 的替代"""
        # 准备测试数据
        media_id = uuid4()
        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "image": "tech-banner.jpg",  # 使用 image 而不是 cover
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # Mock 依赖
        mock_session = MagicMock()
        mock_user = MagicMock()
        content_dir = Path("/fake/content")

        # Mock 数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_execute = AsyncMock(return_value=mock_result)
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()

        # Mock CoverProcessor._resolve_cover_media_id
        with patch(
            "app.git_ops.components.handlers.category_sync.CoverProcessor"
        ) as MockCoverProcessor:
            mock_processor = MagicMock()
            mock_processor._resolve_cover_media_id = AsyncMock(return_value=media_id)
            MockCoverProcessor.return_value = mock_processor

            # 执行测试
            category = await handle_category_sync(
                mock_session, scanned, mock_user, content_dir
            )

            # 验证
            assert category is not None
            assert category.cover_media_id == media_id
            # 验证使用了 image 字段
            mock_processor._resolve_cover_media_id.assert_called_once_with(
                mock_session,
                "tech-banner.jpg",
                mdx_file_path="articles/tech/index.md",
                content_dir=content_dir,
            )
