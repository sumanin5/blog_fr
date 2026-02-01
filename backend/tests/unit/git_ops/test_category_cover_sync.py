"""
测试分类封面同步逻辑

使用 conftest.py 中的公共 fixture，大幅减少重复代码
"""

import time
from uuid import uuid4

import pytest
from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.scanner import ScannedPost

# ============================================================================
# 本地 Fixtures - 特定于封面测试的数据
# ============================================================================


@pytest.fixture
def scanned_with_cover_media_id():
    """创建带有 cover_media_id 的 ScannedPost"""
    media_id = uuid4()
    return ScannedPost(
        file_path="articles/tech/index.md",
        frontmatter={
            "title": "技术文章",
            "cover_media_id": str(media_id),
            "cover": "tech-banner.jpg",
        },
        content="分类描述",
        content_hash="abc123",
        meta_hash="def456",
        updated_at=time.time(),
        is_category_index=True,
        derived_category_slug="tech",
        derived_post_type="articles",
    ), media_id


@pytest.fixture
def scanned_with_cover_only():
    """创建只有 cover 字段的 ScannedPost"""
    return ScannedPost(
        file_path="articles/tech/index.md",
        frontmatter={
            "title": "技术文章",
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


@pytest.fixture
def scanned_no_cover():
    """创建没有封面字段的 ScannedPost"""
    return ScannedPost(
        file_path="articles/tech/index.md",
        frontmatter={"title": "技术文章"},
        content="分类描述",
        content_hash="abc123",
        meta_hash="def456",
        updated_at=time.time(),
        is_category_index=True,
        derived_category_slug="tech",
        derived_post_type="articles",
    )


# ============================================================================
# Tests - 使用 fixture 简化测试
# ============================================================================


@pytest.mark.unit
@pytest.mark.asyncio
class TestCategoryCoverSync:
    """测试分类封面同步的优先级逻辑"""

    async def test_cover_media_id_priority_valid(
        self,
        mock_session,
        mock_user,
        mock_content_dir,
        scanned_with_cover_media_id,
        mock_get_media_file,
        mocker,
    ):
        """测试优先使用有效的 cover_media_id"""
        scanned, media_id = scanned_with_cover_media_id

        # 自定义 mock_get_media_file 的返回值
        mock_media = mocker.MagicMock()
        mock_media.id = media_id
        mock_get_media_file.return_value = mock_media

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id == media_id
        mock_get_media_file.assert_called_once_with(mock_session, media_id)

    async def test_cover_media_id_invalid_fallback_to_cover(
        self,
        mock_session,
        mock_user,
        mock_content_dir,
        mock_get_media_file,
        mock_cover_processor_factory,
    ):
        """测试 cover_media_id 无效时降级到 cover 字段"""
        invalid_media_id = uuid4()
        valid_media_id = uuid4()

        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover_media_id": str(invalid_media_id),
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

        # mock_get_media_file 默认返回 None（ID 无效）
        # 使用工厂创建 CoverProcessor mock
        mock_processor = mock_cover_processor_factory(valid_media_id)

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id == valid_media_id
        mock_get_media_file.assert_called_once()
        mock_processor._resolve_cover_media_id.assert_called_once()

    async def test_cover_only_no_media_id(
        self,
        mock_session,
        mock_user,
        mock_content_dir,
        scanned_with_cover_only,
        mock_cover_processor_factory,
    ):
        """测试只有 cover 字段，没有 cover_media_id"""
        media_id = uuid4()

        # 使用工厂创建 CoverProcessor mock
        mock_processor = mock_cover_processor_factory(media_id)

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned_with_cover_only, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id == media_id
        mock_processor._resolve_cover_media_id.assert_called_once_with(
            mock_session,
            "tech-banner.jpg",
            mdx_file_path="articles/tech/index.md",
            content_dir=mock_content_dir,
        )

    async def test_no_cover_fields(
        self, mock_session, mock_user, mock_content_dir, scanned_no_cover
    ):
        """测试没有任何封面字段"""
        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned_no_cover, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id is None

    async def test_cover_media_id_invalid_format(
        self, mock_session, mock_user, mock_content_dir, mock_cover_processor_factory
    ):
        """测试 cover_media_id 格式错误时的处理"""
        media_id = uuid4()

        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "cover_media_id": "not-a-valid-uuid",
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

        # 使用工厂创建 CoverProcessor mock
        mock_processor = mock_cover_processor_factory(media_id)

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id == media_id
        mock_processor._resolve_cover_media_id.assert_called_once()

    async def test_image_field_as_fallback(
        self, mock_session, mock_user, mock_content_dir, mock_cover_processor_factory
    ):
        """测试使用 image 字段作为 cover 的替代"""
        media_id = uuid4()

        scanned = ScannedPost(
            file_path="articles/tech/index.md",
            frontmatter={
                "title": "技术文章",
                "image": "tech-banner.jpg",
            },
            content="分类描述",
            content_hash="abc123",
            meta_hash="def456",
            updated_at=time.time(),
            is_category_index=True,
            derived_category_slug="tech",
            derived_post_type="articles",
        )

        # 使用工厂创建 CoverProcessor mock
        mock_processor = mock_cover_processor_factory(media_id)

        # 执行测试
        category = await handle_category_sync(
            mock_session, scanned, mock_user, mock_content_dir
        )

        # 验证
        assert category is not None
        assert category.cover_media_id == media_id
        mock_processor._resolve_cover_media_id.assert_called_once_with(
            mock_session,
            "tech-banner.jpg",
            mdx_file_path="articles/tech/index.md",
            content_dir=mock_content_dir,
        )
