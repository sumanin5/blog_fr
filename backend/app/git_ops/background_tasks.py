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


async def run_background_commit(
    message: str = "Auto-save from Admin", post_id: str = None
):
    """
    后台任务：导出文章到文件系统并执行 Git Add/Commit/Push

    Args:
        message: Git commit 信息
        post_id: 可选，指定要导出的文章 ID。如果为 None，则导出所有需要同步的文章
    """
    from app.core.db import AsyncSessionLocal
    from app.git_ops.service import GitOpsService

    async with AsyncSessionLocal() as session:
        service = GitOpsService(session)

        # 1. 先导出文章到文件系统
        logger.info(f"Exporting post(s) to Git: post_id={post_id}")
        stats = await service.export_to_git(post_id=post_id)

        # 2. 如果有文件更新，执行 Git 提交
        if stats.updated:
            logger.info(
                f"Committing {len(stats.updated)} file(s) with message: {message}"
            )
            await service.auto_commit(message)
            logger.info("Background commit finished successfully")
        else:
            logger.info("No files to commit, skipping Git push")
