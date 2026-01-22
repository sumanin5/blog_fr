"""
GitOps 重新同步元数据 API 测试

测试 POST /api/git-ops/posts/{post_id}/resync-metadata 端点
"""

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_success(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_test_post,
):
    """测试成功重新同步元数据"""
    post, test_file, new_author = resync_test_post
    post_id = post.id  # 提前获取 ID，避免后续访问触发懒加载

    # 调用 resync API
    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

    # 验证文件已回写新 ID
    content = test_file.read_text(encoding="utf-8")
    assert str(new_author.id) in content


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_post_not_found(
    async_client: AsyncClient,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试文章不存在"""
    from uuid import uuid4

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{uuid4()}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_no_source_path(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试文章没有 source_path"""
    from app.posts.model import Post, PostStatus, PostType
    from app.users.model import User, UserRole

    # 创建测试用户
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 创建没有 source_path 的文章
    post = Post(
        title="Manual Post",
        slug="manual-post",
        content_mdx="# Manual",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        source_path=None,  # 没有 source_path
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post.id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 400
    assert "not linked to a git file" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_file_not_found(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    mock_content_dir,
):
    """测试源文件不存在"""
    from app.posts.model import Post, PostStatus, PostType
    from app.users.model import User, UserRole

    # 创建测试用户
    user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 创建有 source_path 但文件不存在的文章
    post = Post(
        title="Missing File Post",
        slug="missing-file-post",
        content_mdx="# Missing",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        source_path="nonexistent.mdx",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post.id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 400
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_metadata_requires_admin(
    async_client: AsyncClient,
    session: AsyncSession,
    normal_user_token_headers,
):
    """测试需要管理员权限"""
    from uuid import uuid4

    from app.core.config import settings

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{uuid4()}/resync-metadata",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_with_cover_image(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_base_setup,
    mock_media_root,
    mock_png,
):
    """测试封面图的相对路径处理和自动上传"""
    import hashlib

    from app.core.config import settings
    from app.media.model import MediaFile
    from app.posts.model import Post, PostStatus, PostType

    setup = resync_base_setup
    user = setup["user"]
    category = setup["tech_category"]
    articles_dir = setup["articles_dir"]

    # 创建文章（没有封面）
    post = Post(
        title="Post Without Cover",
        slug="post-without-cover",
        content_mdx="# Content",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        category_id=category.id,
        source_path="Articles/Tech/post-without-cover.mdx",
        cover_media_id=None,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    post_id = post.id

    # 创建封面图和文件
    cover_path = articles_dir / "new-cover.jpg"
    cover_path.write_bytes(mock_png)
    cover_hash = hashlib.sha256(mock_png).hexdigest()

    test_file = articles_dir / "post-without-cover.mdx"
    test_file.write_text(
        f"""---
title: "Post Without Cover"
author: "{user.username}"
category: "tech"
cover: "./new-cover.jpg"
---
# Content
""",
        encoding="utf-8",
    )

    # 执行 resync
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200

    # 验证封面图已上传
    session.expire_all()
    post = await session.get(Post, post_id)
    assert post.cover_media_id is not None

    media = await session.get(MediaFile, post.cover_media_id)
    assert media.content_hash == cover_hash
    assert media.original_filename == "new-cover.jpg"

    # 验证文件中回写了 cover_media_id
    content = test_file.read_text(encoding="utf-8")
    assert str(post.cover_media_id) in content


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_with_tag_formats(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_base_setup,
):
    """测试标签的不同格式：逗号分隔字符串"""
    from app.core.config import settings
    from app.posts.model import Post, PostStatus, PostType, Tag

    setup = resync_base_setup
    user = setup["user"]
    category = setup["tech_category"]
    articles_dir = setup["articles_dir"]

    # 创建标签
    tag1 = Tag(name="python", slug="python")
    tag2 = Tag(name="django", slug="django")
    tag3 = Tag(name="fastapi", slug="fastapi")
    session.add_all([tag1, tag2, tag3])
    await session.commit()
    await session.refresh(tag1)

    # 创建文章（只有一个标签）
    post = Post(
        title="Post With Tags",
        slug="post-with-tags",
        content_mdx="# Content",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        category_id=category.id,
        source_path="Articles/Tech/post-with-tags.mdx",
    )
    post.tags = [tag1]
    session.add(post)
    await session.commit()
    await session.refresh(post)
    post_id = post.id

    # 创建文件（逗号分隔的标签）
    test_file = articles_dir / "post-with-tags.mdx"
    test_file.write_text(
        f"""---
title: "Post With Tags"
author: "{user.username}"
category: "tech"
tags: "python, django, fastapi"
---
# Content
""",
        encoding="utf-8",
    )

    # 执行 resync
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200

    # 验证标签已更新
    session.expire_all()
    post = await session.get(Post, post_id)
    await session.refresh(post, ["tags"])

    tag_names = sorted([tag.name for tag in post.tags])
    assert tag_names == ["django", "fastapi", "python"]


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_with_category_change(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_base_setup,
):
    """测试分类变更：frontmatter 中的分类会被更新，但路径优先"""
    from app.core.config import settings
    from app.posts.model import Post, PostStatus, PostType

    setup = resync_base_setup
    user = setup["user"]
    tech_category = setup["tech_category"]
    articles_dir = setup["articles_dir"]
    tech_cat_id = tech_category.id

    # 创建文章（Tech 分类）
    post = Post(
        title="Post Category Change",
        slug="post-category-change",
        content_mdx="# Content",
        status=PostStatus.PUBLISHED,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        category_id=tech_cat_id,
        source_path="Articles/Tech/post-category-change.mdx",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    post_id = post.id

    # 创建文件（frontmatter 写错了分类）
    test_file = articles_dir / "post-category-change.mdx"
    test_file.write_text(
        f"""---
title: "Post Category Change"
author: "{user.username}"
category: "life"
---
# Content
""",
        encoding="utf-8",
    )

    # 执行 resync
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200

    # 验证：路径优先，分类仍然是 Tech（不是 Life）
    session.expire_all()
    post = await session.get(Post, post_id)
    assert post.category_id == tech_cat_id  # 路径优先，仍然是 Tech

    # 验证文件中的错误分类被纠正为 tech
    content = test_file.read_text(encoding="utf-8")
    assert str(tech_cat_id) in content
    assert "category: tech" in content  # 纠正为正确的 slug
    assert "category: life" not in content  # 错误值已被替换


@pytest.mark.asyncio
@pytest.mark.git_ops
async def test_resync_with_status_change(
    async_client: AsyncClient,
    session: AsyncSession,
    superadmin_user_token_headers,
    resync_base_setup,
):
    """测试状态变更"""
    from app.core.config import settings
    from app.posts.model import Post, PostStatus, PostType

    setup = resync_base_setup
    user = setup["user"]
    category = setup["tech_category"]
    articles_dir = setup["articles_dir"]

    # 创建文章（draft 状态）
    post = Post(
        title="Post Status Change",
        slug="post-status-change",
        content_mdx="# Content",
        status=PostStatus.DRAFT,
        post_type=PostType.ARTICLE,
        author_id=user.id,
        category_id=category.id,
        source_path="Articles/Tech/post-status-change.mdx",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    post_id = post.id

    # 创建文件（改成 published 状态）
    test_file = articles_dir / "post-status-change.mdx"
    test_file.write_text(
        f"""---
title: "Post Status Change"
author: "{user.username}"
category: "tech"
status: "published"
---
# Content
""",
        encoding="utf-8",
    )

    # 执行 resync
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/posts/{post_id}/resync-metadata",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200

    # 验证状态已更新
    session.expire_all()
    post = await session.get(Post, post_id)
    assert post.status == PostStatus.PUBLISHED

    # 验证文件中保留了状态
    content = test_file.read_text(encoding="utf-8")
    assert "status: published" in content
