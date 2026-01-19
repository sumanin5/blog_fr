import hashlib
from pathlib import Path

import pytest
from app.core.config import settings
from app.media.model import MediaFile
from app.posts.model import Category, Post, PostType
from httpx import AsyncClient
from sqlmodel import select


@pytest.fixture
def mock_media_root(tmp_path, monkeypatch):
    """Mock MEDIA_ROOT 为临时目录"""
    d = tmp_path / "media"
    d.mkdir()
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(d))
    return d


# 1x1 transparent pixel PNG
SMALL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.mark.asyncio
async def test_git_first_mapping_and_asset_ingestion(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
):
    """
    集成测试: 验证 Git 优先的目录映射、文章资产自动摄入、以及 SHA256 去重。
    """
    # 1. 准备分类数据 (预置一些分类，看是否能正确匹配)
    tech_category = Category(name="Tech", slug="tech", post_type=PostType.ARTICLE)
    life_category = Category(name="Life", slug="life", post_type=PostType.IDEA)
    session.add(tech_category)
    session.add(life_category)
    await session.commit()
    await session.refresh(tech_category)
    await session.refresh(life_category)

    # 提前获取 ID 避免后续 MissingGreenlet
    tech_cat_id = tech_category.id
    life_cat_id = life_category.id

    # 2. 准备物理目录和文件
    # 目录结构:
    # content/
    #   Articles/
    #     Tech/
    #       post-a.mdx  -> 应该映射到 Tech 分类, ARTICLE 类型
    #       assets/
    #         img.png
    #   Ideas/
    #     Life/
    #       post-b.mdx  -> 应该映射到 Life 分类, IDEA 类型

    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True)
    assets_dir = articles_dir / "assets"
    assets_dir.mkdir()

    img_path = assets_dir / "img.png"
    img_content = SMALL_PNG
    img_path.write_bytes(img_content)
    img_hash = hashlib.sha256(img_content).hexdigest()

    # post-a.mdx: 注意 Frontmatter 中的分类和类型与实际路径不符，应以路径为准
    post_a_path = articles_dir / "post-a.mdx"
    post_a_path.write_text(
        f"""---
title: "Post A"
author: "{superadmin_user.username}"
category: "wrong-category"
post_type: "IDEA"
---
# Post A
![Test Image](./assets/img.png)
""",
        encoding="utf-8",
    )

    # post-b.mdx: 无分类，应自动识别
    ideas_dir = mock_content_dir / "Ideas" / "Life"
    ideas_dir.mkdir(parents=True)
    post_b_path = ideas_dir / "post-b.mdx"
    post_b_path.write_text(
        f"""---
title: "Post B"
author: "{superadmin_user.username}"
---
# Post B
![Same Image](../../Articles/Tech/assets/img.png)
""",
        encoding="utf-8",
    )

    # 3. 执行同步
    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )
    assert response.status_code == 200

    # 验证响应
    data = response.json()
    assert len(data["added"]) == 2

    # 4. 验证 Post A (Git-First Mapping)
    # 使用一个新的 session 或者刷新，避免 MissingGreenlet
    session.expire_all()
    stmt = select(Post).where(Post.title == "Post A")
    post_a = (await session.exec(stmt)).one()

    # 检查分类和类型是否被路径正确修正
    assert post_a.category_id == tech_cat_id
    assert post_a.post_type == PostType.ARTICLE

    # 检查图片是否被自动替换为 URL (使用 settings.MEDIA_URL)
    assert "/media/uploads/" in post_a.content_mdx
    assert "![" in post_a.content_mdx

    # 查找 Media 对象
    stmt_media = select(MediaFile).where(MediaFile.content_hash == img_hash)
    media_res = await session.exec(stmt_media)
    media_file = media_res.one()
    assert media_file.original_filename == "img.png"

    # 5. 验证 Post B (Git-First Mapping & Deduplication)
    stmt_b = select(Post).where(Post.title == "Post B")
    post_b = (await session.exec(stmt_b)).one()

    assert post_b.category_id == life_cat_id
    assert post_b.post_type == PostType.IDEA

    # 验证 Post B 也引用了相同的媒体文件
    assert media_file.file_path in post_b.content_mdx

    # 验证媒体库中只有一条记录 (去重成功)
    all_media = (await session.exec(select(MediaFile))).all()
    # 可能还有其他测试产生的媒体文件，但在本次测试相关的 hash 下应该只有 1 个
    assert len([m for m in all_media if m.content_hash == img_hash]) == 1


@pytest.mark.asyncio
async def test_git_cover_asset_ingestion(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    superadmin_user,
    mock_content_dir: Path,
    mock_media_root: Path,
    session,
):
    """测试封面图相对路径自动上传"""

    # 准备环境
    articles_dir = mock_content_dir / "Articles" / "Tech"
    articles_dir.mkdir(parents=True, exist_ok=True)

    cover_path = articles_dir / "cover.jpg"
    cover_content = SMALL_PNG
    cover_path.write_bytes(cover_content)
    cover_hash = hashlib.sha256(cover_content).hexdigest()

    post_path = articles_dir / "post-with-cover.mdx"
    post_path.write_text(
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
        f"{settings.API_PREFIX}/ops/git/sync", headers=superadmin_user_token_headers
    )

    # 验证
    session.expire_all()
    stmt = select(Post).where(Post.title == "With Cover")
    post = (await session.exec(stmt)).one()

    assert post.cover_media_id is not None

    # 验证 MediaFile 详情
    stmt_media = select(MediaFile).where(MediaFile.id == post.cover_media_id)
    media = (await session.exec(stmt_media)).one()
    assert media.content_hash == cover_hash
    assert media.original_filename == "cover.jpg"
