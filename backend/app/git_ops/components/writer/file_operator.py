import asyncio
import logging
import shutil
from pathlib import Path

import aiofiles
import frontmatter
from app.git_ops.exceptions import FileOpsError

logger = logging.getLogger(__name__)


class FileOperator:
    """底层文件操作器 - 负责物理读写、移动和删除"""

    async def write_file(self, path: Path, content: str) -> None:
        """异步写入文件"""
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(path, "w", encoding="utf-8") as f:
                await f.write(content)
        except Exception as e:
            raise FileOpsError(
                "Failed to write file", path=str(path), detail=str(e)
            ) from e

    async def delete_file(self, path: Path) -> None:
        """物理删除文件"""
        if not path.exists():
            return
        try:
            path.unlink()
            # 尝试清理空父目录
            parent = path.parent
            if parent.exists() and not any(parent.iterdir()):
                parent.rmdir()
        except Exception as e:
            raise FileOpsError(
                "Failed to delete file", path=str(path), detail=str(e)
            ) from e

    def move_file(self, old_path: Path, new_path: Path) -> bool:
        """同步移动文件"""
        if not old_path.exists():
            return False
        try:
            new_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(old_path), str(new_path))
            return True
        except Exception as e:
            raise FileOpsError(
                "Failed to move file", path=f"{old_path} -> {new_path}", detail=str(e)
            ) from e


async def update_frontmatter_metadata(
    content_dir: Path, file_path: str, metadata: dict
):
    """将元数据写回到 MDX 文件的 frontmatter"""
    full_path = content_dir / file_path

    if not full_path.exists():
        raise FileOpsError("Metadata update failed: file not found", path=file_path)

    try:
        # 读取文件
        def _read():
            with open(full_path, "r", encoding="utf-8") as f:
                return frontmatter.load(f)

        post = await asyncio.to_thread(_read)

        # 更新元数据
        for key, value in metadata.items():
            if value is not None:
                post.metadata[key] = str(value)
            else:
                post.metadata.pop(key, None)

        # 写回文件
        def _write():
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(frontmatter.dumps(post))

        await asyncio.to_thread(_write)
        logger.info(f"Updated frontmatter metadata: {file_path}")
        return True
    except Exception as e:
        raise FileOpsError(
            "Failed to update frontmatter", path=file_path, detail=str(e)
        ) from e


async def write_post_ids_to_frontmatter(
    content_dir: Path, file_path, post, old_post=None, stats=None
):
    """
    将文章的完整元数据写回到 frontmatter

    确保所有文章的 frontmatter 保持一致的结构和正确的值
    完全替换 frontmatter，删除不应该存在的字段（如 post_type）

    Args:
        content_dir: 内容根目录
        file_path: 文件路径（可以是相对路径字符串或绝对路径 Path 对象）
        post: 文章对象
        old_post: 旧文章对象（用于优化）
        stats: 统计对象
    """
    from app.git_ops.components.metadata import Frontmatter

    # 智能处理路径：支持相对路径字符串和绝对路径 Path 对象
    if isinstance(file_path, Path):
        # 如果是 Path 对象
        if file_path.is_absolute():
            # 绝对路径，直接使用
            full_path = file_path
            logger.debug(f"Using absolute Path: {full_path}")
        else:
            # 相对路径 Path 对象，拼接
            full_path = content_dir / file_path
            logger.debug(
                f"Joining relative Path: {content_dir} / {file_path} = {full_path}"
            )
    else:
        # 字符串路径，拼接
        full_path = content_dir / file_path
        logger.debug(f"Joining string path: {content_dir} / {file_path} = {full_path}")

    logger.info(
        f"write_post_ids_to_frontmatter: full_path={full_path}, exists={full_path.exists()}"
    )

    if not full_path.exists():
        raise FileOpsError(
            "Metadata update failed: file not found", path=str(file_path)
        )

    try:
        # 读取文件
        def _read():
            with open(full_path, "r", encoding="utf-8") as f:
                return frontmatter.load(f)

        post_fm = await asyncio.to_thread(_read)
        logger.debug(f"Successfully read frontmatter from {full_path}")

        # 提取 tags 名称（避免传递 Tag 对象给 Pydantic）
        tags = None
        if hasattr(post, "tags") and post.tags:
            tags = [tag.name for tag in post.tags]

        # 使用 Frontmatter 模型生成完整的元数据
        complete_metadata = Frontmatter.to_dict(post, tags=tags)
        logger.debug(f"Generated metadata: {complete_metadata}")

        # 添加人类可读的字段（补充 ID 字段）
        if post.category and hasattr(post.category, "slug"):
            complete_metadata["category"] = post.category.slug

        if post.author and hasattr(post.author, "username"):
            complete_metadata["author"] = post.author.username

        if post.cover_media_id and hasattr(post, "cover_media"):
            cover = post.cover_media
            if cover and hasattr(cover, "original_filename"):
                complete_metadata["cover"] = cover.original_filename

        logger.debug(f"Final metadata with human-readable fields: {complete_metadata}")

        # 完全替换 frontmatter（删除旧的、不应该存在的字段）
        post_fm.metadata = complete_metadata
        logger.debug("Replaced frontmatter metadata")

        # 写回文件
        def _write():
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(frontmatter.dumps(post_fm))

        await asyncio.to_thread(_write)
        logger.info(f"Updated frontmatter metadata: {full_path}")
        return True
    except Exception as e:
        logger.error(
            f"Error in write_post_ids_to_frontmatter: {type(e).__name__}: {e}",
            exc_info=True,
        )
        raise FileOpsError(
            "Failed to update frontmatter", path=str(full_path), detail=str(e)
        ) from e
