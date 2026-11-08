"""
Hash 管理组件 - 负责同步 hash 的读取、保存和对比
"""

from pathlib import Path
from typing import Optional, Tuple

from app.git_ops.git_client import GitClient

LAST_SYNC_FILE = ".gitops_last_sync"
NEEDS_FULL_SYNC_FILE = ".gitops_needs_full_sync"


class HashManager:
    """Hash 管理组件"""

    def __init__(self, content_dir: Path, git_client: GitClient):
        self.content_dir = content_dir
        self.git_client = git_client
        git_dir = content_dir / ".git"
        if git_dir.is_file():
            # Worktrees/submodules use a .git pointer instead of a directory.
            pointer = git_dir.read_text(encoding="utf-8").strip()
            if pointer.startswith("gitdir: "):
                git_dir = (content_dir / pointer.removeprefix("gitdir: ")).resolve()
        self.last_sync_file = (
            git_dir / LAST_SYNC_FILE
            if git_dir.is_dir()
            else content_dir.parent / f".{content_dir.name}{LAST_SYNC_FILE}"
        )
        self.needs_full_sync_file = self.last_sync_file.with_name(
            NEEDS_FULL_SYNC_FILE
        )
        self.legacy_sync_file = content_dir / LAST_SYNC_FILE

    def get_last_hash(self) -> Optional[str]:
        """获取上次同步的 commit hash"""
        for path in (self.last_sync_file, self.legacy_sync_file):
            if path.exists():
                value = path.read_text(encoding="utf-8").strip()
                if value:
                    return value
        return None

    async def save_current_hash(self) -> str:
        """保存当前 commit hash 并返回"""
        current_hash = await self.git_client.get_current_hash()
        if current_hash:
            self.last_sync_file.write_text(current_hash, encoding="utf-8")
        return current_hash

    def mark_failed(self) -> None:
        """记录上次同步失败，下一次增量同步前先做一次全量对账。"""
        self.needs_full_sync_file.write_text("1", encoding="utf-8")

    def clear_failed(self) -> None:
        if self.needs_full_sync_file.exists():
            self.needs_full_sync_file.unlink()

    def needs_full_sync(self) -> bool:
        return self.needs_full_sync_file.exists()

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

        return await self.git_client.get_changed_files_with_status(f"{last_hash}..HEAD")

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
