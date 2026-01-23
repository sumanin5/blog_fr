"""
异步文件操作函数
"""

import logging
from pathlib import Path

import aiofiles
import aiofiles.os

logger = logging.getLogger(__name__)


async def ensure_directory_exists(file_path: str) -> None:
    """确保文件路径的目录存在

    Args:
        file_path: 文件路径
    """
    directory = Path(file_path).parent
    await aiofiles.os.makedirs(directory, exist_ok=True)
    logger.debug(f"确保目录存在: {directory}")


async def save_file_to_disk(file_content: bytes, file_path: str) -> None:
    """异步保存文件到磁盘

    Args:
        file_content: 文件内容
        file_path: 文件路径
    """
    await ensure_directory_exists(file_path)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)
    logger.debug(f"文件已保存: {file_path}")


async def delete_file_from_disk(file_path: str) -> bool:
    """异步删除文件

    Args:
        file_path: 文件路径

    Returns:
        bool: 是否成功删除
    """
    try:
        if await aiofiles.os.path.exists(file_path):
            await aiofiles.os.remove(file_path)
            logger.debug(f"文件已删除: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"删除文件失败 {file_path}: {e}")
        return False
