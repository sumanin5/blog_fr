"""
GitOps 工具函数单元测试

只测试 git_ops/utils.py 中的复杂工具函数
"""

import hashlib
import hmac
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from app.git_ops.exceptions import WebhookSignatureError
from app.git_ops.utils import verify_github_signature

# ========================================
# GitHub Webhook 签名验证测试
# ========================================


@pytest.mark.unit
@pytest.mark.git_ops
def test_verify_github_signature_valid():
    """测试有效的 GitHub 签名"""
    payload = b"test payload"
    secret = "my_secret_key"

    # 使用正确的方式生成签名
    expected_sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    signature = f"sha256={expected_sig}"

    # 应该返回 True
    result = verify_github_signature(payload, signature, secret)
    assert result is True


@pytest.mark.unit
@pytest.mark.git_ops
def test_verify_github_signature_invalid():
    """测试无效的 GitHub 签名"""
    payload = b"test payload"
    secret = "my_secret_key"
    invalid_signature = "sha256=invalid_hash_value"

    # 应该抛出异常
    with pytest.raises(WebhookSignatureError) as exc_info:
        verify_github_signature(payload, invalid_signature, secret)
    assert "Invalid webhook signature" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.git_ops
def test_verify_github_signature_missing_header():
    """测试缺少签名 header"""
    payload = b"test payload"
    secret = "my_secret_key"

    # 应该抛出异常
    with pytest.raises(WebhookSignatureError) as exc_info:
        verify_github_signature(payload, None, secret)
    assert "Missing X-Hub-Signature-256" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.git_ops
def test_verify_github_signature_no_secret():
    """测试未配置 secret"""
    payload = b"test payload"
    signature = "sha256=some_hash"

    # 应该抛出异常
    with pytest.raises(WebhookSignatureError) as exc_info:
        verify_github_signature(payload, signature, "")
    assert "not configured" in str(exc_info.value)


@pytest.mark.unit
@pytest.mark.git_ops
def test_verify_github_signature_timing_attack_protection():
    """测试时序攻击保护（使用 compare_digest）"""
    payload = b"test payload"
    secret = "my_secret_key"

    correct_sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    # 创建一个几乎一样的签名（只有最后一个字符不同）
    wrong_sig = correct_sig[:-1] + "f"

    signature_correct = f"sha256={correct_sig}"
    signature_wrong = f"sha256={wrong_sig}"

    # 正确的应该通过
    assert verify_github_signature(payload, signature_correct, secret) is True

    # 错误的应该被拒绝
    with pytest.raises(WebhookSignatureError):
        verify_github_signature(payload, signature_wrong, secret)


# ========================================
# Frontmatter 更新工具测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_update_frontmatter_metadata(tmp_path):
    """测试更新 frontmatter 元数据"""
    from app.git_ops.schema import SyncStats
    from app.git_ops.utils import update_frontmatter_metadata

    # 创建测试文件
    test_file = tmp_path / "test.mdx"
    test_file.write_text(
        """---
title: "Original Title"
slug: "original-slug"
---

Content here.
""",
        encoding="utf-8",
    )

    stats = SyncStats()

    # 更新元数据
    result = await update_frontmatter_metadata(
        tmp_path,
        "test.mdx",
        {"slug": "new-slug", "author_id": "12345"},
        stats,
    )

    assert result is True

    # 验证文件内容
    content = test_file.read_text(encoding="utf-8")
    assert "slug: new-slug" in content
    assert "author_id: '12345'" in content
    assert "title: Original Title" in content  # 原有字段保留


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_update_frontmatter_metadata_remove_field(tmp_path):
    """测试删除 frontmatter 字段"""
    from app.git_ops.schema import SyncStats
    from app.git_ops.utils import update_frontmatter_metadata

    test_file = tmp_path / "test.mdx"
    test_file.write_text(
        """---
title: "Test"
slug: "test-slug"
cover: "old-cover.jpg"
---

Content.
""",
        encoding="utf-8",
    )

    stats = SyncStats()

    # 传入 None 应该删除字段
    result = await update_frontmatter_metadata(
        tmp_path, "test.mdx", {"cover": None}, stats
    )

    assert result is True
    content = test_file.read_text(encoding="utf-8")
    assert "cover:" not in content


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_update_frontmatter_metadata_nonexistent_file(tmp_path):
    """测试更新不存在的文件"""
    from app.git_ops.schema import SyncStats
    from app.git_ops.utils import update_frontmatter_metadata

    stats = SyncStats()

    result = await update_frontmatter_metadata(
        tmp_path, "nonexistent.mdx", {"slug": "test"}, stats
    )

    # 应该返回 False（但不抛出异常）
    assert result is False


