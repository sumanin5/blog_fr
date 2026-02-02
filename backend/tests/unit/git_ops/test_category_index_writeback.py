"""
测试分类 index.md 回写逻辑

测试 SyncService.sync_all 方法中包含的 "确保分类索引存在" 的逻辑
"""

from pathlib import Path
from uuid import uuid4

import pytest
from app.posts.model import Category


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.asyncio
class TestCategoryIndexWriteback:
    """测试 SyncProcessor.sync_categories_to_disk 回写逻辑"""

    @pytest.fixture
    def setup_processor(self, mock_container, mock_session, mocker):
        """设置 SyncProcessor 及其依赖"""
        from app.git_ops.components.handlers.file_processor import SyncProcessor
        from app.git_ops.components.scanner import MDXScanner
        from app.git_ops.components.serializer import PostSerializer
        from app.git_ops.schema import SyncStats

        mock_scanner = mocker.Mock(spec=MDXScanner)
        mock_serializer = mocker.Mock(spec=PostSerializer)
        content_dir = Path("/content")

        processor = SyncProcessor(mock_scanner, mock_serializer, content_dir)

        # Mock writer
        mock_writer = mocker.MagicMock()
        mock_writer.write_category = mocker.AsyncMock()
        mock_writer.path_calculator.calculate_category_path.side_effect = (
            lambda c: Path(f"/content/articles/{c.slug}/index.md")
        )

        mock_writer.file_operator = mocker.MagicMock()
        mock_writer.file_operator.read_text = mocker.AsyncMock(return_value="---")

        return processor, mock_writer, SyncStats()

    async def test_write_missing_category_indexes(
        self, mock_session, mocker, setup_processor
    ):
        """测试为没有 index.md 的分类创建文件"""
        processor, mock_writer, stats = setup_processor

        category1 = Category(id=uuid4(), name="T1", slug="t1", post_type="articles")
        category2 = Category(id=uuid4(), name="T2", slug="t2", post_type="articles")

        # Mock DB returns for categories
        mocker.patch(
            "app.posts.cruds.category.get_all_categories",
            return_value=[category1, category2],
        )

        # Mock File missing
        mocker.patch("pathlib.Path.exists", return_value=False)

        # Execute
        await processor.sync_categories_to_disk(mock_session, mock_writer, stats)

        assert mock_writer.write_category.call_count == 2
        mock_writer.write_category.assert_any_call(category1)
        mock_writer.write_category.assert_any_call(category2)
        assert len(stats.added) == 2

    async def test_skip_existing_category_indexes(
        self, mock_session, mocker, setup_processor
    ):
        """测试跳过已存在且内容一致的 index.md 分类"""
        processor, mock_writer, stats = setup_processor
        category = Category(
            id=uuid4(), name="T1", slug="t1", post_type="articles", is_active=True
        )

        mocker.patch(
            "app.posts.cruds.category.get_all_categories", return_value=[category]
        )
        mocker.patch("pathlib.Path.exists", return_value=True)  # Exists

        # Mock content exactly same as expected
        expected_meta = "title: T1\nhidden: false\n"
        mock_writer.file_operator.read_text.return_value = expected_meta
        # Note: frontmatter.dumps default output format might vary,
        # so here we just rely on logic: if strip() matches, it skips.
        # Ideally we should mock frontmatter.dumps to return expected_meta too.
        mocker.patch("frontmatter.dumps", return_value=expected_meta)

        await processor.sync_categories_to_disk(mock_session, mock_writer, stats)

        mock_writer.write_category.assert_not_called()
        assert len(stats.added) == 0

    async def test_mixed_existing_and_missing_indexes(
        self, mock_session, mocker, setup_processor
    ):
        """测试混合场景"""
        processor, mock_writer, stats = setup_processor
        c1 = Category(id=uuid4(), name="Exist", slug="exist", post_type="articles")
        c2 = Category(id=uuid4(), name="Missing", slug="missing", post_type="articles")

        mocker.patch(
            "app.posts.cruds.category.get_all_categories", return_value=[c1, c2]
        )

        # Mock exists logic
        def exists_side_effect(self):
            return "exist" in str(self)

        mocker.patch.object(
            Path, "exists", autospec=True, side_effect=exists_side_effect
        )

        # Mock frontmatter dumps to ensure consistent comparison for existing file
        mocker.patch("frontmatter.dumps", return_value="title: Exist")
        mock_writer.file_operator.read_text.return_value = "title: Exist"

        await processor.sync_categories_to_disk(mock_session, mock_writer, stats)

        mock_writer.write_category.assert_called_once_with(c2)
        assert len(stats.added) == 1

    async def test_handle_write_error_gracefully(
        self, mock_session, mocker, setup_processor
    ):
        """测试写入失败时不崩溃"""
        processor, mock_writer, stats = setup_processor
        category = Category(id=uuid4(), name="T1", slug="t1", post_type="articles")

        mocker.patch(
            "app.posts.cruds.category.get_all_categories", return_value=[category]
        )
        mocker.patch("pathlib.Path.exists", return_value=False)

        # Mock write error
        mock_writer.write_category.side_effect = Exception("Disk error")

        await processor.sync_categories_to_disk(mock_session, mock_writer, stats)

        mock_writer.write_category.assert_called_once()
        # Should not raise exception
        assert len(stats.added) == 0

    async def test_update_existing_category_when_content_changed(
        self, mock_session, mocker, setup_processor
    ):
        """测试：当数据库信息变更导致内容不一致时，应更新 index.md"""
        processor, mock_writer, stats = setup_processor

        # DB data: Name is "New Title"
        category = Category(
            id=uuid4(),
            name="New Title",
            slug="t1",
            post_type="articles",
            is_active=True,
        )

        mocker.patch(
            "app.posts.cruds.category.get_all_categories", return_value=[category]
        )
        mocker.patch("pathlib.Path.exists", return_value=True)  # File exists

        # Disk content: Title is "Old Title"
        old_content = "title: Old Title\nhidden: false\n"
        mock_writer.file_operator.read_text.return_value = old_content

        # Expected new content (generated from DB)
        expected_content = "title: New Title\nhidden: false\n"
        mocker.patch("frontmatter.dumps", return_value=expected_content)

        await processor.sync_categories_to_disk(mock_session, mock_writer, stats)

        # Assert specific write call
        mock_writer.write_category.assert_called_once_with(category)

        # Assert stats reflection (updated, not added)
        assert len(stats.updated) == 1
        assert len(stats.added) == 0
