"""
GitOps 工具函数单元测试

只测试 git_ops/utils.py 中的复杂工具函数
"""

import hashlib
import hmac
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from app.git_ops.components import verify_github_signature
from app.git_ops.exceptions import WebhookSignatureError

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
    from app.git_ops.components.writer.file_operator import update_frontmatter_metadata

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

    # 更新元数据（不再需要 stats 参数）
    result = await update_frontmatter_metadata(
        tmp_path,
        "test.mdx",
        {"slug": "new-slug", "author_id": "12345"},
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
    from app.git_ops.components.writer.file_operator import update_frontmatter_metadata

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

    # 传入 None 应该删除字段（不再需要 stats 参数）
    result = await update_frontmatter_metadata(tmp_path, "test.mdx", {"cover": None})

    assert result is True
    content = test_file.read_text(encoding="utf-8")
    assert "cover:" not in content


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_update_frontmatter_metadata_nonexistent_file(tmp_path):
    """测试更新不存在的文件"""
    from app.git_ops.components.writer.file_operator import update_frontmatter_metadata

    # 应该抛出 FileOpsError
    from app.git_ops.exceptions import FileOpsError

    with pytest.raises(FileOpsError):
        await update_frontmatter_metadata(tmp_path, "nonexistent.mdx", {"slug": "test"})


# ========================================
# Resolver 测试已移除
# ========================================
# 注意：resolve_author_id, resolve_category_id, resolve_cover_media_id, resolve_tag_ids
# 这些函数已经被重构为 Processor 模式，不再作为独立函数导出。
# 这些功能现在通过集成测试覆盖（tests/api/git_ops/）。


# ========================================
# write_post_ids_to_frontmatter 测试
# ========================================
# 注意：write_post_ids_to_frontmatter 函数已经通过集成测试充分覆盖
# （tests/api/git_ops/test_sync.py, test_resync_metadata.py 等）
# 单元测试需要 mock 复杂的 Post 对象及其关系（tags, category, author 等），
# 维护成本高且容易出错，因此移除单元测试，依赖集成测试覆盖。


# ========================================
# revalidate_nextjs_cache 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_success():
    """测试成功失效 Next.js 缓存"""
    from app.git_ops.components import revalidate_nextjs_cache

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
    from app.git_ops.components import revalidate_nextjs_cache

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
    from app.git_ops.components import revalidate_nextjs_cache

    result = await revalidate_nextjs_cache("", "")
    assert result is False

    result = await revalidate_nextjs_cache("http://localhost:3000", "")
    assert result is False


@pytest.mark.asyncio
@pytest.mark.unit
@pytest.mark.git_ops
async def test_revalidate_nextjs_cache_network_error():
    """测试网络连接错误"""
    from app.git_ops.components import revalidate_nextjs_cache

    # Mock 网络错误
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        result = await revalidate_nextjs_cache("http://localhost:3000", "test-secret")

        assert result is False
