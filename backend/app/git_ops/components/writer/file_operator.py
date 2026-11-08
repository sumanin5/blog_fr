"""旧的源文件写入组件：单向同步模式下全部拒绝执行。

保留读取方法供只读工具使用；任何写入、移动、删除和 Frontmatter 回写都会
抛出 ``GitOpsReadOnlyError``，避免后续代码误用旧的双向同步入口。
"""

import logging
from pathlib import Path

import aiofiles

from app.git_ops.exceptions import FileOpsError, GitOpsReadOnlyError

logger = logging.getLogger(__name__)


class FileOperator:
    """底层文件操作器 - 单向同步模式下只读。"""

    async def read_text(self, path: Path) -> str:
        """异步读取文件内容"""
        try:
            async with aiofiles.open(path, "r", encoding="utf-8") as f:
                return await f.read()
        except Exception as e:
            raise FileOpsError(
                "Failed to read file", path=str(path), detail=str(e)
            ) from e

    async def write_file(self, path: Path, content: str) -> None:
        raise GitOpsReadOnlyError()

    async def delete_file(self, path: Path) -> None:
        raise GitOpsReadOnlyError()

    def move_file(self, old_path: Path, new_path: Path) -> bool:
        raise GitOpsReadOnlyError()


async def update_frontmatter_metadata(
    content_dir: Path, file_path: str, metadata: dict
):
    """旧版分类元数据回写入口，单向同步模式下拒绝执行。"""
    raise GitOpsReadOnlyError()


async def write_post_ids_to_frontmatter(
    content_dir: Path, file_path, post, old_post=None, stats=None
):
    """旧版文章 ID 回写入口，单向同步模式下拒绝执行。"""
    raise GitOpsReadOnlyError()
