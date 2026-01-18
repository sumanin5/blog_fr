"""
GitOps 模块的错误处理工具

提供统一的错误处理和记录机制
"""

import logging
from typing import Callable, Optional

from app.git_ops.schema import SyncStats

logger = logging.getLogger(__name__)


def handle_sync_error(
    stats: SyncStats,
    file_path: Optional[str] = None,
    error: Optional[Exception] = None,
    error_msg: Optional[str] = None,
    is_critical: bool = False,
) -> None:
    """
    统一处理同步过程中的错误。

    Args:
        stats: 同步统计对象
        file_path: 出错的文件路径（可选）
        error: 异常对象（可选）
        error_msg: 自定义错误消息（可选）
        is_critical: 是否是致命错误（如果是，会记录 error，否则记录 warning）
    """
    # 构建错误消息
    if error_msg:
        msg = error_msg
    elif error:
        msg = str(error)
    else:
        msg = "Unknown error"

    # 添加文件路径前缀
    if file_path:
        msg = f"{file_path}: {msg}"

    # 只有关键性错误才计入 stats.errors
    # 非关键性错误（如 Git pull 失败）只记录日志，不影响同步结果统计
    if is_critical:
        stats.errors.append(msg)
        logger.error(msg)
    else:
        logger.warning(msg)


async def safe_operation(
    operation: Callable,
    stats: SyncStats,
    operation_name: str = "Operation",
    file_path: Optional[str] = None,
    is_critical: bool = False,
) -> bool:
    """
    安全地执行一个操作，自动处理异常。

    Args:
        operation: 要执行的异步操作
        stats: 同步统计对象
        operation_name: 操作名称（用于日志）
        file_path: 相关的文件路径（可选）
        is_critical: 是否是致命错误

    Returns:
        True 如果操作成功，False 如果失败
    """
    try:
        await operation()
        return True
    except Exception as e:
        error_msg = f"{operation_name} failed: {str(e)}"
        handle_sync_error(
            stats,
            file_path=file_path,
            error_msg=error_msg,
            is_critical=is_critical,
        )
        return False
