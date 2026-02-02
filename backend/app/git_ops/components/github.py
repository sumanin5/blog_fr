"""
GitHub 操作组件 - 处理所有 GitHub 相关操作

职责：
- Git pull（拉取远程更新）
- Git commit + push（提交并推送）
- 自动提交元数据变更
"""

import logging
from pathlib import Path
from typing import List, Optional

from app.git_ops.exceptions import NotGitRepositoryError
from app.git_ops.git_client import GitClient

logger = logging.getLogger(__name__)


class GitHubComponent:
    """GitHub 操作组件 - 包装高阶 Git 远程操作"""

    def __init__(self, content_dir: Path, git_client: GitClient):
        self.content_dir = content_dir
        self.git_client = git_client

    async def pull(self) -> str:
        """拉取远程更新

        Returns:
            拉取结果消息

        Raises:
            NotGitRepositoryError: 不是 Git 仓库
            GitError: Git 操作失败
        """
        if not (self.content_dir / ".git").exists():
            raise NotGitRepositoryError()

        logger.info("Pulling from remote...")
        output = await self.git_client.pull()
        logger.info(f"Git pull result: {output}")
        return output

    async def commit_and_push(
        self, message: str, files: Optional[List[str]] = None
    ) -> bool:
        """提交并推送变更

        Args:
            message: 提交信息
            files: 要提交的文件列表，None 表示所有变更

        Returns:
            是否成功
        """
        # 1. 获取所有变更的文件
        status = await self.git_client.get_file_status()
        if not status:
            logger.info("No changes to commit.")
            return False

        # 提取变更的文件路径
        changed_files = {path for _, path in status}
        logger.info(f"Found {len(changed_files)} changed files: {changed_files}")

        # 2. 决定要添加哪些文件
        if files:
            # 只添加指定的文件（且这些文件确实有变更）
            files_to_add = [f for f in files if f in changed_files]
            if not files_to_add:
                logger.info("Specified files have no changes.")
                return False
            await self.git_client.add(files_to_add)
            logger.info(f"Adding {len(files_to_add)} specified files")
        else:
            # 添加所有变更
            await self.git_client.add(["."])
            logger.info(f"Adding all {len(changed_files)} changed files")

        # 3. Commit
        await self.git_client.commit(message)
        logger.info(f"Committed: {message}")

        # 4. Push
        # The git_client.push() method is expected to raise an exception on failure.
        # If it succeeds, the execution continues, and True is returned.
        await self.git_client.push()
        logger.info("Pushed to remote successfully.")

        return True

    async def auto_commit_metadata(
        self,
        added_count: int = 0,
        updated_count: int = 0,
        deleted_count: int = 0,
    ) -> bool:
        """自动提交元数据变更

        用于同步后自动提交回写的 ID 和元数据

        Args:
            added_count: 新增文件数
            updated_count: 更新文件数
            deleted_count: 删除文件数

        Returns:
            是否成功
        """
        # 构建提交信息
        parts = []
        if added_count > 0:
            parts.append(f"+{added_count}")
        if updated_count > 0:
            parts.append(f"~{updated_count}")
        if deleted_count > 0:
            parts.append(f"-{deleted_count}")

        if not parts:
            logger.info("No metadata changes to commit.")
            return False

        message = f"chore: sync metadata from database ({' '.join(parts)})"

        return await self.commit_and_push(message)
