"""
Hash 管理组件 - 负责同步 hash 的读取、保存和对比
"""

from pathlib import Path
from typing import Optional, Tuple

from app.git_ops.git_client import GitClient

LAST_SYNC_FILE = ".gitops_last_sync"


class HashManager:
    """Hash 管理组件"""

    def __init__(self, content_dir: Path, git_client: GitClient):
        self.content_dir = content_dir
        self.git_client = git_client
        self.last_sync_file = content_dir / LAST_SYNC_FILE

    def get_last_hash(self) -> Optional[str]:
        """获取上次同步的 commit hash"""
        if self.last_sync_file.exists():
            return self.last_sync_file.read_text().strip()
        return None

    async def save_current_hash(self) -> str:
        """保存当前 commit hash 并返回"""
        current_hash = await self.git_client.get_current_hash()
        if current_hash:
            self.last_sync_file.write_text(current_hash)
        return current_hash

    async def has_new_commits(self) -> bool:
        """检查是否有新的 commit（对比上次同步的 hash）"""
        last_hash = self.get_last_hash()
        if not last_hash:
            return True  # 没有记录，认为有新 commit

        current_hash = await self.git_client.get_current_hash()
        return current_hash != last_hash

    async def get_changed_files_since_last_sync(
        self,
    ) -> Optional[list[Tuple[str, str]]]:
        """获取自上次同步以来变更的文件

        Returns:
            List of (status, filepath) tuples, or None if no last sync record
        """
        last_hash = self.get_last_hash()
        if not last_hash:
            return None

        return await self.git_client.get_changed_files_with_status(last_hash)

    async def get_changed_files_between(
        self, old_hash: str, new_hash: str
    ) -> list[Tuple[str, str]]:
        """获取两个 hash 之间变更的文件

        Args:
            old_hash: 旧的 commit hash
            new_hash: 新的 commit hash

        Returns:
            List of (status, filepath) tuples, empty list if hashes are the same
        """
        if old_hash == new_hash:
            return []

        return await self.git_client.get_changed_files_with_status(
            f"{old_hash}..{new_hash}"
        )
