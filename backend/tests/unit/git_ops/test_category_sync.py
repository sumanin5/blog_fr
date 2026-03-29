from pathlib import Path

import pytest
from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.scanner import ScannedPost
from app.posts.model import Category, PostType
from sqlmodel import select


@pytest.mark.asyncio
@pytest.mark.unit
async def test_handle_category_sync_new(session, mock_user, mocker):
    """测试从 index.md 创建新分类"""
    # Patch _write_category_metadata_back to prevent file operations
    mock_write_back = mocker.patch(
        "app.git_ops.components.handlers.category_sync._write_category_metadata_back",
        new_callable=mocker.AsyncMock,
    )

    # 模拟 scanned post
    scanned = mocker.MagicMock(spec=ScannedPost)
    scanned.file_path = "content/articles/new-cat/index.md"
    scanned.derived_category_slug = "new-cat"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {"title": "New Category", "icon": "🆕", "sort": 10}
    scanned.content = "Markdown Description"
    scanned.is_category_index = True

    # 执行
    category = await handle_category_sync(
        session=session,
        scanned=scanned,
        operating_user=mock_user,
        content_dir=Path("/tmp/content"),  # Mock content dir
    )

    assert category is not None
    assert category.slug == "new-cat"
    assert category.name == "New Category"
    assert category.description == "Markdown Description"
    assert category.icon_preset == "🆕"
    assert category.sort_order == 10
    assert category.post_type == PostType.ARTICLES

    # 验证 DB
    stmt = select(Category).where(Category.slug == "new-cat")
    result = await session.execute(stmt)
    db_cat = result.scalar_one_or_none()
    assert db_cat is not None
    assert db_cat.name == "New Category"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_handle_category_sync_update(session, mock_user, mocker):
    """测试更新现有分类"""
    # Patch _write_category_metadata_back
    mocker.patch(
        "app.git_ops.components.handlers.category_sync._write_category_metadata_back",
        new_callable=mocker.AsyncMock,
    )

    # 预先创建分类
    existing_cat = Category(
        name="Old Name",
        slug="existing-cat",
        post_type=PostType.ARTICLES,
        description="Old Desc",
        sort_order=0,
    )
    session.add(existing_cat)
    await session.commit()
    await session.refresh(existing_cat)

    # 模拟更新的 index.md
    scanned = mocker.MagicMock(spec=ScannedPost)
    scanned.file_path = "content/articles/existing-cat/index.md"
    scanned.derived_category_slug = "existing-cat"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {"title": "Updated Name", "hidden": True}
    scanned.content = "Updated Desc"
    scanned.is_category_index = True

    # 执行
    category = await handle_category_sync(
        session=session,
        scanned=scanned,
        operating_user=mock_user,
        content_dir=Path("/tmp/content"),
    )

    assert category.id == existing_cat.id
    assert category.name == "Updated Name"
    assert category.description == "Updated Desc"
    assert category.is_active is False  # hidden=True

    # Verify DB (需要先 commit,因为 handle_category_sync 不会自动提交)
    await session.commit()
    await session.refresh(category)
    assert category.name == "Updated Name"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_handle_category_sync_icon_file_path(session, mock_user, mocker):
    """测试 icon 字段支持文件路径（长度 >= 10）"""
    # Patch _write_category_metadata_back
    mocker.patch(
        "app.git_ops.components.handlers.category_sync._write_category_metadata_back",
        new_callable=mocker.AsyncMock,
    )

    from uuid import uuid4

    # 模拟 scanned post
    scanned = mocker.MagicMock(spec=ScannedPost)
    scanned.file_path = "content/articles/design/index.md"
    scanned.derived_category_slug = "design"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {
        "title": "Design Resources",
        "icon": "design-icon.svg",  # 长度 >= 10，应该解析为文件路径
    }
    scanned.content = "Design resources collection"
    scanned.is_category_index = True

    # Mock CoverProcessor._resolve_cover_media_id 返回一个 UUID
    mock_icon_id = uuid4()
    mock_cover_processor = mocker.patch(
        "app.git_ops.components.handlers.category_sync.CoverProcessor"
    )
    mock_processor_instance = mock_cover_processor.return_value
    mock_processor_instance._resolve_cover_media_id = mocker.AsyncMock(
        return_value=mock_icon_id
    )

    # 执行
    category = await handle_category_sync(
        session=session,
        scanned=scanned,
        operating_user=mock_user,
        content_dir=Path("/tmp/content"),
    )

    # 验证
    assert category is not None
    assert category.slug == "design"
    assert category.name == "Design Resources"
    assert category.icon_id == mock_icon_id  # 应该设置 icon_id
    assert category.icon_preset is None  # 不应该设置 icon_preset

    # 验证 _resolve_cover_media_id 被调用
    mock_processor_instance._resolve_cover_media_id.assert_called_once_with(
        session,
        "design-icon.svg",
        mdx_file_path=scanned.file_path,
        content_dir=Path("/tmp/content"),
    )


