"""
错误处理中间件

全局捕获和处理应用异常，统一错误响应格式
"""

import logging
import traceback
from datetime import datetime

from app.core.config import settings
from app.core.exceptions import BaseAppException
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware
from uuid6 import uuid7

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """错误处理中间件"""

    async def dispatch(self, request: Request, call_next) -> Response:
        """处理请求并捕获异常"""

        # 生成请求ID（如果还没有的话）
        request_id = getattr(request.state, "request_id", str(uuid7()))

        try:
            # 执行请求
            response = await call_next(request)
            return response

        except BaseAppException as exc:
            # 处理自定义业务异常
            return await self._handle_app_exception(exc, request_id)

        except PydanticValidationError as exc:
            # 处理Pydantic验证异常
            return await self._handle_validation_exception(exc, request_id)

        except SQLAlchemyError as exc:
            # 处理数据库异常
            return await self._handle_database_exception(exc, request_id)

        except Exception as exc:
            # 处理未预期的异常
            return await self._handle_unexpected_exception(exc, request_id, request)

    async def _handle_app_exception(
        self, exc: BaseAppException, request_id: str
    ) -> JSONResponse:
        """处理自定义业务异常"""

        # 记录日志
        if exc.status_code >= 500:
            logger.error(
                f"Business exception: {exc.error_code} - {exc.message}",
                extra={
                    "request_id": request_id,
                    "error_code": exc.error_code,
                    "status_code": exc.status_code,
                    "details": exc.details,
                },
            )
        else:
            logger.warning(
                f"Business exception: {exc.error_code} - {exc.message}",
                extra={
                    "request_id": request_id,
                    "error_code": exc.error_code,
                    "status_code": exc.status_code,
                },
            )

        # 构建错误响应
        error_response = {
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
            }
        }

        return JSONResponse(status_code=exc.status_code, content=error_response)

    async def _handle_validation_exception(
        self, exc: PydanticValidationError, request_id: str
    ) -> JSONResponse:
        """处理Pydantic验证异常"""

        logger.warning(
            f"Validation error: {str(exc)}", extra={"request_id": request_id}
        )

        # 格式化验证错误
        validation_errors = []
        for error in exc.errors():
            validation_errors.append(
                {
                    "field": ".".join(str(x) for x in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )

        error_response = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"validation_errors": validation_errors},
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
            }
        }

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=error_response
        )

    async def _handle_database_exception(
        self, exc: SQLAlchemyError, request_id: str
    ) -> JSONResponse:
        """处理数据库异常"""

        logger.error(
            f"Database error: {str(exc)}",
            extra={"request_id": request_id, "exception_type": type(exc).__name__},
        )

        # 生产环境隐藏数据库错误详情
        if settings.environment == "production":
            message = "Database operation failed"
            details = {}
        else:
            message = f"Database error: {str(exc)}"
            details = {"exception_type": type(exc).__name__}

        error_response = {
            "error": {
                "code": "DATABASE_ERROR",
                "message": message,
                "details": details,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
            }
        }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )

    async def _handle_unexpected_exception(
        self, exc: Exception, request_id: str, request: Request
    ) -> JSONResponse:
        """处理未预期的异常"""

        # 记录完整的错误信息
        logger.error(
            f"Unexpected error: {str(exc)}",
            extra={
                "request_id": request_id,
                "exception_type": type(exc).__name__,
                "url": str(request.url),
                "method": request.method,
                "traceback": traceback.format_exc(),
            },
        )

        # 生产环境隐藏错误详情
        if settings.environment == "production":
            message = "Internal server error"
            details = {}
        else:
            message = f"Unexpected error: {str(exc)}"
            details = {
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc().split("\n"),
            }

        error_response = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": message,
                "details": details,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "request_id": request_id,
            }
        }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )
