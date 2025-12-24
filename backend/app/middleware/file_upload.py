"""
文件上传中间件

处理文件上传的大小限制和验证
"""

import logging
from typing import Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class FileSizeLimitMiddleware:
    """文件大小限制中间件"""

    def __init__(
        self,
        app: Callable,
        max_upload_size: int = 50 * 1024 * 1024,  # 50MB
    ):
        self.app = app
        self.max_upload_size = max_upload_size

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)

            # 检查是否是文件上传请求
            if self._is_upload_request(request):
                # 检查 Content-Length 头
                content_length = request.headers.get("content-length")
                if content_length:
                    content_length = int(content_length)
                    if content_length > self.max_upload_size:
                        logger.warning(
                            f"文件上传大小超出限制: {content_length} > {self.max_upload_size}"
                        )
                        response = JSONResponse(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            content={
                                "error": "FILE_TOO_LARGE",
                                "message": f"文件大小超出限制，最大允许 {self.max_upload_size // (1024 * 1024)}MB",
                            },
                        )
                        await response(scope, receive, send)
                        return

        await self.app(scope, receive, send)

    def _is_upload_request(self, request: Request) -> bool:
        """检查是否是文件上传请求"""
        content_type = request.headers.get("content-type", "")
        return request.method == "POST" and content_type.startswith(
            "multipart/form-data"
        )


def setup_file_upload_middleware(app, max_size: int = 50 * 1024 * 1024):
    """设置文件上传中间件

    Args:
        app: FastAPI 应用实例
        max_size: 最大文件大小（字节）
    """
    app.add_middleware(FileSizeLimitMiddleware, max_upload_size=max_size)
    logger.info(f"文件上传中间件已设置，最大大小: {max_size // (1024 * 1024)}MB")
