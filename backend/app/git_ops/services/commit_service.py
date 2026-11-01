"""
Git 提交服务 - 负责自动提交和推送
"""

import logging

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class CommitService(BaseGitOpsService):
    """Git 提交服务 - 负责自动提交和推送"""

    async def auto_commit(self, message: str):
        """执行自动提交和推送（对外入口，与同步、导出共用仓库锁）

        Args:
            message: 提交信息
        """
        from .sync_service import SyncService

        async with SyncService.repository_lock(self.session):
            await self.auto_commit_unlocked(message)

    async def auto_commit_unlocked(self, message: str):
        """执行自动提交和推送；调用方必须已持有 SyncService.repository_lock

        仓库锁不可重入（进程内 asyncio.Lock + 新连接上的 advisory lock），
        已在锁内的流程（如导出）必须调用本方法，否则会自我阻塞。
        """
        if not (self.content_dir / ".git").exists():
            logger.warning("Skipping auto-commit: Not a git repository")
            return

        logger.info(f"Starting auto-commit: {message}")

        try:
            # 1. 添加所有更改
            await self.git_client.add(["."])

            # 2. 提交（如果有更改）
            await self.git_client.commit(message)

            # 3. 在推送前先拉取远程更新
            try:
                logger.info("Pulling remote changes before push...")
                await self.git_client.pull()
            except Exception as pull_error:
                logger.warning(f"Pull failed, trying to push anyway: {pull_error}")

            # 4. 推送
            await self.git_client.push()

            logger.info("Auto-commit finished successfully.")
        except Exception as e:
            logger.error(f"Auto-commit failed: {e}")
            raise
