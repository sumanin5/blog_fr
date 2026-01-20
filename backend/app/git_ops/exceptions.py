import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Protocol

from app.core.exceptions import BaseAppException
from app.git_ops.schema import SyncError

logger = logging.getLogger(__name__)


class GitOpsError(BaseAppException):
    """GitOps 模块基础异常"""

    pass


class GitOpsConfigurationError(GitOpsError):
    """配置或环境错误（致命）"""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=500,
            error_code="GITOPS_CONFIG_ERROR",
        )


class GitOpsSyncError(GitOpsError):
    """同步过程中的非致命错误（通常被捕获并记录）"""

    def __init__(self, message: str, detail: str = ""):
        super().__init__(
            message=message,
            status_code=400,
            error_code="GITOPS_SYNC_ERROR",
            details={"info": detail} if detail else None,
        )


class WebhookSignatureError(GitOpsError):
    """Webhook 签名验证失败"""

    def __init__(self, message: str = "Invalid or missing webhook signature"):
        super().__init__(
            message=message,
            status_code=401,
            error_code="WEBHOOK_SIGNATURE_ERROR",
        )


class GitError(GitOpsError):
    """Git 操作失败"""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=500,
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


class FileOpsError(GitOpsError):
    """文件系统操作失败"""

    def __init__(self, message: str, path: str = "", detail: str = ""):
        super().__init__(
            message=f"{message} (path={path})" if path else message,
            status_code=500,
            error_code="FILE_OPERATION_ERROR",
            details={"path": str(path), "info": detail} if (path or detail) else None,
        )


class ScanError(GitOpsError):
    """文件扫描失败"""

    def __init__(self, file_path: str, message: str):
        super().__init__(
            message=f"Scan error in {file_path}: {message}",
            status_code=400,
            error_code="SCAN_ERROR",
        )


class FrontmatterValidationError(GitOpsError):
    """Frontmatter 字段验证失败"""

    def __init__(self, field_name: str, value: str, reason: str):
        super().__init__(
            message=f"Invalid value for field '{field_name}': {reason}",
            status_code=400,
            error_code="FRONTMATTER_VALIDATION_ERROR",
            details={"field": field_name, "value": value, "reason": reason},
        )


class ErrorCollector(Protocol):
    errors: List[SyncError]


@asynccontextmanager
async def collect_errors(
    stats: ErrorCollector, context: str, extra_info: Optional[Dict[str, Any]] = None
):
    """
    上下文管理器：捕获并记录 GitOps 操作中的非致命错误。
    """
    try:
        yield
    except GitOpsError as e:
        # 业务预期内的错误 (Git, Scan, Sync 等)
        error_record = SyncError(
            context=context, code=e.error_code, message=e.message, details=e.details
        )
        stats.errors.append(error_record)
        log_msg = f"GitOps Business Error: [{context}] {e.error_code} - {e.message}"

        if e.status_code >= 500:
            logger.error(
                log_msg,
                extra={
                    "error_code": e.error_code,
                    "details": e.details,
                    **(extra_info or {}),
                },
            )
        else:
            logger.warning(
                log_msg,
                extra={
                    "error_code": e.error_code,
                    "details": e.details,
                    **(extra_info or {}),
                },
            )
    except Exception as e:
        error_record = SyncError(
            context=context,
            code="INTERNAL_ERROR",
            message=str(e),
        )
        stats.errors.append(error_record)
        logger.exception(
            f"GitOps Sync Unexpected Error: [{context}] {str(e)}",
            extra={"error_code": "INTERNAL_ERROR", **(extra_info or {})},
        )
