import hashlib
import hmac
import logging

from app.git_ops.exceptions import WebhookSignatureError

logger = logging.getLogger(__name__)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    验证 GitHub Webhook 签名。

    Args:
        payload: 请求体（原始字节）
        signature: GitHub 发来的签名（格式：sha256=xxx）
        secret: Webhook secret（从环境变量读取）

    Returns:
        True 如果签名有效

    Raises:
        WebhookSignatureError: 如果签名无效或缺失
    """
    if not secret:
        logger.warning(
            "⚠️ WEBHOOK_SECRET not configured. "
            "All webhook requests will be rejected for security."
        )
        raise WebhookSignatureError("Webhook secret not configured")

    if not signature:
        logger.warning("Missing X-Hub-Signature-256 header")
        raise WebhookSignatureError("Missing X-Hub-Signature-256 header")

    # 用 secret 和 payload 生成预期的签名
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    expected_signature = f"sha256={expected}"

    # 使用 compare_digest 防止时序攻击
    is_valid = hmac.compare_digest(expected_signature, signature)

    if not is_valid:
        logger.warning(
            f"Invalid webhook signature. Expected: {expected_signature[:20]}..., Got: {signature[:20]}..."
        )
        raise WebhookSignatureError("Invalid webhook signature")

    return True
