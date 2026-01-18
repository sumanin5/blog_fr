"""
GitOps Preview 和 Webhook API 测试
"""

import hashlib
import hmac
from pathlib import Path

import pytest
from app.core.config import settings
from httpx import AsyncClient

# ========================================
# Preview API 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_preview_sync_with_new_files(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
    superadmin_user,
):
    """测试预览模式：新增文件"""
    # 创建新文件
    test_file = mock_content_dir / "new-post.mdx"
    test_file.write_text(
        f"""---
title: "New Post"
slug: "new-post"
author: "{superadmin_user.username}"
---

Content.
""",
        encoding="utf-8",
    )

    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 应该有待创建的文件
    assert len(data["to_create"]) == 1
    assert data["to_create"][0]["file"] == "new-post.mdx"
    assert data["to_create"][0]["title"] == "New Post"


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_preview_sync_no_changes(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    mock_content_dir: Path,
):
    """测试预览模式：无变更"""
    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # 应该都是空的
    assert len(data["to_create"]) == 0
    assert len(data["to_update"]) == 0
    assert len(data["to_delete"]) == 0


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_preview_sync_requires_admin(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    mock_content_dir: Path,
):
    """测试预览接口需要管理员权限"""
    response = await async_client.get(
        f"{settings.API_PREFIX}/ops/git/preview",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403


# ========================================
# Webhook API 测试
# ========================================


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_with_valid_signature(
    async_client: AsyncClient,
    mock_content_dir: Path,
    superadmin_user,
    monkeypatch,
):
    """测试 Webhook：有效签名"""
    # 设置 webhook secret
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", "test_secret")

    # 创建测试文件
    test_file = mock_content_dir / "webhook-test.mdx"
    test_file.write_text(
        f"""---
title: "Webhook Test"
slug: "webhook-test"
author: "{superadmin_user.username}"
---

Content from webhook.
""",
        encoding="utf-8",
    )

    # 构造 webhook 请求
    payload = b'{"ref": "refs/heads/main"}'

    # 生成签名
    signature = hmac.new(b"test_secret", payload, hashlib.sha256).hexdigest()
    headers = {
        "X-Hub-Signature-256": f"sha256={signature}",
        "Content-Type": "application/json",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "triggered"


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_with_invalid_signature(
    async_client: AsyncClient,
    monkeypatch,
):
    """测试 Webhook：无效签名"""
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", "test_secret")

    payload = b'{"ref": "refs/heads/main"}'
    headers = {
        "X-Hub-Signature-256": "sha256=invalid_signature",
        "Content-Type": "application/json",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_missing_signature(
    async_client: AsyncClient,
    monkeypatch,
):
    """测试 Webhook：缺少签名"""
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", "test_secret")

    payload = b'{"ref": "refs/heads/main"}'

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_without_secret_configured(
    async_client: AsyncClient,
    monkeypatch,
):
    """测试 Webhook：未配置 secret 时仍然接受请求"""
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", "")

    payload = b'{"ref": "refs/heads/main"}'

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
    )

    # 如果没有配置 secret，应该拒绝请求
    assert response.status_code == 401
