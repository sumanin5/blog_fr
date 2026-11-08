"""单向同步下 webhook 不再依赖 [skip ci] 或 SHA 去重来防止回写循环。"""

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from app.core.config import settings


def create_signature(payload: bytes, secret: str) -> str:
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return f"sha256={signature}"


def payload_for(message: str, sha: str) -> bytes:
    return json.dumps(
        {
            "ref": "refs/heads/main",
            "after": sha,
            "head_commit": {"id": sha, "message": message},
            "commits": [{"id": sha, "message": message}],
        }
    ).encode()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
@pytest.mark.parametrize(
    "message",
    [
        "chore: sync metadata from database (+2) [skip ci]",
        "chore: auto update [ci skip]",
    ],
)
async def test_webhook_imports_skip_ci_content(
    async_client: AsyncClient, monkeypatch, mocker, message
):
    """[skip ci] 只影响 CI，不应阻止内容导入。"""
    secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", secret)
    background = mocker.patch("app.git_ops.router.run_background_sync")
    payload = payload_for(message, "automated123")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers={"X-Hub-Signature-256": create_signature(payload, secret)},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
    background.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_duplicate_webhook_is_retried_not_silently_skipped(
    async_client: AsyncClient, monkeypatch, mocker
):
    """重复通知交给同步锁和成功游标处理，不能直接丢弃。"""
    secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", secret)
    background = mocker.patch("app.git_ops.router.run_background_sync")
    payload = payload_for("feat: add new article", "duplicate123")
    headers = {"X-Hub-Signature-256": create_signature(payload, secret)}

    for _ in range(2):
        response = await async_client.post(
            f"{settings.API_PREFIX}/ops/git/webhook", content=payload, headers=headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "triggered"

    assert background.call_count == 2


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.git_ops
async def test_webhook_rejects_invalid_signature(
    async_client: AsyncClient, monkeypatch
):
    secret = "test_webhook_secret"
    monkeypatch.setattr(settings, "WEBHOOK_SECRET", secret)
    payload = payload_for("feat: normal", "normal123")

    response = await async_client.post(
        f"{settings.API_PREFIX}/ops/git/webhook",
        content=payload,
        headers={"X-Hub-Signature-256": "sha256=bad"},
    )

    assert response.status_code == 401
