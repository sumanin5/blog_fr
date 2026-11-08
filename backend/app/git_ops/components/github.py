"""
GitHub 操作组件 - 处理所有 GitHub 相关操作

职责：
- Git pull（拉取远程更新）
- 旧版提交入口返回只读错误
"""

import logging
from pathlib import Path

from app.git_ops.exceptions import GitOpsReadOnlyError, NotGitRepositoryError
from app.git_ops.git_client import GitClient

logger = logging.getLogger(__name__)


class GitHubComponent:
    """GitHub 操作组件 - 包装高阶 Git 远程操作"""

    def __init__(self, content_dir: Path, git_client: GitClient):
        self.content_dir = content_dir
        self.git_client = git_client

    async def pull(self) -> tuple[str, str, str]:
        """拉取远程更新

        Returns:
            Tuple of (output_message, old_hash, new_hash)
            - output_message: Git pull 的输出信息
            - old_hash: Pull 前的 commit hash
            - new_hash: Pull 后的 commit hash

        Raises:
            NotGitRepositoryError: 不是 Git 仓库
            GitError: Git 操作失败
        """
        if not (self.content_dir / ".git").exists():
            raise NotGitRepositoryError()

        from app.core.config import settings

        # 获取 pull 前的 hash
        old_hash = await self.git_client.get_current_hash()

        logger.info(f"Pulling from remote (branch: {settings.GIT_SYNC_BRANCH})...")
        output = await self.git_client.pull(branch=settings.GIT_SYNC_BRANCH)
        logger.info(f"Git pull result: {output}")

        # 获取 pull 后的 hash
        new_hash = await self.git_client.get_current_hash()

        return output, old_hash, new_hash

    async def commit_and_push(self, message: str, files=None) -> bool:
        raise GitOpsReadOnlyError()

    async def auto_commit_metadata(self, added_count=0, updated_count=0, deleted_count=0) -> bool:
        raise GitOpsReadOnlyError()
