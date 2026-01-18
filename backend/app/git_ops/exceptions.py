from app.core.exceptions import BaseAppException
from fastapi import status


class GitOpsError(BaseAppException):
    """GitOps 模块基础异常"""

    pass


class GitOpsConfigurationError(GitOpsError):
    """配置或环境错误（致命）"""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="GITOPS_CONFIG_ERROR",
        )


class GitOpsSyncError(GitOpsError):
    """同步过程中的非致命错误（通常被捕获并记录）"""

    def __init__(self, message: str, detail: str = ""):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="GITOPS_SYNC_ERROR",
            details={"info": detail} if detail else None,
        )


class WebhookSignatureError(GitOpsError):
    """Webhook 签名验证失败"""

    def __init__(self, message: str = "Invalid or missing webhook signature"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="WEBHOOK_SIGNATURE_ERROR",
        )


class GitError(GitOpsError):
    """Git 操作失败"""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="GIT_ERROR",
        )


class GitNotFoundError(GitError):
    """Git 命令未找到"""

    def __init__(self):
        super().__init__("git command not found. Please install git.")


class NotGitRepositoryError(GitError):
    """不是 Git 仓库"""

    def __init__(self):
        super().__init__("Not a git repository")
