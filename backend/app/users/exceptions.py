"""
用户模块异常

用户相关的所有业务异常
"""

from app.core.exceptions import BaseAppException


class UserAlreadyExistsError(BaseAppException):
    """用户已存在异常"""

    def __init__(self, message: str = "User already exists"):
        super().__init__(
            message=message, status_code=400, error_code="USER_ALREADY_EXISTS"
        )


class UserNotFoundError(BaseAppException):
    """用户不存在异常"""

    def __init__(self, message: str = "User not found"):
        super().__init__(message=message, status_code=404, error_code="USER_NOT_FOUND")


class InvalidCredentialsError(BaseAppException):
    """认证失败异常"""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(
            message=message, status_code=401, error_code="INVALID_CREDENTIALS"
        )


class InactiveUserError(BaseAppException):
    """用户未激活异常"""

    def __init__(self, message: str = "User account is inactive"):
        super().__init__(message=message, status_code=400, error_code="INACTIVE_USER")
