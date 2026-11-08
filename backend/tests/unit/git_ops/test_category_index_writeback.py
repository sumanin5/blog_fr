"""Import preserves existing index bytes and never creates a missing index."""
import pytest
from app.git_ops.container import GitOpsContainer
from app.posts.model import Category, PostType

@pytest.mark.parametrize("has_index", [True, False])
async def test_sync_never_writes_category_index(has_index, tmp_path, mock_session, mock_user, mocker):
    folder = tmp_path / "articles" / "test"
    folder.mkdir(parents=True)
    index = folder / "index.md"
    original = b"---\ntitle: Test\n---\nCategory text\n"
    if has_index:
        index.write_bytes(original)
    container = GitOpsContainer(mock_session, tmp_path)
    mocker.patch.object(container.github, "pull", new_callable=mocker.AsyncMock, return_value=("ok", "old", "new"))
    mocker.patch.object(container.hash_manager, "save_current_hash", new_callable=mocker.AsyncMock)
    mocker.patch("app.git_ops.services.sync_service.post_crud.get_posts_with_source_path", return_value=[])
    mocker.patch("app.git_ops.services.sync_service.revalidate_nextjs_cache")
    # Existing database categories must not be exported, even without an index.
    mocker.patch("app.posts.cruds.category.get_all_categories", return_value=[Category(name="Test", slug="test", post_type=PostType.ARTICLES)])
    stats = await container.sync_service.sync_all(mock_user)
    assert not stats.errors
    assert index.exists() is has_index
    if has_index:
        assert index.read_bytes() == original
    assert sorted(p.name for p in folder.iterdir()) == (["index.md"] if has_index else [])
