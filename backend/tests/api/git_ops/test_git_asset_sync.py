"""
Git 资产同步测试

测试文章中的图片等资产的自动导入和管理功能
"""

import hashlib
from pathlib import Path

import pytest
from app.core.config import settings
from app.media.model import MediaFile
from app.posts.model import Category, Post, PostType
from httpx import AsyncClient
from sqlmodel import select


@pytest.mark.asyncio
async def test_git_directory_mapping(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
):
    """测试 Git 优先的目录映射：路径决定分类和类型，忽略 frontmatter"""
    # 创建测试分类
    tech_category = Category(name="Tech", slug="tech", post_type=PostType.ARTICLES)
    session.add(tech_category)
    await session.commit()
    await session.refresh(tech_category)
    tech_cat_id = tech_category.id

    # 创建文章：路径是 Articles/Tech，但 frontmatter 故意写错
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True)
    (articles_dir / "test-post.mdx").write_text(
        f"""---
title: "Test Post"
author: "{superadmin_user.username}"
category: "wrong-category"
post_type: "IDEA"
---
Content
""",
        encoding="utf-8",
    )

    # 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 验证数据库：应该根据路径识别为 Tech 分类和 ARTICLE 类型
    session.expire_all()
    post = (await session.exec(select(Post).where(Post.title == "Test Post"))).one()

    assert post.category_id == tech_cat_id  # 路径优先
    assert post.post_type == PostType.ARTICLES  # 路径优先

    # 验证回写：文件中应该纠正了错误的值
    file_content = (articles_dir / "test-post.mdx").read_text(encoding="utf-8")

    # 验证 ID 已回写
    assert f"category_id: {tech_cat_id}" in file_content

    # 验证错误的字符串字段已被纠正
    assert "category: tech" in file_content  # 纠正为正确的 slug

    # 确认错误值已被替换（不再存在）
    assert "category: wrong-category" not in file_content

    # post_type 不应该写入 frontmatter（从路径推断）
    assert "post_type:" not in file_content


@pytest.mark.asyncio
async def test_asset_auto_ingestion(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
    mock_png: bytes,
):
    """测试资产自动摄入：文章中的图片自动导入媒体库"""
    # 创建文章和图片
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True)
    assets_dir = articles_dir / "assets"
    assets_dir.mkdir()

    img_path = assets_dir / "test.png"
    img_path.write_bytes(mock_png)
    img_hash = hashlib.sha256(mock_png).hexdigest()

    (articles_dir / "post-with-image.mdx").write_text(
        f"""---
title: "Post with Image"
author: "{superadmin_user.username}"
---
![Test Image](./assets/test.png)
""",
        encoding="utf-8",
    )

    # 执行同步
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    # 验证：图片已导入媒体库，文章中的路径已替换
    session.expire_all()
    post = (
        await session.exec(select(Post).where(Post.title == "Post with Image"))
    ).one()

    assert "/api/v1/media/" in post.content_mdx  # 路径已替换为媒体 API URL
    assert "/thumbnail/large" in post.content_mdx  # 使用缩略图

    media = (
        await session.exec(select(MediaFile).where(MediaFile.content_hash == img_hash))
    ).one()
    assert media.original_filename == "test.png"


@pytest.mark.asyncio
async def test_asset_deduplication(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
    mock_png: bytes,
):
    """测试 SHA256 去重：多篇文章引用同一图片，媒体库只存储一次"""
    # 创建共享图片
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True)
    assets_dir = articles_dir / "assets"
    assets_dir.mkdir()

    img_path = assets_dir / "shared.png"
    img_path.write_bytes(mock_png)
    img_hash = hashlib.sha256(mock_png).hexdigest()

    # 创建两篇文章，都引用同一张图片
    (articles_dir / "post-1.mdx").write_text(
        f"""---
title: "Post 1"
author: "{superadmin_user.username}"
---
![Image](./assets/shared.png)
""",
        encoding="utf-8",
    )

    (articles_dir / "post-2.mdx").write_text(
        f"""---
title: "Post 2"
author: "{superadmin_user.username}"
---
![Image](./assets/shared.png)
""",
        encoding="utf-8",
    )

    # 执行同步
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    # 验证：媒体库中只有一条记录（去重成功）
    session.expire_all()
    media_files = (
        await session.exec(select(MediaFile).where(MediaFile.content_hash == img_hash))
    ).all()

    assert len(media_files) == 1  # 只有一条记录
    assert media_files[0].original_filename == "shared.png"


@pytest.mark.asyncio
async def test_cover_asset_ingestion(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
    mock_png: bytes,
):
    """测试封面图相对路径自动上传"""
    # 准备环境
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True, exist_ok=True)

    cover_path = articles_dir / "cover.jpg"
    cover_path.write_bytes(mock_png)
    cover_hash = hashlib.sha256(mock_png).hexdigest()

    (articles_dir / "post-with-cover.mdx").write_text(
        f"""---
title: "With Cover"
author: "{superadmin_user.username}"
cover: "./cover.jpg"
---
Content
""",
        encoding="utf-8",
    )

    # 执行同步
    await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )

    # 验证
    session.expire_all()
    post = (await session.exec(select(Post).where(Post.title == "With Cover"))).one()

    assert post.cover_media_id is not None

    media = (
        await session.exec(select(MediaFile).where(MediaFile.id == post.cover_media_id))
    ).one()
    assert media.content_hash == cover_hash
    assert media.original_filename == "cover.jpg"


@pytest.mark.asyncio
async def test_metadata_completion(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
):
    """测试元数据补充：用户只写了必要字段，系统自动补充完整的元数据"""
    # 创建测试分类
    tech_category = Category(name="Tech", slug="tech", post_type=PostType.ARTICLES)
    session.add(tech_category)
    await session.commit()
    await session.refresh(tech_category)
    tech_cat_id = tech_category.id  # 立即获取 ID，避免后续访问过期对象

    # 创建文章：只写了最少的必要字段
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True)
    (articles_dir / "minimal-post.mdx").write_text(
        f"""---
title: "Minimal Post"
author: "{superadmin_user.username}"
---
Content here.
""",
        encoding="utf-8",
    )

    # 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync?force_full=true", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 验证：文件中应该补充了完整的元数据
    file_content = (articles_dir / "minimal-post.mdx").read_text(encoding="utf-8")

    # 验证必要字段已补充
    assert "slug:" in file_content  # 自动生成的 slug
    assert "author_id:" in file_content  # 作者 ID
    assert "category_id:" in file_content  # 分类 ID
    assert "category: tech" in file_content  # 分类 slug
    assert "status:" in file_content  # 状态
    assert "is_featured:" in file_content  # 是否推荐
    assert "allow_comments:" in file_content  # 是否允许评论
    assert "enable_jsx:" in file_content  # 是否启用 JSX
    assert "use_server_rendering:" in file_content  # 是否使用服务端渲染

    # post_type 不应该写入 frontmatter（从路径推断，符合 Git-First 原则）
    assert "post_type:" not in file_content

    # 验证数据库
    session.expire_all()
    post = (await session.exec(select(Post).where(Post.title == "Minimal Post"))).one()
    assert post.category_id == tech_cat_id  # 使用之前保存的 ID
    assert post.post_type == PostType.ARTICLES
