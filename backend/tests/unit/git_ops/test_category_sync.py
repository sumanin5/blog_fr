import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.git_ops.components.handlers.category_sync import handle_category_sync
from app.git_ops.components.scanner import ScannedPost
from app.posts.model import Category, PostType
from sqlmodel import select


@pytest.mark.asyncio
async def test_handle_category_sync_new(session, mock_admin_user):
    """测试从 index.md 创建新分类"""

    # 模拟 scanned post
    scanned = MagicMock(spec=ScannedPost)
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
        operating_user=mock_admin_user,
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
async def test_handle_category_sync_update(session, mock_admin_user):
    """测试更新现有分类"""

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
    scanned = MagicMock(spec=ScannedPost)
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
        operating_user=mock_admin_user,
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
async def test_handle_category_sync_icon_file_path(session, mock_admin_user):
    """测试 icon 字段支持文件路径（长度 >= 10）"""
    from unittest.mock import AsyncMock, patch
    from uuid import uuid4

    # 模拟 scanned post
    scanned = MagicMock(spec=ScannedPost)
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
    with patch(
        "app.git_ops.components.handlers.category_sync.CoverProcessor"
    ) as MockCoverProcessor:
        mock_processor = MockCoverProcessor.return_value
        mock_processor._resolve_cover_media_id = AsyncMock(return_value=mock_icon_id)

        # 执行
        category = await handle_category_sync(
            session=session,
            scanned=scanned,
            operating_user=mock_admin_user,
            content_dir=Path("/tmp/content"),
        )

        # 验证
        assert category is not None
        assert category.slug == "design"
        assert category.name == "Design Resources"
        assert category.icon_id == mock_icon_id  # 应该设置 icon_id
        assert category.icon_preset is None  # 不应该设置 icon_preset

        # 验证 _resolve_cover_media_id 被调用
        mock_processor._resolve_cover_media_id.assert_called_once_with(
            session,
            "design-icon.svg",
            mdx_file_path=scanned.file_path,
            content_dir=Path("/tmp/content"),
        )


@pytest.mark.asyncio
async def test_handle_category_sync_icon_emoji(session, mock_admin_user):
    """测试 icon 字段支持 emoji（长度 < 10）"""

    # 模拟 scanned post
    scanned = MagicMock(spec=ScannedPost)
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
        operating_user=mock_admin_user,
        content_dir=Path("/tmp/content"),
    )

    # 验证
    assert category is not None
    assert category.slug == "tech"
    assert category.name == "Tech Articles"
    assert category.icon_preset == "🚀"  # 应该设置 icon_preset
    assert category.icon_id is None  # 不应该设置 icon_id


@pytest.mark.asyncio
async def test_write_category_back_to_file(session, mock_admin_user):
    """验证反向同步: DB更新 -> 写入 index.md"""
    from app.posts.model import Category, PostType
    from app.posts.schemas import CategoryUpdate
    from app.posts.services.category import update_category

    # 1. 准备数据: 创建一个存在的分类和对应目录
    cat = Category(
        name="Reverse Sync",
        slug="reverse-sync",
        post_type=PostType.ARTICLES,
        description="Original",
    )
    session.add(cat)
    await session.commit()
    await session.refresh(cat)

    # 模拟物理目录存在
    cat_dir = Path(
        "/tmp/content/articles/reverse-sync"
    )  # 注意：这里依赖Writer里的settings，单元测试环境可能使用mock settings或tmpdir
    # 由于 Writer 使用了 settings.CONTENT_DIR，我们需要 patch 它或者确保它是临时的。
    # 为了简化，我们 Mock FileWriter 内部的 file_operator.write_file 或者 writer 本身。
    # 但为了集成测试效果，我们最好 Mock settings.CONTENT_DIR。

    # 使用 patch 修改 FileWriter 的 dependencies 或 path calculator
    # 但更简单的是：直接测试 update_category 是否调用了 FileWriter.write_category

    # 这里我们采用 Mock FileWriter 的方式，验证 update_category 确实触发了写操作
    with unittest.mock.patch("app.posts.services.category.FileWriter") as MockWriterCls:
        mock_writer_instance = MockWriterCls.return_value
        mock_writer_instance.write_category = AsyncMock()

        # 2. 调用 Service 更新
        update_data = CategoryUpdate(
            name="New Name", description="New Desc", icon_preset="💾"
        )
        await update_category(session, cat.id, update_data, mock_admin_user)

        # 3. 验证 FileWriter.write_category 被调用
        mock_writer_instance.write_category.assert_called_once()

        # 验证传给 write_category 的参数是最新的
        # call_args[0][0] 是第一个位置参数
        updated_cat_arg = mock_writer_instance.write_category.call_args[0][0]
        assert updated_cat_arg.name == "New Name"
        assert updated_cat_arg.description == "New Desc"
        assert updated_cat_arg.icon_preset == "💾"
