"""Category imports work with no reverse metadata writes or real database."""
from uuid import uuid4
import pytest
from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.posts.model import Category, PostType

@pytest.mark.parametrize("existing", [False, True])
async def test_category_metadata_import(existing, mock_session, mock_category_index, mock_user, tmp_path):
    category = Category(name="Old", slug="test", post_type=PostType.ARTICLES) if existing else None
    mock_session.execute.return_value.scalar_one_or_none.return_value = category
    mock_category_index.frontmatter = {"title": "Updated", "icon": "X", "order": 7, "hidden": True}
    result = await handle_category_sync(mock_session, mock_category_index, mock_user, tmp_path)
    assert result.name == "Updated"
    assert result.slug == "test"
    assert result.description == "Category description"
    assert result.sort_order == 7
    assert result.is_active is False
    assert result.icon_preset == "X"
    assert list(tmp_path.rglob("*")) == []

async def test_category_icon_file(mock_session, mock_category_index, mock_user, tmp_path, mock_cover_processor):
    icon_id = uuid4()
    mock_cover_processor._resolve_cover_media_id.return_value = icon_id
    mock_category_index.frontmatter = {"title": "Tech", "icon": "design-icon.svg"}
    result = await handle_category_sync(mock_session, mock_category_index, mock_user, tmp_path)
    assert result.icon_id == icon_id
    assert result.icon_preset is None
    assert list(tmp_path.rglob("*")) == []

async def test_category_dry_run_does_not_create_default(mock_session, mock_category_index):
    from types import SimpleNamespace
    from app.git_ops.components.processors.category import CategoryProcessor

    mock_session.execute.return_value.scalar_one_or_none.return_value = None
    mock_session.exec.return_value.one_or_none.return_value = None
    mock_session.exec.return_value.scalar_one_or_none.return_value = None
    result = {"post_type": "articles"}
    scanned = SimpleNamespace(
        derived_category_slug="missing-category",
        frontmatter={},
    )
    await CategoryProcessor().process(
        result,
        {},
        scanned,
        mock_session,
        dry_run=True,
    )
    assert result["category_id"] is None
    mock_session.add.assert_not_called()


async def test_category_internal_links_only_transform_database(mock_session, mock_category_index, mock_user, tmp_path, mocker):
    mock_category_index.content = "[Other](./other.md)"
    mocker.patch("app.posts.cruds.post.get_slug_map_by_source_paths", return_value={"articles/test/other.md": ("other-slug", "articles")})
    result = await handle_category_sync(mock_session, mock_category_index, mock_user, tmp_path)
    assert "/posts/articles/other-slug" in result.description
    assert mock_category_index.content == "[Other](./other.md)"
