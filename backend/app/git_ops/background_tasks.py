"""
GitOps 后台任务

用于 FastAPI BackgroundTasks 的异步任务函数
"""

import logging

logger = logging.getLogger(__name__)


async def run_background_sync():
    """
    后台任务：运行 Git 同步。
    """
    from app.core.db import AsyncSessionLocal
    from app.git_ops.service import GitOpsService

    async with AsyncSessionLocal() as session:
        logger.info("Starting background Git sync via Webhook...")
        service = GitOpsService(session)
        # Webhook 触发默认使用增量更新
        stats = await service.sync_incremental()
        logger.info(
            f"Background Git sync finished: "
            f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)} "
            f"({stats.duration:.2f}s)"
        )
        if stats.errors:
            logger.warning(f"Background sync finished with {len(stats.errors)} errors")


async def run_background_commit(message: str = "Auto-save from Admin"):
    """
    后台任务：执行 Git Add/Commit/Push
    """
    from app.core.db import AsyncSessionLocal
    from app.git_ops.service import GitOpsService

    async with AsyncSessionLocal() as session:
        service = GitOpsService(session)
        await service.auto_commit(message)
