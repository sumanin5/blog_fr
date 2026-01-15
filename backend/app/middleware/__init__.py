"""
中间件管理器

统一管理和配置所有中间件
"""

import logging as stdlib_logging

from app.middleware.file_upload import setup_file_upload_middleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware
from fastapi import FastAPI

# 配置日志格式
stdlib_logging.basicConfig(
    level=stdlib_logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# 创建logger实例
logger = stdlib_logging.getLogger(__name__)


def setup_middleware(app: FastAPI) -> None:
    """
    设置所有中间件

    注意：中间件的添加顺序很重要！
    FastAPI按照添加的相反顺序执行中间件

    执行顺序：
    1. RequestIDMiddleware（最先执行，为请求生成ID）
    2. LoggingMiddleware（记录请求信息）
    3. FileSizeLimitMiddleware（文件大小检查）
    4. ErrorHandlerMiddleware（错误处理）
    """

    # 1. 错误处理中间件已移至 main.py 作为 exception handlers

    # 2. 文件上传大小限制中间件
    # 注意：这里设置的是所有文件类型的最大值，具体类型限制在 media/utils.py 中定义
    setup_file_upload_middleware(app, max_size=150 * 1024 * 1024)  # 150MB
    logger.info("文件上传中间件已设置：全局限制 150MB")

    # 3. 日志中间件
    app.add_middleware(LoggingMiddleware)

    # 4. 请求ID中间件
    app.add_middleware(RequestIDMiddleware)

    stdlib_logging.getLogger("middleware").info(
        "All middleware configured successfully"
    )


# 导出主要组件，供其他模块使用
__all__ = ["setup_middleware", "RequestIDMiddleware", "LoggingMiddleware"]