@pytest.mark.asyncio
@pytest.mark.unit
async def test_handle_category_sync_icon_emoji(session, mock_user, mocker):
    """测试 icon 字段支持 emoji（长度 < 10）"""
    # Patch _write_category_metadata_back
    mocker.patch(
        "app.git_ops.components.handlers.category_sync._write_category_metadata_back",
        new_callable=mocker.AsyncMock,
    )

    # 模拟 scanned post
    scanned = mocker.MagicMock(spec=ScannedPost)
    scanned.file_path = "content/articles/tech/index.md"
    scanned.derived_category_slug = "tech"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {
        "title": "Tech Articles",
        "icon": "🚀",  # 长度 < 10，应该存储为 icon_preset
    }
    scanned.content = "Technology articles"
    scanned.is_category_index = True

    # 执行
    category = await handle_category_sync(
        session=session,
        scanned=scanned,
        operating_user=mock_user,
        content_dir=Path("/tmp/content"),
    )

    # 验证
    assert category is not None
    assert category.slug == "tech"
    assert category.name == "Tech Articles"
    assert category.icon_preset == "🚀"  # 应该设置 icon_preset
    assert category.icon_id is None  # 不应该设置 icon_id


@pytest.mark.asyncio
@pytest.mark.unit
async def test_handle_category_sync_transforms_internal_links(session, mock_user_with_id, mocker):
    """测试 category index 中的相对链接被自动转换为绝对 URL"""
    from app.posts.model import Post, PostType, PostStatus
    from app.users.model import User, UserRole

    # Patch _write_category_metadata_back
    mocker.patch(
        "app.git_ops.components.handlers.category_sync._write_category_metadata_back",
        new_callable=mocker.AsyncMock,
    )

    # 确保用户存在于数据库
    user = User(
        id=mock_user_with_id.id,
        username=mock_user_with_id.username,
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.ADMIN,
    )
    session.add(user)
    await session.commit()

    # 预先创建两篇文章，这样 ContentProcessor 可以找到它们
    post1 = Post(
        title="Article One",
        slug="article-one-abc123",
        source_path="content/articles/fastapi/01-article.md",
        post_type=PostType.ARTICLES,
        status=PostStatus.PUBLISHED,
        author_id=mock_user_with_id.id,
        content_mdx="Article 1 content",
    )
    post2 = Post(
        title="Article Two",
        slug="article-two-def456",
        source_path="content/articles/fastapi/02-article.md",
        post_type=PostType.ARTICLES,
        status=PostStatus.PUBLISHED,
        author_id=mock_user_with_id.id,
        content_mdx="Article 2 content",
    )
    session.add(post1)
    session.add(post2)
    await session.commit()

    # 模拟 scanned post，内容包含相对链接
    scanned = mocker.MagicMock(spec=ScannedPost)
    scanned.file_path = "content/articles/fastapi/index.md"
    scanned.derived_category_slug = "fastapi"
    scanned.derived_post_type = "articles"
    scanned.frontmatter = {"title": "FastAPI Series"}
    # 内容包含相对链接，应该被转换为绝对 URL
    scanned.content = """# FastAPI Series

- [Article One](./01-article.md)
- [Article Two](./02-article.md)
"""
    scanned.is_category_index = True

    # 执行
    category = await handle_category_sync(
        session=session,
        scanned=scanned,
        operating_user=mock_user_with_id,
        content_dir=Path("/tmp/content"),
    )

    # 验证
    assert category is not None
    assert category.slug == "fastapi"

    # 验证链接被转换为绝对 URL
    assert "/posts/articles/article-one-abc123" in category.description
    assert "/posts/articles/article-two-def456" in category.description
    # 验证原来的相对链接不再存在
    assert "./01-article.md" not in category.description
    assert "./02-article.md" not in category.description
