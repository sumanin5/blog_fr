"""
请求ID中间件

为每个请求生成唯一ID，便于日志追踪和问题排查
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from uuid6 import uuid7


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    请求ID中间件

    功能：
    1. 为每个请求生成唯一的request_id
    2. 将request_id添加到请求状态中
    3. 在响应头中返回request_id
    """

    async def dispatch(self, request: Request, call_next):
        # 生成唯一的请求ID
        request_id = str(uuid7())

        # 将request_id存储到请求状态中，供其他中间件和路由使用
        request.state.request_id = request_id

        # 处理请求
        response: Response = await call_next(request)

        # 在响应头中添加request_id，便于客户端追踪
        response.headers["X-Request-ID"] = request_id

        return response
