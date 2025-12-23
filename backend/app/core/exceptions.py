"""
基础异常类和通用异常

所有业务异常的基类和跨模块的通用异常
"""

from typing import Any, Dict, Optional


class BaseAppException(Exception):
    """应用基础异常类"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


# ========================================
# 通用异常（跨模块使用）
# ========================================


class ValidationError(BaseAppException):
    """数据验证异常"""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class DatabaseError(BaseAppException):
    """数据库操作异常"""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message=message, status_code=500, error_code="DATABASE_ERROR")


class InsufficientPermissionsError(BaseAppException):
    """权限不足异常"""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message, status_code=403, error_code="INSUFFICIENT_PERMISSIONS"
        )
