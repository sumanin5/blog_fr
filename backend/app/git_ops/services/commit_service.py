"""
Git 提交服务 - 负责自动提交和推送
"""

import logging

from .base import BaseGitOpsService

logger = logging.getLogger(__name__)


class CommitService(BaseGitOpsService):
    """Git 提交服务 - 负责自动提交和推送"""

    async def auto_commit(self, message: str):
        """执行自动提交和推送

        Args:
            message: 提交信息
        """
        if not (self.content_dir / ".git").exists():
            logger.warning("Skipping auto-commit: Not a git repository")
            return

        logger.info(f"Starting auto-commit: {message}")
        await self.git_client.add(["."])
        await self.git_client.commit(message)
        await self.git_client.push()
        logger.info("Auto-commit finished successfully.")
