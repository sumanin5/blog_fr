"""
全局异常处理器

替代原来的中间件模式，以获得更好的 OpenAPI 集成和前端类型支持
"""

import logging
import traceback
from datetime import datetime

from app.core.config import settings
from app.core.exceptions import BaseAppException
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from uuid6 import uuid7

logger = logging.getLogger(__name__)


def _get_request_id(request: Request) -> str:
    """获取请求ID，如果不存在则生成新的"""
    return getattr(request.state, "request_id", str(uuid7()))


async def app_exception_handler(
    request: Request, exc: BaseAppException
) -> JSONResponse:
    """处理自定义业务异常"""
    request_id = _get_request_id(request)

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


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """处理FastAPI请求验证异常"""
    request_id = _get_request_id(request)

    logger.warning(f"Validation error: {str(exc)}", extra={"request_id": request_id})

    # 格式化验证错误
    validation_errors = []
    for error in exc.errors():
        # 处理 loc 为空的情况
        loc = error.get("loc", [])
        # 跳过第一个元素 'body' 因为它是请求体标识
        if loc and loc[0] == "body":
            loc = loc[1:]
        field_str = ".".join(str(x) for x in loc) if loc else "unknown"

        validation_errors.append(
            {
                "field": field_str,
                "message": error.get("msg", "Invalid value"),
                "type": error.get("type", "value_error"),
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


async def database_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """处理数据库异常"""
    request_id = _get_request_id(request)

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


async def unexpected_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """处理未预期的异常"""
    request_id = _get_request_id(request)

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