# ========================================
# resolve_author_id 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_author_id_by_username(session):
    """测试通过用户名解析作者 ID"""
    from app.git_ops.utils import resolve_author_id
    from app.users.model import User, UserRole

    # 创建测试用户
    test_user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(test_user)
    await session.commit()
    await session.refresh(test_user)

    result = await resolve_author_id(session, test_user.username)
    assert result == test_user.id


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_author_id_by_uuid(session):
    """测试通过 UUID 解析作者 ID"""
    from app.git_ops.utils import resolve_author_id
    from app.users.model import User, UserRole

    # 创建测试用户
    test_user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password="hashed",
        role=UserRole.USER,
    )
    session.add(test_user)
    await session.commit()
    await session.refresh(test_user)

    result = await resolve_author_id(session, str(test_user.id))
    assert result == test_user.id


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_author_id_not_found(session):
    """测试作者不存在"""
    from app.git_ops.exceptions import GitOpsSyncError
    from app.git_ops.utils import resolve_author_id

    with pytest.raises(GitOpsSyncError) as exc_info:
        await resolve_author_id(session, "nonexistent_user")
    assert "Author not found" in str(exc_info.value)


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_author_id_empty_value(session):
    """测试空值"""
    from app.git_ops.exceptions import GitOpsSyncError
    from app.git_ops.utils import resolve_author_id

    with pytest.raises(GitOpsSyncError) as exc_info:
        await resolve_author_id(session, "")
    assert "empty" in str(exc_info.value).lower()


# ========================================
# resolve_category_id 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_category_id_existing(session):
    """测试解析已存在的分类"""
    from app.git_ops.utils import resolve_category_id
    from app.posts.model import Category

    # 创建测试分类
    category = Category(
        name="Tech",
        slug="tech",
        post_type="article",
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)

    result = await resolve_category_id(session, "tech", "article")
    assert result == category.id


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_category_id_auto_create(session):
    """测试自动创建不存在的分类"""
    from app.git_ops.utils import resolve_category_id
    from app.posts import crud as posts_crud

    result = await resolve_category_id(
        session, "new-category", "article", auto_create=True
    )
    assert result is not None

    # 验证分类已创建
    category = await posts_crud.get_category_by_slug_and_type(
        session, "new-category", "article"
    )
    assert category is not None
    assert category.name == "New Category"  # slug 转 title case


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_category_id_default_fallback(session):
    """测试回退到默认分类"""
    from app.git_ops.utils import resolve_category_id

    # 不自动创建，且分类不存在，应该尝试创建默认分类
    result = await resolve_category_id(
        session,
        None,
        "article",
        auto_create=False,
        default_slug="uncategorized",
    )
    assert result is not None


