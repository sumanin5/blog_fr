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


async def update_frontmatter_metadata(
    content_dir, file_path: str, metadata: dict, stats
):
    """将元数据写回到 MDX 文件的 frontmatter"""
    full_path = content_dir / file_path

    if not full_path.exists():
        logger.warning(f"File not found for metadata update: {file_path}")
        return False

    # 读取文件
    with open(full_path, "r", encoding="utf-8") as f:
        post = frontmatter.load(f)

    # 更新所有元数据
    for key, value in metadata.items():
        if value is not None:
            post.metadata[key] = str(value)
        else:
            post.metadata.pop(key, None)

    # 写回文件
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(frontmatter.dumps(post))

    logger.info(f"Updated frontmatter metadata: {file_path} -> {metadata}")
    return True


async def write_post_ids_to_frontmatter(
    content_dir, file_path: str, post, old_post, stats
):
    """将文章的 ID 写回到 frontmatter (回签计划)"""
    metadata_to_update = {
        "slug": post.slug,
        "author_id": str(post.author_id),
        "cover_media_id": str(post.cover_media_id) if post.cover_media_id else None,
        "category_id": str(post.category_id) if post.category_id else None,
    }

    if old_post:
        metadata_to_update = {
            k: v
            for k, v in metadata_to_update.items()
            if (
                k == "slug"
                and v != old_post.slug
                or k == "author_id"
                and v != str(old_post.author_id)
                or k == "cover_media_id"
                and v
                != (str(old_post.cover_media_id) if old_post.cover_media_id else None)
                or k == "category_id"
                and v != (str(old_post.category_id) if old_post.category_id else None)
            )
        }

        if not metadata_to_update:
            return True

    return await update_frontmatter_metadata(
        content_dir, file_path, metadata_to_update, stats
    )
