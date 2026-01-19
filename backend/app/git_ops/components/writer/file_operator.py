import logging
import shutil
from pathlib import Path

import aiofiles
from app.git_ops.exceptions import FileOpsError

logger = logging.getLogger(__name__)


class FileOperator:
    """底层文件操作器 - 负责物理读写、移动和删除"""

    async def write_file(self, path: Path, content: str) -> None:
        """异步写入文件"""
        try:
            # 确保目录存在
            path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(content)
        except Exception as e:
            raise FileOpsError(f"Failed to write file {path}", detail=str(e))

    async def delete_file(self, path: Path) -> None:
        """物理删除文件"""
        if path.exists():
            try:
                path.unlink()
                # 尝试清理空父目录
                parent = path.parent
                if parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
            except Exception as e:
                raise FileOpsError(f"Failed to delete file {path}", detail=str(e))

    def move_file(self, old_path: Path, new_path: Path) -> bool:
        """同步移动文件 (用于同步框架中的重命名)"""
        if not old_path.exists():
            return False

        try:
            # 确保目标目录存在
            new_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(old_path), str(new_path))
            return True
        except Exception as e:
            raise FileOpsError(
                f"Failed to move file {old_path} -> {new_path}", detail=str(e)
            )