# ========================================
# write_post_ids_to_frontmatter 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_write_post_ids_to_frontmatter_create(tmp_path, mock_post):
    """测试创建文章时写回 ID"""
    from app.git_ops.schema import SyncStats
    from app.git_ops.utils import write_post_ids_to_frontmatter

    # 创建测试文件
    test_file = tmp_path / "test.mdx"
    test_file.write_text(
        """---
title: "Test Post"
---
Content
""",
        encoding="utf-8",
    )

    # 使用 fixture 提供的 mock post
    mock_post.slug = "test-post"

    stats = SyncStats()

    result = await write_post_ids_to_frontmatter(
        tmp_path, "test.mdx", mock_post, None, stats
    )

    assert result is True
    content = test_file.read_text(encoding="utf-8")
    assert "slug: test-post" in content
    assert str(mock_post.author_id) in content


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_write_post_ids_to_frontmatter_no_change(tmp_path, mock_post):
    """测试更新时无变化则不写回"""
    from app.git_ops.schema import SyncStats
    from app.git_ops.utils import write_post_ids_to_frontmatter

    test_file = tmp_path / "test.mdx"
    test_file.write_text(
        """---
title: "Test"
slug: "same-slug"
---
Content
""",
        encoding="utf-8",
    )

    # 使用相同的 post 对象模拟无变化
    mock_post.slug = "same-slug"

    stats = SyncStats()

    result = await write_post_ids_to_frontmatter(
        tmp_path, "test.mdx", mock_post, mock_post, stats
    )

    # 无变化，应该直接返回 True
    assert result is True


# ========================================
# revalidate_nextjs_cache 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_success():
    """测试成功失效 Next.js 缓存"""
    from app.git_ops.utils import revalidate_nextjs_cache

    # Mock httpx.AsyncClient
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"revalidated": True, "tags": ["posts"]}

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        result = await revalidate_nextjs_cache("http://localhost:3000", "test-secret")

        assert result is True


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_failure():
    """测试 Next.js API 返回错误"""
    from app.git_ops.utils import revalidate_nextjs_cache

    # Mock httpx.AsyncClient 返回错误
    mock_response = AsyncMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        result = await revalidate_nextjs_cache("http://localhost:3000", "test-secret")

        assert result is False


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_no_config():
    """测试未配置 URL 或 Secret"""
    from app.git_ops.utils import revalidate_nextjs_cache

    result = await revalidate_nextjs_cache("", "")
    assert result is False

    result = await revalidate_nextjs_cache("http://localhost:3000", "")
    assert result is False


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_network_error():
    """测试网络连接错误"""
    from app.git_ops.utils import revalidate_nextjs_cache

    # Mock 网络错误
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        result = await revalidate_nextjs_cache("http://localhost:3000", "test-secret")

        assert result is False


# ========================================
# resolve_cover_media_id 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_cover_media_id_by_path(mock_session, mock_media_file):
    """测试通过文件路径解析封面图 ID"""
    from app.git_ops.utils import resolve_cover_media_id

    with patch(
        "app.media.crud.get_media_file_by_path",
        new=AsyncMock(return_value=mock_media_file),
    ):
        result = await resolve_cover_media_id(mock_session, "uploads/test.jpg")
        assert result == mock_media_file.id


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_cover_media_id_by_filename(mock_session, mock_media_file):
    """测试通过文件名解析封面图 ID"""
    from app.git_ops.utils import resolve_cover_media_id

    # 设置媒体文件属性
    mock_media_file.original_filename = "cover.jpg"
    mock_media_file.file_path = "uploads/2024/cover.jpg"

    # Mock 路径查询失败（返回 None）
    with (
        patch(
            "app.media.crud.get_media_file_by_path",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.media.service.search_media_files",
            new=AsyncMock(return_value=[mock_media_file]),
        ),
    ):
        result = await resolve_cover_media_id(mock_session, "some/path/cover.jpg")
        assert result == mock_media_file.id


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_cover_media_id_not_found(mock_session):
    """测试找不到封面图"""
    from app.git_ops.utils import resolve_cover_media_id

    with (
        patch(
            "app.media.crud.get_media_file_by_path",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "app.media.service.search_media_files",
            new=AsyncMock(return_value=[]),
        ),
    ):
        result = await resolve_cover_media_id(mock_session, "nonexistent.jpg")
        assert result is None


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_resolve_cover_media_id_empty_value(mock_session):
    """测试空值"""
    from app.git_ops.utils import resolve_cover_media_id

    result = await resolve_cover_media_id(mock_session, "")
    assert result is None

    result = await resolve_cover_media_id(mock_session, None)
    assert result is None
