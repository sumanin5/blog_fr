"""
中间件管理器

统一管理和配置所有中间件
"""

import logging as stdlib_logging

from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware
from fastapi import FastAPI

# 配置日志格式
stdlib_logging.basicConfig(
    level=stdlib_logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def setup_middleware(app: FastAPI) -> None:
    """
    设置所有中间件

    注意：中间件的添加顺序很重要！
    FastAPI按照添加的相反顺序执行中间件

    执行顺序：
    1. RequestIDMiddleware（最先执行，为请求生成ID）
    2. LoggingMiddleware（记录请求信息）
    3. 其他中间件...
    """

    # 1. 错误处理中间件
    app.add_middleware(ErrorHandlerMiddleware)

    # 2. 日志中间件
    app.add_middleware(LoggingMiddleware)

    # 3. 请求ID中间件
    app.add_middleware(RequestIDMiddleware)
    stdlib_logging.getLogger("middleware").info(
        "All middleware configured successfully"
    )


# 导出主要组件，供其他模块使用
__all__ = ["setup_middleware", "RequestIDMiddleware", "LoggingMiddleware"]
