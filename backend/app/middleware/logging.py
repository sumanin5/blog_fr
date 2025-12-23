"""
日志中间件

记录所有HTTP请求的详细信息，包括请求时间、响应时间、状态码等
"""

import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# 创建专门的日志记录器
logger = logging.getLogger("middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    日志中间件

    功能：
    1. 记录每个请求的基本信息
    2. 计算请求处理时间
    3. 记录响应状态码
    4. 捕获和记录异常
    """

    async def dispatch(self, request: Request, call_next):
        # 记录请求开始时间
        start_time = time.time()

        # 获取请求ID（由RequestIDMiddleware提供）
        request_id = getattr(request.state, "request_id", "unknown")

        # 提取请求信息
        method = request.method
        url = str(request.url)
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")

        # 记录请求开始
        logger.info(
            f"Request started - {request_id} - {method} {url} - IP: {client_ip}"
        )

        try:
            # 处理请求
            response: Response = await call_next(request)

            # 计算处理时间
            process_time = time.time() - start_time

            # 记录请求完成
            logger.info(
                f"Request completed - {request_id} - {method} {url} - "
                f"Status: {response.status_code} - Time: {process_time:.3f}s - IP: {client_ip}"
            )

            # 在响应头中添加处理时间
            response.headers["X-Process-Time"] = str(process_time)

            return response

        except Exception as e:
            # 计算处理时间（即使出错也要记录）
            process_time = time.time() - start_time

            # 记录错误
            logger.error(
                f"Request failed - {request_id} - {method} {url} - "
                f"Error: {str(e)} - Time: {process_time:.3f}s - IP: {client_ip}",
                exc_info=True,
            )

            # 重新抛出异常，让FastAPI的错误处理机制处理
            raise

    def _get_client_ip(self, request: Request) -> str:
        """
        获取客户端真实IP地址

        考虑代理服务器的情况（如Nginx、Cloudflare等）
        """
        # 检查常见的代理头
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # X-Forwarded-For 可能包含多个IP，取第一个
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # 如果没有代理头，使用直接连接的IP
        if request.client:
            return request.client.host

        return "unknown"
