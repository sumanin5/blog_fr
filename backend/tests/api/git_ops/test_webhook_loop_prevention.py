"""
测试 Webhook 循环触发防护机制
"""

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from app.core.config import settings


def create_signature(payload: bytes, secret: str) -> str:
    """生成有效的 GitHub webhook 签名"""
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return f"sha256={signature}"


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_skips_automated_commit_with_skip_ci(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：带有 [skip ci] 标记的提交应该被跳过"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 创建带有 [skip ci] 的 commit payload
    payload_data = {
        "ref": "refs/heads/main",
        "after": "automated123",
        "head_commit": {
            "id": "automated123",
            "message": "chore: sync metadata from database (+2) [skip ci]",
        },
        "commits": [
            {
                "id": "automated123",
                "message": "chore: sync metadata from database (+2) [skip ci]",
                "author": {"name": "System"},
            }
        ],
    }
    payload = json.dumps(payload_data).encode()

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
        "Content-Type": "application/json",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"
    assert data["reason"] == "automated commit with [skip ci]"

    # 后台任务不应该被触发
    mock_bg_sync.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_skips_automated_commit_with_ci_skip(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：带有 [ci skip] 标记的提交应该被跳过"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 创建带有 [ci skip] 的 commit payload
    payload_data = {
        "ref": "refs/heads/main",
        "after": "automated456",
        "commits": [
            {
                "id": "automated456",
                "message": "chore: auto update [ci skip]",
            }
        ],
    }
    payload = json.dumps(payload_data).encode()

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
        "Content-Type": "application/json",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"
    assert data["reason"] == "automated commit with [skip ci]"

    # 后台任务不应该被触发
    mock_bg_sync.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_processes_normal_commit(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：正常的提交应该被处理"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 创建正常的 commit（没有 [skip ci]）
    payload_data = {
        "ref": "refs/heads/main",
        "after": "normal123",
        "commits": [
            {
                "id": "normal123",
                "message": "feat: add new article",
            }
        ],
    }
    payload = json.dumps(payload_data).encode()

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
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

    # 后台任务应该被触发
    mock_bg_sync.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_sha_deduplication(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：相同 SHA 的 webhook 应该被去重"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 清空缓存
    from app.git_ops.router import _recent_webhook_commits

    _recent_webhook_commits.clear()

    commit_sha = "duplicate123"
    payload_data = {
        "ref": "refs/heads/main",
        "after": commit_sha,
        "commits": [
            {
                "id": commit_sha,
                "message": "test: normal commit",
            }
        ],
    }
    payload = json.dumps(payload_data).encode()

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
        "Content-Type": "application/json",
    }

    # 第一次请求：应该被处理
    response1 = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["status"] == "triggered"
    assert mock_bg_sync.call_count == 1

    # 第二次请求：相同 SHA，应该被跳过
    response2 = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] == "skipped"
    assert data2["reason"] == "duplicate commit"

    # 后台任务不应该再次被触发
    assert mock_bg_sync.call_count == 1


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_with_invalid_json_still_processes(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：即使 payload 不是有效的 JSON，也应该继续处理（容错）"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 无效的 JSON payload
    payload = b"invalid json content"

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
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

    # 后台任务应该被触发
    mock_bg_sync.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_skip_ci_takes_precedence(
    async_client: AsyncClient,
    monkeypatch,
    mocker,
):
    """测试：[skip ci] 检查应该优先于 SHA 去重（提前返回，不记录 SHA）"""
    webhook_secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", webhook_secret)

    # Mock 后台任务
    mock_bg_sync = mocker.patch("app.git_ops.router.run_background_sync")

    # 清空缓存
    from app.git_ops.router import _recent_webhook_commits

    _recent_webhook_commits.clear()

    # 发送带有 [skip ci] 的 webhook
    payload_data = {
        "ref": "refs/heads/main",
        "after": "auto999",
        "commits": [
            {
                "id": "auto999",
                "message": "chore: automated [skip ci]",
            }
        ],
    }
    payload = json.dumps(payload_data).encode()

    headers = {
        "X-Hub-Signature-256": create_signature(payload, webhook_secret),
        "Content-Type": "application/json",
    }

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"
    assert data["reason"] == "automated commit with [skip ci]"

    # SHA 不应该被添加到缓存中（因为提前返回了）
    assert "auto999" not in _recent_webhook_commits

    # 后台任务不应该被触发
    mock_bg_sync.assert_not_called()
