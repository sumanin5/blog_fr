"""
定时任务调度器

使用 APScheduler 实现定时任务，支持：
- Git 单向同步（拉取到数据库）
- 缓存清理
- 数据统计

注意：
- 多实例部署时需要使用分布式锁避免重复执行
- 任务执行失败会自动记录日志
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    """获取调度器实例"""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(
            timezone="Asia/Shanghai",  # 设置时区
            job_defaults={
                "coalesce": True,  # 合并错过的任务
                "max_instances": 1,  # 同一任务最多同时运行 1 个实例
                "misfire_grace_time": 60,  # 错过任务的宽限时间（秒）
            },
        )
    return scheduler


# ============================================================
# 定时任务函数
# ============================================================


async def sync_from_git_task():
    """
    定时任务：从 Git 拉取更新并同步到数据库

    执行频率：每 5 分钟
    """
    from app.core.db import AsyncSessionLocal
    from app.git_ops.exceptions import GitOpsConfigurationError
    from app.git_ops.service import GitOpsService

    logger.info("🔄 [Scheduled Task] Starting Git sync (pull)...")

    service = None
    try:
        async with AsyncSessionLocal() as session:
            service = GitOpsService(session)
            try:
                stats = await service.sync_incremental()
            except GitOpsConfigurationError:
                # 首次部署没有游标时自动退化为全量导入。
                logger.info(
                    "No sync cursor found; falling back to full import."
                )
                stats = await service.sync_all()

            logger.info(
                f"✅ [Scheduled Task] Git sync completed: "
                f"+{len(stats.added)} ~{len(stats.updated)} -{len(stats.deleted)} "
                f"({stats.duration:.2f}s)"
            )

            if stats.errors:
                logger.warning(
                    f"⚠️  [Scheduled Task] Sync finished with {len(stats.errors)} errors"
                )

    except Exception as e:
        logger.error(f"❌ [Scheduled Task] Git sync failed: {e}", exc_info=True)
        if service is not None:
            try:
                service.container.hash_manager.mark_failed()
            except Exception:
                logger.exception("Failed to mark scheduled sync for full retry")


async def cleanup_old_logs_task():
    """
    定时任务：清理过期日志和临时文件

    执行频率：每天凌晨 2 点
    """
    logger.info("🧹 [Scheduled Task] Starting cleanup...")

    try:
        # TODO: 实现日志清理逻辑
        # - 删除 30 天前的日志文件
        # - 清理临时上传文件
        # - 清理过期的缓存

        logger.info("✅ [Scheduled Task] Cleanup completed")

    except Exception as e:
        logger.error(f"❌ [Scheduled Task] Cleanup failed: {e}", exc_info=True)


# ============================================================
# 调度器管理
# ============================================================


def setup_scheduled_tasks():
    """
    配置所有定时任务

    在 FastAPI 启动时调用
    """
    from app.core.config import settings

    scheduler = get_scheduler()

    # 任务 1：每 5 分钟从 Git 拉取更新
    if settings.ENABLE_GIT_AUTO_SYNC:
        scheduler.add_job(
            sync_from_git_task,
            trigger=IntervalTrigger(minutes=5),
            id="sync_from_git",
            name="从 Git 拉取更新",
            replace_existing=True,
        )
        logger.info("✅ Scheduled task registered: sync_from_git (every 5 minutes)")

    # 任务 3：每天凌晨 2 点清理日志
    scheduler.add_job(
        cleanup_old_logs_task,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_logs",
        name="清理过期日志",
        replace_existing=True,
    )
    logger.info("✅ Scheduled task registered: cleanup_logs (daily at 2:00 AM)")

    # 启动调度器
    if not scheduler.running:
        scheduler.start()
        logger.info("🚀 Scheduler started successfully")


def shutdown_scheduler():
    """
    关闭调度器

    在 FastAPI 关闭时调用
    """
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("🛑 Scheduler stopped")
