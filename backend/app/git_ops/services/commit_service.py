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
