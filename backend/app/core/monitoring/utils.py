import logging
import time

logger = logging.getLogger(__name__)


def track_performance(operation_name: str):
    """性能追踪装饰器：用于测量业务代码段的执行耗时"""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.time() - start_time
                logger.info(
                    f"⏱️  Performance: {operation_name} took {duration:.3f}s",
                    extra={"operation": operation_name, "duration": duration},
                )

        return wrapper

    return decorator
